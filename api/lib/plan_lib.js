const db_opt = require('../db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');

module.exports = {
    fetch_vehicle: async function (_plate, _is_behind) {
        let sq = db_opt.get_sq();
        let vehicle_found = await sq.models.vehicle.findOrCreate({ where: { plate: _plate }, defaults: { is_behind: _is_behind } });
        return vehicle_found[0].toJSON();
    },
    fetch_driver: async function (_name, _phone, _id_card) {
        let sq = db_opt.get_sq();
        let driver_found = await sq.models.driver.findOrCreate({ where: { phone: _phone }, defaults: { name: _name, id_card: _id_card } });
        return driver_found[0];
    },
    fetch_stuff: async function (_name, _comment, _company, _expect_count, use_for_buy) {
        let sq = db_opt.get_sq();
        let stuff_found = await _company.getStuff({ where: { name: _name } });
        if (stuff_found.length != 1) {
            stuff_found = await sq.models.stuff.create({ name: _name, comment: _comment, expect_count: _expect_count });
            await _company.addStuff(stuff_found);
        }
        let ret = {};
        stuff_found = await _company.getStuff({ where: { name: _name } });
        if (stuff_found.length == 1) {
            stuff_found[0].comment = _comment;
            stuff_found[0].expect_count = _expect_count;
            if (use_for_buy) {
                stuff_found[0].use_for_buy = use_for_buy;
            }
            await stuff_found[0].save();
            ret = stuff_found[0].toJSON();
        }
        else {
            throw { err_msg: '未找到货物' };
        }
        return ret;
    },
    get_stuff_need_buy: async function (_sale_company, pageNo) {
        let sq = db_opt.get_sq();
        let ret = await sq.models.stuff.findAndCountAll({
            where: { use_for_buy: true },
            offset: pageNo * 20,
            limit: 20,
            order: [
                ['companyId', 'ASC'],
                ['id', 'ASC'],
            ],
            include: [
                {
                    model: sq.models.company, required: true, include: [
                        {
                            model: sq.models.contract, where: {
                                saleCompanyId: _sale_company.id
                            }, required: true, as:'buy_contracts'
                        }
                    ]
                }
            ]
        });
        return ret;
    },
    get_stuff_on_sale: async function (_buy_company, pageNo) {
        let sq = db_opt.get_sq();
        let stuffs = await sq.models.stuff.findAll({
            where:{
                use_for_buy: false,
            },
            offset: pageNo * 20,
            limit: 20,
            order: [
                ['companyId', 'ASC'],
                ['id', 'ASC'],
            ],
            include: [
                { model: sq.models.company, }
            ]
        });
        let ret = [];
        for (let index = 0; index < stuffs.length; index++) {
            const element = stuffs[index];
            let contract = await _buy_company.getBuy_contracts({ where: { saleCompanyId: element.company.id } });
            if (contract.length == 1 && await contract[0].hasStuff(element)) {
                ret.push(element.toJSON());
            }
            else {
                element.price = -1;
                ret.push(element.toJSON());
            }
        }
        let count = await sq.models.stuff.count();
        return { rows: ret, count: count };
    },
    make_contract: async function (_buy_company, _sale_company, being_time, end_time, number, customer_code) {
        let sq = db_opt.get_sq();
        let exist_contract = await _buy_company.getBuy_contracts({ where: { saleCompanyId: _sale_company.id } });
        if (exist_contract.length != 0) {
            throw { err_msg: '合同已存在' };
        }
        let new_contract = await sq.models.contract.create({
            sign_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            balance: 0,
            begin_time: being_time,
            end_time: end_time,
            number: number,
            customer_code: customer_code,
        });
        await new_contract.setBuy_company(_buy_company);
        await new_contract.setSale_company(_sale_company);
        return new_contract.toJSON();
    },
    destroy_contract: async function (_contract_id) {
        let sq = db_opt.get_sq();
        let contract = await sq.models.contract.findByPk(_contract_id);
        await contract.removeStuff();
        await contract.destroy();
    },
    add_stuff_to_contract: async function (_stuff, _contract) {
        let exist_stuffs = await _contract.getStuff({ where: { id: _stuff.id } });
        if (exist_stuffs.length == 0) {
            await _contract.addStuff(_stuff);
        }
    },
    del_stuff_from_contract: async function (_stuff, _contract) {
        let exist_stuffs = await _contract.getStuff({ where: { id: _stuff.id } });
        if (exist_stuffs.length == 1) {
            await _contract.removeStuff(_stuff);
        }
    },
    get_all_sale_contracts: async function (_compnay, _pageNo, stuff_id) {
        let sq = db_opt.get_sq();
        let conditions = {
            order: [['updatedAt', 'DESC'], ['id', 'ASC']],
            offset: _pageNo * 20,
            limit: 20,
            include: [
                { model: sq.models.company, as: 'buy_company' },
                { model: sq.models.stuff, },
                { model: sq.models.rbac_user, }
            ]
        };
        if (stuff_id != undefined) {
            conditions.include[1].where = { id: stuff_id };
            conditions.include[1].required = true;
        }
        let rows = await _compnay.getSale_contracts(conditions);
        let count = await _compnay.countSale_contracts();
        return { rows: rows, count: count };
    },
    get_all_buy_contracts: async function (_compnay, _pageNo) {
        let sq = db_opt.get_sq();
        let conditions = {
            order: [['id', 'ASC']],
            offset: _pageNo * 20,
            limit: 20,
            include: [
                { model: sq.models.company, as: 'sale_company' },
                { model: sq.models.stuff },
            ]
        };
        let rows = await _compnay.getBuy_contracts(conditions);
        let count = await _compnay.countBuy_contracts();
        return { rows: rows, count: count };
    },
    plan_detail_include: function () {
        return [
            { model: db_opt.get_sq().models.company, paranoid: false },
            { model: db_opt.get_sq().models.rbac_user, paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.driver, paranoid: false },
            { model: db_opt.get_sq().models.stuff, include: [db_opt.get_sq().models.company], paranoid: false },
            { model: db_opt.get_sq().models.plan_history, order: [[db_opt.get_sq().fn('datetime', db_opt.get_sq().col('time')), 'ASC']], paranoid: false }
        ];
    },
    make_plan_where_condition: function (_condition, search_buy = false) {
        let sq = db_opt.get_sq();
        let where_condition = {
            [db_opt.Op.and]: [
                sq.where(sq.fn('datetime', sq.col('plan_time')), {
                    [db_opt.Op.gte]: sq.fn('datetime', _condition.start_time)
                }),
                sq.where(sq.fn('datetime', sq.col('plan_time')), {
                    [db_opt.Op.lte]: sq.fn('datetime', _condition.end_time)
                }),
            ]
        };
        if (search_buy) {
            where_condition[db_opt.Op.and].push({ is_buy: true });
        }
        if (_condition.status != undefined) {
            where_condition[db_opt.Op.and].push({ status: _condition.status });
        }
        if (_condition.stuff_id != undefined) {
            where_condition[db_opt.Op.and].push({ stuffId: _condition.stuff_id });
        }
        if (_condition.company_id != undefined) {
            where_condition[db_opt.Op.and].push({ companyId: _condition.company_id });
        }
        if (_condition.hide_manual_close) {
            where_condition[db_opt.Op.and].push({ manual_close: false });
        }
        return where_condition;
    },
    replace_plan2archive: async function (_plan) {
        let ret = undefined;
        if (_plan.status == 3) {
            let archive_plan = await _plan.getArchive_plan();
            if (archive_plan) {
                ret = JSON.parse(archive_plan.content);
            }
        }

        return ret;
    },
    search_bought_plans: async function (_company, _pageNo, _condition, is_buy = false) {
        let sq = db_opt.get_sq();
        let where_condition = this.make_plan_where_condition(_condition, is_buy);
        let search_condition = {
            order: [[sq.fn('datetime', sq.col('plan_time')), 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: this.plan_detail_include(),
        };
        let bought_plans = await _company.getPlans(search_condition);
        let result = [];
        for (let index = 0; index < bought_plans.length; index++) {
            const element = bought_plans[index];
            let arc_p = await this.replace_plan2archive(element);
            if (arc_p) {
                result.push(arc_p);
            }
            else {
                result.push(element);
            }
        }
        let count = await _company.countPlans({ where: where_condition });
        return { rows: result, count: count };
    },
    search_sold_plans: async function (_company, _pageNo, _condition, is_buy=false) {
        let sq = db_opt.get_sq();
        let where_condition = this.make_plan_where_condition(_condition, is_buy);

        let stuff_or = [];
        let stuff = await _company.getStuff({ paranoid: false });
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            stuff_or.push({ stuffId: element.id });
        }
        where_condition[db_opt.Op.and].push({
            [db_opt.Op.or]: stuff_or
        });
        let search_condition = {
            order: [[sq.fn('datetime', sq.col('plan_time')), 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: this.plan_detail_include(),
        };
        let sold_plans = await sq.models.plan.findAll(search_condition);
        let count = await sq.models.plan.count({ where: where_condition });
        let result = [];
        for (let index = 0; index < sold_plans.length; index++) {
            const element = sold_plans[index];
            let arc_p = await this.replace_plan2archive(element);
            if (arc_p) {
                result.push(arc_p);
            }
            else {
                result.push(element);
            }
        }
        return { rows: result, count: count };
    },
    update_single_plan: async function (_plan_id, _token, _plan_time, _main_vehicle_id, _behind_vehicle_id, _driver_id, _comment, _use_for, _drop_address) {
        let sq = db_opt.get_sq();
        let plan = await sq.models.plan.findByPk(_plan_id);
        if (plan && plan.status == 0) {
            let company = await plan.getCompany();
            let opt_company = await rbac_lib.get_company_by_token(_token);
            if (company && opt_company && company.id == opt_company.id) {
                let change_comment = '';
                if (_plan_time != undefined) {
                    change_comment += '计划时间由' + plan.plan_time + '改为' + _plan_time + ';\n';
                    plan.plan_time = _plan_time;
                }
                if (_main_vehicle_id != undefined) {
                    let orig_main_vehicle = await plan.getMain_vehicle();
                    let new_main_vehicle = await sq.models.vehicle.findByPk(_main_vehicle_id);
                    if (orig_main_vehicle && new_main_vehicle) {
                        change_comment += '主车辆由' + orig_main_vehicle.plate + '改为' + new_main_vehicle.plate + ';\n';
                    }
                    plan.setMain_vehicle(new_main_vehicle);
                }
                if (_behind_vehicle_id != undefined) {
                    let orig_behind_vehicle = await plan.getBehind_vehicle();
                    let new_behind_vehicle = await sq.models.vehicle.findByPk(_behind_vehicle_id);
                    if (orig_behind_vehicle && new_behind_vehicle) {
                        change_comment += '挂车辆由' + orig_behind_vehicle.plate + '改为' + new_behind_vehicle.plate + ';\n';
                    }
                    plan.setBehind_vehicle(new_behind_vehicle);
                }
                if (_driver_id != undefined) {
                    let orig_driver = await plan.getDriver();
                    let new_driver = await sq.models.driver.findByPk(_driver_id);
                    if (orig_driver && new_driver) {
                        change_comment += '司机电话由' + orig_driver.phone + '改为' + new_driver.phone + ';\n';
                    }
                    plan.setDriver(new_driver);
                }
                if (_comment != undefined) {
                    change_comment += '备注由' + plan.comment + '改为' + _comment + ';\n';
                    plan.comment = _comment;
                }
                if (_use_for != undefined) {
                    change_comment += '用途由' + plan.use_for + '改为' + _use_for + ';\n';
                    plan.use_for = _use_for;
                }
                if (_drop_address != undefined) {
                    change_comment += '卸货地址由' + plan.drop_address + '改为' + _drop_address + ';\n';
                    plan.drop_address = _drop_address;
                }
                await plan.save();
                await this.record_plan_history(plan, (await rbac_lib.get_user_by_token(_token)).name, change_comment);
            }
            else {
                throw { err_msg: '无权限' };
            }
        }
        else {
            throw { err_msg: '未找到计划或状态错误' };
        }
    },
    authorize_user2contract: async function (_phone, _contract_id, _token) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.add_user(_phone);
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await sq.models.contract.findByPk(_contract_id);
        if (contract && user && company && await company.hasSale_contract(contract)) {
            if (! await contract.hasRbac_user(user)) {
                await contract.addRbac_user(user);
            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    unauthorize_user2contract: async function (_phone, _contract_id, _token) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.add_user(_phone);
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await sq.models.contract.findByPk(_contract_id);
        if (contract && user && company && await company.hasSale_contract(contract)) {
            if (await contract.hasRbac_user(user)) {
                await contract.removeRbac_user(user);
            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    confirm_single_plan: async function (_plan_id, _token) {
        await this.action_in_plan(_plan_id, _token, 0, async (plan) => {
            let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
            let creator = await plan.getRbac_user();
            if (creator && contracts.length == 1 && await contracts[0].hasRbac_user(creator)) {
                plan.status = 1;
                await plan.save();
                await this.rp_history_confirm(plan, (await rbac_lib.get_user_by_token(_token)).name);
                if (!plan.is_buy) {
                    await this.verify_plan_pay(plan);
                }
            }
            else {
                throw { err_msg: plan.company.name + '的报计划人未授权' };
            }

        });
    },
    plan_close: async function (plan, name, is_cancel = false) {
        if (plan.status == 3) {
            throw { err_msg: '已关闭,无法再次关闭' };
        }
        if (plan.enter_time && plan.enter_time.length > 0) {
            throw { err_msg: '已进厂,无法关闭' };
        }
        plan.status = 3;
        plan.manual_close = true;
        await plan.save();
        if (is_cancel) {
            await this.rp_history_cancel(plan, name);
        }
        else {
            await this.rp_history_close(plan, name);
        }
    },
    plan_enter: async function (_plan_id, _token) {
        let tmp_plan = await this.get_single_plan_by_id(_plan_id);
        let status_req = 2;
        if (tmp_plan && tmp_plan.is_buy){
            status_req = 1;
        }
        await this.action_in_plan(_plan_id, _token, status_req, async (plan) => {
            if (plan.enter_time && plan.enter_time.length > 0) {
                throw { err_msg: '已进厂' };
            }
            plan.enter_time = moment().format('YYYY-MM-DD HH:mm:ss');
            await plan.save();
            await this.rp_history_enter(plan, (await rbac_lib.get_user_by_token(_token)).name);
        });
    },
    plan_rollback: async function (_plan_id, _token) {
        await this.action_in_plan(_plan_id, _token, -1, async (plan) => {
            let rollback_content = '';
            if (plan.manual_close) {
                throw { err_msg: '已关闭,无法回退' };
            }
            if (plan.status == 1) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    plan.enter_time = '';
                    rollback_content = '回退进厂';
                }
                else {
                    plan.status = 0;
                    rollback_content = '回退确认';
                }
            }
            else if (plan.status == 2) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    plan.enter_time = '';
                    rollback_content = '回退进厂';
                }
                else {
                    plan.status = 1;
                    rollback_content = '回退验款';
                }
            }
            else if (plan.status == 3) {
                if (plan.is_buy) {
                    plan.status = 1;
                }
                else {
                    await this.plan_undo_cost(plan);
                    plan.status = 2;
                }
                plan.count = 0;
                plan.p_time = '';
                plan.p_weight = 0;
                plan.m_time = '';
                plan.m_weight = 0;
                rollback_content = '回退发车';
            }
            else {
                throw { err_msg: '无法回退' };
            }
            await plan.save();
            await this.record_plan_history(plan, (await rbac_lib.get_user_by_token(_token)).name, rollback_content);
        });
    },
    get_single_plan_by_id: async function (_plan_id) {
        let ret = {};
        let sq = db_opt.get_sq();
        ret = await sq.models.plan.findByPk(_plan_id, { include: this.plan_detail_include() });

        return ret;
    },
    plan_cost: async function (plan) {
        let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
        if (contracts.length == 1) {
            let contract = contracts[0];
            let decrease_cash = plan.unit_price * plan.count;
            contract.balance -= decrease_cash
            await contract.save();
            await contract.createBalance_history({
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
                operator: '系统',
                comment: '出货扣除',
                cash_increased: -decrease_cash
            });
        }
    },
    plan_undo_cost: async function (plan) {
        let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
        if (contracts.length == 1) {
            let contract = contracts[0];
            let decrease_cash = plan.unit_price * plan.count;
            contract.balance += decrease_cash
            await contract.save();
            await contract.createBalance_history({
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
                operator: '系统',
                comment: '回退出货增加',
                cash_increased: decrease_cash
            });
        }
    },
    verify_plan_pay: async function (_plan) {
        if (_plan.status == 1) {
            let plan = await this.get_single_plan_by_id(_plan.id);
            let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
            let cur_balance = 0;
            if (contracts.length == 1) {
                cur_balance = contracts[0].balance;
            }
            let one_vehicle_cost = plan.stuff.price * plan.stuff.expect_count;
            let paid_vehicle_count = await plan.company.countPlans({
                where: {
                    [db_opt.Op.and]: [
                        {
                            status: 2,
                        },
                        {
                            stuffId: plan.stuff.id
                        }
                    ]
                },
            });
            let already_verified_cash = one_vehicle_cost * paid_vehicle_count;
            if ((cur_balance - already_verified_cash) >= one_vehicle_cost) {
                _plan.status = 2;
                await _plan.save();
                await this.rp_history_pay(_plan, '自动');
            }
        }
    },
    manual_pay_plan: async function (_plan_id, _token) {
        await this.action_in_plan(_plan_id, _token, 1, async (plan) => {
            plan.status = 2;
            await plan.save();
            await this.rp_history_pay(plan, (await rbac_lib.get_user_by_token(_token)).name);
        });
    },
    deliver_plan: async function (_plan_id, _token, _count, p_weight, m_weight, p_time, m_time) {
        let tmp_plan = await this.get_single_plan_by_id(_plan_id);
        let status_req = 2;
        if (tmp_plan && tmp_plan.is_buy) {
            status_req = 1;
        }
        await this.action_in_plan(_plan_id, _token, status_req, async (plan) => {
            plan.status = 3;
            plan.count = _count;
            plan.p_time = p_time;
            plan.p_weight = p_weight;
            plan.m_time = m_time;
            plan.m_weight = m_weight;
            await plan.save();
            await this.rp_history_deliver(plan, (await rbac_lib.get_user_by_token(_token)).name);
            if (!plan.is_buy) {
                await this.plan_cost(plan);
            }
        });
    },
    action_in_plan: async function (_plan_id, _token, _expect_status, _action) {
        let opt_company = await rbac_lib.get_company_by_token(_token);
        let plan = await this.get_single_plan_by_id(_plan_id);
        if (plan) {
            let stuff = plan.stuff;
            if (stuff) {
                let company = stuff.company;
                if (company && opt_company && opt_company.id == company.id) {
                    if (-1 == _expect_status || plan.status == _expect_status) {
                        await _action(plan);
                    }
                    else {
                        throw { err_msg: '计划状态错误' };
                    }
                }
                else {
                    throw { err_msg: '无权限' };
                }
            }
            else {
                throw { err_msg: '未找到货物' };
            }
        }
        else {
            throw { err_msg: '未找到计划' };
        }
    },
    record_plan_history: async function (_plan, _operator, _action_type) {
        await _plan.createPlan_history({ time: moment().format('YYYY-MM-DD HH:mm:ss'), operator: _operator, action_type: _action_type });
    },
    rp_history_create: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '创建');
    },
    rp_history_confirm: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '确认');
    },
    rp_history_pay: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '验款');
    },
    rp_history_enter: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '进厂');
    },
    rp_history_deliver: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '发车');
        let plan = await this.get_single_plan_by_id(_plan.id);
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        let content = plan.toJSON();
        content.sc_info = (await this.get_sc_status_by_plan(plan)).reqs;
        console.log(content.sc_info);
        plan.createArchive_plan({ content: JSON.stringify(content) });
    },
    rp_history_close: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '关闭');
        let plan = await this.get_single_plan_by_id(_plan.id);
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        let content = plan.toJSON();
        content.sc_info = (await this.get_sc_status_by_plan(plan)).reqs;
        plan.createArchive_plan({ content: JSON.stringify(content) });
    },
    rp_history_cancel: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '取消');
        let plan = await this.get_single_plan_by_id(_plan.id);
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        plan.createArchive_plan({ content: JSON.stringify(plan.toJSON()) });
    },
    rp_history_price_change: async function (_plan, _operator, _new_price) {
        await this.record_plan_history(_plan, _operator, '价格变为:' + _new_price);
    },

    pri_change_stuff_price: async function (stuff, _new_price, _comment, _operator, _to_plan) {
        stuff.price = _new_price;
        await stuff.save();
        await stuff.createPrice_history(
            {
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
                operator: _operator,
                comment: _comment,
                new_price: _new_price
            });
        if (_to_plan) {
            let plans = await stuff.getPlans({
                where: {
                    status: {
                        [db_opt.Op.ne]: 3
                    }
                }
            });
            for (let index = 0; index < plans.length; index++) {
                const element = plans[index];
                element.unit_price = _new_price;
                await element.save();
                await this.rp_history_price_change(element, _operator, _new_price);
            }
        }
    },

    change_stuff_price: async function (_stuff_id, _token, _new_price, _to_plan, _comment) {
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(_token);
        let stuff = await sq.models.stuff.findByPk(_stuff_id);
        if (company && stuff && await company.hasStuff(stuff)) {
            await this.pri_change_stuff_price(stuff, _new_price, _comment, (await rbac_lib.get_user_by_token(_token)).name, _to_plan);
        }
        else {
            throw { err_msg: '无权限' };
        }
    },

    get_price_history: async function (_stuff_id, _token, _pageNo) {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(_stuff_id);
        let company = await rbac_lib.get_company_by_token(_token);
        let conditions = {
            order: [['id', 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
        };
        if (!stuff || !company || !await company.hasStuff(stuff)) {
            throw { err_msg: '未找到货物' };
        }

        let rows = await stuff.getPrice_histories(conditions);
        let count = await stuff.countPrice_histories();
        return { rows: rows, count: count };
    },
    get_sc_status_by_plan: async function (plan, pageNo = -1) {
        let sq = db_opt.get_sq();
        let ret = { reqs: [], total: 0, passed: false }
        let search_cond = {
            order: [[sq.models.sc_content, 'passed'], ['id', 'DESC']],
            include: [
                {
                    model: sq.models.sc_content, required: false, where: {
                        [db_opt.Op.or]: [
                            { driverId: plan.driver.id },
                            { vehicleId: plan.main_vehicle.id },
                            { vehicleId: plan.behind_vehicle.id },
                        ]
                    }
                },
            ],
        };
        if (-1 != pageNo) {
            search_cond.offset = 20 * pageNo;
            search_cond.limit = 20;
        }
        let found_ret = await plan.stuff.getSc_reqs(search_cond);
        let count = await plan.stuff.countSc_reqs();
        for (let index = 0; index < found_ret.length; index++) {
            const element = found_ret[index].toJSON();
            if (element.sc_contents.length == 1) {
                element.sc_content = element.sc_contents[0];
            }
            delete element.sc_contents;
            ret.reqs.push(element);
        }
        ret.total = count;

        delete search_cond.offset
        delete search_cond.limit
        let first_one = await plan.stuff.getSc_reqs(search_cond);
        if (first_one.length == 0 || (first_one[0].sc_contents.length > 0 && first_one[0].sc_contents[0].passed)) {
            ret.passed = true;
        }

        return ret;
    },
    get_self_vehicle_pairs: async function (token, pageNo) {
        let rows = [];
        let company = await rbac_lib.get_company_by_token(token);
        let result = await company.getPlans({
            group: 'mainVehicleId',
            offset: 20 * pageNo,
            limit: 20,
        });
        let count = await company.countPlans({ group: 'mainVehicleId' });
        for (let index = 0; index < result.length; index++) {
            const element = result[index];
            let tmp = {};
            let main_vehicle = await element.getMain_vehicle()
            let behind_vehicle = await element.getBehind_vehicle();
            let driver = await element.getDriver();
            if (main_vehicle && behind_vehicle && driver) {
                tmp.driver_phone = driver.phone;
                tmp.main_vehicle_plate = main_vehicle.plate;
                tmp.behind_vehicle_plate = behind_vehicle.plate;
                tmp.driver_name = driver.name;
                rows.push(tmp);
            }
        }
        return { rows: rows, count: count };
    },
    verify_plan_location: async function (plan, lat, lon) {
        let pos_lat = plan.stuff.company.pos_lat;
        let pos_lon = plan.stuff.company.pos_lon;
        let distance_limit = plan.stuff.company.distance_limit;
        if (distance_limit == 0) {
            return true;
        }
        // 将度数转换为弧度
        let deg2rad = function (deg) {
            return deg * (Math.PI / 180)
        }

        let R = 6371; // 地球半径，单位：公里
        let dLat = deg2rad(pos_lat - lat);
        let dLon = deg2rad(pos_lon - lon);
        let a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat)) * Math.cos(deg2rad(pos_lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let distance = R * c; // 距离，单位：公里

        // 检查距离是否在限制范围内
        return distance <= distance_limit;
    },
    get_wait_count: async function (plan) {
        let ret = 0;
        let stuff = await plan.getStuff();
        let sq = db_opt.get_sq();
        if (stuff) {
            ret = await stuff.countPlans({
                where: {
                    [db_opt.Op.and]: [
                        { call_time: null },
                        { register_time: { [db_opt.Op.ne]: null } },
                        { status: { [db_opt.Op.ne]: 3 } },
                        sq.where(sq.fn('datetime', sq.col('register_time')), {
                            [db_opt.Op.lt]: sq.fn('datetime', plan.register_time)
                        }),
                    ],
                }
            })
        }
        return ret;
    },
    get_wait_que: async function (pageNo, token) {
        let sq = db_opt.get_sq();
        let stuff_array = [0];
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            let tmp = await company.getStuff();
            for (let index = 0; index < tmp.length; index++) {
                const element = tmp[index];
                stuff_array.push(element.id);
            }
        }
        let cond = {
            [db_opt.Op.and]: [
                { register_time: { [db_opt.Op.ne]: null } },
                { status: { [db_opt.Op.ne]: 3 } },
                {
                    stuffId: {
                        [db_opt.Op.or]: stuff_array
                    }
                }
            ],
        };
        let plans = await sq.models.plan.findAll({
            where: cond,
            order: [[sq.fn('datetime', sq.col('register_time')), 'ASC']],
            offset: pageNo * 20,
            limit: 20,
            include: this.plan_detail_include(),
        });
        let count = await sq.models.plan.count({
            where: cond,
        });
        return { rows: plans, count: count };
    },
    check_if_never_checkin: async function (driver) {
        let ret = false;
        let checkin_count = await driver.countPlans({
            where: {
                [db_opt.Op.and]: [
                    { status: { [db_opt.Op.ne]: 3 } },
                    { register_time: { [db_opt.Op.ne]: null } },
                ],
            }
        });
        if (checkin_count == 0) {
            ret = true;
        }
        return ret;
    },
    batch_confirm: async function (body, token) {
        let err_msg = '';
        await db_opt.get_sq().transaction(async (t) => {
            let company = await rbac_lib.get_company_by_token(token);
            let all_plans = [];
            let pageNo = 0;
            while (true) {
                let tmp = await this.search_sold_plans(company, pageNo, body);
                all_plans = all_plans.concat(tmp.rows);
                pageNo++;
                if (tmp.rows.length <= 0) {
                    break;
                }
            }
            for (let index = 0; index < all_plans.length; index++) {
                const element = all_plans[index];
                try {
                    await this.confirm_single_plan(element.id, token);
                } catch (error) {
                    err_msg += error.err_msg + '\n';
                    throw error;
                }
            }
        });
        console.log(err_msg);
        return err_msg;
    },
};
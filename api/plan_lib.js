const db_opt = require('./db_opt');
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
    fetch_stuff: async function (_name, _price, _comment, _company, _expect_count) {
        let sq = db_opt.get_sq();
        let stuff_found = await _company.getStuff({ where: { name: _name } });
        if (stuff_found.length != 1) {
            stuff_found = await sq.models.stuff.create({ name: _name, price: _price, comment: _comment, expect_count: _expect_count });
            await _company.addStuff(stuff_found);
        }
        let ret = {};
        stuff_found = await _company.getStuff({ where: { name: _name } });
        if (stuff_found.length == 1) {
            stuff_found[0].price = _price;
            stuff_found[0].comment = _comment;
            stuff_found[0].expect_count = _expect_count;
            await stuff_found[0].save();
            ret = stuff_found[0].toJSON();
        }
        else {
            throw { err_msg: '未找到货物' };
        }
        return ret;
    },
    get_stuff_on_sale: async function (_buy_company, pageNo) {
        let sq = db_opt.get_sq();
        let stuffs = await sq.models.stuff.findAll({
            offset: pageNo * 20,
            limit: 20,
            order: [
                ['companyId', 'ASC'],
                ['id', 'ASC'],
            ],
            include: [
                { model: sq.models.company }
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
    make_contract: async function (_buy_company, _sale_company) {
        let sq = db_opt.get_sq();
        let exist_contract = await _buy_company.getBuy_contracts({ where: { saleCompanyId: _sale_company.id } });
        if (exist_contract.length != 0) {
            throw { err_msg: '合同已存在' };
        }
        let new_contract = await sq.models.contract.create({ sign_time: moment().format('YYYY-MM-DD HH:mm:ss'), balance: 0 });
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
    get_all_sale_contracts: async function (_compnay, _pageNo) {
        let sq = db_opt.get_sq();
        let conditions = {
            order: [['id', 'ASC']],
            offset: _pageNo * 20,
            limit: 20,
            include: [
                { model: sq.models.company, as: 'buy_company' },
                { model: sq.models.stuff },
            ]
        };
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
    make_plan_where_condition: function (_condition) {
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
        if (_condition.status != undefined) {
            where_condition[db_opt.Op.and].push({ status: _condition.status });
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
    search_bought_plans: async function (_company, _pageNo, _condition) {
        let sq = db_opt.get_sq();
        let where_condition = this.make_plan_where_condition(_condition);
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
            if (arc_p)
            {
                result.push(arc_p);
            }
            else
            {
                result.push(element);
            }
        }
        let count = await _company.countPlans({ where: where_condition });
        return { rows: result, count: count };
    },
    search_sold_plans: async function (_company, _pageNo, _condition) {
        let sq = db_opt.get_sq();
        let where_condition = this.make_plan_where_condition(_condition);

        let search_condition = {
            order: [[sq.fn('datetime', sq.col('plan_time')), 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: this.plan_detail_include(),
        };
        let stuff = await _company.getStuff({paranoid: false});
        let sold_plans = [];
        let count = 0;
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            let plans = await element.getPlans(search_condition);
            let c = await element.countPlans({ where: where_condition });
            count += c;
            sold_plans = sold_plans.concat(plans);
        }
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
    authorize_user2contract:async function(_phone, _contract_id, _token)
    {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.add_user(_phone);
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await sq.models.contract.findByPk(_contract_id);
        if (contract && user && company && await company.hasSale_contract(contract))
        {
            if (! await contract.hasRbac_user(user))
            {
                await contract.addRbac_user(user);
            }
        }
        else
        {
            throw { err_msg: '无权限' };
        }
    },
    unauthorize_user2contract: async function (_phone, _contract_id, _token) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.add_user(_phone);
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await sq.models.contract.findByPk(_contract_id);
        if (contract && user && company && await company.hasSale_contract(contract)) {
            if ( await contract.hasRbac_user(user)) {
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
                await this.verify_plan_pay(plan);
            }
            else {
                throw { err_msg: '报计划人未授权' };
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
        if (is_cancel)
        {
            await this.rp_history_cancel(plan, name);
        }
        else
        {
            await this.rp_history_close(plan,name);
        }
    },
    plan_enter: async function (_plan_id, _token) {
        await this.action_in_plan(_plan_id, _token, 2, async (plan) => {
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
            if (plan.manual_close) {
                throw { err_msg: '已关闭,无法回退' };
            }
            if (plan.status == 1) {
                plan.status = 0;
            }
            else if (plan.status == 2) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    plan.enter_time = '';
                }
                else {
                    plan.status = 1;
                }
            }
            else if (plan.status == 3) {
                await this.plan_undo_cost(plan);
                plan.status = 2;
                plan.count = 0;
                plan.p_time = '';
                plan.p_weight = 0;
                plan.m_time = '';
                plan.m_weight = 0;
            }
            else {
                throw { err_msg: '无法回退' };
            }
            await plan.save();
            await this.rp_history_rollback(plan, (await rbac_lib.get_user_by_token(_token)).name);
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
        await this.action_in_plan(_plan_id, _token, 2, async (plan) => {
            plan.status = 3;
            plan.count = _count;
            plan.p_time = p_time;
            plan.p_weight = p_weight;
            plan.m_time = m_time;
            plan.m_weight = m_weight;
            await plan.save();
            await this.rp_history_deliver(plan, (await rbac_lib.get_user_by_token(_token)).name);
            await this.plan_cost(plan);
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
    rp_history_rollback: async function (_plan, _operator) {
        if (_plan.plan_histories.length > 0) {
            let last_action = _plan.plan_histories[_plan.plan_histories.length - 1];
            await this.record_plan_history(_plan, _operator, '回退:' + last_action.action_type);
        }
    },
    rp_history_deliver: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '发车');
        let plan = await this.get_single_plan_by_id(_plan.id);
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        plan.createArchive_plan({ content: JSON.stringify(plan.toJSON()) });
    },
    rp_history_close: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '关闭');
        let plan = await this.get_single_plan_by_id(_plan.id);
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        plan.createArchive_plan({ content: JSON.stringify(plan.toJSON()) });
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
};
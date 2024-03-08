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
            { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.driver, paranoid: false },
            { model: db_opt.get_sq().models.stuff, include: [db_opt.get_sq().models.company], paranoid: false },
            { model: db_opt.get_sq().models.plan_history, order: [[db_opt.get_sq().fn('datetime', db_opt.get_sq().col('time')), 'ASC']], paranoid: false }
        ];
    },
    search_bought_plans: async function (_company, _pageNo, _condition) {
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
        let search_condition = {
            order: [[sq.fn('datetime', sq.col('plan_time')), 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: this.plan_detail_include(),
        };
        let bought_plans = await _company.getPlans(search_condition);
        let count = await _company.countPlans({ where: where_condition });
        return { rows: bought_plans, count: count };
    },
    search_sold_plans: async function (_company, _pageNo, _condition) {
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
        let search_condition = {
            order: [[sq.fn('datetime', sq.col('plan_time')), 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: this.plan_detail_include(),
        };
        let stuff = await _company.getStuff();
        let sold_plans = [];
        let count = 0;
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            let plans = await element.getPlans(search_condition);
            let c = await element.countPlans({ where: where_condition });
            count += c;
            sold_plans = sold_plans.concat(plans);
        }
        return { rows: sold_plans, count: count };
    },
    confirm_single_plan: async function (_plan_id, _token) {
        await this.action_in_plan(_plan_id, _token, 0, async (plan) => {
            plan.status = 1;
            await plan.save();
            await this.rp_history_confirm(plan, (await rbac_lib.get_user_by_token(_token)).name);
            await this.verify_plan_pay(plan);
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
                    if (plan.status == _expect_status) {
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
    rp_history_deliver: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '发车');
    },

};
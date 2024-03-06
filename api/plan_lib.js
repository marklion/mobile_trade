const db_opt = require('./db_opt');
const moment = require('moment');

module.exports = {
    create_single_plan: async function (_new_plan, _stuff_id, _buy_company_id, _driver_id, _main_vehicle_id, _behind_vehicle_id) {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(_stuff_id);
        let buy_company = await sq.models.company.findByPk(_buy_company_id);
        let driver = await sq.models.driver.findByPk(_driver_id);
        let main_vehicle = await sq.models.vehicle.findByPk(_main_vehicle_id);
        let behind_vehicle = await sq.models.vehicle.findByPk(_behind_vehicle_id);
        let new_plan = await sq.models.plan.create(_new_plan);
        if (new_plan && stuff && buy_company && driver && main_vehicle && behind_vehicle) {
            await new_plan.setStuff(stuff);
            await new_plan.setCompany(buy_company);
            await new_plan.setDriver(driver);
            await new_plan.setMain_vehicle(main_vehicle);
            await new_plan.setBehind_vehicle(behind_vehicle);
        }
        return new_plan.toJSON();
    },
    fetch_vehicle: async function (_plate, _is_behind) {
        let sq = db_opt.get_sq();
        let vehicle_found = await sq.models.vehicle.findOrCreate({ where: { plate: _plate }, defaults: { is_behind: _is_behind } });
        return vehicle_found[0].toJSON();
    },
    fetch_driver: async function (_name, _phone, _id_card) {
        let sq = db_opt.get_sq();
        let driver_found = await sq.models.driver.findOrCreate({ where: { phone: _phone }, defaults: { name: _name, id_card: _id_card } });
        return driver_found[0].toJSON();
    },
    fetch_stuff: async function (_name, _price, _comment, _company) {
        let sq = db_opt.get_sq();
        let stuff_found = await _company.getStuff({ where: { name: _name } });
        if (stuff_found.length != 1) {
            stuff_found = await sq.models.stuff.create({ name: _name, price: _price, comment: _comment });
            await _company.addStuff(stuff_found);
        }
        let ret = {};
        stuff_found = await _company.getStuff({ where: { name: _name } });
        if (stuff_found.length == 1) {
            stuff_found[0].price = _price;
            stuff_found[0].comment = _comment;
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
            { model: db_opt.get_sq().models.company },
            { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle' },
            { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle' },
            { model: db_opt.get_sq().models.driver },
            { model: db_opt.get_sq().models.stuff },
            { model: db_opt.get_sq().models.plan_history, order: [[db_opt.get_sq().fn('datetime', db_opt.get_sq().col('time')), 'ASC']]}
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
            order: [[sq.fn('datetime',sq.col('plan_time')), 'DESC']],
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
            order: [[sq.fn('datetime',sq.col('plan_time')), 'DESC']],
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
    confirm_single_plan: async function (_plan_id, _comment) {
    },
    record_plan_history: async function (_plan, _operator, _action_type) {
        await _plan.createPlan_history({ time: moment().format('YYYY-MM-DD HH:mm:ss'), operator: _operator, action_type: _action_type });
    },
    rp_history_create: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '创建');
    },
};
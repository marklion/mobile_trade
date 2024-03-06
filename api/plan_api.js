const mkapi = require('./api_utils');
const plan_lib = require('./plan_lib');
const db_opt = require('./db_opt');
const plan_detail_define = {
        id: { type: Number, mean: '计划ID', example: 1 },
        plan_time: { type: String, mean: '计划时间', example: '2020-01-01 12:00:00' },
        unit_price: { type: Number, mean: '单价', example: 1 },
        status: { type: Number, mean: '状态', example: 1 },
        comment: { type: String, mean: '备注', example: '备注' },
        from_bidding: { type: Boolean, mean: '是否来自竞价', example: true },
        count: { type: Number, mean: '数量', example: 1 },
        p_weight: { type: Number, mean: '皮重', example: 1 },
        m_weight: { type: Number, mean: '毛重', example: 1 },
        p_time: { type: String, mean: '皮重时间', example: '2020-01-01 12:00:00' },
        m_time: { type: String, mean: '毛重时间', example: '2020-01-01 12:00:00' },
        use_for: { type: String, mean: '用途', example: '用途' },
        drop_address: { type: String, mean: '卸货地址', example: '卸货地址' },
        register_time: { type: String, mean: '登记时间', example: '2020-01-01 12:00:00' },
        register_number: { type: Number, mean: '登记号', example: 1 },
        stuff: { type: Object, mean: '货物', explain:{
            id: { type: Number, mean: '货物ID', example: 1 },
            name: { type: String, mean: '货物名称', example: '货物名称' },
        } },
        company: { type: Object, mean: '购买公司', explain:{
            id: { type: Number, mean: '公司ID', example: 1 },
            name: { type: String, mean: '公司名称', example: '公司名称' },
        } },
        driver: { type: Object, mean: '司机', explain:{
            id: { type: Number, mean: '司机ID', example: 1 },
            name: { type: String, mean: '司机名称', example: '司机名称' },
            phone: { type: String, mean: '司机电话', example: '司机电话' },
            id_card: { type: String, mean: '司机身份证', example: '司机身份证' },
        } },
        main_vehicle: { type: Object, mean: '主车', explain:{
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
        } },
        behind_vehicle: { type: Object, mean: '挂车', explain:{
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
        } },
        plan_histories: { type: Array, mean: '操作历史', explain:{
            id: { type: Number, mean: '历史ID', example: 1 },
            time: { type: String, mean: '历史时间', example: '2020-01-01 12:00:00' },
            operator: { type: String, mean: '操作人', example: '操作人' },
            action_type: { type: String, mean: '操作', example: '操作' },
        }},
    };
function install(app) {
    mkapi('/stuff/fetch', 'stuff', true, true, {
        name: { type: String, have_to: true, mean: '货物名称', example: '货物名称' },
        price: { type: Number, have_to: true, mean: '单价', example: 1 },
        comment: { type: String, have_to: false, mean: '备注', example: '备注' },
    }, {
        id: { type: Number, mean: '货物ID', example: 1 },
        name: { type: String, mean: '货物名称', example: '货物名称' },
        price: { type: Number, mean: '单价', example: 1 },
        comment: { type: String, mean: '备注', example: '备注' },
        next_price:{type:Number, mean:'下次单价', example:1},
        change_last_minutes:{type:Number, mean:'调价所剩分钟', example:23},
    }, '获取货物', '获取货物').add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        return await plan_lib.fetch_stuff(body.name, body.price, body.comment, company);
    }).install(app);
    mkapi('/stuff/get_all', 'stuff', false, true, {
    }, {
        stuff: {
            type: Array, mean: '货物', explain: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                price: { type: Number, mean: '单价', example: 1 },
                comment: { type: String, mean: '备注', example: '备注' },
                next_price: { type: Number, mean: '下次单价', example: 1 },
                change_last_minutes: { type: Number, mean: '调价所剩分钟', example: 23 },
            }
        }
    }, '获取所有货物', '获取所有货物', true).add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        return {
            stuff: await company.getStuff(
                {
                    order: [['id', 'ASC']],
                    offset: body.pageNo * 20,
                    limit: 20
                }
            ), total: await company.countStuff()
        };
    }).install(app);
    mkapi('/stuff/del', 'stuff', true, true, {
        id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '删除货物', '删除货物').add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(body.id);
        if (stuff && company) {
            await company.removeStuff(stuff);
            await stuff.destroy();
        }
        return { result: true };
    }).install(app);
    mkapi('/contract/make', 'stuff', true, true, {
        customer_id: { type: Number, have_to: true, mean: '客户ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '创建合同', '创建合同').add_handler(async function (body, token) {
        let ret = {result:false};
        let rbac_lib = require('./rbac_lib');
        let sale_company = await rbac_lib.get_company_by_token(token);
        let buy_company = await db_opt.get_sq().models.company.findByPk(body.customer_id);
        if (buy_company && sale_company)
        {
            await plan_lib.make_contract(buy_company, sale_company);
            ret.result = true;
        }

        return ret;
    }).install(app);
    mkapi('/contract/destroy', 'stuff', true, true, {
        contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '删除合同', '删除合同').add_handler(async function (body, token) {
        let ret = { result: false };
        let rbac_lib = require('./rbac_lib');
        let sale_company = await rbac_lib.get_company_by_token(token);
        let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
        if (contract && sale_company && await sale_company.hasSale_contract(contract)) {
            await plan_lib.destroy_contract(contract.id);
            ret.result = true;
        }
        return ret;
    }).install(app);
    mkapi('/contract/get_all_sale', 'stuff', false, true, {
    }, {
        contracts: {
            type: Array, mean: '合同', explain: {
                id: { type: Number, mean: '合同ID', example: 1 },
                sign_time: { type: String, mean: '签订时间', example: '2020-01-01 12:00:00' },
                balance: { type: Number, mean: '余额', example: 1 },
                stuff:{type:Array, mean:'货物', explain:{
                    id: { type: Number, mean: '货物ID', example: 1 },
                    name: { type: String, mean: '货物名称', example: '货物名称' },
                }},
                buy_company: { type: Object, mean: '购买公司', explain: {
                    id: { type: Number, mean: '公司ID', example: 1 },
                    name: { type: String, mean: '公司名称', example: '公司名称' },
                }},
            }
        }, total: { type: Number, mean: '总数', example: 1 },
    }, '获取所有销售合同', '获取所有合同', true).add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        let found_ret = await plan_lib.get_all_sale_contracts(company, body.pageNo);
        return {
            contracts:found_ret.rows,
            total:found_ret.count
        };
    }).install(app);
    mkapi('/contract/get_all_buy', 'customer', false, true, {
    }, {
        contracts: {
            type: Array, mean: '合同', explain: {
                id: { type: Number, mean: '合同ID', example: 1 },
                sign_time: { type: String, mean: '签订时间', example: '2020-01-01 12:00:00' },
                balance: { type: Number, mean: '余额', example: 1 },
                stuff: {
                    type: Array, mean: '货物', explain: {
                        id: { type: Number, mean: '货物ID', example: 1 },
                        name: { type: String, mean: '货物名称', example: '货物名称' },
                    }
                },
                sale_company: {
                    type: Object, mean: '销售公司', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名称', example: '公司名称' },
                    }
                },
            }
        }, total: { type: Number, mean: '总数', example: 1 },
    }, '获取所有采购合同', '获取所有合同', true).add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        let found_ret = await plan_lib.get_all_buy_contracts(company, body.pageNo);
        return {
            contracts: found_ret.rows,
            total: found_ret.count
        };
    }).install(app);
    mkapi('/contract/add_stuff', 'stuff', true, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '添加货物到合同', '添加货物到合同').add_handler(async function (body, token) {
        let ret = { result: false };
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(body.stuff_id);
        let contract = await sq.models.contract.findByPk(body.contract_id);
        let company = await require('./rbac_lib').get_company_by_token(token);
        if (stuff && contract && company && await company.hasSale_contract(contract)) {
            await plan_lib.add_stuff_to_contract(stuff, contract);
            ret.result = true;
        }
        return ret;
    }).install(app);
    mkapi('/contract/del_stuff', 'stuff', true, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '删除货物合同', '删除货物合同').add_handler(async function (body, token) {
        let ret = { result: false };
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(body.stuff_id);
        let contract = await sq.models.contract.findByPk(body.contract_id);
        let company = await require('./rbac_lib').get_company_by_token(token);
        if (stuff && contract && company && await company.hasSale_contract(contract)) {
            await plan_lib.del_stuff_from_contract(stuff, contract);
            ret.result = true;
        }
        return ret;
    }).install(app);
    mkapi('/stuff/get_stuff_on_sale', 'customer', false, true, {
    }, {
        stuff: {
            type: Array, mean: '货物', explain: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                price: { type: Number, mean: '单价', example: 1 },
                comment: { type: String, mean: '备注', example: '备注' },
                company: {type:Object, mean:'销售公司', explain:{
                    id: { type: Number, mean: '公司ID', example: 1 },
                    name: { type: String, mean: '公司名称', example: '公司名称' },
                }},
            }
        }
    }, '获取公司货物', '获取公司货物', true).add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        let ret = {
            stuff: [],
            total: 0
        };
        if (company) {
            ret = await plan_lib.get_stuff_on_sale(company, body.pageNo);
        }
        return {stuff:ret.rows, total:ret.count};
    }).install(app);
    mkapi('/driver/fetch', 'customer', true, true, {
        name: { type: String, have_to: true, mean: '司机姓名', example: '张三' },
        id_card: { type: String, have_to: true, mean: '司机身份证', example: '1234567890' },
        phone: { type: String, have_to: true, mean: '司机电话', example: '18911992582' },
    }, {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
    }, '获取或更新司机信息', '获取或更新司机信息').add_handler(async function (body, token) {
        return await plan_lib.fetch_driver(body.name, body.phone, body.id_card);
    }).install(app);
    mkapi('/vehicle/fetch', 'customer', true, true, {
        plate: { type: String, have_to: true, mean: '车牌', example: '车牌' },
    }, {
        id: { type: Number, mean: '车辆ID', example: 1 },
        plate: { type: String, mean: '车牌', example: '车牌' },
        is_behind: { type: Boolean, mean: '是否挂车', example: true },
    }, '获取或更新车辆信息', '获取或更新车辆信息').add_handler(async function (body, token) {
        let lastChar = body.plate.charAt(body.plate.length - 1);
        return await plan_lib.fetch_vehicle(body.plate, (lastChar === '挂'));
    }).install(app);
    mkapi('/plan/create_single_plan', 'customer', true, true, {
        plan_time: { type: String, have_to: true, mean: '计划时间', example: '2020-01-01 12:00:00' },
        comment: { type: String, have_to: false, mean: '备注', example: '备注' },
        use_for: { type: String, have_to: true, mean: '用途', example: '用途' },
        drop_address: { type: String, have_to: true, mean: '卸货地址', example: '卸货地址' },
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        main_vehicle_id: { type: Number, have_to: true, mean: '主车ID', example: 1 },
        behind_vehicle_id: { type: Number, have_to: true, mean: '挂车ID', example: 1 },
        driver_id: { type: Number, have_to: true, mean: '司机ID', example: 1 },
    }, plan_detail_define, '创建计划', '创建计划').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(body.stuff_id);
        let rbac_lib = require('./rbac_lib');
        let buy_company = await rbac_lib.get_company_by_token(token);
        let driver = await sq.models.driver.findByPk(body.driver_id);
        let main_vehicle = await sq.models.vehicle.findByPk(body.main_vehicle_id);
        let behind_vehicle = await sq.models.vehicle.findByPk(body.behind_vehicle_id);
        let new_plan_req = {
            plan_time: body.plan_time,
            comment: body.comment,
            use_for: body.use_for,
            drop_address: body.drop_address,
        };
        let user = await rbac_lib.get_user_by_token(token);
        let new_plan = await sq.models.plan.create(new_plan_req);
        if (new_plan && stuff && buy_company && driver && main_vehicle && behind_vehicle) {
            await new_plan.setStuff(stuff);
            await new_plan.setCompany(buy_company);
            await new_plan.setDriver(driver);
            await new_plan.setMain_vehicle(main_vehicle);
            await new_plan.setBehind_vehicle(behind_vehicle);
            await plan_lib.rp_history_create(new_plan, user.name);
            new_plan.unit_price = stuff.price;
            new_plan.status = 0;
            await new_plan.save();
        }
        else
        {
            throw {err_msg:'创建计划失败'};
        }
        return new_plan;
    }).install(app);
    mkapi('/plan/get_bought_plans', 'customer', false, true, {
        start_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01 12:00:00' },
    }, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取购买的计划', '获取购买的计划', true).add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        let search_ret = await plan_lib.search_bought_plans(company, body.pageNo, body);
        return {plans:search_ret.rows, total:search_ret.count};
    }).install(app);
    mkapi('/plan/get_sold_plans', 'plan', false, true, {
        start_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01 12:00:00' },
    }, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取销售的计划', '获取销售的计划', true).add_handler(async function (body, token) {
        let rbac_lib = require('./rbac_lib');
        let company = await rbac_lib.get_company_by_token(token);
        let search_ret = await plan_lib.search_sold_plans(company, body.pageNo, body);
        return {plans:search_ret.rows, total:search_ret.count};
    }).install(app);
    mkapi('/plan/confirm_single_plan', 'plan', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
        comment: { type: String, have_to: false, mean: '备注', example: '备注' }
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '确认计划', '确认计划').add_handler(async function (body, token) {
        await plan_lib.confirm_single_plan(body.plan_id, body.comment);
        return { result: true };
    }).install(app);
}

module.exports = install;
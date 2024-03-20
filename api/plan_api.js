const mkapi = require('./api_utils');
const plan_lib = require('./plan_lib');
const db_opt = require('./db_opt');
const rbac_lib = require('./rbac_lib');
const sc_lib = require('./sc_lib');
const wx_api_util = require('./wx_api_util');
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
    enter_time: { type: String, mean: '进场时间', example: '2020-01-01 12:00:00' },
    rbac_user:{type: Object, mean: '创建人', explain: {
        id: { type: Number, mean: '用户ID', example: 1 },
        name: { type: String, mean: '用户姓名', example: '用户姓名' },
        phone: { type: String, mean: '用户电话', example: '用户电话' },
    }},
    stuff: {
        type: Object, mean: '货物', explain: {
            id: { type: Number, mean: '货物ID', example: 1 },
            name: { type: String, mean: '货物名称', example: '货物名称' },
        }
    },
    company: {
        type: Object, mean: '购买公司', explain: {
            id: { type: Number, mean: '公司ID', example: 1 },
            name: { type: String, mean: '公司名称', example: '公司名称' },
        }
    },
    driver: {
        type: Object, mean: '司机', explain: {
            id: { type: Number, mean: '司机ID', example: 1 },
            name: { type: String, mean: '司机名称', example: '司机名称' },
            phone: { type: String, mean: '司机电话', example: '司机电话' },
            id_card: { type: String, mean: '司机身份证', example: '司机身份证' },
        }
    },
    main_vehicle: {
        type: Object, mean: '主车', explain: {
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
        }
    },
    behind_vehicle: {
        type: Object, mean: '挂车', explain: {
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
        }
    },
    plan_histories: {
        type: Array, mean: '操作历史', explain: {
            id: { type: Number, mean: '历史ID', example: 1 },
            time: { type: String, mean: '历史时间', example: '2020-01-01 12:00:00' },
            operator: { type: String, mean: '操作人', example: '操作人' },
            action_type: { type: String, mean: '操作', example: '操作' },
        }
    },
    sc_info: {
        type: Array, mean: '安检信息', explain: sc_lib.sc_req_detail
    },
};
function install(app) {
    mkapi('/stuff/fetch', 'stuff', true, true, {
        name: { type: String, have_to: true, mean: '货物名称', example: '货物名称' },
        comment: { type: String, have_to: false, mean: '备注', example: '备注' },
        expect_count: { type: Number, have_to: false, mean: '预期数量', example: 1 },
    }, {
        id: { type: Number, mean: '货物ID', example: 1 },
        name: { type: String, mean: '货物名称', example: '货物名称' },
        price: { type: Number, mean: '单价', example: 1 },
        comment: { type: String, mean: '备注', example: '备注' },
        next_price: { type: Number, mean: '下次单价', example: 1 },
        change_last_minutes: { type: Number, mean: '调价所剩分钟', example: 23 },
    }, '获取货物', '获取货物').add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        return await plan_lib.fetch_stuff(body.name, body.comment, company, body.expect_count);
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
        let company = await rbac_lib.get_company_by_token(token);
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(body.id);
        if (stuff && company && company.hasStuff(stuff)) {
            await stuff.destroy();
        }
        return { result: true };
    }).install(app);
    mkapi('/stuff/sc_config', 'stuff', true, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        need_sc: { type: Boolean, have_to: true, mean: '是否需要安检', example: true },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '配置货物是否需要安检', '配置货物是否需要安检').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(token);
        let stuff = await sq.models.stuff.findByPk(body.stuff_id);
        if (stuff && company && await company.hasStuff(stuff)) {
            stuff.need_sc = body.need_sc;
            await stuff.save();
        }
        else
        {
            throw { err_msg: '货物不存在' };
        }
        return { result: true };
    }).install(app);
    mkapi('/stuff/change_price', 'stuff', true, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        price:{ type: Number, have_to: true, mean: '新单价', example: 1 },
        comment:{ type: String, have_to: true, mean: '备注', example: '备注' },
        to_plan:{ type: Boolean, have_to: true, mean: '是否对未关闭计划生效', example: true },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '调价', '调价').add_handler(async function (body, token) {
        await plan_lib.change_stuff_price(body.stuff_id,token, body.price, body.to_plan, body.comment);
        return { result: true };
    }).install(app);
    mkapi('/stuff/get_price_history', 'stuff', false, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
    }, {
        histories: {
            type: Array, mean: '调价历史', explain: {
                id: { type: Number, mean: '历史ID', example: 1 },
                time: { type: String, mean: '历史时间', example: '2020-01-01 12:00:00' },
                operator: { type: String, mean: '操作人', example: '操作人' },
                comment: { type: String, mean: '备注', example: '备注' },
                new_price: { type: Number, mean: '新单价', example: 1 },
            }
        }
    }, '获取调价历史', '获取调价历史', true).add_handler(async function (body, token) {
        let ret = await plan_lib.get_price_history(body.stuff_id, token, body.pageNo);
        return { histories: ret.rows, total: ret.count };
    }).install(app);
    mkapi('/contract/make', 'stuff', true, true, {
        customer_id: { type: Number, have_to: true, mean: '客户ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '创建合同', '创建合同').add_handler(async function (body, token) {
        let ret = { result: false };
        let sale_company = await rbac_lib.get_company_by_token(token);
        let buy_company = await db_opt.get_sq().models.company.findByPk(body.customer_id);
        if (buy_company && sale_company) {
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
        let sale_company = await rbac_lib.get_company_by_token(token);
        let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
        if (contract && sale_company && await sale_company.hasSale_contract(contract)) {
            await plan_lib.destroy_contract(contract.id);
            ret.result = true;
        }
        return ret;
    }).install(app);
    mkapi('/contract/get_all_sale', 'stuff', false, true, {
        stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
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
                buy_company: {
                    type: Object, mean: '购买公司', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名称', example: '公司名称' },
                    }
                },
                rbac_users:{type: Array, mean: '授权用户', explain: {
                    id: { type: Number, mean: '用户ID', example: 1 },
                    name: { type: String, mean: '用户姓名', example: '用户姓名' },
                    phone: { type: String, mean: '用户电话', example: '用户电话' },
                }}
            }
        }, total: { type: Number, mean: '总数', example: 1 },
    }, '获取所有销售合同', '获取所有合同', true).add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        let found_ret = await plan_lib.get_all_sale_contracts(company, body.pageNo, body.stuff_id);
        return {
            contracts: found_ret.rows,
            total: found_ret.count
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
        let company = await rbac_lib.get_company_by_token(token);
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
        let company = await rbac_lib.get_company_by_token(token);
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
                company: {
                    type: Object, mean: '销售公司', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名称', example: '公司名称' },
                    }
                },
            }
        }
    }, '获取公司货物', '获取公司货物', true).add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        let ret = {
            stuff: [],
            total: 0
        };
        if (company) {
            ret = await plan_lib.get_stuff_on_sale(company, body.pageNo);
        }
        return { stuff: ret.rows, total: ret.count };
    }).install(app);
    mkapi('/contract/authorize', 'plan', true, true, {
        contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
        phone: { type: String, have_to: true, mean: '用户电话', example: '用户电话' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '授权用户创建计划', '授权用户创建计划').add_handler(async function (body, token) {
        await plan_lib.authorize_user2contract(body.phone, body.contract_id, token);
        return {result:true};
    }).install(app);
    mkapi('/contract/unauthorize', 'plan', true, true, {
        contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
        phone: { type: String, have_to: true, mean: '用户电话', example: '用户电话' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '取消授权用户创建计划', '取消授权用户创建计划').add_handler(async function (body, token) {
        await plan_lib.unauthorize_user2contract(body.phone, body.contract_id, token);
        return {result:true};
    }).install(app);
    mkapi('/driver/fetch', 'customer', true, true, {
        name: { type: String, have_to: false, mean: '司机姓名', example: '张三' },
        id_card: { type: String, have_to: false, mean: '司机身份证', example: '1234567890' },
        phone: { type: String, have_to: true, mean: '司机电话', example: '18911992582' },
    }, {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
    }, '获取或更新司机信息', '获取或更新司机信息').add_handler(async function (body, token) {
        return (await plan_lib.fetch_driver(body.name, body.phone, body.id_card)).toJSON();
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
        if (new_plan && stuff && buy_company && driver && main_vehicle && behind_vehicle && user) {
            await new_plan.setStuff(stuff);
            await new_plan.setCompany(buy_company);
            await new_plan.setDriver(driver);
            await new_plan.setMain_vehicle(main_vehicle);
            await new_plan.setBehind_vehicle(behind_vehicle);
            await new_plan.setRbac_user(user);
            await plan_lib.rp_history_create(new_plan, user.name);
            new_plan.unit_price = stuff.price;
            new_plan.status = 0;
            await new_plan.save();
        }
        else {
            throw { err_msg: '创建计划失败' };
        }
        return await plan_lib.get_single_plan_by_id(new_plan.id);
    }).install(app);
    mkapi('/plan/update', 'customer', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
        plan_time: { type: String, have_to: false, mean: '计划时间', example: '2020-01-01 12:00:00' },
        main_vehicle_id: { type: Number, have_to: false, mean: '主车ID', example: 1 },
        behind_vehicle_id: { type: Number, have_to: false, mean: '挂车ID', example: 1 },
        driver_id: { type: Number, have_to: false, mean: '司机ID', example: 1 },
        comment: { type: String, have_to: false, mean: '备注', example: '备注' },
        use_for: { type: String, have_to: false, mean: '用途', example: '用途' },
        drop_address: { type: String, have_to: false, mean: '卸货地址', example: '卸货地址' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '更新计划', '更新计划').add_handler(async function (body, token) {
        await plan_lib.update_single_plan(body.plan_id, token, body.plan_time, body.main_vehicle_id, body.behind_vehicle_id, body.driver_id, body.comment,  body.use_for, body.drop_address);
        return {result: true};
    }).install(app);
    mkapi('/plan/get_bought_plans', 'customer', false, true, {
        start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
        status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
    }, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取购买的计划', '获取购买的计划', true).add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        let search_ret = await plan_lib.search_bought_plans(company, body.pageNo, body);
        return { plans: search_ret.rows, total: search_ret.count };
    }).install(app);
    mkapi('/plan/get_sold_plans', 'plan', false, true, {
        start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
        status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
    }, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取销售的计划', '获取销售的计划', true).add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        let search_ret = await plan_lib.search_sold_plans(company, body.pageNo, body);
        return { plans: search_ret.rows, total: search_ret.count };
    }).install(app);
    mkapi('/plan/confirm_single_plan', 'plan', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '确认计划', '确认计划').add_handler(async function (body, token) {
        await plan_lib.confirm_single_plan(body.plan_id, token);
        return { result: true };
    }).install(app);
    mkapi('/plan/pay', 'cash', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '手动验款', '手动验款').add_handler(async function (body, token) {
        await plan_lib.manual_pay_plan(body.plan_id, token);
        return { result: true };
    }).install(app);
    mkapi('/plan/enter', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '车辆入场', '车辆入场').add_handler(async function (body, token) {
        await plan_lib.plan_enter(body.plan_id, token);
        return { result: true };
    }).install(app);
    mkapi('/driver/online', 'none', false, false, {
        open_id_code: { type: String, have_to: true, mean: '微信open_id授权凭证', example: 'open_id' }
    }, {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        open_id: { type: String, mean: '微信open_id', example: 'open_id' },
    }, '司机上线', '司机上线').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code)
        let driver = await sq.models.driver.findOne({ where: { open_id: open_id } });
        if (driver) {
            return driver;
        }
        else {
            throw { err_msg: '司机不存在' };
        }
    }).install(app);
    mkapi('/driver/update', 'none', false, false, {
        open_id_code: { type: String, have_to: true, mean: '微信open_id授权码', example: 'open_id' },
        name: { type: String, have_to: true, mean: '司机姓名', example: '张三' },
        phone_code: { type: String, have_to: true, mean: '司机电话_授权码', example: '18911992582' },
        id_card: { type: String, have_to: true, mean: '司机身份证', example: '1234567890' },
    }, {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        open_id: { type: String, mean: '微信open_id', example: 'open_id' },
    }, '司机更新', '司机更新').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code)
        let driver_phone = await wx_api_util.get_phone_by_code(body.phone_code);
        let driver = await plan_lib.fetch_driver(body.name, driver_phone, body.id_card);
        if (driver) {
            let old_driver = await sq.models.driver.findOne({
                where: {
                    [db_opt.Op.and]: [
                        { open_id: open_id },
                        { phone: { [db_opt.Op.ne]: driver_phone } },
                    ]
                }
            });
            if (old_driver) {
                old_driver.open_id = '';
                await old_driver.save();
            }
            driver.name = body.name;
            driver.id_card = body.id_card;
            driver.open_id = open_id;
            await driver.save();
        }
        return driver;
    }).install(app);
    mkapi('/driver/self_plan', 'none', false, false, {
        open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
    }, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取自己的计划', '获取自己的计划', true).add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
        if (driver) {
            let ret = { plans: [], total: 0 };
            ret.plans = await driver.getPlans({ where: { status: 2 }, limit: 20, offset: body.pageNo * 20, include: plan_lib.plan_detail_include() });
            ret.total = await driver.countPlans({ where: { status: 2 } });
            return ret;
        }
        else {
            throw { err_msg: '司机不存在' };
        }
    }).install(app);
    mkapi('/plan/check_in', 'none', false, false, {
        open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '司机签到', '司机签到').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
        let plan = await plan_lib.get_single_plan_by_id(body.plan_id);
        if (driver && plan && plan.status == 2 && await driver.hasPlan(plan) && await sc_lib.plan_passed_sc(body.plan_id)) {
            await require('./field_lib').handle_driver_check_in(plan);
            return { result: true };
        }
        else {
            throw { err_msg: '无法签到' };
        }
    }).install(app);
    mkapi('/plan/cancel_check_in', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '取消计划签到', '取消计划签到').add_handler(async function (body, token) {
        await plan_lib.action_in_plan(body.plan_id, token, 2, async (plan) => {
            if (plan.enter_time && plan.enter_time.length > 0) {
                throw { err_msg: '已经进厂' };
            }
            await require('./field_lib').handle_cancel_check_in(plan);
        });
        return { result: true };
    }).install(app);
    mkapi('/plan/deliver', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
        count: { type: Number, have_to: true, mean: '数量', example: 1 },
        p_weight: { type: Number, have_to: false, mean: '皮重', example: 1 },
        m_weight: { type: Number, have_to: false, mean: '毛重', example: 1 },
        p_time: { type: String, have_to: false, mean: '皮重时间', example: '2020-01-01 12:00:00' },
        m_time: { type: String, have_to: false, mean: '毛重时间', example: '2020-01-01 12:00:00' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '计划发车', '计划发车').add_handler(async function (body, token) {
        await plan_lib.deliver_plan(body.plan_id, token, body.count, body.p_weight, body.m_weight, body.p_time, body.m_time);
        return { result: true };
    }).install(app);
    mkapi('/plan/rollback', 'plan', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '计划回退', '计划回退').add_handler(async function (body, token) {
        await plan_lib.plan_rollback(body.plan_id, token);
        return { result: true };
    }).install(app);
    mkapi('/plan/cancel', 'customer', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '取消计划', '取消计划').add_handler(async function (body, token) {
        let opt_company = await rbac_lib.get_company_by_token(token);
        let user = await rbac_lib.get_user_by_token(token);
        let plan = await plan_lib.get_single_plan_by_id(body.plan_id);
        if (user && plan && opt_company && await opt_company.hasPlan(plan) && plan.status == 0) {
            await plan_lib.plan_close(plan, user.name, true);
        }
        else {
            throw { err_msg: '无权限' };
        }
        return { result: true };
    }).install(app);
    mkapi('/plan/close', 'plan', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '关闭计划', '关闭计划').add_handler(async function (body, token) {
        await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
            await plan_lib.plan_close(plan, (await rbac_lib.get_user_by_token(token)).name, false);
        });
        return { result: true };
    }).install(app);
}

module.exports = install;
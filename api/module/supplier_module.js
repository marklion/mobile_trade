const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const bidding_lib = require('../lib/bidding_lib');
const db_opt = require('../db_opt');
const common = require('./common');
module.exports = {
    name: 'supplier',
    description: '供应商',
    methods: {
        contract_get: {
            name: '获取合同',
            description: '获取合同',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                contracts: {
                    type: Array, mean: '合同', explain: {
                        id: { type: Number, mean: '合同ID', example: 1 },
                        sign_time: { type: String, mean: '签订时间', example: '2020-01-01 12:00:00' },
                        balance: { type: Number, mean: '余额', example: 1 },
                        begin_time: { type: String, mean: '开始时间', example: '2020-01-01 12:00:00' },
                        end_time: { type: String, mean: '结束时间', example: '2020-01-01 12:00:00' },
                        number: { type: String, mean: '合同号', example: "abc" },
                        buy_company: {
                            type: Object, mean: '采购公司', explain: {
                                id: { type: Number, mean: '公司ID', example: 1 },
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                            }
                        },
                    }
                }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let found_ret = await plan_lib.get_all_sale_contracts(company, body.pageNo);
                return {
                    contracts: found_ret.rows,
                    total: found_ret.count
                };
            },
        },
        fetch_driver: common.fetch_driver,
        fetch_vehicle: common.fetch_vehicle,
        get_vehicle_pair: common.get_vehicle_pair,
        order_sale_create: {
            name: '创建采购订单',
            description: '创建采购订单',
            is_write: true,
            is_get_api: false,
            params: {
                plan_time: { type: String, have_to: true, mean: '计划时间', example: '2020-01-01 12:00:00' },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                use_for: { type: String, have_to: false, mean: '用途', example: '用途' },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                main_vehicle_id: { type: Number, have_to: true, mean: '主车ID', example: 1 },
                behind_vehicle_id: { type: Number, have_to: true, mean: '挂车ID', example: 1 },
                driver_id: { type: Number, have_to: true, mean: '司机ID', example: 1 },
                price:{type:Number, have_to:false, mean:'单价', example:102},
            },
            result: api_param_result_define.plan_detail_define,
            func: async function (body, token) {
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
                    new_plan.unit_price = body.price
                    new_plan.status = 0;
                    new_plan.is_buy = true;
                    await new_plan.save();
                }
                else {
                    throw { err_msg: '创建计划失败' };
                }
                return await plan_lib.get_single_plan_by_id(new_plan.id);
            },
        },
        order_sale_search: {
            name: '查询销售单',
            description: '查询销售单',
            is_write: false,
            is_get_api: true,
            params: api_param_result_define.order_search_cond,
            result: {
                plans: { type: Array, mean: '订单', explain: api_param_result_define.plan_detail_define }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let search_ret = await plan_lib.search_bought_plans(company, body.pageNo, body, true);
                return { plans: search_ret.rows, total: search_ret.count };
            },
        },
        order_sale_cancel: {
            name: '取消销售单',
            description: '取消销售单',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '单据ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
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
            },
        },
        get_stuff_need_buy: {
            name: '获取待购货物',
            description: '获取待购买货物',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                stuff: {
                    type: Array, mean: '货物', explain: {
                        id: { type: Number, mean: '货物ID', example: 1 },
                        name: { type: String, mean: '货物名称', example: '货物名称' },
                        price: { type: Number, mean: '单价', example: 1 },
                        comment: { type: String, mean: '备注', example: '备注' },
                        company: {
                            type: Object, mean: '采购公司', explain: {
                                id: { type: Number, mean: '公司ID', example: 1 },
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                            }
                        },
                    }
                }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let ret = {
                    stuff: [],
                    total: 0
                };
                if (company) {
                    ret = await plan_lib.get_stuff_need_buy(company, body.pageNo);
                }
                return { stuff: ret.rows, total: ret.count };
            },
        }
    }
}
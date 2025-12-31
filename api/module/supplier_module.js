const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
const common = require('./common');
const wx_api_util = require('../lib/wx_api_util');
const util_lib = require('../lib/util_lib');
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
                        expired:{type:Boolean,mean:'是否过期',example:false},
                        company: {
                            type: Object, mean: '采购公司', explain: {
                                id: { type: Number, mean: '公司ID', example: 1 },
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                                attachment:{type:String,mean:'附件',example:'附件'},
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
                price: { type: Number, have_to: false, mean: '单价', example: 102 },
                trans_company_name: { type: String, have_to: false, mean: '运输公司名称', example: 1 },
                proxy_company_name: { type: String, have_to: false, mean: '代理公司名称', example: 1 },
                is_proxy: { type: Boolean, have_to: false, mean: '是否代理', example: true },
                is_repeat: { type: Boolean, have_to: false, mean: '是否多次进厂', example: true },
            },
            result: api_param_result_define.plan_detail_define,
            func: async function (body, token) {
                let sq = db_opt.get_sq();

                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                let buy_company = undefined;
                let is_proxy = false;
                if (body.is_proxy) {
                    if (body.proxy_company_name) {
                        buy_company = await rbac_lib.add_company(body.proxy_company_name);
                    }
                    is_proxy = true;
                }
                else {
                    buy_company = await rbac_lib.get_company_by_token(token);
                }
                let sale_company = await stuff.getCompany();
                // 判断是否在黑名单中
                if (await plan_lib.is_in_blacklist(sale_company.id,body.driver_id, body.main_vehicle_id, body.behind_vehicle_id)) {
                    throw { err_msg: '创建计划失败，司机或车辆已被列入黑名单' };
                }
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
                if (new_plan && buy_company) {
                    await new_plan.setCompany(buy_company);
                }
                if (new_plan && stuff && driver && main_vehicle && behind_vehicle && user) {
                    await new_plan.setStuff(stuff);
                    await new_plan.setDriver(driver);
                    await new_plan.setMain_vehicle(main_vehicle);
                    await new_plan.setBehind_vehicle(behind_vehicle);
                    await new_plan.setRbac_user(user);
                    await plan_lib.rp_history_create(new_plan, user.name);
                    new_plan.unit_price = body.price
                    new_plan.status = 0;
                    new_plan.is_repeat = body.is_repeat;
                    new_plan.is_proxy = is_proxy;
                    new_plan.is_buy = true;
                    new_plan.trans_company_name = body.trans_company_name;
                    await new_plan.save();
                    plan_lib.mark_dup_info(new_plan.id);
                    wx_api_util.send_plan_status_msg(await util_lib.get_single_plan_by_id(new_plan.id));
                    if (!stuff.need_enter_weight && stuff.no_need_register && !stuff.need_sc) {
                        await plan_lib.confirm_single_plan(new_plan.id, token, true)
                    }
                }
                else {
                    throw { err_msg: '创建计划失败' };
                }
                return await util_lib.get_single_plan_by_id(new_plan.id);
            },
        },
        order_sale_update: common.order_update,
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
                let user = await rbac_lib.get_user_by_token(token);
                let search_ret = await plan_lib.search_bought_plans(user, body.pageNo, body, true);
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
                let user = await rbac_lib.get_user_by_token(token);
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (user && plan && await user.hasPlan(plan)) {
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
        },
        batch_copy: {
            name: '批量复制',
            description: '批量复制',
            is_write: true,
            is_get_api: false,
            params: {
                plan_time: { type: String, have_to: true, mean: '计划时间', example: '2020-01-01 12:00:00' },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                price: { type: Number, have_to: false, mean: '单价', example: 102 },
                trans_company_name: { type: String, have_to: false, mean: '运输公司名称', example: 1 },
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
                status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.batch_copy({
                    start_time: body.start_time,
                    end_time: body.end_time,
                    status: body.status,
                }, token, true, {
                    plan_time: body.plan_time,
                    comment: body.comment,
                    trans_company_name: body.trans_company_name,
                    unit_price: body.price,
                });
                return { result: true };
            },
        },
        get_company4proxy: {
            name: '获取可代理的公司列表',
            description: '获取可代理的公司列表',
            is_write: false,
            is_get_api: true,
            params: {
                company_id: { type: Number, have_to: true, mean: '公司ID', example: 1 },
            },
            result: {
                companies: {
                    type: Array, mean: '公司列表', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名', example: 'company_example' },
                    }
                }
            },
            func: async function (body, token) {
                let ret = {
                    total: 0,
                    companies: []
                }
                let sq = db_opt.get_sq();
                let user = await rbac_lib.get_user_by_token(token);
                let company = await sq.models.company.findByPk(body.company_id);
                if (user && company) {
                    let resp = await plan_lib.get_all_buy_contracts(company, body.pageNo);
                    for (let index = 0; index < resp.rows.length; index++) {
                        const element = resp.rows[index];
                        ret.companies.push({
                            name: element.company.name,
                            id: element.company.id,
                        });
                    }
                    ret.total = resp.count;
                }
                else {
                    throw { err_msg: '无法获取' };
                }
                return ret;
            },
        },

        export_plans: common.export_plans(async function (body, token) {
            let plans = await plan_lib.filter_plan4user(body, token, true);
            return await plan_lib.make_file_by_plans(plans);
        }),
    }
}
const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const bidding_lib = require('../lib/bidding_lib');
const db_opt = require('../db_opt');
const common = require('./common');
const cash_lib = require('../lib/cash_lib');
const wx_api_util = require('../lib/wx_api_util');
const util_lib = require('../lib/util_lib');
module.exports = {
    name: 'customer',
    description: '客户',
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
                        expired: { type: Boolean, mean: '是否过期', example: false },
                        stuff: {
                            type: Array, mean: '货物', explain: {
                                id: { type: Number, mean: '货物ID', example: 1 },
                                name: { type: String, mean: '货物名称', example: '货物名称' },
                            }
                        },
                        company: {
                            type: Object, mean: '销售公司', explain: {
                                id: { type: Number, mean: '公司ID', example: 1 },
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                                attachment: { type: String, mean: '附件', example: '附件' },
                            }
                        },
                    }
                }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let found_ret = await plan_lib.get_all_buy_contracts(company, body.pageNo);
                return {
                    contracts: found_ret.rows,
                    total: found_ret.count
                };
            },
        },
        get_charge_history: {
            name: '获取充值历史',
            description: '获取充值历史',

            is_write: false,
            is_get_api: true,
            params: {
                contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
            },
            result: {
                histories: {
                    type: Array, mean: '历史记录', explain: {
                        time: { type: String, mean: '时间', example: '2020-03-01 12:00:00' },
                        operator: { type: String, mean: '操作人', example: '张三' },
                        comment: { type: String, mean: '备注', example: '充值100元' },
                        cash_increased: { type: Number, mean: '增加金额', example: 100 },
                    }
                }
            },
            func: async function (body, token) {
                let get_ret = await cash_lib.get_history_by_company(token, body.contract_id, body.pageNo);
                return {
                    histories: get_ret.rows,
                    total: get_ret.count,
                }
            },
        },
        get_stuff_on_sale: {
            name: '获取在售货物',
            description: '获取在售货物',
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
                            type: Object, mean: '销售公司', explain: {
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
                    ret = await plan_lib.get_stuff_on_sale(company, body.pageNo);
                }
                return { stuff: ret.rows, total: ret.count };
            },
        },
        fetch_driver: common.fetch_driver,
        fetch_vehicle: common.fetch_vehicle,
        get_vehicle_pair: common.get_vehicle_pair,
        order_buy_create: {
            name: '创建采购订单',
            description: '创建采购订单',
            is_write: true,
            is_get_api: false,
            params: {
                plan_time: { type: String, have_to: true, mean: '计划时间', example: '2020-01-01 12:00:00' },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                use_for: { type: String, have_to: true, mean: '用途', example: '用途' },
                drop_address: { type: String, have_to: true, mean: '卸货地址', example: '卸货地址' },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                main_vehicle_id: { type: Number, have_to: true, mean: '主车ID', example: 1 },
                behind_vehicle_id: { type: Number, have_to: true, mean: '挂车ID', example: 1 },
                driver_id: { type: Number, have_to: true, mean: '司机ID', example: 1 },
                trans_company_name: { type: String, have_to: false, mean: '运输公司名称', example: 1 },
                bidding_id: { type: Number, have_to: false, mean: '竞价ID', example: 1 },
            },
            result: api_param_result_define.plan_detail_define,
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let bc = await sq.models.bidding_config.findByPk(body.bidding_id);
                let bi = undefined;
                if (bc) {
                    let user = await rbac_lib.get_user_by_token(token);
                    let joiners = await user.getBidding_items({
                        where: {
                            win: true
                        },
                        include: [{
                            model: sq.models.bidding_turn,
                            required: true,
                            include: [{
                                model: sq.models.bidding_config,
                                where: { id: bc.id, customer_confirm_time: { [db_opt.Op.ne]: null } },
                                required: true
                            }]
                        }]
                    });
                    if (joiners.length > 0) {
                        bi = joiners[0];
                    }
                    else {
                        throw { err_msg: '未确认价格,不能生成计划' };
                    }
                }
                let buy_company = await rbac_lib.get_company_by_token(token);

                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                let sale_company = await stuff.getCompany();
                // 判断是否在黑名单中
                if (await plan_lib.is_in_blacklist(sale_company.id, body.driver_id, body.main_vehicle_id, body.behind_vehicle_id)) {
                    throw { err_msg: '创建计划失败，司机或车辆已被列入黑名单' };
                }
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
                    new_plan.trans_company_name = body.trans_company_name;
                    if (bi) {
                        await new_plan.setBidding_item(bi);
                        new_plan.unit_price = bi.price;
                        new_plan.from_bidding = true;
                    }
                    await new_plan.save();
                    wx_api_util.send_plan_status_msg(await util_lib.get_single_plan_by_id(new_plan.id));
                }
                else {
                    throw { err_msg: '创建计划失败' };
                }
                return await util_lib.get_single_plan_by_id(new_plan.id);
            },
        },
        order_buy_update: common.order_update,
        order_buy_cancel: {
            name: '取消采购单',
            description: '取消采购单',
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
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (user && plan && opt_company && await opt_company.hasPlan(plan)) {
                    await plan_lib.plan_close(plan, user.name, true);
                }
                else {
                    throw { err_msg: '无权限' };
                }
                return { result: true };
            },
        },
        order_buy_search: {
            name: '查询采购单',
            description: '查询采购单',

            is_write: false,
            is_get_api: true,
            params: api_param_result_define.order_search_cond,
            result: {
                plans: { type: Array, mean: '订单', explain: api_param_result_define.plan_detail_define }
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                let search_ret = await plan_lib.search_bought_plans(user, body.pageNo, body);
                return { plans: search_ret.rows, total: search_ret.count };
            },
        },
        bidding_search: {
            name: '查询竞标单',
            description: '查询竞标单',

            is_write: false,
            is_get_api: true,
            params: {},
            result: api_param_result_define.bidding_items,
            func: async function (body, token) {
                return await bidding_lib.get_all_joined_bidding(token, body.pageNo);
            },
        },
        bidding_accept: {
            name: '接受竞标',
            description: '接受竞标',

            is_write: true,
            is_get_api: false,
            params: {
                item_id: { type: Number, have_to: true, mean: '出价ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                await bidding_lib.accept_bidding(token, body.item_id);
                return { result: true };
            },
        },
        bidding_confirm: {
            name: '竞价结果确认',
            description: '竞价结果确认',
            is_write: true,
            is_get_api: false,
            params: {
                bidding_id: { type: Number, have_to: true, mean: '竞价ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                return await bidding_lib.confirm_bidding(token, body.bidding_id);
            }
        },
        bidding_price: {
            name: '出价',
            description: '出价',

            is_write: true,
            is_get_api: false,
            params: {
                item_id: { type: Number, have_to: true, mean: '出价ID', example: 1 },
                price: { type: Number, have_to: true, mean: '价格', example: 100 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                await bidding_lib.bid_price(token, body.item_id, body.price);
                return { result: true };
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
                use_for: { type: String, have_to: true, mean: '用途', example: '用途' },
                drop_address: { type: String, have_to: true, mean: '卸货地址', example: '卸货地址' },
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
                }, token, false, {
                    plan_time: body.plan_time,
                    comment: body.comment,
                    use_for: body.use_for,
                    drop_address: body.drop_address,
                    trans_company_name: body.trans_company_name,
                });
                return { result: true };
            },
        },
        export_plans: common.export_plans(async function (body, token) {
            let plans = await plan_lib.filter_plan4user(body, token);
            return await plan_lib.make_file_by_plans(plans);
        }),
    }
}
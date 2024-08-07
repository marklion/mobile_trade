const {
    api_param_result_define,
    plan_lib,
    rbac_lib,
    db_opt,
    common} = require('./common_header');
const moment = require('moment');
module.exports = {
    name: 'sale_management',
    description: '销售管理',
    methods: {
        order_update:common.order_update,
        order_sale_confirm: {
            name: '销售订单确认',
            description: '销售订单确认',

            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.confirm_single_plan(body.plan_id, token);
                return { result: true };
            },
        },
        order_batch_confirm: {
            name: '批量确认',
            description: '批量确认',

            is_write: true,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
                status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
                stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
                company_id: { type: Number, have_to: false, mean: '公司ID', example: 1 },
            },
            result: {

                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let ret = await plan_lib.batch_confirm(body, token);
                if (ret) {
                    throw { err_msg: '批量确认失败:' + ret };
                }
                else {
                    return { result: true };
                }
            },
        },
        order_sale_pay: {
            name: '手工验款',
            description: '手工验款',

            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.manual_pay_plan(body.plan_id, token);
                return { result: true };
            },
        },
        order_search: {
            name: '销售订单查询',
            description: '销售订单查询',

            is_write: false,
            is_get_api: true,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
                status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
                stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
                company_id: { type: Number, have_to: false, mean: '公司ID', example: 1 },
                hide_manual_close: { type: Boolean, have_to: false, mean: '隐藏手动关闭', example: true },
                only_count: { type: Boolean, have_to: false, mean: '只返回数量', example: true },
            },
            result: {
                plans: {
                    type: Array, mean: '计划', explain: api_param_result_define.plan_detail_define,
                },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let search_ret = await plan_lib.search_sold_plans(company, body.pageNo, body);
                return { plans: search_ret.rows, total: search_ret.count };
            },
        },
        order_rollback: {
            name: '销售订单回滚',
            description: '销售订单回滚',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                msg: { type: String, have_to: true, mean: '回滚原因', example: '回滚原因' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.plan_rollback(body.plan_id, token, body.msg);
                return { result: true };
            }
        },
        close: {
            name: '关闭销售订单',
            description: '关闭销售订单',

            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
                    await plan_lib.plan_close(plan, (await rbac_lib.get_user_by_token(token)).name, false);
                });
                return { result: true };
            }
        },
        get_checkin_config: {
            name: '获取签到配置',
            description: '获取签到配置',

            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                lat: { type: Number, mean: '纬度', example: 1 },
                lon: { type: Number, mean: '经度', example: 1 },
                distance_limit: { type: Number, mean: '距离限制', example: 1 },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return {
                    lat: company.pos_lat,
                    lon: company.pos_lon,
                    distance_limit: company.distance_limit,
                }
            },
        },
        set_checkin_config: {
            name: '设置签到配置',
            description: '设置签到配置',

            is_write: true,
            is_get_api: false,
            params: {
                lat: { type: Number, have_to: true, mean: '纬度', example: 1 },
                lon: { type: Number, have_to: true, mean: '经度', example: 1 },
                distance_limit: { type: Number, have_to: true, mean: '距离限制', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                company.pos_lat = body.lat;
                company.pos_lon = body.lon;
                company.distance_limit = body.distance_limit;
                await company.save();
                return { result: true };
            },
        },
        contract_make: {
            name: '生成合同',
            description: '生成合同',

            is_write: true,
            is_get_api: false,
            params: {
                customer_id: { type: Number, have_to: true, mean: '客户ID', example: 1 },
                begin_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01 12:00:00' },
                number: { type: String, have_to: false, mean: '合同号', example: 1 },
                customer_code: { type: String, have_to: false, mean: '客户合同号', example: 1 },
            },
            result: {
                contract_id: { type: Number, mean: '合同ID', example: 1 }
            },
            func: async function (body, token) {
                let ret = { contract_id: 0 }
                let sale_company = await rbac_lib.get_company_by_token(token);
                let buy_company = await db_opt.get_sq().models.company.findByPk(body.customer_id);
                if (buy_company && sale_company) {
                    ret = await plan_lib.make_contract(buy_company, sale_company, body.begin_time, body.end_time, body.number, body.customer_code);
                    ret.contract_id = ret.id;
                }
                return ret;
            }
        },
        contract_destroy: {
            name: '销毁合同',
            description: '销毁合同',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let ret = { result: false };
                let sale_company = await rbac_lib.get_company_by_token(token);
                let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
                if (contract && sale_company && await sale_company.hasSale_contract(contract)) {
                    await plan_lib.destroy_contract(contract.id);
                    ret.result = true;
                }
                return ret;
            },
        },
        get_contract_by_customer:{
            name: '获取客户合同',
            description: '获取客户合同',
            is_write: false,
            is_get_api: false,
            params:{
                customer_id:{type:Number,have_to:true,mean:'客户ID',example:1}
            },
            result: {
                id: { type: Number, mean: '合同ID', example: 1 },
                sign_time: { type: String, mean: '签订时间', example: '2020-01-01 12:00:00' },
                balance: { type: Number, mean: '余额', example: 1 },
                begin_time: { type: String, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, mean: '结束时间', example: '2020-01-01 12:00:00' },
                number: { type: String, mean: '合同号', example: "abc" },
                customer_code: { type: String, mean: '客户合同号', example: "sss" },
                rbac_users: {
                    type: Array, mean: '授权用户', explain: {
                        id: { type: Number, mean: '用户ID', example: 1 },
                        name: { type: String, mean: '用户姓名', example: '用户姓名' },
                        phone: { type: String, mean: '用户电话', example: '用户电话' },
                    }
                }
            },
            func:async function(body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let contracts = await company.getSale_contracts({
                    where:{
                        buyCompanyId:body.customer_id
                    },
                    paranoid:false,
                    include:db_opt.get_sq().models.rbac_user
                })
                if (contracts.length != 1)
                {
                    throw {err_msg:"合同不存在"}
                }
                return contracts[0]
            },
        },
        contract_get: {
            name: '获取合同',
            description: '获取合同',
            is_write: false,
            is_get_api: true,
            params: {
                stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
            },
            result: {
                contracts: {
                    type: Array, mean: '合同', explain: {
                        id: { type: Number, mean: '合同ID', example: 1 },
                        sign_time: { type: String, mean: '签订时间', example: '2020-01-01 12:00:00' },
                        balance: { type: Number, mean: '余额', example: 1 },
                        begin_time: { type: String, mean: '开始时间', example: '2020-01-01 12:00:00' },
                        end_time: { type: String, mean: '结束时间', example: '2020-01-01 12:00:00' },
                        number: { type: String, mean: '合同号', example: "abc" },
                        customer_code: { type: String, mean: '客户合同号', example: "sss" },
                        expired:{type:Boolean,mean:'销售是否过期',example:false},
                        stuff: {
                            type: Array, mean: '货物', explain: {
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
                        rbac_users: {
                            type: Array, mean: '授权用户', explain: {
                                id: { type: Number, mean: '用户ID', example: 1 },
                                name: { type: String, mean: '用户姓名', example: '用户姓名' },
                                phone: { type: String, mean: '用户电话', example: '用户电话' },
                            }
                        }
                    }
                }
            },

            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let found_ret = await plan_lib.get_all_sale_contracts(company, body.pageNo, body.stuff_id);
                return {
                    contracts: found_ret.rows,
                    total: found_ret.count
                };
            }
        },
        contract_add_stuff: {
            name: '合同添加货物',
            description: '合同添加货物',
            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
                let stuff = await db_opt.get_sq().models.stuff.findByPk(body.stuff_id);
                if (contract && stuff && company && await company.hasSale_contract(contract)) {
                    await plan_lib.add_stuff_to_contract(stuff, contract);
                    ret.result = true;
                }
                return ret;
            },
        },
        contract_del_stuff: {
            name: '合同删除货物',
            description: '合同删除货物',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
                let stuff = await db_opt.get_sq().models.stuff.findByPk(body.stuff_id);
                if (contract && stuff && company && await company.hasSale_contract(contract)) {
                    await plan_lib.del_stuff_from_contract(stuff, contract);
                    ret.result = true;
                }
                return ret;
            },
        },
        authorize_user: {
            name: '授权用户',
            description: '授权用户',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                phone: { type: String, have_to: true, mean: '用户电话', example: '用户电话' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.authorize_user2contract(body.phone, body.contract_id, token);
                return { result: true };
            }
        },
        unauthorize_user: {
            name: '取消授权用户',
            description: '取消授权用户',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                phone: { type: String, have_to: true, mean: '用户电话', example: '用户电话' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.unauthorize_user2contract(body.phone, body.contract_id, token);
                return { result: true };
            }
        },
        export_plans: common.export_plans(async function (body, token) {
            let plans = await plan_lib.filter_plan4manager(body, token);
            return await plan_lib.make_file_by_plans(plans);
        }),
        export_exe_rate: {
            name: '导出执行率',
            description: '导出执行率',
            is_write: false,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await common.do_export_later(token, '执行率导出', async () => {
                    return await plan_lib.make_exe_rate_file(body, token);
                })
            }
        },
        get_count_by_customer: {
            name: '获取客户订单数量',
            description: '获取客户订单数量',
            is_write: false,
            is_get_api: false,
            params: {
                day_offset: { type: Number, have_to: false, mean: '偏移天数', example: 1 },
            },
            result: {
                statistic: {
                    type: Array, mean: '统计', explain: {
                        company: {
                            type: Object, mean: '公司', explain: {
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                            }
                        },
                        confirm_count: { type: Number, mean: '确认订单数量', example: 1 },
                        finish_count: { type: Number, mean: '完成订单数量', example: 1 },
                    }
                }
            },
            func: async function (body, token) {
                let ret = [];
                let company = await rbac_lib.get_company_by_token(token);
                let day_offset = 0;
                if (body.day_offset) {
                    day_offset = body.day_offset;
                }
                let condition = {
                    plan_time: moment().add(day_offset, 'days').format('YYYY-MM-DD'), stuffId: {
                        [db_opt.Op.in]: [],
                    },
                };
                let stuff = await company.getStuff({ where: { use_for_buy: false } });
                for (let index = 0; index < stuff.length; index++) {
                    const element = stuff[index];
                    condition.stuffId[db_opt.Op.in].push(element.id);
                }
                let plans = await db_opt.get_sq().models.plan.findAll({
                    where: condition,
                    group: 'companyId'
                });
                for (let index = 0; index < plans.length; index++) {
                    const element = plans[index];
                    let customer = await db_opt.get_sq().models.company.findByPk(element.companyId);
                    let confirm_count = await customer.countPlans({
                        where: function () {
                            let total_cond = {
                                ...condition,
                                status: {
                                    [db_opt.Op.ne]: 0
                                },
                                '$plan_histories.action_type$': '确认'
                            }
                            if (body.day_offset == 0) {
                                total_cond.manual_close = false;
                            }
                            return total_cond;
                        }(),
                        include: [{
                            model: db_opt.get_sq().models.plan_history,
                            where: { action_type: '确认' }
                        }]
                    });
                    let finish_count = await customer.countPlans({
                        where: {
                            ...condition,
                            status: 3,
                            manual_close: false
                        }
                    });
                    ret.push({
                        company: customer,
                        confirm_count: confirm_count,
                        finish_count: finish_count
                    })
                }
                return { statistic: ret };
            },
        },
    },
}
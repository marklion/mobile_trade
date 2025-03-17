const cash_lib = require('../lib/cash_lib');
const common = require('./common');
const rbac_lib = require('../lib/rbac_lib');
const { get_single_plan_by_id } = require('../lib/util_lib');
module.exports = {
    name: 'cash',
    description: '余额管理',
    methods: {
        charge: {
            name: '充值',
            description: '充值',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
                cash_increased: { type: Number, have_to: false, mean: '增加金额', example: 100 },
                comment: { type: String, have_to: false, mean: '备注', example: '充值100元' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await cash_lib.charge(token, body.contract_id, body.cash_increased, body.comment);
                return { result: true };
            },
        },
        history: {
            name: '获取客户的充值记录',
            description: '获取客户的充值记录',

            is_write: false,
            is_get_api: true,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                begin_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01' },
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
                let get_ret = await cash_lib.get_history_by_company(token, body.contract_id, body.pageNo, body.begin_time, body.end_time);
                return {
                    histories: get_ret.rows,
                    total: get_ret.count,
                }
            },
        },
        export_history: {
            name: '导出充值记录',
            description: '导出充值记录',
            is_write: false,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                begin_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await common.do_export_later(token, '余额明细', async () => {
                    return await cash_lib.export_cash_history(token, body.contract_id, body.begin_time, body.end_time);
                });
            },
        },
        u8c_sync_order: {
            name: '同步订单到U8C',
            description: '同步订单到U8C',
            is_write: true,
            is_get_api: false,
            params: {
                plan_ids: {
                    type: Array, have_to: true, mean: '计划ID数组', explain: {
                        id: {
                            type: Number, have_to: true, mean: '计划ID', example: 1
                        }
                    },
                },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                let company = await rbac_lib.get_company_by_token(token);
                let plans = [];
                for (let plan_id in body.plan_ids) {
                    let plan = await get_single_plan_by_id(plan_id);
                    plans.push(plan);
                }
                await cash_lib.sync2u8c(user.name, plans, company);
                return { result: true };
            },
        },
        u8c_get_oi: {
            name: '获取U8C订单同步信息',
            description: '获取U8C订单同步信息',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                ois: {
                    type: Array, mean: '订单同步信息', explain: {
                        operator: { type: String, mean: '操作人', example: '张三' },
                        time: { type: String, mean: '时间', example: '2020-03-01 12:00:00' },
                        is_running: { type: Boolean, mean: '是否正在同步', example: true },
                        run_log: { type: String, mean: '同步日志', example: '正在同步' },
                        error_log: { type: String, mean: '错误日志', example: '错误' },
                        plans: {
                            type: Array, mean: '计划', explain: {
                                id: { type: Number, mean: '计划ID', example: 1 },
                                company: {
                                    type: Object, mean: '公司', explain: {
                                        id: { type: Number, mean: '公司ID', example: 1 },
                                        name: { type: String, mean: '公司名', example: '公司1' }
                                    }
                                },
                                plan_time: { type: String, mean: '计划时间', example: '2020-03-01 12:00:00' },
                                count: { type: Number, mean: '装车量', example: 100 },
                            },
                        },
                    }
                },
            },
            func: async function (body, token) {
                let resp = await cash_lib.get_u8c_oi(token, body.pageNo);
                return {
                    ois: resp.rows,
                    total: resp.count,
                }
            },
        },
    }
}
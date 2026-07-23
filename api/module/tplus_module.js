const rbac_lib = require('../lib/rbac_lib');
const t_plus_lib = require('../lib/t_plus_lib');
const common = require('./common');

module.exports = {
    name: 'tplus',
    description: 'Tplus结算',
    methods: {
        config_get: {
            name: '获取Tplus配置',
            description: '获取采购/销售结算时间点与周期',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                buy_settle_time: { type: String, mean: '采购结算时间点', example: '03:56:12' },
                buy_settle_cycle: { type: Number, mean: '采购结算周期(天)', example: 5 },
                buy_last_settle_time: { type: String, mean: '采购上次结算时间', example: '2024-09-08 12:31:34' },
                sale_settle_time: { type: String, mean: '销售结算时间点', example: '03:56:12' },
                sale_settle_cycle: { type: Number, mean: '销售结算周期(天)', example: 5 },
                sale_last_settle_time: { type: String, mean: '销售上次结算时间', example: '2024-09-08 12:31:34' },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                return await t_plus_lib.get_or_create_config(company);
            },
        },
        config_set: {
            name: '设置Tplus配置',
            description: '设置采购/销售结算时间点与周期',
            is_write: true,
            is_get_api: false,
            params: {
                buy_settle_time: { type: String, have_to: false, mean: '采购结算时间点', example: '03:56:12' },
                buy_settle_cycle: { type: Number, have_to: false, mean: '采购结算周期(天)', example: 5 },
                sale_settle_time: { type: String, have_to: false, mean: '销售结算时间点', example: '03:56:12' },
                sale_settle_cycle: { type: Number, have_to: false, mean: '销售结算周期(天)', example: 5 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                const config = await t_plus_lib.get_or_create_config(company);
                if (body.buy_settle_time !== undefined) {
                    config.buy_settle_time = body.buy_settle_time;
                }
                if (body.buy_settle_cycle !== undefined) {
                    config.buy_settle_cycle = body.buy_settle_cycle;
                }
                if (body.sale_settle_time !== undefined) {
                    config.sale_settle_time = body.sale_settle_time;
                }
                if (body.sale_settle_cycle !== undefined) {
                    config.sale_settle_cycle = body.sale_settle_cycle;
                }
                await config.save();
                return { result: true };
            },
        },
        direct_settle: {
            name: '直接结算',
            description: '立即对采购或销售执行Tplus结算',
            is_write: true,
            is_get_api: false,
            params: {
                is_buy: { type: Boolean, have_to: true, mean: '是否采购结算', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
                status: { type: String, mean: '结算状态', example: '结算成功' },
            },
            func: async function (body, token) {
                const user = await rbac_lib.get_user_by_token(token);
                const company = await rbac_lib.get_company_by_token(token);
                const record = await t_plus_lib.do_settle(company, !!body.is_buy, user.name);
                return { result: true, status: record.status };
            },
        },
        settle_records_get: {
            name: '获取结算记录',
            description: '分页获取已执行的Tplus结算明细',
            is_write: false,
            is_get_api: true,
            params: {
                only_success: { type: Boolean, have_to: false, mean: '为真只看成功，为假看全部', example: true },
            },
            result: {
                records: {
                    type: Array, mean: '结算明细', explain: {
                        id: { type: Number, mean: '计划ID', example: 1 },
                        record_id: { type: Number, mean: '结算批次ID', example: 1 },
                        settle_time: { type: String, mean: '结算时间', example: '2024-09-08 12:31:34' },
                        settle_type: { type: String, mean: '类型 buy/sale', example: 'sale' },
                        plan_date: { type: String, mean: '计划日期', example: '2024-09-08' },
                        plate: { type: String, mean: '车号', example: '京A12345' },
                        order_company: { type: String, mean: '下单公司', example: '某某公司' },
                        accept_company: { type: String, mean: '接单公司', example: '某某公司' },
                        stuff_name: { type: String, mean: '物料', example: '煤炭' },
                        unit_price: { type: Number, mean: '单价', example: 100 },
                        count: { type: Number, mean: '数量', example: 10 },
                        total_price: { type: Number, mean: '总价', example: 1000 },
                        execute_result: { type: String, mean: '执行结果', example: '结算成功' },
                        success: { type: Boolean, mean: '是否成功', example: true },
                        push_time: { type: String, mean: '推送时间', example: '2024-09-08 12:31:34' },
                        operator: { type: String, mean: '操作人', example: '张三' },
                    },
                },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                const only_success = body.only_success !== false;
                const resp = await t_plus_lib.get_settle_records(company, body.pageNo, only_success);
                return {
                    records: resp.rows,
                    total: resp.count,
                };
            },
        },
        export_settle_detail: {
            name: '导出结算明细',
            description: '导出本周期全部结算计划的《结算记录表》',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                return await common.do_export_later(token, '结算记录表', async () => {
                    return await t_plus_lib.export_settle_detail(company);
                });
            },
        },
        push_log_get: {
            name: '获取推送日志',
            description: '获取某条结算计划的推送日志',
            is_write: false,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                logs: {
                    type: Array, mean: '推送日志', explain: {
                        id: { type: Number, mean: '日志ID', example: 1 },
                        push_time: { type: String, mean: '时间', example: '2024-09-08 12:31:34' },
                        success: { type: Boolean, mean: '是否成功', example: true },
                        execute_result: { type: String, mean: '操作', example: '推送成功' },
                        operator: { type: String, mean: '操作人', example: '张三' },
                    },
                },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                const logs = await t_plus_lib.get_push_log(company, body.plan_id);
                return { logs };
            },
        },
    },
};

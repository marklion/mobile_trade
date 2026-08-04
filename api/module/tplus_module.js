const rbac_lib = require('../lib/rbac_lib');
const t_plus_lib = require('../lib/t_plus_lib');
const common = require('./common');
const db_opt = require('../db_opt');
const util_lib = require('../lib/util_lib');

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
                buy_settle_cycle: { type: Number, mean: '采购结算起始(前x天)', example: 5 },
                buy_settle_cycle_end: { type: Number, mean: '采购结算结束(前y天，不含)', example: 0 },
                buy_stuff_prices: {
                    type: Array, mean: '采购结算物料价格(结算时覆盖单价)', explain: {
                        stuff_id: { type: Number, mean: '物料ID', example: 1 },
                        price: { type: Number, mean: '结算单价', example: 100.5 },
                    },
                },
                buy_last_settle_time: { type: String, mean: '采购上次结算时间', example: '2024-09-08 12:31:34' },
                sale_settle_time: { type: String, mean: '销售结算时间点', example: '03:56:12' },
                sale_settle_cycle: { type: Number, mean: '销售结算起始(前x天)', example: 5 },
                sale_settle_cycle_end: { type: Number, mean: '销售结算结束(前y天，不含)', example: 0 },
                sale_last_settle_time: { type: String, mean: '销售上次结算时间', example: '2024-09-08 12:31:34' },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                const config = await t_plus_lib.get_or_create_config(company);
                const plain = config.toJSON ? config.toJSON() : config;
                return {
                    buy_settle_cycle: plain.buy_settle_cycle,
                    buy_settle_cycle_end: plain.buy_settle_cycle_end != null ? plain.buy_settle_cycle_end : 0,
                    buy_stuff_prices: t_plus_lib.parse_buy_stuff_prices(plain.buy_stuff_prices),
                    buy_last_settle_time: plain.buy_last_settle_time,
                    sale_settle_time: plain.sale_settle_time,
                    sale_settle_cycle: plain.sale_settle_cycle,
                    sale_settle_cycle_end: plain.sale_settle_cycle_end != null ? plain.sale_settle_cycle_end : 0,
                    sale_last_settle_time: plain.sale_last_settle_time,
                };
            },
        },
        config_set: {
            name: '设置Tplus配置',
            description: '设置采购周期与物料价格、销售结算时间点与周期',
            is_write: true,
            is_get_api: false,
            params: {
                buy_settle_cycle: { type: Number, have_to: false, mean: '采购结算起始(前x天)', example: 5 },
                buy_settle_cycle_end: { type: Number, have_to: false, mean: '采购结算结束(前y天，不含)', example: 0 },
                buy_stuff_prices: {
                    type: Array, have_to: false, mean: '采购结算物料价格(结算时覆盖单价)', explain: {
                        stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                        price: { type: Number, have_to: true, mean: '结算单价', example: 100.5 },
                    },
                },
                sale_settle_time: { type: String, have_to: false, mean: '销售结算时间点', example: '03:56:12' },
                sale_settle_cycle: { type: Number, have_to: false, mean: '销售结算起始(前x天)', example: 5 },
                sale_settle_cycle_end: { type: Number, have_to: false, mean: '销售结算结束(前y天，不含)', example: 0 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                const config = await t_plus_lib.get_or_create_config(company);
                if (body.buy_settle_cycle !== undefined) {
                    config.buy_settle_cycle = body.buy_settle_cycle;
                }
                if (body.buy_settle_cycle_end !== undefined) {
                    config.buy_settle_cycle_end = body.buy_settle_cycle_end;
                }
                if (body.buy_stuff_prices !== undefined) {
                    config.buy_stuff_prices = t_plus_lib.stringify_buy_stuff_prices(body.buy_stuff_prices);
                }
                if (body.sale_settle_time !== undefined) {
                    config.sale_settle_time = body.sale_settle_time;
                }
                if (body.sale_settle_cycle !== undefined) {
                    config.sale_settle_cycle = body.sale_settle_cycle;
                }
                if (body.sale_settle_cycle_end !== undefined) {
                    config.sale_settle_cycle_end = body.sale_settle_cycle_end;
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
            },
            func: async function (body, token) {
                const user = await rbac_lib.get_user_by_token(token);
                const company = await rbac_lib.get_company_by_token(token);
                t_plus_lib.do_settle(company, !!body.is_buy, user.name);
                return { result: true };
            },
        },
        settle_records_get: {
            name: '获取结算记录',
            description: '分页获取Tplus结算批次记录',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                records: {
                    type: Array, mean: '结算记录', explain: {
                        id: { type: Number, mean: '记录ID', example: 1 },
                        settle_time: { type: String, mean: '结算时间', example: '2024-09-08 12:31:34' },
                        settle_type: { type: String, mean: '类型 buy/sale', example: 'sale' },
                        status: { type: String, mean: '结算状态', example: '推送成功' },
                        operator: { type: String, mean: '操作人', example: '张三' },
                        plate_summary: { type: String, mean: '车号摘要', example: '京A12345等3车' },
                    },
                },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                const resp = await t_plus_lib.get_settle_records(company, body.pageNo);
                return {
                    records: resp.rows,
                    total: resp.count,
                };
            },
        },
        export_settle_detail: {
            name: '导出结算详情',
            description: '导出指定结算记录下每条计划的推送详情',
            is_write: false,
            is_get_api: false,
            params: {
                record_id: { type: Number, have_to: true, mean: '结算记录ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                const company = await rbac_lib.get_company_by_token(token);
                return await common.do_export_later(token, '结算详情', async () => {
                    return await t_plus_lib.export_settle_detail(company, body.record_id);
                });
            },
        },
        get_statistics_group_by_company: {
            name: '按公司统计采购订单',
            description: '按公司统计采购订单',
            is_write: false,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始出场时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束出场时间', example: '2020-01-01 12:00:00' },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                statistics: {
                    type: Array, mean: '统计结果', explain: {
                        company: {
                            type: Object, mean: '公司', explain: {
                                id: { type: Number, mean: '公司ID', example: 1 },
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                            }
                        },
                        order_count: { type: Number, mean: '订单数', example: 1 },
                    }
                },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let ret = { statistics: [] };
                let host_company = await rbac_lib.get_company_by_token(token);
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                if (stuff && await host_company.hasStuff(stuff) && stuff.use_for_buy) {
                    let ret_rows = await sq.models.plan.count({
                        where: {
                            stuffId: body.stuff_id,
                            status: 3,
                            p_time: {
                                [db_opt.Op.gte]: body.start_time,
                                [db_opt.Op.lt]: body.end_time,
                            },
                            is_buy: true,
                            tplusSettleRecordId:null,
                        },
                        group: ['companyId'],
                    })
                    for (let row of ret_rows) {
                        let company = await sq.models.company.findByPk(row.companyId);
                        ret.statistics.push({
                            company: {
                                id: company.id,
                                name: company.name,
                            },
                            order_count: row.count,
                        })
                    }
                }
                else {
                    throw { err_msg: '货物不存在' }
                }

                return ret;
            }
        },
        price_and_settle: {
            name: '划价并结算',
            description: '划价并结算',
            is_write: true,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始出场时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束出场时间', example: '2020-01-01 12:00:00' },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                company_id: { type: Number, have_to: true, mean: '公司ID', example: 1 },
                price: { type: Number, have_to: true, mean: '价格', example: 100.5 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let company = await sq.models.company.findByPk(body.company_id);
                let orders = await company.getPlans({
                    where: {
                        p_time: {
                            [db_opt.Op.gte]: body.start_time,
                            [db_opt.Op.lt]: body.end_time,
                        },
                        stuffId: body.stuff_id,
                        status: 3,
                        is_buy: true,
                    },
                    include: util_lib.plan_detail_include(),
                });
                for (let order of orders) {
                    order.unit_price = body.price;
                    await order.save();
                }
                await t_plus_lib.do_settle(await rbac_lib.get_company_by_token(token), true, (await rbac_lib.get_user_by_token(token)).name, orders);
                return { result: true };
            }
        },
    },
};

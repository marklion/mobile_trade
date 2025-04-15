const db_opt = require('../db_opt');
const cash_lib = require('../lib/cash_lib');
const rbac_lib = require('../lib/rbac_lib');
const api_param_result_define = require('../api_param_result_define');
module.exports = {
    name: 'u8c',
    description: 'u8c同步',
    methods: {
        u8c_sync_order: {
            name: '同步订单到U8C',
            description: '同步订单到U8C',
            is_write: true,
            is_get_api: false,
            params: {
                plan_ids: {
                    type: Array, have_to: false, mean: '计划ID数组', explain: {
                        id: {
                            type: Number, have_to: true, mean: '计划ID', example: 1
                        }
                    },
                },
                all: { type: Boolean, have_to: false, mean: '是否全部同步', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                let company = await rbac_lib.get_company_by_token(token);
                let plans = [];
                if (body.all) {
                    let sq = db_opt.get_sq();
                    let stuff_or = [];
                    let where_condition = {
                        [db_opt.Op.and]: [
                            {
                                status: 3,
                                u8cOrderInfoId: null,
                                manual_close: false,
                            }
                        ]
                    };
                    let stuff = await company.getStuff({ paranoid: false });
                    for (let index = 0; index < stuff.length; index++) {
                        const element = stuff[index];
                        stuff_or.push({ stuffId: element.id });
                    }
                    where_condition[db_opt.Op.and].push({
                        [db_opt.Op.or]: stuff_or
                    });
                    let search_condition = {
                        where: where_condition,
                        include: [sq.models.company, sq.models.delegate]
                    };
                    plans = await sq.models.plan.findAll(search_condition);
                }
                else {
                    for (let plan_id of body.plan_ids) {
                        let plan = await db_opt.get_sq().models.plan.findByPk(plan_id.id);
                        plan.company = await plan.getCompany();
                        plan.delegate = await plan.getDelegate();
                        plans.push(plan);
                    }
                }
                plans.forEach((itr)=>{
                    if (itr.delegate)
                    {
                        itr.company = {
                            id:-itr.delegate.id,
                            name:itr.delegate.name,
                            code:itr.delegate.code,
                        }
                    }
                });
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
                        error_msg: { type: String, mean: '错误日志', example: '错误' },
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
        unsynced_plans_get: {
            name: "获取未同步的计划",
            description: "获取未同步的计划",
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                plans: {
                    type: Array, mean: '计划', explain: api_param_result_define.plan_detail_define,
                },
            },
            func: async function (body, token) {
                return await cash_lib.get_unsynced_plans(token, body.pageNo);;
            }
        },
        u8c_config_get: {
            name: '获取u8c配置',
            description: '获取u8c配置',
            is_write: false,
            is_get_api: false,
            params: {},
            result: api_param_result_define.u8c_config_detail(false),
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let u8c_config = await company.getU8c_config();
                if (!u8c_config) {
                    u8c_config = await company.createU8c_config();
                }
                return u8c_config;
            }
        },
        u8c_config_set: {
            name: '设置u8c配置',
            description: '设置u8c配置',
            is_write: true,
            is_get_api: false,
            params: api_param_result_define.u8c_config_detail(true),
            result: { result: { type: Boolean, mean: '结果', example: true } },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let u8c_config = await company.getU8c_config();
                if (u8c_config) {
                    await u8c_config.destroy();
                }
                await company.createU8c_config(body);
                return { result: true };
            }
        },
    }
}
const {
    api_param_result_define,
    plan_lib,
    rbac_lib,
    db_opt,
    common } = require('./common_header');
module.exports = {
    name: 'buy_management',
    description: '采购管理',
    methods: {
        order_update:common.order_update,
        contract_make: {
            name: '生成合同',
            description: '生成合同',
            is_write: true,
            is_get_api: false,
            params: {
                supplier_id: { type: Number, have_to: true, mean: '供应商ID', example: 1 },
                begin_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01 12:00:00' },
                number: { type: String, have_to: false, mean: '合同号', example: 1 },
                customer_code: { type: String, have_to: false, mean: '供应商合同号', example: 1 },
            },
            result: {
                contract_id: { type: Number, mean: '合同ID', example: 1 }
            },
            func: async function (body, token) {
                let ret = { contract_id: 0 }
                let buy_company = await rbac_lib.get_company_by_token(token);
                let sale_company = await db_opt.get_sq().models.company.findByPk(body.supplier_id);
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
                let buy_company = await rbac_lib.get_company_by_token(token);
                let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
                if (contract && buy_company && await buy_company.hasBuy_contract(contract)) {
                    await plan_lib.destroy_contract(contract.id);
                    ret.result = true;
                }
                return ret;
            },
        },
        contract_get: {
            name: '获取合同',
            description: '获取合同',
            is_write: false,
            is_get_api: true,
            params: {
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
                        //expired:{type:Boolean,mean:'采购是否过期',example:false},
                        company: {
                            type: Object, mean: '销售公司', explain: {
                                id: { type: Number, mean: '公司ID', example: 1 },
                                name: { type: String, mean: '公司名称', example: '公司名称' },
                            }
                        },
                        stuff: {
                            type: Array, mean: '货物', explain: {
                                id: { type: Number, mean: '货物ID', example: 1 },
                                name: { type: String, mean: '货物名称', example: '货物名称' },
                            }
                        },
                    }
                }
            },

            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let found_ret = await plan_lib.get_all_buy_contracts(company, body.pageNo, body.stuff_id);
                return {
                    contracts: found_ret.rows,
                    total: found_ret.count
                };
            }
        },
        order_search: {
            name: '采购订单查询',
            description: '采购订单查询',
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
                let search_ret = await plan_lib.search_sold_plans(company, body.pageNo, body, true);
                return { plans: search_ret.rows, total: search_ret.count };
            },
        },
        order_buy_confirm: {
            name: '采购订单确认',
            description: '采购订单确认',
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
                let ret = await plan_lib.batch_confirm(body, token, true);
                if (ret) {
                    throw { err_msg: '批量确认失败:' + ret };
                }
                else {
                    return { result: true };
                }
            },
        },
        close: {
            name: '关闭采购订单',
            description: '关闭采购订单',
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
        order_rollback: {
            name: '采购订单回滚',
            description: '采购订单回滚',
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
        assign_supplier: {
            name: '指定采购公司',
            description: '指定采购公司',
            is_write: true,
            is_get_api: false,
            params: {
                supplier_id: { type: Number, have_to: true, mean: '公司ID', example: 1 },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
                    let buy_company = await db_opt.get_sq().models.company.findByPk(body.supplier_id);
                    await plan.setCompany(buy_company);
                    if (buy_company) {
                        plan.is_proxy = false;
                    }
                    else {
                        plan.is_proxy = true;
                    }
                    await plan.save()
                });
                return { result: true };
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
                if (contract && stuff && company && await company.hasBuy_contract(contract)) {
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
                if (contract && stuff && company && await company.hasBuy_contract(contract)) {
                    await plan_lib.del_stuff_from_contract(stuff, contract);
                    ret.result = true;
                }
                return ret;
            },
        },
        export_plans: common.export_plans(async function (body, token) {
            let plans = await plan_lib.filter_plan4manager(body, token, true);
            return await plan_lib.make_file_by_plans(plans);
        }),
    }
}
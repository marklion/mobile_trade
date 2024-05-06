const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const bidding_lib = require('../lib/bidding_lib');
const db_opt = require('../db_opt');
module.exports = {
    name: 'sale_management',
    description: '销售管理',
    methods: {
        order_sale_confirm: {
            name: '销售订单确认',
            description: '销售订单确认',
            need_rbac: true,
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
        order_sale_pay: {
            name: '手工验款',
            description: '手工验款',
            need_rbac: true,
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
            need_rbac: true,
            is_write: false,
            is_get_api: true,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
                status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
                stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
                company_id: { type: Number, have_to: false, mean: '公司ID', example: 1 },
                hide_manual_close: { type: Boolean, have_to: false, mean: '隐藏手动关闭', example: true },
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
        contract_make: {
            name: '生成合同',
            description: '生成合同',
            need_rbac: true,
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
            need_rbac: true,
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
        contract_get: {
            name: '获取合同',
            description: '获取合同',
            need_rbac: true,
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
            need_rbac: true,
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
            need_rbac: true,
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
            need_rbac: true,
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
            need_rbac: true,
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
    },
}
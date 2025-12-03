const db_opt = require('../db_opt');
const audit_lib = require('../lib/audit_lib');
const rbac_lib = require('../lib/rbac_lib');
module.exports = {
    name: 'audit',
    description: '审批管理',
    methods: {
        add_audit_config: {
            name: '新增审批配置',
            description: '新增审批配置',
            is_write: true,
            is_get_api: false,
            params: {
                url: { type: String, have_to: true, mean: '接口URL', example: '/api/some_api' },
                role_id: { type: Number, have_to: true, mean: '角色ID', example: 1 },
            },
            result: { result: { type: Boolean, mean: '操作结果', example: true } },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let role = await sq.models.rbac_role.findByPk(body.role_id);
                let company = await rbac_lib.get_company_by_token(token);
                if (company && await company.hasRbac_role(role)) {
                    await audit_lib.add_audit_config(role, body.url);
                }
                else {
                    throw {
                        err_msg: '角色不存在或不属于同一公司',
                    };
                }
                return { result: true };
            },
        },
        del_audit_config: {
            name: '删除审批配置',
            description: '删除审批配置',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '审批配置ID', example: 1 },
            },
            result: { result: { type: Boolean, mean: '操作结果', example: true } },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let exist_record = await sq.models.audit_config.findByPk(body.id);
                if (exist_record) {
                    let role = await exist_record.getRbac_role();
                    if (role && await company.hasRbac_role(role)) {
                        await audit_lib.del_audit_config(body.id);
                    }
                    else {
                        throw {
                            err_msg: '审批配置不存在或不属于同一公司',
                        };
                    }
                }
                return { result: true };
            },
        },
        get_audit_configs: {
            name: '获取审批配置列表',
            description: '获取审批配置列表',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                configs: {
                    type: Array, mean: '审批配置列表', explain: {
                        id: { type: Number, mean: '审批配置ID', example: 1 },
                        url: { type: String, mean: '接口URL', example: '/api/some_api' },
                        url_name:{type: String, mean: '接口名称', example: '新增订单' },
                        rbac_role: {
                            type: Object, mean: '角色信息', explain: {
                                id: { type: Number, mean: '角色ID', example: 1 },
                                name: { type: String, mean: '角色名称', example: '采购员' },
                            }
                        },
                    }
                },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let resp = await audit_lib.get_audit_configs(company, body.pageNo || 0);
                for (let one_config of resp.configs) {
                    one_config.url_name = audit_lib.get_url_name(one_config.url);
                }
                return resp;
            },
        },
        get_all_api: {
            name: '获取所有接口列表',
            description: '获取所有接口列表',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                apis: {
                    type: Array, mean: '接口列表', explain: {
                        name: { type: String, mean: '接口名称', example: '新增订单' },
                        url: { type: String, mean: '接口URL', example: '/api/add_order' },
                    }
                },
            },
            func: async function (body, token) {
                return audit_lib.get_all_api(body.pageNo || 0);
            },
        },
    }
}
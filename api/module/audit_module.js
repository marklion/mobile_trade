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
                        url_name: { type: String, mean: '接口名称', example: '新增订单' },
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
        get_audit4req: {
            name: '获取待审批请求列表',
            description: '获取待审批请求列表',
            is_write: false,
            is_get_api: true,
            params: {
                status: { type: Number, have_to: false, mean: '请求状态', example: 1 },
            },
            result: {
                records: {
                    type: Array, mean: '请求列表', explain: {
                        id: { type: Number, mean: '请求ID', example: 1 },
                        url: { type: String, mean: '接口URL', example: '/api/add_order' },
                        url_name: { type: String, mean: '接口名称', example: '新增订单' },
                        body: { type: String, mean: '请求体', example: '{}' },
                        submiter: { type: String, mean: '提交人', example: 'user1' },
                        auditer: { type: String, mean: '审批人', example: 'manager1' },
                        submit_time: { type: String, mean: '提交时间', example: '2024-01-01 10:00:00' },
                        audit_time: { type: String, mean: '审批时间', example: '2024-01-01 12:00:00' },
                        close_time: { type: String, mean: '关闭时间', example: '2024-01-02 10:00:00' },
                        comment: { type: String, mean: '审批备注', example: '请补充相关资料' },
                    }
                },
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                let resp = await audit_lib.get_req4audit(user, body.status, body.pageNo || 0);
                for (let one_req of resp.records) {
                    one_req.url_name = audit_lib.get_url_name(one_req.url);
                }
                return resp;
            },
        },
        audit_req: {
            name: '审批请求',
            description: '审批请求',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '请求ID', example: 1 },
                is_approve: { type: Boolean, have_to: true, mean: '是否通过', example: true },
            },
            result: { result: { type: Boolean, mean: '操作结果', example: true } },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                await audit_lib.audit_req(body.id, body.is_approve, user);
                return { result: true };
            },
        },
        append_comment:{
            name: '追加审批备注',
            description: '追加审批备注',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '请求ID', example: 1 },
                comment: { type: String, have_to: false, mean: '备注内容', example: '请补充相关资料' },
            },
            result: { result: { type: Boolean, mean: '操作结果', example: true } },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let user = await rbac_lib.get_user_by_token(token);
                let exist_audit_record = await sq.models.audit_record.findByPk(body.id);
                if (exist_audit_record && exist_audit_record.submiter == user.name) {
                    await audit_lib.append_comment(body.id, body.comment);
                }
                return { result: true };
            },
        },
    }
}
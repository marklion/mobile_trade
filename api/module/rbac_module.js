const api_param_result_define = require('../api_param_result_define');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
module.exports = {
    name: 'rbac',
    description: '权限管理',
    methods: {
        role_get_all: {
            name: '获取所有角色',
            description: '获取所有角色',

            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                all_role: {
                    type: Array, mean: '角色列表',
                    explain: {
                        id: { type: Number, mean: '角色id', example: 123 },
                        name: { type: String, mean: '角色名', example: 'role_example' },
                        description: { type: String, mean: '角色描述', example: 'role_desp_example' },
                        is_readonly: { type: Boolean, mean: '是否只读', example: true },
                        related_users: {
                            type: Array, mean: '关联用户列表', explain: {
                                id: { type: Number, mean: '用户id', example: 123 },
                                name: { type: String, mean: '用户姓名', example: 'user_example' },
                                phone: { type: String, mean: '用户手机号', example: '12345678901' },
                            }
                        },
                        related_modules: {
                            type: Array, mean: '关联模块列表', explain: {
                                id: { type: Number, mean: '模块id', example: 123 },
                                name: { type: String, mean: '模块名', example: 'module_example' },
                                description: { type: String, mean: '模块描述', example: 'module_desp_example' },
                            }
                        },
                        belong_company: { type: String, mean: '所属公司', example: 'company_example' },
                    },
                },
            },
            func: async (body, token) => {
                let company = await rbac_lib.get_company_by_token(token);
                let { count, rows } = await rbac_lib.get_all_roles(company, body.pageNo);
                return { all_role: rows, total: count };
            },
        },
        module_get_all: {
            name: '获取所有模块',
            description: '获取所有模块',

            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                all_module: {
                    type: Array, mean: '模块列表', explain: {
                        id: { type: Number, mean: '模块id', example: 123 },
                        name: { type: String, mean: '模块名', example: 'module_example' },
                        description: { type: String, mean: '模块描述', example: 'module_desp_example' }
                    }
                },
            },
            func: async (body, token) => {
                let { count, rows } = await rbac_lib.get_all_modules(body.pageNo, token);
                return { all_module: rows, total: count };
            },
        },
        role_add: {
            name: '添加角色',
            description: '添加角色',

            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '角色名', example: 'role_example' },
                description: { type: String, have_to: false, mean: '角色描述', example: 'role_desp_example' },
                is_readonly: { type: Boolean, have_to: false, mean: '是否只读', example: true },
            },
            result: {
                result: { type: Boolean, mean: '添加结果', example: true },
            },
            func: async (body, token) => {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    await rbac_lib.add_role(body.name, body.description, body.is_readonly, company);
                    ret.result = true;
                }
                return ret;
            },
        },
        role_del: {
            name: '删除角色',
            description: '删除角色',

            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '角色id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '删除结果', example: true },
            },
            func: async (body, token) => {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    await rbac_lib.del_role(body.id, company);
                    ret.result = true;
                }
                return ret;
            },
        },
        bind_module2role: {
            name: '绑定模块到角色',
            description: '绑定模块到角色',

            is_write: true,
            is_get_api: false,
            params: {
                role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
                module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '绑定结果', example: true },
            },
            func: async (body, token) => {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    await rbac_lib.connect_role2module(body.role_id, body.module_id);
                    ret.result = true;
                }
                return ret;
            },
        },
        unbind_module2role: {
            name: '解绑模块与角色',
            description: '解绑模块与角色',

            is_write: true,
            is_get_api: false,
            params: {
                role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
                module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '解绑结果', example: true },
            },
            func: async (body, token) => {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    await rbac_lib.disconnect_role2module(body.role_id, body.module_id);
                    ret.result = true;
                }
                return ret;
            },
        },
        bind_role2user: {
            name: '绑定角色到用户',
            description: '绑定角色到用户',

            is_write: true,
            is_get_api: false,
            params: {
                phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
                role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '绑定结果', example: true },
            },
            func: async (body, token) => {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                let target_user_token = await rbac_lib.user_login(body.phone);
                let target_company = await rbac_lib.get_company_by_token(target_user_token)
                if (company && target_company && company.id === target_company.id) {
                    let target_user = await rbac_lib.get_user_by_token(target_user_token);
                    await rbac_lib.connect_user2role(target_user.id, body.role_id);
                    ret.result = true;
                }
                else {
                    throw { err_msg: '公司不匹配' };
                }
                return ret;
            },
        },
        unbind_role2user:{
            name: '解绑角色与用户',
            description: '解绑角色与用户',
            is_write: true,
            is_get_api: false,
            params: {
                phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
                role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '解绑结果', example: true },
            },
            func: async (body, token) => {
                let ret = { result: false };
                let company = await rbac_lib.get_company_by_token(token);
                let target_user_token = await rbac_lib.user_login(body.phone);
                let target_company = await rbac_lib.get_company_by_token(target_user_token)
                if (company && target_company && company.id === target_company.id) {
                    let target_user = await rbac_lib.get_user_by_token(target_user_token);
                    await rbac_lib.disconnect_user2role(target_user.id, body.role_id);
                    ret.result = true;
                }
                else {
                    throw { err_msg: '公司不匹配' };
                }
                return ret;
            },
        },
        get_dev_data:{
            name:'获取开发数据',
            description:'获取开发数据',
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: api_param_result_define.dev_data,
            func: async (body, token) => {
                let company = await rbac_lib.get_company_by_token(token);
                return company;
            },
        },
        set_dev_data: {
            name: '设置开发数据',
            description: '设置开发数据',
            is_write: true,
            is_get_api: false,
            params: api_param_result_define.dev_data,
            result: {
                result: { type: Boolean, mean: '解绑结果', example: true },
            },
            func: async (body, token) => {
                let company = await rbac_lib.get_company_by_token(token);
                Object.keys(body).forEach(item => {
                    company[item] = body[item];
                });
                await company.save();
                return { result: true };
            },
        },
    }
}
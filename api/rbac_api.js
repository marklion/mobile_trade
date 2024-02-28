const mkapi = require('./api_utils');
const rbac_lib = require('./rbac_lib');
const db_opt = require('./db_opt');
function install(app) {
    mkapi('/rbac/login', 'global', true, false, {
        phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
    }, {
        token: { type: String, mean: '登录token', example: 'ABCD' },
    }, '登录', '登录').add_handler(async function (body, token) {
        let ret = { token: '' };
        ret.token = await rbac_lib.user_login(body.phone);
        if (ret.token === '') {
            throw {err_msg:'用户未找到'};
        }
        return ret;
    }).install(app);
    mkapi('/rbac/company_add', 'global', true, true, {
        name: { type: String, have_to: true, mean: '公司名', example: 'company_example' },
    }, {
        result: { type: Boolean, mean: '添加结果', example: true },
    }, '添加公司', '添加公司').add_handler(async function (body, token) {
        let ret = { result: false };
        await rbac_lib.add_company(body.name);
        ret.result = true;
        return ret;
    }).install(app);
    mkapi('/rbac/company_del', 'global', true, true, {
        id: { type: Number, have_to: true, mean: '公司id', example: 123 },
    }, {
        result: { type: Boolean, mean: '删除结果', example: true },
    }, '删除公司', '删除公司').add_handler(async function (body, token) {
        let ret = { result: false };
        await rbac_lib.del_company(body.id);
        ret.result = true;
        return ret;
    }).install(app);
    mkapi('/rbac/company_get_all', 'global', false, true, {
    }, {
        all_company: {
            type: Array, mean: '公司列表',
            explain: {
                id: { type: Number, mean: '公司id', example: 123 },
                name: { type: String, mean: '公司名', example: 'company_example' }
            },
        },
    }, '获取公司列表', '获取公司列表', true).add_handler(async function (body, token) {
        let ret = {};
        let result = await rbac_lib.get_all_company(body.pageNo);
        ret.all_company = result.companys;
        ret.total = result.count;
        return ret;
    }).install(app);

    mkapi('/rbac/role_get_all', 'config', false, true, {
    }, {
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
                    }
                },
                belong_company: { type: String, mean: '所属公司', example: 'company_example' },
            },
        },
    }, '获取角色列表', '获取角色列表', true).add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        let { count, rows } = await rbac_lib.get_all_roles(company, body.pageNo);
        return { all_role: rows, total: count };
    }).install(app);

    mkapi('/rbac/reg_company_admin', 'global', true, true, {
        phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
        company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
    }, {
        result: { type: Boolean, mean: '注册结果', example: true },
    }, '注册公司管理员', '注册公司管理员').add_handler(async function (body, token) {
        let ret = { result: false };
        let company = await db_opt.get_sq().models.company.findByPk(body.company_id);
        if (company) {
            let user = await rbac_lib.add_user(body.phone);
            if (user) {
                await user.setCompany(company);
                let company_admin_role = await rbac_lib.make_company_admin_role(company);
                if (company_admin_role) {
                    await rbac_lib.connect_user2role(user.id, company_admin_role.id);
                    ret.result = true;
                }
            }
        }
        return ret;
    }).install(app);

    mkapi('/rbac/role_add', 'config', true, true, {
        name: { type: String, have_to: true, mean: '角色名', example: 'role_example' },
        description: { type: String, have_to: false, mean: '角色描述', example: 'role_desp_example' },
        is_readonly: { type: Boolean, have_to: false, mean: '是否只读', example: true },
    }, {
        result: { type: Boolean, mean: '添加结果', example: true },
    }, '添加角色', '添加用于RBAC模块的角色定义').add_handler(async function (body, token) {
        let ret = { result: false };
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            await rbac_lib.add_role(body.name, body.description, body.is_readonly, company);
            ret.result = true;
        }
        return ret;
    }).install(app);

    mkapi('/rbac/role_del', 'config', true, true, {
        id: { type: Number, have_to: true, mean: '角色id', example: 123 },
    }, {
        result: { type: Boolean, mean: '删除结果', example: true },
    }, '删除角色', '删除用于RBAC模块的角色定义').add_handler(async function (body, token) {
        let ret = { result: false };
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            await rbac_lib.del_role(body.id, company);
            ret.result = true;
        }
        return ret;
    }).install(app);
}

module.exports = install;
const mkapi = require('./api_utils');
const rbac_lib = require('./rbac_lib');
function install(app) {
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
        all_company: { type: Array, mean: '公司列表',
            explain: {
                id: { type: Number, mean: '公司id', example: 123 },
                name: { type: String, mean: '公司名', example: 'company_example'}
            },
        },
    }, '获取公司列表', '获取公司列表', true).add_handler(async function (body, token) {
        let ret = {  };
        let result = await rbac_lib.get_all_company(body.pageNo);
        ret.all_company = result.companys;
        ret.total = result.count;
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
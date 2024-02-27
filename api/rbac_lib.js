const db_opt = require('./db_opt');
const moment = require('moment');

module.exports = {
    rbac_check: async function (_online_token, _req_module, _is_write) {
        let ret = '未登录';
        let sq = db_opt.get_sq();
        if (!_online_token)
        {
            return ret;
        }
        let user = await sq.models.rbac_user.findOne({
            where: { online_token: _online_token },
        });
        let now = moment();
        let last = moment(user.online_time);
        if (user && now.diff(last, 'day') < 20) {
            user.online_time = now.format('YYYY-MM-DD HH:mm:ss');
            ret = '无权限，需要' + _req_module + '模块的' + (_is_write ? '写' : '读') + '权限';
            let roles = await user.getRbac_roles();
            for (let i = 0; i < roles.length; i++) {
                let modules = await roles[i].getRbac_modules();
                for (let j = 0; j < modules.length; j++) {
                    if (modules[j].name == _req_module) {
                        if (_is_write) {
                            if (roles[i].is_readonly) {
                                ret = '只读用户';
                            }
                            else {
                                ret = '';
                                break;
                            }
                        }
                        else {
                            ret = '';
                            break
                        }
                    }
                }
                if (ret.length == 0) {
                    break;
                }
            }

        }

        return ret;
    },
    get_company_by_token: async function (_token) {
        let sq = db_opt.get_sq();
        let user = await sq.models.rbac_user.findOne({
            where: { online_token: _token },
        });
        let company = null;
        if (user) {
            company = await user.getCompany();
        }
        return company;
    },
    add_company: async function (_name) {
        let sq = db_opt.get_sq();
        let one = await sq.models.company.findOrCreate({
            where: { name: _name },
            default: {
                name: _name,
            },
        });
        await one[0].save();
    },
    del_company: async function (_id) {
        let sq = db_opt.get_sq();
        let one = await sq.models.company.findByPk(_id);
        if (one) {
            await one.destroy();
        }
    },
    get_all_company: async function (_page) {
        let sq = db_opt.get_sq();
        let companys = await sq.models.company.findAll({
            order: [['id', 'ASC']],
            limit:20,
            offset: _page * 20,
        });
        let count = await sq.models.company.count();
        return {companys, count};
    },
    add_module: async function (_name, _description) {
        let sq = db_opt.get_sq();
        let one = await sq.models.rbac_module.findOrCreate({
            where: { name: _name },
            default: {
                name: _name,
            },
        });
        one[0].description = _description;
        await one[0].save();
        return one[0];
    },
    add_role: async function (_name, _description, _is_readonly, company) {
        let sq = db_opt.get_sq();
        if (company) {
            if (_name == 'admin')
            {
                throw new Error('admin角色名被保留');
            }
            let match_role = await company.getRbac_roles({
                where: {
                    name: _name,
                },
            });
            if (match_role.length == 1) {
                match_role[0].description = _description;
                match_role[0].is_readonly = _is_readonly;
                await match_role[0].save();
            }
            else {
                await company.createRbac_role({
                    name: _name,
                    description: _description,
                    is_readonly: _is_readonly,
                });
            }
        }
        else
        {
            await sq.models.rbac_role.findOrCreate({
                where: { name: _name },
                default: {
                    name: _name,
                    description: _description,
                    is_readonly: _is_readonly,
                },
            });
        }
        return await sq.models.rbac_role.findOne({
            where: { name: _name },
        });
    },
    del_role: async function (_id, _company) {
        let sq = db_opt.get_sq();
        let one = await sq.models.rbac_role.findByPk(_id);
        if (one && await _company.hasRbac_role(one)) {
            await one.destroy();
        }
    },
    add_user: async function (_phone) {
        let sq = db_opt.get_sq();
        let one = await sq.models.rbac_user.findOrCreate({
            where: { phone: _phone },
            default: {
                phone: _phone,
            },
        });
        await one[0].save();
    },
    del_user: async function (_id) {
        let sq = db_opt.get_sq();
        let one = await sq.models.rbac_user.findByPk(_id);
        if (one) {
            await one.destroy();
        }
    },
    connect_user2role: async function (_user_id, _role_id) {
        let sq = db_opt.get_sq();
        let user = await sq.models.rbac_user.findByPk(_user_id);
        let role = await sq.models.rbac_role.findByPk(_role_id);
        if (! await user.hasRbac_role(role)) {
            await user.addRbac_role(role);
        }
    },
    disconnect_user2role: async function (_user_id, _role_id) {
        let sq = db_opt.get_sq();
        let user = await sq.models.rbac_user.findByPk(_user_id);
        let role = await sq.models.rbac_role.findByPk(_role_id);
        if (await user.hasRbac_role(role)) {
            await user.removeRbac_role(role);
        }
    },
    connect_role2module: async function (_role_id, _module_id) {
        let sq = db_opt.get_sq();
        let role = await sq.models.rbac_role.findByPk(_role_id);
        let module = await sq.models.rbac_module.findByPk(_module_id);
        if (! await role.hasRbac_module(module)) {
            await role.addRbac_module(module);
        }
    },
    disconnect_role2module: async function(_role_id, _module_id) {
        let sq = db_opt.get_sq();
        let role = await sq.models.rbac_role.findByPk(_role_id);
        let module = await sq.models.rbac_module.findByPk(_module_id);
        if ( await role.hasRbac_module(module)) {
            await role.removeRbac_module(module);
        }
    },
};
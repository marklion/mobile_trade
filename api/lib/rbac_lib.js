const db_opt = require('../db_opt');
const moment = require('moment');

module.exports = {
    get_user_by_token: async function (_token) {
        let sq = db_opt.get_sq();
        let user = await sq.models.rbac_user.findOne({
            where: { online_token: _token },
        });
        if (user) {
            let now = moment();
            let last = moment(user.online_time);
            if (now.diff(last, 'day') < 20) {
                if (now.diff(last, 'day') > 1) {
                    user.online_time = now.format('YYYY-MM-DD HH:mm:ss');
                    await user.save();
                }
            }
            else {
                user = null;
            }
        }

        return user;
    },
    change_password: async function (token, _new_password) {
        if (_new_password == 'Mobile_P@ssw0rd_Trade') {
            throw { err_msg: '密码不合法' };
        }
        let user = await this.get_user_by_token(token);
        user.password = _new_password;
        await user.save();
    },
    rbac_check: async function (_online_token, _req_module, _is_write) {
        let ret = '未登录';
        let sq = db_opt.get_sq();
        if (!_online_token) {
            return ret;
        }
        let user = await this.get_user_by_token(_online_token);
        if (user) {
            let module_desc = (await sq.models.rbac_module.findOne({where:{name:_req_module}})).description;
            ret = '无权限，需要<' + module_desc + '>模块的' + (_is_write ? '写' : '读') + '权限';
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
        let user = await this.get_user_by_token(_token);
        let company = null;
        if (user) {
            company = await user.getCompany();
        }
        return company;
    },
    bind_company2module: async function (_company_id, _module_id) {
        let sq = db_opt.get_sq();
        let company = await sq.models.company.findByPk(_company_id);
        let module = await sq.models.rbac_module.findByPk(_module_id);
        if (company && module) {
            if (!await company.hasRbac_module(module)) {
                await company.addRbac_module(module);
            }
        }
    },
    unbind_company2module: async function (_company_id, _module_id) {
        let sq = db_opt.get_sq();
        let company = await sq.models.company.findByPk(_company_id);
        let module = await sq.models.rbac_module.findByPk(_module_id);
        if (company && module) {
            if (await company.hasRbac_module(module)) {
                await company.removeRbac_module(module);
            }
        }
    },
    add_company: async function (_name) {
        let sq = db_opt.get_sq();
        let one = await sq.models.company.findOrCreate({
            where: { name: _name },
            defaults: {
                name: _name,
            },
        });
        if (one[1]) {
            await this.bind_company2module(one[0].id, (await sq.models.rbac_module.findOne({ where: { name: 'customer' } })).id);
        }
        await one[0].save();
        return one[0];
    },
    add_company_with_full_info: async function (body) {
        let exist_one = await this.add_company(body.name);
        exist_one.address = body.address;
        exist_one.notice = body.notice;
        exist_one.contact = body.contact;
        exist_one.attachment = body.attachment;
        exist_one.third_key = body.third_key;
        exist_one.third_url = body.third_url;
        exist_one.third_token = body.third_token;
        exist_one.stamp_pic = body.stamp_pic;
        exist_one.zc_url = body.zc_url;
        exist_one.zh_ssid = body.zh_ssid;
        exist_one.event_types = body.event_types;
        exist_one.remote_event_url = body.remote_event_url;
        exist_one.driver_notice = body.driver_notice;
        exist_one.zc_rpc_url = body.zc_rpc_url;
        exist_one.zczh_back_end = body.zczh_back_end;
        exist_one.zczh_back_token = body.zczh_back_token;
        await exist_one.save();
        return exist_one;
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
            limit: 20,
            offset: _page * 20,
        });
        let count = await sq.models.company.count();
        for (let index = 0; index < companys.length; index++) {
            const element = companys[index];
            element.bound_modules = [];
            element.config_users = [];
            let modules = await element.getRbac_modules();
            for (let j = 0; j < modules.length; j++) {
                let itr = modules[j];
                element.bound_modules.push(itr.toJSON());
                if (itr.name == 'config') {
                    let config_users = [];
                    let config_roles = await itr.getRbac_roles({ where: { companyId: element.id } });
                    for (let i = 0; i < config_roles.length; i++) {
                        let users = await config_roles[i].getRbac_users();
                        config_users = config_users.concat(users);
                    }
                    element.config_users = config_users;
                }
            }
        }
        return { companys, count };
    },
    add_module: async function (_name, _description) {
        let sq = db_opt.get_sq();
        let one = await sq.models.rbac_module.findOrCreate({
            where: { name: _name },
            defaults: {
                name: _name,
            },
        });
        one[0].description = _description;
        await one[0].save();
        return one[0];
    },
    add_role: async function (_name, _description, _is_readonly, company) {
        let sq = db_opt.get_sq();
        let ret = null;
        if (company) {
            if (_name == 'admin') {
                throw { err_msg: '不允许创建名为admin的角色' };
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
                ret = match_role[0];
            }
            else {
                ret = await company.createRbac_role({
                    name: _name,
                    description: _description,
                    is_readonly: _is_readonly,
                });
            }
        }
        else {
            let found_one = await sq.models.rbac_role.findOrCreate({
                where: { name: _name },
                defaults: {
                    name: _name,
                    description: _description,
                    is_readonly: _is_readonly,
                },
            });
            found_one[0].description = _description;
            found_one[0].is_readonly = _is_readonly;
            await found_one[0].save();
            ret = found_one[0];
        }
        return ret;
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
            defaults: {
                phone: _phone,
            },
        });
        await one[0].save();
        return one[0];
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
    disconnect_role2module: async function (_role_id, _module_id) {
        let sq = db_opt.get_sq();
        let role = await sq.models.rbac_role.findByPk(_role_id);
        let module = await sq.models.rbac_module.findByPk(_module_id);
        if (await role.hasRbac_module(module)) {
            await role.removeRbac_module(module);
        }
    },
    make_company_admin_role: async function (_company) {
        let sq = db_opt.get_sq();
        let role = await this.add_role('公司管理员', '公司内最高权限', false, _company);
        if (role) {
            await this.connect_role2module(role.id, (await sq.models.rbac_module.findOne({ where: { name: 'config' } })).id);
        }

        return role;
    },
    get_all_roles: async function (_company, _pageNo) {
        let sq = db_opt.get_sq();
        let roles = [];
        let count = 0;
        let condition = {
            order: [['id', 'ASC']],
            limit: 20,
            offset: _pageNo * 20,
        };
        if (_company) {
            roles = await _company.getRbac_roles(condition);
            count = await _company.countRbac_roles();
        }
        else {
            roles = await sq.models.rbac_role.findAll(condition);
            count = await sq.models.rbac_role.count();
        }
        let rows = [];
        for (let index = 0; index < roles.length; index++) {
            let element = roles[index];
            let role = element.toJSON();
            role.related_users = [];
            role.related_modules = [];
            (await element.getRbac_users()).forEach((itr) => {
                role.related_users.push(itr.toJSON());
            });
            (await element.getRbac_modules()).forEach((itr) => {
                role.related_modules.push(itr.toJSON());
            });
            let company = await element.getCompany();
            if (company) {
                role.belong_company = company.name;
            }
            rows.push(role);
        }
        return { count, rows }
    },
    get_all_modules: async function (_pageNo, _company) {
        let sq = db_opt.get_sq();
        let condition = {
            order: [['id', 'ASC']],
            limit: 20,
            offset: _pageNo * 20,
        };
        let ret = [];
        let count = 0;
        if (_company) {
            ret = await _company.getRbac_modules(condition);
            count = await _company.countRbac_modules();
        }
        else {
            ret = await sq.models.rbac_module.findAll(condition);
            count = await sq.models.rbac_module.count();
        }
        return { count, rows: ret };
    },
    user_login: async function (_phone) {
        let ret = '';
        let sq = db_opt.get_sq();
        let user = await sq.models.rbac_user.findOne({
            where: { phone: _phone },
        });
        if (user) {
            if (!user.online_token) {
                const uuid = require('uuid');
                user.online_token = uuid.v4();
            }
            user.online_time = moment().format('YYYY-MM-DD HH:mm:ss');
            await user.save();
            ret = user.online_token;
        }
        return ret;
    },
};
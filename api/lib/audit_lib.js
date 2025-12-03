const db_opt = require('../db_opt');
const g_all_api = [];
module.exports = {
    add_audit_config: async function (role, url) {
        const sq = db_opt.get_sq();
        let company = await role.getCompany();
        if (company) {
            let exist_record = await sq.models.audit_config.findOne({
                where: {
                    url: url,
                },
                include: [{
                    model: sq.models.rbac_role,
                    include: [{
                        model: sq.models.company,
                        where: { id: company.id },
                        required: true,
                    }],
                    required: true,
                }]
            });
            if (exist_record) {
                await exist_record.setRbac_role(role);
            }
            else {
                let new_record = await sq.models.audit_config.create({
                    url: url,
                });
                await new_record.setRbac_role(role);
            }
        }
    },
    del_audit_config: async function (id) {
        const sq = db_opt.get_sq();
        let exist_record = await sq.models.audit_config.findByPk(id);
        if (exist_record) {
            await exist_record.destroy();
        }
    },
    get_audit_configs: async function (company, pageNo) {
        const sq = db_opt.get_sq();
        let pageSize = 20;
        let ret = {
            total: 0,
            configs: [],
        }
        let resp = await sq.models.audit_config.findAndCountAll({
            include: [{
                model: sq.models.rbac_role,
                include: [{
                    model: sq.models.company,
                    where: { id: company.id },
                    required: true,
                }],
                required: true,
            }],
            limit: pageSize,
            offset: pageNo * pageSize,
        });
        ret.total = resp.count;
        ret.configs = resp.rows;
        return ret;
    },
    init_all_api: function (help_info) {
        for (let one_help of help_info) {
            if (one_help[4].p && one_help[4].p.startsWith('需要')) {
                g_all_api.push({
                    name: one_help[0].h1,
                    url: one_help[1].code.content,
                });
            }
        }
    },
    get_all_api: function (pageNo) {
        let pageSize = 20;
        let start = pageNo * pageSize;
        let end = start + pageSize;
        if (start >= g_all_api.length) {
            return {
                total: g_all_api.length,
                apis: [],
            };
        }
        if (end > g_all_api.length) {
            end = g_all_api.length;
        }
        return {
            total: g_all_api.length,
            apis: g_all_api.slice(start, end),
        };
    },
    get_url_name: function (url) {
        let ret = '';
        for (let one_api of g_all_api) {
            if (one_api.url === url) {
                ret = one_api.name;
                break;
            }
        }
        return ret;
    },
}
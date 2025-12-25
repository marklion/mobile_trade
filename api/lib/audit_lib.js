const db_opt = require('../db_opt');
const moment = require('moment');
const g_all_api = [];
const axios = require('axios');
const all_plugin = require('../plugin/all_plugin');
module.exports = {
    add_audit_config: async function (role, url, content_template) {
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
                    content_template: content_template || '',
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
    guard_req: async function (url, company, body, user) {
        let ret = -1;
        let comment = '';
        const sq = db_opt.get_sq();
        if (company && user) {
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
                let audit_id = body.audit_id || null;
                let pure_body = Object.assign({}, body);
                delete pure_body.audit_id;
                let exist_audit_record = await sq.models.audit_record.findOne({
                    where: {
                        url: url,
                        body: JSON.stringify(pure_body),
                        close_time: null,
                    }
                });
                if (exist_audit_record) {
                    if (exist_audit_record.audit_time && exist_audit_record.id == audit_id) {
                        ret = 0;
                    }
                    else {
                        throw {
                            err_msg: '该请求已提交审批，正在审批中',
                        };
                    }
                }
                else {
                    let new_one = await sq.models.audit_record.create({
                        url: url,
                        body: JSON.stringify(body),
                        submiter: user.name,
                        submit_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                        submit_token: user.online_token,
                    });
                    await new_one.setCompany(company);
                    ret = new_one.id;
                    let plugin = all_plugin.get_plugin_by_name(exist_record.content_template);
                    if (plugin && plugin.convert_audit_content) {
                        comment = await plugin.convert_audit_content(body, url);
                    }
                }
            }
            else {
                ret = 0;
            }
        }
        else {
            ret = 0;
        }

        return { id: ret, comment: comment };
    },
    audit_req: async function (id, is_approve, user) {
        const sq = db_opt.get_sq();
        let exist_audit_record = await sq.models.audit_record.findByPk(id);
        if (exist_audit_record && !exist_audit_record.audit_time && !exist_audit_record.close_time) {
            exist_audit_record.auditer = user.name;
            if (is_approve) {
                exist_audit_record.audit_time = moment().format('YYYY-MM-DD HH:mm:ss');
                await exist_audit_record.save();
                let new_req_body = JSON.parse(exist_audit_record.body);
                new_req_body.audit_id = exist_audit_record.id;
                await axios.post(`http://localhost:8080/api/v1${exist_audit_record.url}`, new_req_body, {
                    headers: {
                        token: exist_audit_record.submit_token,
                    },
                });
            }
            else {
                exist_audit_record.close_time = moment().format('YYYY-MM-DD HH:mm:ss');
                await exist_audit_record.save();
            }
        }
    },
    get_req4audit: async function (user, status, pageNo) {
        const sq = db_opt.get_sq();
        let pageSize = 20;
        let ret = {
            total: 0,
            records: [],
        }
        let company = await user.getCompany();
        let roles = await user.getRbac_roles();
        let where_clause = {
            companyId: company.id,
        };
        let all_urls = [];
        for (let one_role of roles) {
            let audit_configs = await one_role.getAudit_configs();
            for (let one_config of audit_configs) {
                if (!all_urls.includes(one_config.url)) {
                    all_urls.push(one_config.url);
                }
            }
        }
        where_clause.url = {
            [db_opt.Op.in]: all_urls,
        }
        if (status != undefined) {
            switch (status) {
                case 0:
                    where_clause.audit_time = null;
                    where_clause.close_time = null;
                    break;
                case 1:
                    where_clause.audit_time = { [db_opt.Op.ne]: null };
                    break;
                case 2:
                    where_clause.close_time = { [db_opt.Op.ne]: null };
                    break;
                default:
                    break;
            }
        }

        let resp = await sq.models.audit_record.findAndCountAll({
            where: where_clause,
            offset: pageNo * pageSize,
            limit: pageSize,
            order: [['id', 'DESC']],
        });
        ret.total = resp.count;
        ret.records = resp.rows;
        return ret;
    },
    append_comment: async function (id, comment) {
        const sq = db_opt.get_sq();
        let exist_audit_record = await sq.models.audit_record.findByPk(id);
        if (exist_audit_record) {
            if (comment && comment.length > 0) {
                exist_audit_record.comment = comment;
                await exist_audit_record.save();
            }
            else {
                await exist_audit_record.destroy();
            }
        }
    },
}
const db_opt = require('../db_opt');
const moment = require('moment');
const axios = require('axios');
const rbac_lib = require('./rbac_lib');
const util_lib = require('./util_lib');
const group_lib = require('./group_lib');

/** 审批通过后 HTTP 回放基址：优先 INTERNAL_API_BASE_URL，否则与 index.js 的 PORT / INTERNAL_API_HOST 一致 */
function internal_api_v1_base() {
    const base = process.env.INTERNAL_API_BASE_URL;
    if (base && String(base).trim()) {
        return String(base).replace(/\/$/, '') + '/api/v1';
    }
    const port = process.env.PORT != null && process.env.PORT !== '' ? Number(process.env.PORT) : 8080;
    const host = process.env.INTERNAL_API_HOST || '127.0.0.1';
    return `http://${host}:${port}/api/v1`;
}

const APPROVAL_PROJECTS = {
    CLOSED_ORDER_PRICE: {
        key: 'closed_order_price',
        name: '已关闭订单的调价',
        urls: ['/stuff/change_price_by_plan'],
        company_switch: 'approval_item_closed_order_price',
        company_mode: 'approval_closed_order_price_mode',
        company_auditer: 'approval_closed_order_price_auditer',
    },
    MANUAL_VERIFY_PAY: {
        key: 'manual_verify_pay',
        name: '手动验款',
        urls: ['/cash/order_sale_pay', '/sale_management/order_sale_pay'],
        company_switch: 'approval_item_manual_verify_pay',
        company_mode: 'approval_manual_verify_pay_mode',
        company_auditer: 'approval_manual_verify_pay_auditer',
    },
};

module.exports = {
    normalize_approver_mode: function (m) {
        return m === 'submit_specify' ? 'submit_specify' : 'default';
    },
    get_project_by_url: function (url) {
        let ret = null;
        for (const key of Object.keys(APPROVAL_PROJECTS)) {
            const one_project = APPROVAL_PROJECTS[key];
            if (one_project.urls.includes(url)) {
                ret = one_project;
                break;
            }
        }
        return ret;
    },
    get_or_create_approval_config: async function (company) {
        const sq = db_opt.get_sq();
        let config = await sq.models.approval_config.findOne({
            where: { companyId: company.id },
        });
        if (!config) {
            config = await sq.models.approval_config.create({
                companyId: company.id,
            });
        }
        return config;
    },
    apply_project_to_config: function (config, one_project, projectDef, defaultModeAuditerRequiredErr) {
        if (one_project.key != projectDef.key) {
            return;
        }
        const mode = this.normalize_approver_mode(one_project.approver_mode);
        config[projectDef.company_switch] = !!one_project.enabled;
        config[projectDef.company_mode] = mode;
        const storedAuditer = mode === 'submit_specify' ? '' : (one_project.auditer || '').trim();
        config[projectDef.company_auditer] = storedAuditer;
        if (one_project.enabled && mode === 'default' && !storedAuditer) {
            throw { err_msg: defaultModeAuditerRequiredErr };
        }
    },
    build_pure_body_for_audit: function (body) {
        const pure_body = Object.assign({}, body);
        delete pure_body.audit_id;
        delete pure_body.approval_auditer;
        return pure_body;
    },
    /** 从请求体提取审批列表「审批事项」列可用的简短说明（VARCHAR 255） */
    build_audit_comment_from_pure_body: function (pure_body) {
        if (!pure_body || typeof pure_body !== 'object') {
            return '';
        }
        const parts = [];
        const planId = pure_body.plan_id;
        if (planId !== undefined && planId !== null && String(planId).trim() !== '') {
            parts.push(`计划ID: ${planId}`);
        }
        if (pure_body.unit_price !== undefined && pure_body.unit_price !== null && pure_body.unit_price !== '') {
            parts.push(`新单价: ${pure_body.unit_price}`);
        }
        const c = typeof pure_body.comment === 'string' ? pure_body.comment.trim() : '';
        if (c) {
            parts.push(c);
        }
        const msg = typeof pure_body.msg === 'string' ? pure_body.msg.trim() : '';
        if (msg) {
            parts.push(msg);
        }
        let s = parts.join('；');
        if (s.length > 255) {
            s = s.slice(0, 252) + '...';
        }
        return s;
    },
    find_audit_record_by_pure_body: async function (sq, url, pure_body) {
        return sq.models.audit_record.findOne({
            where: {
                url: url,
                body: JSON.stringify(pure_body),
                status: {
                    [db_opt.Op.in]: ['pending', 'approved'],
                },
            },
        });
    },
    guard_ret_for_existing_audit: function (exist_audit_record, audit_id) {
        if (exist_audit_record.status == 'approved' && exist_audit_record.id == audit_id) {
            return 0;
        }
        throw { err_msg: '该请求已提交审批，正在审批中或已审批' };
    },
    require_auditer_for_guard: function (config, project, body) {
        const mode = this.normalize_approver_mode(config[project.company_mode]);
        const auditer =
            mode === 'default'
                ? (config[project.company_auditer] || '').trim()
                : (body.approval_auditer || '').trim();
        if (auditer) {
            return auditer;
        }
        if (mode === 'default') {
            throw { err_msg: '该项目为默认审批人模式但尚未配置审批人，请联系管理员' };
        }
        throw { err_msg: '请在提交时指定审批人' };
    },
    create_pending_audit_record: async function (sq, url, pure_body, project, company, user, auditer) {
        const summary_comment = this.build_audit_comment_from_pure_body(pure_body);
        let new_one = await sq.models.audit_record.create({
            url: url,
            body: JSON.stringify(pure_body),
            submiter: user.name,
            auditer: auditer,
            submit_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            submit_token: user.online_token,
            project_key: project.key,
            project_name: project.name,
            status: 'pending',
            comment: summary_comment || null,
        });
        await new_one.setCompany(company);
        return { id: new_one.id, comment: summary_comment };
    },
    assert_token_may_act_for_sale_company: async function (user, token_company, sale_company_id) {
        if (!sale_company_id) {
            return;
        }
        if (token_company.id === sale_company_id) {
            return;
        }
        if (token_company.is_group && (await group_lib.user_has_member_data_access(user.id, sale_company_id, true))) {
            return;
        }
        throw { err_msg: '无权限' };
    },
    /** 审批开关、审批记录归属公司：默认操作人所属公司；若请求针对成员公司订单/物料则归销售主体公司 */
    resolve_guard_company: async function (url, token, body, user, token_company) {
        const sq = db_opt.get_sq();
        if (url === '/cash/order_sale_pay' || url === '/sale_management/order_sale_pay') {
            const plan_id = body.plan_id;
            if (plan_id === undefined || plan_id === null) {
                return token_company;
            }
            const plan = await util_lib.get_single_plan_by_id(plan_id);
            if (!plan || !plan.stuff) {
                throw { err_msg: '未找到计划' };
            }
            const sale_id = plan.stuff.companyId;
            await this.assert_token_may_act_for_sale_company(user, token_company, sale_id);
            const co = await sq.models.company.findByPk(sale_id);
            return co || token_company;
        }
        if (url === '/stuff/change_price') {
            const stuff_id = body.stuff_id;
            if (stuff_id === undefined || stuff_id === null) {
                return token_company;
            }
            const stuff = await sq.models.stuff.findByPk(stuff_id);
            if (!stuff) {
                throw { err_msg: '货物不存在' };
            }
            await this.assert_token_may_act_for_sale_company(user, token_company, stuff.companyId);
            const co = await sq.models.company.findByPk(stuff.companyId);
            return co || token_company;
        }
        if (url === '/stuff/change_price_by_plan') {
            let plan_ids;
            try {
                plan_ids = JSON.parse(`[${body.plan_id}]`);
            } catch (e) {
                return token_company;
            }
            if (!Array.isArray(plan_ids) || plan_ids.length === 0) {
                return token_company;
            }
            let sale_id = null;
            for (const pid of plan_ids) {
                const plan = await util_lib.get_single_plan_by_id(pid);
                if (!plan || !plan.stuff) {
                    throw { err_msg: '计划不存在' };
                }
                const sid = plan.stuff.companyId;
                if (sale_id === null) {
                    sale_id = sid;
                } else if (sale_id !== sid) {
                    throw { err_msg: '批量调价仅支持同一销售主体的订单' };
                }
            }
            await this.assert_token_may_act_for_sale_company(user, token_company, sale_id);
            const co = await sq.models.company.findByPk(sale_id);
            return co || token_company;
        }
        return token_company;
    },
    /**
     * 与 stuff/change_price_by_plan 一致：仅「已完成销售订单」(status===3 且非采购) 属于「已关闭订单调价」审批范围。
     * 批次中若无一笔此类订单，即使开启审批开关也不拦截（未关闭订单直接调价）。
     */
    change_price_by_plan_batch_includes_closed_sale_order: async function (body) {
        let plan_ids;
        try {
            plan_ids = JSON.parse(`[${body.plan_id}]`);
        } catch (e) {
            return false;
        }
        if (!Array.isArray(plan_ids) || plan_ids.length === 0) {
            return false;
        }
        for (const pid of plan_ids) {
            const plan = await util_lib.get_single_plan_by_id(pid);
            if (plan && plan.status === 3 && !plan.is_buy) {
                return true;
            }
        }
        return false;
    },
    guard_req_when_project_enabled: async function (sq, url, company, body, user, config, project) {
        const audit_id = body.audit_id || null;
        const pure_body = this.build_pure_body_for_audit(body);
        const exist_audit_record = await this.find_audit_record_by_pure_body(sq, url, pure_body);
        if (exist_audit_record) {
            const id = this.guard_ret_for_existing_audit(exist_audit_record, audit_id);
            return { id, comment: '' };
        }
        const auditer = this.require_auditer_for_guard(config, project, body);
        return await this.create_pending_audit_record(sq, url, pure_body, project, company, user, auditer);
    },
    audit_status_progress: function (status) {
        if (status === 'pending') {
            return '待审批';
        }
        if (status === 'approved') {
            return '已通过';
        }
        if (status === 'rejected') {
            return '已驳回';
        }
        return status ? String(status) : '';
    },
    get_approval_projects: async function (company) {
        let config = await this.get_or_create_approval_config(company);
        return {
            projects: [
                {
                    key: APPROVAL_PROJECTS.CLOSED_ORDER_PRICE.key,
                    name: APPROVAL_PROJECTS.CLOSED_ORDER_PRICE.name,
                    enabled: !!config[APPROVAL_PROJECTS.CLOSED_ORDER_PRICE.company_switch],
                    approver_mode: this.normalize_approver_mode(config[APPROVAL_PROJECTS.CLOSED_ORDER_PRICE.company_mode]),
                    auditer: config[APPROVAL_PROJECTS.CLOSED_ORDER_PRICE.company_auditer] || '',
                },
                {
                    key: APPROVAL_PROJECTS.MANUAL_VERIFY_PAY.key,
                    name: APPROVAL_PROJECTS.MANUAL_VERIFY_PAY.name,
                    enabled: !!config[APPROVAL_PROJECTS.MANUAL_VERIFY_PAY.company_switch],
                    approver_mode: this.normalize_approver_mode(config[APPROVAL_PROJECTS.MANUAL_VERIFY_PAY.company_mode]),
                    auditer: config[APPROVAL_PROJECTS.MANUAL_VERIFY_PAY.company_auditer] || '',
                },
            ],
        };
    },
    set_approval_projects: async function (company, projects) {
        let config = await this.get_or_create_approval_config(company);
        for (const one_project of (projects || [])) {
            this.apply_project_to_config(
                config,
                one_project,
                APPROVAL_PROJECTS.CLOSED_ORDER_PRICE,
                '「已关闭订单的调价」启用且为默认审批人时，必须指定审批人'
            );
            this.apply_project_to_config(
                config,
                one_project,
                APPROVAL_PROJECTS.MANUAL_VERIFY_PAY,
                '「手动验款」启用且为默认审批人时，必须指定审批人'
            );
        }
        await config.save();
    },
    guard_req: async function (url, token, body) {
        const user = await rbac_lib.get_user_by_token(token);
        const token_company = await rbac_lib.get_company_by_token(token);
        if (!token_company || !user) {
            return { id: 0, comment: '' };
        }
        const project = this.get_project_by_url(url);
        if (!project) {
            return { id: 0, comment: '' };
        }
        if (
            project.key === APPROVAL_PROJECTS.CLOSED_ORDER_PRICE.key &&
            url === '/stuff/change_price_by_plan' &&
            !(await this.change_price_by_plan_batch_includes_closed_sale_order(body))
        ) {
            return { id: 0, comment: '' };
        }
        const guard_company = await this.resolve_guard_company(url, token, body, user, token_company);
        const config = await this.get_or_create_approval_config(guard_company);
        if (!config[project.company_switch]) {
            return { id: 0, comment: '' };
        }
        const sq = db_opt.get_sq();
        const { id, comment } = await this.guard_req_when_project_enabled(sq, url, guard_company, body, user, config, project);
        return { id, comment };
    },
    audit_req: async function (id, is_approve, user) {
        const sq = db_opt.get_sq();
        let exist_audit_record = await sq.models.audit_record.findByPk(id);
        if (exist_audit_record?.status == 'pending') {
            if ((exist_audit_record.auditer?.length ?? 0) > 0 && exist_audit_record.auditer != user.name) {
                throw { err_msg: '该审批已指定审批人，您无权限审批' };
            }
            exist_audit_record.auditer = user.name;
            if (is_approve) {
                exist_audit_record.audit_time = moment().format('YYYY-MM-DD HH:mm:ss');
                exist_audit_record.status = 'approved';
                await exist_audit_record.save();
                let new_req_body = JSON.parse(exist_audit_record.body);
                delete new_req_body.approval_auditer;
                new_req_body.audit_id = exist_audit_record.id;
                await axios.post(`${internal_api_v1_base()}${exist_audit_record.url}`, new_req_body, {
                    headers: { token: exist_audit_record.submit_token },
                });
            } else {
                exist_audit_record.close_time = moment().format('YYYY-MM-DD HH:mm:ss');
                exist_audit_record.status = 'rejected';
                await exist_audit_record.save();
            }
        }
    },
    get_req4audit: async function (user, status, pageNo) {
        const sq = db_opt.get_sq();
        let pageSize = 20;
        let ret = { total: 0, records: [] };
        let company = await user.getCompany();
        let where_clause = { companyId: company.id };
        const can_audit = (await rbac_lib.rbac_check(user.online_token, 'approval', true)).length == 0;
        if (can_audit) {
            where_clause[db_opt.Op.or] = [
                { submiter: user.name },
                { auditer: user.name },
                { auditer: '' },
                { auditer: null },
            ];
        } else {
            where_clause.submiter = user.name;
        }
        if (status != undefined) {
            if (status == 0) where_clause.status = 'pending';
            if (status == 1) where_clause.status = 'approved';
            if (status == 2) where_clause.status = 'rejected';
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
};

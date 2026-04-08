const db_opt = require('../db_opt');
const approval_lib = require('../lib/approval_lib');
const rbac_lib = require('../lib/rbac_lib');
const util_lib = require('../lib/util_lib');
const group_lib = require('../lib/group_lib');

async function company_for_approval_context(body, token) {
    const token_company = await rbac_lib.get_company_by_token(token);
    if (body.plan_id === undefined || body.plan_id === null || body.plan_id === '') {
        return token_company;
    }
    const plan = await util_lib.get_single_plan_by_id(body.plan_id);
    if (!plan || !plan.stuff) {
        throw { err_msg: '未找到计划' };
    }
    const sale_id = plan.stuff.companyId;
    if (!(await group_lib.can_operate_member_sale_company(token, sale_id))) {
        throw { err_msg: '无权限' };
    }
    const co = await db_opt.get_sq().models.company.findByPk(sale_id);
    return co || token_company;
}

module.exports = {
    name: 'approval',
    description: '新审批管理',
    methods: {
        get_auditer_pick_list: {
            name: '可选审批人列表',
            description: '提交审批时选择审批人用的同公司用户列表',
            is_write: false,
            is_get_api: true,
            need_rbac: false,
            params: {
                plan_id: { type: Number, have_to: false, mean: '销售订单：传计划 id 时拉取物料所属（接单）公司的审批人候选', example: 1 },
            },
            result: {
                all_user: {
                    type: Array, mean: '用户', explain: {
                        id: { type: Number, mean: 'id', example: 1 },
                        name: { type: String, mean: '姓名', example: '张三' },
                        phone: { type: String, mean: '手机', example: '13800138000' },
                    }
                },
                total: { type: Number, mean: '总数', example: 10 },
            },
            func: async function (body, token) {
                let company = await company_for_approval_context(body, token);
                let { count, rows } = await rbac_lib.get_all_users(company, body.pageNo || 0);
                const all_user = Array.isArray(rows)
                    ? rows.map((user) => ({
                        id: user.id,
                        name: user.name,
                        phone: user.phone,
                    }))
                    : [];
                return { all_user, total: count };
            },
        },
        get_approval_projects: {
            name: '获取审批项目',
            description: '获取审批项目开关与审批人',
            is_write: false,
            is_get_api: true,
            need_rbac: false,
            params: {
                plan_id: { type: Number, have_to: false, mean: '销售订单：传计划 id 时读取物料所属（接单）公司的审批开关', example: 1 },
            },
            result: {
                projects: {
                    type: Array, mean: '审批项目', explain: {
                        key: { type: String, mean: '项目key', example: 'closed_order_price' },
                        name: { type: String, mean: '项目名称', example: '已关闭订单的调价' },
                        enabled: { type: Boolean, mean: '是否启用', example: true },
                        approver_mode: { type: String, mean: '审批人方式：default 默认审批人，submit_specify 提交时指定', example: 'default' },
                        auditer: { type: String, mean: '默认审批人模式下配置的审批人', example: '张三' },
                    }
                },
            },
            func: async function (body, token) {
                let company = await company_for_approval_context(body, token);
                return await approval_lib.get_approval_projects(company);
            },
        },
        set_approval_projects: {
            name: '设置审批项目',
            description: '按审批项目设置开关和审批人',
            is_write: true,
            is_get_api: false,
            params: {
                projects: {
                    type: Array, have_to: true, mean: '审批项目', explain: {
                        key: { type: String, have_to: true, mean: '项目key', example: 'closed_order_price' },
                        enabled: { type: Boolean, have_to: true, mean: '是否启用', example: true },
                        approver_mode: { type: String, have_to: false, mean: '审批人方式：default 或 submit_specify', example: 'default' },
                        auditer: { type: String, have_to: false, mean: '默认审批人模式下必填', example: '张三' },
                    }
                },
            },
            result: { result: { type: Boolean, mean: '操作结果', example: true } },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                await approval_lib.set_approval_projects(company, body.projects);
                return { result: true };
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
                        url: { type: String, mean: '接口URL', example: '/stuff/change_price_by_plan' },
                        url_name: { type: String, mean: '接口名称', example: '已关闭订单的调价' },
                        body: { type: String, mean: '请求体', example: '{}' },
                        project_key: { type: String, mean: '审批项目key', example: 'closed_order_price' },
                        project_name: { type: String, mean: '审批项目名称', example: '已关闭订单的调价' },
                        submiter: { type: String, mean: '提交人', example: '张三' },
                        auditer: { type: String, mean: '审批人', example: '李四' },
                        submit_time: { type: String, mean: '提交时间', example: '2026-03-26 10:00:00' },
                        audit_time: { type: String, mean: '审批时间', example: '2026-03-26 11:00:00' },
                        close_time: { type: String, mean: '驳回时间', example: '2026-03-26 11:10:00' },
                        comment: { type: String, mean: '审批备注', example: '请审批' },
                        status: { type: String, mean: '状态', example: 'pending' },
                        progress: { type: String, mean: '审批进度（提审人/审批人列表展示）', example: '待审批' },
                    }
                },
                total: { type: Number, mean: '总数', example: 1 },
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                let resp = await approval_lib.get_req4audit(user, body.status, body.pageNo || 0);
                resp.records = resp.records.map((row) => {
                    let one = typeof row.get === 'function' ? row.get({ plain: true }) : row;
                    one.url_name = one.project_name || '';
                    one.progress = approval_lib.audit_status_progress(one.status);
                    return one;
                });
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
                await approval_lib.audit_req(body.id, body.is_approve, user);
                return { result: true };
            },
        },
    }
};

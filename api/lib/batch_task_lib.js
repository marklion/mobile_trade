const axios = require('axios');
const moment = require('moment');
const uuid = require('uuid');
const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');
const approval_lib = require('./approval_lib');

const ACTIVE_STATUSES = ['pending', 'running'];
const runningCompanies = new Set();
const SUPPORTED_OPERATIONS = {
    '/sale_management/order_sale_confirm': {
        module: 'sale_management',
        name: '批量确认',
        fields: [],
    },
    '/buy_management/order_buy_confirm': {
        module: 'buy_management',
        name: '批量确认',
        fields: [],
    },
    '/cash/order_sale_pay': {
        module: 'cash',
        name: '批量验款',
        fields: [],
    },
    '/sale_management/order_sale_pay': {
        module: 'sale_management',
        name: '批量验款',
        fields: [],
    },
    '/customer/order_buy_cancel': {
        module: 'customer',
        name: '批量取消',
        fields: [],
    },
    '/supplier/order_sale_cancel': {
        module: 'supplier',
        name: '批量取消',
        fields: [],
    },
    '/sale_management/close': {
        module: 'sale_management',
        name: '批量取消',
        fields: [],
    },
    '/buy_management/close': {
        module: 'buy_management',
        name: '批量取消',
        fields: [],
    },
    '/stuff/change_price_by_plan': {
        module: 'stuff',
        name: '批量调价',
        fields: ['unit_price', 'comment'],
    },
    '/sale_management/change_plan_delegate': {
        module: 'sale_management',
        name: '批量代理',
        fields: ['delegate_id'],
    },
};

function internal_api_v1_base() {
    const base = process.env.INTERNAL_API_BASE_URL;
    if (base && String(base).trim()) {
        return String(base).replace(/\/$/, '') + '/api/v1';
    }
    const port = process.env.PORT != null && process.env.PORT !== '' ? Number(process.env.PORT) : 8080;
    const host = process.env.INTERNAL_API_HOST || '127.0.0.1';
    return `http://${host}:${port}/api/v1`;
}

function parse_plan_ids(plan_id) {
    const ids = String(plan_id || '').split(',').map(item => Number(item.trim()));
    if (!ids.length || ids.some(item => !Number.isSafeInteger(item) || item <= 0)) {
        throw { err_msg: '计划ID列表格式错误' };
    }
    return [...new Set(ids)];
}

function make_operation_body(body, operation) {
    const ret = {};
    for (const field of operation.fields) {
        ret[field] = body[field];
    }
    if (body.url === '/stuff/change_price_by_plan') {
        if (!Number.isFinite(ret.unit_price) || typeof ret.comment !== 'string') {
            throw { err_msg: '批量调价参数错误' };
        }
    }
    if (body.url === '/sale_management/change_plan_delegate'
        && ret.delegate_id !== undefined && (!Number.isSafeInteger(ret.delegate_id) || ret.delegate_id < 0)) {
        throw { err_msg: '批量代理参数错误' };
    }
    return ret;
}

function error_message(error) {
    return error?.err_msg || error?.message || String(error);
}

async function schedule_pending_tasks() {
    const tasks = await db_opt.get_sq().models.batch_task.findAll({
        where: { status: 'pending' },
        order: [['id', 'ASC']],
    });
    for (const task of tasks) {
        if (!runningCompanies.has(task.companyId)) {
            run_task(task);
        }
    }
}

async function execute_task(task) {
    const operation_body = JSON.parse(task.request_body || '{}');
    const plan_ids = JSON.parse(task.plan_ids);
    const details = [];
    let success_count = 0;
    let failure_count = 0;
    for (let index = 0; index < plan_ids.length; index++) {
        const plan_id = plan_ids[index];
        try {
            const response = await axios.post(`${internal_api_v1_base()}${task.url}`, {
                ...operation_body,
                plan_id: task.url === '/stuff/change_price_by_plan' ? String(plan_id) : plan_id,
            }, {
                headers: {
                    token: task.submit_token,
                    'batch-task-id': String(task.id),
                    'batch-task-key': task.execution_key,
                },
            });
            if (response.data.err_msg) {
                throw new Error(response.data.err_msg);
            }
            if (response.data.audit_id > 0) {
                throw new Error('任务执行时异常进入审批');
            }
            success_count++;
            details.push({ plan_id, success: true });
        } catch (error) {
            failure_count++;
            details.push({ plan_id, success: false, error: error_message(error) });
        }
        task.current_count = index + 1;
        task.success_count = success_count;
        task.failure_count = failure_count;
        task.result = JSON.stringify(details);
        await task.save();
    }
    if (failure_count === 0) {
        task.status = 'success';
    } else if (success_count === 0) {
        task.status = 'failed';
    } else {
        task.status = 'partial_failed';
    }
    task.finished_at = moment().format('YYYY-MM-DD HH:mm:ss');
    await task.save();
}

async function run_task(task_summary) {
    const company_id = task_summary.companyId;
    runningCompanies.add(company_id);
    try {
        const [updated] = await db_opt.get_sq().models.batch_task.update({
            status: 'running',
            started_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        }, {
            where: { id: task_summary.id, status: 'pending' },
        });
        if (!updated) {
            return;
        }
        const task = await db_opt.get_sq().models.batch_task.findByPk(task_summary.id);
        if (!task) {
            return;
        }
        try {
            await execute_task(task);
        } catch (error) {
            task.status = 'failed';
            task.error_msg = error_message(error);
            task.finished_at = moment().format('YYYY-MM-DD HH:mm:ss');
            await task.save();
        }
    } catch (error) {
        console.error('批量任务调度失败:', error);
    } finally {
        runningCompanies.delete(company_id);
        setImmediate(() => {
            schedule_pending_tasks().catch(error => console.error('批量任务调度失败:', error));
        });
    }
}

module.exports = {
    create_task: async function (body, token) {
        const operation = SUPPORTED_OPERATIONS[body.url];
        if (!operation) {
            throw { err_msg: '不支持的批量操作' };
        }
        const user = await rbac_lib.get_user_by_token(token);
        const company = await rbac_lib.get_company_by_token(token);
        if (!user || !company) {
            throw { err_msg: '用户或公司不存在' };
        }
        const permission_error = await rbac_lib.rbac_check(token, operation.module, true);
        if (permission_error) {
            throw { err_msg: permission_error };
        }
        const plan_ids = parse_plan_ids(body.plan_id);
        const operation_body = make_operation_body(body, operation);
        const project = approval_lib.get_project_by_url(body.url);
        if (project) {
            const config = await approval_lib.get_or_create_approval_config(company);
            if (config[project.company_switch]) {
                const guard_ret = await approval_lib.guard_req_when_project_enabled(
                    db_opt.get_sq(), '/global/batch_task_create', company, body, user, config, project
                );
                if (guard_ret.id !== 0) {
                    return {
                        task_id: 0,
                        audit_id: guard_ret.id,
                        comment: guard_ret.comment,
                    };
                }
            }
        }

        const task = await db_opt.get_sq().transaction(async (t) => {
            await db_opt.get_sq().models.company.findByPk(company.id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            const active_task = await db_opt.get_sq().models.batch_task.findOne({
                where: {
                    companyId: company.id,
                    status: { [db_opt.Op.in]: ACTIVE_STATUSES },
                },
                transaction: t,
            });
            if (active_task) {
                throw { err_msg: '当前公司已有耗时任务正在执行，请完成后再试' };
            }
            return await db_opt.get_sq().models.batch_task.create({
                url: body.url,
                task_name: operation.name,
                request_body: JSON.stringify(operation_body),
                plan_ids: JSON.stringify(plan_ids),
                total_count: plan_ids.length,
                submit_token: token,
                execution_key: uuid.v4(),
                companyId: company.id,
                rbacUserId: user.id,
            }, { transaction: t });
        });
        setImmediate(() => {
            schedule_pending_tasks().catch(error => console.error('批量任务调度失败:', error));
        });
        return { task_id: task.id, audit_id: 0, comment: '' };
    },
    current_task: async function (token) {
        const company = await rbac_lib.get_company_by_token(token);
        const empty = {
            has_task: false,
            task_id: 0,
            task_name: '',
            status: '',
            total_count: 0,
            current_count: 0,
            success_count: 0,
            failure_count: 0,
        };
        if (!company) {
            return empty;
        }
        const task = await db_opt.get_sq().models.batch_task.findOne({
            where: {
                companyId: company.id,
                status: { [db_opt.Op.in]: ACTIVE_STATUSES },
            },
            order: [['id', 'DESC']],
        });
        if (!task) {
            return empty;
        }
        return {
            has_task: true,
            task_id: task.id,
            task_name: task.task_name,
            status: task.status,
            total_count: task.total_count,
            current_count: task.current_count,
            success_count: task.success_count,
            failure_count: task.failure_count,
        };
    },
    verify_execution: async function (url, task_id, execution_key) {
        if (!task_id || !execution_key) {
            return false;
        }
        const task = await db_opt.get_sq().models.batch_task.findOne({
            where: {
                id: task_id,
                url,
                execution_key,
                status: 'running',
            },
        });
        return !!task;
    },
    init: async function () {
        await db_opt.get_sq().models.batch_task.update({
            status: 'failed',
            error_msg: '服务重启，任务中断',
            finished_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        }, {
            where: { status: 'running' },
        });
        await schedule_pending_tasks();
    },
};

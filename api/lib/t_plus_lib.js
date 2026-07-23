const axios = require('axios');
const moment = require('moment');
const ExcelJS = require('exceljs');
const uuid = require('uuid');
const db_opt = require('../db_opt');
const util_lib = require('./util_lib');

function format_plan_datetime(plan) {
    const plan_time = plan.plan_time || '';
    if (plan_time.indexOf(':') >= 0) {
        return plan_time;
    }
    const full_time = plan.m_time || plan.p_time || plan.enter_time || plan.register_time || '';
    if (full_time && full_time.indexOf(':') >= 0) {
        return full_time;
    }
    return plan_time;
}

function map_plan_row(plan, company) {
    const plain = plan.toJSON ? plan.toJSON() : plan;
    const record = plain.tplus_settle_record || {};
    const push_log = plain.tplus_push_log || {};
    const unit_price = parseFloat(plain.unit_price) || 0;
    const count = parseFloat(plain.count) || 0;
    return {
        id: plain.id,
        record_id: record.id,
        settle_time: record.settle_time,
        settle_type: record.settle_type,
        status: record.status,
        operator: push_log.operator || record.operator,
        plan_date: format_plan_datetime(plain),
        plate: plain.main_vehicle ? plain.main_vehicle.plate : '',
        order_company: plain.company ? plain.company.name : '',
        accept_company: (plain.stuff && plain.stuff.company) ? plain.stuff.company.name : (company ? company.name : ''),
        stuff_name: plain.stuff ? plain.stuff.name : '',
        unit_price,
        count,
        total_price: unit_price * count,
        execute_result: push_log.execute_result || '',
        success: !!push_log.success,
        push_time: push_log.push_time || '',
    };
}

module.exports = {
    req2tplus: async function (method, url, params, body, company) {
        let appkey = company.tplus_appkey;
        let token_resp = await axios.get(`https://cjtapi.d8sis.cn/token?appkey=${appkey}`);
        let token = token_resp.data.access_token;
        let axios_instance = axios.create({
            headers: {
                'Content-Type': 'application/json',
                "appKey": company.tplus_appkey,
                "appSecret": company.tplus_appsecret,
                "openToken": token
            }
        });
        let resp;
        try {
            resp = await axios_instance({
                method: method,
                url: url,
                params: params,
                data: body,
                timeout: 30000,
                validateStatus: () => true,
            });
        } catch (e) {
            console.error('call tplus failed:', e && e.message ? e.message : e);
            throw { err_msg: '调用T+接口失败' };
        }
        if (resp.status !== 200) {
            console.error(`call tplus failed: status=${resp.status}`);
            throw { err_msg: '调用T+接口失败' };
        }
        return resp.data;
    },
    tplus_settle: async function (plans) {
        for (let i = 0; i < plans.length; i++) {
            const plan = plans[i];
            plan.execute_result = '推送成功';
            plan.tplus_success = true;
        }
        return plans;
    },
    get_or_create_config: async function (company) {
        let config = await company.getTplus_config();
        if (!config) {
            config = await company.createTplus_config({
                buy_settle_time: '00:00:00',
                buy_settle_cycle: 5,
                sale_settle_time: '00:00:00',
                sale_settle_cycle: 5,
            });
        }
        return config;
    },
    filter_unsettled_plans: async function (company, is_buy, cycle_days) {
        const sq = db_opt.get_sq();
        const stuff = await company.getStuff({ paranoid: false });
        if (!stuff || stuff.length === 0) {
            return [];
        }
        const stuff_or = stuff.map((s) => ({ stuffId: s.id }));
        const start_date = moment().subtract(cycle_days || 5, 'days').format('YYYY-MM-DD');
        const where_condition = {
            [db_opt.Op.and]: [
                {
                    status: 3,
                    manual_close: false,
                    is_buy: !!is_buy,
                    count: {
                        [db_opt.Op.ne]: 0,
                    },
                    plan_time: {
                        [db_opt.Op.gte]: start_date,
                    },
                },
                {
                    [db_opt.Op.or]: stuff_or,
                },
                // 推送成功过的计划不再推；无日志或失败可推
                sq.literal(`(select count(*) from tplus_push_log where planId = plan.id AND deletedAt is Null AND success = 1) = 0`),
            ],
        };
        return await sq.models.plan.findAll({
            where: where_condition,
            include: util_lib.plan_detail_include(),
        });
    },
    do_settle: async function (company, is_buy, operator) {
        const config = await this.get_or_create_config(company);
        const cycle = is_buy ? (config.buy_settle_cycle || 5) : (config.sale_settle_cycle || 5);
        let plans = await this.filter_unsettled_plans(company, is_buy, cycle);
        const settle_type = is_buy ? 'buy' : 'sale';
        const settle_time = moment().format('YYYY-MM-DD HH:mm:ss');
        const op = operator || '系统';

        plans = await this.tplus_settle(plans);

        let all_success = true;
        let plate_summary = '';
        if (plans.length > 0) {
            const first = plans[0];
            plate_summary = first.main_vehicle ? first.main_vehicle.plate : '';
            if (plans.length > 1) {
                plate_summary += `等${plans.length}车`;
            }
        } else {
            plate_summary = '无计划';
        }

        for (let i = 0; i < plans.length; i++) {
            if (!plans[i].tplus_success) {
                all_success = false;
                break;
            }
        }

        const record = await company.createTplus_settle_record({
            settle_time,
            settle_type,
            status: plans.length === 0 ? '无待结算计划' : (all_success ? '推送成功' : '推送失败'),
            plate_summary,
            operator: op,
        });

        for (let i = 0; i < plans.length; i++) {
            const plan = plans[i];
            const success = !!plan.tplus_success;
            const execute_result = plan.execute_result || '';
            plan.tplusSettleRecordId = record.id;
            await plan.save();

            let push_log = await plan.getTplus_push_log();
            if (push_log) {
                push_log.push_time = settle_time;
                push_log.success = success;
                push_log.execute_result = execute_result;
                push_log.operator = op;
                await push_log.save();
            } else {
                await plan.createTplus_push_log({
                    push_time: settle_time,
                    success,
                    execute_result,
                    operator: op,
                });
            }
        }

        if (is_buy) {
            config.buy_last_settle_time = settle_time;
        } else {
            config.sale_last_settle_time = settle_time;
        }
        await config.save();

        return record;
    },
    should_auto_settle: function (last_settle_time, settle_time, cycle_days) {
        if (!settle_time) {
            return false;
        }
        const now = moment();
        const now_hms = now.format('HH:mm:ss');
        if (now_hms < settle_time) {
            return false;
        }
        if (!last_settle_time) {
            return true;
        }
        const last = moment(last_settle_time, 'YYYY-MM-DD HH:mm:ss');
        if (!last.isValid()) {
            return true;
        }
        if (last.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
            return false;
        }
        const days = now.clone().startOf('day').diff(last.clone().startOf('day'), 'days');
        return days >= (cycle_days || 5);
    },
    walk_through_tplus_settle: async function () {
        const sq = db_opt.get_sq();
        const configs = await sq.models.tplus_config.findAll({
            include: [sq.models.company],
        });
        for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            const company = config.company;
            if (!company) {
                continue;
            }
            try {
                if (this.should_auto_settle(config.buy_last_settle_time, config.buy_settle_time, config.buy_settle_cycle)) {
                    await this.do_settle(company, true, '定时任务');
                }
                if (this.should_auto_settle(config.sale_last_settle_time, config.sale_settle_time, config.sale_settle_cycle)) {
                    await this.do_settle(company, false, '定时任务');
                }
            } catch (e) {
                console.log('tplus auto settle error:', e);
            }
        }
    },
    get_push_log: async function (company, plan_id) {
        const sq = db_opt.get_sq();
        const record_ids = (await company.getTplus_settle_records({
            attributes: ['id'],
        })).map((r) => r.id);
        if (record_ids.length === 0) {
            throw { err_msg: '结算计划不存在' };
        }
        const plan = await sq.models.plan.findOne({
            where: {
                id: plan_id,
                tplusSettleRecordId: {
                    [db_opt.Op.in]: record_ids,
                },
            },
            include: [{
                model: sq.models.tplus_push_log,
                required: false,
            }],
        });
        if (!plan) {
            throw { err_msg: '结算计划不存在' };
        }
        const log = plan.tplus_push_log;
        if (!log) {
            return [];
        }
        const plain = log.toJSON();
        return [{
            id: plain.id,
            push_time: plain.push_time,
            success: plain.success,
            execute_result: plain.execute_result,
            operator: plain.operator,
        }];
    },
    get_settle_records: async function (company, pageNo, only_success) {
        const sq = db_opt.get_sq();
        const record_ids = (await company.getTplus_settle_records({
            attributes: ['id'],
        })).map((r) => r.id);
        if (record_ids.length === 0) {
            return { rows: [], count: 0 };
        }
        const push_log_include = {
            model: sq.models.tplus_push_log,
            required: true,
        };
        if (only_success) {
            push_log_include.where = { success: true };
        }
        const { count, rows } = await sq.models.plan.findAndCountAll({
            where: {
                tplusSettleRecordId: {
                    [db_opt.Op.in]: record_ids,
                },
            },
            include: [
                {
                    model: sq.models.tplus_settle_record,
                    attributes: ['id', 'settle_time', 'settle_type', 'status', 'operator'],
                    required: true,
                },
                push_log_include,
                { model: sq.models.vehicle, as: 'main_vehicle', paranoid: false },
                { model: sq.models.company, paranoid: false },
                {
                    model: sq.models.stuff,
                    paranoid: false,
                    include: [{ model: sq.models.company, paranoid: false }],
                },
            ],
            offset: pageNo * 20,
            limit: 20,
            order: [['id', 'DESC']],
            distinct: true,
        });
        return {
            rows: rows.map((p) => map_plan_row(p, company)),
            count,
        };
    },
    export_settle_detail: async function (company) {
        const sq = db_opt.get_sq();
        const config = await this.get_or_create_config(company);
        const buy_cycle = config.buy_settle_cycle || 5;
        const sale_cycle = config.sale_settle_cycle || 5;
        const buy_start = moment().subtract(buy_cycle, 'days').format('YYYY-MM-DD');
        const sale_start = moment().subtract(sale_cycle, 'days').format('YYYY-MM-DD');
        const record_ids = (await company.getTplus_settle_records({
            attributes: ['id'],
        })).map((r) => r.id);
        let plans = [];
        if (record_ids.length > 0) {
            plans = await sq.models.plan.findAll({
                where: {
                    tplusSettleRecordId: {
                        [db_opt.Op.in]: record_ids,
                    },
                },
                include: [
                    {
                        model: sq.models.tplus_settle_record,
                        attributes: ['settle_type'],
                        required: true,
                    },
                    {
                        model: sq.models.tplus_push_log,
                        required: true,
                    },
                    { model: sq.models.vehicle, as: 'main_vehicle', paranoid: false },
                    { model: sq.models.company, paranoid: false },
                    {
                        model: sq.models.stuff,
                        paranoid: false,
                        include: [{ model: sq.models.company, paranoid: false }],
                    },
                ],
                order: [['id', 'DESC']],
            });
            plans = plans.filter((p) => {
                const settle_type = p.tplus_settle_record ? p.tplus_settle_record.settle_type : '';
                const start = settle_type === 'buy' ? buy_start : sale_start;
                return (format_plan_datetime(p) || '') >= start;
            });
        }
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('结算记录表');
        worksheet.columns = [
            { header: '计划日期', key: 'plan_date', width: 20 },
            { header: '车号', key: 'plate', width: 14 },
            { header: '下单公司', key: 'order_company', width: 20 },
            { header: '接单公司', key: 'accept_company', width: 20 },
            { header: '物料', key: 'stuff_name', width: 16 },
            { header: '单价', key: 'unit_price', width: 12 },
            { header: '数量', key: 'count', width: 12 },
            { header: '总价', key: 'total_price', width: 12 },
            { header: '执行结果', key: 'execute_result', width: 16 },
        ];
        plans.forEach((p) => {
            const row = map_plan_row(p, company);
            worksheet.addRow({
                plan_date: row.plan_date,
                plate: row.plate,
                order_company: row.order_company,
                accept_company: row.accept_company,
                stuff_name: row.stuff_name,
                unit_price: row.unit_price,
                count: row.count,
                total_price: row.total_price,
                execute_result: row.execute_result,
            });
        });
        ['unit_price', 'count', 'total_price'].forEach((key) => {
            worksheet.getColumn(key).numFmt = '0.00';
        });
        const file_name = '/uploads/tplus_settle_' + uuid.v4() + '.xlsx';
        await workbook.xlsx.writeFile('/database' + file_name);
        return file_name;
    },
};

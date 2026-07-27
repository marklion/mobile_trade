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

function map_plan_export_row(plan, company) {
    const plain = plan.toJSON ? plan.toJSON() : plan;
    const push_log = plain.tplus_push_log || {};
    const unit_price = parseFloat(plain.unit_price) || 0;
    const count = parseFloat(plain.count) || 0;
    return {
        plan_date: format_plan_datetime(plain),
        plate: plain.main_vehicle ? plain.main_vehicle.plate : '',
        order_company: plain.company ? plain.company.name : '',
        accept_company: (plain.stuff && plain.stuff.company) ? plain.stuff.company.name : (company ? company.name : ''),
        stuff_name: plain.stuff ? plain.stuff.name : '',
        unit_price,
        count,
        total_price: unit_price * count,
        execute_result: push_log.execute_result || '',
        success: push_log.success ? '成功' : '失败',
        push_time: push_log.push_time || '',
        operator: push_log.operator || '',
    };
}
async function private_req2tplus(method, url, params, body, company) {
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
    console.log(`call ${url}\nreq:${JSON.stringify(body)}`);
    try {
        resp = await axios_instance({
            method: method,
            url: url,
            params: {
                ...params,
                idMarketingOrgan: company.tplus_market_oid,
            },
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
        throw { err_msg: `调用T+接口失败:${resp.data && resp.data.message ? resp.data.message : '未知错误'}` };
    }

    console.log(`resp:${JSON.stringify(resp.data)}`);

    return resp.data;
}
async function get_partner_code(sale_company, buy_company) {
    let ret = null;
    let resp = await private_req2tplus(
        "POST",
        "https://openapi.chanjet.com/tplus/api/v2/partner/Query",
        null,
        {
            param: {
                name: buy_company.name,
            }
        },
        sale_company
    );
    if (resp.length >= 1) {
        for (let item of resp) {
            if (item.Code.indexOf('-') > 0) {
                if (item.Code.split('-')[1] === sale_company.tplus_market_code) {
                    ret = item.Code;
                }
            }
        }
    }
    return ret;
}
module.exports = {
    req2tplus: private_req2tplus,

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
            await plan.setTplus_settle_record(record);

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
    get_settle_records: async function (company, pageNo) {
        const rows = await company.getTplus_settle_records({
            offset: pageNo * 20,
            limit: 20,
            order: [['id', 'DESC']],
        });
        const count = await company.countTplus_settle_records();
        return {
            rows: rows.map((r) => {
                const plain = r.toJSON();
                return {
                    id: plain.id,
                    settle_time: plain.settle_time,
                    settle_type: plain.settle_type,
                    status: plain.status,
                    operator: plain.operator,
                    plate_summary: plain.plate_summary,
                };
            }),
            count,
        };
    },
    export_settle_detail: async function (company, record_id) {
        const sq = db_opt.get_sq();
        const record = await sq.models.tplus_settle_record.findOne({
            where: {
                id: record_id,
                companyId: company.id,
            },
        });
        if (!record) {
            throw { err_msg: '结算记录不存在' };
        }
        const plans = await record.getPlans({
            include: [
                {
                    model: sq.models.tplus_push_log,
                    required: false,
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
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('结算详情');
        worksheet.columns = [
            { header: '计划日期', key: 'plan_date', width: 20 },
            { header: '车号', key: 'plate', width: 14 },
            { header: '下单公司', key: 'order_company', width: 20 },
            { header: '接单公司', key: 'accept_company', width: 20 },
            { header: '物料', key: 'stuff_name', width: 16 },
            { header: '单价', key: 'unit_price', width: 12 },
            { header: '数量', key: 'count', width: 12 },
            { header: '总价', key: 'total_price', width: 12 },
            { header: '推送时间', key: 'push_time', width: 20 },
            { header: '是否成功', key: 'success', width: 12 },
            { header: '执行结果', key: 'execute_result', width: 16 },
            { header: '操作人', key: 'operator', width: 12 },
        ];
        plans.forEach((p) => {
            worksheet.addRow(map_plan_export_row(p, company));
        });
        ['unit_price', 'count', 'total_price'].forEach((key) => {
            worksheet.getColumn(key).numFmt = '0.00';
        });
        const file_name = '/uploads/tplus_settle_' + uuid.v4() + '.xlsx';
        await workbook.xlsx.writeFile('/database' + file_name);
        return file_name;
    },
    push_charge_msg: async function (contract, cash) {
        let sale_company = await contract.getSale_company();
        let buy_company = await contract.getBuy_company();

        let charge_body = {
            idMarketingOrgan: sale_company.tplus_market_oid,
            dto: {
                VoucherDate: moment().format('YYYY-MM-DD'),
                ExternalCode: buy_company.name + '-' + cash + '-' + moment().format('YYYYMMDDHHmmss'),
                Partner: {
                    Code: await get_partner_code(sale_company, buy_company),
                },
                IsReceiveFlag: true,
                BusiType: {
                    Code: "45",
                },
                ArapMultiSettleDetails: [
                    {
                        SettleStyle: {
                            Code: "997"
                        },
                        BankAccount: {
                            Name: '建设银行',
                        },
                        OrigAmount: cash,
                        Memo: `掌易助理充值:${cash}`,
                    }
                ],

            },
        };
        let charge_resp = await private_req2tplus(
            "POST",
            'https://openapi.chanjet.com/tplus/api/v2/ReceivePaymentVoucherOpenApi/NewCreate',
            {},
            charge_body,
            sale_company
        );
        return charge_resp.data.Code;
    },
};
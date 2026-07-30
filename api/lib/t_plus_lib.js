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
    const unit_price = (push_log.unit_price !== undefined && push_log.unit_price !== null)
        ? (parseFloat(push_log.unit_price) || 0)
        : (parseFloat(plain.unit_price) || 0);
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
function normalize_stuff_code(stuff_code) {
    if (!stuff_code) {
        return '';
    }
    let split_array = stuff_code.split('|');
    if (split_array.length == 1) {
        return split_array[0];
    }
    else {
        return split_array[1];
    }
}
function get_inv_code_from_stuff(stuff_code) {
    let ret = '';
    let split_array = stuff_code.split('|');
    if (split_array.length >2)
    {
        ret = split_array[2];
    }
    return ret;
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
    console.log(`call ${url + '?idMarketingOrgan=' + company.tplus_market_oid}\nreq:${JSON.stringify(body)}`);
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
function parse_buy_stuff_prices(raw) {
    if (Array.isArray(raw)) {
        return raw.map((item) => ({
            stuff_id: Number(item.stuff_id),
            price: Number(Number(item.price).toFixed(2)),
        })).filter((item) => item.stuff_id > 0 && !Number.isNaN(item.price));
    }
    if (!raw || typeof raw !== 'string') {
        return [];
    }
    try {
        return parse_buy_stuff_prices(JSON.parse(raw));
    } catch (e) {
        return [];
    }
}

function stringify_buy_stuff_prices(prices) {
    return JSON.stringify(parse_buy_stuff_prices(prices));
}

function apply_buy_stuff_prices(plans, stuff_prices) {
    const price_map = new Map();
    parse_buy_stuff_prices(stuff_prices).forEach((item) => {
        price_map.set(item.stuff_id, item.price);
    });
    plans.forEach((plan) => {
        const stuff_id = Number(plan.stuffId);
        if (price_map.has(stuff_id)) {
            const price = price_map.get(stuff_id);
            if (typeof plan.setDataValue === 'function') {
                plan.setDataValue('unit_price', price);
            } else {
                plan.unit_price = price;
            }
        }
    });
    return plans;
}

function get_buy_settle_price(stuff_prices, stuff_id, fallback_price) {
    const price_map = new Map();
    parse_buy_stuff_prices(stuff_prices).forEach((item) => {
        price_map.set(item.stuff_id, item.price);
    });
    const id = Number(stuff_id);
    if (price_map.has(id)) {
        return price_map.get(id);
    }
    return parseFloat(fallback_price) || 0;
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

async function group_order_by_partner_code(plans) {
    let ret = [];
    const group_map = {};

    for (let i = 0; i < (plans || []).length; i++) {
        const plan = plans[i];
        const company_id = plan && plan.company ? plan.company.id : null;
        const is_buy = !!(plan && plan.is_buy);
        const is_direct = plan.stuff.stuff_code[0] == '|';
        const inv_code = get_inv_code_from_stuff(plan.stuff.stuff_code);
        const key = `${company_id}_${is_buy ? 1 : 0}_${is_direct ? 1 : 0}_${inv_code}`;

        if (!group_map[key]) {
            group_map[key] = {
                company_id,
                is_buy,
                is_direct,
                inv_code,
                plans: [],
            };
        }
        group_map[key].plans.push(plan);
    }

    ret = Object.keys(group_map).map((k) => group_map[k]);

    return ret;
}

async function push_buy_settle(buy_groups, host_company) {
    const sq = db_opt.get_sq();
    for (let one_company_group of buy_groups) {
        let parter_code = await get_partner_code(host_company, await sq.models.company.findByPk(one_company_group.company_id));
        let enter_count = 0
        let real_count = 0;
        one_company_group.plans.forEach(plan => {
            enter_count += plan.enter_count * 1450;
            real_count += plan.count * 1450;
        });
        let body = {
            dto: {
                ExternalCode: `${one_company_group.company_id}_${parter_code}_${moment().format('YYYYMMDDHHmmss')}`,
                VoucherType: {
                    Code: "ST1001",
                },
                BusiType: {
                    Code: "01",
                },
                Partner: {
                    Code: parter_code,
                },
                Warehouse: {
                    Code: host_company.tplus_buy_inv_code,
                },
                VoucherDate: moment().format('YYYY-MM-DD'),
                RDRecordDetails: [],
                //DynamicPropertyKeys: ["pubuserdefdecm1", "pubuserdefdecm2"],
                //DynamicPropertyValues: [enter_count, real_count-enter_count],
            }
        }
        for (let plan of one_company_group.plans) {
            body.dto.RDRecordDetails.push({
                Inventory: {
                    Code: normalize_stuff_code(plan.stuff.stuff_code),
                },
                Unit: {
                    Name: '立方'
                },
                Quantity: plan.count * 1450,
                TaxRate: '0.09',
            });
        }
        try {
            let resp = await private_req2tplus(
                "POST",
                "https://openapi.chanjet.com/tplus/api/v2/purchaseReceive/Create",
                {},
                body,
                host_company
            );
            one_company_group.plans.forEach(plan => {
                plan.tplus_success = true;
                plan.execute_result = '推送成功';
            })
        } catch (e) {
            one_company_group.plans.forEach(plan => {
                plan.tplus_success = false;
                plan.execute_result = e.err_msg;
            })
        }

    }
}
function make_sale_body(sale_company, partner_code, plans, is_direct = false, inv_code = '') {
    let ret = {
        dto: {
            ExternalCode: `${sale_company.id}_${partner_code}_${moment().format('YYYYMMDDHHmmss')}`,
            VoucherType: {
                Code: is_direct ? "ST1024" : "ST1021",
            },
            BusiType: {
                Code: is_direct ? "99" : "15",
            },
            Partner: {
                Code: partner_code,
            },
            Warehouse: {
                Code: inv_code ? inv_code : sale_company.tplus_sale_inv_code,
            },
            DynamicPropertyKeys: ["pubuserdefnvc2"],
            DynamicPropertyValues: [plans[0].stuff.company.name],
            VoucherDate: moment().format('YYYY-MM-DD'),
            RDRecordDetails: [],
        }
    }
    for (let plan of plans) {
        if (is_direct) {
            ret.dto.RDRecordDetails.push({
                Inventory: {
                    Code: normalize_stuff_code(plan.stuff.stuff_code),
                },
                BaseQuantity: plan.count,
            });
        }
        else {
            ret.dto.RDRecordDetails.push({
                Inventory: {
                    Code: normalize_stuff_code(plan.stuff.stuff_code),
                },
                Unit: {
                    Name: '吨'
                },
                BaseQuantity: plan.count,
                origTaxSalePrice: plan.unit_price,
            })
        }

    }
    return ret;
}
function make_buy_body(buy_company, partner_code, plans) {
    let ret = {
        dto: {
            ExternalCode: `${buy_company.id}_${partner_code}_${moment().format('YYYYMMDDHHmmss')}`,
            VoucherType: {
                Code: "ST1001",
            },
            BusiType: {
                Code: "01",
            },
            Partner: {
                Code: partner_code,
            },
            Warehouse: {
                Code: buy_company.tplus_buy_inv_code,
            },
            VoucherDate: moment().format('YYYY-MM-DD'),
            RDRecordDetails: [],
        }
    };
    for (let plan of plans) {
        if (normalize_stuff_code(plan.stuff.stuff_code).length > 0) {
            ret.dto.RDRecordDetails.push({
                Price: plan.unit_price,
                Quantity: plan.count,
                Inventory: {
                    Code: normalize_stuff_code(plan.stuff.stuff_code),
                },
                Unit: {
                    Name: '吨'
                },
            })
        }
    }

    return ret;
}
async function push_sale_settle(sale_groups, host_company) {
    const sq = db_opt.get_sq();
    let parent_comapny = await host_company.getParent_group_company();
    let f2s_sale_pc = await get_partner_code(host_company, parent_comapny);
    let f2s_buy_pc = await get_partner_code(parent_comapny, host_company);
    for (let one_company_group of sale_groups) {
        let customer_company = await sq.models.company.findByPk(one_company_group.company_id);
        if (one_company_group.is_direct) {
            let f2c_sale_pc = await get_partner_code(host_company, customer_company);
            try {
                let resp_direct = await private_req2tplus(
                    "POST",
                    "https://openapi.chanjet.com/tplus/api/v2/otherDispatch/Create",
                    {},
                    make_sale_body(host_company, f2c_sale_pc, one_company_group.plans, true, one_company_group.inv_code),
                    host_company
                );
                one_company_group.plans.forEach(plan => {
                    plan.tplus_success = true;
                    plan.execute_result = '推送成功';
                })
            } catch (e) {
                one_company_group.plans.forEach(plan => {
                    plan.tplus_success = false;
                    plan.execute_result = e.err_msg;
                })
            }
        }
        else {
            let s2c_sale_pc = await get_partner_code(parent_comapny, customer_company);
            try {
                let first_resp = await private_req2tplus(
                    "POST",
                    "https://openapi.chanjet.com/tplus/api/v2/saleDispatch/Create",
                    {},
                    make_sale_body(host_company, f2s_sale_pc, one_company_group.plans),
                    host_company
                );
                let second_resp = await private_req2tplus(
                    "POST",
                    "https://openapi.chanjet.com/tplus/api/v2/purchaseReceive/Create",
                    {},
                    make_buy_body(parent_comapny, f2s_buy_pc, one_company_group.plans),
                    parent_comapny
                );
                let third_resp = await private_req2tplus(
                    "POST",
                    "https://openapi.chanjet.com/tplus/api/v2/saleDispatch/Create",
                    {},
                    make_sale_body(parent_comapny, s2c_sale_pc, one_company_group.plans),
                    parent_comapny
                );
                one_company_group.plans.forEach(plan => {
                    plan.tplus_success = true;
                    plan.execute_result = '推送成功';
                })
            } catch (e) {
                one_company_group.plans.forEach(plan => {
                    plan.tplus_success = false;
                    plan.execute_result = e.err_msg;
                })
            }
        }


    }
}

module.exports = {
    req2tplus: private_req2tplus,

    tplus_settle: async function (plans) {
        if (plans.length > 0) {
            let group = await group_order_by_partner_code(plans);
            let buy_groups = group.filter((g) => g.is_buy);
            let sale_groups = group.filter((g) => !g.is_buy);
            await push_buy_settle(buy_groups, plans[0].stuff.company);
            await push_sale_settle(sale_groups, plans[0].stuff.company);
        }
        return plans;
    },
    parse_buy_stuff_prices,
    stringify_buy_stuff_prices,
    get_or_create_config: async function (company) {
        let config = await company.getTplus_config();
        if (!config) {
            config = await company.createTplus_config({
                buy_settle_time: '00:00:00',
                buy_settle_cycle: 5,
                buy_stuff_prices: '[]',
                sale_settle_time: '00:00:00',
                sale_settle_cycle: 5,
            });
        }
        return config;
    },
    filter_unsettled_plans: async function (company, is_buy, options) {
        const sq = db_opt.get_sq();
        const opts = options || {};
        let stuff_ids = Array.isArray(opts.stuff_ids) ? opts.stuff_ids.filter((id) => id > 0) : [];
        if (stuff_ids.length === 0) {
            const stuff = await company.getStuff({ paranoid: false });
            if (!stuff || stuff.length === 0) {
                return [];
            }
            // 未指定物料时，仅取已配置 stuff_code 的物料（与 main 推送逻辑一致）
            stuff_ids = stuff.filter((s) => s.stuff_code).map((s) => s.id);
            if (stuff_ids.length === 0) {
                return [];
            }
        }
        const and_conditions = [
            {
                status: 3,
                manual_close: false,
                is_buy: !!is_buy,
                count: {
                    [db_opt.Op.ne]: 0,
                },
            },
            {
                [db_opt.Op.or]: stuff_ids.map((id) => ({ stuffId: id })),
            },
            // 推送成功过的计划不再推；无日志或失败可推
            sq.literal(`(select count(*) from tplus_push_log where planId = plan.id AND deletedAt is Null AND success = 1) = 0`),
        ];
        const start_date = moment().subtract(opts.cycle_days || 5, 'days').format('YYYY-MM-DD');
        and_conditions[0].plan_time = {
            [db_opt.Op.gte]: start_date,
        };
        return await sq.models.plan.findAll({
            where: {
                [db_opt.Op.and]: and_conditions,
            },
            include: util_lib.plan_detail_include(),
        });
    },
    do_settle: async function (company, is_buy, operator) {
        const config = await this.get_or_create_config(company);
        const buy_prices = parse_buy_stuff_prices(config.buy_stuff_prices);
        const filter_opts = is_buy
            ? {
                stuff_ids: buy_prices.map((item) => item.stuff_id),
                cycle_days: config.buy_settle_cycle || 5,
            }
            : { cycle_days: config.sale_settle_cycle || 5 };
        let plans = await this.filter_unsettled_plans(company, is_buy, filter_opts);
        if (is_buy) {
            plans = apply_buy_stuff_prices(plans, buy_prices);
        }
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
            const settle_unit_price = is_buy
                ? get_buy_settle_price(buy_prices, plan.stuffId, plan.unit_price)
                : (parseFloat(plan.unit_price) || 0);
            await plan.setTplus_settle_record(record);

            let push_log = await plan.getTplus_push_log();
            if (push_log) {
                push_log.push_time = settle_time;
                push_log.success = success;
                push_log.execute_result = execute_result;
                push_log.operator = op;
                push_log.unit_price = settle_unit_price;
                await push_log.save();
            } else {
                await plan.createTplus_push_log({
                    push_time: settle_time,
                    success,
                    execute_result,
                    operator: op,
                    unit_price: settle_unit_price,
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
                // 采购仅支持手动结算，不走定时任务
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
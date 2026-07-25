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
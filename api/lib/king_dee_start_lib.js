const king_dee_sdk = require('./king_dee_sdk');
const moment = require('moment');
const crypto = require('crypto');
async function req_to_king_dee_start(king_dee_start_config, api_path, method, data, headers) {
    let ret = {};
    let kds = new king_dee_sdk.ApigwClient(king_dee_start_config.clientId, king_dee_start_config.clientSecret);
    let req = {
        url: api_path,
        method: method,
    }
    if (method == "GET") {
        req.params = data;
    }
    else if (method == "POST") {
        req.data = data;
    }
    if (headers) {
        req.headers = headers;
    }
    let resp = await kds.request(req);
    ret = resp.data;
    if (ret.errcode && ret.errcode != 0) {
        throw new Error('king_dee_start_api_error:' + ret.description);
    }
    ret = ret.data;
    return ret;
}
async function req_to_king_dee_start_full(king_dee_start_config, api_path, method, data) {
    let resp = await req_to_king_dee_start(king_dee_start_config,
        "https://api.kingdee.com/jdyconnector/app_management/push_app_authorize",
        "POST",
        {
            outerInstanceId: king_dee_start_config.outer_instance_id,
        },
    )
    let auth_info = resp.find((item) => item.appKey == king_dee_start_config.app_key);
    let app_key = king_dee_start_config.app_key;
    let app_secret = auth_info.appSecret;
    let hmacHex = crypto.createHmac('sha256', app_secret).update(app_key).digest('hex');
    let app_signature = Buffer.from(hmacHex, 'utf8').toString('base64');
    resp = await req_to_king_dee_start(king_dee_start_config,
        "https://api.kingdee.com/jdyconnector/app_management/kingdee_auth_token",
        "GET",
        {
            app_key: app_key,
            app_signature: app_signature,
        });
    let app_token = resp["app-token"];
    let domain = auth_info.domain;

    resp = await req_to_king_dee_start(king_dee_start_config,
        api_path,
        method,
        data,
        {
            'app-token': app_token,
            'X-GW-Router-Addr': domain,
        }
    )
    return resp;

}
module.exports = {
    sale_out: async function (customer_id, stuff, unit_price, count) {
        let king_dee_start_config = await stuff.getKing_dee_start_config();
        let resp = await req_to_king_dee_start_full(king_dee_start_config,
            "https://api.kingdee.com/jdy/v2/scm/sal_out_bound",
            "POST",
            {
                bill_date: moment().format('YYYY-MM-DD'),
                customer_number: customer_id,
                emp_number: king_dee_start_config.emp_number,
                material_entity: [{
                    material_number: stuff.stuff_code,
                    tax_price: unit_price,
                    qty: count,
                    stock_number: king_dee_start_config.stock_id,
                    unit_number: king_dee_start_config.unit_id,
                    cess: king_dee_start_config.cess || 0,
                }],
            });
        let ticket_code = resp.id_number_map[resp.ids[0]]
        resp = await req_to_king_dee_start_full(king_dee_start_config,
            "https://api.kingdee.com/jdy/v2/sys/common_operate",
            "POST",
            {
                entity_number: "sal_bill_outbound",
                ids: resp.ids,
                operate_type: "audit",
            },
        );
        return ticket_code;
    },
    get_pre_credit: async function (king_dee_start_config) {
        let resp = await req_to_king_dee_start_full(king_dee_start_config,
            "https://api.kingdee.com/jdy/v2/arap/ar_pre_credit",
            "GET",
            {
                bill_status:"C",
                create_start_time: king_dee_start_config.last_check_timestamp,
                page_size:100,
            });
        king_dee_start_config.last_check_timestamp = Date.now().toString();
        await king_dee_start_config.save();
        let rows = resp.rows || [];
        let ret = [];
        for (let row of rows) {
            let customer_code = row.customer_id;
            let amount = row.total_amount;
            ret.push({
                customer_code: customer_code,
                amount: amount,
            });
        }
        return ret;
    },
}
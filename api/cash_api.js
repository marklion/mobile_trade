const mkapi = require('./api_utils');
const cash_lib = require('./lib/cash_lib');
function install(app) {
    mkapi('/contract/charge', 'cash', true, true, {
        contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
        cash_increased: { type: Number, have_to: false, mean: '增加金额', example: 100 },
        comment: { type: String, have_to: false, mean: '备注', example: '充值100元' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '充值', '充值').add_handler(async (body, token) => {
        await cash_lib.charge(token, body.contract_id, body.cash_increased, body.comment);
        return { result: true };
    }).install(app);
    mkapi('/contract/get_self_history', 'customer', false, true, {
        contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
    }, {
        histories: {
            type: Array, mean: '历史记录', explain: {
                time: { type: String, mean: '时间', example: '2020-03-01 12:00:00' },
                operator: { type: String, mean: '操作人', example: '张三' },
                comment: { type: String, mean: '备注', example: '充值100元' },
                cash_increased: { type: Number, mean: '增加金额', example: 100 },
            }
        }
    }, '获取自己的充值记录', '获取自己的充值记录', true).add_handler(async (body, token) => {
        let get_ret = await cash_lib.get_history_by_company(token, body.contract_id, body.pageNo);
        return {
            histories: get_ret.rows,
            total: get_ret.count,
        }
    }).install(app);
    mkapi('/contract/get_company_history', 'cash', false, true, {
        contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
    }, {
        histories: {
            type: Array, mean: '历史记录', explain: {
                time: { type: String, mean: '时间', example: '2020-03-01 12:00:00' },
                operator: { type: String, mean: '操作人', example: '张三' },
                comment: { type: String, mean: '备注', example: '充值100元' },
                cash_increased: { type: Number, mean: '增加金额', example: 100 },
            }
        }
    }, '获取客户的充值记录', '获取客户的充值记录', true).add_handler(async (body, token) => {
        let get_ret = await cash_lib.get_history_by_company(token, body.contract_id, body.pageNo);
        return {
            histories: get_ret.rows,
            total: get_ret.count,
        }
    }).install(app);
}

module.exports = install;
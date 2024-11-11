const cash_lib = require('../lib/cash_lib');
const common = require('./common');
module.exports = {
    name: 'cash',
    description: '余额管理',
    methods: {
        charge: {
            name: '充值',
            description: '充值',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
                cash_increased: { type: Number, have_to: false, mean: '增加金额', example: 100 },
                comment: { type: String, have_to: false, mean: '备注', example: '充值100元' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await cash_lib.charge(token, body.contract_id, body.cash_increased, body.comment);
                return { result: true };
            },
        },
        history: {
            name: '获取客户的充值记录',
            description: '获取客户的充值记录',

            is_write: false,
            is_get_api: true,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                begin_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01' },
            },
            result: {
                histories: {
                    type: Array, mean: '历史记录', explain: {
                        time: { type: String, mean: '时间', example: '2020-03-01 12:00:00' },
                        operator: { type: String, mean: '操作人', example: '张三' },
                        comment: { type: String, mean: '备注', example: '充值100元' },
                        cash_increased: { type: Number, mean: '增加金额', example: 100 },
                    }
                }
            },
            func: async function (body, token) {
                let get_ret = await cash_lib.get_history_by_company(token, body.contract_id, body.pageNo, body.begin_time, body.end_time);
                return {
                    histories: get_ret.rows,
                    total: get_ret.count,
                }
            },
        },
        export_history:{
            name: '导出充值记录',
            description: '导出充值记录',
            is_write: false,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                begin_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await common.do_export_later(token, '余额明细', async ()=>{
                    return await cash_lib.export_cash_history(token, body.contract_id, body.begin_time, body.end_time);
                });
            },
        },
    }
}
const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const bidding_lib = require('../lib/bidding_lib');
const db_opt = require('../db_opt');
const common = require('./common')
module.exports = {
    name: 'bid',
    description: '竞价管理',
    methods: {
        create: {
            name: '创建竞价',
            description: '创建竞价',

            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                total: { type: Number, have_to: true, mean: '总量', example: 100 },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                min: { type: Number, have_to: true, mean: '最小价格', example: 1 },
                max: { type: Number, have_to: true, mean: '最大价格', example: 100 },
                total_turn: { type: Number, have_to: true, mean: '总轮次', example: 10 },
                pay_first: { type: Number, have_to: true, mean: '押金额度', example: 123 },
            },
            result: api_param_result_define.bc_detail(),
            func: async function (body, token) {
                return await bidding_lib.create_bidding(body.stuff_id, body.total, body.comment, body.min, body.max, body.total_turn, body.pay_first, token);
            },
        },
        get_all_created: {
            name: '获取所有创建的竞价',
            description: '获取所有创建的竞价',

            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                biddings: { type: Array, mean: '竞价列表', explain: api_param_result_define.bc_detail(true) },
            },
            func: async function (body, token) {
                return await bidding_lib.get_all_created_bidding(token, body.pageNo);
            },
        },
        add_turn: {
            name: '添加竞价轮次',
            description: '添加竞价轮次',

            is_write: true,
            is_get_api: false,
            params: {
                bc_id: { type: Number, have_to: true, mean: '竞价ID', example: 1 },
                joiner_ids: {
                    type: Array, have_to: true, mean: '参与者ID', explain: {
                        id: { type: Number, have_to: true, mean: 'ID', example: 1 },
                    }
                },
                begin_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 00:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 00:00:00' },
            },
            result: {
                id: { type: Number, mean: '竞价轮次ID', example: 1 },
                end_time: { type: String, mean: '结束时间', example: '2020-01-01 00:00:00' },
            },
            func: async function (body, token) {
                return await bidding_lib.add_bid_turn(body.bc_id, body.joiner_ids, body.begin_time, body.end_time, token);
            },
        },
        next_turn: {
            name: '开启下一轮竞价',
            description: '开启下一轮竞价',

            is_write: true,
            is_get_api: false,
            params: {
                bc_id: { type: Number, have_to: true, mean: '竞价ID', example: 1 },
                top_n: { type: Number, have_to: true, mean: '前N名', example: 3 },
                begin_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 00:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 00:00:00' },
            },
            result: {
                result: { type: Boolean, mean: '是否成功', example: true },
            },
            func: async function (body, token) {
                await bidding_lib.go_next_turn(body.bc_id, body.top_n, body.begin_time, body.end_time, token);
                return { result: true };
            },
        },
        stop: {
            name: '结束竞价',
            description: '结束竞价',

            is_write: true,
            is_get_api: false,
            params: {
                bc_id: { type: Number, have_to: true, mean: '竞价ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '是否成功', example: true },
            },
            func: async function (body, token) {
                await bidding_lib.stop_bidding(body.bc_id, token);
                return { result: true };
            },
        },
        export_bc:{
            name:'导出竞价结果',
            description:'导出竞价结果',
            is_write: false,
            is_get_api: false,
            params:{
                bc_id: { type: Number, have_to: true, mean: '竞价ID', example: 1 },
            },
            result:{
                result: { type: Boolean, mean: '是否成功', example: true },
            },
            func: async function (body, token) {
                return await common.do_export_later(token, '竞价结果导出', async () => {
                    return await bidding_lib.make_export_bidding_file(body.bc_id)
                })
            },
        },
    }
}
const mkapi = require('./api_utils');
const db_opt = require('./db_opt');
const bidding_lib = require('./bidding_lib');

function make_bc_detail(need_turn = false) {
    let bidding_config = {
        id: { type: Number, mean: '竞价ID', example: 1 },
        stuff: {
            type: Object, mean: '货物', explain: {
                id: { type: Number, mean: 'ID', example: 1 },
                name: { type: String, mean: '名称', example: '货物名称' },
            }
        },
        total: { type: Number, mean: '总量', example: 100 },
        comment: { type: String, mean: '备注', example: '备注' },
        begin_time: { type: String, mean: '开始时间', example: '2020-01-01 00:00:00' },
        min: { type: Number, mean: '最小价格', example: 1 },
        max: { type: Number, mean: '最大价格', example: 100 },
        total_turn: { type: Number, mean: '总轮次', example: 10 },
        pay_first: { type: Number, mean: '押金额度', example: 123 },
        status: { type: Number, mean: '状态', example: 0 },
    }
    if (need_turn) {
        bidding_config.bidding_turns = {
            type: Array, mean: '竞价轮次', explain: {
                id: { type: Number, mean: 'ID', example: 1 },
                end_time: { type: String, mean: '结束时间', example: '2020-01-01 00:00:00' },
                turn: { type: Number, mean: '轮次', example: 1 },
                finish: { type: Boolean, mean: '是否结束', example: true },
                bidding_items: {
                    type: Array, mean: '出价列表', explain: {
                        id: { type: Number, mean: '出价ID', example: 1 },
                        price: { type: Number, mean: '价格', example: 100 },
                        accept: { type: Boolean, mean: '是否接受', example: true },
                        rbac_user: {
                            type: Object, mean: '出价人', explain: {
                                id: { type: Number, mean: '出价人ID', example: 1 },
                                name: { type: String, mean: '姓名', example: '张三' },
                                company: {
                                    type: Object, mean: '出价人所在公司', explain: {
                                        id: { type: Number, mean: '公司ID', example: 1 },
                                        name: { type: String, mean: '名称', example: '张三的公司' },
                                    }
                                },
                            }
                        },
                    }
                }
            }
        };
    }

    return bidding_config;
}


function install(app) {
    mkapi('/bidding/create', 'bid', true, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        total: { type: Number, have_to: true, mean: '总量', example: 100 },
        comment: { type: String, have_to: false, mean: '备注', example: '备注' },
        begin_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 00:00:00' },
        min: { type: Number, have_to: true, mean: '最小价格', example: 1 },
        max: { type: Number, have_to: true, mean: '最大价格', example: 100 },
        total_turn: { type: Number, have_to: true, mean: '总轮次', example: 10 },
        pay_first: { type: Number, have_to: true, mean: '押金额度', example: 123 },
    }, make_bc_detail(), '创建竞价', '创建竞价').add_handler(async (body, token) => {
        return await bidding_lib.create_bidding(body.stuff_id, body.total, body.comment, body.begin_time, body.min, body.max, body.total_turn, body.pay_first, token);
    }).install(app);
    mkapi('/bidding/get_all_created', 'bid', false, true, {}, {
        biddings: { type: Array, mean: '竞价列表', explain: make_bc_detail(true)},
    }, '获取所有创建的竞价', '获取所有创建的竞价', true).add_handler(async (body, token) => {
        return await bidding_lib.get_all_created_bidding(token, body.pageNo);
    }).install(app);
    mkapi('/bidding/add_turn', 'bid', true, true, {
        bc_id: { type: Number, have_to: true, mean: '竞价ID', example: 1 },
        joiner_ids: {
            type: Array, have_to: true, mean: '参与者ID', explain: {
                id: { type: Number, have_to: true, mean: 'ID', example: 1 },
            }
        },
        end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 00:00:00' },
    }, {
        id: { type: Number, mean: '竞价轮次ID', example: 1 },
        end_time: { type: String, mean: '结束时间', example: '2020-01-01 00:00:00' },
    }, '新增竞价轮次', '新增竞价轮次').add_handler(async (body, token) => {
        return await bidding_lib.add_bid_turn(body.bc_id, body.joiner_ids, body.end_time, token);
    }).install(app);
    mkapi('/bidding/get_all_joined', 'customer', false, true, {}, {
        items: {
            type: Array, mean: '出价列表', explain: {
                id: { type: Number, mean: '出价ID', example: 1 },
                price: { type: Number, mean: '价格', example: 100 },
                accept: { type: Boolean, mean: '是否接受', example: true },
                bidding_turn: {
                    type: Object, mean: '竞价轮次', explain: {
                        id: { type: Number, mean: 'ID', example: 1 },
                        end_time: { type: String, mean: '结束时间', example: '2020-01-01 00:00:00' },
                        turn: { type: Number, mean: '轮次', example: 1 },
                        finish: { type: Boolean, mean: '是否结束', example: true },
                        bidding_config: { type: Object, mean: '竞价配置', explain: make_bc_detail()},
                    }
                },
            }
        },
    }, '获取所有参与的竞价', '获取所有参与的竞价', true).add_handler(async (body, token) => {
        return await bidding_lib.get_all_joined_bidding(token, body.pageNo);
    }).install(app);
}

module.exports = install;
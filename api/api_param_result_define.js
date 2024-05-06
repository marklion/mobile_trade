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
                begin_time: { type: String, mean: '开始时间', example: '2020-01-01 00:00:00' },
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
const sc_req_detail = {
    id: { type: Number, have_to: true, mean: 'ID', example: 1 },
    name: { type: String, have_to: true, mean: '需求名称', example: '安检需求' },
    need_attach: { type: Boolean, have_to: true, mean: '是否需要附件', example: true },
    need_input: { type: Boolean, have_to: true, mean: '是否需要输入', example: true },
    need_expired: { type: Boolean, have_to: true, mean: '是否需要过期时间', example: true },
    belong_type: { type: Number, have_to: true, mean: '所属类型,0->司乘,1->主车,2->挂车', example: 0 },
    prompt: { type: String, have_to: false, mean: '提示', example: '请输入' },
    sc_content: {
        type: Object, have_to: false, mean: '安检内容', explain: {
            id: { type: Number, have_to: true, mean: 'ID', example: 1 },
            expired_time: { type: String, have_to: true, mean: '过期时间', example: '2020-01-01 00:00:00' },
            attachment: { type: String, have_to: true, mean: '附件', example: 'http://www.baidu.com' },
            input: { type: String, have_to: true, mean: '输入', example: '请输入' },
            passed: { type: Boolean, have_to: true, mean: '是否通过', example: true },
            checker: { type: String, have_to: true, mean: '检查人', example: '张三' },
            comment: { type: String, have_to: false, mean: '备注', example: '备注' },
            check_time: { type: String, have_to: false, mean: '检查时间', example: '2020-01-01 00:00:00' }
        }
    },
};
module.exports = {
    bc_detail:make_bc_detail,
    order_search_cond: {
        start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
        status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
        stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
        company_id: { type: Number, have_to: false, mean: '公司ID', example: 1 },
        hide_manual_close: { type: Boolean, have_to: false, mean: '隐藏手动关闭', example: true },
    },
    sc_req_detail: sc_req_detail,
    plan_detail_define: {
        id: { type: Number, mean: '计划ID', example: 1 },
        plan_time: { type: String, mean: '计划时间', example: '2020-01-01 12:00:00' },
        unit_price: { type: Number, mean: '单价', example: 1 },
        status: { type: Number, mean: '状态', example: 1 },
        comment: { type: String, mean: '备注', example: '备注' },
        from_bidding: { type: Boolean, mean: '是否来自竞价', example: true },
        count: { type: Number, mean: '数量', example: 1 },
        p_weight: { type: Number, mean: '皮重', example: 1 },
        m_weight: { type: Number, mean: '毛重', example: 1 },
        p_time: { type: String, mean: '皮重时间', example: '2020-01-01 12:00:00' },
        m_time: { type: String, mean: '毛重时间', example: '2020-01-01 12:00:00' },
        use_for: { type: String, mean: '用途', example: '用途' },
        drop_address: { type: String, mean: '卸货地址', example: '卸货地址' },
        register_time: { type: String, mean: '登记时间', example: '2020-01-01 12:00:00' },
        register_number: { type: Number, mean: '登记号', example: 1 },
        register_comment: { type: String, mean: '登记备注', example: '登记备注' },
        call_time: { type: String, mean: '叫车时间', example: '2020-01-01 12:00:00' },
        enter_time: { type: String, mean: '进场时间', example: '2020-01-01 12:00:00' },
        manual_close: { type: Boolean, mean: '手动关闭', example: true },
        rbac_user: {
            type: Object, mean: '创建人', explain: {
                id: { type: Number, mean: '用户ID', example: 1 },
                name: { type: String, mean: '用户姓名', example: '用户姓名' },
                phone: { type: String, mean: '用户电话', example: '用户电话' },
            }
        },
        stuff: {
            type: Object, mean: '货物', explain: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                company: {
                    type: Object, mean: '购买公司', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名称', example: '公司名称' },
                    }
                },
            }
        },
        company: {
            type: Object, mean: '购买公司', explain: {
                id: { type: Number, mean: '公司ID', example: 1 },
                name: { type: String, mean: '公司名称', example: '公司名称' },
            }
        },
        driver: {
            type: Object, mean: '司机', explain: {
                id: { type: Number, mean: '司机ID', example: 1 },
                name: { type: String, mean: '司机名称', example: '司机名称' },
                phone: { type: String, mean: '司机电话', example: '司机电话' },
                id_card: { type: String, mean: '司机身份证', example: '司机身份证' },
                open_id: { type: String, mean: '司机open_id', example: '司机open_id' },
            }
        },
        main_vehicle: {
            type: Object, mean: '主车', explain: {
                id: { type: Number, mean: '车辆ID', example: 1 },
                plate: { type: String, mean: '车牌', example: '车牌' },
            }
        },
        behind_vehicle: {
            type: Object, mean: '挂车', explain: {
                id: { type: Number, mean: '车辆ID', example: 1 },
                plate: { type: String, mean: '车牌', example: '车牌' },
            }
        },
        plan_histories: {
            type: Array, mean: '操作历史', explain: {
                id: { type: Number, mean: '历史ID', example: 1 },
                time: { type: String, mean: '历史时间', example: '2020-01-01 12:00:00' },
                operator: { type: String, mean: '操作人', example: '操作人' },
                action_type: { type: String, mean: '操作', example: '操作' },
            }
        },
        sc_info: {
            type: Array, mean: '安检信息', explain: sc_req_detail
        },
    },

    bidding_items: {
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
                        bidding_config: { type: Object, mean: '竞价配置', explain: make_bc_detail() },
                    }
                },
            }
        }
    },
}
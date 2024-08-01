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
                        time: { type: String, mean: '出价时间', example: '2020-01-01 00:00:00' },
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

const exam_paper_info = {
    id: { type: Number, mean: 'ID', example: 1 },
    name: { type: String, mean: '试卷', example: '试卷' },
    questions: {
        type: Array, mean: '题目', explain: {
            id: { type: Number, mean: 'ID', example: 1 },
            name: { type: String, mean: '题目', example: '题目' },
            option_answers: {
                type: Array, mean: '选项', explain: {
                    id: { type: Number, mean: 'ID', example: 1 },
                    name: { type: String, mean: '选项', example: '选项' },
                    is_correct: { type: Boolean, mean: '是否正确', example: true },
                }
            },
        }
    },
};

module.exports = {
    exam_paper_info: exam_paper_info,
    exam_info: {
        id: { type: Number, mean: 'ID', example: 1 },
        name: { type: String, mean: '考试名称', example: '考试名称' },
        score: { type: Number, mean: '分数', example: 100 },
        exam_paper: { type: Object, mean: '试卷', explain: exam_paper_info },
        exam_answers: {
            type: Array, mean: '答案', explain: {
                id: { type: Number, mean: 'ID', example: 1 },
                option_answer: {
                    type: Object, mean: '选项', explain: {
                        id: { type: Number, mean: 'ID', example: 1 },
                        name: { type: String, mean: '选项', example: '选项' },
                        is_correct: { type: Boolean, mean: '是否正确', example: true },
                    },
                }
            },
        },
    },
    driver_info: {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        open_id: { type: String, mean: '微信open_id', example: 'open_id' },
    },
    ticket_content: {
        id: { type: Number, mean: 'ID', example: 1 },
        company_name: { type: String, mean: '公司名', example: 'company_example' },
        order_company_name: { type: String, mean: '下单公司名', example: 'order_company_example' },
        plate: { type: String, mean: '车牌', example: 'plate_example' },
        behind_plate: { type: String, mean: '挂车牌', example: 'behind_plate_example' },
        ticket_no: { type: String, mean: '磅单号', example: 'ticket_no_example' },
        m_weight: { type: Number, mean: '毛重', example: 1 },
        m_time: { type: String, mean: '毛重时间', example: '2020-01-01 12:00:00' },
        p_weight: { type: Number, mean: '皮重', example: 1 },
        p_time: { type: String, mean: '皮重时间', example: '2020-01-01 12:00:00' },
        count: { type: Number, mean: '装车量', example: 1 },
        seal_no: { type: String, mean: '封条号', example: 'seal_no_example' },
        stamp_path: { type: String, mean: '印章路径', example: 'stamp_path_example' },
        is_buy: { type: Boolean, mean: '是否购买', example: true },
        trans_company_name: { type: String, mean: '运输公司名', example: '' },
        stuff_name: { type: String, mean: '货物名', example: 'stuff_name_example' },
    },
    device_status_define: {
        name: { type: String, mean: '设备名称', example: '设备名称' },
        enter_gate: { type: Boolean, mean: '进门状态', example: true },
        exit_gate: { type: Boolean, mean: '出门状态', example: true },
        scale_status: { type: String, mean: '称重状态', example: 'abc' },
        cur_weight: { type: String, mean: '当前重量', example: '23.12' },
    },
    bc_detail: make_bc_detail,
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
        is_buy: { type: Boolean, mean: '是否是采购单', example: true },
        seal_no: { type: String, mean: '封号', example: '封号' },
        ticket_no: { type: String, mean: '票号', example: '票号' },
        trans_company_name: { type: String, mean: '运输公司名称', example: '运输公司名称' },
        need_sc: { type: Boolean, mean: '是否需要安检', example: true },
        need_enter_weight: { type: Boolean, mean: '是否需要进场称重', example: true },
        need_exam: { type: Boolean, mean: '是否需要考试', example: true },
        confirmed: { type: Boolean, mean: '是否确认装卸货', example: true },
        is_proxy: { type: Boolean, mean: '是否代理', example: true },
        is_repeat: { type: Boolean, mean: '是否多次进厂', example: true },
        rbac_user: {
            type: Object, mean: '创建人', explain: {
                id: { type: Number, mean: '用户ID', example: 1 },
                name: { type: String, mean: '用户姓名', example: '用户姓名' },
                phone: { type: String, mean: '用户电话', example: '用户电话' },
            }
        },
        enter_count: { type: Number, mean: '进场重量', example: 1 },
        enter_attachment: { type: String, mean: '进场附件', example: '进场附件' },
        stuff: {
            type: Object, mean: '货物', explain: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                company: {
                    type: Object, mean: '购买公司', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名称', example: '公司名称' },
                        driver_notice: { type: String, mean: '司机通知', example: '司机通知' },
                    }
                },
                need_sc: { type: Boolean, mean: '是否需要安检', example: true },
                need_enter_weight: { type: Boolean, mean: '是否需要进场称重', example: true },
                no_need_register: { type: Boolean, mean: '不需要登记', example: true },
                need_exam: { type: Boolean, mean: '是否需要考试', example: true },
            }
        },
        company: {
            type: Object, mean: '购买公司', explain: {
                id: { type: Number, mean: '公司ID', example: 1 },
                name: { type: String, mean: '公司名称', example: '公司名称' },
                driver_notice: { type: String, mean: '司机通知', example: '司机通知' },
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
                time: { type: String, mean: '出价时间', example: '2020-01-01 00:00:00' },
                bidding_turn: {
                    type: Object, mean: '竞价轮次', explain: {
                        id: { type: Number, mean: 'ID', example: 1 },
                        begin_time: { type: String, mean: '开始时间', example: '2020-01-01 00:00:00' },
                        end_time: { type: String, mean: '结束时间', example: '2020-01-01 00:00:00' },
                        turn: { type: Number, mean: '轮次', example: 1 },
                        finish: { type: Boolean, mean: '是否结束', example: true },
                        bidding_config: { type: Object, mean: '竞价配置', explain: make_bc_detail() },
                    }
                },
            }
        }
    },
    dev_data: {
        third_key: { type: String, have_to: false, mean: '货达key', example: 'third_key_example' },
        third_url: { type: String, have_to: false, mean: '货达url', example: 'third_url_example' },
        third_token: { type: String, have_to: false, mean: '货达token', example: 'third_token_example' },
        zc_url: { type: String, have_to: false, mean: '卓创url', example: 'zc_url_example' },
        zc_rpc_url: { type: String, have_to: false, mean: '卓创rpc_url', example: 'zc_rpc_url_example' },
        zh_ssid: { type: String, have_to: false, mean: '卓创旧系统ssid', example: 'zh_ssid_example' },
        event_types: { type: String, have_to: false, mean: '事件类型', example: 'event_types_example' },
        remote_event_url: { type: String, have_to: false, mean: '远程事件url', example: 'remote_event_url_example' },
        zczh_back_end: { type: String, have_to: false, mean: '卓创账户后端', example: 'zczh_back_end_example' },
        zczh_back_token: { type: String, have_to: false, mean: '卓创账户后端token', example: 'zczh_back_token_example' },
        zc_phone: { type: String, have_to: false, mean: '卓创电话', example: 'zc_phone_example' },
    },
}
<template>
<view class="stuff-page" :class="{ 'has-fab': cur_seg == 0, 'has-bl-bar': cur_seg == 2, 'page-scroll': cur_seg !== 0 }">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-top">
            <view class="hero-copy">
                <text class="hero-hello">物料管理</text>
                <text class="hero-sub">{{ current_seg_name || '物料与策略' }}</text>
            </view>
        </view>
    </view>

    <view class="body">
        <view class="filter-shell">
            <view class="seg-wrap">
                <fui-segmented-control :values="seg_list" :current="cur_seg" color="#465CFF" @click="seg_change"></fui-segmented-control>
            </view>
            <view class="meta-card" v-if="cur_seg == 0 && show_scope_switch">
                <view class="meta-row" @click="open_scope_picker">
                    <view class="meta-left">
                        <view class="meta-icon">
                            <fui-icon name="community" size="30" color="#465CFF"></fui-icon>
                        </view>
                        <view class="meta-copy">
                            <text class="meta-label">操作主体公司</text>
                            <text class="meta-value">{{ current_scope_name || '请选择公司' }}</text>
                        </view>
                    </view>
                    <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                </view>
            </view>
        </view>

        <view class="list-shell list-shell-fill" v-if="cur_seg == 0">
            <view class="section-head section-head-stack">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">物料列表</text>
                        <text class="section-en">MATERIALS</text>
                    </view>
                </view>
                <view class="section-search">
                    <view class="section-search-box">
                        <label class="section-search-label" for="stuff-list-search">搜索</label>
                        <fui-icon name="search" size="28" color="#8A94A6"></fui-icon>
                        <input class="section-search-input" type="text" confirm-type="search"
                            id="stuff-list-search" name="stuff-list-search"
                            placeholder="请输入搜索关键词" placeholder-class="section-search-ph"
                            :value="stuff_search_input" @input="on_stuff_search_input"
                            @confirm="on_stuff_search_confirm" />
                        <fui-icon v-if="stuff_search_input" name="close" size="26" color="#C5CAD5"
                            @click="clear_stuff_search"></fui-icon>
                        <view class="section-search-btn" @tap.stop="on_stuff_search_confirm">
                            <text class="section-search-btn-text">搜索</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="list-fill">
                <list-show :key="'stuff-' + (stat_context_company_id || 'default')" ref="stuff_ref" v-model="data2show2"
                    :fetch_function="get_all_stuff" :fetch_params="[stat_context_company_id]" search_key="name"
                    :hide_search="true" height="100%">
                <view class="stuff-card" v-for="(item, s_index) in data2show2" :key="item.id || s_index">
                    <view class="card-head">
                        <view class="card-head-left">
                            <view class="title-line">
                                <text class="stuff-title">{{ item.name }}</text>
                                <text class="status-pill st-buy" v-if="item.use_for_buy">采购</text>
                                <text class="status-pill st-sale" v-else>销售</text>
                                <text class="status-pill st-fapiao" v-if="item.concern_fapiao">发票</text>
                            </view>
                            <view class="meta-line" v-if="item.comment">
                                <text class="meta-line-text">{{ item.comment }}</text>
                            </view>
                            <view class="meta-line" v-if="item.expect_count">
                                <text class="meta-line-text">期望装载 {{ item.expect_count }}</text>
                            </view>
                        </view>
                        <view class="price-box">
                            <text class="price-label">单价（元）</text>
                            <text class="price-text">{{ format_price(item.price) }}</text>
                        </view>
                    </view>

                    <view class="chip-row" v-if="has_stuff_chips(item)">
                        <text class="chip soft" v-if="item.close_time">关闭 {{ item.close_time }}（{{ item.close_today ? '当日' : '前日' }}）</text>
                        <text class="chip soft warn" v-if="item.delay_days">允许迟到 {{ item.delay_days }} 天</text>
                        <text class="chip soft purple" v-if="item.change_last_minutes">{{ next_price_show(item) }}</text>
                    </view>

                    <view class="action-bar">
                        <view class="action-grid">
                            <view class="action-cell">
                                <view class="action-btn purple" :data-sindex="s_index" @click="on_card_update">
                                    <text class="action-btn-text">修改</text>
                                </view>
                            </view>
                            <view class="action-cell">
                                <view class="action-btn danger" :data-sindex="s_index" @click="on_card_delete">
                                    <text class="action-btn-text">删除</text>
                                </view>
                            </view>
                            <view class="action-cell">
                                <view class="action-btn warn" :data-sindex="s_index" @click="on_card_change_price">
                                    <text class="action-btn-text">调价</text>
                                </view>
                            </view>
                            <view class="action-cell">
                                <view class="action-btn primary" :data-sindex="s_index" @click="on_card_history">
                                    <text class="action-btn-text">调价历史</text>
                                </view>
                            </view>
                            <view class="action-cell" v-if="!item.change_last_minutes">
                                <view class="action-btn success" :data-sindex="s_index" @click="on_card_next_price">
                                    <text class="action-btn-text">定时调价</text>
                                </view>
                            </view>
                            <view class="action-cell" v-else>
                                <view class="action-btn success" :data-sindex="s_index" @click="on_card_cancel_next_price">
                                    <text class="action-btn-text">取消定时</text>
                                </view>
                            </view>
                            <view class="action-cell">
                                <view class="action-btn primary" :data-sindex="s_index" @click="on_card_toggle_expand">
                                    <text class="action-btn-text">{{ is_expanded(item.id) ? '收起配置' : '展开配置' }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <view class="config-panel" v-if="is_expanded(item.id)">
                        <view class="config-section">
                            <view class="config-section-head">
                                <view class="config-section-bar"></view>
                                <text class="config-section-title">业务开关</text>
                            </view>
                            <view class="switch-grid">
                                <view class="switch-item">
                                    <text class="switch-label">需要安检</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.need_sc" @change="change_need_sc($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">进厂前重量</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.need_enter_weight" @change="change_need_enter_weight($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">需要考试</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.need_exam" @change="change_need_exam($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">不用排号</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.no_need_register" @change="change_no_need_register($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">延迟结算</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.checkout_delay" @change="change_checkout_delay($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">手动计量</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.manual_weight" @change="change_manual_weight($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">期望重量</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.need_expect_weight" @change="change_need_expect_weight($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">自动确认装卸</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.auto_confirm_goods" @change="change_auto_confirm_goods($event, item)"></fui-switch>
                                </view>
                                <view class="switch-item">
                                    <text class="switch-label">司机签名</text>
                                    <fui-switch :scaleRatio="0.65" :checked="item.need_driver_sign" @change="change_need_driver_sign($event, item)"></fui-switch>
                                </view>
                            </view>
                        </view>

                        <view class="config-section" v-if="item.manual_weight">
                            <view class="config-section-head">
                                <view class="config-section-bar"></view>
                                <text class="config-section-title">磅单号前缀</text>
                            </view>
                            <view class="field-card">
                                <view class="field-row">
                                    <fui-input v-model="item.ticket_prefix" placeholder="请输入磅单号前缀" background="transparent" :padding="['0', '0']"></fui-input>
                                    <view class="field-btn" :data-sindex="s_index" @click="on_save_ticket_prefix">
                                        <text class="field-btn-text">保存</text>
                                    </view>
                                </view>
                            </view>
                        </view>

                        <view class="config-section">
                            <view class="config-section-head">
                                <view class="config-section-bar"></view>
                                <text class="config-section-title">延迟结算</text>
                            </view>
                            <view class="field-card">
                                <view class="field-row">
                                    <view class="field-pick" :data-sindex="s_index" @click="on_open_delay_picker">
                                        <text class="field-pick-label">结算时间点</text>
                                        <text class="field-pick-value" :class="{ placeholder: !item.delay_checkout_time }">
                                            {{ item.delay_checkout_time || '请选择时间' }}
                                        </text>
                                    </view>
                                    <view class="field-btn success" :data-sindex="s_index" @click="on_batch_checkout">
                                        <text class="field-btn-text">一键结算</text>
                                    </view>
                                </view>
                            </view>
                            <fui-date-picker :scaleRatio="0.7" :value="item.delay_checkout_time" type="7"
                                :show="showDelayCheckoutPicker === item.id"
                                @change="on_confirm_delay_time"
                                @cancel="showDelayCheckoutPicker = null" />
                        </view>

                        <view class="config-section">
                            <view class="config-section-head">
                                <view class="config-section-bar"></view>
                                <text class="config-section-title">第二单位</text>
                            </view>
                            <view class="field-card">
                                <view class="unit-grid">
                                    <view class="unit-cell">
                                        <text class="unit-caption">单位</text>
                                        <fui-input v-model="item.second_unit" placeholder="如吨" background="#F7F8FC" :padding="['12rpx', '16rpx']"></fui-input>
                                    </view>
                                    <view class="unit-cell">
                                        <text class="unit-caption">系数</text>
                                        <view class="unit-number">
                                            <fui-input-number v-model="item.coefficient" :digit="2" :step="0.1" :value="1.00" :min="0" :max="999999"></fui-input-number>
                                        </view>
                                    </view>
                                    <view class="unit-cell">
                                        <text class="unit-caption">小数位</text>
                                        <view class="unit-number">
                                            <fui-input-number v-model="item.second_unit_decimal" :digit="0" :step="1" :value="2" :min="0" :max="6"></fui-input-number>
                                        </view>
                                    </view>
                                </view>
                                <view class="field-save" :data-sindex="s_index" @click="on_save_unit_config">
                                    <text class="field-save-text">保存第二单位配置</text>
                                </view>
                            </view>
                        </view>

                        <view class="config-section">
                            <view class="config-section-head">
                                <view class="config-section-bar"></view>
                                <text class="config-section-title">装卸区域</text>
                                <view class="zone-add-link" :data-sindex="s_index" @click="on_add_zone">
                                    <text class="zone-add-link-text">+ 添加</text>
                                </view>
                            </view>
                            <view class="field-card">
                                <view class="zone-wrap" v-if="item.drop_take_zones && item.drop_take_zones.length">
                                    <view class="zone-chip" v-for="zone in item.drop_take_zones" :key="zone.id">
                                        <text class="zone-chip-text">{{ zone.name }}</text>
                                        <view class="zone-close" :data-zid="zone.id" @click.stop="on_del_zone">
                                            <fui-icon name="close" size="22" color="#9AA3B8"></fui-icon>
                                        </view>
                                    </view>
                                </view>
                                <view class="zone-empty" v-else>
                                    <text class="zone-empty-text">暂无装卸区域，点击右上角添加</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </list-show>
            </view>
        </view>

        <view class="list-shell" v-else-if="cur_seg == 1">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">全局策略</text>
                        <text class="section-en">POLICIES</text>
                    </view>
                </view>
            </view>
            <view class="policy-body">
                <view class="policy-group">
                    <view class="policy-group-head">
                        <view class="policy-group-bar"></view>
                        <text class="policy-group-title">调价策略</text>
                    </view>
                    <view class="policy-card">
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">默认调价影响计划</text>
                                <text class="policy-desc">调价时默认勾选影响未关闭订单</text>
                            </view>
                            <u-switch v-model="price_profile.default_impact_plan" @change="update_price_profile"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">隐藏调价影响计划开关</text>
                                <text class="policy-desc">调价弹窗不再展示“影响计划”选项</text>
                            </view>
                            <u-switch v-model="price_profile.hide_impact_selector" @change="update_price_profile"></u-switch>
                        </view>
                        <view class="policy-row last">
                            <view class="policy-copy">
                                <text class="policy-title">允许已完成订单调价</text>
                                <text class="policy-desc">开启后可对已完成订单修改单价</text>
                            </view>
                            <u-switch v-model="change_finished_order_price_switch" @change="set_change_finished_order_price_switch"></u-switch>
                        </view>
                    </view>
                </view>

                <view class="policy-group">
                    <view class="policy-group-head">
                        <view class="policy-group-bar"></view>
                        <text class="policy-group-title">验款与资质</text>
                    </view>
                    <view class="policy-card">
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">检查对方资质</text>
                                <text class="policy-desc">下单/操作时校验客商资质材料</text>
                            </view>
                            <u-switch v-model="qualification_check" @change="set_company_qualification"></u-switch>
                        </view>
                        <view class="policy-row last">
                            <view class="policy-copy">
                                <text class="policy-title">验款权限改为余额管理</text>
                                <text class="policy-desc">验款能力与余额管理模块对齐</text>
                            </view>
                            <u-switch v-model="verify_pay_by_cash" @change="set_verify_pay_config"></u-switch>
                        </view>
                    </view>
                </view>

                <view class="policy-group">
                    <view class="policy-group-head">
                        <view class="policy-group-bar"></view>
                        <text class="policy-group-title">现场与计量</text>
                    </view>
                    <view class="policy-card">
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">排队车辆界面操作安检</text>
                                <text class="policy-desc">在排队车辆页直接处理安检</text>
                            </view>
                            <u-switch v-model="show_sc_in_field" @change="set_show_sc_in_field"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">采购严格模式</text>
                                <text class="policy-desc">采购流程按更严格规则校验</text>
                            </view>
                            <u-switch v-model="buy_config_hard" @change="set_buy_config_hard"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">磅单显示装卸车地点</text>
                                <text class="policy-desc">磅单打印/展示装卸位置信息</text>
                            </view>
                            <u-switch v-model="ticket_hasOrhasnt_place" @change="set_ticket_hasOrhasnt_place"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">关闭门禁权限</text>
                                <text class="policy-desc">关闭后不再走门禁权限控制</text>
                            </view>
                            <u-switch v-model="access_control_permission" @change="set_access_control_permission"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">关闭磅上闸杆</text>
                                <text class="policy-desc">关闭后不再控制磅上闸杆</text>
                            </view>
                            <u-switch v-model="barriergate_control_permission" @change="set_barriergate_control_permission"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">卸车地点支持细节输入</text>
                                <text class="policy-desc">允许填写更细的卸车位置说明</text>
                            </view>
                            <u-switch v-model="support_location_detail" @change="set_support_location_detail"></u-switch>
                        </view>
                        <view class="policy-row last">
                            <view class="policy-copy">
                                <text class="policy-title">需要司机确认装卸货</text>
                                <text class="policy-desc">装卸完成后需司机确认</text>
                            </view>
                            <u-switch v-model="need_driver_confirm" @change="set_need_driver_confirm"></u-switch>
                        </view>
                    </view>
                </view>

                <view class="policy-group">
                    <view class="policy-group-head">
                        <view class="policy-group-bar"></view>
                        <text class="policy-group-title">订单与通知</text>
                    </view>
                    <view class="policy-card">
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">只推送消息给可写角色</text>
                                <text class="policy-desc">消息仅发给具备写权限的角色</text>
                            </view>
                            <u-switch v-model="push_messages_writable_roles" @change="set_push_messages_writable_roles"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">允许订单回退</text>
                                <text class="policy-desc">支持将订单状态回退到上一环节</text>
                            </view>
                            <u-switch v-model="is_allowed_order_return" @change="set_is_allowed_order_return"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">订单列表显示价格</text>
                                <text class="policy-desc">列表页展示订单单价信息</text>
                            </view>
                            <u-switch v-model="is_the_order_display_price" @change="set_the_order_display_price"></u-switch>
                        </view>
                        <view class="policy-row">
                            <view class="policy-copy">
                                <text class="policy-title">订单详情隐藏价格</text>
                                <text class="policy-desc">详情页对价格做脱敏展示</text>
                            </view>
                            <u-switch v-model="hide_order_detail_price" @change="set_hide_order_detail_price"></u-switch>
                        </view>
                        <view class="policy-row last">
                            <view class="policy-copy">
                                <text class="policy-title">限制重复订单</text>
                                <text class="policy-desc">相同条件下禁止重复创建订单</text>
                            </view>
                            <u-switch v-model="dup_not_permit" @change="set_dup_not_permit"></u-switch>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <view class="list-shell blacklist-shell" v-else-if="cur_seg == 2">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">黑名单</text>
                        <text class="section-en">BLACKLIST</text>
                    </view>
                </view>
            </view>
            <BlackList ref="blacklist_ref" />
        </view>
    </view>

    <view class="fab-add" v-if="cur_seg == 0" @click="open_add_stuff">
        <text class="fab-add-text">新增</text>
    </view>

    <fui-bottom-popup v-if="show_scope_picker" :show="show_scope_picker" @close="show_scope_picker = false" z-index="1003">
        <fui-list>
            <fui-list-cell v-for="(s, index) in stat_scopes" :key="s.id" :index="index" arrow @click="on_choose_scope">
                <view class="scope-row">
                    <view class="scope-name">{{ s.name }}</view>
                    <fui-icon v-if="stat_context_company_id === s.id" name="check" size="30" color="#1E9FFF"></fui-icon>
                </view>
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>

    <fui-modal width="600" :show="show_zone_add" v-if="show_zone_add" @click="zone_add">
        <fui-form ref="zone_form" top="100">
            <fui-input required label="区域名称" borderTop placeholder="请输入区域名称" v-model="zone_req.zone_name"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_zone_del" v-if="show_zone_del" :descr="'确定要删除吗？'" @click="delete_zone">
    </fui-modal>
    <fui-modal width="600" :show="show_stuff_fetch" v-if="show_stuff_fetch" @click="fetch_stuff">
        <fui-form ref="form" top="100">
            <fui-input required label="物料名称" borderTop placeholder="请输入物料名" :disabled="is_update" v-model="stuff_ready_fetch.name"></fui-input>
            <fui-input label="备注" borderTop placeholder="请输入备注" v-model="stuff_ready_fetch.comment"></fui-input>
            <fui-input required label="期望单车装载量" borderTop placeholder="请输入期望单车装载量" v-model="stuff_ready_fetch.expect_count"></fui-input>
            <fui-input label="允许迟到天数" borderTop placeholder="请输入允许迟到天数" v-model="stuff_ready_fetch.delay_days"></fui-input>
            <fui-input label="自动关闭时间点" borderTop placeholder="选择时间，不填就是不关闭" v-model="stuff_ready_fetch.close_time" disabled @click="show_close_time = true">
                <fui-button v-if="stuff_ready_fetch.close_time" text="取消自动关闭" @click="stuff_ready_fetch.close_time = ''" btnSize="mini" type="warning"></fui-button>
            </fui-input>
            <fui-date-picker :show="show_close_time" type="6" @change="choose_time" @cancel="show_close_time = false"></fui-date-picker>
            <fui-form-item label="用于采购">
                <view class="form-switch-row">
                    <u-switch v-model="stuff_ready_fetch.use_for_buy" @change="on_use_for_buy_change"></u-switch>
                    <view v-if="stuff_ready_fetch.use_for_buy" class="form-switch-extra">
                        <fui-text size="28" text="自动确认订单"></fui-text>
                        <u-switch v-model="stuff_ready_fetch.auto_confirm_order"></u-switch>
                    </view>
                </view>
            </fui-form-item>
            <fui-form-item label="关注发票">
                <u-switch v-model="stuff_ready_fetch.concern_fapiao"></u-switch>
            </fui-form-item>
            <fui-form-item label="当日关闭">
                <u-switch v-model="stuff_ready_fetch.close_today"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_delete" v-if="show_delete" :descr="'确定要删除' + item_for_delete.name + '吗？'" @click="delete_stuff">
    </fui-modal>
    <fui-modal width="600" :show="show_cancel_next_price" v-if="show_cancel_next_price" descr="确定要关闭定时调价吗?" @click="do_cancel_next_price">
    </fui-modal>
    <fui-modal width="600" :show="show_change_price" v-if="show_change_price" @click="change_price">
        <fui-form ref="change_price_form" top="100">
            <fui-input required label="新价格" borderTop placeholder="请输入新价格" v-model="stuff2change_price.price"></fui-input>
            <fui-input required label="备注" borderTop placeholder="请输入备注" v-model="stuff2change_price.comment"></fui-input>
            <fui-form-item label="影响计划？" asterisk v-if="!price_profile.hide_impact_selector">
                <u-switch v-model="stuff2change_price.to_plan"></u-switch>
            </fui-form-item>
            <view v-if="stuff2change_price.to_plan" class="price-tip">
                <view class="price-tip-title">勾选"影响计划"后，未关闭订单的单价将按以下规则重算：</view>
                <view>1. 合同已设置"一客一价"的订单：保持原单价不变</view>
                <view>2. 合同绑定了"优惠方案"的订单：按 新价格 + 方案 delta 重算</view>
                <view>3. 其它订单：直接使用新价格</view>
            </view>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_next_price" v-if="show_next_price" @click="do_next_price">
        <fui-form ref="next_price_form" top="100">
            <fui-input required label="新价格" borderTop placeholder="请输入新价格" v-model="next_price_req.next_price"></fui-input>
            <fui-input required label="备注" borderTop placeholder="请输入备注" v-model="next_price_req.next_comment"></fui-input>
            <fui-input label="调价时间" borderTop disabled placeholder="点击选择时间" v-model="next_price_req.next_time" @click="show_next_date = true"></fui-input>
        </fui-form>
    </fui-modal>

    <fui-date-picker :show="show_next_date" :minDate="today_date" :value="today_date" type="5" @change="set_next_date" @cancel="show_next_date = false"></fui-date-picker>
    <fui-bottom-popup :show="show_history" @close="show_history = false">
        <view v-if="show_history">
            <list-show ref="history" v-model="data2show" :fetch_function="get_price_history" :fetch_params="[stuff_for_history.id, stat_context_company_id]" search_key="comment" height="40vh">
                <u-cell v-for="(item, index) in data2show" :key="index" size="large" :title="item.operator" :value="item.new_price">
                    <template #label>
                        <view class="history-tags">
                            <fui-tag :text="item.comment" theme="plain" :scaleRatio="0.8" type="purple"></fui-tag>
                            <fui-tag :text="item.time" theme="plain" :scaleRatio="0.8" type="danger"></fui-tag>
                        </view>
                    </template>
                </u-cell>
            </list-show>
        </view>
    </fui-bottom-popup>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue'
import utils from '@/components/firstui/fui-utils';
import BlackList from './BlackList.vue';
import FuiDatePicker from '../components/firstui/fui-date-picker/fui-date-picker.vue';
export default {
    name: 'Stuff',
    components: {
        ListShow,
        BlackList,
        FuiDatePicker
    },
    data: function () {
        return {
            price_profile: {
                default_impact_plan: false,
                hide_impact_selector: false,
            },
            showDelayCheckoutPicker: null,
            cur_seg: 0,
            seg_list: ['物料配置', '全局策略', '黑名单'],
            expanded_ids: {},
            stuff_search_input: '',
            stat_scopes: [],
            stat_context_company_id: null,
            show_scope_picker: false,
            self_info: {
                company_is_group: false,
                company_id: null,
            },
            show_cancel_next_price: false,
            cancel_next_stuff_id: 0,
            show_next_date: false,
            show_next_price: false,
            next_price_req: {
                next_price: '',
                next_comment: '',
                next_time: '',
            },
            stuff_ready_fetch: {
                name: '',
                comment: undefined,
                expect_count: undefined,
                use_for_buy: false,
                auto_confirm_order: false,
                close_time: '',
                delay_days: 0,
                concern_fapiao: false,
                close_today: false,
            },
            show_stuff_fetch: false,
            is_update: false,
            item_for_delete: {
                name: ''
            },
            show_delete: false,
            show_change_price: false,
            show_history: false,
            stuff2change_price: {
                price: undefined,
                comment: undefined,
                to_plan: false,
                stuff_id: undefined
            },
            stuff_for_history: {
                id: 0,
            },
            data2show: [],
            data2show2: [],
            show_close_time: false,
            today_date: utils.dateFormatter(new Date(), 'y-m-d h:i', 4, false),
            qualification_check: false,
            verify_pay_by_cash: false,
            add_zone_stuff_id: 0,
            show_zone_add: false,
            zone_req: {
                zone_name: ''
            },
            del_zone_id: 0,
            show_zone_del: false,
            show_sc_in_field: false,
            buy_config_hard: false,
            push_messages_writable_roles: false,
            ticket_hasOrhasnt_place: false,
            access_control_permission: false,
            barriergate_control_permission: false,
            support_location_detail: false,
            is_allowed_order_return: false,
            is_the_order_display_price: false,
            hide_order_detail_price: false,
            change_finished_order_price_switch: false,
            need_driver_confirm:false,
            dup_not_permit: false,
            // 全局配置管理
            globalConfigs: {
                show_sc_in_field: {
                    getUrl: '/global/get_show_sc_in_field',
                    setUrl: '/stuff/set_show_sc_in_field',
                    key: 'show_sc_in_field'
                },
                buy_config_hard: {
                    getUrl: '/global/get_buy_config_hard',
                    setUrl: '/stuff/set_buy_config_hard',
                    key: 'buy_config_hard'
                },
                push_messages_writable_roles: {
                    getUrl: '/global/get_push_messages_writable_roles',
                    setUrl: '/stuff/set_push_messages_writable_roles',
                    key: 'push_messages_writable_roles'
                },
                ticket_hasOrhasnt_place: {
                    getUrl: '/global/get_ticket_hasOrhasnt_place',
                    setUrl: '/stuff/set_ticket_hasOrhasnt_place',
                    key: 'ticket_hasOrhasnt_place'
                },
                access_control_permission: {
                    getUrl: '/global/get_access_control_permission',
                    setUrl: '/stuff/set_access_control_permission',
                    key: 'access_control_permission'
                },
                barriergate_control_permission: {
                    getUrl: '/global/get_barriergate_control_permission',
                    setUrl: '/stuff/set_barriergate_control_permission',
                    key: 'barriergate_control_permission'
                },
                support_location_detail: {
                    getUrl: '/global/get_support_location_detail',
                    setUrl: '/stuff/set_support_location_detail',
                    key: 'support_location_detail'
                },
                is_allowed_order_return: {
                    getUrl: '/global/get_is_allowed_order_return',
                    setUrl: '/stuff/set_is_allowed_order_return',
                    key: 'is_allowed_order_return'
                },
                is_the_order_display_price: {
                    getUrl: '/global/get_the_order_display_price',
                    setUrl: '/stuff/set_the_order_display_price',
                    key: 'is_the_order_display_price'
                },
                hide_order_detail_price: {
                    getUrl: '/global/get_hide_order_detail_price',
                    setUrl: '/stuff/set_hide_order_detail_price',
                    key: 'hide_order_detail_price'
                },
                change_finished_order_price_switch: {
                    getUrl: '/global/get_change_finished_order_price_switch',
                    setUrl: '/stuff/set_change_finished_order_price_switch',
                    key: 'change_finished_order_price_switch'
                },
                need_driver_confirm: {
                    getUrl: '/global/get_need_driver_confirm',
                    setUrl: '/stuff/set_need_driver_confirm',
                    key: 'need_driver_confirm'
                },
                dup_not_permit:{
                    getUrl: '/global/get_dup_not_permit',
                    setUrl: '/stuff/set_dup_not_permit',
                    key: 'dup_not_permit'
                },
            }
        }
    },
    computed: {
        current_seg_name: function () {
            return this.seg_list[this.cur_seg] || '';
        },
        show_scope_switch: function () {
            return this.self_info
                && this.self_info.company_is_group === true
                && this.has_group_member_scope;
        },
        has_group_member_scope: function () {
            if (!this.self_info || this.self_info.company_id == null) {
                return false;
            }
            return (this.stat_scopes || []).some((s) => s.id !== this.self_info.company_id);
        },
        current_scope_name: function () {
            const current = (this.stat_scopes || []).find((s) => s.id === this.stat_context_company_id);
            return current ? current.name : '';
        }
    },
    methods: {
        format_price: function (price) {
            const n = Number(price);
            if (Number.isNaN(n)) {
                return price == null ? '-' : String(price);
            }
            return n.toFixed(2);
        },
        has_stuff_chips: function (item) {
            return !!(item && (item.close_time || item.delay_days || item.change_last_minutes));
        },
        next_price_show: function (item) {
            let now = new Date();
            now.setMinutes(now.getMinutes() + item.change_last_minutes);
            return utils.dateFormatter(now, 'y-m-d h:i', 4, false) + '后，调价为' + Number(item.next_price).toFixed(2);
        },
        is_expanded: function (id) {
            return !!this.expanded_ids[id];
        },
        get_stuff_by_event: function (e) {
            const sindex = Number(e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.sindex
                : -1);
            const item = (this.data2show2 || [])[sindex];
            if (!item) {
                uni.showToast({ title: '未找到物料，请重试', icon: 'none' });
                return null;
            }
            return item;
        },
        on_card_update: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_update(item);
        },
        on_card_delete: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_delete(item);
        },
        on_card_change_price: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_change_price(item);
        },
        on_card_history: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_history(item);
        },
        on_card_next_price: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_next_price(item);
        },
        on_card_cancel_next_price: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_cancel_next_price(item);
        },
        on_card_toggle_expand: function (e) {
            const item = this.get_stuff_by_event(e);
            if (!item) return;
            this.$set(this.expanded_ids, item.id, !this.expanded_ids[item.id]);
        },
        on_save_ticket_prefix: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.save_ticket_prefix(item);
        },
        on_open_delay_picker: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.showDelayCheckoutPicker = item.id;
        },
        on_batch_checkout: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.handleBatchCheckout(item, e);
        },
        on_confirm_delay_time: function (event) {
            const item = (this.data2show2 || []).find((row) => row.id === this.showDelayCheckoutPicker);
            if (!item) return;
            this.confirm_checkout_delay_time(event, item);
        },
        on_save_unit_config: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.set_scunit_coe_configuration(item);
        },
        on_add_zone: function (e) {
            const item = this.get_stuff_by_event(e);
            if (item) this.prepare_add_zone(item);
        },
        on_del_zone: function (e) {
            const zid = Number(e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.zid
                : 0);
            if (zid) this.prepare_del_zone(zid);
        },
        on_choose_scope: function (e) {
            const scope = (this.stat_scopes || [])[e.index];
            if (scope) this.choose_stat_scope(scope.id);
        },
        open_add_stuff: function () {
            this.is_update = false;
            this.stuff_ready_fetch = {
                name: '',
                comment: undefined,
                expect_count: undefined,
                use_for_buy: false,
                auto_confirm_order: false,
                close_time: '',
                delay_days: 0,
                concern_fapiao: false,
                close_today: false,
            };
            this.show_stuff_fetch = true;
        },
        on_stuff_search_input: function (e) {
            this.stuff_search_input = e.detail.value;
        },
        on_stuff_search_confirm: function () {
            const list = this.$refs.stuff_ref;
            if (!list) {
                return;
            }
            list.search_input = this.stuff_search_input;
            list.search_condition = this.stuff_search_input;
            list.refresh();
        },
        clear_stuff_search: function () {
            this.stuff_search_input = '';
            const list = this.$refs.stuff_ref;
            if (!list) {
                return;
            }
            list.cancel();
        },
        make_scope_req: function (body = {}) {
            const req = { ...body };
            if (this.show_scope_switch && this.stat_context_company_id != null) {
                req.stat_context_company_id = this.stat_context_company_id;
            }
            return req;
        },
        load_self_info: async function () {
            try {
                const info = await this.$send_req('/global/self_info', {});
                this.self_info = info || { company_is_group: false, company_id: null };
            } catch (e) {
                this.self_info = { company_is_group: false, company_id: null };
            }
        },
        load_stat_scopes: async function () {
            try {
                const ret = await this.$send_req('/global/home_stat_scope_list', {});
                this.stat_scopes = ret.scopes || [];
                if (this.stat_scopes.length && this.stat_context_company_id == null) {
                    const first_member_scope = this.stat_scopes.find((s) => this.self_info && s.id !== this.self_info.company_id);
                    this.stat_context_company_id = first_member_scope ? first_member_scope.id : this.stat_scopes[0].id;
                }
            } catch (e) {
                this.stat_scopes = [];
            }
        },
        init_scope_and_refresh: async function () {
            await this.load_self_info();
            await this.load_stat_scopes();
            this.$nextTick(() => {
                if (this.$refs?.stuff_ref) {
                    this.$refs.stuff_ref.refresh();
                }
            });
        },
        open_scope_picker: function () {
            this.show_scope_picker = true;
        },
        choose_stat_scope: function (company_id) {
            if (this.stat_context_company_id === company_id) {
                this.show_scope_picker = false;
                return;
            }
            this.stat_context_company_id = company_id;
            this.show_scope_picker = false;
            this.$nextTick(() => {
                if (this.$refs?.stuff_ref) {
                    this.$refs.stuff_ref.refresh();
                }
            });
        },
        handleBatchCheckout(item, event) {
            if (event?.stopPropagation) {
                event.stopPropagation();
            }
            this.batch_checkout(item);
        },
        batch_checkout: async function (item) {
            try {
                const {
                    confirm
                } = await uni.showModal({
                    title: '提示',
                    content: '确定要一键结算吗？',
                    showCancel: true,
                    cancelText: '取消',
                    confirmText: '确定',
                    confirmColor: '#4CAF50'
                });

                if (confirm) {
                    let resp = await this.$send_req('/sale_management/batch_checkout', this.make_scope_req({
                        stuff_id: item.id
                    }));
                    uni.showToast({
                        title: `一键结算成功，${resp.order_count}个订单已结算`,
                        icon: 'success'
                    });
                }
            } catch (error) {
                console.error(error);
                uni.showToast({
                    title: '操作失败，请查看控制台日志',
                    icon: 'none'
                });
            }
        },
        confirm_checkout_delay_time(event, stuff) {
            stuff.delay_checkout_time = event.result;

            this.set_delay_checkout_time(stuff);
            this.showDelayCheckoutPicker = null;
        },
        async set_delay_checkout_time(item) {
            try {
                await this.$send_req('/stuff/set_delay_checkout_time', this.make_scope_req({
                    stuff_id: item.id,
                    delay_checkout_time: item.delay_checkout_time || ''
                }));
                uni.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
                uni.startPullDownRefresh();
            } catch (error) {
                uni.showToast({
                    title: '保存失败：' + error.message,
                    icon: 'none'
                });
            }
        },
        save_ticket_prefix: async function (item) {
            await this.$send_req('/stuff/set_ticket_prefix', this.make_scope_req({
                stuff_id: item.id,
                ticket_prefix: item.ticket_prefix
            }));
            uni.startPullDownRefresh();
        },
        prepare_del_zone: function (zone_id) {
            this.del_zone_id = zone_id;
            this.show_zone_del = true;
        },
        delete_zone: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/stuff/del_zone', this.make_scope_req({
                    id: this.del_zone_id
                }));
                uni.startPullDownRefresh();
            }
            this.show_zone_del = false;
        },
        zone_add: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'zone_name',
                    rule: ['required'],
                    msg: ['请输入区域名称']
                }];

                let val_ret = await this.$refs.zone_form.validator(this.zone_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/stuff/add_zone', this.make_scope_req({
                    stuff_id: this.add_zone_stuff_id,
                    name: this.zone_req.zone_name
                }));
                uni.startPullDownRefresh();
                this.zone_req.zone_name = '';
            }
            this.show_zone_add = false;
        },
        prepare_add_zone: function (item) {
            this.add_zone_stuff_id = item.id;
            this.show_zone_add = true;
        },
        init_price_profile: async function () {
            let resp = await this.$send_req('/sale_management/get_price_change_profile', {});
            this.price_profile = resp;
        },
        update_price_profile: async function () {
            await this.$send_req('/sale_management/set_price_change_profile', this.price_profile);
            await this.init_price_profile();
        },
        set_company_qualification: async function () {
            await this.$send_req('/stuff/set_check_qualification', {
                enable: this.qualification_check
            });
            await this.get_company_qualification();
        },
        set_verify_pay_config: async function () {
            await this.$send_req('/stuff/set_verify_pay_config', {
                verify_pay_by_cash: this.verify_pay_by_cash
            });
            await this.get_verify_pay_config();
        },
        get_verify_pay_config: async function () {
            this.verify_pay_by_cash = (await this.$send_req('/stuff/get_verify_pay_config', {})).verify_pay_by_cash;
        },
        get_company_qualification: async function () {
            let ret = await this.$send_req('/stuff/get_check_qualification', {});
            this.qualification_check = ret.enable;
        },
        seg_change: function (e) {
            this.cur_seg = e.index;
        },
        set_next_date: function (e) {
            this.next_price_req.next_time = e.result;
            this.show_next_date = false;
        },
        choose_time: function (e) {
            this.stuff_ready_fetch.close_time = e.result;
            this.show_close_time = false;
        },
        change_no_need_register: async function (event, item) {
            await this.$send_req('/stuff/no_need_register', this.make_scope_req({
                stuff_id: item.id,
                no_need_register: event.detail.value,
            }));
        },
        change_need_exam: async function (event, item) {
            await this.$send_req('/stuff/exam_config', this.make_scope_req({
                stuff_id: item.id,
                need_exam: event.detail.value,
            }));
        },
        change_checkout_delay: async function (event, item) {
            await this.$send_req('/stuff/checkout_delay_config', this.make_scope_req({
                stuff_id: item.id,
                checkout_delay: event.detail.value,
            }));
        },
        change_manual_weight: async function (event, item) {
            item.manual_weight = event.detail.value;
            await this.$send_req('/stuff/manual_weight_config', this.make_scope_req({
                stuff_id: item.id,
                manual_weight: event.detail.value
            }));
        },
        change_auto_confirm_goods: async function (event, item) {
            await this.$send_req('/stuff/auto_confirm_goods', this.make_scope_req({
                stuff_id: item.id,
                auto_confirm_goods: event.detail.value
            }));
        },
        change_need_driver_sign: async function (event, item) {
            await this.$send_req('/stuff/need_driver_sign', this.make_scope_req({
                stuff_id: item.id,
                need_driver_sign: event.detail.value
            }));
        },
        change_need_enter_weight: async function (event, item) {
            await this.$send_req('/stuff/enter_weight', this.make_scope_req({
                stuff_id: item.id,
                need_enter_weight: event.detail.value
            }));
        },
        change_need_expect_weight: async function (event, item) {
            await this.$send_req('/stuff/expect_weight_config', this.make_scope_req({
                stuff_id: item.id,
                need_expect_weight: event.detail.value
            }));
        },
        set_scunit_coe_configuration: async function (item) {
            try {
                if (!item || !item.id) {
                    uni.showToast({
                        title: '参数错误',
                        icon: 'none'
                    });
                    return;
                }
                await this.$send_req('/stuff/set_unit_coefficient', this.make_scope_req({
                    stuff_id: item.id,
                    unit_coefficient: {
                        second_unit: item.second_unit || '',
                        coefficient: item.coefficient || 0,
                        second_unit_decimal: parseInt(item.second_unit_decimal == undefined ? 2 : item.second_unit_decimal, 10)
                    }
                }));
                uni.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
                uni.startPullDownRefresh();
            } catch (error) {
                uni.showToast({
                    title: error.message || '保存失败',
                    icon: 'none'
                });
            }
        },
        change_need_sc: async function (event, item) {
            await this.$send_req('/stuff/sc_config', this.make_scope_req({
                stuff_id: item.id,
                need_sc: event.detail.value
            }));
        },
        get_price_history: async function (_pageNo, params) {
            if (params[0] == 0) {
                return [];
            }
            const req = {
                pageNo: _pageNo,
                stuff_id: params[0]
            };
            if (params[1] != null) {
                req.stat_context_company_id = params[1];
            }
            let ret = await this.$send_req('/stuff/get_price_history', req);

            return ret.histories;
        },
        do_next_price: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'next_price',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入新价格', '价格请填写数字']
                }, {
                    name: 'next_comment',
                    rule: ['required'],
                    msg: ['请输入备注']
                }];
                let val_ret = await this.$refs.next_price_form.validator(this.next_price_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                let clm = new Date(this.next_price_req.next_time).getTime() - new Date().getTime();
                clm = clm / 1000 / 60;
                await this.$send_req('/stuff/set_next_price', this.make_scope_req({
                    stuff_id: this.next_price_req.stuff_id,
                    next_price: parseFloat(this.next_price_req.next_price),
                    next_comment: this.next_price_req.next_comment,
                    change_last_minutes: clm
                }));
                uni.startPullDownRefresh();
            }
            this.show_next_price = false;
        },
        do_cancel_next_price: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/stuff/clear_next_price', this.make_scope_req({
                    stuff_id: this.cancel_next_stuff_id,
                }))
                uni.startPullDownRefresh();
            }
            this.show_cancel_next_price = false;
        },
        prepare_cancel_next_price: function (item) {
            this.show_cancel_next_price = true;
            this.cancel_next_stuff_id = item.id;
        },
        prepare_next_price: function (item) {
            this.next_price_req.stuff_id = item.id;
            this.show_next_price = true;
        },
        prepare_history: function (item) {
            this.show_history = true;
            this.stuff_for_history = item
            this.$nextTick(() => {
                this.$refs.history.refresh();
            });
        },
        change_price: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'price',
                    rule: ['required', 'isNumber'],
                    msg: ['请输入新价格', '价格请填写数字']
                }, {
                    name: 'comment',
                    rule: ['required'],
                    msg: ['请输入备注']
                }];
                let val_ret = await this.$refs.change_price_form.validator(this.stuff2change_price, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.stuff2change_price.price = parseFloat(this.stuff2change_price.price);
                await this.$send_req('/stuff/change_price', this.make_scope_req(this.stuff2change_price));
                uni.startPullDownRefresh();
            }
            this.show_change_price = false;
        },
        delete_stuff: async function (detail) {
            if (detail.index == 1) {
                await this.$send_req('/stuff/del', this.make_scope_req({
                    id: this.item_for_delete.id
                }));
                uni.startPullDownRefresh();
            }
            this.show_delete = false;
        },
        prepare_change_price: function (item) {
            this.stuff2change_price = {
                price: item.price,
                comment: '',
                to_plan: this.price_profile.default_impact_plan,
                stuff_id: item.id
            }
            this.show_change_price = true;
        },
        prepare_delete: function (item) {
            this.item_for_delete = item;
            this.show_delete = true;
        },
        on_use_for_buy_change: function (event) {
            if (!event.detail.value) {
                this.stuff_ready_fetch.auto_confirm_order = false;
            }
        },
        prepare_update: function (item) {
            if (item.delay_days == null) {
                item.delay_days = 0;
            }
            this.stuff_ready_fetch = {
                name: item.name,
                comment: item.comment,
                expect_count: item.expect_count,
                use_for_buy: item.use_for_buy,
                auto_confirm_order: item.auto_confirm_order || false,
                close_time: item.close_time,
                delay_days: item.delay_days,
                concern_fapiao: item.concern_fapiao,
                close_today: item.close_today,
            }
            this.show_stuff_fetch = true;
            this.is_update = true;
        },
        fetch_stuff: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'name',
                    rule: ['required'],
                    msg: ['请输入物料名']
                }, {
                    name: 'expect_count',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入预计单车装货量', '预计装货量请填写数字']
                }, {
                    name: 'delay_days',
                    rule: ['isNumber'],
                    msg: ['允许迟到天数请填写数字']
                }];
                let val_ret = await this.$refs.form.validator(this.stuff_ready_fetch, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.stuff_ready_fetch.expect_count) {
                    this.stuff_ready_fetch.expect_count = parseFloat(this.stuff_ready_fetch.expect_count);
                }
                if (this.stuff_ready_fetch.delay_days) {
                    this.stuff_ready_fetch.delay_days = parseInt(this.stuff_ready_fetch.delay_days)
                }
                await this.$send_req('/stuff/fetch', this.make_scope_req(this.stuff_ready_fetch));
                uni.startPullDownRefresh();
            }
            this.show_stuff_fetch = false;
        },
        get_all_stuff: async function (_pageNo, params) {
            const req = {
                pageNo: _pageNo
            };
            if (params && params[0] != null) {
                req.stat_context_company_id = params[0];
            }
            let ret = await this.$send_req('/stuff/get_all', req);
            return ret.stuff
        },

        // 通用获取配置方法
        getGlobalConfig: async function (configKey) {
            const config = this.globalConfigs[configKey];
            if (!config) return;

            try {
                const ret = await this.$send_req(config.getUrl, {});
                this[configKey] = ret[config.key];
            } catch (error) {
                console.error(`获取配置 ${configKey} 失败:`, error);
            }
        },

        // 通用设置配置方法
        setGlobalConfig: async function (configKey) {
            const config = this.globalConfigs[configKey];
            if (!config) return;

            try {
                await this.$send_req(config.setUrl, {
                    [config.key]: this[configKey]
                });

                // 某些配置需要重新获取以确保同步
                if (['show_sc_in_field', 'buy_config_hard'].includes(configKey)) {
                    await this.getGlobalConfig(configKey);
                }
            } catch (error) {
                console.error(`设置配置 ${configKey} 失败:`, error);
                uni.showToast({
                    title: '设置失败',
                    icon: 'none'
                });
            }
        },

        // 批量初始化所有全局配置
        initAllGlobalConfigs: async function () {
            const configKeys = Object.keys(this.globalConfigs);
            const promises = configKeys.map(key => this.getGlobalConfig(key));
            await Promise.all(promises);
        },

        // 为每个配置生成对应的get/set方法
        get_show_sc_in_field: function () {
            return this.getGlobalConfig('show_sc_in_field');
        },
        set_show_sc_in_field: function () {
            return this.setGlobalConfig('show_sc_in_field');
        },
        get_buy_config_hard: function () {
            return this.getGlobalConfig('buy_config_hard');
        },
        set_buy_config_hard: function () {
            return this.setGlobalConfig('buy_config_hard');
        },
        get_push_messages_writable_roles: function () {
            return this.getGlobalConfig('push_messages_writable_roles');
        },
        set_push_messages_writable_roles: function () {
            return this.setGlobalConfig('push_messages_writable_roles');
        },
        get_ticket_hasOrhasnt_place: function () {
            return this.getGlobalConfig('ticket_hasOrhasnt_place');
        },
        set_ticket_hasOrhasnt_place: function () {
            return this.setGlobalConfig('ticket_hasOrhasnt_place');
        },
        get_access_control_permission: function () {
            return this.getGlobalConfig('access_control_permission');
        },
        set_access_control_permission: function () {
            return this.setGlobalConfig('access_control_permission');
        },
        get_barriergate_control_permission: function () {
            return this.getGlobalConfig('barriergate_control_permission');
        },
        set_barriergate_control_permission: function () {
            return this.setGlobalConfig('barriergate_control_permission');
        },
        get_support_location_detail: function () {
            return this.getGlobalConfig('support_location_detail');
        },
        set_support_location_detail: function () {
            return this.setGlobalConfig('support_location_detail');
        },
        get_is_allowed_order_return: function () {
            return this.getGlobalConfig('is_allowed_order_return');
        },
        set_is_allowed_order_return: function () {
            return this.setGlobalConfig('is_allowed_order_return');
        },
        get_the_order_display_price: function () {
            return this.getGlobalConfig('is_the_order_display_price');
        },
        set_the_order_display_price: function () {
            return this.setGlobalConfig('is_the_order_display_price');
        },
        get_hide_order_detail_price: function () {
            return this.getGlobalConfig('hide_order_detail_price');
        },
        set_hide_order_detail_price: function () {
            return this.setGlobalConfig('hide_order_detail_price');
        },
        get_change_finished_order_price_switch: function () {
            return this.getGlobalConfig('change_finished_order_price_switch');
        },
        set_change_finished_order_price_switch: function () {
            return this.setGlobalConfig('change_finished_order_price_switch');
        },
        get_need_driver_confirm: function () {
            return this.getGlobalConfig('need_driver_confirm');
        },
        set_need_driver_confirm: function () {
            return this.setGlobalConfig('need_driver_confirm');
        },
        get_dup_not_permit: function () {
            return this.getGlobalConfig('dup_not_permit');
        },
        set_dup_not_permit: function () {
            return this.setGlobalConfig('dup_not_permit');
        },
    },
    onPullDownRefresh() {
        this.$refs?.stuff_ref?.refresh();
        this.$refs?.blacklist_ref?.refresh();
        this.stuff_ready_fetch = {
            name: '',
            comment: undefined,
            expect_count: undefined,
            use_for_buy: false,
            auto_confirm_order: false,
            close_time: '',
            delay_days: 0,
            concern_fapiao: false,
            close_today: false,
        }
        uni.stopPullDownRefresh();
    },
    onLoad: function () {
        this.init_scope_and_refresh();
        this.init_price_profile();
        this.get_company_qualification();
        this.get_verify_pay_config();
        this.initAllGlobalConfigs();
    }
}
</script>


<style scoped>
.stuff-page {
    height: 100vh;
    background: #F2F4FA;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.stuff-page.has-fab {
    padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.stuff-page.has-bl-bar {
    padding-bottom: calc(300rpx + env(safe-area-inset-bottom));
}
.stuff-page.page-scroll {
    height: auto;
    min-height: 100vh;
    overflow: visible;
    display: block;
}
.body {
    position: relative;
    z-index: 2;
    margin-top: -28rpx;
    padding: 0 20rpx;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}
.stuff-page.page-scroll .body {
    display: block;
    flex: none;
    min-height: 0;
}
.list-shell {
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    overflow: hidden;
    padding-bottom: 8rpx;
}
.list-shell-fill {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
}
.list-fill {
    flex: 1;
    min-height: 0;
    height: 0;
    box-sizing: border-box;
}
.hero {
    position: relative;
    flex-shrink: 0;
    padding: 20rpx 28rpx 36rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}
.hero-logo-bg {
    position: absolute;
    right: -20rpx;
    top: -40rpx;
    z-index: 0;
    pointer-events: none;
}
.hero-logo-img {
    width: 280rpx;
    height: 280rpx;
    opacity: 0.34;
    transform: translate(36%, -24%);
}
.hero-top { position: relative; z-index: 1; }
.hero-hello {
    display: block;
    font-size: 32rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.hero-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.78);
}
.filter-shell {
    flex-shrink: 0;
    background: #FFFFFF;
    border-radius: 24rpx;
    padding: 18rpx 18rpx 16rpx;
    box-shadow: 0 12rpx 32rpx rgba(40, 58, 120, 0.1);
    margin-bottom: 16rpx;
}
.seg-wrap { margin-bottom: 4rpx; }
.meta-card {
    margin-top: 14rpx;
    background: linear-gradient(135deg, #F7F8FE 0%, #EEF1FB 100%);
    border: 1rpx solid #E8ECF6;
    border-radius: 20rpx;
    padding: 4rpx 16rpx;
}
.meta-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
}
.meta-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
    min-width: 0;
}
.meta-icon {
    width: 52rpx;
    height: 52rpx;
    border-radius: 14rpx;
    background: rgba(70, 92, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 14rpx;
    flex-shrink: 0;
}
.meta-copy { flex: 1; min-width: 0; }
.meta-label {
    display: block;
    font-size: 20rpx;
    color: #8A94A6;
}
.meta-value {
    display: block;
    margin-top: 4rpx;
    font-size: 24rpx;
    color: #1A1F36;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.section-head {
    padding: 16rpx 18rpx 12rpx;
    background: linear-gradient(90deg, #F3F5FF 0%, #FFFFFF 70%);
    border-bottom: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: row;
    align-items: center;
}
.section-head-stack {
    flex-direction: column;
    align-items: stretch;
}
.section-head-left {
    display: flex;
    flex-direction: row;
    align-items: center;
}
.section-search {
    margin-top: 14rpx;
    width: 100%;
}
.section-search-box {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 64rpx;
    padding: 0 8rpx 0 16rpx;
    border-radius: 32rpx;
    background: #FFFFFF;
    border: 1rpx solid rgba(70, 92, 255, 0.08);
    box-shadow: 0 4rpx 12rpx rgba(40, 58, 120, 0.04);
    box-sizing: border-box;
    position: relative;
}
.section-search-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
.section-search-input {
    flex: 1;
    min-width: 0;
    height: 64rpx;
    padding: 0 10rpx;
    font-size: 24rpx;
    color: #181818;
    background: transparent;
}
.section-search-ph {
    color: #B2B2B2;
    font-size: 22rpx;
}
.section-search-btn {
    flex-shrink: 0;
    margin-left: 6rpx;
    min-width: 88rpx;
    height: 48rpx;
    padding: 0 18rpx;
    border-radius: 24rpx;
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
    box-shadow: 0 6rpx 12rpx rgba(47, 63, 207, 0.24);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}
.section-search-btn-text {
    font-size: 22rpx;
    color: #FFFFFF;
    font-weight: 700;
    letter-spacing: 1rpx;
}
.section-bar {
    width: 8rpx;
    height: 34rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 14rpx;
}
.section-titles { display: flex; flex-direction: column; }
.section-title {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.2;
}
.section-en {
    margin-top: 2rpx;
    font-size: 16rpx;
    color: #9AA3B8;
    letter-spacing: 2rpx;
}
.stuff-card {
    margin: 16rpx 16rpx 0;
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-radius: 22rpx;
    overflow: hidden;
    box-shadow: 0 8rpx 22rpx rgba(40, 58, 120, 0.05);
}
.stuff-card:last-child {
    margin-bottom: 140rpx;
}
.card-head {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
    padding: 24rpx 24rpx 14rpx;
}
.card-head-left { flex: 1; min-width: 0; }
.title-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 10rpx;
}
.stuff-title {
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    max-width: 360rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.status-pill {
    font-size: 18rpx;
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    font-weight: 600;
}
.st-buy { color: #465CFF; background: rgba(70, 92, 255, 0.12); }
.st-sale { color: #2DBE6C; background: rgba(45, 190, 108, 0.12); }
.st-fapiao { color: #7B61FF; background: rgba(123, 97, 255, 0.12); }
.meta-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 8rpx;
}
.meta-line-text {
    font-size: 22rpx;
    color: #8A94A6;
    line-height: 1.4;
}
.price-box {
    flex-shrink: 0;
    text-align: right;
    padding-top: 2rpx;
}
.price-label {
    display: block;
    font-size: 18rpx;
    color: #9AA3B8;
    margin-bottom: 4rpx;
}
.price-text {
    display: block;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
.chip-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8rpx;
    padding: 0 24rpx 14rpx;
}
.chip {
    display: inline-flex;
    padding: 6rpx 14rpx;
    border-radius: 10rpx;
    font-size: 20rpx;
}
.chip.soft { color: #465CFF; background: rgba(70, 92, 255, 0.08); }
.chip.soft.warn { color: #FF8A2B; background: rgba(255, 138, 43, 0.1); }
.chip.soft.purple { color: #7B61FF; background: rgba(123, 97, 255, 0.1); }
.action-bar {
    margin-top: 4rpx;
    padding: 14rpx 12rpx 16rpx;
    border-top: 1rpx solid #F0F2F7;
    background: #FAFBFE;
}
.action-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
}
.action-cell {
    width: 25%;
    box-sizing: border-box;
    padding: 6rpx;
}
.action-btn {
    width: 100%;
    height: 64rpx;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    border-radius: 12rpx;
    background: #FFFFFF;
    border: 1rpx solid #E6EAF2;
    box-sizing: border-box;
}
.action-btn-text {
    font-size: 22rpx;
    font-weight: 600;
    color: #3D4656;
    text-align: center;
    line-height: 1.2;
}
.action-btn.primary { background: rgba(70, 92, 255, 0.1); border-color: rgba(70, 92, 255, 0.28); }
.action-btn.primary .action-btn-text { color: #465CFF; }
.action-btn.success { background: rgba(45, 190, 108, 0.1); border-color: rgba(45, 190, 108, 0.28); }
.action-btn.success .action-btn-text { color: #2DBE6C; }
.action-btn.warn { background: rgba(255, 138, 43, 0.1); border-color: rgba(255, 138, 43, 0.28); }
.action-btn.warn .action-btn-text { color: #FF8A2B; }
.action-btn.purple { background: rgba(123, 97, 255, 0.1); border-color: rgba(123, 97, 255, 0.28); }
.action-btn.purple .action-btn-text { color: #7B61FF; }
.action-btn.danger { background: rgba(255, 77, 79, 0.08); border-color: rgba(255, 77, 79, 0.28); }
.action-btn.danger .action-btn-text { color: #FF4D4F; }
.config-panel {
    padding: 12rpx 16rpx 20rpx;
    background: linear-gradient(180deg, #F5F7FC 0%, #EEF1F8 100%);
    border-top: 1rpx solid #EEF1F8;
}
.config-section {
    margin-top: 14rpx;
}
.config-section:first-child {
    margin-top: 4rpx;
}
.config-section-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 4rpx 10rpx;
}
.config-section-bar {
    width: 6rpx;
    height: 22rpx;
    border-radius: 6rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 10rpx;
    flex-shrink: 0;
}
.config-section-title {
    flex: 1;
    font-size: 24rpx;
    color: #1A1F36;
    font-weight: 700;
}
.switch-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    background: #FFFFFF;
    border-radius: 16rpx;
    border: 1rpx solid #E8ECF6;
    overflow: hidden;
    padding: 4rpx 0;
}
.switch-item {
    width: 50%;
    box-sizing: border-box;
    padding: 18rpx 18rpx;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1rpx solid #F0F2F7;
}
.switch-item:nth-last-child(1),
.switch-item:nth-last-child(2):nth-child(odd) {
    border-bottom: none;
}
.switch-label {
    flex: 1;
    min-width: 0;
    font-size: 24rpx;
    color: #3D4656;
    margin-right: 10rpx;
    line-height: 1.3;
}
.field-card {
    background: #FFFFFF;
    border-radius: 16rpx;
    border: 1rpx solid #E8ECF6;
    padding: 16rpx;
}
.field-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12rpx;
}
.field-pick {
    flex: 1;
    min-width: 0;
    padding: 10rpx 16rpx;
    background: #F7F8FC;
    border-radius: 12rpx;
}
.field-pick-label {
    display: block;
    font-size: 18rpx;
    color: #9AA3B8;
    margin-bottom: 4rpx;
}
.field-pick-value {
    display: block;
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
}
.field-pick-value.placeholder {
    color: #9AA3B8;
    font-weight: 400;
}
.field-btn {
    flex-shrink: 0;
    height: 64rpx;
    padding: 0 24rpx;
    border-radius: 12rpx;
    background: rgba(70, 92, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
}
.field-btn.success {
    background: rgba(45, 190, 108, 0.12);
}
.field-btn-text {
    font-size: 22rpx;
    font-weight: 600;
    color: #465CFF;
}
.field-btn.success .field-btn-text {
    color: #2DBE6C;
}
.unit-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin: 0 -6rpx;
}
.unit-cell {
    width: 33.33%;
    box-sizing: border-box;
    padding: 0 6rpx 12rpx;
}
.unit-caption {
    display: block;
    font-size: 18rpx;
    color: #9AA3B8;
    margin-bottom: 8rpx;
    padding-left: 4rpx;
}
.unit-number {
    min-height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F7F8FC;
    border-radius: 12rpx;
    padding: 4rpx;
}
.field-save {
    margin-top: 4rpx;
    height: 72rpx;
    border-radius: 14rpx;
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}
.field-save-text {
    font-size: 26rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.zone-add-link {
    padding: 4rpx 8rpx;
}
.zone-add-link-text {
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 600;
}
.zone-wrap {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10rpx;
}
.zone-chip {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    padding: 10rpx 10rpx 10rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.08);
    border: 1rpx solid rgba(70, 92, 255, 0.16);
}
.zone-chip-text {
    font-size: 22rpx;
    color: #465CFF;
    margin-right: 4rpx;
    font-weight: 600;
}
.zone-close {
    padding: 4rpx;
    display: flex;
    align-items: center;
}
.zone-empty {
    padding: 18rpx 8rpx;
}
.zone-empty-text {
    font-size: 22rpx;
    color: #9AA3B8;
    text-align: center;
    display: block;
}
.policy-body {
    padding: 8rpx 16rpx 24rpx;
    box-sizing: border-box;
}
.policy-group {
    margin-top: 16rpx;
}
.policy-group:first-child {
    margin-top: 8rpx;
}
.policy-group-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 4rpx 10rpx;
}
.policy-group-bar {
    width: 6rpx;
    height: 22rpx;
    border-radius: 6rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 10rpx;
    flex-shrink: 0;
}
.policy-group-title {
    font-size: 24rpx;
    color: #1A1F36;
    font-weight: 700;
}
.policy-card {
    background: #FFFFFF;
    border-radius: 16rpx;
    border: 1rpx solid #E8ECF6;
    overflow: hidden;
}
.policy-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 22rpx 20rpx;
    border-bottom: 1rpx solid #F0F2F7;
    background: #FFFFFF;
}
.policy-row.last {
    border-bottom: none;
}
.policy-copy {
    flex: 1;
    min-width: 0;
    margin-right: 16rpx;
}
.policy-title {
    display: block;
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
    line-height: 1.35;
}
.policy-desc {
    display: block;
    margin-top: 6rpx;
    font-size: 20rpx;
    color: #9AA3B8;
    line-height: 1.4;
}
.blacklist-shell {
    padding-bottom: 0;
}
.fab-add {
    position: fixed;
    right: 36rpx;
    bottom: calc(48rpx + env(safe-area-inset-bottom));
    z-index: 100;
    min-width: 120rpx;
    height: 88rpx;
    padding: 0 36rpx;
    border-radius: 999rpx;
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
    box-shadow: 0 12rpx 28rpx rgba(47, 63, 207, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
}
.fab-add-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
    letter-spacing: 2rpx;
}
.scope-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}
.scope-name { font-size: 30rpx; color: #333; }
.form-switch-row { display: flex; align-items: center; gap: 20rpx; }
.form-switch-extra { display: flex; align-items: center; gap: 10rpx; }
.price-tip {
    margin: 8px 12px;
    padding: 10px;
    background: #FFF7E6;
    border: 1px solid #FFD591;
    border-radius: 4px;
    color: #874D00;
    font-size: 24rpx;
    line-height: 1.6;
}
.price-tip-title { font-weight: bold; margin-bottom: 4px; }
.history-tags { display: flex; }
</style>

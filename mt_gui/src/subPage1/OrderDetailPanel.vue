<template>
    <view class="detail-panel">
        <scroll-view class="detail-scroll" show-scrollbar scroll-y>
            <view class="hero">
                <view class="hero-logo-bg">
                    <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
                </view>
                <view class="hero-top">
                    <view class="hero-copy">
                        <text class="hero-label">订单详情</text>
                        <text class="hero-stuff">{{ focus_plan.stuff.name }}</text>
                    </view>
                    <view class="status-pill" :class="'st-' + (focus_plan.manual_close ? 'close' : focus_plan.status)">
                        <text class="status-pill-text">{{ focus_plan.manual_close ? '已关闭' : plan_status }}</text>
                    </view>
                </view>
                <view class="process-panel">
                    <view class="process-flow">
                        <view class="process-track">
                            <view class="process-track-fill" :style="{ width: process_progress }"></view>
                        </view>
                        <view class="process-step" v-for="(step, index) in process_steps" :key="'ps-' + index">
                            <view class="process-dot" :class="step.state">
                                <view class="process-dot-ring" v-if="step.state === 'current'"></view>
                                <text class="process-dot-text" v-if="step.state === 'done'">✓</text>
                                <text class="process-dot-text" v-else-if="step.state === 'fail'">×</text>
                                <text class="process-dot-text" v-else>{{ index + 1 }}</text>
                            </view>
                            <text class="process-name" :class="step.state">{{ step.name }}</text>
                        </view>
                    </view>
                </view>
                <view class="hero-links"
                    v-if="(focus_plan.status == 3 || (focus_plan.checkout_delay && focus_plan.status == 2)) && !focus_plan.manual_close">
                    <view class="hero-ticket-btn" @click="go_to_ticket(false)">
                        <text class="hero-ticket-btn-text">查看磅单</text>
                        <fui-icon name="arrowright" size="28" color="#FFFFFF"></fui-icon>
                    </view>
                    <view class="hero-ticket-btn ghost" v-if="focus_plan.delegate" @click="go_to_ticket(true)">
                        <text class="hero-ticket-btn-text ghost">内部磅单</text>
                        <fui-icon name="arrowright" size="28" color="#FFFFFF"></fui-icon>
                    </view>
                </view>
            </view>

            <view class="body">
                <view class="section-card">
                    <view class="section-head">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">计划信息</text>
                            <text class="section-en">PLAN</text>
                        </view>
                    </view>
                    <view class="info-row">
                        <view class="info-main">
                            <text class="info-label">{{ comp_title(focus_plan.is_buy).a_title }}</text>
                            <text class="info-value">{{ focus_plan.company.name }}</text>
                            <view class="info-sub">
                                <text class="info-sub-text">{{ focus_plan.rbac_user.name }}</text>
                                <text class="info-link" @click="copy_text(focus_plan.rbac_user.phone)">{{
                                    focus_plan.rbac_user.phone }}</text>
                            </view>
                        </view>
                        <module-filter v-if="focus_plan.is_buy" require_module="buy_management">
                            <view class="mini-btn primary" v-if="focus_plan.company.id == undefined"
                                @click="prepare_choose_company">
                                <text class="mini-btn-text">指定</text>
                            </view>
                            <view class="mini-btn warn" v-else @click="show_reassign_prompt = true">
                                <text class="mini-btn-text">重新指定</text>
                            </view>
                        </module-filter>
                    </view>
                    <view class="info-row">
                        <view class="info-main">
                            <text class="info-label">{{ comp_title(focus_plan.is_buy).b_title }}</text>
                            <text class="info-value">{{ focus_plan.stuff.company.name }}</text>
                            <view class="info-sub">
                                <text class="info-sub-text">{{ focus_plan.stuff.name }} · 单价 {{ hide_order_detail_price
                                    ? '***' : focus_plan.unit_price }}</text>
                                <module-filter require_module="sale_management" v-if="!focus_plan.is_buy">
                                    <view class="mini-btn primary" @click="new_stuff_price.show = true">
                                        <text class="mini-btn-text">调价</text>
                                    </view>
                                </module-filter>
                            </view>
                        </view>
                    </view>
                    <view class="info-row linkable" @click="open_attach_pics">
                        <text class="info-label">双方资质</text>
                        <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                    </view>
                    <module-filter :rm_array="['sale_management', 'buy_management']">
                        <view class="info-row">
                            <text class="info-label">合同有效期</text>
                            <text class="info-value sm" :class="{ warn: cur_contract.nearlyExpired }">
                                {{ cur_contract.begin_time && cur_contract.end_time
                                    ? (cur_contract.begin_time + '-' + cur_contract.end_time)
                                    : '暂无合同' }}
                            </text>
                        </view>
                    </module-filter>
                    <view class="info-row" v-if="focus_plan.trans_company_name">
                        <text class="info-label">承运公司</text>
                        <text class="info-value sm">{{ focus_plan.trans_company_name }}</text>
                    </view>
                    <module-filter require_module="sale_management" v-if="!focus_plan.is_buy">
                        <view class="info-row">
                            <view class="info-main">
                                <text class="info-label">余额</text>
                                <view class="info-sub">
                                    <module-filter require_module="cash">
                                        <text class="info-value">{{ cur_contract.balance ?
                                            cur_contract.balance.toFixed(2) : 0 }}</text>
                                    </module-filter>
                                    <text class="auth-tag" :class="user_authorize == '已授权' ? 'ok' : 'bad'">
                                        {{ user_authorize }}
                                    </text>
                                </view>
                                <text class="arrears-tag" v-if="focus_plan.status == 1 && focus_plan.arrears > 0">
                                    欠款额:{{ focus_plan.arrears }} 需付{{ focus_plan.outstanding_vehicles }}车
                                </text>
                            </view>
                            <view class="mini-btn success" v-if="user_authorize == '未授权'" @click="authorize_user">
                                <text class="mini-btn-text">授权</text>
                            </view>
                        </view>
                    </module-filter>
                    <view class="info-row last">
                        <view class="info-main">
                            <text class="info-label">计划时间</text>
                            <text class="info-value sm">{{ focus_plan.plan_time }}</text>
                            <text class="info-sub-text" v-if="focus_plan.bidding_item">
                                {{ focus_plan.bidding_item.time }}出价{{ focus_plan.bidding_item.price.toFixed(2) }}中标
                            </text>
                        </view>
                        <text class="tag-plain" v-if="focus_plan.register_time && focus_plan.status != 3">已排号</text>
                    </view>
                </view>

                <view class="section-card" v-if="focus_plan.stuff.concern_fapiao">
                    <view class="info-row last">
                        <view class="info-main">
                            <text class="info-label">发票信息</text>
                            <text class="info-value sm">{{ focus_plan.fapiao_delivered ? '已开' : '未开' }}</text>
                        </view>
                        <module-filter :require_module="'sale_management'">
                            <view class="mini-btn primary" v-if="focus_plan.status != -1" @click="mark_fapiao_deliver">
                                <text class="mini-btn-text">标记{{ focus_plan.fapiao_delivered ? '未开' : '已开' }}</text>
                            </view>
                        </module-filter>
                    </view>
                </view>

                <view class="section-card trip-card">
                    <view class="section-head">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">车辆运单</text>
                            <text class="section-en">TRIP</text>
                        </view>
                        <view class="mini-btn warn" v-if="focus_plan.status != 3" @click="prepare_update">
                            <text class="mini-btn-text">修改</text>
                        </view>
                    </view>

                    <view class="trip-hero">
                        <view class="trip-plates">
                            <text class="plate-tag">{{ focus_plan.main_vehicle.plate }}</text>
                            <text class="plate-tag" v-if="focus_plan.behind_vehicle.plate">{{
                                focus_plan.behind_vehicle.plate }}</text>
                        </view>
                        <text class="gate-status-tag" :class="focus_plan.enter_time ? 'on' : 'off'">
                            {{ focus_plan.enter_time ? '已进场' : '未进场' }}
                        </text>
                    </view>

                    <view class="trip-driver" @click="copy_text(focus_plan.driver.phone)">
                        <view class="trip-driver-avatar">
                            <u-icon name="account-fill" color="#465CFF" size="20"></u-icon>
                        </view>
                        <view class="trip-driver-copy">
                            <text class="trip-driver-name">{{ focus_plan.driver.name || '司机' }}</text>
                            <text class="trip-driver-phone">{{ focus_plan.driver.phone }}</text>
                        </view>
                        <module-filter require_module="stuff">
                            <text class="info-link danger"
                                @click.stop="add_to_blacklist(focus_plan.driver.id, 'driver')">拉黑</text>
                        </module-filter>
                    </view>

                    <view class="trip-stats">
                        <view class="trip-stat">
                            <text class="trip-stat-label">主车</text>
                            <text class="trip-stat-value">{{ focus_plan.main_vehicle.plate || '-' }}</text>
                            <module-filter require_module="stuff">
                                <text class="trip-stat-link"
                                    @click="add_to_blacklist(focus_plan.main_vehicle.id, 'vehicle')">拉黑</text>
                            </module-filter>
                        </view>
                        <view class="trip-stat">
                            <text class="trip-stat-label">挂车</text>
                            <text class="trip-stat-value">{{ focus_plan.behind_vehicle.plate || '-' }}</text>
                            <module-filter require_module="stuff" v-if="focus_plan.behind_vehicle.plate">
                                <text class="trip-stat-link"
                                    @click="add_to_blacklist(focus_plan.behind_vehicle.id, 'vehicle')">拉黑</text>
                            </module-filter>
                        </view>
                        <view class="trip-stat">
                            <text class="trip-stat-label">排队</text>
                            <text class="trip-stat-value">{{ focus_plan.register_time ? focus_plan.register_number : '-'
                                }}</text>
                            <text class="trip-stat-sub" v-if="focus_plan.register_time">已排号</text>
                        </view>
                    </view>

                    <view class="trip-divider"></view>

                    <view class="trip-meta-grid">
                        <view class="trip-meta">
                            <text class="trip-meta-label">用途</text>
                            <text class="trip-meta-value">{{ focus_plan.use_for || '-' }}</text>
                        </view>
                        <view class="trip-meta">
                            <text class="trip-meta-label">装卸量</text>
                            <text class="trip-meta-value accent">{{ focus_plan.count != null ? focus_plan.count : '-'
                                }}</text>
                        </view>
                        <view class="trip-meta full" v-if="focus_plan.drop_address">
                            <text class="trip-meta-label">卸货地址</text>
                            <text class="trip-meta-value">{{ focus_plan.drop_address }}</text>
                        </view>
                        <view class="trip-meta full" v-if="focus_plan.comment">
                            <text class="trip-meta-label">备注</text>
                            <text class="trip-meta-value">{{ focus_plan.comment }}</text>
                        </view>
                        <view class="trip-meta" v-if="focus_plan.enter_time">
                            <text class="trip-meta-label">进场时间</text>
                            <text class="trip-meta-value">{{ focus_plan.enter_time }}</text>
                        </view>
                        <view class="trip-meta" v-if="focus_plan.register_time">
                            <text class="trip-meta-label">排号时间</text>
                            <text class="trip-meta-value">{{ focus_plan.register_time }}</text>
                        </view>
                        <view class="trip-meta" v-if="focus_plan.p_time">
                            <text class="trip-meta-label">皮重</text>
                            <text class="trip-meta-value">{{ focus_plan.p_weight }}</text>
                            <text class="trip-meta-sub">{{ focus_plan.p_time }}</text>
                        </view>
                        <view class="trip-meta" v-if="focus_plan.m_time">
                            <text class="trip-meta-label">毛重</text>
                            <text class="trip-meta-value">{{ focus_plan.m_weight }}</text>
                            <text class="trip-meta-sub">{{ focus_plan.m_time }}</text>
                        </view>
                    </view>

                    <view class="trip-actions">
                        <view class="trip-action-btn" v-if="focus_plan.stuff.manual_weight" @click="show_manual_weight">
                            <text class="trip-action-text">计量信息</text>
                        </view>
                        <view class="trip-action-btn primary" v-if="$has_module('scale')" @click="go_proxy_driver">
                            <u-icon name="car-fill" color="#FFFFFF" size="18"></u-icon>
                            <text class="trip-action-text light">代替司机操作</text>
                        </view>
                    </view>
                </view>

                <view class="section-card">
                    <view class="section-head">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">安检考试</text>
                            <text class="section-en">SAFE</text>
                        </view>
                        <text class="sc-count" v-if="focus_plan.sc_info && focus_plan.status == 3">
                            {{ sc_uploaded_count }}/{{ focus_plan.sc_info.length }}
                        </text>
                        <module-filter require_module="sc">
                            <view class="row-actions">
                                <view class="mini-btn primary" @click="prepare_sc_confirm">
                                    <text class="mini-btn-text">审批</text>
                                </view>
                                <view class="mini-btn warn" @click="nav_to_fc">
                                    <text class="mini-btn-text">检查</text>
                                </view>
                            </view>
                        </module-filter>
                    </view>
                    <view class="sc-grid" v-if="focus_plan.sc_info && focus_plan.status == 3">
                        <view class="sc-card" v-for="(sc_node, index) in focus_plan.sc_info" :key="'sc-' + index"
                            @click="sc_node.sc_content && sc_node.sc_content.attachment && show_sc_image(index)">
                            <view class="sc-thumb-wrap">
                                <image v-if="sc_node.sc_content && sc_node.sc_content.attachment" class="sc-thumb"
                                    :src="$convert_attach_url(sc_node.sc_content.attachment)" mode="aspectFill"></image>
                                <view class="sc-thumb sc-thumb-empty" v-else>
                                    <text class="sc-thumb-empty-text">无图</text>
                                </view>
                            </view>
                            <text class="sc-card-name">{{ sc_node.name }}</text>
                            <text class="sc-card-expire" v-if="sc_node.sc_content && sc_node.sc_content.expired_time">
                                {{ sc_node.sc_content.expired_time }}
                            </text>
                            <text class="sc-card-expire muted" v-else>未上传</text>
                        </view>
                    </view>
                    <view class="sc-empty" v-else-if="!focus_plan.sc_info">
                        <text class="sc-empty-text">点击上方「审批」查看/处理安检项</text>
                    </view>
                    <module-filter require_module="exam">
                        <view class="info-row last linkable" @click="go_exam">
                            <text class="info-label">查看考试结果</text>
                            <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                        </view>
                    </module-filter>
                </view>

                <view class="section-card last-card">
                    <view class="section-head">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">操作历史</text>
                            <text class="section-en">HISTORY</text>
                        </view>
                        <text class="history-count" v-if="history_list.length">{{ history_list.length }}条</text>
                    </view>
                    <view class="history-timeline" v-if="history_list.length">
                        <view class="history-item" v-for="(node, index) in history_visible" :key="'h-' + index"
                            :class="{ last: index === history_visible.length - 1 }">
                            <view class="history-rail">
                                <view class="history-dot" :class="'a-' + history_action_tone(node.action_type)"></view>
                                <view class="history-line" v-if="index !== history_visible.length - 1"></view>
                            </view>
                            <view class="history-body">
                                <view class="history-top">
                                    <text class="history-action">{{ node.action_type }}</text>
                                    <text class="history-op">{{ node.operator }}</text>
                                </view>
                                <text class="history-time">{{ node.time }}</text>
                            </view>
                        </view>
                    </view>
                <view class="history-more" v-if="history_list.length > history_limit"
                    @click="history_expanded = !history_expanded">
                    <text class="history-more-text">{{ history_more_text }}</text>
                    <view class="history-more-icon" :class="{ up: history_expanded }">
                        <fui-icon name="arrowdown" size="28" color="#465CFF"></fui-icon>
                    </view>
                </view>
                    <view class="history-empty" v-if="!history_list.length">
                        <text class="info-sub-text">暂无操作记录</text>
                    </view>
                </view>
            </view>
        </scroll-view>

        <view class="bottom-actions" v-if="focus_plan.status != 3 || plan_owner || can_pass_vehicle">
            <view class="bottom-actions-inner">
                <!-- 底部栏不要包 module-filter：小程序额外 view 会把 flex 按钮挤成小方块 -->
                <view class="action-chip danger" v-if="focus_plan.status != 3 && plan_owner"
                    @click="prepare_xxx_confirm(cur_cancel_url, '取消')">
                    <text class="action-chip-text">取消</text>
                </view>
                <view class="action-chip success"
                    v-if="focus_plan.status == 0 && ($has_module('sale_management') || $has_module('buy_management'))"
                    @click="prepare_xxx_confirm(cur_confirm_url, '确认')">
                    <text class="action-chip-text">确认</text>
                </view>
                <view class="action-chip warn"
                    v-if="focus_plan.status != 0 && is_allowed_order_return && ($has_module('sale_management') || $has_module('buy_management'))"
                    @click="show_rollback_confirm = true">
                    <text class="action-chip-text">回退</text>
                </view>
                <view class="action-chip danger"
                    v-if="focus_plan.status != 3 && ($has_module('sale_management') || $has_module('buy_management'))"
                    @click="prepare_xxx_confirm(cur_close_url, '关闭')">
                    <text class="action-chip-text">关闭</text>
                </view>
                <view class="action-chip success"
                    v-if="focus_plan.status == 1 && !focus_plan.is_buy && ($has_module('sale_management') || $has_module('buy_management'))"
                    @click="prepare_pay_confirm('验款')">
                    <text class="action-chip-text">验款</text>
                </view>
                <view class="action-chip danger" v-if="can_pass_vehicle && $has_module('scale')"
                    @click="prepare_xxx_confirm('/scale/cancel_check_in', '过号')">
                    <text class="action-chip-text">过号</text>
                </view>
                <view class="action-chip success"
                    v-if="$has_module('scale') && ((focus_plan.status == 2) || (focus_plan.status == 1 && focus_plan.is_buy)) && focus_plan.stuff.manual_weight"
                    @click="show_scale_input = true">
                    <text class="action-chip-text">计量</text>
                </view>
            </view>
        </view>

        <fui-backdrop :zIndex="8888" :show="show_sc" @click="show_sc = false">
            <view class="sc-image-viewer" @click.stop>
                <swiper class="sc-swiper" :current="sc_current_index" @change="on_sc_swiper_change"
                    :indicator-dots="sc_attach_urls.length > 1" :indicator-color="'rgba(255,255,255,0.5)'"
                    :indicator-active-color="'#ffffff'">
                    <swiper-item v-for="(item, index) in sc_attach_urls" :key="index">
                        <movable-area scale-area class="sc-movable-area">
                            <movable-view class="sc-movable-view" direction="all" inertia scale scale-min="1"
                                scale-max="6">
                                <image class="sc-lookimg" :src="item.src" mode="aspectFit"></image>
                            </movable-view>
                        </movable-area>
                    </swiper-item>
                </swiper>
                <view class="sc-close-button-container">
                    <fui-icon @click="show_sc = false" name="close" size="80" color="white"></fui-icon>
                </view>
                <view class="sc-index-wrap" v-if="sc_attach_urls.length > 1">
                    <text class="sc-index">{{ sc_current_index + 1 }}/{{ sc_attach_urls.length }}</text>
                </view>
            </view>
        </fui-backdrop>

        <fui-bottom-popup :show="choose_company_show" v-if="choose_company_show" @close="choose_company_show = false"
            z-index="1002">
            <fui-list>
                <list-show v-model="supplier_list" :fetch_function="get_buy_contracts" search_key="cond" height="40vh">
                    <fui-list-cell v-for="item in supplier_list" :key="item.id" arrow
                        @click="assign_supplier(item.company.id)">
                        {{ item.company.name }}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
        <fui-bottom-popup :show="show_sc_confirm" @close="show_sc_confirm = false" z-index="1002">
            <sc-execute v-if="show_sc_confirm" ref="sc_confirm" :focus_plan="focus_plan"></sc-execute>
        </fui-bottom-popup>
        <fui-modal :zIndex="1002" width="600"
            :descr="'确定要' + confirm_info + focus_plan.main_vehicle.plate + '吗？' + (focus_plan.status == 1 ? '余额可能不足' : '')"
            :show="show_xxx_confirm" v-if="show_xxx_confirm" @click="do_xxx">
        </fui-modal>
        <fui-modal :zIndex="1002" width="600" title="回退原因" :show="show_rollback_confirm" v-if="show_rollback_confirm"
            @click="do_rollback">
            <fui-form ref="rollback_form" top="100">
                <fui-input required label="原因" borderTop placeholder="请输入原因" v-model="rollback_msg"></fui-input>
            </fui-form>
        </fui-modal>
        <fui-modal :zIndex="1002" width="600" v-if="show_scale_input" :show="show_scale_input" @click="deliver">
            <fui-form ref="deliver" top="100">
                <fui-input label="皮重" borderTop placeholder="请输入重量" v-model="deliver_req.p_weight"></fui-input>
                <fui-input label="过皮时间" disabled borderTop placeholder="请输入时间" v-model="deliver_req.p_time"
                    @click="prepare_deliver_date_pick('p_time')"></fui-input>
                <fui-input label="毛重" borderTop placeholder="请输入重量" v-model="deliver_req.m_weight"></fui-input>
                <fui-input label="过毛时间" disabled borderTop placeholder="请输入时间" v-model="deliver_req.m_time"
                    @click="prepare_deliver_date_pick('m_time')"></fui-input>
                <fui-input required label="装载量" type="number" borderTop placeholder="请输入装载量"
                    v-model="deliver_req.count">
                    <fui-button type="purple" btnSize="mini" text="计算" @click="calc_count"></fui-button>
                </fui-input>
            </fui-form>
        </fui-modal>
        <fui-date-picker zIndex="1003" :show="show_deliver_date" type="5" :value="deliver_time"
            @change="choose_deliver_date" @cancel="show_deliver_date = false"></fui-date-picker>
        <fui-modal :zIndex="1003" width="600" descr="确定要重新指定吗？" v-if="show_reassign_prompt" :show="show_reassign_prompt"
            @click="reassign_supplier">
        </fui-modal>
        <fui-modal :zIndex="1004" width="600" v-if="show_update" :show="show_update" @click="update_plan">
            <fui-form ref="plan_update" :model="update_req">
                <fui-input label="主车号" v-model="update_req.main_vehicle_plate"></fui-input>
                <fui-input label="挂车号" v-model="update_req.behind_vehicle_plate"></fui-input>
                <fui-input label="司机姓名" v-model="update_req.driver_name"></fui-input>
                <fui-input label="司机电话" v-model="update_req.driver_phone"></fui-input>
                <fui-input label="承运公司" v-model="update_req.trans_company_name"></fui-input>
                <fui-input label="备注" v-model="update_req.comment"></fui-input>
            </fui-form>
        </fui-modal>
        <fui-modal :zIndex="1002" width="600" v-if="new_stuff_price.show" title="调价" :show="new_stuff_price.show"
            @cancel="cancel_new_stuff_price" @click="do_new_stuff_pirce">
            <fui-form ref="new_stuff_price_form" top="100">
                <fui-input required label="新单价" borderTop placeholder="请输入新单价"
                    v-model="new_stuff_price.price"></fui-input>
                <fui-input label="备注" borderTop placeholder="调价备注" v-model="new_stuff_price.comment"></fui-input>
            </fui-form>
        </fui-modal>
        <fui-toast ref="toast"></fui-toast>
        <fui-gallery :urls="get_both_attach" v-if="show_attach" :show="show_attach" @hide="show_attach = false"
            @change="change_index"></fui-gallery>
        <fui-button v-if="show_attach" class="downloadBtn" type="link" text="下载" @click="download_img"></fui-button>
        <fui-modal :zIndex="1002" :show="show_blackList_confirm" title="提示"
            :descr="`确定将${focus_blackList.type === 'vehicle' ? '车辆' : '司机'}添加到黑名单吗？`"
            @click="confirm_add_to_blacklist"></fui-modal>
        <measurement ref="measurement" :focus_plan="focus_plan" @refresh="refresh_detail"></measurement>
        <fui-bottom-popup :show="show_approver_pick" v-if="show_approver_pick" @close="close_approver_pick_cancel"
            z-index="1005">
            <view style="padding: 20rpx;font-weight:bold;">选择审批人</view>
            <fui-list>
                <fui-list-cell v-for="(n, idx) in approver_pick_names" :key="idx" arrow
                    @click="confirm_approver_pick(n)">{{ n }}</fui-list-cell>
            </fui-list>
        </fui-bottom-popup>
    </view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import ModuleFilterVue from '../components/ModuleFilter.vue';
import $fui from '@/components/firstui/fui-clipboard';
import moment from 'moment';
import Measurement from '../components/Measurement.vue';
import ScExecute from '../components/ScExecute.vue';

const ROLE_CONFIG = {
    customer: {
        cur_is_buy: false,
        cur_confirm_url: '',
        cur_rollback_url: '',
        cur_update_url: '/customer/order_buy_update',
        cur_cancel_url: '/customer/order_buy_cancel',
        cur_close_url: '',
    },
    sale_management: {
        cur_is_buy: false,
        cur_confirm_url: '/sale_management/order_sale_confirm',
        cur_rollback_url: '/sale_management/order_rollback',
        cur_update_url: '/sale_management/order_update',
        cur_cancel_url: '',
        cur_close_url: '/sale_management/close',
    },
    supplier: {
        cur_is_buy: true,
        cur_confirm_url: '',
        cur_rollback_url: '',
        cur_update_url: '/supplier/order_sale_update',
        cur_cancel_url: '/supplier/order_sale_cancel',
        cur_close_url: '',
    },
    buy_management: {
        cur_is_buy: true,
        cur_confirm_url: '/buy_management/order_buy_confirm',
        cur_rollback_url: '/buy_management/order_rollback',
        cur_update_url: '/buy_management/order_update',
        cur_cancel_url: '',
        cur_close_url: '/buy_management/close',
    },
};

export default {
    name: 'OrderDetailPanel',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilterVue,
        "measurement": Measurement,
        "sc-execute": ScExecute,
    },
    props: {
        plan: {
            type: Object,
            required: true,
        },
        role: {
            type: String,
            default: '',
        },
        statContextCompanyId: {
            type: Number,
            default: null,
        },
        hideOrderDetailPrice: {
            type: Boolean,
            default: true,
        },
        isAllowedOrderReturn: {
            type: Boolean,
            default: false,
        },
    },
    data: function () {
        return {
            show_blackList_confirm: false,
            focus_blackList: { type: '', id: 0 },
            show_attach: false,
            gallery_index: 0,
            new_stuff_price: { show: false, price: 0, comment: '' },
            cur_contract: { balance: 0, rbac_users: [], begin_time: '', end_time: '' },
            cur_is_buy: false,
            cur_confirm_url: '',
            cur_rollback_url: '',
            cur_update_url: '',
            cur_cancel_url: '',
            cur_close_url: '',
            supplier_list: [],
            choose_company_show: false,
            show_sc_confirm: false,
            show_deliver_date: false,
            show_scale_input: false,
            deliver_req: { count: "", m_time: '', m_weight: '', p_time: '', p_weight: '' },
            xxx_url: '',
            confirm_info: '',
            show_xxx_confirm: false,
            pay_pending_approval_auditer: '',
            approval_projects: [],
            show_approver_pick: false,
            approver_pick_names: [],
            approver_pick_resolve: null,
            show_rollback_confirm: false,
            show_sc: false,
            sc_current_index: 0,
            rollback_msg: '',
            show_reassign_prompt: false,
            show_update: false,
            update_req: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_name: '',
                driver_phone: '',
                trans_company_name: '',
            },
            deliver_time: utils.dateFormatter(new Date(), 'y-m-d h:i:s', 4, false),
            deliver_time_type: '',
            history_expanded: false,
            history_limit: 3,
            comp_title: function (is_buy) {
                if (is_buy) {
                    return { a_title: '卖方', b_title: '买方' };
                }
                return { a_title: '买方', b_title: '卖方' };
            },
        };
    },
    computed: {
        focus_plan: function () {
            return this.plan;
        },
        hide_order_detail_price: function () {
            return this.hideOrderDetailPrice;
        },
        is_allowed_order_return: function () {
            return this.isAllowedOrderReturn;
        },
        stat_context_company_id: function () {
            return this.statContextCompanyId;
        },
        get_both_attach: function () {
            const func = (path) => {
                if (path) {
                    return this.$convert_attach_url(path);
                }
                return '/static/no_att.jpg';
            };
            return [
                { src: func(this.focus_plan.company.attachment), descr: '下单方资质' },
                { src: func(this.focus_plan.stuff.company.attachment), descr: '接单方资质' },
            ];
        },
        user_authorize: function () {
            let ret = '未授权';
            (this.cur_contract.rbac_users || []).forEach(ele => {
                if (ele.id == this.focus_plan.rbac_user.id) {
                    ret = '已授权';
                }
            });
            return ret;
        },
        plan_status: function () {
            const status_map = ['未确认', '未付款', '未发车', '已关闭'];
            if (this.focus_plan.is_buy && this.focus_plan.status == 1) {
                return '待处理';
            }
            if (this.focus_plan.status == 2) {
                return this.focus_plan.enter_time ? '已入场' : '未入场';
            }
            if (this.focus_plan.status == 3 && !this.focus_plan.manual_close) {
                return '已完成';
            }
            return status_map[this.focus_plan.status] || '';
        },
        process_steps: function () {
            const p = this.focus_plan || {};
            const status = Number(p.status);
            const is_buy = !!p.is_buy;
            const entered = !!p.enter_time;
            const closed = !!p.manual_close;

            const step_state = (done, current) => {
                if (done) return 'done';
                if (current) return 'current';
                return 'todo';
            };

            let enter_name = '入场';
            let enter_state = 'todo';
            if (status === 2) {
                enter_name = entered ? '已入场' : '未入场';
                enter_state = closed ? 'done' : 'current';
            } else if (status > 2) {
                enter_name = entered ? '已入场' : '入场';
                enter_state = 'done';
            }

            return [{
                name: status > 0 ? '已确认' : '确认',
                state: step_state(status > 0, !closed && status === 0),
            }, {
                name: is_buy
                    ? (status > 1 ? '已处理' : '处理')
                    : (status > 1 ? '已付款' : '付款'),
                state: step_state(status > 1, !closed && status === 1),
            }, {
                name: enter_name,
                state: enter_state,
            }, {
                name: closed ? '已关闭' : (status === 3 ? '已完成' : '完成'),
                state: closed ? 'fail' : step_state(status === 3, false),
            }];
        },
        process_progress: function () {
            const steps = this.process_steps;
            if (!steps.length) return '0%';
            let idx = 0;
            steps.forEach((step, i) => {
                if (step.state === 'done' || step.state === 'fail') {
                    idx = i;
                } else if (step.state === 'current') {
                    idx = Math.max(idx, i - 0.15);
                }
            });
            return ((idx / (steps.length - 1)) * 100) + '%';
        },
        sc_attach_urls: function () {
            let ret = [];
            if (this.focus_plan.sc_info) {
                this.focus_plan.sc_info.forEach(ele => {
                    if (ele.sc_content && ele.sc_content.attachment) {
                        ret.push({
                            src: this.$convert_attach_url(ele.sc_content.attachment),
                            descr: ele.name
                        });
                    }
                });
            }
            return ret;
        },
        sc_uploaded_count: function () {
            if (!this.focus_plan.sc_info) {
                return 0;
            }
            return this.focus_plan.sc_info.filter(ele => ele.sc_content && ele.sc_content.attachment).length;
        },
        history_list: function () {
            const list = (this.focus_plan && this.focus_plan.plan_histories) || [];
            // 最新在前，折叠时优先展示最近操作
            return list.slice().reverse();
        },
        history_visible: function () {
            if (this.history_expanded || this.history_list.length <= this.history_limit) {
                return this.history_list;
            }
            return this.history_list.slice(0, this.history_limit);
        },
        history_more_text: function () {
            return this.history_expanded ? '收起' : ('展开全部 ' + this.history_list.length + ' 条');
        },
        plan_owner: function () {
            let self = uni.getStorageSync('self_info');
            return self && self.id == this.focus_plan.rbac_user.id;
        },
        can_pass_vehicle: function () {
            if (!this.focus_plan || !this.focus_plan.register_time) {
                return false;
            }
            if (this.focus_plan.enter_time) {
                return false;
            }
            const expect_status = this.focus_plan.is_buy ? 1 : 2;
            return this.focus_plan.status === expect_status;
        },
    },
    methods: {
        init_module_urls: function (role) {
            const cfg = ROLE_CONFIG[role];
            if (!cfg) {
                return;
            }
            this.cur_is_buy = cfg.cur_is_buy;
            this.cur_confirm_url = cfg.cur_confirm_url;
            this.cur_rollback_url = cfg.cur_rollback_url;
            this.cur_update_url = cfg.cur_update_url;
            this.cur_cancel_url = cfg.cur_cancel_url;
            this.cur_close_url = cfg.cur_close_url;
        },
        make_context_req: function (body = {}) {
            const ret = { ...body };
            if (this.role === 'sale_management' && this.stat_context_company_id != null) {
                ret.stat_context_company_id = this.stat_context_company_id;
            }
            return ret;
        },
        load_contract: async function (plan) {
            // 仅管理端角色拉合同；买方/供应商身份有销售模块时误调会报「无权限」
            if (!plan || !plan.company || !plan.company.id) {
                return;
            }
            if (this.role !== 'sale_management' && this.role !== 'buy_management') {
                return;
            }
            try {
                let url = this.cur_is_buy ? '/buy_management/get_contract_by_supplier' : '/sale_management/get_contract_by_customer';
                let contract_req = {};
                if (this.cur_is_buy) {
                    contract_req.supplier_id = plan.company.id;
                } else {
                    contract_req.customer_id = plan.company.id;
                    // 普通公司不传 supply_company_id，避免与本公司不一致时后端直接报「无权限」
                    // 仅集团销售主体切换时需要带上物料归属公司
                    const self_info = uni.getStorageSync('self_info') || {};
                    const supply_id = plan.stuff && plan.stuff.company && plan.stuff.company.id;
                    if (supply_id && self_info.company_is_group === true) {
                        contract_req.supply_company_id = supply_id;
                    }
                }
                contract_req = this.make_context_req(contract_req);
                // 合同为辅助信息，失败不弹「无权限」打断详情页
                let resp = await this.$send_req(url, contract_req, true, true);
                const oneMonthFromNow = moment().add(1, 'month');
                const contractEndDate = moment(resp.end_time);
                const monthsDifference = contractEndDate.diff(moment(), 'months', true);
                const diffOneMonth = monthsDifference > 0 && monthsDifference <= 1;
                if (diffOneMonth) {
                    resp.nearlyExpired = contractEndDate.isBefore(oneMonthFromNow);
                }
                this.cur_contract = resp;
            } catch (error) {
                this.cur_contract = { balance: 0, rbac_users: [], begin_time: '', end_time: '' };
                console.warn('load_contract failed', error);
            }
        },
        refresh_detail: function () {
            this.$emit('refresh');
        },
        get_pay_url: async function () {
            let verify_pay_by_cash = (await this.$send_req('/stuff/get_verify_pay_config', {})).verify_pay_by_cash;
            let url_prefix = '/sale_management';
            if (verify_pay_by_cash) {
                url_prefix = '/cash';
            }
            return url_prefix + '/order_sale_pay';
        },
        nav_to_fc: function () {
            uni.navigateTo({ url: '/subPage1/FcExecute?plan_id=' + this.focus_plan.id });
        },
        change_index: function (e) {
            this.gallery_index = e.index;
        },
        download_img: function () {
            const imgs = [this.focus_plan.company.attachment, this.focus_plan.stuff.company.attachment];
            this.$download_file(this.$convert_attach_url(imgs[this.gallery_index]));
        },
        open_attach_pics: function () {
            this.show_attach = true;
        },
        mark_fapiao_deliver: async function () {
            await this.$send_req('/sale_management/set_fapiao_delivered', {
                plan_id: this.focus_plan.id,
                delivered: !this.focus_plan.fapiao_delivered
            });
            this.refresh_detail();
        },
        refresh_approval_projects: async function () {
            try {
                const ret = await this.$send_req('/approval/get_approval_projects', {});
                this.approval_projects = ret.projects || [];
            } catch (err) {
                console.warn('refresh_approval_projects failed', err);
                this.approval_projects = [];
            }
        },
        approval_item: function (key) {
            return (this.approval_projects || []).find((p) => p.key === key);
        },
        pick_submit_specify_auditer: async function () {
            try {
                const ret = await this.$send_req('/approval/get_auditer_pick_list', { pageNo: 0 });
                const rows = ret.all_user || [];
                if (!rows.length) {
                    this.$refs.toast.show({ text: '无可选用户' });
                    return '';
                }
                this.approver_pick_names = rows.map((u) => u.name);
                return new Promise((resolve) => {
                    this.approver_pick_resolve = resolve;
                    this.show_approver_pick = true;
                });
            } catch (err) {
                console.warn('pick_submit_specify_auditer failed', err);
                return '';
            }
        },
        confirm_approver_pick: function (name) {
            this.show_approver_pick = false;
            const r = this.approver_pick_resolve;
            this.approver_pick_resolve = null;
            if (r) r(name);
        },
        close_approver_pick_cancel: function () {
            this.show_approver_pick = false;
            const r = this.approver_pick_resolve;
            this.approver_pick_resolve = null;
            if (r) r('');
        },
        reassign_supplier: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/buy_management/assign_supplier', {
                    plan_id: this.focus_plan.id,
                    supplier_id: 0
                });
            }
            this.show_reassign_prompt = false;
            this.refresh_detail();
        },
        assign_supplier: async function (id) {
            await this.$send_req('/buy_management/assign_supplier', {
                plan_id: this.focus_plan.id,
                supplier_id: id
            });
            this.choose_company_show = false;
            this.refresh_detail();
        },
        get_buy_contracts: async function (pageNo) {
            if (!this.$has_module('buy_management')) {
                return [];
            }
            let res = await this.$send_req('/buy_management/contract_get', { pageNo: pageNo });
            res.contracts.forEach(ele => {
                ele.cond = ele.company.name;
            });
            return res.contracts;
        },
        prepare_choose_company: function () {
            this.choose_company_show = true;
        },
        go_to_ticket: function (is_internal) {
            uni.navigateTo({
                url: '/subPage1/Ticket?id=' + this.focus_plan.id + '&is_internal=' + is_internal
            });
        },
        prepare_sc_confirm: function () {
            this.show_sc_confirm = true;
            this.$nextTick(() => {
                this.$refs.sc_confirm.refresh();
            });
        },
        copy_text: function (e) {
            $fui.getClipboardData(e, res => {
                if (res) {
                    uni.showToast({ title: '复制成功', icon: 'success', duration: 2000 });
                }
            });
        },
        calc_count: function () {
            this.deliver_req.count = Math.abs(this.deliver_req.p_weight - this.deliver_req.m_weight);
            this.deliver_req.count = utils.moneyFormatter(this.deliver_req.count);
        },
        deliver: async function (e) {
            if (e.index == 1) {
                let rules = [
                    { name: 'count', rule: ['required'], msg: ['请输入装载量'] },
                    { name: 'p_weight', rule: ['isAmount'], msg: ['重量需要是数字'] },
                    { name: 'm_weight', rule: ['isAmount'], msg: ['重量需要是数字'] },
                ];
                let val_ret = await this.$refs.deliver.validator(this.deliver_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.deliver_req.plan_id = this.focus_plan.id;
                this.deliver_req.count = Number.parseFloat(this.deliver_req.count);
                this.deliver_req.p_weight = Number.parseFloat(this.deliver_req.p_weight);
                this.deliver_req.m_weight = Number.parseFloat(this.deliver_req.m_weight);
                await this.$send_req('/scale/deliver', this.deliver_req);
                this.deliver_req = { count: "", m_time: '', m_weight: '', p_time: '', p_weight: '' };
                this.refresh_detail();
            }
            this.show_scale_input = false;
        },
        prepare_deliver_date_pick: function (time_type) {
            this.deliver_time_type = time_type;
            this.show_deliver_date = true;
        },
        choose_deliver_date: function (e) {
            this.deliver_req[this.deliver_time_type] = e.result;
            this.show_deliver_date = false;
        },
        do_xxx: async function (e) {
            if (e.index == 1) {
                let body = { plan_id: this.focus_plan.id };
                if (this.pay_pending_approval_auditer && this.xxx_url?.includes('order_sale_pay')) {
                    body.approval_auditer = this.pay_pending_approval_auditer;
                }
                await this.$send_req(this.xxx_url, body);
                this.refresh_detail();
            }
            this.pay_pending_approval_auditer = '';
            this.show_xxx_confirm = false;
        },
        validate_new_stuff_price_form: async function () {
            const rules = [{
                name: 'unit_price',
                rule: ['required', 'isNumber'],
                msg: ['请输入新单价', '请输入正确的金额']
            }];
            const val_ret = await this.$refs.new_stuff_price_form.validator({
                unit_price: this.new_stuff_price.price
            }, rules);
            return val_ret.isPassed;
        },
        resolve_closed_order_price_submit_auditer: async function () {
            await this.refresh_approval_projects();
            const p = this.approval_item('closed_order_price');
            if (!p || !p.enabled || p.approver_mode !== 'submit_specify') {
                return { ok: true, auditer: '' };
            }
            const specify = await this.pick_submit_specify_auditer();
            if (!specify) {
                return { ok: false, auditer: '' };
            }
            return { ok: true, auditer: specify };
        },
        do_new_stuff_pirce: async function (e) {
            if (e.index !== 1) {
                this.cancel_new_stuff_price();
                return;
            }
            if (!(await this.validate_new_stuff_price_form())) {
                return;
            }
            const auditerRes = await this.resolve_closed_order_price_submit_auditer();
            if (!auditerRes.ok) {
                return;
            }
            const price_req = {
                unit_price: Number(this.new_stuff_price.price),
                plan_id: this.focus_plan.id + '',
                comment: this.new_stuff_price.comment
            };
            if (auditerRes.auditer) {
                price_req.approval_auditer = auditerRes.auditer;
            }
            try {
                await this.$send_req("/stuff/change_price_by_plan", price_req);
            } catch (error) {
                this.$refs.toast.show({ text: error });
            } finally {
                this.cancel_new_stuff_price();
                this.refresh_detail();
            }
        },
        cancel_new_stuff_price: function () {
            this.new_stuff_price.price = 0;
            this.new_stuff_price.comment = "";
            this.new_stuff_price.show = false;
        },
        show_sc_image: function (index) {
            let currentIndex = 0;
            let count = 0;
            if (this.focus_plan.sc_info) {
                for (let i = 0; i < this.focus_plan.sc_info.length; i++) {
                    if (this.focus_plan.sc_info[i].sc_content && this.focus_plan.sc_info[i].sc_content.attachment) {
                        if (i === index) {
                            currentIndex = count;
                            break;
                        }
                        count++;
                    }
                }
            }
            this.sc_current_index = currentIndex;
            this.show_sc = true;
        },
        on_sc_swiper_change: function (e) {
            this.sc_current_index = e.detail.current;
        },
        do_rollback: async function (e) {
            if (e.index == 1) {
                let rules = [{ name: 'rollback_msg', rule: ['required'], msg: ['请输入原因'] }];
                let val_ret = await this.$refs.rollback_form.validator({ rollback_msg: this.rollback_msg }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req(this.cur_rollback_url, {
                    plan_id: this.focus_plan.id,
                    msg: this.rollback_msg
                });
                this.refresh_detail();
            }
            this.show_rollback_confirm = false;
        },
        prepare_pay_confirm: async function (info) {
            this.pay_pending_approval_auditer = '';
            await this.refresh_approval_projects();
            const p = this.approval_item('manual_verify_pay');
            if (p && p.enabled && p.approver_mode === 'submit_specify') {
                const name = await this.pick_submit_specify_auditer();
                if (!name) {
                    return;
                }
                this.pay_pending_approval_auditer = name;
            }
            this.prepare_xxx_confirm(await this.get_pay_url(), info);
        },
        prepare_xxx_confirm: function (url, info) {
            this.show_xxx_confirm = true;
            this.confirm_info = info;
            this.xxx_url = url;
        },
        authorize_user: async function () {
            await this.$send_req('/sale_management/authorize_user', {
                contract_id: this.cur_contract.id,
                phone: this.focus_plan.rbac_user.phone,
            });
            this.refresh_detail();
        },
        update_plan: async function (e) {
            if (e.index == 1) {
                let rules = [
                    { name: 'main_vehicle_plate', rule: ['isCarNo'], msg: ['请填写正确的车牌号'] },
                    { name: 'behind_vehicle_plate', rule: ['isCarNo'], msg: ['请填写正确的车牌号'] },
                    { name: 'driver_phone', rule: ['isMobile'], msg: ['请填写正确的手机号'] }
                ];
                let val_ret = await this.$refs.plan_update.validator(this.update_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.update_req.main_vehicle_plate == this.focus_plan.main_vehicle.plate) {
                    delete this.update_req.main_vehicle_plate;
                }
                if (this.update_req.behind_vehicle_plate == this.focus_plan.behind_vehicle.plate) {
                    delete this.update_req.behind_vehicle_plate;
                }
                if (this.update_req.driver_name == this.focus_plan.driver.name) {
                    delete this.update_req.driver_name;
                }
                if (this.update_req.driver_phone == this.focus_plan.driver.phone) {
                    delete this.update_req.driver_phone;
                }
                if (this.update_req.trans_company_name == (this.focus_plan.trans_company_name || '')) {
                    delete this.update_req.trans_company_name;
                }
                if (this.update_req.comment == this.focus_plan.comment) {
                    delete this.update_req.comment;
                }
                this.update_req.plan_id = this.focus_plan.id;
                await this.$send_req(this.cur_update_url, this.update_req);
                this.refresh_detail();
            }
            this.show_update = false;
        },
        prepare_update: function () {
            this.show_update = true;
            this.update_req.main_vehicle_plate = this.focus_plan.main_vehicle.plate;
            this.update_req.behind_vehicle_plate = this.focus_plan.behind_vehicle.plate;
            this.update_req.driver_name = this.focus_plan.driver.name;
            this.update_req.driver_phone = this.focus_plan.driver.phone;
            this.update_req.trans_company_name = this.focus_plan.trans_company_name || '';
            this.update_req.comment = this.focus_plan.comment;
        },
        add_to_blacklist: async function (id, type) {
            this.focus_blackList = { type: type, id: id };
            this.show_blackList_confirm = true;
        },
        confirm_add_to_blacklist: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/stuff/add_to_blacklist', {
                    type: this.focus_blackList.type,
                    ids: this.focus_blackList.id.toString(),
                    reason: `违规${this.focus_blackList.type === 'vehicle' ? '车辆' : '司机'}`
                });
                this.$refs.toast.show({ text: '添加成功' });
            }
            this.show_blackList_confirm = false;
        },
        show_manual_weight: function () {
            this.$refs.measurement.show();
        },
        go_proxy_driver: function () {
            uni.navigateTo({
                url: '/subPage1/Driver?driver_phone=' + this.focus_plan.driver.phone
            });
        },
        go_exam: function () {
            uni.navigateTo({
                url: '/subPage1/PlanExam?plan_id=' + this.focus_plan.id
            });
        },
        history_action_tone: function (action) {
            const text = String(action || '');
            if (text.indexOf('关闭') !== -1 || text.indexOf('取消') !== -1 || text.indexOf('删除') !== -1) {
                return 'danger';
            }
            if (text.indexOf('确认') !== -1 || text.indexOf('验款') !== -1 || text.indexOf('通过') !== -1) {
                return 'success';
            }
            if (text.indexOf('回退') !== -1 || text.indexOf('调价') !== -1 || text.indexOf('修改') !== -1) {
                return 'warn';
            }
            return 'primary';
        },
    },
    watch: {
        plan: {
            immediate: true,
            handler: async function (plan) {
                if (!plan || !plan.id) {
                    return;
                }
                if (this.role) {
                    this.init_module_urls(this.role);
                }
                await this.load_contract(plan);
            },
        },
        role: {
            immediate: true,
            handler: function (role) {
                if (role) {
                    this.init_module_urls(role);
                }
            },
        },
    },
}
</script>

<style scoped>
.detail-panel {
    min-height: 100vh;
    background: #F2F4FA;
}

.detail-scroll {
    height: 100vh;
    box-sizing: border-box;
    padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.hero {
    position: relative;
    padding: 28rpx 28rpx 36rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}

.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 260rpx;
    height: 260rpx;
    opacity: 0.16;
    pointer-events: none;
}

.hero-logo-img {
    width: 100%;
    height: 100%;
}

.hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16rpx;
}

.hero-copy {
    flex: 1;
    min-width: 0;
}

.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}

.hero-stuff {
    display: block;
    margin-top: 10rpx;
    font-size: 40rpx;
    color: #FFFFFF;
    font-weight: 700;
}

.process-panel {
    position: relative;
    z-index: 1;
    margin-top: 28rpx;
    padding: 28rpx 16rpx 22rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.14);
    border: 1rpx solid rgba(255, 255, 255, 0.22);
    box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.18);
}

.process-flow {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
}

.process-track {
    position: absolute;
    left: 12.5%;
    right: 12.5%;
    top: 22rpx;
    height: 4rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
}

.process-track-fill {
    height: 100%;
    border-radius: 999rpx;
    background: linear-gradient(90deg, #FFFFFF 0%, #FFE0C2 100%);
    transition: width 0.35s ease;
}

.process-step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    position: relative;
    z-index: 1;
}

.process-dot {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: rgba(36, 56, 180, 0.45);
    border: 2rpx solid rgba(255, 255, 255, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    position: relative;
}

.process-dot.done {
    background: #FFFFFF;
    border-color: #FFFFFF;
    box-shadow: 0 4rpx 12rpx rgba(20, 30, 90, 0.18);
}

.process-dot.current {
    background: linear-gradient(145deg, #FFC48A 0%, #FF8F3F 100%);
    border-color: #FFFFFF;
    box-shadow: 0 6rpx 16rpx rgba(255, 143, 63, 0.45);
}

.process-dot.fail {
    background: linear-gradient(145deg, #FF8A8A 0%, #FF4D4F 100%);
    border-color: #FFFFFF;
}

.process-dot-ring {
    position: absolute;
    left: -8rpx;
    top: -8rpx;
    right: -8rpx;
    bottom: -8rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(255, 176, 107, 0.55);
    animation: process-pulse 1.6s ease-out infinite;
}

.process-dot-text {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 700;
    line-height: 1;
}

.process-dot.done .process-dot-text {
    color: #3D52F0;
    font-size: 22rpx;
}

.process-dot.current .process-dot-text,
.process-dot.fail .process-dot-text {
    color: #FFFFFF;
}

.process-name {
    margin-top: 14rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.55);
    text-align: center;
    line-height: 1.2;
    letter-spacing: 1rpx;
}

.process-name.done {
    color: rgba(255, 255, 255, 0.92);
    font-weight: 600;
}

.process-name.current {
    color: #FFE4C8;
    font-weight: 700;
}

.process-name.fail {
    color: #FFD0D0;
    font-weight: 700;
}

@keyframes process-pulse {
    0% {
        transform: scale(0.92);
        opacity: 0.9;
    }

    70% {
        transform: scale(1.18);
        opacity: 0;
    }

    100% {
        transform: scale(1.18);
        opacity: 0;
    }
}

.status-pill {
    flex-shrink: 0;
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.2);
}

.status-pill-text {
    font-size: 22rpx;
    color: #FFFFFF;
    font-weight: 700;
}

.status-pill.st-0 {
    background: rgba(255, 255, 255, 0.22);
}

.status-pill.st-1 {
    background: rgba(255, 138, 43, 0.95);
}

.status-pill.st-2 {
    background: rgba(19, 194, 194, 0.95);
}

.status-pill.st-3 {
    background: rgba(45, 190, 108, 0.95);
}

.status-pill.st-close {
    background: rgba(255, 77, 79, 0.95);
}

.hero-links {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-top: 22rpx;
}
.hero-ticket-btn {
    flex: 1;
    min-width: 240rpx;
    height: 72rpx;
    padding: 0 24rpx;
    border-radius: 16rpx;
    background: #2DBE6C;
    box-shadow: 0 8rpx 20rpx rgba(45, 190, 108, 0.35);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    box-sizing: border-box;
}
.hero-ticket-btn:active {
    opacity: 0.92;
}
.hero-ticket-btn.ghost {
    background: rgba(45, 190, 108, 0.22);
    border: 2rpx solid rgba(255, 255, 255, 0.9);
    box-shadow: none;
}
.hero-ticket-btn-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.hero-ticket-btn-text.ghost {
    color: #FFFFFF;
}

.bottom-actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 980;
    background: #FFFFFF;
    border-top: 1rpx solid #EEF1F8;
    box-shadow: 0 -8rpx 24rpx rgba(40, 58, 120, 0.08);
    padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.bottom-actions-inner {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    width: 100%;
}

.bottom-actions-inner .action-chip {
    flex: 1;
    min-width: 0;
    margin-right: 12rpx;
}

.bottom-actions-inner .action-chip:last-child {
    margin-right: 0;
}

.action-chip {
    height: 80rpx;
    padding: 0 12rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.action-chip-text {
    font-size: 26rpx;
    color: #FFFFFF;
    font-weight: 700;
}

.action-chip.success {
    background: linear-gradient(145deg, #6FDB9A 0%, #2DBE6C 100%);
}

.action-chip.warn {
    background: linear-gradient(145deg, #FFB06B 0%, #FF8A2B 100%);
}

.action-chip.danger {
    background: linear-gradient(145deg, #FF8A8B 0%, #FF4D4F 100%);
}

.body {
    margin-top: -16rpx;
    padding: 0 24rpx 48rpx;
    position: relative;
    z-index: 2;
}

.section-card {
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    margin-bottom: 20rpx;
    overflow: hidden;
}

.section-card.last-card {
    margin-bottom: 0;
}

.section-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 22rpx 24rpx 8rpx;
    background: linear-gradient(90deg, #F3F5FF 0%, #FFFFFF 70%);
    gap: 12rpx;
}

.section-bar {
    width: 8rpx;
    height: 34rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    flex-shrink: 0;
}

.section-titles {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.section-title {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
}

.section-en {
    margin-top: 2rpx;
    font-size: 16rpx;
    color: #9AA3B8;
    letter-spacing: 2rpx;
}

.info-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding: 22rpx 24rpx;
    border-top: 1rpx solid #EEF1F8;
}

.info-row.last {
    border-bottom: none;
}

.info-row.tight {
    padding-top: 12rpx;
}

.info-row.linkable:active {
    background: #F7F8FE;
}

.gate-status-tag {
    flex-shrink: 0;
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
}

.gate-status-tag.on {
    background: rgba(45, 190, 108, 0.14);
    color: #1FA85A;
}

.gate-status-tag.off {
    background: rgba(138, 148, 166, 0.14);
    color: #5E6A82;
}

.trip-card {
    overflow: hidden;
}

.trip-hero {
    margin: 0 20rpx;
    padding: 22rpx 20rpx;
    border-radius: 18rpx;
    background: linear-gradient(135deg, #EEF1FF 0%, #F7F8FE 55%, #FFFFFF 100%);
    border: 1rpx solid rgba(70, 92, 255, 0.14);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
}

.trip-plates {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10rpx;
}

.plate-tag {
    padding: 8rpx 14rpx;
    border-radius: 8rpx;
    background: #F5D000;
    color: #1A1A1A;
    font-size: 26rpx;
    font-weight: 700;
    border: 2rpx solid #1A1A1A;
}

.trip-driver {
    margin: 16rpx 20rpx 0;
    padding: 16rpx 18rpx;
    border-radius: 16rpx;
    background: #F7F8FE;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 14rpx;
}

.trip-driver-avatar {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(70, 92, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.trip-driver-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
}

.trip-driver-name {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
}

.trip-driver-phone {
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 600;
}

.trip-stats {
    margin: 16rpx 20rpx 0;
    display: flex;
    flex-direction: row;
    gap: 12rpx;
}

.trip-stat {
    flex: 1;
    min-width: 0;
    padding: 16rpx 12rpx;
    border-radius: 14rpx;
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6rpx;
}

.trip-stat-label {
    font-size: 20rpx;
    color: #9AA3B8;
}

.trip-stat-value {
    width: 100%;
    font-size: 24rpx;
    color: #1A1F36;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.trip-stat-sub {
    font-size: 18rpx;
    color: #6B7CFF;
}

.trip-stat-link {
    font-size: 18rpx;
    color: #FF4D4F;
    font-weight: 600;
}

.trip-divider {
    margin: 20rpx 24rpx 0;
    height: 1rpx;
    background: #EEF1F8;
}

.trip-meta-grid {
    margin: 8rpx 12rpx 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0 4rpx;
}

.trip-meta {
    width: 50%;
    box-sizing: border-box;
    padding: 14rpx 12rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.trip-meta.full {
    width: 100%;
}

.trip-meta-label {
    font-size: 20rpx;
    color: #9AA3B8;
}

.trip-meta-value {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
    word-break: break-all;
    line-height: 1.35;
}

.trip-meta-value.accent {
    color: #2F3FCF;
    font-size: 30rpx;
    font-weight: 700;
}

.trip-meta-sub {
    font-size: 18rpx;
    color: #9AA3B8;
}

.trip-actions {
    margin: 8rpx 20rpx 20rpx;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 12rpx;
}

.trip-action-btn {
    flex: 1;
    min-width: 0;
    height: 72rpx;
    padding: 0 18rpx;
    border-radius: 16rpx;
    background: #F1F3FF;
    border: 1rpx solid rgba(70, 92, 255, 0.16);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    box-sizing: border-box;
}

.trip-action-btn.primary {
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
    border-color: transparent;
    box-shadow: 0 8rpx 18rpx rgba(47, 63, 207, 0.22);
}

.trip-action-text {
    font-size: 24rpx;
    color: #2F3FCF;
    font-weight: 700;
}

.trip-action-text.light {
    color: #FFFFFF;
}

.info-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.info-label {
    font-size: 22rpx;
    color: #8A94A6;
}

.info-value {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 600;
    word-break: break-all;
}

.info-value.sm {
    font-size: 26rpx;
    font-weight: 500;
}

.info-value.warn {
    color: #FF8A2B;
}

.info-sub {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 12rpx;
}

.info-sub-text {
    font-size: 22rpx;
    color: #8A94A6;
}

.info-link {
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 600;
}

.info-link.danger {
    color: #FF4D4F;
}

.mini-btn {
    flex-shrink: 0;
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
}

.mini-btn-text {
    font-size: 22rpx;
    color: #FFFFFF;
    font-weight: 700;
}

.mini-btn.primary {
    background: #465CFF;
}

.mini-btn.warn {
    background: #FF8A2B;
}

.mini-btn.success {
    background: #2DBE6C;
}

.row-actions {
    display: flex;
    flex-direction: row;
    gap: 12rpx;
}

.arrears-tag {
    margin-top: 4rpx;
    font-size: 20rpx;
    color: #FF8A2B;
}
.auth-tag {
    flex-shrink: 0;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
}
.auth-tag.ok {
    color: #1FA85A;
    background: rgba(45, 190, 108, 0.14);
}
.auth-tag.bad {
    color: #FF8A2B;
    background: rgba(255, 138, 43, 0.14);
}

.tag-plain {
    flex-shrink: 0;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.12);
    color: #465CFF;
    font-size: 20rpx;
    font-weight: 600;
}

.history-count {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 700;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.1);
}

.history-timeline {
    padding: 8rpx 24rpx 8rpx 28rpx;
}

.history-item {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 16rpx;
    min-height: 72rpx;
}

.history-rail {
    width: 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
}

.history-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-top: 10rpx;
    background: #465CFF;
    box-shadow: 0 0 0 6rpx rgba(70, 92, 255, 0.12);
    flex-shrink: 0;
}

.history-dot.a-success {
    background: #2DBE6C;
    box-shadow: 0 0 0 6rpx rgba(45, 190, 108, 0.14);
}

.history-dot.a-warn {
    background: #FF8A2B;
    box-shadow: 0 0 0 6rpx rgba(255, 138, 43, 0.14);
}

.history-dot.a-danger {
    background: #FF4D4F;
    box-shadow: 0 0 0 6rpx rgba(255, 77, 79, 0.14);
}

.history-dot.a-primary {
    background: #465CFF;
    box-shadow: 0 0 0 6rpx rgba(70, 92, 255, 0.12);
}

.history-line {
    flex: 1;
    width: 2rpx;
    margin-top: 6rpx;
    background: #E6EAF5;
}

.history-body {
    flex: 1;
    min-width: 0;
    padding: 4rpx 0 18rpx;
}

.history-item.last .history-body {
    padding-bottom: 8rpx;
}

.history-top {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
}

.history-action {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 700;
}

.history-op {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #5A6478;
    max-width: 240rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.history-time {
    margin-top: 4rpx;
    font-size: 20rpx;
    color: #9AA3B8;
}

.history-more {
    margin: 0 20rpx 18rpx;
    height: 64rpx;
    border-radius: 14rpx;
    background: #F7F8FE;
    border: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
}

.history-more:active {
    background: #EEF1FF;
}

.history-more-text {
    font-size: 24rpx;
    color: #465CFF;
    font-weight: 600;
}

.history-more-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
}

.history-more-icon.up {
    transform: rotate(180deg);
}

.history-empty {
    padding: 28rpx 24rpx;
    text-align: center;
}

.downloadBtn {
    position: absolute;
    z-index: 2000;
    top: 20rpx;
    right: 20rpx;
}

.sc-count {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 700;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.1);
}

.sc-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 4rpx 12rpx 16rpx;
}

.sc-card {
    width: 33.33%;
    box-sizing: border-box;
    padding: 8rpx;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border-radius: 14rpx;
}

.sc-card:active .sc-thumb-wrap {
    opacity: 0.85;
}

.sc-card:active .sc-card-name {
    color: #2F3FCF;
}

.sc-thumb-wrap {
    width: 100%;
    height: 140rpx;
    border-radius: 10rpx;
    overflow: hidden;
    background: #E8ECF5;
}

.sc-thumb {
    width: 100%;
    height: 140rpx;
    display: block;
}

.sc-thumb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
}

.sc-thumb-empty-text {
    font-size: 22rpx;
    color: #9AA3B8;
}

.sc-card-name {
    margin-top: 10rpx;
    font-size: 22rpx;
    color: #1A1F36;
    font-weight: 600;
    line-height: 1.3;
    height: 56rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-all;
}

.sc-card-expire {
    margin-top: 4rpx;
    font-size: 18rpx;
    color: #6B7CFF;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sc-card-expire.muted {
    color: #9AA3B8;
}

.sc-empty {
    padding: 20rpx 24rpx 28rpx;
}

.sc-empty-text {
    font-size: 22rpx;
    color: #9AA3B8;
}

.sc-image-viewer {
    width: 100%;
    height: 100%;
    position: relative;
    padding-bottom: 200rpx;
    box-sizing: border-box;
}

.sc-swiper {
    width: 100%;
    height: 100%;
}

.sc-movable-area {
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.sc-movable-view {
    height: 100%;
    width: 100%;
}

.sc-lookimg {
    width: 100%;
    height: 100%;
}

.sc-close-button-container {
    position: absolute;
    bottom: 40rpx;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 8889;
}

.sc-index-wrap {
    position: absolute;
    top: 40rpx;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 8889;
}

.sc-index {
    color: white;
    font-size: 32rpx;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 10rpx 20rpx;
    border-radius: 20rpx;
}
</style>

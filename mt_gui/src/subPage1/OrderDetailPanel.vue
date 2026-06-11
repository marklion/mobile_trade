<template>
<view>
    <scroll-view style="height: 100vh;" show-scrollbar scroll-y>
        <view class="group_sep">
            <u-cell-group title="计划信息">
                <u-cell :title="comp_title(focus_plan.is_buy).a_title" :value="focus_plan.company.name">
                    <view slot="label">
                        <fui-text :text="focus_plan.rbac_user.name" size="24"></fui-text>
                        <fui-text type="primary" :text="focus_plan.rbac_user.phone" size="24" textType="mobile" @click="copy_text(focus_plan.rbac_user.phone)"></fui-text>
                    </view>
                    <view slot="right-icon">
                        <module-filter v-if="focus_plan.is_buy" require_module="buy_management">
                            <fui-button v-if="focus_plan.company.id == undefined" type="primary" btnSize="mini" text="指定" @click="prepare_choose_company"></fui-button>
                            <fui-button v-else type="warning" btnSize="mini" text="重新指定" @click="show_reassign_prompt = true"></fui-button>
                        </module-filter>
                    </view>
                </u-cell>
                <u-cell :title="comp_title(focus_plan.is_buy).b_title" :value="focus_plan.stuff.company.name">
                    <view slot="label">
                        <view style="display:flex;align-items: center">
                            <view style="font-size: 25rpx;">{{ focus_plan.stuff.name + '-单价-' + (hide_order_detail_price ? '***' : focus_plan.unit_price) }}</view>
                            <module-filter require_module="sale_management" v-if="!focus_plan.is_buy">
                                <fui-button btnSize="mini" @click="new_stuff_price.show=true">调价</fui-button>
                            </module-filter>
                        </view>
                    </view>
                </u-cell>
                <u-cell title="双方资质" is-link @click="open_attach_pics"></u-cell>
                <module-filter :rm_array="['sale_management', 'buy_management']">
                    <u-cell title="合同有效期">
                        <view slot="value">
                            <fui-text :type="cur_contract.nearlyExpired?'warning':'black'" :size="26" :text="cur_contract.begin_time + '-' + cur_contract.end_time"></fui-text>
                        </view>
                    </u-cell>
                </module-filter>
                <u-cell v-if="focus_plan.trans_company_name" title="承运公司" :value="focus_plan.trans_company_name"></u-cell>
                <module-filter require_module="sale_management" v-if="!focus_plan.is_buy">
                    <u-cell title="余额" :label="user_authorize">
                        <view slot="value">
                            <module-filter require_module="cash">
                                {{cur_contract.balance?cur_contract.balance.toFixed(2):0}}
                            </module-filter>
                            <fui-tag v-if="focus_plan.status == 1 && focus_plan.arrears > 0" theme="plain" :text="'欠款额:' + focus_plan.arrears + '需付' + focus_plan.outstanding_vehicles + '车'" :scaleRatio="0.8" type="warning"></fui-tag>
                        </view>
                        <view slot="right-icon">
                            <fui-button type="success" btnSize="mini" text="授权" v-if="user_authorize == '未授权'" @click="authorize_user"></fui-button>
                        </view>
                    </u-cell>
                </module-filter>
                <u-cell title="计划时间" :value="focus_plan.plan_time">
                    <view slot="label">
                        <fui-text v-if="focus_plan.bidding_item" type="primary" :text="focus_plan.bidding_item.time + '出价' + focus_plan.bidding_item.price.toFixed(2) + '中标'" size="24"></fui-text>
                    </view>
                </u-cell>
                <u-cell :title="'当前状态：' + plan_status">
                    <view slot="value" style="display:flex;">
                        <fui-tag v-if="focus_plan.register_time && focus_plan.status != 3" theme="plain" text="已排号" :scaleRatio="0.8" type="primary"></fui-tag>
                        <module-filter :rm_array="['customer', 'supplier']"></module-filter>
                        <fui-button v-if="focus_plan.status != 3 && plan_owner" btnSize="mini" text="取消" type="danger" @click="prepare_xxx_confirm(cur_cancel_url, '取消')"></fui-button>
                        <module-filter :rm_array="['sale_management', 'buy_management']" style="display:flex;">
                            <fui-button v-if="focus_plan.status == 0" btnSize="mini" type="success" text="确认" @click="prepare_xxx_confirm(cur_confirm_url, '确认')"></fui-button>
                            <fui-button v-if="focus_plan.status != 0 && is_allowed_order_return" btnSize="mini" type="warning" text="回退" @click="show_rollback_confirm = true;"></fui-button>
                            <fui-button v-if="focus_plan.status != 3" btnSize="mini" type="danger" text="关闭" @click="prepare_xxx_confirm(cur_close_url, '关闭')"></fui-button>
                            <fui-button v-if="(focus_plan.status == 1 && !focus_plan.is_buy)" btnSize="mini" type="success" text="验款" @click="prepare_pay_confirm('验款')"></fui-button>
                        </module-filter>
                        <module-filter require_module="scale">
                            <fui-button v-if="can_pass_vehicle" btnSize="mini" type="danger" text="过号" @click="prepare_xxx_confirm('/scale/cancel_check_in', '过号')"></fui-button>
                            <fui-button v-if="((focus_plan.status == 2) || (focus_plan.status == 1 && focus_plan.is_buy)) && focus_plan.stuff.manual_weight" btnSize="mini" type="success" text="计量" @click="show_scale_input = true"></fui-button>
                        </module-filter>
                    </view>
                    <view slot="label">
                        <div v-if="(focus_plan.status == 3 || (focus_plan.checkout_delay && focus_plan.status == 2)) && !focus_plan.manual_close">
                            <fui-text type="primary" text="查看磅单" :size="28" decoration="underline" @click="go_to_ticket(false)"></fui-text>
                            <fui-text v-if="focus_plan.delegate" type="primary" text="内部磅单" :size="28" decoration="underline" @click="go_to_ticket(true)"></fui-text>
                        </div>
                    </view>
                </u-cell>
            </u-cell-group>
        </view>
        <view class="group_sep" v-if="focus_plan.stuff.concern_fapiao">
            <u-cell title="发票信息" :value="(focus_plan.fapiao_delivered?'已开':'未开')">
                <view slot="right-icon">
                    <module-filter :require_module="'sale_management'">
                        <fui-button v-if="focus_plan.status != -1" btnSize="mini" type="primary" :text="'标记' + (focus_plan.fapiao_delivered?'未开':'已开')" @click="mark_fapiao_deliver"></fui-button>
                    </module-filter>
                </view>
            </u-cell>
        </view>
        <view class="group_sep">
            <u-cell title="车辆信息">
                <view slot="right-icon">
                    <fui-button v-if="focus_plan.status != 3" type="warning" btnSize="mini" text="修改" @click="prepare_update"></fui-button>
                </view>
            </u-cell>
            <u-cell title="主车">
                <view slot="value">
                    <view style="display:flex;justify-content: space-between;">
                        <fui-text size="26" :text="focus_plan.main_vehicle.plate"></fui-text>
                        <module-filter require_module="stuff">
                            <fui-button btnSize="mini" text="加入黑名单" @click="add_to_blacklist(focus_plan.main_vehicle.id, 'vehicle')"></fui-button>
                        </module-filter>
                    </view>
                </view>
            </u-cell>
            <u-cell title="挂车">
                <view slot="value">
                    <view style="display:flex;justify-content: space-between;">
                        <fui-text size="26" :text="focus_plan.behind_vehicle.plate"></fui-text>
                        <module-filter require_module="stuff">
                            <fui-button btnSize="mini" text="加入黑名单" @click="add_to_blacklist(focus_plan.behind_vehicle.id, 'vehicle')"></fui-button>
                        </module-filter>
                    </view>
                </view>
            </u-cell>
            <u-cell :title="'司机:' + focus_plan.driver.name" clickable @click="copy_text(focus_plan.driver.phone)">
                <view slot="value">
                    <view style="display:flex;justify-content: space-between;">
                        <fui-text size="26" :text="focus_plan.driver.phone"></fui-text>
                        <module-filter require_module="stuff">
                            <fui-button btnSize="mini" text="加入黑名单" @click="add_to_blacklist(focus_plan.driver.id, 'driver')"></fui-button>
                        </module-filter>
                    </view>
                </view>
            </u-cell>
            <u-cell title="用途" :value="focus_plan.use_for" :label="'备注：' + focus_plan.comment"></u-cell>
        </view>
        <view class="group_sep">
            <u-cell-group title="出入信息">
                <u-cell title="是否已经进场" :value="focus_plan.enter_time?'是':'否'" :label="focus_plan.enter_time"></u-cell>
                <u-cell v-if="focus_plan.register_time" title="排队序号" :value="focus_plan.register_number" :label="focus_plan.register_time">
                </u-cell>
                <module-filter require_module="scale">
                    <u-cell title="代替司机操作" isLink :url="'/subPage1/Driver?driver_phone=' + focus_plan.driver.phone"></u-cell>
                </module-filter>
            </u-cell-group>
        </view>
        <view class="group_sep">
            <u-cell-group v-if="focus_plan.sc_info" title="安检信息">
                <view v-if="focus_plan.status == 3 ">
                    <u-cell v-for="(sc_node, index) in focus_plan.sc_info" :key="index" :title="sc_node.name" :label="sc_node.sc_content?('到期时间：' + sc_node.sc_content.expired_time):''">
                        <view slot="value">
                            <view v-if="sc_node.sc_content">
                                <view>
                                    {{sc_node.sc_content.input}}
                                </view>
                                <fui-avatar v-if="sc_node.sc_content.attachment" :src="$convert_attach_url(sc_node.sc_content.attachment)" @click="show_sc_image(index)"></fui-avatar>
                            </view>
                        </view>
                    </u-cell>
                </view>
            </u-cell-group>
            <module-filter v-else require_module="sc">
                <u-cell title="安检执行">
                    <view slot="right-icon">
                        <fui-button btnSize="mini" type="primary" text="审批" @click="prepare_sc_confirm"></fui-button>
                        <fui-button btnSize="mini" type="warning" text="检查" @click="nav_to_fc"></fui-button>
                    </view>
                </u-cell>
            </module-filter>
            <module-filter require_module="exam">
                <u-cell title="查看考试结果" isLink :url="'/subPage1/PlanExam?plan_id=' + focus_plan.id"></u-cell>
            </module-filter>
        </view>
        <view class="group_sep">
            <u-cell-group title="装卸信息">
                <u-cell title="计量信息">
                    <view slot="right-icon">
                        <fui-button v-if="focus_plan.stuff.manual_weight" btnSize="mini" type="primary" text="查看" @click="show_manual_weight"></fui-button>
                    </view>
                </u-cell>
                <u-cell title="卸货地址" :value="focus_plan.drop_address"></u-cell>
                <u-cell title="装卸量" :value="focus_plan.count"></u-cell>
                <u-cell v-if="focus_plan.p_time" title="皮重" :value="focus_plan.p_weight" :label="focus_plan.p_time"></u-cell>
                <u-cell v-if="focus_plan.m_time" title="毛重" :value="focus_plan.m_weight" :label="focus_plan.m_time"></u-cell>
            </u-cell-group>
        </view>
        <view class="group_sep">
            <u-cell-group title="操作历史">
                <u-cell v-for="(node, index) in focus_plan.plan_histories" :key="index" :title="node.action_type" :value="node.operator" :label="node.time"></u-cell>
            </u-cell-group>
        </view>
    </scroll-view>

    <fui-backdrop :zIndex="8888" :show="show_sc" @click="show_sc = false">
        <view class="sc-image-viewer" @click.stop>
            <swiper class="sc-swiper" :current="sc_current_index" @change="on_sc_swiper_change" :indicator-dots="sc_attach_urls.length > 1" :indicator-color="'rgba(255,255,255,0.5)'" :indicator-active-color="'#ffffff'">
                <swiper-item v-for="(item, index) in sc_attach_urls" :key="index">
                    <movable-area scale-area class="sc-movable-area">
                        <movable-view class="sc-movable-view" direction="all" inertia scale scale-min="1" scale-max="6">
                            <image class="sc-lookimg" :src="item.src" mode="aspectFit"></image>
                        </movable-view>
                    </movable-area>
                </swiper-item>
            </swiper>
            <view class="sc-close-button-container">
                <fui-icon @click="show_sc = false" name="close" size="80" color="white"></fui-icon>
            </view>
            <view class="sc-index-wrap" v-if="sc_attach_urls.length > 1">
                <text class="sc-index">{{sc_current_index + 1}}/{{sc_attach_urls.length}}</text>
            </view>
        </view>
    </fui-backdrop>

    <fui-bottom-popup :show="choose_company_show" @close="choose_company_show= false" z-index="1002">
        <fui-list>
            <list-show v-model="supplier_list" :fetch_function="get_buy_contracts" search_key="cond" height="40vh">
                <fui-list-cell v-for="item in supplier_list" :key="item.id" arrow @click="assign_supplier(item.company.id)">
                    {{item.company.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_sc_confirm" @close="show_sc_confirm= false" z-index="1002">
        <sc-execute ref="sc_confirm" :focus_plan="focus_plan"></sc-execute>
    </fui-bottom-popup>
    <fui-modal :zIndex="1002" width="600" :descr="'确定要' + confirm_info + focus_plan.main_vehicle.plate +'吗？' + (focus_plan.status == 1?'余额可能不足':'')" :show="show_xxx_confirm" v-if="show_xxx_confirm" @click="do_xxx">
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" title="回退原因" :show="show_rollback_confirm" v-if="show_rollback_confirm" @click="do_rollback">
        <fui-form ref="rollback_form" top="100">
            <fui-input required label="原因" borderTop placeholder="请输入原因" v-model="rollback_msg"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" v-if="show_scale_input" :show="show_scale_input" @click="deliver">
        <fui-form ref="deliver" top="100">
            <fui-input label="皮重" borderTop placeholder="请输入重量" v-model="deliver_req.p_weight"></fui-input>
            <fui-input label="过皮时间" disabled borderTop placeholder="请输入时间" v-model="deliver_req.p_time" @click="prepare_deliver_date_pick('p_time')"></fui-input>
            <fui-input label="毛重" borderTop placeholder="请输入重量" v-model="deliver_req.m_weight"></fui-input>
            <fui-input label="过毛时间" disabled borderTop placeholder="请输入时间" v-model="deliver_req.m_time" @click="prepare_deliver_date_pick('m_time')"></fui-input>
            <fui-input required label="装载量" type="number" borderTop placeholder="请输入装载量" v-model="deliver_req.count">
                <fui-button type="purple" btnSize="mini" text="计算" @click="calc_count"></fui-button>
            </fui-input>
        </fui-form>
    </fui-modal>
    <fui-date-picker zIndex="1003" :show="show_deliver_date" type="5" :value="deliver_time" @change="choose_deliver_date" @cancel="show_deliver_date= false"></fui-date-picker>
    <fui-modal :zIndex="1003" width="600" descr="确定要重新指定吗？" v-if="show_reassign_prompt" :show="show_reassign_prompt" @click="reassign_supplier">
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
    <fui-modal :zIndex="1002" width="600" v-if="new_stuff_price.show" title="调价" :show="new_stuff_price.show" @cancel="cancel_new_stuff_price" @click="do_new_stuff_pirce">
        <fui-form ref="new_stuff_price_form" top="100">
            <fui-input required label="新单价" borderTop placeholder="请输入新单价" v-model="new_stuff_price.price"></fui-input>
            <fui-input label="备注" borderTop placeholder="调价备注" v-model="new_stuff_price.comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-toast ref="toast"></fui-toast>
    <fui-gallery :urls="get_both_attach" v-if="show_attach" :show="show_attach" @hide="show_attach = false" @change="change_index"></fui-gallery>
    <fui-button v-if="show_attach" class="downloadBtn" type="link" text="下载" @click="download_img"></fui-button>
    <fui-modal :zIndex="1002" :show="show_blackList_confirm" title="提示" :descr="`确定将${focus_blackList.type === 'vehicle' ? '车辆' : '司机'}添加到黑名单吗？`" @click="confirm_add_to_blacklist"></fui-modal>
    <measurement ref="measurement" :focus_plan="focus_plan" @refresh="refresh_detail"></measurement>
    <fui-bottom-popup :show="show_approver_pick" v-if="show_approver_pick" @close="close_approver_pick_cancel" z-index="1005">
        <view style="padding: 20rpx;font-weight:bold;">选择审批人</view>
        <fui-list>
            <fui-list-cell v-for="(n, idx) in approver_pick_names" :key="idx" arrow @click="confirm_approver_pick(n)">{{n}}</fui-list-cell>
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
            return status_map[this.focus_plan.status] || '';
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
            if ((this.$has_module('sale_management') || this.$has_module('buy_management')) && plan.company && plan.company.id) {
                try {
                    let url = this.cur_is_buy ? '/buy_management/get_contract_by_supplier' : '/sale_management/get_contract_by_customer';
                    let contract_req = {};
                    if (this.cur_is_buy) {
                        contract_req.supplier_id = plan.company.id;
                    } else {
                        contract_req.customer_id = plan.company.id;
                        contract_req.supply_company_id = plan.stuff.company.id;
                    }
                    let resp = await this.$send_req(url, this.make_context_req(contract_req));
                    const oneMonthFromNow = moment().add(1, 'month');
                    const contractEndDate = moment(resp.end_time);
                    const monthsDifference = contractEndDate.diff(moment(), 'months', true);
                    const diffOneMonth = monthsDifference > 0 && monthsDifference <= 1;
                    if (diffOneMonth) {
                        resp.nearlyExpired = contractEndDate.isBefore(oneMonthFromNow);
                    }
                    this.cur_contract = resp;
                } catch (error) {
                    console.log(error);
                }
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
.group_sep:nth-child(odd) {
    background-color: #ffffff;
}
.group_sep:nth-child(even) {
    background-color: #f1f1f1;
}
.downloadBtn {
    position: absolute;
    z-index: 2000;
    top: 20rpx;
    right: 20rpx;
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

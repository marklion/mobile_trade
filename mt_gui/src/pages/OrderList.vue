<template>
<view class="order-page">
    <logo-loading />

    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-top">
            <view class="hero-copy">
                <text class="hero-hello">订单中心</text>
                <text class="hero-sub">{{ current_seg_name || '订单协同' }}</text>
            </view>
        </view>
    </view>

    <view class="body">
        <view class="filter-shell">
            <view class="seg-wrap" v-if="seg.length > 1">
                <fui-segmented-control :values="seg" color="#465CFF" @click="change_seg"></fui-segmented-control>
            </view>
            <view class="seg-wrap" v-else-if="seg.length === 1">
                <text class="seg-single">{{ seg[0].name }}</text>
            </view>

            <view class="tab-scroll-wrap">
                <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
                    <view class="tab-list">
                        <view class="tab-pill" v-for="(tab, index) in tabs" :key="tab.name"
                            :class="{ on: tab_current === index }" @click="pick_tab(index)">
                            <text class="tab-name">{{ tab.name }}</text>
                            <text class="tab-badge" v-if="tab.badge !== undefined">{{ tab.badge }}</text>
                        </view>
                    </view>
                </scroll-view>
            </view>

            <view class="tool-row">
                <view class="filter-chips">
                    <module-filter :rm_array="['sale_management', 'buy_management']">
                        <view class="chip" :class="{ on: !!stuff_filter.id }" @click="open_stuff_filter">
                            <text class="chip-text">{{ stuff_filter.name }}</text>
                            <fui-icon v-if="!stuff_filter.id" name="arrowright" size="28" color="#8A94A6"></fui-icon>
                            <fui-icon v-else name="close" size="28" color="#465CFF"
                                @click.native.stop="reset_stuff_filter"></fui-icon>
                        </view>
                        <view class="chip" :class="{ on: !!company_filter.id }" @click="open_company_filter">
                            <text class="chip-text">{{ company_filter.name }}</text>
                            <fui-icon v-if="!company_filter.id" name="arrowright" size="28" color="#8A94A6"></fui-icon>
                            <fui-icon v-else name="close" size="28" color="#465CFF"
                                @click.native.stop="reset_company_filter"></fui-icon>
                        </view>
                    </module-filter>
                </view>
            </view>

            <view class="meta-card">
                <view class="meta-row">
                    <view class="meta-left">
                        <view class="meta-icon">
                            <fui-icon name="calendar" size="30" color="#465CFF"></fui-icon>
                        </view>
                        <view class="meta-copy">
                            <text class="meta-label">计划日期</text>
                            <text class="meta-value">{{ begin_time }} ~ {{ end_time }}</text>
                        </view>
                    </view>
                    <view class="meta-actions">
                        <view class="mini-btn warn" @click="show_pick_plan_date">选择</view>
                        <view class="mini-btn" @click="reset_order_date">默认</view>
                    </view>
                </view>
                <view class="meta-row meta-row-border" v-if="show_sale_scope_switch && stat_scopes.length > 1"
                    @click="open_stat_company_picker">
                    <view class="meta-left">
                        <view class="meta-icon">
                            <fui-icon name="community" size="30" color="#465CFF"></fui-icon>
                        </view>
                        <view class="meta-copy">
                            <text class="meta-label">操作主体</text>
                            <text class="meta-value">{{ current_scope_name || '请选择公司' }}</text>
                        </view>
                    </view>
                    <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                </view>
            </view>
        </view>

        <fui-date-picker range :show="show_plan_date" type="3" :value="begin_time" :valueEnd="end_time"
            @change="choose_date" @cancel="close_pick_plan_date"></fui-date-picker>
        <fui-bottom-popup :show="show_scope_picker" @close="close_stat_company_picker" z-index="1100">
            <view class="picker-title">选择操作主体</view>
            <scroll-view scroll-y class="scope-scroll" :show-scrollbar="true">
                <fui-list>
                    <fui-list-cell v-for="s in stat_scopes" :key="s.id" arrow
                        @click="choose_stat_company(s.id)">
                        <view class="scope-row">
                            <view class="scope-name">{{ s.name }}</view>
                            <fui-icon v-if="stat_context_company_id === s.id" name="check" size="30"
                                color="#465CFF"></fui-icon>
                        </view>
                    </fui-list-cell>
                </fui-list>
                <view class="scope-scroll-tail"></view>
            </scroll-view>
        </fui-bottom-popup>

        <view class="list-shell">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">订单列表</text>
                        <text class="section-en">ORDERS</text>
                    </view>
                </view>
                <text class="list-hint">点选查看详情</text>
            </view>

            <list-show v-model="sp_data2show" ref="sold_plans" :fetch_function="get_sold_plans" height="62vh"
                search_key="search_cond"
                :fetch_params="[plan_filter, cur_get_url, cur_is_motion, make_context_req, show_sale_scope_switch, stat_context_company_id]">
                <view class="order-card" v-for="item in sp_data2show" :key="item.id"
                    @click="go_to_order_detail(item)">
                    <view class="order-accent" :class="'accent-' + status_key(item)"></view>
                    <view class="order-main">
                        <view class="order-top">
                            <view class="order-top-left">
                                <view class="order-title-wrap">
                                    <view class="title-line">
                                        <text class="order-title">{{ item.company_show }}</text>
                                        <text class="status-pill" :class="'st-' + status_key(item)">
                                            {{ status_label(item) }}
                                        </text>
                                    </view>
                                    <view class="stuff-price-row">
                                        <text class="order-stuff">{{ item.stuff.name }}</text>
                                        <text class="order-price" v-if="price_text(item)">{{ price_text(item) }}</text>
                                    </view>
                                </view>
                            </view>
                            <fui-icon name="arrowright" size="24" color="#C5CAD5"></fui-icon>
                        </view>

                            <view class="plate-row">
                                <view class="plate-box">
                                    <text class="plate-text">
                                        {{ item.main_vehicle.plate }} {{ item.behind_vehicle.plate }}
                                    </text>
                                </view>
                                <image class="enter-flag" v-if="item.enter_time" :src="require('../static/enter.png')"
                                    mode="aspectFit"></image>
                                <image class="enter-flag" v-else :src="require('../static/miss.png')"
                                    mode="aspectFit"></image>
                            </view>

                            <view class="tag-row">
                                <text class="tag danger">计划 {{ item.plan_time }}</text>
                                <text class="tag warn" v-if="item.is_repeat">连续派车</text>
                                <text class="tag primary" v-if="item.register_time && item.status != 3">已排号</text>
                                <text class="tag primary" v-if="item.m_time">发车 {{ item.m_time }}</text>
                                <text class="tag success" v-if="item.count && item.count != 0">
                                    装车量 {{ item.count }}
                                </text>
                                <text class="tag warn" v-if="item.status == 1 && item.arrears > 0">
                                    欠款 {{ item.arrears }} · 需付 {{ item.outstanding_vehicles }} 车
                                </text>
                            </view>

                            <view class="order-foot"
                                v-if="item.comment || item.stuff.concern_fapiao || (item.duplicateInfo && item.duplicateInfo.isDuplicate)">
                                <text class="foot-comment" v-if="item.comment">{{ item.comment }}</text>
                                <text class="foot-fapiao" :class="item.fapiao_delivered ? 'ok' : 'no'"
                                    v-if="item.stuff.concern_fapiao">
                                    发票{{ item.fapiao_delivered ? '已开' : '未开' }}
                                </text>
                                <text class="foot-dup" v-if="item.duplicateInfo && item.duplicateInfo.isDuplicate">
                                    {{ item.duplicateInfo.message }}
                                </text>
                            </view>
                    </view>
                </view>
            </list-show>
        </view>
    </view>

    <module-filter require_module="stuff">
        <fui-bottom-popup :show="show_stuff_list" @close="close_stuff_list">
            <fui-list v-if="show_stuff_list">
                <list-show ref="stuff_filter_list" v-model="stuff_data2show" :fetch_function="get_stuff"
                    :fetch_params="[show_sale_scope_switch, stat_context_company_id]" search_key="name" height="40vh">
                    <fui-list-cell arrow v-for="item in stuff_data2show" :key="item.id" @click="choose_stuff(item)">
                        {{ item.name }}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
        <fui-bottom-popup :show="show_company_filter" @close="close_company_filter">
            <fui-list v-if="show_company_filter">
                <list-show ref="company_filter_list" v-model="customer_data2show" :fetch_function="get_customers"
                    search_key="search_cond" height="40vh"
                    :fetch_params="[make_context_req, show_sale_scope_switch, stat_context_company_id]">
                    <fui-list-cell arrow v-for="item in customer_data2show" :key="item.id" @click="choose_company(item)">
                        {{ item.company.name }}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
    </module-filter>

    <fui-message ref="po_msg"></fui-message>
    <fui-toast ref="toast"></fui-toast>
    <fui-bottom-popup :show="show_approver_pick" v-if="show_approver_pick" @close="close_approver_pick_cancel" z-index="1005">
        <view style="padding: 20rpx;font-weight:bold;">选择审批人</view>
        <fui-list>
            <fui-list-cell v-for="(n, idx) in approver_pick_names" :key="idx" arrow @click="confirm_approver_pick(n)">{{n}}</fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <app-tab-bar :selected="1" />
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import ModuleFilterVue from '../components/ModuleFilter.vue';
import AppTabBar from '../components/AppTabBar.vue';
import { setTabBarSelected } from '@/utils/setTabBarSelected';
export default {
    name: 'OrderList',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilterVue,
        "app-tab-bar": AppTabBar,
    },
    data: function () {
        return {
            tab_current: 0,
            new_stuff_price: {
                show: false,
                price: 0,
                comment: '',
                isMuti: false
            },
            action_show: false,
            action_list: () => {
                return [{
                    text: "批量确认",
                    url: this.cur_confirm_url,
                }, {
                    text: '批量验款',
                    url: '',
                }, {
                    text: '批量取消',
                    url: this.cur_close_url ? this.cur_close_url : this.cur_cancel_url,
                }, {
                    text: '批量调价',
                    url: '/stuff/change_price_by_plan',
                }]
            },
            select_active: false,
            plan_selected: [],
            cur_get_url: '',
            cur_is_motion: false,
            cur_is_buy: false,
            cur_batch_confirm_url: '',
            cur_confirm_url: '',
            cur_rollback_url: '',
            cur_update_url: '',
            cur_cancel_url: '',
            cur_close_url: '',
            customer_data2show: [],
            stuff_data2show: [],
            sp_data2show: [],
            pay_pending_approval_auditer: '',
            approval_projects: [],
            show_approver_pick: false,
            approver_pick_names: [],
            approver_pick_resolve: null,
            seg: [],
            company_filter: {
                name: '全部公司',
                id: undefined,
            },
            stuff_filter: {
                name: '全部物料',
                id: undefined,
            },
            show_stuff_list: false,
            show_company_filter: false,
            show_plan_date: false,
            focus_status: undefined,
            begin_time: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            end_time: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            tabs: [],
            is_the_order_display_price: false,
            hide_order_detail_price: true,
            stat_scopes: [],
            stat_context_company_id: null,
            show_scope_picker: false,
            self_info: {
                company_is_group: false,
                company_id: null,
            },
        }
    },
    computed: {
        show_sale_scope_switch: function () {
            return this.cur_get_url === '/sale_management/order_search'
                && this.self_info
                && this.self_info.company_is_group === true
                && this.has_group_member_scope;
        },
        has_group_member_scope: function () {
            if (!this.self_info || this.self_info.company_id == null) {
                return false;
            }
            return (this.stat_scopes || []).some((item) => item.id !== this.self_info.company_id);
        },
        current_scope_name: function () {
            const current = this.stat_scopes.find(item => item.id === this.stat_context_company_id);
            return current ? current.name : '';
        },
        current_seg_name: function () {
            const hit = (this.seg || []).find(item => item.url === this.cur_get_url);
            return hit ? hit.name : '';
        },
        plan_filter: function () {
            const ret = {
                start_time: this.begin_time,
                end_time: this.end_time,
                status: this.focus_status,
                stuff_id: this.stuff_filter.id,
                company_id: this.company_filter.id,
                ...this.tabs[this.tab_current]?.filter,
            };
            if (this.show_sale_scope_switch && this.stat_context_company_id != null) {
                ret.stat_context_company_id = this.stat_context_company_id;
            }
            return ret;
        },

    },
    methods: {
        status_key: function (item) {
            if (!item) return 'info';
            if (item.manual_close) return 'close';
            const map = { 0: 'info', 1: 'pay', 2: 'wait', 3: 'done' };
            return map[item.status] || 'info';
        },
        status_label: function (item) {
            if (!item) return '';
            if (item.manual_close) return '已取消';
            if (item.status == 0) return '未确认';
            if (item.status == 1) return this.cur_is_buy ? '待处理' : '未付款';
            if (item.status == 2) return item.enter_time ? '已入场' : '未入场';
            if (item.status == 3) return '已完成';
            return '进行中';
        },
        pick_tab: function (index) {
            this.change_tab({ index: index });
        },
        price_text: function (item) {
            if (!this.is_the_order_display_price || this.hide_order_detail_price || !item.unit_price) {
                return '';
            }
            let text = '单价 ' + item.unit_price;
            if (item.count != 0) {
                text += ' · 总价 ' + (item.unit_price * item.count).toFixed(2);
            }
            return text;
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
                    this.stat_context_company_id = this.stat_scopes[0].id;
                }
            } catch (e) {
                this.stat_scopes = [];
            }
        },
        open_stat_company_picker: function () {
            this.show_scope_picker = true;
        },
        close_stat_company_picker: function () {
            this.show_scope_picker = false;
        },
        close_stuff_list: function () {
            this.show_stuff_list = false;
        },
        close_company_filter: function () {
            this.show_company_filter = false;
        },
        open_stuff_filter: function () {
            this.show_stuff_list = true;
            this.$nextTick(() => {
                if (this.$refs.stuff_filter_list) {
                    this.$refs.stuff_filter_list.refresh();
                }
            });
        },
        open_company_filter: function () {
            this.show_company_filter = true;
            this.$nextTick(() => {
                if (this.$refs.company_filter_list) {
                    this.$refs.company_filter_list.refresh();
                }
            });
        },
        choose_stat_company: function (company_id) {
            if (this.stat_context_company_id === company_id) {
                this.show_scope_picker = false;
                return;
            }
            this.stat_context_company_id = company_id;
            this.show_scope_picker = false;
            this.company_filter = {
                name: '全部公司',
                id: undefined,
            };
            this.stuff_filter = {
                name: '全部物料',
                id: undefined,
            };
            this.$nextTick(() => {
                if (this.$refs.company_filter_list) {
                    this.$refs.company_filter_list.refresh();
                }
                if (this.$refs.stuff_filter_list) {
                    this.$refs.stuff_filter_list.refresh();
                }
            });
            this.refresh_plans();
        },
        make_context_req: function (body = {}, url = '', ssss_bool = false, scci = null) {
            const ret = { ...body };
            delete ret.stat_context_company_id;
            const hit_sale_api = url.startsWith('/sale_management/');
            if (hit_sale_api && ssss_bool && scci != null) {
                ret.stat_context_company_id = scci;
            }
            return ret;
        },
        get_pay_url: async function () {
            let verify_pay_by_cash = (await this.$send_req('/stuff/get_verify_pay_config', {})).verify_pay_by_cash;
            let url_prefix = '/sale_management';
            if (verify_pay_by_cash) {
                url_prefix = '/cash'
            }
            return url_prefix + '/order_sale_pay';
        },
        parse_weight_urls: function (urls) {
            if (!urls)
                return [];
            else {
                return urls.split('|').map(url => this.$convert_attach_url(url));;
            }
        },
        refresh_approval_projects: async function () {
            try {
                const ret = await this.$send_req('/approval/get_approval_projects', {});
                this.approval_projects = ret.projects || [];
            } catch (err) {
                console.log(err);
                this.approval_projects = [];
            }
        },
        approval_item: function (key) {
            return (this.approval_projects || []).find((p) => p.key === key);
        },
        pick_submit_specify_auditer: async function () {
            try {
                const ret = await this.$send_req('/approval/get_auditer_pick_list', {
                    pageNo: 0
                });
                const rows = ret.all_user || [];
                if (!rows.length) {
                    this.$refs.toast.show({
                        text: '无可选用户'
                    });
                    return '';
                }
                this.approver_pick_names = rows.map((u) => u.name);
                return new Promise((resolve) => {
                    this.approver_pick_resolve = resolve;
                    this.show_approver_pick = true;
                });
            } catch (err) {
                console.log(err);
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
        do_action: async function (e) {
            let muti_success = true;
            if (!this.new_stuff_price.isMuti) {
                if (e.text == "批量调价") {
                    this.new_stuff_price.show = true;
                    this.new_stuff_price.isMuti = true;
                    this.new_stuff_price.comment = "批量调价"
                    return
                }
            }
            try {
                let url = e.url;
                let batch_approval_auditer = '';
                if (e.text == '批量验款') {
                    url = await this.get_pay_url();
                    await this.refresh_approval_projects();
                    const p = this.approval_item('manual_verify_pay');
                    if (p && p.enabled && p.approver_mode === 'submit_specify') {
                        batch_approval_auditer = await this.pick_submit_specify_auditer();
                        if (!batch_approval_auditer) {
                            this.action_show = false;
                            return;
                        }
                    }
                }
                for (let index = 0; index < this.plan_selected.length; index++) {
                    const element = this.plan_selected[index];
                    const pay_body = {
                        plan_id: element,
                    };
                    if (batch_approval_auditer) {
                        pay_body.approval_auditer = batch_approval_auditer;
                    }
                    this.$send_req(url, pay_body).catch((error) => {
                        console.log(error)
                        muti_success = false
                    })
                }
                if (muti_success) {
                    this.$refs.toast.show({
                        text: '操作成功'
                    })
                }

            } catch (error) {
                console.log(error)
            } finally {
                this.action_show = false;
                this.select_active = false;
                this.plan_selected = [];
                this.refresh_plans();
            }

        },
        select_all: function () {
            this.plan_selected = this.sp_data2show.map(item => item.id);
        },
        select_other: function () {
            let orig_selected = this.plan_selected;
            this.sp_data2show.forEach(item => {
                if (orig_selected.indexOf(item.id) == -1) {
                    this.plan_selected.push(item.id);
                } else {
                    this.plan_selected = this.plan_selected.filter(ele => ele != item.id);
                }
            });
        },
        batch_confirm: async function () {
            await this.$send_req(this.cur_batch_confirm_url, this.plan_filter);
            this.refresh_plans();
        },
        close_pick_plan_date: function () {
            this.show_plan_date = false;
        },
        show_pick_plan_date: function () {
            this.show_plan_date = true;
        },
        get_status_icon: function (item) {
            let ret = '';
            if (item) {
                let status = item.status;
                if (status == 0) {
                    ret = 'info';
                } else if (status == 1) {
                    ret = 'rmb';
                } else if (status == 2) {
                    ret = 'hourglass';
                } else if (status == 3) {
                    ret = 'checkmark';
                }
                if (item.manual_close) {
                    ret = 'close';
                }
            }

            return ret;
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
        // 订单新单价调价
        do_new_stuff_pirce: async function (e) {
            if (e.index !== 1) {
                this.cancel_new_stuff_price();
                return;
            }
            await this.submit_new_stuff_price_by_plan();
        },
        submit_new_stuff_price_by_plan: async function () {
            if (!(await this.validate_new_stuff_price_form())) {
                return;
            }
            const auditerRes = await this.resolve_closed_order_price_submit_auditer();
            if (!auditerRes.ok) {
                return;
            }
            const price_req = {
                unit_price: Number(this.new_stuff_price.price),
                plan_id: this.plan_selected.toString(),
                comment: this.new_stuff_price.comment
            };
            if (auditerRes.auditer) {
                price_req.approval_auditer = auditerRes.auditer;
            }
            this.$send_req("/stuff/change_price_by_plan", price_req).catch((error) => {
                this.$refs.toast.show({
                    text: error,
                });
            }).finally(() => {
                this.cancel_new_stuff_price();
                this.refresh_plans();
            });
        },
        cancel_new_stuff_price: function (e) {
            this.new_stuff_price.price = 0;
            this.new_stuff_price.comment = "";
            this.new_stuff_price.show = false;
            this.new_stuff_price.isMuti = false;
            this.action_show = false;
            this.select_active = false;
            this.plan_selected = [];
        },
        go_to_order_detail: function (item) {
            let role = 'customer';
            if (this.cur_get_url === '/sale_management/order_search') {
                role = 'sale_management';
            } else if (this.cur_get_url === '/buy_management/order_search') {
                role = 'buy_management';
            } else if (this.cur_get_url === '/supplier/order_sale_search') {
                role = 'supplier';
            }
            let url = '/subPage1/order_detail?id=' + item.id + '&role=' + role;
            if (this.show_sale_scope_switch && this.stat_context_company_id != null) {
                url += '&stat_context_company_id=' + this.stat_context_company_id;
            }
            uni.navigateTo({ url: url });
        },
        init_tabs: function () {
            this.tabs = [{
                name: "全部",
                filter: {
                    status: undefined,
                    hide_manual_close: undefined,
                    only_entered: undefined,
                },
            }, {
                name: "未确认",
                badge: 0,
                filter: {
                    status: 0,
                    hide_manual_close: undefined,
                    only_entered: undefined,
                },
            }, ]
            let enter_status = 1;
            if (!this.cur_is_buy) {
                this.tabs.push({
                    name: "未付款",
                    badge: 0,
                    filter: {
                        status: 1,
                        hide_manual_close: undefined,
                        only_entered: undefined,
                    },
                });
                enter_status = 2;
            }
            this.tabs.push({
                name: "未入场",
                badge: 0,
                filter: {
                    status: enter_status,
                    hide_manual_close: undefined,
                    only_entered: false,
                },
            });
            this.tabs.push({
                name: "已入场",
                badge: 0,
                filter: {
                    status: enter_status,
                    hide_manual_close: undefined,
                    only_entered: true,
                },
            });
            this.tabs.push({
                name: "已完成",
                badge: 0,
                filter: {
                    status: 3,
                    hide_manual_close: true,
                    only_entered: undefined,
                },
            });
            this.tabs.push({
                name: "已取消",
                badge: 0,
                filter: {
                    status: 3,
                    hide_manual_close: false,
                    only_entered: undefined,
                },
            });
        },
        change_seg: function (e) {
            this.cur_get_url = e.url;
            this.cur_is_motion = e.motion;
            this.cur_is_buy = e.is_buy;
            this.cur_batch_confirm_url = e.batch_url;
            this.cur_confirm_url = e.confirm_url;
            this.cur_rollback_url = e.rollback_url;
            this.cur_update_url = e.update_url;
            this.cur_close_url = e.close_url;
            this.cur_cancel_url = e.cancel_url;
            this.tab_current = 0;
            this.focus_status = undefined;
            this.init_tabs();
            this.refresh_plans();
        },
        reset_company_filter: function () {
            this.company_filter = {
                name: '全部公司',
                id: undefined,
            }
            this.refresh_plans();
        },
        reset_stuff_filter: function () {
            this.stuff_filter = {
                name: '全部物料',
                id: undefined,
            }
            this.refresh_plans();
        },
        refresh_plans: function () {
            this.$nextTick(() => {
                this.init_number_of_sold_plan();
            });
            this.$nextTick(() => {
                this.$refs.sold_plans.refresh();
            })

        },
        choose_company: function (item) {
            this.company_filter = {
                name: item.company.name,
                id: item.company.id,
            }
            this.show_company_filter = false;
            this.refresh_plans();
        },
        choose_stuff: function (item) {
            this.stuff_filter = {
                name: item.name,
                id: item.id,
            }
            this.show_stuff_list = false;
            this.refresh_plans();
        },
        choose_date: function (e) {
            this.show_plan_date = false;
            this.begin_time = e.startDate.result;
            this.end_time = e.endDate.result;
            this.refresh_plans();
        },
        change_tab: function (e) {
            let index = e.index
            if (index > 0) {
                this.focus_status = this.tabs[index].filter.status;
            } else {
                this.focus_status = undefined;
            }
            this.refresh_plans();
            this.tab_current = index;
        },
        make_plan_get_url: function () {
            return this.cur_get_url;
        },
        get_sold_plans: async function (pageNo, [plan_filter, cur_get_url, cur_is_motion, make_context_req, ssss_bool, scci]) {
            let res = await this.$send_req(cur_get_url, make_context_req({
                ...plan_filter,
                pageNo: pageNo,
            }, cur_get_url, ssss_bool, scci));
            let ret = [];
            if (res && res.plans)
            {
                res.plans.forEach(element => {
                    element.search_cond = element.main_vehicle.plate + element.behind_vehicle.plate;
                    if (cur_is_motion) {
                        element.company_show = element.stuff.company.name;
                    } else {
                        element.company_show = element.company.name;
                    }
                    ret.push(element)
                });
            }

            return ret;
        },
        init_number_of_sold_plan: async function () {
            for (let single_tab of this.tabs) {
                if (single_tab.badge === undefined) {
                    continue;
                }
                let res = await this.$send_req(this.make_plan_get_url(), {
                    ...this.plan_filter,
                    only_count: true,
                    ...single_tab.filter,
                }, true);
                single_tab.badge = res.total;
            }
        },
        get_stuff: async function (pageNo, [ssss_bool, scci]) {
            let mods = uni.getStorageSync('self_info').modules.map(ele => {
                return ele.name
            })
            if (mods.indexOf('stuff') != -1) {
                let req_url = '/stuff/get_all';
                let req_body = {
                    pageNo: pageNo
                };
                if (ssss_bool && scci != null) {
                    req_url = '/sale_management/get_stuff_for_contract';
                    req_body.stat_context_company_id = scci;
                }
                let ret = await this.$send_req(req_url, req_body);
                return ret.stuff;
            } else {
                return [];
            }
        },
        get_customers: async function (pageNo, [make_context_req, ssss_bool, scci]) {
            let mods = uni.getStorageSync('self_info').modules.map(ele => {
                return ele.name
            })
            if (mods.indexOf('stuff') != -1) {
                let ret = await this.$send_req('/sale_management/contract_get', make_context_req({
                    pageNo: pageNo
                }, '/sale_management/contract_get', ssss_bool, scci));
                ret.contracts.forEach(item => {
                    item.search_cond = item.company.name;
                });
                return ret.contracts;
            } else {
                return [];
            }
        },
        init_top_seg: function () {
            this.seg = []
            if (this.$has_module('customer')) {
                this.seg.push({
                    name: '采购下单',
                    url: '/customer/order_buy_search',
                    cancel_url: '/customer/order_buy_cancel',
                    update_url: '/customer/order_buy_update',
                    motion: true,
                    is_buy: false,
                });
            }
            if (this.$has_module('sale_management')) {
                this.seg.push({
                    name: '销售接单',
                    url: '/sale_management/order_search',
                    batch_url: '/sale_management/order_batch_confirm',
                    confirm_url: '/sale_management/order_sale_confirm',
                    rollback_url: '/sale_management/order_rollback',
                    close_url: '/sale_management/close',
                    update_url: '/sale_management/order_update',
                    motion: false,
                    is_buy: false,
                });
            }
            if (this.$has_module('supplier')) {
                this.seg.push({
                    name: '销售下单',
                    url: '/supplier/order_sale_search',
                    cancel_url: '/supplier/order_sale_cancel',
                    update_url: '/supplier/order_sale_update',
                    motion: true,
                    is_buy: true,
                });
            }
            if (this.$has_module('buy_management')) {
                this.seg.push({
                    name: '采购接单',
                    url: '/buy_management/order_search',
                    batch_url: '/buy_management/order_batch_confirm',
                    confirm_url: '/buy_management/order_buy_confirm',
                    rollback_url: '/buy_management/order_rollback',
                    close_url: '/buy_management/close',
                    update_url: '/buy_management/order_update',
                    motion: false,
                    is_buy: true,
                });
            }
            if (this.seg.length > 0) {
                this.cur_get_url = this.seg[0].url;
                this.cur_is_motion = this.seg[0].motion;
                this.cur_is_buy = this.seg[0].is_buy;
                this.cur_batch_confirm_url = this.seg[0].batch_url;
                this.cur_cancel_url = this.seg[0].cancel_url;
                this.cur_confirm_url = this.seg[0].confirm_url;
                this.cur_rollback_url = this.seg[0].rollback_url;
                this.cur_update_url = this.seg[0].update_url;
                this.cur_close_url = this.seg[0].close_url;
                this.init_tabs();
            }
        },
        reset_order_date: function (need_refresh = true) {
            if (need_refresh) {
                this.$refs.po_msg.show({
                    text: '默认日期范围可以在我的页面配置'
                })
            }
            let bt = new Date();
            let et = new Date();
            bt.setDate(bt.getDate() - uni.getStorageSync('self_info').prefer_order_begin_offset);
            et.setDate(et.getDate() + uni.getStorageSync('self_info').prefer_order_end_offset);
            this.begin_time = utils.dateFormatter(bt, 'y-m-d', 4, false);
            this.end_time = utils.dateFormatter(et, 'y-m-d', 4, false);
            if (need_refresh) {
                this.refresh_plans();
            }
        },
        get_price_display_config: async function () {
            try {
                const result = await this.$send_req('/global/get_the_order_display_price', {});
                this.is_the_order_display_price = result.is_the_order_display_price;
            } catch (error) {
                console.error('获取价格显示配置失败:', error);
                this.is_the_order_display_price = false;
            }
        },
        get_hide_order_detail_price_config: async function () {
            try {
                const result = await this.$send_req('/global/get_hide_order_detail_price', {});
                this.hide_order_detail_price = result.hide_order_detail_price;
            } catch (error) {
                console.error('获取订单详情隐藏价格配置失败:', error);
                this.hide_order_detail_price = true;
            }
        }
    },
    onPullDownRefresh() {
        this.refresh_plans();
        uni.stopPullDownRefresh();
    },
    async onLoad() {
        await this.load_self_info();
        await this.load_stat_scopes();
        this.reset_order_date(false);
        this.init_top_seg();
        this.init_number_of_sold_plan();
        this.get_price_display_config();
        this.get_hide_order_detail_price_config();
    },
    onShow() {
        setTabBarSelected();
        this.refresh_plans();
    },
}
</script>

<style scoped>
.order-page {
    min-height: 100vh;
    background: #F2F4FA;
    box-sizing: border-box;
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.hero {
    position: relative;
    padding: 20rpx 28rpx 36rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}

.hero-logo-bg {
    position: absolute;
    top: 0;
    right: 0;
    width: 280rpx;
    height: 280rpx;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
}

.hero-logo-img {
    width: 280rpx;
    height: 280rpx;
    opacity: 0.34;
    /* 右上角溢出裁剪，约露出四分之一 */
    transform: translate(36%, -24%);
}

.hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
}

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

.body {
    position: relative;
    z-index: 2;
    margin-top: -28rpx;
    padding: 0 20rpx;
}

.filter-shell {
    background: #FFFFFF;
    border-radius: 24rpx;
    padding: 18rpx 18rpx 16rpx;
    box-shadow: 0 12rpx 32rpx rgba(40, 58, 120, 0.1);
    margin-bottom: 16rpx;
}

.seg-wrap {
    margin-bottom: 10rpx;
}

.seg-single {
    display: block;
    text-align: center;
    font-size: 28rpx;
    color: #465CFF;
    font-weight: 700;
    padding: 8rpx 0;
}

.tab-scroll-wrap {
    margin: 4rpx 0 8rpx;
}

.tab-scroll {
    width: 100%;
    white-space: nowrap;
}

.tab-list {
    display: inline-flex;
    flex-direction: row;
    padding: 4rpx 0;
}

.tab-pill {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    padding: 12rpx 22rpx;
    margin-right: 12rpx;
    border-radius: 999rpx;
    background: #F3F5FF;
    border: 1rpx solid #E8ECF6;
}

.tab-pill.on {
    background: #465CFF;
    border-color: #465CFF;
}

.tab-name {
    font-size: 24rpx;
    color: #4A5568;
    font-weight: 500;
}

.tab-pill.on .tab-name {
    color: #FFFFFF;
    font-weight: 700;
}

.tab-badge {
    margin-left: 8rpx;
    min-width: 28rpx;
    padding: 0 8rpx;
    height: 28rpx;
    line-height: 28rpx;
    text-align: center;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.15);
    color: #465CFF;
    font-size: 18rpx;
}

.tab-pill.on .tab-badge {
    background: rgba(255, 255, 255, 0.22);
    color: #FFFFFF;
}

.tool-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 8rpx;
}

.filter-chips {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    flex: 1;
}

.filter-chips .chip {
    margin-right: 12rpx;
    margin-bottom: 4rpx;
}

.chip {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
    background: #F3F5FF;
    border: 1rpx solid #E8ECF6;
}

.chip.on {
    background: rgba(70, 92, 255, 0.12);
    border-color: rgba(70, 92, 255, 0.35);
}

.chip-text {
    font-size: 22rpx;
    color: #2D3748;
    margin-right: 4rpx;
    max-width: 220rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

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

.meta-row-border {
    border-top: 1rpx solid #E8ECF6;
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

.meta-copy {
    flex: 1;
    min-width: 0;
}

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

.meta-actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
}

.mini-btn {
    padding: 8rpx 18rpx;
    border-radius: 999rpx;
    background: #465CFF;
    color: #FFFFFF;
    font-size: 22rpx;
    margin-left: 10rpx;
}

.mini-btn.warn {
    background: #FF8A2B;
}

.list-shell {
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    overflow: hidden;
    padding-bottom: 8rpx;
}

.section-head {
    padding: 16rpx 18rpx 10rpx;
    background: linear-gradient(90deg, #F3F5FF 0%, #FFFFFF 70%);
    border-bottom: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.section-head-left {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.section-bar {
    width: 8rpx;
    height: 34rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 14rpx;
}

.section-titles {
    display: flex;
    flex-direction: column;
}

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

.list-hint {
    font-size: 20rpx;
    color: #9AA3B8;
}

.order-card {
    position: relative;
    margin: 10rpx 12rpx 0;
    background: linear-gradient(135deg, #FFFFFF 0%, #F7F8FE 100%);
    border: 1rpx solid #E8ECF6;
    border-radius: 16rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 16rpx rgba(40, 58, 120, 0.04);
}

.order-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    border-radius: 0 6rpx 6rpx 0;
}

.accent-info { background: linear-gradient(180deg, #465CFF, #8BA0FF); }
.accent-pay { background: linear-gradient(180deg, #FF8A2B, #FFB06B); }
.accent-wait { background: linear-gradient(180deg, #13C2C2, #5AD8D8); }
.accent-done { background: linear-gradient(180deg, #2DBE6C, #6FDB9A); }
.accent-close { background: linear-gradient(180deg, #FF4D4F, #FF8A8B); }

.order-main {
    padding: 14rpx 16rpx 12rpx 20rpx;
}

.order-top {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
}

.order-top-left {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
    margin-right: 8rpx;
}

.order-title-wrap {
    flex: 1;
    min-width: 0;
}

.title-line {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.order-title {
    flex: 1;
    min-width: 0;
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 12rpx;
}

.status-pill {
    flex-shrink: 0;
    font-size: 18rpx;
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
    background: #F3F5FF;
    color: #465CFF;
}

.status-pill.st-info { background: rgba(70, 92, 255, 0.12); color: #465CFF; }
.status-pill.st-pay { background: rgba(255, 138, 43, 0.14); color: #FF8A2B; }
.status-pill.st-wait { background: rgba(19, 194, 194, 0.14); color: #13C2C2; }
.status-pill.st-done { background: rgba(45, 190, 108, 0.14); color: #2DBE6C; }
.status-pill.st-close { background: rgba(255, 77, 79, 0.14); color: #FF4D4F; }

.stuff-price-row {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    flex-wrap: wrap;
    margin-top: 6rpx;
}

.order-stuff {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 700;
    margin-right: 16rpx;
}

.order-price {
    font-size: 24rpx;
    color: #2F3FCF;
    font-weight: 700;
}

.plate-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 10rpx;
}

.plate-box {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.plate-text {
    font-size: 22rpx;
    color: #1A1A1A;
    font-weight: 700;
    letter-spacing: 1rpx;
    padding: 4rpx 10rpx;
    border-radius: 4rpx;
    border: 2rpx solid #1A1A1A;
    background: #F5D000;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}

.enter-flag {
    width: 36rpx;
    height: 36rpx;
    margin-left: 10rpx;
    flex-shrink: 0;
}

.tag-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: 8rpx;
}

.tag {
    font-size: 18rpx;
    padding: 4rpx 10rpx;
    border-radius: 999rpx;
    background: #F3F5FF;
    color: #465CFF;
    border: 1rpx solid #E0E6FF;
    margin-right: 8rpx;
    margin-bottom: 4rpx;
}

.tag.danger {
    background: rgba(255, 77, 79, 0.1);
    color: #FF4D4F;
    border-color: rgba(255, 77, 79, 0.22);
}

.tag.warn {
    background: rgba(255, 138, 43, 0.12);
    color: #FF8A2B;
    border-color: rgba(255, 138, 43, 0.28);
}

.tag.primary {
    background: rgba(70, 92, 255, 0.1);
    color: #465CFF;
    border-color: rgba(70, 92, 255, 0.22);
}

.tag.success {
    background: rgba(45, 190, 108, 0.12);
    color: #2DBE6C;
    border-color: rgba(45, 190, 108, 0.28);
}

.order-foot {
    margin-top: 4rpx;
    padding-top: 8rpx;
    border-top: 1rpx dashed #E8ECF6;
}

.foot-comment {
    display: block;
    font-size: 20rpx;
    color: #8A94A6;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.foot-fapiao {
    display: inline-block;
    margin-top: 4rpx;
    font-size: 20rpx;
    margin-right: 12rpx;
}

.foot-fapiao.ok { color: #465CFF; }
.foot-fapiao.no { color: #FF4D4F; }

.foot-dup {
    display: block;
    margin-top: 4rpx;
    font-size: 20rpx;
    color: #FF4D4F;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.picker-title {
    padding: 24rpx 28rpx 12rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #1A1F36;
}

.scope-scroll {
    max-height: 50vh;
    padding-bottom: 24rpx;
}

.scope-scroll-tail {
    height: 48rpx;
}

.scope-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.scope-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 20rpx;
}
</style>

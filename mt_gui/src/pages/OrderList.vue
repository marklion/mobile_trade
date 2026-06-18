<template>
<view>
    <fui-segmented-control :values="seg" @click="change_seg"></fui-segmented-control>
    <fui-tabs scroll alignLeft :current="tab_current" :tabs="tabs" @change="change_tab"></fui-tabs>
    <view style="padding: 10rpx;">
        <fui-row :gutter="20">
            <fui-col :span="16" v-if="!select_active">
                <module-filter :rm_array="['sale_management', 'buy_management']">
                    <fui-tag theme="plain" type="purple" @click="open_stuff_filter" marginLeft="20">
                        {{stuff_filter.name}}
                        <fui-icon v-if="!stuff_filter.id" name="arrowright" size="32"></fui-icon>
                        <fui-icon v-else name="close" size="32" @click.native.stop="reset_stuff_filter"></fui-icon>
                    </fui-tag>
                    <fui-tag theme="plain" type="success" @click="open_company_filter" marginLeft="20">
                        {{company_filter.name}}
                        <fui-icon v-if="!company_filter.id" name="arrowright" size="32"></fui-icon>
                        <fui-icon v-else name="close" size="32" @click.native.stop="reset_company_filter"></fui-icon>
                    </fui-tag>
                </module-filter>
            </fui-col>
            <fui-col :span="8">
                <fui-tag v-if="!select_active" type="purple" text="多选" @click="select_active = true">
                </fui-tag>
                <view v-else style="display:flex; align-items: center;">
                    <fui-tag type="warning" text="关闭多选" @click="select_active = false">
                    </fui-tag>
                    <fui-tag type="success" text="全选" @click="select_all">
                    </fui-tag>
                    <fui-tag type="danger" text="反选" @click="select_other">
                    </fui-tag>
                    <fui-tag type="primary" v-if="plan_selected.length > 0" :text="plan_selected.length + '项批量操作'" @click="action_show = true">
                    </fui-tag>
                </view>
            </fui-col>
        </fui-row>
    </view>
    <fui-actionsheet :zIndex="1004" :show="action_show" :isCancel="false" v-if="action_show" maskClosable :itemList="action_list()" @click="do_action" @cancel="action_show = false"></fui-actionsheet>
    <u-cell title="计划时间" :value="begin_time + '~' + end_time">
        <view slot="right-icon" style="display:flex;">
            <fui-button text="选择日期" @click="show_pick_plan_date" btnSize="mini" type="warning"></fui-button>
            <fui-button text="恢复默认" @click="reset_order_date" btnSize="mini" type="primary"></fui-button>
        </view>
    </u-cell>
    <u-cell v-if="show_sale_scope_switch && stat_scopes.length > 1" title="操作主体" :value="current_scope_name || '请选择公司'" isLink @click="open_scope_picker"></u-cell>
    <fui-date-picker range :show="show_plan_date" type="3" :value="begin_time" :valueEnd="end_time" @change="choose_date" @cancel="close_pick_plan_date"></fui-date-picker>
    <fui-bottom-popup v-if="show_scope_picker" :show="show_scope_picker" @close="show_scope_picker = false" z-index="1003">
        <fui-list>
            <fui-list-cell v-for="s in stat_scopes" :key="s.id" arrow @click="choose_stat_scope(s.id)">
                <view class="scope-row">
                    <view class="scope-name">{{ s.name }}</view>
                    <fui-icon v-if="stat_context_company_id === s.id" name="check" size="30" color="#1E9FFF"></fui-icon>
                </view>
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <u-checkbox-group v-model="plan_selected" placement="column">
        <list-show v-model="sp_data2show" ref="sold_plans" :fetch_function="get_sold_plans" height="70vh" search_key="search_cond" :fetch_params="[plan_filter, cur_get_url, cur_is_motion, make_context_req, show_sale_scope_switch, stat_context_company_id]">
            <view v-for="item in sp_data2show" :key="item.id">
                <u-cell :title="item.company_show + '-' + item.stuff.name + (is_the_order_display_price && !hide_order_detail_price && item.unit_price ? '-' + '( 单价:' + item.unit_price + (item.count != 0 ? ',总价:' + (item.unit_price * item.count).toFixed(2) : '') + ')' : '')" clickable @click="go_to_order_detail(item)">
                    <view slot="icon" style="display:flex;">
                        <u-checkbox :name="item.id" shape="circle" v-if="select_active" size="25">
                        </u-checkbox>
                        <u-icon :name="get_status_icon(item)"></u-icon>
                    </view>
                    <view slot="value" style="display:flex; flex-direction: column;">
                        <fui-tag theme="plain" :text="'计划:' + item.plan_time" :scaleRatio="0.8" type="danger"></fui-tag>
                        <fui-tag v-if="item.is_repeat" theme="plain" text="连续派车" :scaleRatio="0.8" type="warning"></fui-tag>
                        <fui-tag v-if="item.register_time && item.status != 3" theme="plain" text="已排号" :scaleRatio="0.8" type="primary"></fui-tag>
                        <fui-tag v-if="item.m_time" theme="plain" :text="'发车:' + item.m_time" :scaleRatio="0.8" type="primary"></fui-tag>
                        <fui-tag v-if="item.count && item.count != 0" theme="plain" :text="'装车量' + item.count" :scaleRatio="0.8" type="success"></fui-tag>
                        <fui-tag v-if="item.status == 1 && item.arrears > 0" theme="plain" :text="'欠款额:' + item.arrears + '需付'+ item.outstanding_vehicles + '车'" :scaleRatio="0.8" type="warning"></fui-tag>
                    </view>
                    <template slot="label">
                        <view>
                            <fui-text size="24" type="success" :text="item.main_vehicle.plate + ' ' + item.behind_vehicle.plate">
                            </fui-text>
                            <image v-if="item.enter_time" :src="require('../static/enter.png')" style="width: 24px; height: 24px;"></image>
                            <image v-else :src="require('../static/miss.png')" style="width: 24px; height: 24px;"></image>
                        </view>
                        <view>
                            <fui-text size="22" type="gray" v-if="item.comment" :text="item.comment">
                            </fui-text>
                            <fui-text size="22" :type="item.fapiao_delivered?'primary':'danger'" v-if="item.stuff.concern_fapiao" :text="' 发票' + (item.fapiao_delivered?'已开':'未开')">
                            </fui-text>
                        </view>
                        <view v-if="item.duplicateInfo&&item.duplicateInfo.isDuplicate">
                            <fui-text size="22" type="danger" :text="item.duplicateInfo.message"></fui-text>
                        </view>
                    </template>

                </u-cell>
            </view>
        </list-show>
    </u-checkbox-group>
    <module-filter require_module="stuff">
        <fui-bottom-popup :show="show_stuff_list" @close="show_stuff_list = false">
            <fui-list>
                <list-show ref="stuff_filter_list" v-model="stuff_data2show" :fetch_function="get_stuff" :fetch_params="[show_sale_scope_switch, stat_context_company_id]" search_key="name" height="40vh">
                    <fui-list-cell arrow v-for="item in stuff_data2show" :key="item.id" @click="choose_stuff(item)">
                        {{item.name}}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
        <fui-bottom-popup :show="show_company_filter" @close="show_company_filter= false">
            <fui-list>
                <list-show ref="company_filter_list" v-model="customer_data2show" :fetch_function="get_customers" search_key="search_cond" height="40vh" :fetch_params="[make_context_req, show_sale_scope_switch, stat_context_company_id]">
                    <fui-list-cell arrow v-for="item in customer_data2show" :key="item.id" @click="choose_company(item)">
                        {{item.company.name}}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
    </module-filter>

    <fui-modal :zIndex="1002" width="600" v-if="new_stuff_price.show" title="调价" :show="new_stuff_price.show" @cancel="cancel_new_stuff_price" @click="do_new_stuff_pirce">
        <fui-form ref="new_stuff_price_form" top="100">
            <fui-input required label="新单价" borderTop placeholder="请输入新单价" v-model="new_stuff_price.price"></fui-input>
            <fui-input label="备注" borderTop placeholder="调价备注" v-model="new_stuff_price.comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-message ref="po_msg"></fui-message>
    <fui-toast ref="toast"></fui-toast>
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
export default {
    name: 'OrderList',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilterVue,
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
        open_scope_picker: function () {
            this.show_scope_picker = true;
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
        choose_stat_scope: function (company_id) {
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
            console.log('test_click');
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
        this.refresh_plans();
    },
}
</script>

<style scoped>
.group_sep:nth-child(odd) {
    background-color: #ffffff;
    /* 更深的颜色 */
}

.group_sep:nth-child(even) {
    background-color: #f1f1f1;
    /* 更浅的颜色 */
}

.lookimg {
    width: 100%;
    height: 100%;
}

.imagecontent {
    width: 50%;
    height: 100vh;
    margin: 0 40rpx;
}

.downloadBtn {
    position: absolute;
    z-index: 2000;
    top: 20rpx;
    right: 20rpx;
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

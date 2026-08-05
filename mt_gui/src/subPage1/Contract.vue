<template>
<view class="contract-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-top">
            <view class="hero-copy">
                <text class="hero-hello">合同管理</text>
                <text class="hero-sub">{{ current_seg_name || '合同协同' }}</text>
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

            <view class="meta-card" v-if="show_scope_switch">
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
                <view class="meta-row meta-row-border" @click="open_scheme_manager">
                    <view class="meta-left">
                        <view class="meta-icon">
                            <fui-icon name="coupon" size="30" color="#465CFF"></fui-icon>
                        </view>
                        <view class="meta-copy">
                            <text class="meta-label">价格策略</text>
                            <text class="meta-value">优惠方案管理</text>
                        </view>
                    </view>
                    <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                </view>
            </view>
        </view>

        <view class="list-shell">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">合同列表</text>
                        <text class="section-en">CONTRACTS</text>
                    </view>
                </view>
            </view>

            <list-show full ref="contracts" v-model="data2show" :fetch_function="get_sale_contract" height="68vh"
                search_key="search_cond"
                :fetch_params="[cur_urls, make_context_req, show_scope_switch, self_info && self_info.company_is_group, stat_context_company_id]"
                v-if="cur_urls && cur_urls.get_url">
                <view class="contract-card" :class="{ expired: item.expired }" v-for="(item, c_index) in data2show" :key="item.id">
                    <view class="contract-main">
                        <view class="card-head">
                            <view class="card-head-left">
                                <view class="title-line">
                                    <text class="contract-title">{{ item.company.name }}</text>
                                    <text class="status-pill st-expired" v-if="item.expired">已过期</text>
                                    <text class="status-pill st-ok" v-else>有效</text>
                                </view>
                                <view class="meta-line" v-if="item.begin_time && item.end_time">
                                    <text class="meta-line-text">{{ item.begin_time }} ~ {{ item.end_time }}</text>
                                </view>
                                <view class="meta-line" v-if="item.number || item.customer_code">
                                    <text class="meta-line-text" v-if="item.number">编号 {{ item.number }}</text>
                                    <text class="meta-dot" v-if="item.number && item.customer_code">·</text>
                                    <text class="meta-line-text code" v-if="item.customer_code">编码 {{ item.customer_code }}</text>
                                </view>
                                <view class="meta-line" v-if="show_scope_switch && !(item.contract_stuff_schemes && item.contract_stuff_schemes.length)">
                                    <text class="meta-line-text">方案 {{ item.discount_scheme ? item.discount_scheme.name : '无' }}</text>
                                </view>
                            </view>
                            <view class="balance-box">
                                <text class="balance-label">余额（元）</text>
                                <text class="balance-text">{{ item.balance.toFixed(2) }}</text>
                            </view>
                        </view>

                        <view class="scheme-row" v-if="show_scope_switch && item.contract_stuff_schemes && item.contract_stuff_schemes.length">
                            <text class="chip soft" v-for="scheme_row in item.contract_stuff_schemes"
                                :key="scheme_row.id || (scheme_row.stuffId + '-' + scheme_row.discountSchemeId)">
                                {{ format_scheme_tag_text(scheme_row) }}
                            </text>
                        </view>

                        <module-filter :rm_array="['buy_management','sale_management']">
                            <view class="relation-block"
                                v-if="cur_urls && (cur_urls.need_su || cur_urls.buy_setting) && ((item.stuff && item.stuff.length) || (item.rbac_users && item.rbac_users.length))">
                                <view class="relation-group" v-if="item.stuff && item.stuff.length">
                                    <text class="relation-label">物料</text>
                                    <view class="chip-wrap">
                                        <view class="chip removable" v-for="(single_stuff, s_index) in item.stuff" :key="'stuff-' + s_index">
                                            <text class="chip-text">{{ single_stuff.name }}</text>
                                            <view class="chip-close" :data-cindex="c_index" :data-sindex="s_index" @click.stop="on_chip_unstuff">
                                                <fui-icon name="close" size="24" color="#9AA3B8"></fui-icon>
                                            </view>
                                        </view>
                                    </view>
                                </view>
                                <view class="relation-group" v-if="item.rbac_users && item.rbac_users.length">
                                    <text class="relation-label">授权</text>
                                    <view class="chip-wrap">
                                        <view class="chip removable" v-for="(single_user, u_index) in item.rbac_users" :key="'user-' + single_user.id">
                                            <text class="chip-text">{{ single_user.name ? single_user.name + '|' + single_user.phone : single_user.phone }}</text>
                                            <view class="chip-close" :data-cindex="c_index" :data-uindex="u_index" @click.stop="on_chip_unauth">
                                                <fui-icon name="close" size="24" color="#9AA3B8"></fui-icon>
                                            </view>
                                        </view>
                                    </view>
                                </view>
                            </view>
                        </module-filter>

                        <view class="action-bar">
                            <view class="action-grid">
                                <view class="action-cell" v-if="can_manage_relation">
                                    <view class="action-btn purple" :data-cindex="c_index" @click="on_card_add_stuff">
                                        <text class="action-btn-text">新增物料</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="can_manage_relation">
                                    <view class="action-btn success" :data-cindex="c_index" @click="on_card_add_auth">
                                        <text class="action-btn-text">新增授权</text>
                                    </view>
                                </view>
                                <view class="action-cell">
                                    <view class="action-btn primary" :data-cindex="c_index" @click="on_card_attach">
                                        <text class="action-btn-text">查看资质</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="can_charge">
                                    <view class="action-btn primary" :data-cindex="c_index" @click="on_card_charge">
                                        <text class="action-btn-text">充值</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="can_charge_history">
                                    <view class="action-btn warn" :data-cindex="c_index" @click="on_card_charge_history">
                                        <text class="action-btn-text">充值记录</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="cur_urls && cur_urls.motive">
                                    <view class="action-btn purple" :data-cindex="c_index" @click="on_card_update">
                                        <text class="action-btn-text">修改</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="cur_urls && cur_urls.motive">
                                    <view class="action-btn danger" :data-cindex="c_index" @click="on_card_del">
                                        <text class="action-btn-text">删除</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="show_scope_switch">
                                    <view class="action-btn primary" :data-cindex="c_index" @click="on_card_set_scheme">
                                        <text class="action-btn-text">设置方案</text>
                                    </view>
                                </view>
                                <view class="action-cell" v-if="show_scope_switch">
                                    <view class="action-btn success" :data-cindex="c_index" @click="on_card_stuff_price">
                                        <text class="action-btn-text">物料单价</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </list-show>
        </view>
    </view>

    <view class="fab-add" v-if="cur_urls && cur_urls.motive" @click="open_add_contract">
        <text class="fab-add-text">新增</text>
    </view>

    <fui-gallery :urls="attach_url" v-if="show_attach" :show="show_attach" @hide="show_attach = false" @change="change_index"></fui-gallery>
    <view v-if="show_attach" class="download-button-container">
        <fui-text color="#fff" text="下载" @click="download_img"></fui-text>
    </view>

    <fui-modal width="600" :show="show_update_contract" @click="update_contract" v-if="show_update_contract">
        <fui-form ref="update_contract" top="100">
            <fui-input label="开始时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.begin_time" @click="open_date_range"></fui-input>
            <fui-input label="结束时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.end_time" @click="open_date_range"></fui-input>
            <fui-input label="客商编码" borderTop placeholder="请输入客商编码" v-model="new_contract.customer_code"></fui-input>
            <fui-input label="合同编号" borderTop placeholder="请输入合同编号" v-model="new_contract.number"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_add_contract" @click="add_contract" v-if="show_add_contract">
        <fui-form ref="add_contract" top="100">
            <fui-input label="客商" borderTop placeholder="点击选择客商" v-model="company_name" disabled @click="open_customers"></fui-input>
            <fui-input label="开始时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.begin_time" @click="open_date_range"></fui-input>
            <fui-input label="结束时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.end_time" @click="open_date_range"></fui-input>
            <fui-input label="客商编码" borderTop placeholder="请输入客商编码" v-model="new_contract.customer_code"></fui-input>
            <fui-input label="合同编号" borderTop placeholder="请输入合同编号" v-model="new_contract.number"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_customers" @close="show_customers= false">
        <fui-list>
            <list-show v-if="show_customers" v-model="customers_data2show" :fetch_function="get_customers" search_key="name" server_search height="40vh">
                <fui-list-cell arrow v-for="(item, index) in customers_data2show" :key="item.id" :index="index" @click="on_select_company">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-date-picker range :show="show_date_range" type="3" :value="new_contract.begin_time" :valueEnd="new_contract.end_time" @change="set_date_range" @cancel="show_date_range =false"></fui-date-picker>
    <fui-bottom-popup :show="show_add_stuff" @close="show_add_stuff = false">
        <fui-list>
            <list-show v-if="show_add_stuff" ref="stuff_got" v-model="stuff_data2show" :fetch_function="get_stuff" :fetch_params="[cur_urls, make_context_req, show_scope_switch, self_info && self_info.company_is_group, stat_context_company_id]" search_key="name" height="40vh">
                <fui-list-cell arrow v-for="(item, index) in (stuff_data2show || [])" :key="item.id" :index="index" @click="add_stuff2contract_by_index">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-modal width="600" :descr="'确定要取消' + focus_item.company.name + '关注' + focus_stuff.name + '吗？'" v-if="show_del_stuff" :show="show_del_stuff" @click="del_stuff">
    </fui-modal>

    <fui-modal width="600" :show="show_add_auth" v-if="show_add_auth" maskClosable @click="add_auth" @cancel="close_add_auth">
        <fui-form ref="add_auth" top="100">
            <fui-input required label="用户手机号" maxlength="11" borderTop placeholder="请输入手机号" v-model="phone"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :descr="'确定要取消授权' + focus_user.phone + '吗？'" :show="show_unauth" v-if="show_unauth" @click="unauth_user">
    </fui-modal>
    <fui-modal width="600" :descr="'确定要删除' + focus_item.company.name + '吗？'" :show="show_del" v-if="show_del" @click="del_contract">
    </fui-modal>
    <fui-modal width="600" :show="show_charge" :buttons="charge_buttons" @click="charge" v-if="show_charge">
        <fui-form ref="charge" top="100">
            <fui-input required label="充值金额" borderTop placeholder="负值为扣款" v-model="cash"></fui-input>
            <fui-input required label="充值原因" borderTop placeholder="请输入充值原因" v-model="comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_charge_history" @close="show_charge_history = false">
        <view>
            <list-show v-if="show_charge_history" v-model="histories_data2show" ref="history" :fetch_function="get_history" :fetch_params="[focus_item.id, cur_urls, make_context_req, show_scope_switch, self_info && self_info.company_is_group, stat_context_company_id]" search_key="search_cond" height="40vh">
                <u-cell v-for="(item, index) in histories_data2show" :key="item.id || index" size="large" :title="item.operator || '-'" :value="'￥' + format_cash(item.cash_increased)">
                    <template #label>
                        {{item.time}}:{{item.comment}}
                    </template>
                </u-cell>
            </list-show>
        </view>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_scope_picker" @close="show_scope_picker = false" z-index="1003">
        <view class="picker-title">选择操作主体</view>
        <fui-list>
            <fui-list-cell v-for="(s, index) in stat_scopes" :key="s.id" :index="index" arrow @click="on_choose_stat_scope">
                <view class="scope-row">
                    <view class="scope-name">{{ s.name }}</view>
                    <fui-icon v-if="stat_context_company_id === s.id" name="check" size="30" color="#465CFF"></fui-icon>
                </view>
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_scheme_manager" @close="show_scheme_manager = false">
        <fui-list>
            <fui-list-cell arrow @click="open_new_scheme_modal">
                新增优惠方案
            </fui-list-cell>
            <fui-list-cell v-for="(item, index) in discount_schemes" :key="item.id" :index="index">
                <view class="scheme-row-manage">
                    <view class="scheme-name">{{item.name}}（{{item.delta_price}}）</view>
                    <view class="scheme-ops">
                        <view class="mini-btn" :data-index="index" @click.stop="on_edit_scheme">编辑</view>
                        <view class="mini-btn danger" :data-index="index" @click.stop="on_delete_scheme">删除</view>
                    </view>
                </view>
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-modal width="600" :show="show_scheme_modal" @click="save_scheme" v-if="show_scheme_modal">
        <fui-form ref="scheme_form" top="100">
            <fui-input required label="方案名" borderTop placeholder="如：单价-1元" v-model="scheme_edit_form.name"></fui-input>
            <fui-input required label="单价调整" borderTop placeholder="如：-1.6" v-model="scheme_edit_form.delta_price"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :descr="'确定删除优惠方案' + focus_scheme.name + '吗？'" :show="show_delete_scheme" v-if="show_delete_scheme" @click="delete_scheme">
    </fui-modal>
    <fui-bottom-popup :show="show_contract_scheme_stuff_popup" @close="show_contract_scheme_stuff_popup = false">
        <fui-list>
            <fui-list-cell arrow @click="prepare_scheme_for_all_stuff">
                全部关联物料（默认）（当前: {{get_all_stuff_scheme_text()}}）
            </fui-list-cell>
            <fui-list-cell v-for="(single_stuff, index) in (focus_item.stuff || [])" :key="single_stuff.id" :index="index" arrow @click="prepare_scheme_for_stuff_by_index">
                {{single_stuff.name}}（当前: {{get_scheme_text_for_stuff(single_stuff.id)}}）
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_contract_scheme_picker" @close="show_contract_scheme_picker = false">
        <fui-list>
            <fui-list-cell arrow @click="clear_contract_scheme">清空方案</fui-list-cell>
            <fui-list-cell v-for="(item, index) in discount_schemes" :key="item.id" :index="index" arrow @click="on_pick_contract_scheme">
                {{item.name}}（{{item.delta_price}}）
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_stuff_price_popup" @close="show_stuff_price_popup = false">
        <fui-list>
            <fui-list-cell v-for="(single_stuff, index) in (focus_item.stuff || [])" :key="single_stuff.id" :index="index" arrow @click="edit_stuff_price_by_index">
                {{single_stuff.name}}（当前: {{get_override_text(single_stuff.id)}}）
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-modal width="600" :show="show_stuff_price_modal" @click="save_stuff_price" v-if="show_stuff_price_modal">
        <fui-form ref="stuff_price_form" top="100">
            <fui-input :label="focus_stuff.name || '物料'" borderTop disabled v-model="focus_stuff.name"></fui-input>
            <fui-input label="单价" borderTop placeholder="留空表示清空覆盖价" v-model="stuff_price_input"></fui-input>
        </fui-form>
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import ModuleFilter from '../components/ModuleFilter.vue';
import utils from '@/components/firstui/fui-utils';
export default {
    name: 'Contract',
    data: function () {
        return {
            show_attach: false,
            attach_url: [],
            seg: [],
            histories_data2show: [],
            stuff_data2show: [],
            customers_data2show: [],
            data2show: [],
            show_charge_history: false,
            cash: '',
            comment: '',
            show_charge: false,
            charging: false,
            show_del: false,
            phone: '',
            show_unauth: false,
            show_add_auth: false,
            show_del_stuff: false,
            show_add_stuff: false,
            show_date_range: false,
            company_name: '',
            show_add_contract: false,
            show_customers: false,
            focus_item: {
                company: {
                    name: ''
                },
                id: 0,
            },
            focus_user: {},
            focus_stuff: {},
            new_contract: {
                begin_time: '',
                end_time: '',
                number: '',
                customer_id: 0,
                customer_code: '',
            },
            cur_urls: {
                get_url: '',
                make_url: '',
                update_url: '',
                del_url: '',
                need_su: false,
                motive: false,
                buy_setting: false,
            },
            show_update_contract: false,
            gallery_index: 0,
            stat_scopes: [],
            stat_context_company_id: null,
            show_scope_picker: false,
            show_scheme_manager: false,
            discount_schemes: [],
            show_scheme_modal: false,
            scheme_edit_form: {
                id: 0,
                name: '',
                delta_price: '',
            },
            focus_scheme: {
                id: 0,
                name: '',
            },
            show_delete_scheme: false,
            show_contract_scheme_picker: false,
            show_contract_scheme_stuff_popup: false,
            focus_scheme_stuff: {},
            show_stuff_price_popup: false,
            show_stuff_price_modal: false,
            stuff_price_input: '',
            self_info: {
                company_is_group: false,
                company_id: null,
            },
        };
    },
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilter
    },
    computed: {
        has_group_member_scope: function () {
            if (!this.self_info || this.self_info.company_id == null) {
                return false;
            }
            return (this.stat_scopes || []).some(item => item.id !== this.self_info.company_id);
        },
        show_scope_switch: function () {
            return this.cur_urls
                && this.cur_urls.get_url === '/sale_management/contract_get'
                && this.self_info
                && this.self_info.company_is_group === true
                && this.has_group_member_scope;
        },
        current_scope_name: function () {
            const current = this.stat_scopes.find(item => item.id === this.stat_context_company_id);
            return current ? current.name : '';
        },
        current_seg_name: function () {
            const hit = (this.seg || []).find(item => item.get_url === (this.cur_urls && this.cur_urls.get_url));
            return hit ? hit.name : '';
        },
        can_manage_relation: function () {
            if (!this.cur_urls || !(this.cur_urls.need_su || this.cur_urls.buy_setting)) {
                return false;
            }
            return this.$has_module('buy_management') || this.$has_module('sale_management');
        },
        can_charge: function () {
            return !!(this.cur_urls && this.cur_urls.need_su && this.$has_module('cash'));
        },
        can_charge_history: function () {
            return !!(this.cur_urls && (this.cur_urls.get_url === '/customer/contract_get' || this.cur_urls.need_su));
        },
        charge_buttons: function () {
            if (this.charging) {
                return [{
                    text: '取消',
                    plain: true,
                    color: '#C5CAD5',
                    background: '#E8ECF6',
                }, {
                    text: '提交中...',
                    background: '#A8B3D1',
                    color: '#FFFFFF',
                }];
            }
            return [{
                text: '取消',
                plain: true,
            }, {
                text: '确定',
            }];
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
        make_context_req: function (body = {}, _url = '', show_scope_switch = false, company_is_group = false, stat_context_company_id = null) {
            const ret = { ...body };
            // 集团账号在查询充值历史等跨模块接口时，也需要携带统计主体上下文。
            if ((show_scope_switch || company_is_group === true) && stat_context_company_id != null) {
                ret.stat_context_company_id = stat_context_company_id;
            }
            return ret;
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
        choose_stat_scope: function (company_id) {
            if (this.stat_context_company_id === company_id) {
                this.show_scope_picker = false;
                return;
            }
            this.stat_context_company_id = company_id;
            this.show_scope_picker = false;
            this.$nextTick(() => {
                if (this.$refs.contracts) {
                    this.$refs.contracts.refresh();
                }
            });
        },
        open_scheme_manager: async function () {
            await this.load_discount_schemes();
            this.show_scheme_manager = true;
        },
        load_discount_schemes: async function () {
            const req = this.make_context_req({}, '/sale_management/discount_scheme_list', this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id);
            const ret = await this.$send_req('/sale_management/discount_scheme_list', req);
            this.discount_schemes = ret.schemes || [];
        },
        open_new_scheme_modal: function () {
            this.scheme_edit_form = { id: 0, name: '', delta_price: '' };
            this.show_scheme_modal = true;
        },
        open_edit_scheme_modal: function (item) {
            this.scheme_edit_form = {
                id: item.id,
                name: item.name,
                delta_price: String(item.delta_price),
            };
            this.show_scheme_modal = true;
        },
        save_scheme: async function (detail) {
            if (detail.index !== 1) {
                this.show_scheme_modal = false;
                return;
            }
            if (!this.scheme_edit_form.name || this.scheme_edit_form.delta_price === '') {
                uni.showToast({ title: '请填写完整', icon: 'none' });
                return;
            }
            const req = this.make_context_req({
                id: this.scheme_edit_form.id || undefined,
                name: this.scheme_edit_form.name,
                delta_price: parseFloat(this.scheme_edit_form.delta_price),
            }, '/sale_management/discount_scheme_upsert', this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id);
            await this.$send_req('/sale_management/discount_scheme_upsert', req);
            this.show_scheme_modal = false;
            await this.load_discount_schemes();
            uni.startPullDownRefresh();
        },
        prepare_delete_scheme: function (item) {
            this.focus_scheme = item;
            this.show_delete_scheme = true;
        },
        delete_scheme: async function (detail) {
            if (detail.index === 1) {
                const req = this.make_context_req({ id: this.focus_scheme.id }, '/sale_management/discount_scheme_delete', this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id);
                await this.$send_req('/sale_management/discount_scheme_delete', req);
                await this.load_discount_schemes();
                uni.startPullDownRefresh();
            }
            this.show_delete_scheme = false;
        },
        prepare_set_contract_scheme: async function (item) {
            this.focus_item = item;
            await this.load_discount_schemes();
            this.show_contract_scheme_stuff_popup = true;
        },
        prepare_scheme_for_all_stuff: function () {
            this.focus_scheme_stuff = null;
            this.show_contract_scheme_stuff_popup = false;
            this.show_contract_scheme_picker = true;
        },
        prepare_scheme_for_stuff_by_index: function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const single_stuff = ((this.focus_item && this.focus_item.stuff) || [])[index];
            if (!single_stuff || !single_stuff.id) {
                uni.showToast({ title: '未找到物料，请重试', icon: 'none' });
                return;
            }
            this.focus_scheme_stuff = single_stuff;
            this.show_contract_scheme_stuff_popup = false;
            this.show_contract_scheme_picker = true;
        },
        get_all_stuff_scheme_text: function () {
            const rows = (this.focus_item && this.focus_item.contract_stuff_schemes) || [];
            if (rows.length > 0) {
                const firstSchemeId = rows[0].discountSchemeId;
                const allSame = rows.every((row) => row.discountSchemeId === firstSchemeId);
                if (allSame && rows[0].discount_scheme) {
                    return rows[0].discount_scheme.name;
                }
                if (allSame && !rows[0].discount_scheme) {
                    return '无';
                }
                return '各物料不同';
            }
            return this.focus_item && this.focus_item.discount_scheme
                ? this.focus_item.discount_scheme.name
                : '无';
        },
        get_scheme_text_for_stuff: function (stuff_id) {
            const rows = (this.focus_item && this.focus_item.contract_stuff_schemes) || [];
            const found = rows.find((row) => row.stuffId === stuff_id);
            return found && found.discount_scheme ? found.discount_scheme.name : '无';
        },
        format_scheme_tag_text: function (scheme_row) {
            const stuff_name = scheme_row.stuff && scheme_row.stuff.name ? scheme_row.stuff.name : `物料#${scheme_row.stuffId}`;
            const scheme_name = scheme_row.discount_scheme && scheme_row.discount_scheme.name
                ? scheme_row.discount_scheme.name
                : '无';
            return `${stuff_name}: ${scheme_name}`;
        },
        set_contract_scheme: async function (scheme_id) {
            const req_body = {
                contract_id: this.focus_item.id,
                scheme_id: scheme_id,
            };
            if (this.focus_scheme_stuff && this.focus_scheme_stuff.id) {
                req_body.stuff_id = this.focus_scheme_stuff.id;
            }
            const req = this.make_context_req(req_body, '/sale_management/contract_set_discount_scheme', this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id);
            await this.$send_req('/sale_management/contract_set_discount_scheme', req);
            this.show_contract_scheme_picker = false;
            uni.startPullDownRefresh();
        },
        prepare_stuff_price: function (item) {
            this.focus_item = item;
            this.show_stuff_price_popup = true;
        },
        get_override_text: function (stuff_id) {
            const prices = this.focus_item.contract_stuff_prices || [];
            const found = prices.find(x => x.stuffId === stuff_id);
            return found ? found.unit_price : '未设置';
        },
        edit_stuff_price: function (single_stuff) {
            this.focus_stuff = single_stuff;
            const prices = this.focus_item.contract_stuff_prices || [];
            const found = prices.find(x => x.stuffId === single_stuff.id);
            this.stuff_price_input = found ? String(found.unit_price) : '';
            this.show_stuff_price_modal = true;
        },
        edit_stuff_price_by_index: function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const single_stuff = ((this.focus_item && this.focus_item.stuff) || [])[index];
            if (!single_stuff || !single_stuff.id) {
                uni.showToast({ title: '未找到物料，请重试', icon: 'none' });
                return;
            }
            this.edit_stuff_price(single_stuff);
        },
        save_stuff_price: async function (detail) {
            if (detail.index === 1) {
                let unit_price = null;
                if (this.stuff_price_input !== '') {
                    unit_price = parseFloat(this.stuff_price_input);
                }
                const req = this.make_context_req({
                    contract_id: this.focus_item.id,
                    stuff_id: this.focus_stuff.id,
                    unit_price: unit_price,
                }, '/sale_management/contract_set_stuff_price', this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id);
                await this.$send_req('/sale_management/contract_set_stuff_price', req);
                this.show_stuff_price_modal = false;
                this.show_stuff_price_popup = false;
                uni.startPullDownRefresh();
            } else {
                this.show_stuff_price_modal = false;
            }
        },
        change_index: function (e) {
            this.gallery_index = e.index
        },
        download_img: function () {
            let uri = this.attach_url[this.gallery_index]
            this.$download_file(uri)
        },
        show_attach_pic: function (item) {
            this.show_attach = true;
            if (item.company.attachment) {
                this.attach_url = [this.$convert_attach_url(item.company.attachment)];
            } else {
                this.attach_url = ['/static/no_att.jpg'];
            }
        },
        change_seg: function (e) {
            // 确保 cur_urls 对象存在
            if (!this.cur_urls) {
                this.cur_urls = {
                    get_url: '',
                    make_url: '',
                    update_url: '',
                    del_url: '',
                    need_su: false,
                    motive: false,
                    buy_setting: false,
                };
            }
            this.cur_urls.get_url = e.get_url;
            this.cur_urls.make_url = e.make_url;
            this.cur_urls.update_url = e.update_url;
            this.cur_urls.del_url = e.del_url;
            this.cur_urls.need_su = e.need_su;
            this.cur_urls.motive = e.motive;
            this.cur_urls.buy_setting = e.buy_setting;
            this.$nextTick(() => {
                if (this.$refs.contracts) {
                    this.$refs.contracts.refresh();
                }
                if (this.$refs.stuff_got) {
                    this.$refs.stuff_got.refresh();
                }
            });
        },
        init_top_seg: function () {
            this.seg = []
            if (this.$has_module('customer')) {
                this.seg.push({
                    name: '采购参与',
                    get_url: '/customer/contract_get',
                    need_su: false,
                    motive: false,
                    buy_setting: false,
                });
            }
            if (this.$has_module('sale_management')) {
                this.seg.push({
                    name: '销售签订',
                    get_url: '/sale_management/contract_get',
                    make_url: '/sale_management/contract_make',
                    del_url: '/sale_management/contract_destroy',
                    update_url: '/sale_management/contract_update',
                    need_su: true,
                    motive: true,
                    buy_setting: false,
                });
            }
            if (this.$has_module('supplier')) {
                this.seg.push({
                    name: '销售参与',
                    get_url: '/supplier/contract_get',
                    need_su: false,
                    motive: false,
                    buy_setting: false,
                });
            }
            if (this.$has_module('buy_management')) {
                this.seg.push({
                    name: '采购签订',
                    get_url: '/buy_management/contract_get',
                    make_url: '/buy_management/contract_make',
                    del_url: '/buy_management/contract_destroy',
                    update_url: '/buy_management/contract_update',
                    need_su: false,
                    motive: true,
                    buy_setting: true,
                });
            }
            if (this.seg.length > 0) {
                this.cur_urls.get_url = this.seg[0].get_url;
                this.cur_urls.make_url = this.seg[0].make_url;
                this.cur_urls.update_url = this.seg[0].update_url;
                this.cur_urls.del_url = this.seg[0].del_url;
                this.cur_urls.motive = this.seg[0].motive;
                this.cur_urls.need_su = this.seg[0].need_su;
                this.cur_urls.buy_setting = this.seg[0].buy_setting;
            } else {
                // 如果没有可用的模块，确保 cur_urls 有默认值
                this.cur_urls = {
                    get_url: '',
                    make_url: '',
                    update_url: '',
                    del_url: '',
                    need_su: false,
                    motive: false,
                    buy_setting: false,
                };
            }
        },
        get_history: async function (_pageNo, [id, cur_urls, make_context_req, show_scope_switch, company_is_group, stat_context_company_id]) {
            if (id == 0) {
                return [];
            }
            let history_url = '/cash/history';
            if (cur_urls && cur_urls.get_url === '/customer/contract_get') {
                history_url = '/customer/history';
            }
            let ret = await this.$send_req(history_url, make_context_req({
                contract_id: id,
                pageNo: _pageNo
            }, history_url, show_scope_switch, company_is_group, stat_context_company_id));
            const histories = (ret && ret.histories) || [];
            histories.forEach(item => {
                item.search_cond = item.operator + item.cash_increased + item.comment;
            });
            return histories;
        },
        format_cash: function (val) {
            const num = Number(val);
            if (Number.isNaN(num)) {
                return '0.00';
            }
            return num.toFixed(2);
        },
        prepare_charge_history: function (item) {
            this.show_charge_history = true;
            this.focus_item = item;
            this.$nextTick(() => {
                this.$refs.history.refresh();
            });
        },
        charge: async function (detail) {
            if (detail.index == 1) {
                if (this.charging) {
                    return;
                }
                this.charging = true;
                try {
                    let rules = [{
                        name: 'cash',
                        rule: ['required', 'range:[-99999999999,99999999999]'],
                        msg: ['请输入金额', '金额必须为数字']
                    }, {
                        name: 'comment',
                        rule: ['required'],
                        msg: ['请填写备注']
                    }];
                    let val_ret = await this.$refs.charge.validator({
                        cash: this.cash,
                        comment: this.comment
                    }, rules);
                    if (!val_ret.isPassed) {
                        this.charging = false;
                        return;
                    }
                    let charge_url = '/cash/charge';
                    await this.$send_req(charge_url, this.make_context_req({
                        contract_id: this.focus_item.id,
                        cash_increased: parseFloat(this.cash),
                        comment: this.comment
                    }, charge_url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                    uni.startPullDownRefresh();
                    this.show_charge = false;
                } catch (e) {
                    this.charging = false;
                    return;
                }
                this.charging = false;
            } else {
                if (this.charging) {
                    return;
                }
                this.show_charge = false;
            }
        },
        prepare_charge: function (item) {
            this.charging = false;
            this.show_charge = true;
            this.focus_item = item;
        },
        del_contract: async function (detail) {
            if (detail.index == 1) {
                if (!this.cur_urls || !this.cur_urls.del_url) {
                    console.error('cur_urls.del_url 未定义');
                    return;
                }
                await this.$send_req(this.cur_urls.del_url, this.make_context_req({
                    contract_id: this.focus_item.id
                }, this.cur_urls.del_url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                uni.startPullDownRefresh();
            }
            this.show_del = false;
        },
        prepare_del: function (item) {
            this.show_del = true;
            this.focus_item = item;
        },
        prepare_update: function (item) {
            this.show_update_contract = true;
            this.new_contract.contract_id = item.id;
        },
        unauth_user: async function (detail) {
            if (detail.index == 1) {
                let unauth_url = '/sale_management/unauthorize_user';
                if (this.cur_urls && this.cur_urls.buy_setting) {
                    unauth_url = '/buy_management/unauthorize_user';
                }
                await this.$send_req(unauth_url, this.make_context_req({
                    contract_id: this.focus_item.id,
                    phone: this.focus_user.phone,
                }, unauth_url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                uni.startPullDownRefresh();
            }
            this.show_unauth = false;
        },
        close_add_auth() {
            this.show_add_auth = false;
            this.phone = ''
        },
        add_auth: async function (detail) {
            if (detail.index == 1) {
                this.$refs.add_auth.validator({
                    phone: this.phone
                }, [{
                    name: "phone",
                    rule: ["required", 'isMobile'],
                    msg: ["请输入手机号", "请输入有效手机号"]
                }]).then(async res => {
                    if (res.isPassed) {
                        let auth_url = '/sale_management/authorize_user';
                        if (this.cur_urls && this.cur_urls.buy_setting) {
                            auth_url = '/buy_management/authorize_user';
                        }
                        await this.$send_req(auth_url, this.make_context_req({
                            contract_id: this.focus_item.id,
                            phone: this.phone
                        }, auth_url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                        uni.startPullDownRefresh();
                        this.close_add_auth()
                    }
                }).catch(err => {
                    console.log(err)
                })
            } else {
                this.close_add_auth()
            }
        },
        prepare_auth: function (item) {
            this.show_add_auth = true;
            this.focus_item = item;
        },
        del_stuff: async function (detail) {
            if (detail.index == 1) {
                let url = '/sale_management/contract_del_stuff';
                if (this.cur_urls && this.cur_urls.buy_setting) {
                    url = "/buy_management/contract_del_stuff"
                }
                await this.$send_req(url, this.make_context_req({
                    contract_id: this.focus_item.id,
                    stuff_id: this.focus_stuff.id
                }, url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                uni.startPullDownRefresh();
            }
            this.show_del_stuff = false;
        },
        add_stuff2contract: async function (item) {
            let req = {
                contract_id: this.focus_item.id,
                stuff_id: item.id
            };
            let url = '/sale_management/contract_add_stuff';
            if (this.cur_urls && this.cur_urls.buy_setting) {
                url = "/buy_management/contract_add_stuff"
            }
            await this.$send_req(url, this.make_context_req(req, url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
            uni.startPullDownRefresh();
            this.show_add_stuff = false;
        },
        add_stuff2contract_by_index: async function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const item = (this.stuff_data2show || [])[index];
            if (!item || !item.id) {
                uni.showToast({ title: '未找到物料，请重试', icon: 'none' });
                return;
            }
            await this.add_stuff2contract(item);
        },
        get_stuff: async function (pageNo, [cur_urls, make_context_req, show_scope_switch, company_is_group, stat_context_company_id]) {
            const buy_setting = !!(cur_urls && cur_urls.buy_setting);
            const use_sale_management_stuff =
                cur_urls && cur_urls.motive && !buy_setting;
            const has_required_module = use_sale_management_stuff
                ? this.$has_module('sale_management')
                : this.$has_module('stuff');
            if (has_required_module == false) {
                return [];
            }
            let stuff_url = '/stuff/get_all';
            if (use_sale_management_stuff) {
                stuff_url = '/sale_management/get_stuff_for_contract';
            }
            let resp = await this.$send_req(stuff_url, make_context_req({
                pageNo: pageNo
            }, stuff_url, show_scope_switch, company_is_group, stat_context_company_id));
            if (use_sale_management_stuff) {
                return resp.stuff || [];
            }
            let ret = [];
            (resp.stuff || []).forEach(ele => {
                if (ele.use_for_buy == buy_setting) {
                    ret.push(ele)
                }
            });
            return ret
        },
        prepare_add_stuff: function (item) {
            this.focus_item = item;
            this.show_add_stuff = true;
        },
        set_date_range: function (e) {
            this.show_date_range = false;
            this.new_contract.begin_time = e.startDate.result;
            this.new_contract.end_time = e.endDate.result;
        },
        select_company: function (item) {
            this.new_contract.customer_id = item.id;
            this.new_contract.supplier_id = item.id;
            this.company_name = item.name;
            this.show_customers = false;
        },
        get_customers: async function (pageNo, fetch_params, fetch_options = {}) {
            let req = {
                pageNo: pageNo,
            };
            if (fetch_options.search_key) {
                req.search_key = fetch_options.search_key;
            }
            let ret = await this.$send_req('/global/company_get_all', req);
            return ret.all_company;
        },
        update_contract: async function (detail) {
            if (detail.index == 1) {
                if (!this.cur_urls || !this.cur_urls.update_url) {
                    console.error('cur_urls.update_url 未定义');
                    return;
                }
                await this.$send_req(this.cur_urls.update_url, this.make_context_req(this.new_contract, this.cur_urls.update_url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                uni.startPullDownRefresh();
            }
            this.show_update_contract = false;
        },
        add_contract: async function (detail) {
            if (detail.index == 1) {
                if (!this.cur_urls || !this.cur_urls.make_url) {
                    console.error('cur_urls.make_url 未定义');
                    return;
                }
                let rules = [{
                    name: 'company_name',
                    rule: ['required'],
                    msg: ['请选择客商']
                }];
                let val_ret = await this.$refs.add_contract.validator({
                    company_name: this.company_name
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req(this.cur_urls.make_url, this.make_context_req(this.new_contract, this.cur_urls.make_url, this.show_scope_switch, this.self_info && this.self_info.company_is_group === true, this.stat_context_company_id));
                uni.startPullDownRefresh();
            }
            this.show_add_contract = false;
        },
        prepare_unstuff: function (item, single_stuff) {
            this.show_del_stuff = true;
            this.focus_item = item;
            this.focus_stuff = single_stuff;
        },
        prepare_unauth: function (item, single_user) {
            this.show_unauth = true;
            this.focus_item = item;
            this.focus_user = single_user;
        },
        get_card_item: function (e) {
            const cindex = Number(e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.cindex
                : -1);
            const item = (this.data2show || [])[cindex];
            if (!item) {
                uni.showToast({ title: '未找到合同，请重试', icon: 'none' });
                return null;
            }
            return item;
        },
        on_chip_unstuff: function (e) {
            const item = this.get_card_item(e);
            if (!item) {
                return;
            }
            const sindex = Number(e.currentTarget.dataset.sindex);
            const single_stuff = (item.stuff || [])[sindex];
            if (!single_stuff) {
                uni.showToast({ title: '未找到物料，请重试', icon: 'none' });
                return;
            }
            this.prepare_unstuff(item, single_stuff);
        },
        on_chip_unauth: function (e) {
            const item = this.get_card_item(e);
            if (!item) {
                return;
            }
            const uindex = Number(e.currentTarget.dataset.uindex);
            const single_user = (item.rbac_users || [])[uindex];
            if (!single_user) {
                uni.showToast({ title: '未找到授权用户，请重试', icon: 'none' });
                return;
            }
            this.prepare_unauth(item, single_user);
        },
        on_card_add_stuff: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_add_stuff(item);
            }
        },
        on_card_add_auth: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_auth(item);
            }
        },
        on_card_attach: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.show_attach_pic(item);
            }
        },
        on_card_charge: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_charge(item);
            }
        },
        on_card_charge_history: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_charge_history(item);
            }
        },
        on_card_update: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_update(item);
            }
        },
        on_card_del: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_del(item);
            }
        },
        on_card_set_scheme: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_set_contract_scheme(item);
            }
        },
        on_card_stuff_price: function (e) {
            const item = this.get_card_item(e);
            if (item) {
                this.prepare_stuff_price(item);
            }
        },
        open_add_contract: function () {
            this.show_add_contract = true;
        },
        open_date_range: function () {
            this.show_date_range = true;
        },
        open_customers: function () {
            this.show_customers = true;
        },
        on_choose_stat_scope: function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const scope = (this.stat_scopes || [])[index];
            if (!scope) {
                return;
            }
            this.choose_stat_scope(scope.id);
        },
        clear_contract_scheme: function () {
            this.set_contract_scheme(null);
        },
        on_pick_contract_scheme: function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const scheme = (this.discount_schemes || [])[index];
            if (!scheme) {
                return;
            }
            this.set_contract_scheme(scheme.id);
        },
        on_select_company: function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const item = (this.customers_data2show || [])[index];
            if (!item) {
                uni.showToast({ title: '未找到客商，请重试', icon: 'none' });
                return;
            }
            this.select_company(item);
        },
        on_edit_scheme: function (e) {
            const index = Number(e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.index
                : -1);
            const item = (this.discount_schemes || [])[index];
            if (!item) {
                return;
            }
            this.open_edit_scheme_modal(item);
        },
        on_delete_scheme: function (e) {
            const index = Number(e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.index
                : -1);
            const item = (this.discount_schemes || [])[index];
            if (!item) {
                return;
            }
            this.prepare_delete_scheme(item);
        },
        get_sale_contract: async function (pageNo, [cur_urls, make_context_req, show_scope_switch, company_is_group, stat_context_company_id]) {
            // 添加安全检查，防止访问未定义对象的属性
            if (!cur_urls || !cur_urls.get_url) {
                console.error('cur_urls 或 cur_urls.get_url 未定义');
                return [];
            }
            let ret = await this.$send_req(cur_urls.get_url, make_context_req({
                pageNo: pageNo
            }, cur_urls.get_url, show_scope_switch, company_is_group, stat_context_company_id));
            ret.contracts.forEach(item => {
                item.search_cond = item.company.name;
            });
            return ret.contracts;
        },
        
    },
    created: function () {
        this.init_top_seg();
    },
    onLoad: async function () {
        await this.load_self_info();
        await this.load_stat_scopes();
    },
    onShow: function () {
        if (!this.seg.length || !this.cur_urls || !this.cur_urls.get_url) {
            this.init_top_seg();
        }
        this.new_contract.begin_time = utils.dateFormatter(new Date(), 'y-m-d', 4, false);
        let end_date = new Date();
        end_date.setMonth(end_date.getMonth() + 12);
        this.new_contract.end_time = utils.dateFormatter(end_date, 'y-m-d', 4, false);
    },
    onPullDownRefresh: function () {
        if (this.$refs.contracts) {
            this.$refs.contracts.refresh();
        }
        uni.stopPullDownRefresh();
    }
}
</script>

<style scoped>
.contract-page {
    min-height: 100vh;
    background: #F2F4FA;
    box-sizing: border-box;
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
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
    transform: translate(36%, -24%);
}

.hero-top {
    position: relative;
    z-index: 1;
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
    margin-bottom: 4rpx;
}

.seg-single {
    display: block;
    text-align: center;
    font-size: 28rpx;
    color: #465CFF;
    font-weight: 700;
    padding: 8rpx 0;
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

.list-shell {
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    overflow: hidden;
    padding-bottom: 8rpx;
}

.section-head {
    padding: 16rpx 18rpx 12rpx;
    background: linear-gradient(90deg, #F3F5FF 0%, #FFFFFF 70%);
    border-bottom: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: row;
    align-items: center;
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

.contract-card {
    position: relative;
    margin: 16rpx 16rpx 0;
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-radius: 22rpx;
    overflow: hidden;
    box-shadow: 0 8rpx 22rpx rgba(40, 58, 120, 0.05);
}

.contract-card.expired {
    opacity: 0.7;
}

.contract-main {
    padding: 0;
}

.card-head {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
    padding: 24rpx 24rpx 18rpx;
}

.card-head-left {
    flex: 1;
    min-width: 0;
}

.title-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 10rpx;
}

.contract-title {
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

.st-ok {
    color: #2DBE6C;
    background: rgba(45, 190, 108, 0.12);
}

.st-expired {
    color: #8A94A6;
    background: rgba(138, 148, 166, 0.16);
}

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

.meta-line-text.code {
    color: #B45309;
}

.meta-dot {
    margin: 0 8rpx;
    color: #C5CAD5;
    font-size: 22rpx;
}

.balance-box {
    flex-shrink: 0;
    text-align: right;
    padding-top: 2rpx;
}

.balance-label {
    display: block;
    font-size: 18rpx;
    color: #9AA3B8;
    margin-bottom: 4rpx;
}

.balance-text {
    display: block;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    letter-spacing: 0.5rpx;
    font-variant-numeric: tabular-nums;
}

.scheme-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8rpx;
    padding: 0 24rpx 14rpx;
}

.relation-block {
    margin: 0 24rpx 4rpx;
    padding: 14rpx 16rpx 8rpx;
    background: #F7F8FC;
    border-radius: 16rpx;
}

.relation-group {
    margin-bottom: 10rpx;
}

.relation-label {
    display: block;
    font-size: 18rpx;
    color: #9AA3B8;
    margin-bottom: 8rpx;
    letter-spacing: 1rpx;
}

.chip-wrap {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8rpx;
}

.chip {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    max-width: 100%;
    padding: 6rpx 14rpx;
    border-radius: 10rpx;
    background: #FFFFFF;
    border: 1rpx solid #E8ECF6;
}

.chip.soft {
    font-size: 20rpx;
    color: #465CFF;
    background: rgba(70, 92, 255, 0.08);
    border-color: transparent;
}

.chip.removable {
    padding-right: 8rpx;
}

.chip-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4rpx;
}

.chip-text {
    font-size: 20rpx;
    color: #4A5568;
    margin-right: 4rpx;
    max-width: 360rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.action-bar {
    margin-top: 8rpx;
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

.action-btn.primary {
    background: rgba(70, 92, 255, 0.1);
    border-color: rgba(70, 92, 255, 0.28);
}

.action-btn.primary .action-btn-text {
    color: #465CFF;
}

.action-btn.success {
    background: rgba(45, 190, 108, 0.1);
    border-color: rgba(45, 190, 108, 0.28);
}

.action-btn.success .action-btn-text {
    color: #2DBE6C;
}

.action-btn.warn {
    background: rgba(255, 138, 43, 0.1);
    border-color: rgba(255, 138, 43, 0.28);
}

.action-btn.warn .action-btn-text {
    color: #FF8A2B;
}

.action-btn.purple {
    background: rgba(123, 97, 255, 0.1);
    border-color: rgba(123, 97, 255, 0.28);
}

.action-btn.purple .action-btn-text {
    color: #7B61FF;
}

.action-btn.danger {
    background: rgba(255, 77, 79, 0.08);
    border-color: rgba(255, 77, 79, 0.28);
}

.action-btn.danger .action-btn-text {
    color: #FF4D4F;
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

.download-button-container {
    position: absolute;
    top: 40rpx;
    right: 40rpx;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.6);
    padding: 10rpx 20rpx;
    border-radius: 30rpx;
}

.picker-title {
    padding: 24rpx 28rpx 8rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #1A1F36;
}

.scope-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.scope-name {
    font-size: 30rpx;
    color: #333;
}

.scheme-row-manage {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.scheme-name {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    color: #2D3748;
    margin-right: 12rpx;
}

.scheme-ops {
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

.mini-btn.danger {
    background: #FF4D4F;
}
</style>

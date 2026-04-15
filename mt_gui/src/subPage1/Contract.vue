<template>
<view>
    <fui-segmented-control :values="seg" @click="change_seg"></fui-segmented-control>
    <fui-card v-if="show_scope_switch" title="操作主体公司" full color="black" size="32">
        <view class="scope-picker-trigger" @click="open_scope_picker">
            <view class="scope-picker-label">{{ current_scope_name || '请选择公司' }}</view>
            <fui-icon name="arrowright" size="32" color="#999"></fui-icon>
        </view>
    </fui-card>
    <fui-card v-if="show_scope_switch" title="价格策略" full color="black" size="32">
        <view style="display:flex; flex-wrap: wrap;">
            <fui-tag :scaleRatio="0.8" originLeft type="primary" text="优惠方案管理" @click="open_scheme_manager"></fui-tag>
        </view>
    </fui-card>
    <list-show full ref="contracts" v-model="data2show" :fetch_function="get_sale_contract" height="85vh" style="background-color: aliceblue;" search_key="search_cond" :fetch_params="[cur_urls]" v-if="cur_urls && cur_urls.get_url">
        <fui-card full :margin="['20rpx', '0rpx']" v-for="item in data2show" :key="item.id" size="large" :class="[item.expired?'expired_line':'']" :title="item.company.name" color="black" :tag="'￥' + item.balance.toFixed(2)">
            <view style="padding: 0 20rpx;position: relative;">
                <view v-if="item.expired" class="expired_text">已过期</view>
                <module-filter require_module="sale_management">
                    <view style="display:flex; flex-wrap: wrap;" v-if="cur_urls && (cur_urls.need_su || cur_urls.buy_setting)">
                        <fui-tag v-for="(single_stuff, index) in item.stuff" :key="index" theme="plain" originLeft :scaleRatio="0.8" type="purple">
                            {{single_stuff.name}}
                            <fui-icon name="close" size="32" @click="prepare_unstuff(item, single_stuff)"></fui-icon>
                        </fui-tag>
                        <view style="display:flex; flex-wrap: wrap;" v-if="cur_urls && cur_urls.need_su">
                            <fui-tag v-for="(single_user) in item.rbac_users" :key="single_user.id" theme="plain" originLeft :scaleRatio="0.8" type="success">
                                {{single_user.name?single_user.name +'|'+single_user.phone: single_user.phone}}
                                <fui-icon name="close" size="32" @click="prepare_unauth(item, single_user)"></fui-icon>
                            </fui-tag>
                        </view>
                    </view>
                    <view style="display:flex; flex-wrap: wrap;" v-if="cur_urls && (cur_urls.need_su || cur_urls.buy_setting)">
                        <fui-tag text="新增物料" :scaleRatio="0.8" originLeft type="purple" @click="prepare_add_stuff(item)"></fui-tag>
                        <fui-tag v-if="cur_urls && cur_urls.need_su" :scaleRatio="0.8" originLeft type="success" text="新增授权" @click="prepare_auth(item)"></fui-tag>
                    </view>
                </module-filter>
                <fui-tag text="查看资质" :scaleRatio="0.8" originLeft type="primary" @click="show_attach_pic(item)"></fui-tag>
                <view>
                    <view v-if="item.begin_time && item.end_time" style="color: blue;">
                        {{item.begin_time}}至{{item.end_time}}
                    </view>
                    <view v-if="show_scope_switch" style="color: #8a2be2;">
                        优惠方案: {{item.discount_scheme ? item.discount_scheme.name : '无'}}
                    </view>
                    <view v-if="item.number" style="color: green;">
                        合同编号: {{item.number}}
                    </view>
                    <view v-if="item.customer_code" style="color: red;">
                        客商编码: {{item.customer_code}}
                    </view>

                </view>
                <view style="display:flex; flex-wrap: wrap;">
                    <module-filter require_module="cash" v-if="cur_urls && cur_urls.need_su">
                        <fui-tag :scaleRatio="0.8" originLeft type="primary" text="充值" @click="prepare_charge(item)"></fui-tag>
                    </module-filter>
                    <fui-tag v-if="cur_urls && (cur_urls.get_url === '/customer/contract_get' || cur_urls.need_su)" :scaleRatio="0.8" originLeft type="warning" text="充值记录" @click="prepare_charge_history(item)"></fui-tag>
                    <fui-tag v-if="cur_urls && cur_urls.motive" :scaleRatio="0.8" originLeft type="purple" text="修改" @click="prepare_update(item)"></fui-tag>
                    <fui-tag v-if="cur_urls && cur_urls.motive" :scaleRatio="0.8" originLeft type="danger" text="删除" @click="prepare_del(item)"></fui-tag>
                    <fui-tag v-if="show_scope_switch" :scaleRatio="0.8" originLeft type="primary" text="设置方案" @click="prepare_set_contract_scheme(item)"></fui-tag>
                    <fui-tag v-if="show_scope_switch" :scaleRatio="0.8" originLeft type="success" text="物料单价" @click="prepare_stuff_price(item)"></fui-tag>
                </view>
            </view>
            <fui-white-space size="large"></fui-white-space>
        </fui-card>
    </list-show>

    <fui-gallery :urls="attach_url" v-if="show_attach" :show="show_attach" @hide="show_attach = false" @change="change_index"></fui-gallery>
    <view v-if="show_attach" class="download-button-container">
        <fui-text color="#fff" text="下载" @click="download_img"></fui-text>
    </view>
    <fui-button v-if="cur_urls && cur_urls.motive" type="success" text="新增" @click="show_add_contract = true"></fui-button>
    <fui-modal width="600" :show="show_update_contract" @click="update_contract" v-if="show_update_contract">
        <fui-form ref="update_contract" top="100">
            <fui-input label="开始时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.begin_time" @click="show_date_range = true"></fui-input>
            <fui-input label="结束时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.end_time" @click="show_date_range = true"></fui-input>
            <fui-input label="客商编码" borderTop placeholder="请输入客商编码" v-model="new_contract.customer_code"></fui-input>
            <fui-input label="合同编号" borderTop placeholder="请输入合同编号" v-model="new_contract.number"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_add_contract" @click="add_contract" v-if="show_add_contract">
        <fui-form ref="add_contract" top="100">
            <fui-input label="客商" borderTop placeholder="点击选择客商" v-model="company_name" disabled @click="show_customers = true"></fui-input>
            <fui-input label="开始时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.begin_time" @click="show_date_range = true"></fui-input>
            <fui-input label="结束时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.end_time" @click="show_date_range = true"></fui-input>
            <fui-input label="客商编码" borderTop placeholder="请输入客商编码" v-model="new_contract.customer_code"></fui-input>
            <fui-input label="合同编号" borderTop placeholder="请输入合同编号" v-model="new_contract.number"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_customers" @close="show_customers= false">
        <fui-list>
            <list-show v-model="customers_data2show" :fetch_function="get_customers" search_key="name" height="40vh">
                <fui-list-cell arrow v-for="item in customers_data2show" :key="item.id" @click="select_company(item)">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-date-picker range :show="show_date_range" type="3" :value="new_contract.begin_time" :valueEnd="new_contract.end_time" @change="set_date_range" @cancel="show_date_range =false"></fui-date-picker>
    <fui-bottom-popup :show="show_add_stuff" @close="show_add_stuff = false">
        <fui-list>
            <list-show ref="stuff_got" v-model="stuff_data2show" :fetch_function="get_stuff" :fetch_params="[cur_urls && cur_urls.buy_setting]" search_key="name" height="40vh">
                <fui-list-cell arrow v-for="item in stuff_data2show" :key="item.id" @click="add_stuff2contract(item)">
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
    <fui-modal width="600" :show="show_charge" @click="charge" v-if="show_charge">
        <fui-form ref="charge" top="100">
            <fui-input required label="充值金额" borderTop placeholder="负值为扣款" v-model="cash"></fui-input>
            <fui-input required label="充值原因" borderTop placeholder="请输入充值原因" v-model="comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_charge_history" @close="show_charge_history = false">
        <fui-list>
            <list-show v-model="histories_data2show" ref="history" :fetch_function="get_history" :fetch_params="[focus_item.id]" search_key="search_cond" height="40vh">
                <u-cell v-for="item in histories_data2show" :key="item.id" :title="item.operator" :value="'￥' + item.cash_increased.toFixed(2)">
                    <view slot="label">
                        {{item.time}}:{{item.comment}}
                    </view>
                </u-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_scope_picker" @close="show_scope_picker = false" z-index="1003">
        <fui-list>
            <fui-list-cell v-for="s in stat_scopes" :key="s.id" arrow @click="choose_stat_scope(s.id)">
                <view class="scope-row">
                    <view class="scope-name">{{ s.name }}</view>
                    <fui-icon v-if="stat_context_company_id === s.id" name="check" size="30" color="#1E9FFF"></fui-icon>
                </view>
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_scheme_manager" @close="show_scheme_manager = false">
        <fui-list>
            <fui-list-cell arrow @click="open_new_scheme_modal">
                新增优惠方案
            </fui-list-cell>
            <fui-list-cell v-for="item in discount_schemes" :key="item.id">
                <view style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                    <view>{{item.name}}（{{item.delta_price}}）</view>
                    <view style="display:flex;">
                        <fui-button btnSize="mini" text="编辑" type="primary" @click="open_edit_scheme_modal(item)"></fui-button>
                        <fui-button btnSize="mini" text="删除" type="danger" @click="prepare_delete_scheme(item)"></fui-button>
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
    <fui-bottom-popup :show="show_contract_scheme_picker" @close="show_contract_scheme_picker = false">
        <fui-list>
            <fui-list-cell arrow @click="set_contract_scheme(null)">清空方案</fui-list-cell>
            <fui-list-cell v-for="item in discount_schemes" :key="item.id" arrow @click="set_contract_scheme(item.id)">
                {{item.name}}（{{item.delta_price}}）
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_stuff_price_popup" @close="show_stuff_price_popup = false">
        <fui-list>
            <fui-list-cell v-for="single_stuff in focus_item.stuff || []" :key="single_stuff.id" arrow @click="edit_stuff_price(single_stuff)">
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
        make_context_req: function (body = {}, url = '') {
            const ret = { ...body };
            const use_sale_context = this.show_scope_switch;
            const hit_sale_api = url.startsWith('/sale_management/') && this.self_info && this.self_info.company_is_group === true;
            if ((use_sale_context || hit_sale_api) && this.stat_context_company_id != null) {
                ret.stat_context_company_id = this.stat_context_company_id;
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
            const req = this.make_context_req({}, '/sale_management/discount_scheme_list');
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
            }, '/sale_management/discount_scheme_upsert');
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
                const req = this.make_context_req({ id: this.focus_scheme.id }, '/sale_management/discount_scheme_delete');
                await this.$send_req('/sale_management/discount_scheme_delete', req);
                await this.load_discount_schemes();
                uni.startPullDownRefresh();
            }
            this.show_delete_scheme = false;
        },
        prepare_set_contract_scheme: async function (item) {
            this.focus_item = item;
            await this.load_discount_schemes();
            this.show_contract_scheme_picker = true;
        },
        set_contract_scheme: async function (scheme_id) {
            const req = this.make_context_req({
                contract_id: this.focus_item.id,
                scheme_id: scheme_id,
            }, '/sale_management/contract_set_discount_scheme');
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
                }, '/sale_management/contract_set_stuff_price');
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
                this.$refs.contracts.refresh();
                this.$refs.stuff_got.refresh();
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
        get_history: async function (_pageNo, [id]) {
            if (id == 0) {
                return [];
            }
            let history_url = '/cash/history';
            if (this.cur_urls && this.cur_urls.get_url === '/customer/contract_get') {
                history_url = '/customer/history';
            }
            let ret = await this.$send_req(history_url, this.make_context_req({
                contract_id: id,
                pageNo: _pageNo
            }, history_url));
            ret.histories.forEach(item => {
                item.search_cond = item.operator + item.cash_increased + item.comment;
            });
            return ret.histories;
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
                    return;
                }
                let charge_url = '/cash/charge';
                await this.$send_req(charge_url, this.make_context_req({
                    contract_id: this.focus_item.id,
                    cash_increased: parseFloat(this.cash),
                    comment: this.comment
                }, charge_url));
                uni.startPullDownRefresh();
            }
            this.show_charge = false;
        },
        prepare_charge: function (item) {
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
                }, this.cur_urls.del_url));
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
                await this.$send_req('/sale_management/unauthorize_user', this.make_context_req({
                    contract_id: this.focus_item.id,
                    phone: this.focus_user.phone,
                }, '/sale_management/unauthorize_user'));
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
                        await this.$send_req('/sale_management/authorize_user', this.make_context_req({
                            contract_id: this.focus_item.id,
                            phone: this.phone
                        }, '/sale_management/authorize_user'));
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
                }, url));
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
            await this.$send_req(url, this.make_context_req(req, url));
            uni.startPullDownRefresh();
            this.show_add_stuff = false;
        },
        get_stuff: async function (pageNo, [buy_setting]) {
            const use_sale_management_stuff =
                this.cur_urls && this.cur_urls.motive && !buy_setting;
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
            let resp = await this.$send_req(stuff_url, this.make_context_req({
                pageNo: pageNo
            }, stuff_url));
            let ret = []
            console.log(buy_setting);
            resp.stuff.forEach(ele => {
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
        get_customers: async function (pageNo) {
            let ret = await this.$send_req('/global/company_get_all', {
                pageNo: pageNo
            });
            return ret.all_company;
        },
        update_contract: async function (detail) {
            if (detail.index == 1) {
                if (!this.cur_urls || !this.cur_urls.update_url) {
                    console.error('cur_urls.update_url 未定义');
                    return;
                }
                await this.$send_req(this.cur_urls.update_url, this.make_context_req(this.new_contract, this.cur_urls.update_url));
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
                await this.$send_req(this.cur_urls.make_url, this.make_context_req(this.new_contract, this.cur_urls.make_url));
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
        get_sale_contract: async function (pageNo, [cur_urls]) {
            // 添加安全检查，防止访问未定义对象的属性
            if (!cur_urls || !cur_urls.get_url) {
                console.error('cur_urls 或 cur_urls.get_url 未定义');
                return [];
            }
            let ret = await this.$send_req(cur_urls.get_url, this.make_context_req({
                pageNo: pageNo
            }, cur_urls.get_url));
            ret.contracts.forEach(item => {
                item.search_cond = item.company.name;
            });
            return ret.contracts;
        }
    },
    created: function () {
        // 在组件创建时立即初始化，防止模板渲染时访问未定义属性
        this.init_top_seg();
        this.load_self_info().then(() => {
            this.load_stat_scopes();
        });
    },
    onShow: function () {
        this.init_top_seg();
        this.load_self_info().then(() => {
            this.load_stat_scopes();
        });
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
.expired_line {
    text-decoration: line-through gray;
}

.expired_text {
    position: absolute;
    transform-origin: center;
    transform: rotate(45deg);
    right: 10rpx;
    top: -30rpx;
    border: solid 1px gray;
    padding: 10rpx;
    border-radius: 20%;
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

.scope-picker-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 10rpx;
}

.scope-picker-label {
    font-size: 30rpx;
    color: #333;
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
</style>

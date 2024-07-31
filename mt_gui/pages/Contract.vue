<template>
<view>
    <fui-segmented-control :values="seg" @click="change_seg"></fui-segmented-control>
    <list-show full ref="contracts" v-model="data2show" :fetch_function="get_sale_contract" height="85vh" style="background-color: aliceblue;" search_key="search_cond" :fetch_params="[cur_urls]">
        <fui-card full :margin="['20rpx', '0rpx']" v-for="item in data2show" :key="item.id" size="large" :title="item.company.name" color="black" :tag="'￥' + item.balance">
            <view style="padding: 0 20rpx;">
                <module-filter require_module="sale_management">
                    <view style="display:flex; flex-wrap: wrap;" v-if="cur_urls.need_su || cur_urls.buy_setting">
                        <fui-tag v-for="(single_stuff, index) in item.stuff" :key="index" theme="plain" originLeft :scaleRatio="0.8" type="purple">
                            {{single_stuff.name}}
                            <fui-icon name="close" size="32" @click="prepare_unstuff(item, single_stuff)"></fui-icon>
                        </fui-tag>
                        <view style="display:flex; flex-wrap: wrap;" v-if="cur_urls.need_su">
                            <fui-tag v-for="(single_user) in item.rbac_users" :key="single_user.id" theme="plain" originLeft :scaleRatio="0.8" type="success">
                                {{single_user.name?single_user.name +'|'+single_user.phone: single_user.phone}}
                                <fui-icon name="close" size="32" @click="prepare_unauth(item, single_user)"></fui-icon>
                            </fui-tag>
                        </view>
                    </view>
                    <view style="display:flex; flex-wrap: wrap;" v-if="cur_urls.need_su || cur_urls.buy_setting">
                        <fui-tag text="新增物料" :scaleRatio="0.8" originLeft type="purple" @click="prepare_add_stuff(item)"></fui-tag>
                        <fui-tag v-if="cur_urls.need_su" :scaleRatio="0.8" originLeft type="success" text="新增授权" @click="prepare_auth(item)"></fui-tag>
                    </view>
                </module-filter>
                <view>
                    <view v-if="item.begin_time && item.end_time" style="color: blue;">
                        {{item.begin_time}}至{{item.end_time}}
                    </view>
                    <view v-if="item.number" style="color: green;">
                        合同编号: {{item.number}}
                    </view>
                    <view v-if="item.customer_code" style="color: red;">
                        客商编码: {{item.customer_code}}
                    </view>

                </view>
                <view style="display:flex; flex-wrap: wrap;">
                    <module-filter require_module="cash" v-if="cur_urls.need_su">
                        <fui-tag :scaleRatio="0.8" originLeft type="primary" text="充值" @click="prepare_charge(item)"></fui-tag>
                        <fui-tag :scaleRatio="0.8" originLeft type="warning" text="充值记录" @click="prepare_charge_history(item)"></fui-tag>
                    </module-filter>
                    <fui-tag v-if="cur_urls.motive" :scaleRatio="0.8" originLeft type="danger" text="删除" @click="prepare_del(item)"></fui-tag>
                </view>
            </view>
            <fui-white-space size="large"></fui-white-space>
        </fui-card>
    </list-show>
    <fui-button v-if="cur_urls.motive" type="success" text="新增" @click="show_add_contract = true"></fui-button>
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
            <list-show ref="stuff_got" v-model="stuff_data2show" :fetch_function="get_stuff" :fetch_params="[cur_urls.buy_setting]" search_key="name" height="40vh">
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
                del_url: '',
                need_su: false,
                motive: false,
                buy_setting: false,
            }

        };
    },
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilter
    },
    methods: {
        change_seg: function (e) {
            this.cur_urls.get_url = e.get_url;
            this.cur_urls.make_url = e.make_url;
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
                    name: '采购被签订',
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
                    need_su: true,
                    motive: true,
                    buy_setting: false,
                });
            }
            if (this.$has_module('supplier')) {
                this.seg.push({
                    name: '销售被签订',
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
                    need_su: false,
                    motive: true,
                    buy_setting: true,
                });
            }
            if (this.seg.length > 0) {
                this.cur_urls.get_url = this.seg[0].get_url;
                this.cur_urls.make_url = this.seg[0].make_url;
                this.cur_urls.del_url = this.seg[0].del_url;
                this.cur_urls.motive = this.seg[0].motive;
                this.cur_urls.need_su = this.seg[0].need_su;
                this.cur_urls.buy_setting = this.seg[0].buy_setting;
            }
        },
        get_history: async function (_pageNo, [id]) {
            if (id == 0) {
                return [];
            }
            let ret = await this.$send_req('/cash/history', {
                contract_id: id,
                pageNo: _pageNo
            });
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
                await this.$send_req('/cash/charge', {
                    contract_id: this.focus_item.id,
                    cash_increased: parseFloat(this.cash),
                    comment: this.comment
                });
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
                await this.$send_req(this.cur_urls.del_url, {
                    contract_id: this.focus_item.id
                });
                uni.startPullDownRefresh();
            }
            this.show_del = false;
        },
        prepare_del: function (item) {
            this.show_del = true;
            this.focus_item = item;
        },
        unauth_user: async function (detail) {
            if (detail.index == 1) {
                await this.$send_req('/sale_management/unauthorize_user', {
                    contract_id: this.focus_item.id,
                    phone: this.focus_user.phone,
                });
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
                        await this.$send_req('/sale_management/authorize_user', {
                            contract_id: this.focus_item.id,
                            phone: this.phone
                        });
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
                if (this.cur_urls.buy_setting) {
                    url = "/buy_management/contract_del_stuff"
                }
                await this.$send_req(url, {
                    contract_id: this.focus_item.id,
                    stuff_id: this.focus_stuff.id
                });
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
            if (this.cur_urls.buy_setting) {
                url = "/buy_management/contract_add_stuff"
            }
            await this.$send_req(url, req);
            uni.startPullDownRefresh();
            this.show_add_stuff = false;
        },
        get_stuff: async function (pageNo, [buy_setting]) {
            if (this.$has_module('stuff') == false) {
                return [];
            }
            let resp = await this.$send_req('/stuff/get_all', {
                pageNo: pageNo
            });
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
        add_contract: async function (detail) {
            if (detail.index == 1) {
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
                await this.$send_req(this.cur_urls.make_url, this.new_contract);
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
            let ret = await this.$send_req(cur_urls.get_url, {
                pageNo: pageNo
            });
            ret.contracts.forEach(item => {
                item.search_cond = item.company.name;
            });
            return ret.contracts;
        }
    },
    onShow: function () {
        this.init_top_seg();
        this.new_contract.begin_time = utils.dateFormatter(new Date(), 'y-m-d', 4, false);
        let end_date = new Date();
        end_date.setMonth(end_date.getMonth() + 12);
        this.new_contract.end_time = utils.dateFormatter(end_date, 'y-m-d', 4, false);
    },
    onPullDownRefresh: function () {
        this.$refs.contracts.refresh();
        uni.stopPullDownRefresh();
    }
}
</script>

<style>

</style>

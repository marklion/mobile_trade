<template>
<view>
    <list-show ref="contracts" v-model="data2show" :fetch_function="get_sale_contract" height="90vh" search_key="search_cond">
        <u-cell v-for="item in data2show" :key="item.id" size="large" :title="item.buy_company.name" :value="'￥' + item.balance">
            <view slot="label">
                <view style="display:flex; flex-wrap: wrap;">
                    <fui-tag v-for="(single_stuff, index) in item.stuff" :key="index" theme="plain" :scaleRatio="0.8" type="purple">
                        {{single_stuff.name}}
                        <fui-icon name="close" size="32" @click="prepare_unstuff(item, single_stuff)"></fui-icon>
                    </fui-tag>
                    <fui-tag text="新增物料" :scaleRatio="0.8" type="purple" @click="prepare_add_stuff(item)"></fui-tag>
                    <fui-tag v-for="(single_user) in item.rbac_users" :key="single_user.id" theme="plain" :scaleRatio="0.8" type="success">
                        {{single_user.name + '|' + single_user.phone}}
                        <fui-icon name="close" size="32" @click="prepare_unauth(item, single_user)"></fui-icon>
                    </fui-tag>
                    <fui-tag :scaleRatio="0.8" type="success" text="新增授权" @click="prepare_auth(item)"></fui-tag>
                </view>
                <view>
                    <view v-if="item.begin_time && item.end_time" style="color: blue;">
                        {{item.begin_time}}至{{item.end_time}}
                    </view>
                    <view v-if="item.number" style="color: green;">
                        合同编号: {{item.number}}
                    </view>
                    <view v-if="item.customer_code" style="color: red;">
                        客户编码: {{item.customer_code}}
                    </view>

                </view>
                <view style="display:flex; flex-wrap: wrap;">
                    <module-filter require_module="cash">
                        <fui-tag :scaleRatio="0.8" type="primary" text="充值" @click="prepare_charge(item)"></fui-tag>
                        <fui-tag :scaleRatio="0.8" type="warning" text="充值记录" @click="prepare_charge_history(item)"></fui-tag>
                    </module-filter>
                    <fui-tag :scaleRatio="0.8" type="danger" text="删除" @click="prepare_del(item)"></fui-tag>
                </view>
            </view>

        </u-cell>
    </list-show>
    <fui-button type="success" text="新增" @click="show_add_contract = true"></fui-button>
    <fui-modal width="600" :show="show_add_contract" @click="add_contract">
        <fui-form ref="add_contract" top="100">
            <fui-input label="客户" borderTop placeholder="点击选择客户" v-model="company_name" disabled @click="show_customers = true"></fui-input>
            <fui-input label="开始时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.begin_time" @click="show_date_range = true"></fui-input>
            <fui-input label="结束时间" borderTop disabled placeholder="点击选择时间范围" v-model="new_contract.end_time" @click="show_date_range = true"></fui-input>
            <fui-input label="客户编码" borderTop placeholder="请输入客户编码" v-model="new_contract.customer_code"></fui-input>
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
    <fui-date-picker range :show="show_date_range" type="3" @change="set_date_range" @cancel="show_date_range =false"></fui-date-picker>
    <fui-bottom-popup :show="show_add_stuff" @close="show_add_stuff = false">
        <fui-list>
            <list-show v-model="stuff_data2show" :fetch_function="get_stuff" search_key="name" height="40vh">
                <fui-list-cell arrow v-for="item in stuff_data2show" :key="item.id" @click="add_stuff2contract(item)">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-modal width="600" :descr="'确定要取消' + focus_item.buy_company.name + '关注' + focus_stuff.name + '吗？'" :show="show_del_stuff" @click="del_stuff">
    </fui-modal>

    <fui-modal width="600" :show="show_add_auth" @click="add_auth">
        <fui-form ref="add_auth" top="100">
            <fui-input required label="用户手机号" borderTop placeholder="请输入手机号" v-model="phone"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :descr="'确定要取消授权' + focus_user.phone + '吗？'" :show="show_unauth" @click="unauth_user">
    </fui-modal>
    <fui-modal width="600" :descr="'确定要删除' + focus_item.buy_company.name + '吗？'" :show="show_del" @click="del_contract">
    </fui-modal>
    <fui-modal width="600" :show="show_charge" @click="charge">
        <fui-form ref="charge" top="100">
            <fui-input required label="充值金额" borderTop placeholder="负值为扣款" v-model="cash"></fui-input>
            <fui-input required label="充值原因" borderTop placeholder="请输入充值原因" v-model="comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_charge_history" @close="show_charge_history = false">
        <fui-list>
            <list-show v-model="histories_data2show" ref="history" :fetch_function="get_history" :fetch_params="[focus_item.id]" search_key="search_cond" height="40vh">
                <u-cell v-for="item in histories_data2show" :key="item.id" :title="item.operator" :value="'￥' + item.cash_increased">
                    <view slot="label">
                        {{item.time}}充值原因:{{item.comment}}
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
export default {
    name: 'Contract',
    data: function () {
        return {
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
                buy_company: {
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
        };
    },
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilter
    },
    methods: {
        get_history: async function (_pageNo, [id]) {
            if (id == 0) {
                return [];
            }
            let ret = await this.$send_req('/contract/get_company_history', {
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
                    rule: ['required', 'isNumber'],
                    msg: ['请输入金额', "金额需要填写数字"]
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
                await this.$send_req('/contract/charge', {
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
                await this.$send_req('/contract/destroy', {
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
                await this.$send_req('/contract/unauthorize', {
                    contract_id: this.focus_item.id,
                    phone: this.focus_user.phone,
                });
                uni.startPullDownRefresh();
            }
            this.show_unauth = false;
        },
        add_auth: async function (detail) {
            if (detail.index == 1) {
                await this.$send_req('/contract/authorize', {
                    contract_id: this.focus_item.id,
                    phone: this.phone
                });
                uni.startPullDownRefresh();
            }
            this.show_add_auth = false;
        },
        prepare_auth: function (item) {
            this.show_add_auth = true;
            this.focus_item = item;
        },
        del_stuff: async function (detail) {
            if (detail.index == 1) {
                await this.$send_req('/contract/del_stuff', {
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
            await this.$send_req('/contract/add_stuff', req);
            uni.startPullDownRefresh();
            this.show_add_stuff = false;
        },
        get_stuff: async function (pageNo) {
            let ret = await this.$send_req('/stuff/get_all', {
                pageNo: pageNo
            });
            return ret.stuff;
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
            this.company_name = item.name;
            this.show_customers = false;
        },
        get_customers: async function (pageNo) {
            let ret = await this.$send_req('/rbac/company_get_all', {
                pageNo: pageNo
            });
            return ret.all_company;
        },
        add_contract: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'company_name',
                    rule: ['required'],
                    msg: ['请选择客户']
                }];
                let val_ret = await this.$refs.add_contract.validator({
                    company_name: this.company_name
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/contract/make', this.new_contract);
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
        get_sale_contract: async function (pageNo) {
            let ret = await this.$send_req('/contract/get_all_sale', {
                pageNo: pageNo
            });
            ret.contracts.forEach(item => {
                item.search_cond = item.buy_company.name + item.stuff.map(ele => ele.name).join('') + item.rbac_users.map(ele => ele.name + ele.phone).join('');
            });
            return ret.contracts;
        }
    },
    onPullDownRefresh: function () {
        this.$refs.contracts.refresh();
        uni.stopPullDownRefresh();
    }
}
</script>

<style>

</style>

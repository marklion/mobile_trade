<template>
<view>
    <list-show v-model="data2show" :fetch_function="get_self_contract" height="100vh" search_key="search_cond">
        <u-cell v-for="item in data2show" :key="item.id" :title="item.sale_company.name" :value="item.balance">
            <view slot="label">
                <view style="display:flex; flex-wrap: wrap;">
                    <fui-tag v-for="(single_stuff, index) in item.stuff" :key="index" theme="plain" :scaleRatio="0.8" type="purple">
                        {{single_stuff.name}}
                    </fui-tag>
                </view>
                <view>
                    <view v-if="item.begin_time && item.end_time" style="color: blue;">
                        {{item.begin_time}}至{{item.end_time}}
                    </view>
                    <view v-if="item.number" style="color: green;">
                        合同编号: {{item.number}}
                    </view>

                </view>
                <view style="display:flex; flex-wrap: wrap;">
                    <fui-tag :scaleRatio="0.8" type="warning" text="充值记录" @click="prepare_charge_history(item)"></fui-tag>
                </view>
            </view>
        </u-cell>
    </list-show>
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
export default {
    name: 'BuyContract',
    components: {
        "list-show": ListShow
    },
    data: function () {
        return {
            histories_data2show: [],
            data2show:[],
            show_charge_history: false,
            focus_item: {
                id: 0

            }
        }
    },
    methods: {
        get_self_contract: async function (pageNo) {
            let ret = await this.$send_req('/customer/contract_get', {
                pageNo: pageNo,
            });
            ret.contracts.forEach(item => {
                item.search_cond = item.sale_company.name + item.stuff.map(ele => ele.name).join('')
            });

            return ret.contracts;
        },
        prepare_charge_history: function (item) {
            this.show_charge_history = true;
            this.focus_item = item;
            this.$nextTick(() => {
                this.$refs.history.refresh();
            });
        },
        get_history: async function (_pageNo, [id]) {
            if (id == 0) {
                return [];
            }
            let ret = await this.$send_req('/customer/get_charge_history', {
                contract_id: id,
                pageNo: _pageNo
            });
            ret.histories.forEach(item => {
                item.search_cond = item.operator + item.cash_increased + item.comment;
            });
            return ret.histories;
        },
    },
    onPullDownRefresh() {
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

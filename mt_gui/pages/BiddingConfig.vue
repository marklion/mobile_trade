<template>
<view>
    <list-show ref="bc_list" :fetch_function="get_bc_list" height="90vh" search_key="cond" v-model="bc_list">
        <view v-for="single_bc in bc_list" :key="single_bc.id">
            <bid-detail :bd="single_bc"></bid-detail>
        </view>
    </list-show>
    <fui-button type="success" text="新增" @click="show_create_diag = true"></fui-button>
    <fui-modal width="600" :show="show_create_diag" v-if="show_create_diag" @click="add_bc">
        <fui-form ref="add_bc" top="100">
            <fui-input label="备注" borderTop placeholder="请输入备注" v-model="new_bc.comment"></fui-input>
            <fui-input label="最低出价" borderTop placeholder="请输入最低出价" v-model="new_bc.min"></fui-input>
            <fui-input label="最高出价" borderTop placeholder="请输入最高出价" v-model="new_bc.max"></fui-input>
            <fui-input label="押金" borderTop placeholder="请输入押金" v-model="new_bc.pay_first"></fui-input>
            <fui-input label="物料" borderTop disabled placeholder="点击选择物料" v-model="new_bc.stuff_name" @click="show_stuff_select = true"></fui-input>
            <fui-input label="物料总量" borderTop placeholder="请输入总量" v-model="new_bc.total"></fui-input>
            <fui-input label="竞价轮次" borderTop placeholder="请输入竞价轮次" v-model="new_bc.total_turn"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_stuff_select" v-if="show_stuff_select" @close="show_stuff_select = false">
        <fui-list>
            <list-show v-model="stuff_data2show" :fetch_function="get_stuff" search_key="name" height="40vh">
                <fui-list-cell arrow v-for="item in stuff_data2show" :key="item.id" @click="add_stuff2bc(item)">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
</view>
</template>

<script>
import BidDetail from '../components/BidDetail.vue';
import ListShow from '../components/ListShow.vue';
export default {
    name: 'BiddingConfig',
    components: {
        "list-show": ListShow,
        "bid-detail": BidDetail,
    },
    data: function () {
        return {
            show_create_diag: false,
            bc_list: [],
            stuff_data2show: [],
            show_stuff_select: false,
            new_bc: {
                "comment": "",
                "max": 120,
                "min": 80,
                "pay_first": 0,
                "stuff_id": 0,
                "total": 0,
                "total_turn": 1,
                stuff_name: '',
            },
        };
    },
    methods: {
        add_bc: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'comment',
                    rule: ['required'],
                    msg: ['输入备注']
                }, {
                    name: 'max',
                    rule: ['required', 'isAmount'],
                    msg: ['输入最高出价', '请输入正确的价格格式']
                }, {
                    name: 'min',
                    rule: ['required', 'isAmount'],
                    msg: ['输入最低出价', '请输入正确的价格格式']
                }, {
                    name: 'stuff_name',
                    rule: ['required'],
                    msg: ['选择物料']
                }, {
                    name: 'total',
                    rule: ['required', 'isAmount'],
                    msg: ['输入总量', '请输入正确的总量格式']
                }, {
                    name: 'total_turn',
                    rule: ['required', 'isNumber'],
                    msg: ['输入竞价总轮次', '请输入正确的轮次格式']
                }, ];
                let val_ret = await this.$refs.add_bc.validator({
                    comment: this.new_bc.comment,
                    max: this.new_bc.max,
                    min: this.new_bc.min,
                    stuff_name: this.new_bc.stuff_name,
                    total: this.new_bc.total,
                    total_turn: this.new_bc.total_turn
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.new_bc.max <= this.new_bc.min) {
                    this.$toast('最高出价必须大于最低出价');
                    return;
                }
                this.new_bc.max = parseFloat(this.new_bc.max);
                this.new_bc.min = parseFloat(this.new_bc.min);
                this.new_bc.total = parseFloat(this.new_bc.total);
                this.new_bc.total_turn = parseInt(this.new_bc.total_turn);
                await this.$send_req('/bid/create', this.new_bc);
                uni.startPullDownRefresh();
            }
            this.show_create_diag = false;
        },
        add_stuff2bc: async function (item) {
            this.new_bc.stuff_id = item.id;
            this.new_bc.stuff_name = item.name;
            this.show_stuff_select = false;
        },
        get_stuff: async function (pageNo) {
            if (this.$has_module('stuff') == false) {
                return [];
            }
            let ret = await this.$send_req('/stuff/get_all', {
                pageNo: pageNo
            });
            return ret.stuff;
        },
        get_bc_list: async function (_pageNo) {
            let res = await this.$send_req('/bid/get_all_created', {
                pageNo: _pageNo
            });
            res.biddings.forEach((item) => {
                item.cond = item.comment + item.stuff.name
            });
            return res.biddings;
        },
        refresh_bidding_list: function () {
            this.$refs.bc_list.refresh();
        },
    },
    onPullDownRefresh: function () {
        this.refresh_bidding_list();
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

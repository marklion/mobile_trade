<template>
<view>
    <list-show ref="bi_list" :fetch_function="get_bi_list" height="95vh" search_key="cond" v-model="bi_list">
        <view v-for="sbi in bi_list" :key="sbi.id" class="bd_show">
            <u-cell :title="sbi.bidding_turn.bidding_config.comment + '(' + (sbi.accept?'已接受':'未接受') +')'" :label="sbi.bidding_turn.bidding_config.stuff.name + '->第' + (sbi.bidding_turn.turn + 1) + '轮，共' + sbi.bidding_turn.bidding_config.total_turn + '轮'" :value="sbi.time?(sbi.time + '出价' + sbi.price):'未出价'"></u-cell>
            <fui-row>
                <fui-col :span="10">
                    <fui-text v-if="sbi.bidding_turn.finish" text="已结束" type="danger"></fui-text>
                    <fui-text v-else text="正在进行" type="primary"></fui-text>
                    <fui-text v-if="sbi.win" text="恭喜，中标了" type="success"></fui-text>
                </fui-col>
                <view v-if="sbi.win">
                    <fui-col :span="8">
                        <fui-button v-if="!sbi.bidding_turn.bidding_config.customer_confirm_time" text="中标价确认" type="primary" btnSize="mini" @click="prepare_confirm(sbi)"></fui-button>
                        <fui-button v-else text="查看确认单" type="success" btnSize="mini" @click="prepare_confirm(sbi)"></fui-button>
                    </fui-col>
                </view>
                <view v-if="!sbi.bidding_turn.finish">
                    <fui-col :span="4" v-if="could_accept(sbi)">
                        <fui-button text="接受" type="purple" btnSize="mini" @click="accept_bid(sbi)"></fui-button>
                    </fui-col>
                    <fui-col :span="4" v-if="could_price(sbi)">
                        <fui-button text="出价" type="success" btnSize="mini" @click="prepare_price(sbi)"></fui-button>
                    </fui-col>
                </view>
                <view v-if="!sbi.bidding_turn.finish && sbi.bidding_turn.bidding_config.status == 0">
                    <fui-col :span="10" v-if="second_before_begin(sbi)">
                        开始倒计时
                        <fui-count-down :value="second_before_begin(sbi)" @end="refresh_bi_list"></fui-count-down>
                    </fui-col>
                    <fui-col :span="10" v-if="second_before_end(sbi)">
                        结束倒计时
                        <fui-count-down :value="second_before_end(sbi)" @end="refresh_bi_list"></fui-count-down>
                    </fui-col>
                </view>
            </fui-row>
        </view>
    </list-show>
    <fui-modal width="600" :show="show_price" @click="price" v-if="show_price">
        <fui-section :title="focus_bi.bidding_turn.bidding_config.stuff.name + ' 总量：' + focus_bi.bidding_turn.bidding_config.total" :descr="'出价范围：' + focus_bi.bidding_turn.bidding_config.min + '~' +  focus_bi.bidding_turn.bidding_config.max"></fui-section>
        <fui-form ref="price" top="100">
            <fui-input label="出价" borderTop placeholder="请输入价格" v-model="price_req.price"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_price_confirm" @click="confirm_price" :buttons="price_confirm_button" v-if="show_price_confirm">
        <fui-preview :previewData="confirm_file"></fui-preview>
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import moment from 'moment';
export default {
    name: 'BiddingJoin',
    components: {
        "list-show": ListShow,
    },
    data: function () {
        function isCurrentTimeInRange(startTime, endTime) {
            let currentTime = moment();
            return currentTime.isBetween(moment(startTime), moment(endTime));
        }

        function isCurBefore(startTime) {
            let currentTime = moment();
            return currentTime.isBefore(moment(startTime));
        }

        return {
            price_confirm_item: null,
            show_price_confirm: false,
            show_price: false,
            focus_bi: {},
            bi_list: [],
            price_req: {
                price: '',
            },
            could_price: function (sbi) {
                let ret = false;
                if (sbi.accept && !sbi.time && isCurrentTimeInRange(sbi.bidding_turn.begin_time, sbi.bidding_turn.end_time)) {
                    ret = true
                }
                return ret;
            },
            could_accept: function (sbi) {
                let ret = false;
                if (!sbi.accept && isCurBefore(sbi.bidding_turn.begin_time)) {
                    ret = true
                }
                return ret;
            },
            second_before_begin: function (sbi) {
                let ret = 0;
                if (isCurBefore(sbi.bidding_turn.begin_time)) {
                    ret = moment(sbi.bidding_turn.begin_time).diff(moment(), 'seconds');
                }
                return ret;
            },
            second_before_end: function (sbi) {
                let ret = 0;
                if (isCurrentTimeInRange(sbi.bidding_turn.begin_time, sbi.bidding_turn.end_time)) {
                    ret = moment(sbi.bidding_turn.end_time).diff(moment(), 'seconds');
                }
                return ret;
            },
        };
    },
    computed: {
        price_confirm_button: function () {
            let ret = [{
                text: '关闭',
                plain: true,
            }];
            if (this.price_confirm_item && !this.price_confirm_item.bidding_turn.bidding_config.customer_confirm_time) {
                ret.push({
                    text: '价格确认',
                });
            }
            return ret;
        },
        confirm_file: function () {
            let ret = {};
            if (this.price_confirm_item) {
                ret = {
                    label: '中标价确认',
                    value: '确认后不可撤销',
                    valueColor: 'red',
                    list: [{
                            label: '竞价名称',
                            value: this.price_confirm_item.bidding_turn.bidding_config.comment,
                        },
                        {
                            label: '物料',
                            value: this.price_confirm_item.bidding_turn.bidding_config.stuff.name,
                        },
                        {
                            label: '中标价',
                            value: this.price_confirm_item.price,
                        },
                        {
                            label: '中标时间',
                            value: this.price_confirm_item.bidding_turn.end_time,
                        },
                    ],
                };
                if (this.price_confirm_item.bidding_turn.bidding_config.customer_confirm_time) {
                    ret.list.push({
                        label: '价格确认时间',
                        value: this.price_confirm_item.bidding_turn.bidding_config.customer_confirm_time,
                    });
                    ret.list.push({
                        label: '价格确认人',
                        value: this.price_confirm_item.bidding_turn.bidding_config.confirm_opt_name,
                    });
                    ret.value = '已确认';
                }
            }
            return ret;
        }
    },
    methods: {
        confirm_price: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/customer/bidding_confirm', {
                    bidding_id: this.price_confirm_item.bidding_turn.bidding_config.id,
                });
                uni.startPullDownRefresh();
            }
            this.show_price_confirm = false;
        },
        prepare_confirm: function (sbi) {
            this.price_confirm_item = sbi;
            this.show_price_confirm = true;
        },
        price: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'price',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入出价', '请输入正确的价格格式']
                }];
                let val_ret = await this.$refs.price.validator({
                    price: this.price_req.price,
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.price_req.item_id = this.focus_bi.id;
                this.price_req.price = parseFloat(this.price_req.price);
                await this.$send_req('/customer/bidding_price', this.price_req);
                uni.startPullDownRefresh();
            }
            this.show_price = false;
        },
        prepare_price: function (sbi) {
            this.show_price = true;
            this.focus_bi = sbi;
        },
        accept_bid: async function (sbi) {
            await this.$send_req('/customer/bidding_accept', {
                item_id: sbi.id
            });
            uni.startPullDownRefresh();
        },
        get_bi_list: async function (pageNo) {
            let resp = await this.$send_req('/customer/bidding_search', {
                pageNo: pageNo
            });
            resp.items.forEach(ele => {
                ele.cond = ele.bidding_turn.bidding_config.comment;
            });
            return resp.items;
        },
        refresh_bi_list: function () {
            this.$refs.bi_list.refresh();
        },
    },
    onPullDownRefresh: function () {
        this.refresh_bi_list();
        uni.stopPullDownRefresh();
    },
}
</script>

<style scoped>
.bd_show {
    border: 3px dashed #45d5bd;
    border-radius: 10px;
    /* 添加圆角 */
    margin-bottom: 20px;
}
</style>

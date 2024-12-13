<template>
<view class="bd_show">
    <u-cell :title="bd.comment + ' 共' + bd.total_turn + '轮'" :value="bd.stuff.name + ':' + bd.total" :icon="status_icon(bd.status)">
        <view slot="right-icon">
            <module-filter require_module="bid">
                <fui-button v-if="bd.status == 0 && bd.bidding_turns.length == 0" text="开启" type="primary" btnSize="mini" @click="show_start_bid = true"></fui-button>
                <fui-button v-else-if="bd.status == 0 && bd.bidding_turns.length != bd.total_turn" text="开启下一轮" type="warning" btnSize="mini" @click="show_next_bid = true"></fui-button>
                <fui-button v-if="bd.status == 0" text="停止" type="danger" btnSize="mini" @click="show_stop_bid = true"></fui-button>
            </module-filter>
        </view>
        <view slot="label">
            {{bd.min + '~' + bd.max}}
            <fui-text v-if="bd.price_hide" text="（价格隐藏）"></fui-text>
        </view>
    </u-cell>
    <view>
        <view v-if="bd.customer_confirm_time">
            <u-cell title="价格已确认" :value="bd.bidding_turns[0].bidding_items[0].price" :label="bd.confirm_opt_name + '->' + bd.customer_confirm_time"></u-cell>
        </view>
        <view v-else-if="bd.status == 1">
            <fui-text text="价格未确认" type="danger"></fui-text>
        </view>
    </view>
    <view v-for="single_turn in bd.bidding_turns" :key="single_turn.id">
        <u-cell :title="'第' + (single_turn.turn + 1) + '轮'" :value="single_turn.finish?'已完成':'未完成'" @click="prepare_show_bi(single_turn)" :isLink="true" arrow-direction="down">
            <view slot="label">
                <view>
                    开始：{{single_turn.begin_time}}
                </view>
                <view>
                    结束：{{single_turn.end_time}}
                </view>
            </view>
        </u-cell>
    </view>
    <fui-button type="success" text="导出" @click="export_bc(bd)"></fui-button>

    <fui-modal width="600" :descr="'确定要停止吗？'" v-if="show_stop_bid" :show="show_stop_bid" @click="stop_bid">
    </fui-modal>
    <fui-modal width="600" :show="show_start_bid" v-if="show_start_bid" @click="start_bid">
        <fui-form ref="start_bid" top="100">
            <fui-form-item label="时间范围">
                <fui-textarea placeholder="选择时间范围" height="35px" v-model="bt_time_range" disabled @click="show_bt_time = true"></fui-textarea>
            </fui-form-item>
            <fui-form-item label="客户范围">
                <fui-input placeholder="点击选择客户" @click="prepare_company_select" disabled :value="cust_selected"></fui-input>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" v-if="show_next_bid" :show="show_next_bid" @click="next_bid">
        <fui-form ref="next_bid" top="100">
            <fui-form-item label="时间范围">
                <fui-textarea placeholder="选择时间范围" height="35px" v-model="bt_time_range" disabled @click="show_bt_time = true"></fui-textarea>
            </fui-form-item>
            <fui-form-item label="前几入围">
                <fui-input placeholder="请输入前几名" v-model="next_bid_req.top_n"></fui-input>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-date-picker range :show="show_bt_time" type="5" :value="start_bid_req.begin_time" :valueEnd="start_bid_req.end_time" @change="choose_date" @cancel="show_bt_time = false"></fui-date-picker>
    <fui-bottom-popup :show="show_company_select" @close="show_company_select = false">
        <fui-checkbox-group v-model="selected_companies">
            <list-show ref="cust_comp" :fetch_function="get_related_companies" :fetch_params="[bd.stuff.id, show_start_bid]" height="50vh" search_key="cond" v-model="related_companies">
                <fui-label v-for="single_company in related_companies" :key="single_company.id">
                    <fui-list-cell>
                        <text>{{single_company.company.name}}-{{single_company.rbac_users[0].name}}</text>
                        <fui-checkbox :value="single_company.rbac_users[0].id"></fui-checkbox>
                    </fui-list-cell>
                </fui-label>
            </list-show>
        </fui-checkbox-group>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_bi" @close="show_bi= false">
        <view>
            <scroll-view style="height: 60vh" show-scrollbar scroll-y>
                <view v-for="(si, index) in focus_bt.bidding_items" :key="si.id">
                    <u-cell :icon="((index == 0)&&si.time)?'thumb-up':''" :title="si.rbac_user.company.name " :label="si.rbac_user.name + '(' + (si.accept?'已接受':'未接受') + ')'" :value="si.time?(si.time + '出价' + si.price):'未出价'"></u-cell>
                </view>
            </scroll-view>
        </view>
    </fui-bottom-popup>
</view>
</template>

<script>
import ModuleFilter from '../components/ModuleFilter.vue';
import utils from '@/components/firstui/fui-utils';
import ListShow from '../components/ListShow.vue';
export default {
    name: 'BidDetail',
    components: {
        "module-filter": ModuleFilter,
        "list-show": ListShow,
    },
    props: {
        bd: Object,
    },
    computed: {
        bt_time_range: function () {
            if (!this.start_bid_req.begin_time || !this.start_bid_req.end_time) {
                return '';
            }
            return this.start_bid_req.begin_time + '\n' + this.start_bid_req.end_time;
        },
        cust_selected: function () {
            return '共选择' + this.selected_companies.length + '家客户';
        },
    },
    data: function () {
        return {
            next_bid_req: {
                bc_id: this.bd.id,
                top_n: "",
            },
            show_next_bid: false,
            focus_bt: {
                bidding_items: []
            },
            show_bi: false,
            selected_companies: [],
            related_companies: [],
            show_bt_time: false,
            show_start_bid: false,
            show_stop_bid: false,
            show_company_select: false,
            start_bid_req: {
                bc_id: this.bd.id,
                begin_time: utils.dateFormatter(new Date(), 'y-m-d h:i', 4, false),
                end_time: utils.dateFormatter(new Date((new Date()).setHours((new Date()).getHours() + 1)), 'y-m-d h:i', 4, false),
                joiner_ids: [],
            },
            status_icon: function (status) {
                if (status == 0) {
                    return 'hourglass';
                } else if (status == 1) {
                    return 'checkbox-mark';
                } else if (status == 2) {
                    return 'close';
                } else {
                    return '';
                }
            },
        };
    },
    methods: {
        export_bc: async function (bc) {
            await this.$send_req('/bid/export_bc', {
                bc_id: bc.id
            });
            uni.showToast({
                title: '请到导出记录中查看',
                icon: 'success'
            });
        },
        next_bid: async function (e) {
            if (e.index == 1) {
                this.next_bid_req.begin_time = this.start_bid_req.begin_time;
                this.next_bid_req.end_time = this.start_bid_req.end_time;
                this.next_bid_req.top_n = parseInt(this.next_bid_req.top_n);
                await this.$send_req('/bid/next_turn', this.next_bid_req);
                uni.startPullDownRefresh();
            }
            this.show_next_bid = false;
        },
        prepare_show_bi: function (bt) {
            this.focus_bt = bt;
            this.show_bi = true;
        },
        stop_bid: async function () {
            await this.$send_req('/bid/stop', {
                bc_id: this.bd.id
            });
            uni.startPullDownRefresh();
        },
        prepare_company_select: function () {
            this.show_company_select = true;
            this.$refs.cust_comp.refresh();
        },
        get_related_companies: async function (pageNo, [stuffId, show_start_bid]) {
            let ret = [];
            if (show_start_bid) {
                let resp = await this.$send_req('/sale_management/contract_get', {
                    pageNo: pageNo,
                    stuff_id: stuffId,
                })
                resp.contracts.forEach(item => {
                    item.cond = item.company.name
                    if (item.rbac_users.length > 0) {
                        ret.push(item)
                    }
                });
            }
            return ret;
        },
        start_bid: async function (e) {
            if (e.index == 1) {
                this.selected_companies.forEach(item => {
                    this.start_bid_req.joiner_ids.push({
                        id: item
                    });
                });
                if (this.selected_companies.length <= 1) {
                    uni.showToast({
                        title: '至少选择两家客户',
                        icon: 'none'
                    });
                    return;
                }
                await this.$send_req('/bid/add_turn', this.start_bid_req);
                uni.startPullDownRefresh();
            }
            this.show_start_bid = false;
        },
        choose_date: function (e) {
            this.start_bid_req.begin_time = e.startDate.result;
            this.start_bid_req.end_time = e.endDate.result;
            this.show_bt_time = false;
        },
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

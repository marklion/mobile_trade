<template>
<view class="bd-card">
    <view class="bd-head">
        <view class="bd-head-main">
            <text class="bd-title">{{ bd.comment }}</text>
            <text class="bd-stuff">{{ bd.stuff.name }} · 总量 {{ bd.total }}</text>
        </view>
        <view class="status-pill run" v-if="bd.status == 0">
            <text class="status-pill-text">进行中</text>
        </view>
        <view class="status-pill done" v-else-if="bd.status == 1">
            <text class="status-pill-text">已完成</text>
        </view>
        <view class="status-pill stop" v-else-if="bd.status == 2">
            <text class="status-pill-text">已停止</text>
        </view>
    </view>

    <view class="bd-meta">
        <view class="meta-chip">
            <text class="meta-label">轮次</text>
            <text class="meta-value">共 {{ bd.total_turn }} 轮</text>
        </view>
        <view class="meta-chip">
            <text class="meta-label">出价区间</text>
            <text class="meta-value">{{ bd.min }} ~ {{ bd.max }}</text>
        </view>
        <view class="meta-chip warn" v-if="bd.price_hide">
            <text class="meta-value">价格隐藏</text>
        </view>
    </view>

    <view class="confirm-box ok" v-if="bd.customer_confirm_time">
        <text class="confirm-title">价格已确认</text>
        <text class="confirm-price">{{ bd.bidding_turns[0].bidding_items[0].price }}</text>
        <text class="confirm-sub">{{ bd.confirm_opt_name }} · {{ bd.customer_confirm_time }}</text>
    </view>
    <view class="confirm-box fail" v-else-if="bd.status == 1">
        <text class="confirm-title fail">价格未确认</text>
    </view>

    <view class="turn-list" v-if="bd.bidding_turns && bd.bidding_turns.length">
        <view class="turn-row" v-for="single_turn in bd.bidding_turns" :key="single_turn.id" @click="prepare_show_bi(single_turn)">
            <view class="turn-main">
                <view class="turn-title-row">
                    <text class="turn-name">第{{ single_turn.turn + 1 }}轮</text>
                    <text class="turn-tag done" v-if="single_turn.finish">已完成</text>
                    <text class="turn-tag" v-else>未完成</text>
                </view>
                <text class="turn-time">开始 {{ single_turn.begin_time }}</text>
                <text class="turn-time">结束 {{ single_turn.end_time }}</text>
            </view>
            <fui-icon name="arrowright" color="#98A2B3" :size="28"></fui-icon>
        </view>
    </view>

    <view class="bd-actions" v-if="$has_module('bid')">
        <view class="act-btn primary"
            v-if="bd.status == 0 && bd.bidding_turns.length == 0"
            @click="show_start_bid = true">
            <text class="act-btn-text">开启</text>
        </view>
        <view class="act-btn warn"
            v-else-if="bd.status == 0 && bd.bidding_turns.length != bd.total_turn"
            @click="show_next_bid = true">
            <text class="act-btn-text">开启下一轮</text>
        </view>
        <view class="act-btn danger" v-if="bd.status == 0" @click="show_stop_bid = true">
            <text class="act-btn-text">停止</text>
        </view>
        <view class="act-btn ghost" @click="export_bc(bd)">
            <text class="act-btn-text ghost">导出</text>
        </view>
    </view>
    <view class="bd-actions" v-else>
        <view class="act-btn ghost full" @click="export_bc(bd)">
            <text class="act-btn-text ghost">导出</text>
        </view>
    </view>

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
        <view class="popup-head">
            <text class="popup-title">选择客户</text>
        </view>
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
        <view class="popup-head">
            <text class="popup-title">出价明细</text>
        </view>
        <scroll-view class="bi-scroll" show-scrollbar scroll-y>
            <view class="bi-card" v-for="(si, index) in focus_bt.bidding_items" :key="si.id">
                <view class="bi-main">
                    <view class="bi-title-row">
                        <text class="bi-rank" v-if="index == 0 && si.time">领先</text>
                        <text class="bi-company">{{ si.rbac_user.company.name }}</text>
                    </view>
                    <text class="bi-user">{{ si.rbac_user.name }} · {{ si.accept ? '已接受' : '未接受' }}</text>
                </view>
                <view class="bi-side">
                    <text class="bi-price" v-if="si.time">{{ si.price }}</text>
                    <text class="bi-empty" v-else>未出价</text>
                    <text class="bi-time" v-if="si.time">{{ si.time }}</text>
                </view>
            </view>
        </scroll-view>
    </fui-bottom-popup>
</view>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
import ListShow from '../components/ListShow.vue';
export default {
    name: 'BidDetail',
    components: {
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
.bd-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 28rpx 24rpx 20rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.05);
}

.bd-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16rpx;
}

.bd-head-main {
    flex: 1;
    min-width: 0;
    padding-right: 16rpx;
}

.bd-title {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: #1d2129;
    line-height: 1.35;
}

.bd-stuff {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #667085;
}

.status-pill {
    flex-shrink: 0;
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
}

.status-pill.run {
    background: #eef1ff;
}

.status-pill.done {
    background: #e8f8f0;
}

.status-pill.stop {
    background: #f2f4f7;
}

.status-pill-text {
    font-size: 22rpx;
    font-weight: 600;
}

.status-pill.run .status-pill-text {
    color: #2F3FCF;
}

.status-pill.done .status-pill-text {
    color: #2BA471;
}

.status-pill.stop .status-pill-text {
    color: #667085;
}

.bd-meta {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 12rpx;
}

.meta-chip {
    display: flex;
    align-items: center;
    background: #f8f9fc;
    border-radius: 10rpx;
    padding: 10rpx 16rpx;
    margin-right: 12rpx;
    margin-bottom: 10rpx;
}

.meta-chip.warn {
    background: #fff6e8;
}

.meta-label {
    font-size: 22rpx;
    color: #98a2b3;
    margin-right: 8rpx;
}

.meta-value {
    font-size: 24rpx;
    color: #344054;
    font-weight: 500;
}

.meta-chip.warn .meta-value {
    color: #DC6803;
}

.confirm-box {
    border-radius: 12rpx;
    padding: 18rpx 20rpx;
    margin-bottom: 16rpx;
}

.confirm-box.ok {
    background: #e8f8f0;
}

.confirm-box.fail {
    background: #fdecee;
}

.confirm-title {
    display: block;
    font-size: 24rpx;
    color: #2BA471;
    font-weight: 600;
}

.confirm-title.fail {
    color: #E34D59;
}

.confirm-price {
    display: block;
    margin-top: 6rpx;
    font-size: 36rpx;
    font-weight: 700;
    color: #1d2129;
}

.confirm-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #667085;
}

.turn-list {
    margin-bottom: 8rpx;
}

.turn-row {
    display: flex;
    align-items: center;
    background: #f8f9fc;
    border-radius: 12rpx;
    padding: 18rpx 20rpx;
    margin-bottom: 12rpx;
}

.turn-main {
    flex: 1;
    min-width: 0;
}

.turn-title-row {
    display: flex;
    align-items: center;
    margin-bottom: 8rpx;
}

.turn-name {
    font-size: 28rpx;
    font-weight: 600;
    color: #1d2129;
    margin-right: 12rpx;
}

.turn-tag {
    font-size: 20rpx;
    color: #DC6803;
    background: #fff6e8;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}

.turn-tag.done {
    color: #2BA471;
    background: #e8f8f0;
}

.turn-time {
    display: block;
    font-size: 22rpx;
    color: #98a2b3;
    line-height: 1.45;
}

.bd-actions {
    display: flex;
    flex-wrap: wrap;
    margin-top: 8rpx;
}

.act-btn {
    height: 64rpx;
    padding: 0 28rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12rpx;
    margin-top: 8rpx;
}

.act-btn.full {
    flex: 1;
    margin-right: 0;
}

.act-btn.primary {
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
}

.act-btn.warn {
    background: #fff6e8;
}

.act-btn.danger {
    background: #fdecee;
}

.act-btn.ghost {
    background: #eef1ff;
}

.act-btn-text {
    font-size: 26rpx;
    font-weight: 500;
    color: #fff;
}

.act-btn.warn .act-btn-text {
    color: #DC6803;
}

.act-btn.danger .act-btn-text {
    color: #E34D59;
}

.act-btn-text.ghost {
    color: #2F3FCF;
}

.popup-head {
    padding: 28rpx 32rpx 12rpx;
}

.popup-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1d2129;
}

.bi-scroll {
    height: 60vh;
    padding: 0 24rpx 24rpx;
    box-sizing: border-box;
}

.bi-card {
    display: flex;
    align-items: center;
    background: #f8f9fc;
    border-radius: 12rpx;
    padding: 20rpx;
    margin-bottom: 14rpx;
}

.bi-main {
    flex: 1;
    min-width: 0;
    padding-right: 16rpx;
}

.bi-title-row {
    display: flex;
    align-items: center;
}

.bi-rank {
    font-size: 20rpx;
    color: #fff;
    background: #2F3FCF;
    padding: 4rpx 10rpx;
    border-radius: 8rpx;
    margin-right: 10rpx;
    flex-shrink: 0;
}

.bi-company {
    font-size: 28rpx;
    font-weight: 600;
    color: #1d2129;
}

.bi-user {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #667085;
}

.bi-side {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.bi-price {
    font-size: 32rpx;
    font-weight: 700;
    color: #2F3FCF;
}

.bi-empty {
    font-size: 24rpx;
    color: #98a2b3;
}

.bi-time {
    margin-top: 6rpx;
    font-size: 20rpx;
    color: #98a2b3;
}
</style>

<template>
<view class="bid-config-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">竞价中心</text>
            <text class="hero-title">竞价管理</text>
            <text class="hero-sub">创建活动、开启轮次与导出结果</text>
        </view>
    </view>

    <view class="shell">
        <list-show ref="bc_list" :fetch_function="get_bc_list" height="62vh" search_key="cond" v-model="bc_list">
            <view v-for="single_bc in bc_list" :key="single_bc.id">
                <bid-detail :bd="single_bc"></bid-detail>
            </view>
        </list-show>
    </view>

    <view class="bottom-bar" v-if="!show_stuff_select">
        <view class="primary-btn" @click="show_create_diag = true">
            <text class="primary-btn-text">新增竞价</text>
        </view>
    </view>

    <fui-modal width="600" :show="show_create_diag" v-if="show_create_diag" @click="add_bc">
        <fui-form ref="add_bc" top="100">
            <fui-input label="备注" borderTop placeholder="请输入备注" v-model="new_bc.comment"></fui-input>
            <fui-input label="最低出价" borderTop placeholder="请输入最低出价" v-model="new_bc.min"></fui-input>
            <fui-input label="最高出价" borderTop placeholder="请输入最高出价" v-model="new_bc.max"></fui-input>
            <fui-input label="押金" borderTop placeholder="请输入押金" v-model="new_bc.pay_first"></fui-input>
            <fui-input label="物料" borderTop disabled placeholder="点击选择物料" v-model="new_bc.stuff_name" @click="show_stuff_select = true"></fui-input>
            <fui-input label="物料总量" borderTop placeholder="请输入总量" v-model="new_bc.total"></fui-input>
            <fui-input label="竞价轮次" borderTop placeholder="请输入竞价轮次" v-model="new_bc.total_turn"></fui-input>
            <fui-label>
                <fui-list-cell>
                    <fui-text text="是否隐藏价格"></fui-text>
                    <u-switch v-model="new_bc.price_hide"></u-switch>
                </fui-list-cell>
            </fui-label>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_stuff_select" v-if="show_stuff_select" @close="show_stuff_select = false">
        <view class="popup-head">
            <text class="popup-title">选择物料</text>
        </view>
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
import BidDetail from './BidDetail.vue';
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
                price_hide: false,
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
                },
                {
                    name: 'pay_first',
                    rule: ['isAmount'],
                    msg: ['请输入正确的押金格式']
                },
                {
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
                    total_turn: this.new_bc.total_turn,
                    price_hide: this.new_bc.price_hide,
                    pay_first: this.new_bc.pay_first,
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (parseFloat(this.new_bc.max) <= parseFloat(this.new_bc.min)) {
                    uni.showToast({
                        title: '最高出价必须大于最低出价',
                        icon: 'none'
                    });
                    return;
                }
                this.new_bc.max = parseFloat(this.new_bc.max);
                this.new_bc.min = parseFloat(this.new_bc.min);
                this.new_bc.total = parseFloat(this.new_bc.total);
                this.new_bc.total_turn = parseInt(this.new_bc.total_turn);
                this.new_bc.pay_first = parseFloat(this.new_bc.pay_first);
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

<style scoped>
.bid-config-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #eef1ff 0%, #f7f8fc 42%, #f3f5f9 100%);
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.hero {
    position: relative;
    overflow: hidden;
    padding: 36rpx 32rpx 48rpx;
    background: linear-gradient(135deg, #2F3FCF 0%, #465CFF 55%, #6B7CFF 100%);
}

.hero-logo-bg {
    position: absolute;
    right: -20rpx;
    top: -10rpx;
    width: 220rpx;
    height: 220rpx;
    opacity: 0.18;
}

.hero-logo-img {
    width: 100%;
    height: 100%;
}

.hero-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
}

.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.78);
    letter-spacing: 4rpx;
}

.hero-title {
    margin-top: 10rpx;
    font-size: 44rpx;
    font-weight: 700;
    color: #fff;
}

.hero-sub {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.86);
}

.shell {
    margin: -24rpx 24rpx 0;
    position: relative;
    z-index: 2;
}

.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    border-top: 1rpx solid #EEF1F8;
    box-shadow: 0 -8rpx 24rpx rgba(26, 31, 54, 0.06);
}

.primary-btn {
    height: 84rpx;
    border-radius: 14rpx;
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
    display: flex;
    align-items: center;
    justify-content: center;
}

.primary-btn-text {
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
}

.popup-head {
    padding: 28rpx 32rpx 12rpx;
}

.popup-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1d2129;
}
</style>

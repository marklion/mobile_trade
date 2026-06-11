<template>
<view class="page">
    <view v-if="!showWeb" class="confirm-page">
        <view class="valid-popup" :class="{ 'valid-popup--show': popupVisible }">
            <text class="valid-popup-text">磅单为真，请核对官方磅单</text>
            <view class="valid-popup-btn" @click="openWeb">查看官方磅单</view>
        </view>
    </view>
    <web-view v-if="showWeb" :src="ticketUrl"></web-view>
</view>
</template>

<script>
export default {
    name: 'TicketVerifyResult',
    data: function () {
        return {
            ticketUrl: '',
            showWeb: false,
            popupVisible: false,
        }
    },
    onLoad: function (options) {
        if (options.url) {
            this.ticketUrl = decodeURIComponent(options.url);
        }
        if (options.open === '1') {
            this.showWeb = true;
        }
    },
    onReady: function () {
        if (this.showWeb) {
            return;
        }
        this.$nextTick(() => {
            this.popupVisible = true;
        });
    },
    methods: {
        openWeb: function () {
            this.popupVisible = false;
            this.showWeb = true;
        },
    },
}
</script>

<style scoped>
.page {
    width: 100%;
    height: 100%;
}

.confirm-page {
    min-height: 100vh;
    background-color: #F8F8F8;
}

.valid-popup {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    padding: 24rpx 32rpx;
    padding-top: calc(24rpx + env(safe-area-inset-top));
    transform: translateY(-120%);
    transition: transform 0.28s ease;
}

.valid-popup--show {
    transform: translateY(0);
}

.valid-popup-text {
    display: block;
    background-color: #07c160;
    color: #fff;
    font-size: 30rpx;
    font-weight: bold;
    text-align: center;
    line-height: 1.5;
    padding: 28rpx 32rpx;
    border-radius: 16rpx 16rpx 0 0;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}

.valid-popup-btn {
    background-color: #fff;
    color: #07c160;
    font-size: 30rpx;
    font-weight: bold;
    text-align: center;
    padding: 24rpx 32rpx;
    border-radius: 0 0 16rpx 16rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
    border-top: 1px solid rgba(7, 193, 96, 0.15);
}
</style>

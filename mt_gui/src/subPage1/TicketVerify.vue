<template>
<view class="page">
    <view v-if="status === 'home'" class="home">
        <text class="title">磅单验真</text>
        <text class="desc">点击下方按钮，扫描磅单二维码后核对是否为官方磅单</text>
        <view class="actions">
            <view class="action-card" @click="startScan">
                <fui-icon name="scan" size="80" color="#465CFF"></fui-icon>
                <text class="action-title">扫一扫</text>
                <text class="action-desc">打开相机扫描磅单二维码</text>
            </view>
        </view>
    </view>

    <view v-else-if="status === 'verifying'" class="status">
        <text>正在验证...</text>
    </view>

    <view v-else-if="status === 'fake'" class="status fake">
        <text class="fake-text">磅单为假</text>
        <text class="hint" v-if="scannedHost">识别域名：{{ scannedHost }}</text>
        <text class="hint" v-if="officialHost">官方域名：{{ officialHost }}</text>
        <text class="hint" v-else>二维码域名与官方磅单不一致</text>
        <fui-button text="重新验证" type="primary" @click="goHome"></fui-button>
    </view>

    <view v-else-if="status === 'validConfirm'" class="confirm-page">
        <view class="valid-popup" :class="{ 'valid-popup--show': popupVisible }">
            <text class="valid-popup-text">磅单为真，请核对官方磅单</text>
            <view class="valid-popup-btn" @click="openOfficialTicket">查看官方磅单</view>
        </view>
    </view>
</view>
</template>

<script>
export default {
    name: 'TicketVerify',
    data: function () {
        return {
            status: 'home',
            scanning: false,
            scannedHost: '',
            officialHost: '',
            ticketUrl: '',
            popupVisible: false,
        }
    },
    methods: {
        goHome: function () {
            this.status = 'home';
            this.scannedHost = '';
            this.officialHost = '';
            this.ticketUrl = '';
            this.popupVisible = false;
        },
        openOfficialTicket: function () {
            if (!this.ticketUrl) {
                return;
            }
            uni.navigateTo({
                url: '/subPage1/TicketVerifyResult?url=' + encodeURIComponent(this.ticketUrl) + '&open=1'
            });
        },
        startScan: function () {
            if (this.scanning) {
                return;
            }
            this.scanning = true;
            uni.scanCode({
                onlyFromCamera: true,
                scanType: ['qrCode'],
                success: (res) => {
                    this.scanning = false;
                    this.verifyContent(res.result);
                },
                fail: () => {
                    this.scanning = false;
                }
            });
        },
        verifyContent: async function (content) {
            this.status = 'verifying';
            try {
                const ret = await this.$send_req('/global/verify_ticket_qr', {
                    qr_content: content
                }, true);
                this.handleVerifyResult(ret);
            } catch (error) {
                this.status = 'home';
            }
        },
        handleVerifyResult: function (ret) {
            if (ret.valid) {
                this.ticketUrl = ret.qr_content || '';
                this.status = 'validConfirm';
                this.popupVisible = false;
                this.$nextTick(() => {
                    this.popupVisible = true;
                });
            } else {
                this.scannedHost = ret.scanned_host || '';
                this.officialHost = ret.official_host || '';
                this.status = 'fake';
            }
        },
    },
}
</script>

<style scoped>
.page {
    min-height: 100vh;
    background-color: #F8F8F8;
}

.home {
    padding: 60rpx 40rpx;
}

.title {
    display: block;
    font-size: 44rpx;
    font-weight: bold;
    color: #333;
    text-align: center;
    margin-bottom: 20rpx;
}

.desc {
    display: block;
    font-size: 28rpx;
    color: #999;
    text-align: center;
    line-height: 1.6;
    margin-bottom: 60rpx;
}

.actions {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}

.action-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 48rpx 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.action-title {
    font-size: 34rpx;
    font-weight: bold;
    color: #333;
    margin-top: 24rpx;
}

.action-desc {
    font-size: 26rpx;
    color: #999;
    margin-top: 12rpx;
    text-align: center;
}

.status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 40rpx;
    color: #666;
    font-size: 32rpx;
    gap: 24rpx;
}

.hint {
    color: #999;
    font-size: 28rpx;
    text-align: center;
}

.fake-text {
    color: #e64340;
    font-size: 48rpx;
    font-weight: bold;
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

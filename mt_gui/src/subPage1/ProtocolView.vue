<template>
<view class="protocol-page">
    <scroll-view scroll-y class="protocol-scroll">
        <view class="protocol-body">
            <text class="protocol-text">{{ displayContent }}</text>

            <view v-if="signedSigners.length > 0" class="protocol-sign-zone">
                <view
                    v-for="signer in signedSigners"
                    :key="signer.name"
                    class="sign-slot"
                >
                    <view class="sign-slot-head">
                        <text class="sign-slot-label">{{ signer.name }}</text>
                        <text v-if="signer.sign_time" class="sign-slot-time">{{ signer.sign_time }}</text>
                    </view>
                    <image
                        class="sign-slot-img"
                        :src="signPicUrl(signer.sign_pic)"
                        mode="aspectFit"
                    />
                </view>
            </view>
        </view>
    </scroll-view>
</view>
</template>

<script>
export default {
    name: 'ProtocolView',
    data() {
        return {
            plan_id: 0,
            doc_title: '',
            doc_content: '',
            signers: [],
        };
    },
    computed: {
        displayContent() {
            if (this.doc_content && this.doc_content.trim()) {
                return this.doc_content.trim();
            }
            return '暂无协议正文';
        },
        signedSigners() {
            return (this.signers || []).filter((s) => s.signed && s.sign_pic);
        },
    },
    methods: {
        signPicUrl(path) {
            return this.$convert_attach_url(path);
        },
        loadProtocol: async function () {
            if (!this.plan_id) {
                return;
            }
            const resp = await this.$send_req('/global/get_plan_protocol', {
                plan_id: this.plan_id,
            });
            this.doc_title = resp.doc_title;
            this.doc_content = resp.doc_content;
            this.signers = resp.signers || [];
            if (this.doc_title) {
                uni.setNavigationBarTitle({ title: this.doc_title });
            }
        },
    },
    onLoad(option) {
        this.plan_id = Number.parseInt(option.plan_id, 10) || 0;
        this.loadProtocol();
    },
};
</script>

<style scoped>
.protocol-page {
    min-height: 100vh;
    background: #f5f6f8;
    box-sizing: border-box;
}

.protocol-scroll {
    height: 100vh;
    padding: 24rpx;
    box-sizing: border-box;
}

.protocol-body {
    background: #fff;
    border-radius: 16rpx;
    padding: 40rpx 32rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
    min-height: calc(100vh - 48rpx);
    box-sizing: border-box;
}

.protocol-text {
    display: block;
    font-size: 28rpx;
    color: #333;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-all;
}

.protocol-sign-zone {
    margin-top: 48rpx;
    padding-top: 32rpx;
    border-top: 1px dashed #ddd;
}

.sign-slot {
    margin-bottom: 32rpx;
}

.sign-slot:last-child {
    margin-bottom: 0;
}

.sign-slot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12rpx;
}

.sign-slot-label {
    font-size: 26rpx;
    color: #666;
}

.sign-slot-time {
    font-size: 22rpx;
    color: #999;
}

.sign-slot-img {
    width: 100%;
    height: 140rpx;
    background: #fafafa;
    border: 1px solid #eee;
    border-radius: 8rpx;
}
</style>

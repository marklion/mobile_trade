<template>
<view class="protocol-page">
    <scroll-view scroll-y class="protocol-scroll">
        <view class="protocol-body">
            <view v-if="doc_loading" class="protocol-doc-status">协议加载中...</view>
            <view v-else-if="doc_error" class="protocol-doc-status protocol-doc-error">
                <text>{{ doc_error }}</text>
                <fui-button
                    v-if="doc_path"
                    text="打开协议文件"
                    type="primary"
                    btnSize="small"
                    @click="openDocx"
                />
            </view>
            <block v-else-if="doc_html">
                <!-- #ifdef H5 -->
                <div class="protocol-doc-html" v-html="doc_html"></div>
                <!-- #endif -->
                <!-- #ifndef H5 -->
                <rich-text class="protocol-doc-html" :nodes="doc_html"></rich-text>
                <!-- #endif -->
            </block>

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
import { load_docx_html, open_docx_file } from '@/utils/protocol_doc.js';

export default {
    name: 'ProtocolView',
    data() {
        return {
            plan_id: 0,
            doc_title: '',
            doc_path: '',
            doc_html: '',
            doc_loading: false,
            doc_error: '',
            signers: [],
        };
    },
    computed: {
        signedSigners() {
            return (this.signers || []).filter((s) => s.signed && s.sign_pic);
        },
    },
    methods: {
        signPicUrl(path) {
            return this.$convert_attach_url(path);
        },
        loadDocxPreview: async function () {
            if (!this.doc_path) {
                this.doc_html = '';
                this.doc_error = '协议文件不存在';
                return;
            }
            this.doc_loading = true;
            this.doc_error = '';
            this.doc_html = '';
            try {
                this.doc_html = await load_docx_html(this.doc_path, this.$convert_attach_url);
            } catch (error) {
                console.error(error);
                this.doc_error = '协议预览失败，可尝试直接打开文件';
            } finally {
                this.doc_loading = false;
            }
        },
        openDocx: async function () {
            if (!this.doc_path) {
                return;
            }
            uni.showLoading({ title: '打开中...' });
            try {
                await open_docx_file(this.doc_path, this.$convert_attach_url);
            } catch (error) {
                console.error(error);
                uni.showToast({ title: '打开失败', icon: 'none' });
            } finally {
                uni.hideLoading();
            }
        },
        loadProtocol: async function () {
            if (!this.plan_id) {
                return;
            }
            const resp = await this.$send_req('/global/get_plan_protocol', {
                plan_id: this.plan_id,
            });
            this.doc_title = resp.doc_title;
            this.doc_path = resp.doc_path || '';
            this.signers = resp.signers || [];
            if (this.doc_title) {
                uni.setNavigationBarTitle({ title: this.doc_title });
            }
            await this.loadDocxPreview();
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

.protocol-doc-status {
    font-size: 28rpx;
    color: #999;
    line-height: 1.8;
    text-align: center;
    padding: 40rpx 0;
}

.protocol-doc-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
}

.protocol-doc-html {
    display: block;
    font-size: 28rpx;
    color: #333;
    line-height: 1.8;
    word-break: break-word;
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

<template>
<view>
    <view v-if="doc_loading" class="protocol-doc-status">协议加载中...</view>
    <view v-else-if="doc_error" class="protocol-doc-status protocol-doc-error">
        <text>{{ doc_error }}</text>
    </view>
    <block v-else-if="doc_html">
        <!-- #ifdef H5 -->
        <div class="protocol-doc-html" v-html="doc_html"></div>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <rich-text class="protocol-doc-html" :nodes="doc_html"></rich-text>
        <!-- #endif -->
    </block>
</view>
</template>

<script>
export default {
    name: 'ProtocolDocPreview',
    props: {
        doc_loading: {
            type: Boolean,
            default: false,
        },
        doc_error: {
            type: String,
            default: '',
        },
        doc_path: {
            type: String,
            default: '',
        },
        doc_html: {
            type: String,
            default: '',
        },
    },
};
</script>

<style scoped lang="scss">
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
</style>

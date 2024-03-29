<template>
<view>
    <fui-white-space size="large"></fui-white-space>
    <fui-section :title="self_info.company" size="50" isLine></fui-section>
    <fui-divider></fui-divider>
    <fui-row isFlex justify="center">
        <fui-col :span="12">
            <view class="brief_content">
                采购概况
            </view>
        </fui-col>
        <fui-col :span="12">
            <view class="brief_content">
                销售概况
            </view>
        </fui-col>
    </fui-row>
</view>
</template>

<script>
export default {
    name: 'Home',
    data() {
        return {
            self_info: {
                company: '',
            },
        }
    },
    methods: {},
    onLoad: function () {
        this.self_info = uni.getStorageSync('self_info');
    },
}
</script>

<style scoped>
.brief_content {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
}
</style>

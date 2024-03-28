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
    methods: {
        init_self_info: async function () {
            try {
                uni.removeStorageSync('self_info');
                let self_info = await this.$send_req('/rbac/self_info');
                this.self_info = self_info;
                uni.setStorageSync('self_info', self_info);
            } catch (error) {
                uni.navigateTo({
                    url: '/pages/Login'
                });
            }
        },
    },
    onLoad: function () {
        this.init_self_info();
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

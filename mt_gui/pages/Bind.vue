<template>
<view>
    <fui-form ref="form" top="0" :model="formData" :show="false">
        <fui-form-item label="公司全称" asterisk prop="company_name">
            <fui-input :borderBottom="false" :padding="[0]" placeholder="请输入公司全称" v-model="formData.company_name"></fui-input>
        </fui-form-item>
        <fui-form-item label="姓名" asterisk prop="name">
            <fui-input :borderBottom="false" :padding="[0]"  placeholder="请输入姓名" v-model="formData.name"></fui-input>
        </fui-form-item>
        <fui-button text="绑定" bold @click="submit"></fui-button>
    </fui-form>
</view>
</template>

<script>
export default {
    name: 'Bind',
    data: function () {
        return {
            formData: {
                phone_code: '18888888888',
                company_name: '',
                name: '',
                open_id_code: '123456'
            }
        }
    },
    methods: {
        submit: async function () {
            let res = await this.$send_req('/rbac/fetch_user', this.formData);
            uni.setStorageSync('token', res.token);
            uni.reLaunch({
                url: '/pages/Home'
            });
        },
    },
}
</script>

<style>

</style>

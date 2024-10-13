<template>
<view>
    <fui-card full>
        <view style="display: flex; justify-content: center; flex-direction: column; align-items: center;">
            <view style="margin-top: 10vh; margin-bottom: 3vh;">
                <fui-avatar src="/static/logo.jpg" size="large"></fui-avatar>
            </view>
            <view style="font-size:30px;">
                掌易助理
            </view>
        </view>

    </fui-card>
    <fui-tabs :tabs="tabs" @change="change"></fui-tabs>
    <view v-if="cur_tab == 0" style="margin-top: 10vh">
        <fui-button text="微信登录" type="success" @click="wx_login"></fui-button>
    </view>
    <view v-else>
        <fui-form ref="form" :model="formData" :show="true" :top="50">
            <fui-form-item label="手机号码" asterisk prop="phone">
                <fui-input maxlength="11" :borderBottom="false" :padding="[0]" placeholder="请输入手机号码" v-model="formData.phone"></fui-input>
            </fui-form-item>
            <fui-form-item label="密码" asterisk prop="password">
                <fui-input :borderBottom="false" :padding="[0]" password placeholder="请输入密码" v-model="formData.password"></fui-input>
            </fui-form-item>
            <fui-button text="登录" bold @click="submit"></fui-button>
        </fui-form>
    </view>
</view>
</template>

<script>
export default {
    name: 'Login',
    data: function () {
        return {
            tabs: ['微信登录', '密码登录'],
            cur_tab: 0,
            formData: {
                phone: '',
                password: '',
            },
            rules: [{
                name: "phone",
                rule: ["required", "isMobile"],
                msg: ["请输入手机号", "请输入有效的手机号"]
            }, {
                name: "password",
                rule: ["required"],
                msg: ["请输入密码"]
            }]
        }
    },
    methods: {
        change: function (e) {
            this.cur_tab = e.index;
        },
        submit: async function () {
            // 客户端登录校验
            this.$refs.form.validator(this.formData, this.rules).then(async res => {
                if (res.isPassed) {
                    let res = await this.$send_req('/global/pwd_login', this.formData);
                    uni.setStorageSync('token', res.token);
                    await this.$init_self();
                    uni.reLaunch({
                        url: '/pages/Home'
                    });
                }
            }).catch(err => {
                console.log(err)
            })

        },
        wx_login: async function () {
            try {
                let res = await this.$send_req('/global/wx_login', {
                    login_code: await this.$get_login_code()
                });
                uni.setStorageSync('token', res.token);
                await this.$init_self();
                uni.reLaunch({
                    url: '/pages/Home'
                });
            } catch (error) {
                if ('用户未找到' == error) {
                    uni.navigateTo({
                        url: '/subPage1/Bind'
                    });
                }
            }

        },
    },
}
</script>

<style></style>

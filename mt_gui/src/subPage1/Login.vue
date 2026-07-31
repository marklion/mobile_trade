<template>
<view class="login-page">
    <logo-loading />
    <view class="bg-layer">
        <view class="bg-arc"></view>
        <image class="bg-logo" src="/static/logo_transparent.png" mode="aspectFit"></image>
    </view>

    <view class="login-body">
        <view class="brand-block">
            <image class="brand-mark" src="/static/logo.jpg" mode="aspectFit"></image>
            <text class="brand-name">掌易助理</text>
            <text class="brand-desc">会员专属服务 · 安全登录</text>
        </view>

        <view class="sheet">
            <view class="mode-switch">
                <view class="mode-btn" :class="{ on: cur_tab === 0 }" @click="switch_tab(0)">微信登录</view>
                <view class="mode-btn" :class="{ on: cur_tab === 1 }" @click="switch_tab(1)">密码登录</view>
            </view>

            <view v-if="cur_tab === 0" class="wx-box">
                <view class="wx-badge">
                    <fui-icon name="wechat" size="56" color="#2DBE6C"></fui-icon>
                </view>
                <text class="wx-hint">一键授权，快速进入系统</text>
                <fui-button text="微信登录" bold background="#465CFF" color="#FFFFFF"
                    radius="48rpx" height="88rpx" size="32" @click="wx_login"></fui-button>
            </view>

            <view v-else class="pwd-box">
                <fui-form ref="form" :model="formData" :show="true" :top="0">
                    <view class="field">
                        <text class="field-label">手机号码</text>
                        <view class="field-line">
                            <view class="field-icon">
                                <fui-icon name="mobile" size="32" color="#8A94A6"></fui-icon>
                            </view>
                            <fui-input maxlength="11" :borderBottom="false" :padding="[0]"
                                placeholder="请输入手机号码" v-model="formData.phone"></fui-input>
                        </view>
                    </view>
                    <view class="field">
                        <text class="field-label">密码</text>
                        <view class="field-line">
                            <view class="field-icon">
                                <fui-icon name="lock" size="32" color="#8A94A6"></fui-icon>
                            </view>
                            <fui-input :borderBottom="false" :padding="[0]" password
                                placeholder="请输入密码" v-model="formData.password"></fui-input>
                        </view>
                    </view>
                    <view class="submit-gap">
                        <fui-button text="登录" bold background="#465CFF" color="#FFFFFF"
                            radius="48rpx" height="88rpx" size="32" @click="submit"></fui-button>
                    </view>
                </fui-form>
            </view>
        </view>

        <view class="feature-row">
            <view class="feature-item">
                <view class="feature-icon" style="background: rgba(70, 92, 255, 0.12);">
                    <fui-icon name="order" size="32" color="#465CFF"></fui-icon>
                </view>
                <text class="feature-title">订单协同</text>
                <text class="feature-sub">采购销售一体</text>
            </view>
            <view class="feature-item">
                <view class="feature-icon" style="background: rgba(45, 190, 108, 0.12);">
                    <fui-icon name="location" size="32" color="#2DBE6C"></fui-icon>
                </view>
                <text class="feature-title">现场管理</text>
                <text class="feature-sub">排队过磅安检</text>
            </view>
            <view class="feature-item">
                <view class="feature-icon" style="background: rgba(255, 138, 43, 0.12);">
                    <fui-icon name="wallet" size="32" color="#FF8A2B"></fui-icon>
                </view>
                <text class="feature-title">结算对接</text>
                <text class="feature-sub">余额与推送</text>
            </view>
        </view>

        <text class="foot-note">登录即表示您已了解并同意相关服务约定</text>
        <text class="foot-support">北京卓创维朗科技有限公司 提供技术支持</text>
    </view>
</view>
</template>

<script>
export default {
    name: 'Login',
    data: function () {
        return {
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
        switch_tab: function (index) {
            this.cur_tab = index;
        },
        submit: async function () {
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

<style scoped>
.login-page {
    position: relative;
    min-height: 100vh;
    background: #F2F4FA;
    box-sizing: border-box;
    overflow: hidden;
}

.bg-layer {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 420rpx;
    background: linear-gradient(165deg, #2F3FCF 0%, #465CFF 58%, #6B7CFF 100%);
    overflow: hidden;
    z-index: 0;
}

.bg-arc {
    position: absolute;
    left: -20%;
    right: -20%;
    bottom: -120rpx;
    height: 220rpx;
    border-radius: 50%;
    background: #F2F4FA;
}

.bg-logo {
    position: absolute;
    top: -40rpx;
    right: -30rpx;
    width: 280rpx;
    height: 280rpx;
    opacity: 0.28;
    transform: translate(12%, -8%);
}

.login-body {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    padding: 56rpx 40rpx 40rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.brand-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 36rpx;
}

.brand-mark {
    width: 100rpx;
    height: 100rpx;
    border-radius: 24rpx;
    background: #FFFFFF;
    box-shadow: 0 12rpx 32rpx rgba(24, 36, 110, 0.22);
    margin-bottom: 18rpx;
}

.brand-name {
    font-size: 44rpx;
    color: #FFFFFF;
    font-weight: 700;
    letter-spacing: 2rpx;
    text-shadow: 0 6rpx 18rpx rgba(20, 30, 90, 0.25);
}

.brand-desc {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.78);
}

.sheet {
    background: #FFFFFF;
    border-radius: 28rpx;
    box-shadow: 0 16rpx 40rpx rgba(40, 58, 120, 0.1);
    padding: 12rpx 28rpx 36rpx;
}

.mode-switch {
    display: flex;
    flex-direction: row;
    background: #F3F5FF;
    border-radius: 999rpx;
    padding: 6rpx;
    margin: 16rpx 0 28rpx;
}

.mode-btn {
    flex: 1;
    text-align: center;
    padding: 18rpx 0;
    font-size: 26rpx;
    color: #8A94A6;
    border-radius: 999rpx;
    font-weight: 500;
}

.mode-btn.on {
    color: #465CFF;
    background: #FFFFFF;
    font-weight: 700;
    box-shadow: 0 4rpx 16rpx rgba(70, 92, 255, 0.12);
}

.wx-box {
    display: flex;
    flex-direction: column;
    padding: 12rpx 0 8rpx;
}

.wx-badge {
    width: 108rpx;
    height: 108rpx;
    border-radius: 54rpx;
    background: rgba(45, 190, 108, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    margin-bottom: 18rpx;
}

.wx-hint {
    text-align: center;
    font-size: 24rpx;
    color: #8A94A6;
    margin-bottom: 36rpx;
}

.pwd-box {
    padding-top: 8rpx;
}

.field {
    margin-bottom: 28rpx;
}

.field-label {
    display: block;
    font-size: 24rpx;
    color: #4A5568;
    font-weight: 600;
    margin-bottom: 12rpx;
}

.field-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8rpx 4rpx 16rpx;
    border-bottom: 1rpx solid #E4E8F2;
}

.field-icon {
    margin-right: 16rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

.submit-gap {
    margin-top: 36rpx;
}

.feature-row {
    display: flex;
    flex-direction: row;
    margin-top: 36rpx;
    padding: 28rpx 12rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    border: 1rpx solid #EEF1F8;
}

.feature-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 8rpx;
}

.feature-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
}

.feature-title {
    font-size: 24rpx;
    color: #1A1F36;
    font-weight: 600;
}

.feature-sub {
    margin-top: 6rpx;
    font-size: 20rpx;
    color: #9AA3B8;
}

.foot-note {
    display: block;
    margin-top: auto;
    padding-top: 32rpx;
    text-align: center;
    font-size: 20rpx;
    color: #9AA3B8;
}

.foot-support {
    display: block;
    margin-top: 12rpx;
    text-align: center;
    font-size: 20rpx;
    color: #B0B7C8;
}
</style>

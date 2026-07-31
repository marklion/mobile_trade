<template>
<div class="login-page">
    <div class="bg-curve"></div>
    <div class="bg-logo"></div>

    <div class="login-main">
        <div class="brand-block">
            <div class="brand-mark">
                <img src="@/assets/zyzl.jpg" alt="掌易助理" class="brand-logo">
            </div>
            <div class="brand-name">掌易助理</div>
            <div class="brand-desc">数字化贸易协同平台</div>
        </div>

        <div class="sheet">
            <div class="sheet-title">账号登录</div>
            <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form" auto-complete="on" label-position="top">
                <el-form-item label="手机号" prop="phone">
                    <el-input ref="phone" v-model="loginForm.phone" placeholder="请输入手机号" name="phone" type="text" tabindex="0" auto-complete="on" prefix-icon="el-icon-mobile-phone" />
                </el-form-item>
                <el-form-item label="密码" prop="password">
                    <el-popover placement="right" trigger="hover">
                        <img src="@/assets/login_prompt.jpg" class="pwd-tip-img" alt="密码提示">
                        <el-input slot="reference" :key="passwordType" ref="password" v-model="loginForm.password" :type="passwordType" placeholder="请输入密码" name="password" tabindex="-1" auto-complete="on" prefix-icon="el-icon-lock" @keyup.enter.native="handleLogin">
                            <i slot="suffix" class="el-input__icon el-icon-view show-pwd" @click="showPwd"></i>
                        </el-input>
                    </el-popover>
                </el-form-item>
                <el-button :loading="loading" type="primary" class="login-btn" @click.native.prevent="handleLogin">登录</el-button>
                <div class="form-footer">
                    <el-link type="primary" :href="help_url()">帮助中心</el-link>
                </div>
            </el-form>
        </div>

        <div class="page-support">北京卓创维朗科技有限公司 提供技术支持</div>
    </div>
</div>
</template>

<script>
import {
    validPhoneNumber
} from '@/utils/validate'

export default {
    name: 'Login',
    data() {
        const validatePhone = (rule, value, callback) => {
            if (!validPhoneNumber(value)) {
                callback(new Error('请输入正确的手机号'))
            } else {
                callback()
            }
        }
        return {
            help_url: function () {
                return process.env.REMOTE_HOST + '/help/'
            },
            loginForm: {
                phone: '',
                password: ''
            },
            loginRules: {
                phone: [{
                    required: true,
                    trigger: 'blur',
                    validator: validatePhone
                }],
                password: [{
                    required: true,
                    trigger: 'blur',
                }]
            },
            loading: false,
            passwordType: 'password',
            redirect: undefined
        }
    },
    watch: {
        $route: {
            handler: function (route) {
                this.redirect = route.query && route.query.redirect
            },
            immediate: true
        }
    },
    methods: {
        showPwd() {
            if (this.passwordType === 'password') {
                this.passwordType = ''
            } else {
                this.passwordType = 'password'
            }
            this.$nextTick(() => {
                this.$refs.password.focus()
            })
        },
        handleLogin() {
            this.$refs.loginForm.validate(valid => {
                if (valid) {
                    this.loading = true
                    this.$store.dispatch('user/login', this.loginForm).then(() => {
                        this.$router.push({
                            path: this.redirect || '/'
                        })
                        this.loading = false
                    }).catch(() => {
                        this.loading = false
                    })
                } else {
                    console.log('error submit!!')
                    return false
                }
            })
        }
    }
}
</script>

<style lang="scss" scoped>
.login-page {
    position: relative;
    min-height: 100vh;
    width: 100%;
    background: #F2F4FA;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    box-sizing: border-box;
}

.bg-curve {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 52vh;
    background: linear-gradient(165deg, #2F3FCF 0%, #465CFF 55%, #6B7CFF 100%);
    clip-path: ellipse(120% 100% at 50% 0%);
}

.bg-logo {
    position: absolute;
    top: 4vh;
    right: 8vw;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 68%);
    pointer-events: none;
}

.login-main {
    position: relative;
    z-index: 1;
    width: 420px;
    max-width: 100%;
}

.brand-block {
    text-align: center;
    margin-bottom: 28px;
    color: #fff;
}

.brand-mark {
    width: 72px;
    height: 72px;
    margin: 0 auto 18px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 28px rgba(20, 30, 90, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.brand-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    display: block;
}

.brand-name {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: 2px;
    text-shadow: 0 8px 24px rgba(20, 30, 90, 0.25);
}

.brand-desc {
    margin-top: 10px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
}

.sheet {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 18px 48px rgba(40, 58, 120, 0.14);
    padding: 32px 28px 28px;
}

.sheet-title {
    font-size: 22px;
    font-weight: 700;
    color: #1A1F36;
    margin-bottom: 22px;
}

.login-form {
    ::v-deep .el-form-item__label {
        color: #4A5568;
        font-weight: 600;
        padding: 0 0 8px;
        line-height: 1.2;
    }

    ::v-deep .el-input__inner {
        height: 46px;
        line-height: 46px;
        border-radius: 12px;
        border-color: #E4E8F2;
        background: #F7F8FE;
    }

    ::v-deep .el-input__inner:focus {
        border-color: #465CFF;
        background: #fff;
    }
}

.pwd-tip-img {
    width: 220px;
    max-width: 100%;
}

.show-pwd {
    cursor: pointer;
    color: #8A94A6;
}

.login-btn {
    width: 100%;
    height: 46px;
    margin-top: 8px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #465CFF, #2F3FCF);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 2px;
}

.login-btn:hover,
.login-btn:focus {
    background: linear-gradient(135deg, #5A6EFF, #465CFF);
}

.form-footer {
    margin-top: 16px;
    text-align: right;
}

.page-support {
    margin-top: 24px;
    text-align: center;
    font-size: 12px;
    color: #9AA3B8;
    letter-spacing: 0.5px;
}
</style>

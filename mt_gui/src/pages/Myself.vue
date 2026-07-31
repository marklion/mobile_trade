<template>
    <view class="myself-page">
        <logo-loading />
        <view class="page-mesh"></view>
        <view class="page-glow page-glow-a"></view>
        <view class="page-glow page-glow-b"></view>

        <view class="myself-hero">
            <view class="profile-card">
                <view class="hero-logo-bg">
                    <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
                </view>
                <view class="hero-top">
                    <text class="hero-greeting">个人中心</text>
                </view>
                <view class="profile-row">
                    <view class="avatar-wrap">
                        <fui-avatar size="middle" shape="circle" :text="avatar_text" background="#FFFFFF"
                            color="#465CFF"></fui-avatar>
                    </view>
                    <view class="profile-info">
                        <text class="profile-name">{{ self_info.name || '未命名用户' }}</text>
                        <text class="profile-company">{{ self_info.company || '暂无公司' }}</text>
                        <text class="profile-phone">{{ self_info.phone || '暂无手机号' }}</text>
                    </view>
                </view>
                <view class="profile-modules" v-if="module_list.length > 0">
                    <view class="profile-modules-head">
                        <text class="profile-modules-title">权限模块</text>
                        <text class="profile-modules-en">MODULES</text>
                    </view>
                    <view class="module-chips">
                        <view class="module-chip" v-for="(item, index) in module_list" :key="index">
                            <text class="module-chip-text">{{ item.description || item.name }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <view class="content-stack">
            <view class="section-shell">
                <view class="section-head">
                    <view class="section-head-left">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">账号设置</text>
                            <text class="section-en">ACCOUNT</text>
                        </view>
                    </view>
                </view>
                <view class="account-grid">
                    <view class="account-btn" @click="show_change_pwd = true">
                        <view class="account-btn-icon" style="background: rgba(70, 92, 255, 0.12);">
                            <fui-icon name="lock" size="36" color="#465CFF"></fui-icon>
                        </view>
                        <text class="account-btn-text">重置密码</text>
                    </view>
                    <view class="account-btn" @click="rebind">
                        <view class="account-btn-icon" style="background: rgba(255, 138, 43, 0.12);">
                            <fui-icon name="mobile" size="36" color="#FF8A2B"></fui-icon>
                        </view>
                        <text class="account-btn-text">重新绑定</text>
                    </view>
                    <view class="account-btn" @click="prepare_prefer">
                        <view class="account-btn-icon" style="background: rgba(45, 190, 108, 0.12);">
                            <fui-icon name="setup" size="36" color="#2DBE6C"></fui-icon>
                        </view>
                        <text class="account-btn-text">偏好设置</text>
                    </view>
                    <view class="account-btn" @click="show_signature_config">
                        <view class="account-btn-icon" style="background: rgba(123, 97, 255, 0.12);">
                            <fui-icon name="edit" size="36" color="#7B61FF"></fui-icon>
                        </view>
                        <text class="account-btn-text">签名配置</text>
                    </view>
                </view>
            </view>

            <view class="section-shell manage-card">
                <view class="jd-grid">
                    <view class="jd-col">
                        <view class="jd-col-head">
                            <view class="section-bar compact-bar"></view>
                            <view class="section-titles">
                                <text class="jd-col-title">公司业务</text>
                                <text class="jd-col-en">BUSINESS</text>
                            </view>
                        </view>
                        <view class="jd-item" @click="go_page('/subPage1/CompanyAttach')">
                            <view class="jd-item-icon" style="background: rgba(70, 92, 255, 0.12);">
                                <fui-icon name="idcard" size="28" color="#465CFF"></fui-icon>
                            </view>
                            <text class="jd-item-text">公司资质</text>
                            <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                        </view>
                        <module-filter require_module="sale_management">
                            <view class="jd-item" @click="show_checkin_config = true">
                                <view class="jd-item-icon" style="background: rgba(255, 138, 43, 0.12);">
                                    <fui-icon name="location" size="28" color="#FF8A2B"></fui-icon>
                                </view>
                                <text class="jd-item-text">排号设置</text>
                                <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                            </view>
                        </module-filter>
                    </view>

                    <view class="jd-col" v-if="show_group_section">
                        <view class="jd-col-head">
                            <view class="section-bar compact-bar"></view>
                            <view class="section-titles">
                                <text class="jd-col-title">集团管理</text>
                                <text class="jd-col-en">GROUP</text>
                            </view>
                        </view>
                        <view class="jd-item" @click="go_page('/subPage1/GroupMembers')">
                            <view class="jd-item-icon" style="background: rgba(70, 92, 255, 0.12);">
                                <fui-icon name="community" size="28" color="#465CFF"></fui-icon>
                            </view>
                            <text class="jd-item-text">集团成员</text>
                            <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                        </view>
                        <view class="jd-item" @click="go_page('/subPage1/GroupDataPermission')">
                            <view class="jd-item-icon" style="background: rgba(123, 97, 255, 0.12);">
                                <fui-icon name="principal" size="28" color="#7B61FF"></fui-icon>
                            </view>
                            <text class="jd-item-text">数据权限</text>
                            <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                        </view>
                    </view>

                    <view class="jd-col" v-if="show_system_section">
                        <view class="jd-col-head">
                            <view class="section-bar compact-bar"></view>
                            <view class="section-titles">
                                <text class="jd-col-title">系统管理</text>
                                <text class="jd-col-en">SYSTEM</text>
                            </view>
                        </view>
                        <module-filter require_module="rbac">
                            <view class="jd-item" @click="config_role">
                                <view class="jd-item-icon" style="background: rgba(45, 190, 108, 0.12);">
                                    <fui-icon name="my" size="28" color="#2DBE6C"></fui-icon>
                                </view>
                                <text class="jd-item-text">角色配置</text>
                                <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                            </view>
                        </module-filter>
                        <module-filter require_module="global">
                            <view class="jd-item" @click="go_page('/pages/Admin')">
                                <view class="jd-item-icon" style="background: rgba(255, 77, 79, 0.12);">
                                    <fui-icon name="captcha" size="28" color="#FF4D4F"></fui-icon>
                                </view>
                                <text class="jd-item-text">超级管理</text>
                                <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                            </view>
                            <view class="jd-item" @click="go_page('/subPage1/SysNotice')">
                                <view class="jd-item-icon" style="background: rgba(70, 92, 255, 0.12);">
                                    <fui-icon name="notice" size="28" color="#465CFF"></fui-icon>
                                </view>
                                <text class="jd-item-text">系统通知</text>
                                <fui-icon name="arrowright" size="20" color="#D0D5DE"></fui-icon>
                            </view>
                        </module-filter>
                    </view>
                </view>
            </view>

            <module-filter require_module="rbac">
                <view class="section-shell">
                    <view class="section-head">
                        <view class="section-head-left">
                            <view class="section-bar"></view>
                            <view class="section-titles">
                                <text class="section-title">开发选项</text>
                                <text class="section-en">DEVELOPER</text>
                            </view>
                        </view>
                    </view>
                    <view class="menu-list">
                        <view class="menu-item last" @click="go_page('/pages/DevPage')">
                            <view class="menu-icon" style="background: rgba(138, 148, 166, 0.16);">
                                <fui-icon name="classify" size="34" color="#6B7280"></fui-icon>
                            </view>
                            <text class="menu-title">开发选项</text>
                            <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                        </view>
                    </view>
                </view>
            </module-filter>

            <view class="logout-card" @click="unLogin">
                <text class="logout-text">退出登录</text>
            </view>
        </view>

        <fui-modal width="600" :show="show_change_pwd" v-if="show_change_pwd" @click="change_pwd">
            <fui-input label="新密码" borderTop placeholder="请输入新密码" v-model="new_pwd"></fui-input>
        </fui-modal>
        <fui-modal width="600" v-if="show_checkin_config" :show="show_checkin_config" @click="config_checkin">
            <fui-form ref="form" top="100">
                <fui-input label="工厂纬度" borderTop placeholder="请输入纬度" v-model="checkin_config.lat"></fui-input>
                <fui-input label="工厂经度" borderTop placeholder="请输入经度" v-model="checkin_config.lon"></fui-input>
                <fui-input label="排号范围" borderTop placeholder="请输入距离(千米)"
                    v-model="checkin_config.distance_limit"></fui-input>
                <fui-input label="过号间隔" borderTop placeholder="请输入过号间隔(分钟)"
                    v-model="checkin_config.check_in_stay_minutes"></fui-input>
            </fui-form>
        </fui-modal>
        <fui-modal width="600" v-if="show_order_prefer" :show="show_order_prefer" @click="config_order_prefer">
            <view class="prefer-tip">请设置订单页面的默认时间范围</view>
            <fui-form ref="op_form" top="100">
                <fui-input label="前几天？" borderTop placeholder="请输入天数" v-model="prefer_req.begin_offset"></fui-input>
                <fui-input label="后几天？" borderTop placeholder="请输入天数" v-model="prefer_req.end_offset"></fui-input>
            </fui-form>
        </fui-modal>
        <app-tab-bar :selected="4" />
    </view>
</template>

<script>
import ModuleFilter from '../components/ModuleFilter.vue';
import AppTabBar from '../components/AppTabBar.vue';
import { setTabBarSelected } from '@/utils/setTabBarSelected';
export default {
    name: 'Myself',
    components: {
        "module-filter": ModuleFilter,
        "app-tab-bar": AppTabBar,
    },
    data: function () {
        return {
            show_order_prefer: false,
            prefer_req: {
                begin_offset: '',
                end_offset: ''
            },
            show_change_pwd: false,
            new_pwd: '',
            self_info: {
                company: '',
                name: '',
                phone: '',
                modules: []
            },
            show_checkin_config: false,
            checkin_config: {
                lat: '',
                lon: '',
                distance_limit: '',
                check_in_stay_minutes: ''
            },
        };
    },
    computed: {
        avatar_text: function () {
            const name = this.self_info && this.self_info.name ? String(this.self_info.name) : '';
            return name ? name.charAt(0) : '我';
        },
        module_list: function () {
            return (this.self_info && this.self_info.modules) ? this.self_info.modules : [];
        },
        show_group_section: function () {
            return this.$has_module('group') || this.$has_module('global');
        },
        show_system_section: function () {
            return this.$has_module('rbac') || this.$has_module('global');
        },
    },
    methods: {
        go_page: function (url) {
            uni.navigateTo({ url: url });
        },
        prepare_prefer: async function () {
            let self_info = uni.getStorageSync('self_info');
            this.prefer_req.begin_offset = self_info.prefer_order_begin_offset;
            this.prefer_req.end_offset = self_info.prefer_order_end_offset;
            this.show_order_prefer = true;
        },
        config_order_prefer: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'begin_offset',
                    rule: ['required', 'isNumber'],
                    msg: ['请输入天数', '天数请填写数字']
                }, {
                    name: 'end_offset',
                    rule: ['required', 'isNumber'],
                    msg: ['请输入天数', '天数请填写数字']
                }];
                let val_ret = await this.$refs.op_form.validator(this.prefer_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.prefer_req.begin_offset = parseInt(this.prefer_req.begin_offset);
                this.prefer_req.end_offset = parseInt(this.prefer_req.end_offset);
                await this.$send_req('/global/set_order_prefer', this.prefer_req);
                await this.$init_self();
            }
            this.show_order_prefer = false;
        },
        get_checkin_config: async function () {
            if (this.$has_module('sale_management') == false) {
                return;
            }
            let res = await this.$send_req('/sale_management/get_checkin_config');
            this.checkin_config = res;
        },
        config_checkin: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'lat',
                    rule: ['required'],
                    msg: ['请输入纬度']
                }, {
                    name: 'lon',
                    rule: ['required',],
                    msg: ['请输入经度']
                }, {
                    name: 'distance_limit',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入距离', '距离请填写数字']
                }, {
                    name: 'check_in_stay_minutes',
                    rule: ['isAmount'],
                    msg: ['间隔请填写数字']
                }];
                let val_ret = await this.$refs.form.validator(this.checkin_config, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.checkin_config.lat = Number.parseFloat(this.checkin_config.lat);
                this.checkin_config.lon = Number.parseFloat(this.checkin_config.lon);
                this.checkin_config.distance_limit = Number.parseFloat(this.checkin_config.distance_limit);
                this.checkin_config.check_in_stay_minutes = parseInt(this.checkin_config.check_in_stay_minutes);
                await this.$send_req('/sale_management/set_checkin_config', this.checkin_config);
            }
            await this.get_checkin_config();
            this.show_checkin_config = false;
        },
        change_pwd: async function (detail) {
            if (detail.index == 1) {
                let req = {
                    new_password: this.new_pwd
                };
                await this.$send_req('/global/change_password', req);
                uni.showToast({
                    title: '修改成功',
                    icon: 'success'
                });
            }
            this.show_change_pwd = false;
        },
        unLogin: function () {
            uni.removeStorageSync('token');
            uni.reLaunch({
                url: '/subPage1/Login'
            });
        },
        rebind: function () {
            uni.navigateTo({
                url: '/subPage1/Bind'
            });
        },
        show_signature_config: function () {
            uni.navigateTo({
                url: '/subPage1/SignatureConfig'
            });
        },
        config_role: function () {
            uni.navigateTo({
                url: '/subPage1/RoleConfig'
            });
        }
    },
    onShow: function () {
        setTabBarSelected();
        this.self_info = uni.getStorageSync('self_info') || {
            company: '',
            name: '',
            phone: '',
            modules: []
        };
        this.get_checkin_config();
    },
}
</script>

<style scoped>
.myself-page {
    position: relative;
    min-height: 100vh;
    background: linear-gradient(180deg, #2F3FCF 0%, #465CFF 160rpx, #D8E0F6 340rpx, #E9EEF8 520rpx, #F2F4FA 100%);
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
    overflow: hidden;
}

.page-mesh {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 420rpx;
    background:
        radial-gradient(circle at 18% 30%, rgba(255, 255, 255, 0.18) 0%, transparent 28%),
        radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.14) 0%, transparent 26%);
    pointer-events: none;
    z-index: 0;
}

.page-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
}

.page-glow-a {
    top: 280rpx;
    right: -100rpx;
    width: 360rpx;
    height: 360rpx;
    background: radial-gradient(circle, rgba(120, 150, 255, 0.22) 0%, rgba(120, 150, 255, 0) 70%);
}

.page-glow-b {
    top: 680rpx;
    left: -140rpx;
    width: 420rpx;
    height: 420rpx;
    background: radial-gradient(circle, rgba(70, 92, 255, 0.12) 0%, rgba(70, 92, 255, 0) 72%);
}

.myself-hero {
    position: relative;
    z-index: 1;
    padding: 8rpx 0 0;
}

.profile-card {
    position: relative;
    margin: 0 24rpx;
    padding: 36rpx 32rpx 32rpx;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
    border-radius: 32rpx;
    border: 1rpx solid rgba(255, 255, 255, 0.32);
    box-shadow: 0 24rpx 56rpx rgba(24, 36, 110, 0.28);
    overflow: hidden;
}

.hero-logo-bg {
    position: absolute;
    top: 0;
    right: 0;
    width: 58%;
    height: 70%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
    border-radius: 0 32rpx 0 0;
}

.hero-logo-img {
    width: 240rpx;
    height: 240rpx;
    opacity: 0.34;
    /* 右上角溢出裁剪，约露出四分之三 */
    transform: translate(28%, -22%);
}

.hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28rpx;
}

.hero-greeting {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.82);
    letter-spacing: 4rpx;
    font-weight: 500;
}

.profile-row {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.avatar-wrap {
    padding: 8rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    border: 1rpx solid rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
}

.profile-info {
    flex: 1;
    overflow: hidden;
    margin-left: 22rpx;
}

.profile-name {
    display: block;
    font-size: 40rpx;
    color: #FFFFFF;
    font-weight: 700;
    letter-spacing: 1rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 8rpx 24rpx rgba(20, 30, 90, 0.25);
}

.profile-company,
.profile-phone {
    display: block;
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.78);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.profile-modules {
    position: relative;
    z-index: 1;
    margin-top: 28rpx;
    padding: 20rpx 20rpx 8rpx;
    border-radius: 22rpx;
    background: rgba(255, 255, 255, 0.94);
    border: 1rpx solid rgba(255, 255, 255, 0.7);
}

.profile-modules-head {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    margin-bottom: 12rpx;
    padding: 0 4rpx;
}

.profile-modules-title {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 700;
    margin-right: 12rpx;
}

.profile-modules-en {
    font-size: 16rpx;
    color: #9AA3B8;
    letter-spacing: 2rpx;
}

.content-stack {
    position: relative;
    z-index: 2;
    margin-top: 28rpx;
    padding: 0 24rpx;
}

.section-shell {
    margin-bottom: 24rpx;
    background: rgba(255, 255, 255, 0.96);
    border-radius: 28rpx;
    box-shadow: 0 18rpx 48rpx rgba(40, 58, 120, 0.12);
    border: 1rpx solid rgba(255, 255, 255, 0.9);
    overflow: hidden;
}

.section-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 28rpx 8rpx;
    background: linear-gradient(180deg, #F3F5FF 0%, #FFFFFF 100%);
}

.section-head.compact {
    padding-bottom: 4rpx;
}

.section-head-left {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.section-bar {
    width: 8rpx;
    height: 36rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 16rpx;
}

.section-titles {
    display: flex;
    flex-direction: column;
}

.section-title {
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.2;
}

.section-en {
    margin-top: 4rpx;
    font-size: 18rpx;
    color: #9AA3B8;
    letter-spacing: 2rpx;
}

.module-chips {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0;
}

.module-chip {
    margin: 0 12rpx 12rpx 0;
    padding: 8rpx 16rpx;
    border-radius: 28rpx;
    background: #EEF1FF;
    border: 1rpx solid #E0E6FF;
}

.module-chip-text {
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 500;
}

.account-grid {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 8rpx 12rpx 28rpx;
}

.account-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 12rpx 4rpx 4rpx;
}

.account-btn-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 22rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
}

.account-btn-text {
    font-size: 22rpx;
    color: #1A1F36;
    font-weight: 500;
    text-align: center;
    line-height: 1.3;
}

.manage-card {
    padding: 8rpx 0 4rpx;
}

.jd-grid {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    min-height: 320rpx;
}

.jd-col {
    flex: 1;
    min-width: 0;
    padding: 20rpx 16rpx 16rpx;
    border-right: 1rpx solid #F0F2F6;
    box-sizing: border-box;
}

.jd-col:last-child {
    border-right: none;
}

.jd-col-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 16rpx;
}

.compact-bar {
    height: 32rpx;
    margin-right: 10rpx;
}

.jd-col-title {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.2;
}

.jd-col-en {
    margin-top: 2rpx;
    font-size: 16rpx;
    color: #9AA3B8;
    letter-spacing: 1rpx;
}

.jd-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 14rpx 0;
}

.jd-item-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 10rpx;
}

.jd-item-text {
    flex: 1;
    min-width: 0;
    font-size: 22rpx;
    color: #2D3748;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-list {
    padding: 8rpx 12rpx 16rpx;
}

.menu-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 22rpx 16rpx;
    border-bottom: 1rpx solid #F0F2F6;
}

.menu-item.last {
    border-bottom: none;
}

.menu-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 20rpx;
}

.menu-title {
    flex: 1;
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 500;
}

.logout-card {
    margin-bottom: 24rpx;
    padding: 30rpx 0;
    background: rgba(255, 255, 255, 0.96);
    border-radius: 28rpx;
    box-shadow: 0 18rpx 48rpx rgba(40, 58, 120, 0.12);
    border: 1rpx solid rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
}

.logout-text {
    font-size: 30rpx;
    color: #FF4D4F;
    font-weight: 600;
    letter-spacing: 2rpx;
}

.prefer-tip {
    display: flex;
    justify-content: center;
    padding: 12rpx 0 8rpx;
    font-size: 26rpx;
    color: #4A5568;
}
</style>

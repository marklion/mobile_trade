<template>
<view class="main-warp">
    <view style="padding: 15px 0;background-color: white;">
        <fui-row isFlex justify="end" align="top">
            <fui-col :span="6" :pushLeft="1">
                <fui-avatar shape="square" :text="self_info.name.charAt(0)" background="#465CFF">
                    <!-- <fui-icon name="my"></fui-icon> -->
                </fui-avatar>
            </fui-col>
            <fui-col>
                <fui-row isFlex>
                    <fui-col>
                        <fui-text :text="self_info.name" :size="45" :fontWeight="500"></fui-text>
                    </fui-col>
                </fui-row>
                <fui-row isFlex justify="space-around">
                    <fui-col>
                        <fui-text :text="self_info.company" :size="32"></fui-text>
                    </fui-col>
                    <fui-col :pushLeft="3">
                        <fui-text :text="self_info.phone"></fui-text>
                    </fui-col>
                </fui-row>
            </fui-col>
        </fui-row>
    </view>

    <fui-card full :headerLine="false" color="black">
        <view slot="default" style="padding: 15rpx 20rpx">
            <fui-tag marginLeft="8" margin-top="10" v-for="(item, index) in self_info.modules" :key="index" theme="plain" :text="item.description"></fui-tag>
        </view>
    </fui-card>
    <fui-list style="background-color: white;">
        <fui-list-cell arrow @click="show_change_pwd = true">
            重置密码
        </fui-list-cell>
        <fui-list-cell arrow @click="rebind">
            重新绑定信息
        </fui-list-cell>
        <u-cell title="公司资质" isLink url="/subPage1/CompanyAttach"></u-cell>
        <module-filter require_module="rbac">
            <fui-list-cell arrow @click="config_role">
                角色配置
            </fui-list-cell>
        </module-filter>
        <module-filter require_module="global">
            <u-cell title="超级管理员" isLink url="/pages/Admin"></u-cell>
            <u-cell title="系统通知" isLink url="/subPage1/SysNotice"></u-cell>
        </module-filter>
        <module-filter require_module="sale_management">
            <fui-list-cell arrow @click="show_checkin_config = true">
                司机排号设置
            </fui-list-cell>
        </module-filter>
        <fui-list-cell arrow @click="prepare_prefer">
            偏好设置
        </fui-list-cell>

        <module-filter require_module="rbac">
            <u-cell title="开发选项" isLink url="/pages/DevPage"></u-cell>
        </module-filter>
        <fui-list-cell arrow @click="show_signature_config">
            签名配置
        </fui-list-cell>
    </fui-list>
    <fui-white-space></fui-white-space>
    <fui-button type="danger" text="退出登录" @click="unLogin"></fui-button>
    <fui-modal width="600" :show="show_change_pwd" v-if="show_change_pwd" @click="change_pwd">
        <fui-input label="新密码" borderTop placeholder="请输入新密码" v-model="new_pwd"></fui-input>
    </fui-modal>
    <fui-modal width="600" v-if="show_checkin_config" :show="show_checkin_config" @click="config_checkin">
        <fui-form ref="form" top="100">
            <fui-input label="工厂纬度" borderTop placeholder="请输入纬度" v-model="checkin_config.lat"></fui-input>
            <fui-input label="工厂经度" borderTop placeholder="请输入经度" v-model="checkin_config.lon"></fui-input>
            <fui-input label="排号范围" borderTop placeholder="请输入距离(千米)" v-model="checkin_config.distance_limit"></fui-input>
            <fui-input label="过号间隔" borderTop placeholder="请输入过号间隔(分钟)" v-model="checkin_config.check_in_stay_minutes"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" v-if="show_order_prefer" :show="show_order_prefer" @click="config_order_prefer">
        <view style="display:flex; justify-content: center;">
            请设置订单页面的默认时间范围
        </view>
        <fui-form ref="op_form" top="100">
            <fui-input label="前几天？" borderTop placeholder="请输入天数" v-model="prefer_req.begin_offset"></fui-input>
            <fui-input label="后几天？" borderTop placeholder="请输入天数" v-model="prefer_req.end_offset"></fui-input>
        </fui-form>
    </fui-modal>
</view>
</template>

<script>
import ModuleFilter from '../components/ModuleFilter.vue';
export default {
    name: 'Myself',
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
                phone: ''
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
    components: {
        "module-filter": ModuleFilter
    },
    methods: {
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
                    rule: ['required', ],
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
                this.checkin_config.lat = parseFloat(this.checkin_config.lat);
                this.checkin_config.lon = parseFloat(this.checkin_config.lon);
                this.checkin_config.distance_limit = parseFloat(this.checkin_config.distance_limit);
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
        this.self_info = uni.getStorageSync('self_info');
        this.get_checkin_config();
    },
}
</script>

<style scoped>
.main-warp {
    background-color: #F1F4FA;
}
</style>

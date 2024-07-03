<template>
<view>
    <fui-card showBorder :title="self_info.name" :headerLine="false" background="#5cdbd5" headerBackground="#5cdbd5" size="50" :tag="self_info.phone" color="black" tagColor="blue">
        <view slot="footer">
            <view>
                {{self_info.company}}
            </view>
            <fui-tag v-for="(item, index) in self_info.modules" :key="index" theme="plain" :text="item.description"></fui-tag>
        </view>
    </fui-card>
    <fui-list>
        <fui-list-cell arrow @click="show_change_pwd = true">
            重置密码
        </fui-list-cell>
        <fui-list-cell arrow @click="rebind">
            重新绑定信息
        </fui-list-cell>
        <module-filter require_module="rbac">
            <fui-list-cell arrow @click="config_role">
                角色配置
            </fui-list-cell>
        </module-filter>
        <module-filter require_module="global">
            <u-cell title="超级管理员" isLink url="/pages/Admin"></u-cell>
        </module-filter>
        <module-filter require_module="sale_management">
            <fui-list-cell arrow @click="show_checkin_config = true">
                司机排号设置
            </fui-list-cell>
        </module-filter>

        <module-filter require_module="rbac">
            <u-cell title="开发选项" isLink url="/pages/DevPage"></u-cell>
        </module-filter>
    </fui-list>
    <fui-button type="danger" text="退出登录" @click="unLogin"></fui-button>
    <fui-modal width="600" :show="show_change_pwd" v-if="show_change_pwd" @click="change_pwd">
        <fui-input label="新密码" borderTop placeholder="请输入新密码" v-model="new_pwd"></fui-input>
    </fui-modal>
    <fui-modal width="600" v-if="show_checkin_config" :show="show_checkin_config" @click="config_checkin">
        <fui-form ref="form" top="100">
            <fui-input label="工厂纬度" borderTop placeholder="请输入纬度" v-model="checkin_config.lat"></fui-input>
            <fui-input label="工厂经度" borderTop placeholder="请输入经度" v-model="checkin_config.lon"></fui-input>
            <fui-input label="排号范围" borderTop placeholder="请输入距离(千米)" v-model="checkin_config.distance_limit"></fui-input>
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
                distance_limit: ''
            },
        };
    },
    components: {
        "module-filter": ModuleFilter
    },
    methods: {
        config_order_prefer: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'being_offset',
                    rule: ['required', 'isNumber'],
                    msg: ['请输入纬度']
                }, {
                    name: 'lon',
                    rule: ['required', ],
                    msg: ['请输入经度']
                }, {
                    name: 'distance_limit',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入距离', '距离请填写数字']
                }];
                let val_ret = await this.$refs.form.validator(this.checkin_config, rules);
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
                }];
                let val_ret = await this.$refs.form.validator(this.checkin_config, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.checkin_config.lat = parseFloat(this.checkin_config.lat);
                this.checkin_config.lon = parseFloat(this.checkin_config.lon);
                this.checkin_config.distance_limit = parseFloat(this.checkin_config.distance_limit);
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
                url: '/pages/Login'
            });
        },
        rebind: function () {
            uni.navigateTo({
                url: '/pages/Bind'
            });
        },
        config_role: function () {
            uni.navigateTo({
                url: '/pages/RoleConfig'
            });
        }
    },
    onShow: function () {
        this.self_info = uni.getStorageSync('self_info');
        this.get_checkin_config();
    },
}
</script>

<style>

</style>

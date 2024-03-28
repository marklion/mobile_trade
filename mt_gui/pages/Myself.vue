<template>
<view>
    <fui-card showBorder :title="self_info.name" :headerLine="false" background="#5cdbd5" headerBackground="#5cdbd5" size="50" :tag="self_info.phone" color="black" tagColor="blue">
        <view slot="footer">
            {{self_info.company}}
        </view>
    </fui-card>
    <fui-list>
        <fui-list-cell arrow @click="show_change_pwd = true">
            重置密码
        </fui-list-cell>
        <fui-list-cell arrow @click="rebind">
            重新绑定信息
        </fui-list-cell>
    </fui-list>
    <fui-button type="danger" text="退出登录" @click="unLogin"></fui-button>
    <fui-modal width="600" :show="show_change_pwd" @click="change_pwd">
        <fui-input label="新密码" borderTop placeholder="请输入新密码" v-model="new_pwd"></fui-input>
    </fui-modal>
</view>
</template>

<script>
export default {
    name: 'Myself',
    data: function () {
        return {
            show_change_pwd: false,
            new_pwd: '',
            self_info: {
                company: '',
                name: '',
                phone: ''
            },
        };
    },
    methods: {
        change_pwd: async function () {
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
    },
    onShow: function () {
        this.self_info = uni.getStorageSync('self_info');
    },
}
</script>

<style>

</style>

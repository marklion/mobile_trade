<template>
<view>
    <fui-grid>
        <fui-grid-item v-for="(item,index) in show_apps" :key="index">
            <view style="display:flex;flex-direction: column; align-items: center; justify-content: center;">
                <fui-icon size="190" :name="item.icon" @click="go_to_page(item.path)"></fui-icon>
                <text>{{item.name}}</text>
            </view>
        </fui-grid-item>
    </fui-grid>
</view>
</template>

<script>
export default {
    name: 'AppPanel',
    data: function () {
        return {
            show_apps: [],
            all_apps: [{
                    name: '物料管理',
                    icon: 'list',
                    path: 'Stuff',
                    require_module: 'stuff'
                }, {
                    name: '竞价管理',
                    icon: 'bankcard',
                    require_module: 'bid',
                    path: 'BiddingConfig'
                }, {
                    name: '竞价参与',
                    icon: 'bankcard',
                    require_module: 'customer',
                    path: 'BiddingJoin'
                }, {
                    name: '现场管理',
                    icon: 'transport',
                    require_module: 'scale',
                    path: 'Field',
                }, {
                    name: '合同管理',
                    icon: 'pullup',
                    require_module: undefined,
                    path: 'Contract'
                },
                {
                    name: '安检配置',
                    icon: 'keyboard',
                    require_module: 'sc',
                    path: 'ScConfig'
                },
                {
                    name: '车队配置',
                    icon: 'menu',
                    require_module: undefined,
                    path: 'VehicleTeam'
                },
            ]
        }
    },
    methods: {
        init_pages: function () {
            this.show_apps = [];
            this.all_apps.forEach(item => {
                if (!item.require_module || this.$has_module(item.require_module)) {
                    this.show_apps.push(item);
                }
            });
        },
        go_to_page: function (_path) {
            uni.navigateTo({
                url: '/pages/' + _path
            });
        },
    },
    onShow() {
        this.init_pages();
    },
}
</script>

<style>

</style>

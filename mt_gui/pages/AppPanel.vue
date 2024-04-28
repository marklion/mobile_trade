<template>
<view>
    <fui-grid>
        <fui-grid-item v-for="(item,index) in apps" :key="index">
            <module-filter :require_module="item.require_module">
                <view style="display:flex;flex-direction: column; align-items: center; justify-content: center;">
                    <fui-icon size="190" :name="item.icon" @click="go_to_page(item.path)"></fui-icon>
                    <text>{{item.name}}</text>
                </view>
                <view style="display:flex;flex-direction: column; align-items: center; justify-content: center;" slot="instead">
                    <fui-icon size="190" :name="item.icon"></fui-icon>
                    <text>{{item.name + '(无权限)'}}</text>
                </view>
            </module-filter>
        </fui-grid-item>
    </fui-grid>
</view>
</template>

<script>
import ModuleFilter from '../components/ModuleFilter.vue';
export default {
    name: 'AppPanel',
    components: {
        "module-filter": ModuleFilter
    },
    data: function () {
        return {
            apps: [{
                    name: '物料管理',
                    icon: 'list',
                    path: 'Stuff',
                    require_module: 'stuff'
                }, {
                    name: '竞价管理',
                    icon: 'bankcard',
                    require_module: 'bid',
                }, {
                    name: '现场管理',
                    icon: 'transport',
                    require_module: 'scale',
                    path: 'Field',
                }, {
                    name: '销售合同',
                    icon: 'pullup',
                    require_module: 'stuff',
                    path: 'Contract'
                }, {
                    name: '采购合同',
                    icon: 'pulldown',
                    require_module: 'customer',
                    path: 'BuyContract'
                },
                {
                    name: '安检配置',
                    icon: 'keyboard',
                    require_module: 'sc',
                    path: 'ScConfig'
                },
                {
                    name: '司机',
                    icon: 'keyboard',
                    require_module: 'sc',
                    path: 'Driver'
                },
            ]
        }
    },
    methods: {
        go_to_page: function (_path) {
            uni.navigateTo({
                url: '/pages/' + _path
            });
        },
    },
}
</script>

<style>

</style>

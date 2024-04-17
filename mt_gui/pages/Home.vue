<template>
<view>
    <fui-white-space size="large"></fui-white-space>
    <fui-section :title="self_info.company" size="50" isLine></fui-section>
    <fui-divider></fui-divider>
    <module-filter require_module="customer">
        <list-show :fetch_function="get_stuff2buy" height="50vh">
            <view slot-scope="{item}">
                <u-cell :title="item.name + '-' + item.company.name" :label="item.comment" :value="item.price==-1?'未关注':item.price">
                    <fui-button v-if="item.price != -1" slot="right-icon" btnSize="mini" text="下单" @click="start_plan_creation(item)"></fui-button>
                </u-cell>
            </view>
        </list-show>
    </module-filter>

</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import ModuleFilter from '../components/ModuleFilter.vue';
export default {
    name: 'Home',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilter,
    },
    data() {
        return {
            self_info: {
                company: '',
            },
        }
    },
    methods: {
        start_plan_creation: function (item) {
            uni.navigateTo({
                url: '/pages/OrderCreate?stuff_id=' + item.id + '&stuff_name=' + item.name + '&company_name=' + item.company.name,
            });
        },
        get_stuff2buy: async function (pageNo) {
            let res = await this.$send_req('/stuff/get_stuff_on_sale', {
                pageNo: pageNo,
            });
            return res.stuff;
        },
    },
    onLoad: function () {
        this.self_info = uni.getStorageSync('self_info');
    },
}
</script>

<style scoped>

</style>

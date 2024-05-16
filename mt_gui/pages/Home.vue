<template>
<view>
    <fui-white-space size="large"></fui-white-space>
    <fui-section :title="self_info.company" size="50" isLine></fui-section>
    <fui-divider></fui-divider>
    <view class="brief_section">
        <fui-section title="采购概况"></fui-section>
        <fui-notice-bar scrollable activeMode="forwards" speed="60" :content="buy_brief" ></fui-notice-bar>
        <module-filter require_module="customer">
            <list-show :fetch_function="get_stuff2buy" height="40vh" v-model="stuff2buy">
                <view>
                    <u-cell v-for="(item, index) in stuff2buy" :key="index" :title="item.name + '-' + item.company.name" :label="item.comment" :value="item.price==-1?'未关注':item.price">
                        <view slot="right-icon">
                            <fui-button v-if="item.price != -1" btnSize="mini" text="下单" @click="start_plan_creation(item)"></fui-button>
                        </view>
                    </u-cell>
                </view>
            </list-show>
        </module-filter>
    </view>

</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
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
            stuff2buy: [],
            buy_brief: "",
        }
    },
    methods: {
        start_plan_creation: function (item) {
            uni.navigateTo({
                url: '/pages/OrderCreate?stuff_id=' + item.id + '&stuff_name=' + item.name + '&company_name=' + item.company.name,
            });
        },
        get_stuff2buy: async function (pageNo) {
            let res = await this.$send_req('/customer/get_stuff_on_sale', {
                pageNo: pageNo,
            });
            return res.stuff;
        },
        init_buy_brief: async function () {
            let cond = function (day_offset, status) {
                let date = new Date();
                date.setDate(date.getDate() + day_offset);
                return {
                    start_time: utils.dateFormatter(date, 'y-m-d', 4, false),
                    end_time: utils.dateFormatter(date, 'y-m-d', 4, false),
                    status: status,
                    hide_manual_close: true,
                };
            };
            let today_unfinish_count =
                (await this.$send_req('/customer/order_buy_search', cond(0, 1))).total +
                (await this.$send_req('/customer/order_buy_search', cond(0, 2))).total;
            let today_finished_count =
                (await this.$send_req('/customer/order_buy_search', cond(0, 3))).total;
            let yst_count = (await this.$send_req('/customer/order_buy_search', cond(-1, 3))).total;
            let tmr_count =
                (await this.$send_req('/customer/order_buy_search', cond(1, 1))).total +
                (await this.$send_req('/customer/order_buy_search', cond(1, 2))).total;
            this.buy_brief =
                `今日一共${today_finished_count + today_unfinish_count}车,完成${today_finished_count}车,未完成${today_unfinish_count}车;昨日共完成${yst_count}车,明日还有${tmr_count}车`
        },
        init_brief_info: async function () {
            this.self_info = uni.getStorageSync('self_info');
            await this.init_buy_brief();
        },
    },
    onPullDownRefresh: async function () {
        await this.init_brief_info();
        uni.stopPullDownRefresh();
    },
    onLoad: async function () {
        await this.init_brief_info()
    },
}
</script>

<style scoped>
.brief_section {
    border: 3px dashed #45d5bd;
    border-radius: 10px;
    /* 添加圆角 */
    margin-bottom: 20px;
}
</style>

<template>
<view>
    <fui-segmented-control v-if="seg_show" :values="seg" @click="change_seg"></fui-segmented-control>
    <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
    <module-filter require_module="stuff">
        <fui-tag theme="plain" type="purple">
            {{stuff_filter.name}}
            <fui-icon v-if="!stuff_filter.id" name="arrowright" size="32" @click="show_stuff_list= true"></fui-icon>
            <fui-icon v-else name="close" size="32" @click="reset_stuff_filter"></fui-icon>
        </fui-tag>
        <fui-tag theme="plain" type="success">
            {{company_filter.name}}
            <fui-icon v-if="!company_filter.id" name="arrowright" size="32" @click="show_company_filter= true"></fui-icon>
            <fui-icon v-else name="close" size="32" @click="reset_company_filter"></fui-icon>
        </fui-tag>
    </module-filter>
    <u-cell title="计划时间" :value="begin_time + '~' + end_time">
        <fui-button slot="right-icon" text="选择日期" @click="show_plan_date = true" btnSize="mini" type="warning"></fui-button>
    </u-cell>
    <fui-date-picker range :show="show_plan_date" type="3" :value="begin_time" :valueEnd="end_time" @change="choose_date" @cancel="show_plan_date = false"></fui-date-picker>

    <module-filter v-if="seg_index == 0" require_module="plan">
        <list-show ref="sold_plans" :fetch_function="get_sold_plans" height="80vh" search_key="search_cond">
            <view slot-scope="{item}">
                <u-cell :title="item.company.name + '-' + item.stuff.name" :label="item.main_vehicle.plate + ' ' + item.behind_vehicle.plate">
                    <view slot="value" style="display:flex; flex-direction: column;">
                        <fui-tag theme="plain" :text="'计划:' + item.plan_time" :scaleRatio="0.8" type="danger"></fui-tag>
                        <fui-tag v-if="item.m_time" theme="plain" :text="'发车:' + item.m_time" :scaleRatio="0.8" type="primary"></fui-tag>
                    </view>
                </u-cell>
            </view>
        </list-show>
    </module-filter>
    <module-filter v-if="seg_index == 1" require_module="customer">
        <list-show ref="buy_plans" :fetch_function="get_buy_plans" height="80vh" search_key="search_cond">
            <view slot-scope="{item}">
                <u-cell :title="item.stuff.company.name + '-' + item.stuff.name" :label="item.main_vehicle.plate + ' ' + item.behind_vehicle.plate">
                    <view slot="value" style="display:flex; flex-direction: column;">
                        <fui-tag theme="plain" :text="'计划:' + item.plan_time" :scaleRatio="0.8" type="danger"></fui-tag>
                        <fui-tag v-if="item.m_time" theme="plain" :text="'发车:' + item.m_time" :scaleRatio="0.8" type="primary"></fui-tag>
                    </view>
                </u-cell>
            </view>
        </list-show>
    </module-filter>
    <module-filter require_module="stuff">
        <fui-bottom-popup :show="show_stuff_list" @close="show_stuff_list = false">
            <fui-list>
                <list-show :fetch_function="get_stuff" search_key="name" height="40vh">
                    <fui-list-cell arrow slot-scope="{item}" @click="choose_stuff(item)">
                        {{item.name}}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
        <fui-bottom-popup :show="show_company_filter" @close="show_company_filter= false">
            <fui-list>
                <list-show :fetch_function="get_customers" search_key="search_cond" height="40vh">
                    <fui-list-cell arrow slot-scope="{item}" @click="choose_company(item)">
                        {{item.buy_company.name}}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
    </module-filter>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import ModuleFilterVue from '../components/ModuleFilter.vue';
export default {
    name: 'OrderList',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilterVue,
    },
    data: function () {
        return {
            seg: ['销售', '采购'],
            seg_index: -1,
            seg_show: false,
            company_filter: {
                name: '全部公司',
                id: undefined,
            },
            stuff_filter: {
                name: '全部物料',
                id: undefined,
            },
            show_stuff_list: false,
            show_company_filter: false,
            show_plan_date: false,
            focus_status: undefined,
            begin_time: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            end_time: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            tabs: [{
                name: "全部",
            }, {
                name: "未确认",
                badge: 0,
            }, {
                name: "未付款",
                badge: 0,
            }, {
                name: "未发车",
                badge: 0,
            }, {
                name: "已关闭",
            }]
        }
    },
    computed: {
        plan_filter: function () {
            return {
                start_time: this.begin_time,
                end_time: this.end_time,
                status: this.focus_status,
                stuff_id: this.stuff_filter.id,
                company_id: this.company_filter.id,
            }
        },
    },
    methods: {
        change_seg: function (e) {
            this.seg_index = e.index;
            this.$nextTick(() => {
                this.refresh_plans();
            });
        },
        reset_company_filter: function () {
            this.company_filter = {
                name: '全部公司',
                id: undefined,
            }
            this.refresh_plans();
        },
        reset_stuff_filter: function () {
            this.stuff_filter = {
                name: '全部物料',
                id: undefined,
            }
            this.refresh_plans();
        },
        refresh_plans: function () {
            if (this.seg_index == 0) {
                this.$refs.sold_plans.refresh();
            } else if (this.seg_index == 1) {
                this.$refs.buy_plans.refresh();
            }
            this.init_number_of_sold_plan();
        },
        choose_company: function (item) {
            this.company_filter = {
                name: item.buy_company.name,
                id: item.buy_company.id,
            }
            this.show_company_filter = false;
            this.refresh_plans();
        },
        choose_stuff: function (item) {
            this.stuff_filter = {
                name: item.name,
                id: item.id,
            }
            this.show_stuff_list = false;
            this.refresh_plans();
        },
        choose_date: function (e) {
            this.show_plan_date = false;
            this.begin_time = e.startDate.result;
            this.end_time = e.endDate.result;
            this.refresh_plans();
        },
        change_tab: function (e) {
            let index = e.index
            if (index > 0) {
                this.focus_status = index - 1;
            } else {
                this.focus_status = undefined;
            }
            this.refresh_plans();
        },
        get_buy_plans: async function (pageNo) {
            let res = await this.$send_req('/plan/get_bought_plans', {
                ...this.plan_filter,
                pageNo: pageNo,
            });
            let ret = [];
            res.plans.forEach(element => {
                element.search_cond = element.main_vehicle.plate + element.behind_vehicle.plate;
                ret.push(element)
            });
            return ret;
        },
        get_sold_plans: async function (pageNo) {
            let res = await this.$send_req('/plan/get_sold_plans', {
                ...this.plan_filter,
                pageNo: pageNo,
            });
            let ret = [];
            res.plans.forEach(element => {
                element.search_cond = element.main_vehicle.plate + element.behind_vehicle.plate;
                ret.push(element)
            });
            return ret;
        },
        init_number_of_sold_plan: async function () {
            let url = '';
            if (this.seg_index == 1) {
                url = '/plan/get_bought_plans';
            } else if (this.seg_index == 0) {
                url = '/plan/get_sold_plans';
            }
            if (url) {
                for (let i = 0; i < 3; i++) {
                    let res = await this.$send_req(url, {
                        ...this.plan_filter,
                        status: i
                    });
                    this.tabs[i + 1].badge = res.total;
                }
            }
        },
        get_stuff: async function (pageNo) {
            let ret = await this.$send_req('/stuff/get_all', {
                pageNo: pageNo
            });
            return ret.stuff;
        },
        get_customers: async function (pageNo) {
            let ret = await this.$send_req('/contract/get_all_sale', {
                pageNo: pageNo
            });
            ret.contracts.forEach(item => {
                item.search_cond = item.buy_company.name + item.stuff.map(ele => ele.name).join('') + item.rbac_users.map(ele => ele.name + ele.phone).join('');
            });
            return ret.contracts;
        },
    },
    onPullDownRefresh() {
        this.refresh_plans();
        uni.stopPullDownRefresh();
    },
    onShow() {
        this.init_number_of_sold_plan();
        let mods = uni.getStorageSync('self_info').modules;
        let modules = [];
        mods.forEach(element => {
            modules.push(element.name);
        });
        if (modules.indexOf('customer') != -1 && modules.indexOf('plan') != -1) {
            this.seg_show = true;
            this.seg_index = 0;
        } else {
            if (modules.indexOf('plan') != -1) {
                this.seg_index = 0;
            } else {
                this.seg_index = 1;
            }
        }
    },
}
</script>

<style>

</style>

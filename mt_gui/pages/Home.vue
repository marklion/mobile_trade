<template>
<view class="main-warp">
    <fui-row style="background-color: white;padding: 20rpx 0rpx;" isFlex justify="start">
        <fui-col :span="6" v-if="self_info.company_logo">
            <fui-avatar size="large" shape="square" :src="$convert_attach_url(self_info.company_logo)"></fui-avatar>
        </fui-col>
        <fui-col>
            <fui-section :title="self_info.company" isLine size="50" fontWeight="500"></fui-section>
        </fui-col>
    </fui-row>
    <fui-divider style="background-color: white;"></fui-divider>
    <fui-card title="数据统计" full color="black" size="35">
        <view style="display: flex;flex-wrap: wrap;">
            <view :class="charts.length>1?'charts-box':'charts-box-full'" v-for="(single_cts, index) in charts" :key="index">
                <qiun-data-charts v-if="single_cts.chartData.series[0].data.reduce((a, b) => a + b, 0)>0" type="column" :chartData="single_cts.chartData" :opts="single_cts.opts"></qiun-data-charts>
                <view v-else style="height: 300px; display: flex; justify-content: center;align-items: center; font-size: 13px;font-weight: 500;color:#DDD;">无数据</view>
                <view style="display: flex; justify-content: center;font-size: 13px;font-weight: 500;">{{single_cts.opts.title}}</view>
            </view>
        </view>
        <module-filter style="margin-top: 20px;" require_module="sale_management">
            <u-row>
                <u-col span="10">
                    <u-radio-group v-model="day_offset" placement="row" @change="init_statistic">
                        <u-radio label="昨天" :name="-1"></u-radio>
                        <u-radio label="今天" :name="0"></u-radio>
                        <u-radio label="明天" :name="1"></u-radio>
                    </u-radio-group>
                </u-col>
                <u-col v-if="tableData.length > 7" span="2">
                    <fui-text type="primary" :text="expand_text" decoration="underline" @click="handle_expand"></fui-text>
                </u-col>
            </u-row>
            <fui-table :height="table_height" fixed stripe :itemList="tableData" :header="headerData"></fui-table>
        </module-filter>
    </fui-card>
    <fui-white-space size="default"></fui-white-space>
    <module-filter require_module="customer">
        <fui-card title="采购提单" full color="black" size="35">
            <list-show ref="sb_list" :fetch_function="get_stuff2buy" height="40vh" v-model="stuff2buy">
                <view v-for="item in stuff2buy" :key="item.id">
                    <u-cell :title="item.name + '-' + item.company.name" :label="item.comment" :value="item.price == -1 ? '未关注' : item.price">
                        <view slot="right-icon">
                            <fui-button btnSize="mini" text="下单" @click="start_plan_creation(item)"></fui-button>
                        </view>
                    </u-cell>
                </view>
            </list-show>
        </fui-card>
    </module-filter>
    <fui-white-space size="default"></fui-white-space>
    <module-filter require_module="supplier">
        <fui-card title="销售提单" full color="black" size="35">
            <list-show ref="ss_list" :fetch_function="get_stuff2sale" height="40vh" v-model="stuff2sale">
                <view>
                    <u-cell v-for="(item, index) in stuff2sale" :key="index" :title="item.name + '-' + item.company.name" :label="item.comment">
                        <view slot="right-icon">
                            <fui-button v-if="item.price != -1" btnSize="mini" text="下单" @click="start_plan_creation(item, true)"></fui-button>
                        </view>
                    </u-cell>
                </view>
            </list-show>
        </fui-card>
    </module-filter>
    <fui-white-space size="default"></fui-white-space>
    <module-filter require_module="stuff">
        <fui-card title="通知管理" full color="black" size="35">
            <fui-textarea flexStart isCounter label="下单通知" maxlength="2000" placeholder="请输入内容" v-model="notice.notice"></fui-textarea>
            <fui-textarea flexStart isCounter label="司机通知" maxlength="2000" placeholder="请输入内容" v-model="notice.driver_notice"></fui-textarea>
            <fui-button type="primary" text="保存" @click="save_notice"></fui-button>
        </fui-card>

    </module-filter>

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
                company_logo: '',
            },
            stuff2buy: [],
            stuff2sale: [],
            charts: [],
            notice: {
                notice: '',
                driver_notice: '',
            },
            tableData: [],
            headerData: [{
                prop: 'company_name',
                label: '客户',
                width: '400'
            }, {
                prop: 'confirm_count',
                label: '总车数',
                width: '160'
            }, {
                prop: 'finish_count',
                label: '完成数',
                width: '160'
            }],
            day_offset: 0,
            expand_text: '展开',
            table_height: 700,
            tmp_tableData: [],
            dataCount: 7
        }
    },
    methods: {
        handle_expand() {
            if (this.expand_text == "展开") {
                this.expand_text = "收缩"
                this.table_height = 0
            } else {
                this.expand_text = "展开"
                this.table_height = 700
            }
        },
        init_statistic: async function () {
            if (this.$has_module('sale_management') == false) {
                return
            }
            let resp = await this.$send_req('/sale_management/get_count_by_customer', {
                day_offset: this.day_offset,
            });
            this.tableData = [];
            for (let index = 0; index < resp.statistic.length; index++) {
                const element = resp.statistic[index];
                this.tableData.push({
                    company_name: element.company.name,
                    confirm_count: element.confirm_count,
                    finish_count: element.finish_count,
                })
            }
        },
        save_notice: async function () {
            await this.$send_req('/stuff/set_notice', this.notice);
            uni.startPullDownRefresh();
        },
        chart_opt: function (title, subtitle) {
            return {
                timing: "easeOut",
                duration: 1000,
                rotate: false,
                rotateLock: false,
                fontSize: 13,
                fontColor: "#666666",
                dataLabel: true,
                dataPointShape: true,
                dataPointShapeType: "solid",
                touchMoveLimit: 60,
                title: `${title} (${subtitle})`,
                legend: {
                    show: false
                },
                yAxis: {
                    disabled: true,
                    disableGrid: true,
                },
                xAxis: {
                    disableGrid: true,
                },
                extra: {
                    column: {
                        type: "meter",
                        width: 30,
                        activeBgColor: "#000000",
                        activeBgOpacity: 0.08,
                        meterBorder: 2,
                        meterFillColor: "#FFFFFF"
                    },
                    tooltip: {
                        showBox: true,
                        showArrow: true,
                        showCategory: false,
                        borderWidth: 0,
                        borderRadius: 0,
                        borderColor: "#000000",
                        borderOpacity: 0.7,
                        bgColor: "#000000",
                        bgOpacity: 0.7,
                        gridType: "solid",
                        dashLength: 4,
                        gridColor: "#CCCCCC",
                        boxPadding: 3,
                        fontSize: 13,
                        lineHeight: 20,
                        fontColor: "#FFFFFF",
                        legendShow: true,
                        legendShape: "auto",
                        splitLine: true,
                        horizentalLine: false,
                        xAxisLabel: false,
                        yAxisLabel: false,
                        labelBgColor: "#FFFFFF",
                        labelBgOpacity: 0.7,
                        labelFontColor: "#666666"
                    }
                }
            }
        },
        start_plan_creation: function (item, is_sale) {
            let is_buy = 'false';
            if (is_sale) {
                is_buy = 'true'
            }
            uni.navigateTo({
                url: '/pages/OrderCreate?stuff_id=' + item.id + '&stuff_name=' + item.name + '&company_name=' + item.company.name + '&is_buy=' + is_buy + "&company_id=" + item.company.id,
            });
        },
        get_stuff2buy: async function (pageNo) {
            if (this.$has_module('customer')) {
                let res = await this.$send_req('/customer/get_stuff_on_sale', {
                    pageNo: pageNo,
                });
                let ret = []
                res.stuff.forEach(item => {
                    if (item.price != -1) {
                        ret.push(item)
                    }
                });
                return ret;
            } else {
                return []
            }
        },
        get_stuff2sale: async function (pageNo) {
            if (this.$has_module('supplier')) {
                let res = await this.$send_req('/supplier/get_stuff_need_buy', {
                    pageNo: pageNo,
                });
                return res.stuff;
            } else {
                return []
            }
        },

        init_data_brief: async function () {
            let cond = function (day_offset, status) {
                let date = new Date();
                date.setDate(date.getDate() + day_offset);
                return {
                    start_time: utils.dateFormatter(date, 'y-m-d', 4, false),
                    end_time: utils.dateFormatter(date, 'y-m-d', 4, false),
                    status: status,
                    hide_manual_close: true,
                    only_count: true,
                };
            };
            let get_count = async (url, cond) => {
                return (await this.$send_req(url, cond)).total
            }
            let make_data = async (url, title, subtitle) => {
                let db = {
                    today_unfinish_count: await get_count(url, cond(0, 1)) + await get_count(url, cond(0, 2)),
                    today_finished_count: await get_count(url, cond(0, 3)),

                    yst_unfinish_count: await get_count(url, cond(-1, 1)) + await get_count(url, cond(-1, 2)),
                    yst_finished_count: await get_count(url, cond(-1, 3)),

                    tmr_unfinish_count: await get_count(url, cond(1, 1)) + await get_count(url, cond(1, 2)),
                    tmr_finished_count: await get_count(url, cond(1, 3)),
                }
                return {
                    opts: this.chart_opt(title, subtitle),
                    chartData: {
                        categories: ['昨日', '今日', '明日'],
                        series: [{
                                name: '订单总数',
                                data: [db.yst_unfinish_count + db.yst_finished_count, db.today_unfinish_count + db.today_finished_count, db.tmr_unfinish_count + db.tmr_finished_count]
                            },
                            {
                                name: '已完成',
                                data: [db.yst_finished_count, db.today_finished_count, db.tmr_finished_count]
                            }
                        ],
                    },
                }
            }
            let tmp = []
            if (this.$has_module('customer')) {
                tmp.push(await make_data('/customer/order_buy_search', '我方下单', '采购'))
            }
            if (this.$has_module('buy_management')) {
                tmp.push(await make_data('/buy_management/order_search', '对方下单', '采购'))
            }
            if (this.$has_module('supplier')) {
                tmp.push(await make_data('/supplier/order_sale_search', '我方下单', '销售'))
            }
            if (this.$has_module('sale_management')) {
                tmp.push(await make_data('/sale_management/order_search', '对方下单', '销售'))
            }
            this.charts = []
            tmp.forEach((item, index) => {
                this.$set(this.charts, index, JSON.parse(JSON.stringify(item)))
            });
        },
        init_notice: async function () {
            if (this.$has_module('stuff') == false) {
                return
            }
            let res = await this.$send_req('/stuff/get_notice');
            this.notice = res;
        },
        init_brief_info: async function () {
            this.self_info = uni.getStorageSync('self_info');
            await this.init_data_brief();
            await this.init_notice();
            if (this.$refs.sb_list)
                this.$refs.sb_list.refresh();
            if (this.$refs.ss_list)
                this.$refs.ss_list.refresh();
        },
    },
    onPullDownRefresh: async function () {
        await this.init_brief_info();
        await this.init_statistic();
        uni.stopPullDownRefresh();
    },
    onLoad: async function () {

        await this.init_brief_info()
        await this.init_statistic()
    },
}
</script>

<style scoped>
.charts-box {
    width: 50%;
    height: 300px;
    margin: 10px 0;
}

.charts-box-full {
    width: 100%;
    height: 300px;
    margin: 10px 0;
}

.main-warp {
    background-color: #F1F4FA;
}
</style>

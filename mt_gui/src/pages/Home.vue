<template>
    <view class="home-page">
        <logo-loading />
        <view class="page-mesh"></view>
        <view class="page-glow page-glow-a"></view>
        <view class="page-glow page-glow-b"></view>
        <notice-bar ref="noticeBar" />

        <view class="home-hero">
            <view class="company-card">
                <view class="hero-orb hero-orb-1"></view>
                <view class="hero-orb hero-orb-2"></view>
                <view class="hero-orb hero-orb-3"></view>
                <view class="hero-top">
                    <text class="hero-greeting">欢迎回来</text>
                    <view class="hero-badge">
                        <view class="hero-badge-dot"></view>
                        <text class="hero-badge-text">经营看板</text>
                    </view>
                </view>
                <view class="company-row">
                    <view v-if="self_info.company_logo" class="company-logo-wrap">
                        <fui-avatar size="middle" shape="square" :radius="16"
                            :src="$convert_attach_url(self_info.company_logo)"></fui-avatar>
                    </view>
                    <view class="company-info" :class="{ 'has-logo': !!self_info.company_logo }">
                        <text class="company-name">{{ self_info.company }}</text>
                        <text class="company-sub">今日经营概览 · 实时洞察</text>
                    </view>
                </view>
                <fui-list-cell v-if="stat_scopes.length > 1" :padding="['22rpx', '8rpx', '8rpx', '8rpx']"
                    :topBorder="true" :bottomBorder="false" :topLeft="0" :topRight="0"
                    borderColor="rgba(255,255,255,0.2)" background="transparent" arrow highlight
                    arrowColor="#FFFFFF" @click="open_scope_picker">
                    <view class="meta-left">
                        <text class="meta-label hero-meta-label">操作主体</text>
                        <text class="meta-value hero-meta-value">{{ current_scope_name || '请选择公司' }}</text>
                    </view>
                </fui-list-cell>
            </view>
        </view>

        <fui-bottom-popup :show="show_scope_picker" @close="show_scope_picker = false" z-index="1003">
            <fui-list>
                <fui-list-cell v-for="s in stat_scopes" :key="s.id" arrow @click="choose_stat_scope(s.id)">
                    <view class="scope-row">
                        <view class="scope-name">{{ s.name }}</view>
                        <fui-icon v-if="stat_context_company_id === s.id" name="check" size="30"
                            color="#465CFF"></fui-icon>
                    </view>
                </fui-list-cell>
            </fui-list>
        </fui-bottom-popup>

        <view class="content-stack">
            <view class="section-shell">
                <view class="section-head">
                    <view class="section-head-left">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">数据一览</text>
                            <text class="section-en">OVERVIEW</text>
                        </view>
                    </view>
                </view>
                <view class="section-body">
                    <view class="charts-grid">
                        <view :class="charts.length > 1 ? 'charts-box' : 'charts-box-full'"
                            v-for="(single_cts, index) in charts" :key="index">
                            <view class="chart-panel">
                                <qiun-data-charts
                                    v-if="single_cts.chartData.series[0].data.reduce((a, b) => a + b, 0) > 0"
                                    type="column" :chartData="single_cts.chartData"
                                    :opts="single_cts.opts"></qiun-data-charts>
                                <view v-else class="chart-empty">
                                    <view class="chart-empty-icon">
                                        <fui-icon name="order" size="48" color="#A8B4D8"></fui-icon>
                                    </view>
                                    <text class="chart-empty-text">暂无数据</text>
                                </view>
                                <view class="chart-title-wrap">
                                    <text class="chart-title">{{ single_cts.opts.title }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <module-filter require_module="sale_management">
                        <view class="section-divider">
                            <fui-divider text="物料统计" color="#7B8499" backgroundColor="#FFFFFF"></fui-divider>
                        </view>
                        <view class="stat-toolbar-card">
                            <fui-list-cell :padding="['16rpx', '8rpx']" :topBorder="false" :bottomBorder="false"
                                background="transparent" highlight @click="show_pick_date = true">
                                <view class="meta-row-inner">
                                    <view class="meta-left">
                                        <text class="meta-label">统计日期</text>
                                        <text class="meta-value">{{ base_day }}</text>
                                    </view>
                                    <fui-icon name="calendar" size="36" color="#465CFF"></fui-icon>
                                </view>
                            </fui-list-cell>
                            <view class="day-toolbar">
                                <view class="day-chips">
                                    <fui-tag text="前日"
                                        :background="day_offset === -1 ? '#465CFF' : '#FFFFFF'"
                                        :color="day_offset === -1 ? '#FFFFFF' : '#4A5568'"
                                        :borderColor="day_offset === -1 ? '#465CFF' : '#E4E8F2'" :radius="28"
                                        :padding="['12rpx', '28rpx']" :marginRight="16" highlight
                                        @click="switch_day_offset(-1)"></fui-tag>
                                    <fui-tag text="当天"
                                        :background="day_offset === 0 ? '#465CFF' : '#FFFFFF'"
                                        :color="day_offset === 0 ? '#FFFFFF' : '#4A5568'"
                                        :borderColor="day_offset === 0 ? '#465CFF' : '#E4E8F2'" :radius="28"
                                        :padding="['12rpx', '28rpx']" :marginRight="16" highlight
                                        @click="switch_day_offset(0)"></fui-tag>
                                    <fui-tag text="翌天"
                                        :background="day_offset === 1 ? '#465CFF' : '#FFFFFF'"
                                        :color="day_offset === 1 ? '#FFFFFF' : '#4A5568'"
                                        :borderColor="day_offset === 1 ? '#465CFF' : '#E4E8F2'" :radius="28"
                                        :padding="['12rpx', '28rpx']" highlight
                                        @click="switch_day_offset(1)"></fui-tag>
                                </view>
                                <fui-text v-if="tableData.length > 7" type="primary" :text="expand_text"
                                    decoration="underline" @click="handle_expand"></fui-text>
                            </view>
                        </view>
                        <view class="table-bleed">
                            <fui-table :height="table_height" :gap="24" full fixed stripe :itemList="tableData"
                                :header="headerData"></fui-table>
                        </view>
                    </module-filter>
                </view>
            </view>

            <fui-date-picker zIndex="1004" :show="show_pick_date" type="3" :value="base_day"
                @change="choose_expired_date" @cancel="show_pick_date = false"></fui-date-picker>

            <module-filter require_module="customer">
                <view class="section-shell">
                    <view class="section-head">
                        <view class="section-head-left">
                            <view class="section-bar"></view>
                            <view class="section-titles">
                                <text class="section-title">采购提单</text>
                                <text class="section-en">PROCUREMENT</text>
                            </view>
                        </view>
                    </view>
                    <view class="section-body">
                        <list-show ref="sb_list" :fetch_function="get_stuff2buy" height="40vh" v-model="stuff2buy">
                            <view class="stuff-item" v-for="item in stuff2buy" :key="item.id">
                                <view class="stuff-accent"></view>
                                <view class="stuff-row">
                                    <view class="stuff-main">
                                        <text class="stuff-title">{{ item.name }}</text>
                                        <text class="stuff-company">{{ item.company.name }}</text>
                                        <text class="stuff-desc" v-if="item.comment">{{ item.comment }}</text>
                                    </view>
                                    <view class="stuff-side">
                                        <text class="stuff-price">{{ item.price == -1 ? '未关注' : '¥' + item.price }}</text>
                                        <fui-button btnSize="mini" text="下单" background="#465CFF" color="#FFFFFF"
                                            radius="28rpx" width="120rpx" height="56rpx" size="24"
                                            @click="start_plan_creation(item)"></fui-button>
                                    </view>
                                </view>
                            </view>
                        </list-show>
                    </view>
                </view>
            </module-filter>

            <module-filter require_module="supplier">
                <view class="section-shell">
                    <view class="section-head">
                        <view class="section-head-left">
                            <view class="section-bar"></view>
                            <view class="section-titles">
                                <text class="section-title">销售提单</text>
                                <text class="section-en">SALES</text>
                            </view>
                        </view>
                    </view>
                    <view class="section-body">
                        <list-show ref="ss_list" :fetch_function="get_stuff2sale" height="40vh" v-model="stuff2sale">
                            <view class="stuff-item" v-for="(item, index) in stuff2sale" :key="index">
                                <view class="stuff-accent"></view>
                                <view class="stuff-row">
                                    <view class="stuff-main">
                                        <text class="stuff-title">{{ item.name }}</text>
                                        <text class="stuff-company">{{ item.company.name }}</text>
                                        <text class="stuff-desc" v-if="item.comment">{{ item.comment }}</text>
                                    </view>
                                    <view class="stuff-side" v-if="item.price != -1">
                                        <fui-button btnSize="mini" text="下单" background="#465CFF" color="#FFFFFF"
                                            radius="28rpx" width="120rpx" height="56rpx" size="24"
                                            @click="start_plan_creation(item, true)"></fui-button>
                                    </view>
                                </view>
                            </view>
                        </list-show>
                    </view>
                </view>
            </module-filter>

            <module-filter require_module="stuff">
                <view class="section-shell">
                    <view class="section-head">
                        <view class="section-head-left">
                            <view class="section-bar"></view>
                            <view class="section-titles">
                                <text class="section-title">物料统计</text>
                                <text class="section-en">MATERIALS</text>
                            </view>
                        </view>
                    </view>
                    <view class="section-body">
                        <view class="table-bleed">
                            <fui-table :gap="24" full fixed stripe :itemList="totalCountData"
                                :header="stuff_count_header"></fui-table>
                        </view>
                    </view>
                </view>
            </module-filter>

            <module-filter require_module="stuff">
                <view class="section-shell section-shell-last">
                    <view class="section-head">
                        <view class="section-head-left">
                            <view class="section-bar"></view>
                            <view class="section-titles">
                                <text class="section-title">通知管理</text>
                                <text class="section-en">NOTICE</text>
                            </view>
                        </view>
                    </view>
                    <view class="section-body">
                        <fui-textarea flexStart isCounter label="下单通知" maxlength="2000" placeholder="请输入内容"
                            v-model="notice.notice"></fui-textarea>
                        <fui-textarea flexStart isCounter label="司机通知" maxlength="2000" placeholder="请输入内容"
                            v-model="notice.driver_notice"></fui-textarea>
                        <view class="notice-actions">
                            <fui-button type="primary" text="保存" background="#465CFF" radius="44rpx" height="88rpx"
                                @click="save_notice"></fui-button>
                        </view>
                    </view>
                </view>
            </module-filter>
        </view>
    </view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import ModuleFilter from '../components/ModuleFilter.vue';
import NoticeBar from '../components/NoticeBar.vue';
export default {
    name: 'Home',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilter,
        "notice-bar": NoticeBar,
    },
    data() {
        return {
            base_day: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            totalCountData: [],
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
            stuff_count_header: [{
                prop: 'name',
                label: '物料',
                width: '240',
            }, {
                prop: 'yesterday_count',
                label: '昨日',
                width: '140',
            }, {
                prop: 'today_count',
                label: '今日',
                width: '140',
            }, {
                prop: 'second_unit',
                label: '单位',
                width: '120',
            }],
            headerData: [{
                prop: 'company_name',
                label: '客户',
                width: '280'
            }, {
                prop: 'confirm_count',
                label: '总车数(取消)',
                width: '220'
            }, {
                prop: 'finish_count',
                label: '完成数',
                width: '140'
            }],
            day_offset: 0,
            expand_text: '展开',
            table_height: 700,
            tmp_tableData: [],
            dataCount: 7,
            show_pick_date: false,
            stat_scopes: [],
            stat_context_company_id: null,
            show_scope_picker: false,
        }
    },
    computed: {
        current_scope_name: function () {
            const current = this.stat_scopes.find(item => item.id === this.stat_context_company_id);
            return current ? current.name : '';
        },
    },
    methods: {
        choose_expired_date: function (e) {
            this.base_day = e.result;
            this.show_pick_date = false;
            this.init_statistic();
        },
        switch_day_offset: function (offset) {
            if (this.day_offset === offset) {
                return;
            }
            this.day_offset = offset;
            this.init_statistic();
        },
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
                base_day: this.base_day,
                stat_context_company_id: this.stat_context_company_id,
            });
            let format_confirm_count = (confirm_count, cancel_count) => {
                let cc = cancel_count || 0;
                return cc > 0 ? `${confirm_count}(${cc})` : `${confirm_count}`;
            };
            this.tableData = [];
            this.tableData.push({
                company_name: '合计',
                confirm_count: format_confirm_count(resp.total_confirm_count, resp.total_cancel_count),
                finish_count: resp.total_finish_count,
            });
            for (let index = 0; index < resp.statistic.length; index++) {
                const element = resp.statistic[index];
                this.tableData.push({
                    company_name: element.company.name,
                    confirm_count: format_confirm_count(element.confirm_count, element.cancel_count),
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
                        meterFillColor: "#F5F7FB"
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
                url: '/subPage1/OrderCreate?stuff_id=' + item.id + '&stuff_name=' + item.name + '&company_name=' + item.company.name + '&is_buy=' + is_buy + "&company_id=" + item.company.id,
            });
        },
        load_stat_scopes: async function () {
            try {
                const ret = await this.$send_req('/global/home_stat_scope_list', {});
                this.stat_scopes = ret.scopes || [];
                if (this.stat_scopes.length && this.stat_context_company_id == null) {
                    this.stat_context_company_id = this.stat_scopes[0].id;
                }
            } catch (e) {
                this.stat_scopes = [];
            }
        },
        on_stat_scope_change: function () {
            this.init_brief_info();
            this.init_statistic();
            this.get_stuff_total();
        },
        open_scope_picker: function () {
            this.show_scope_picker = true;
        },
        choose_stat_scope: function (company_id) {
            if (this.stat_context_company_id === company_id) {
                this.show_scope_picker = false;
                return;
            }
            this.stat_context_company_id = company_id;
            this.show_scope_picker = false;
            this.on_stat_scope_change();
        },
        get_stuff2buy: async function (pageNo) {
            if (this.$has_module('customer')) {
                let res = await this.$send_req('/customer/get_stuff_on_sale', {
                    pageNo: pageNo,
                    stat_context_company_id: this.stat_context_company_id,
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
        get_stuff_total: async function () {
            if (this.$has_module('stuff')) {
                let res = await this.$send_req('/stuff/get_count_by_today_yesterday', {
                    stat_context_company_id: this.stat_context_company_id,
                });
                this.totalCountData = res.statistic
                this.totalCountData.forEach(item => {
                    if (item.second_unit == '吨') {
                        item.yesterday_count = item.yesterday_count.toFixed(2)
                        item.today_count = item.today_count.toFixed(2)
                    } else {
                        item.yesterday_count = item.yesterday_count.toFixed(item.second_unit_decimal)
                        item.today_count = item.today_count.toFixed(item.second_unit_decimal)
                    }
                });
            }
        },
        get_stuff2sale: async function (pageNo) {
            if (this.$has_module('supplier')) {
                let res = await this.$send_req('/supplier/get_stuff_need_buy', {
                    pageNo: pageNo,
                    stat_context_company_id: this.stat_context_company_id,
                });
                return res.stuff;
            } else {
                return []
            }
        },

        init_data_brief: async function () {
            // 生成查询条件的函数
            let cond = (day_offset, status) => {
                let date = new Date();
                date.setDate(date.getDate() + day_offset);
                return {
                    start_time: utils.dateFormatter(date, 'y-m-d', 4, false),
                    end_time: utils.dateFormatter(date, 'y-m-d', 4, false),
                    status: status,
                    hide_manual_close: true,
                    only_count: true,
                    stat_context_company_id: this.stat_context_company_id,
                };
            };

            // 发送请求获取订单数量的函数
            let get_count = async (url, cond) => {
                return (await this.$send_req(url, cond)).total;
            };

            // 生成图表数据的函数
            let make_data = async (url, title, subtitle) => {
                try {
                    // 生成需要查询的日期和状态组合
                    const offsets = [0, -1, 1];
                    const statuses = [1, 2, 3];
                    const promises = [];

                    // 为每个日期和状态组合生成查询请求
                    offsets.forEach(offset => {
                        statuses.forEach(status => {
                            promises.push(get_count(url, cond(offset, status)));
                        });
                    });

                    // 并发执行所有请求
                    const results = await Promise.all(promises);

                    // 解析结果并计算各时间段的订单数量
                    let db = {
                        today_unfinish_count: results[0] + results[1],
                        today_finished_count: results[2],
                        yst_unfinish_count: results[3] + results[4],
                        yst_finished_count: results[5],
                        tmr_unfinish_count: results[6] + results[7],
                        tmr_finished_count: results[8]
                    };

                    // 返回图表配置和数据
                    return {
                        opts: this.chart_opt(title, subtitle),
                        chartData: {
                            categories: ['昨日', '今日', '明日'],
                            series: [{
                                name: '订单总数',
                                data: [
                                    db.yst_unfinish_count + db.yst_finished_count,
                                    db.today_unfinish_count + db.today_finished_count,
                                    db.tmr_unfinish_count + db.tmr_finished_count
                                ]
                            },
                            {
                                name: '已完成',
                                color: '#465CFF',
                                data: [db.yst_finished_count, db.today_finished_count, db.tmr_finished_count]
                            }
                            ]
                        }
                    };
                } catch (err) {
                    console.log("页面数据初始化异常", err);
                    // 发生错误时返回 null 或默认数据
                    return null;
                }
            };

            let tmp = [];
            // 根据模块权限生成不同模块的图表数据
            if (this.$has_module('customer')) {
                tmp.push(await make_data('/customer/order_buy_search', '我方下单', '采购'));
            }
            if (this.$has_module('buy_management')) {
                tmp.push(await make_data('/buy_management/order_search', '对方下单', '采购'));
            }
            if (this.$has_module('supplier')) {
                tmp.push(await make_data('/supplier/order_sale_search', '我方下单', '销售'));
            }
            if (this.$has_module('sale_management')) {
                tmp.push(await make_data('/sale_management/order_search', '对方下单', '销售'));
            }
            this.charts = []
            tmp.forEach((item, index) => {
                // 过滤掉可能的 null 值
                if (item !== null) {
                    this.$set(this.charts, index, JSON.parse(JSON.stringify(item)))
                }
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
            this.init_data_brief();
            this.init_notice();
            if (this.$refs.sb_list)
                this.$refs.sb_list.refresh();
            if (this.$refs.ss_list)
                this.$refs.ss_list.refresh();
        },
    },
    onPullDownRefresh: async function () {
        //只需要调用，无需等待结果
        this.init_brief_info();
        this.init_statistic();
        uni.stopPullDownRefresh();
        this.$refs.noticeBar.getNoticeData();
        this.get_stuff_total()
    },
    onLoad: async function () {
        await this.load_stat_scopes();
        this.init_brief_info();
        this.init_statistic();
        this.get_stuff_total();
    },
}
</script>


<style scoped>
.home-page {
    position: relative;
    min-height: 100vh;
    background: linear-gradient(180deg, #2F3FCF 0%, #465CFF 160rpx, #D8E0F6 340rpx, #E9EEF8 520rpx, #F2F4FA 100%);
    padding-bottom: 48rpx;
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

.table-bleed {
    margin-left: -24rpx;
    margin-right: -24rpx;
}

.home-hero {
    position: relative;
    z-index: 1;
    padding: 8rpx 0 0;
}

.company-card {
    position: relative;
    margin: 0 24rpx;
    padding: 36rpx 32rpx 28rpx;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
    border-radius: 32rpx;
    border: 1rpx solid rgba(255, 255, 255, 0.32);
    box-shadow: 0 24rpx 56rpx rgba(24, 36, 110, 0.28);
    overflow: hidden;
}

.hero-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
}

.hero-orb-1 {
    top: -70rpx;
    right: -30rpx;
    width: 240rpx;
    height: 240rpx;
    background: rgba(255, 255, 255, 0.16);
}

.hero-orb-2 {
    bottom: -90rpx;
    left: 20rpx;
    width: 220rpx;
    height: 220rpx;
    background: rgba(255, 255, 255, 0.08);
}

.hero-orb-3 {
    top: 40%;
    right: 30%;
    width: 90rpx;
    height: 90rpx;
    background: rgba(255, 255, 255, 0.1);
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

.hero-badge {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8rpx 18rpx;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.16);
    border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.hero-badge-dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background: #7DFFB3;
    margin-right: 10rpx;
    box-shadow: 0 0 10rpx rgba(125, 255, 179, 0.8);
}

.hero-badge-text {
    font-size: 20rpx;
    color: #FFFFFF;
    letter-spacing: 1rpx;
}

.company-row {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.company-logo-wrap {
    padding: 8rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.22);
    border: 1rpx solid rgba(255, 255, 255, 0.4);
}

.company-info {
    flex: 1;
    overflow: hidden;
}

.company-info.has-logo {
    margin-left: 22rpx;
}

.company-name {
    display: block;
    font-size: 42rpx;
    color: #FFFFFF;
    font-weight: 700;
    letter-spacing: 1rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 8rpx 24rpx rgba(20, 30, 90, 0.25);
}

.company-sub {
    display: block;
    margin-top: 12rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
}

.hero-meta-label {
    color: rgba(255, 255, 255, 0.7) !important;
}

.hero-meta-value {
    color: #FFFFFF !important;
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

.section-shell-last {
    margin-bottom: 8rpx;
}

.section-head {
    padding: 28rpx 28rpx 18rpx;
    background: linear-gradient(90deg, #F3F5FF 0%, #FFFFFF 70%);
    border-bottom: 1rpx solid #EEF1F8;
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
    font-size: 32rpx;
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

.section-body {
    padding: 24rpx 24rpx 28rpx;
}

.meta-row-inner {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.meta-left {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    overflow: hidden;
    margin-right: 16rpx;
}

.meta-label {
    flex-shrink: 0;
    font-size: 24rpx;
    color: #8A94A6;
    margin-right: 16rpx;
}

.meta-value {
    flex: 1;
    font-size: 26rpx;
    color: #2D3748;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.charts-grid {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -8rpx;
}

.charts-box,
.charts-box-full {
    box-sizing: border-box;
    padding: 8rpx;
}

.charts-box {
    width: 50%;
}

.charts-box-full {
    width: 100%;
}

.chart-panel {
    position: relative;
    background: linear-gradient(165deg, #F7F8FE 0%, #EEF1FB 100%);
    border-radius: 22rpx;
    padding: 22rpx 12rpx 18rpx;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    border: 1rpx solid #E4E9F6;
    box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.9);
    overflow: hidden;
}

.chart-panel::before {
    content: '';
    position: absolute;
    left: 0;
    top: 24rpx;
    bottom: 24rpx;
    width: 6rpx;
    border-radius: 0 6rpx 6rpx 0;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
}

.chart-empty {
    flex: 1;
    min-height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.chart-empty-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 48rpx;
    background: linear-gradient(145deg, rgba(70, 92, 255, 0.12), rgba(70, 92, 255, 0.04));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
}

.chart-empty-text {
    font-size: 24rpx;
    color: #A0AABC;
    font-weight: 500;
}

.chart-title-wrap {
    margin-top: 12rpx;
    display: flex;
    justify-content: center;
}

.chart-title {
    font-size: 22rpx;
    color: #4A5568;
    font-weight: 600;
    padding: 8rpx 22rpx;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20rpx;
    border: 1rpx solid #E8ECF6;
    box-shadow: 0 4rpx 12rpx rgba(40, 58, 120, 0.05);
}

.section-divider {
    margin-top: 12rpx;
}

.stat-toolbar-card {
    margin: 8rpx 0 12rpx;
    padding: 8rpx 12rpx 4rpx;
    background: linear-gradient(180deg, #F6F8FE 0%, #F2F4FB 100%);
    border-radius: 20rpx;
    border: 1rpx solid #E8ECF6;
}

.day-toolbar {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 12rpx 4rpx 16rpx;
}

.day-chips {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
}

.stuff-item {
    position: relative;
    margin: 0 0 18rpx;
    padding: 28rpx 24rpx 28rpx 28rpx;
    background: linear-gradient(135deg, #FFFFFF 0%, #F8F9FD 100%);
    border-radius: 20rpx;
    border: 1rpx solid #E8ECF6;
    box-shadow: 0 8rpx 24rpx rgba(40, 58, 120, 0.05);
    overflow: hidden;
}

.stuff-item:last-child {
    margin-bottom: 0;
}

.stuff-accent {
    position: absolute;
    left: 0;
    top: 22rpx;
    bottom: 22rpx;
    width: 6rpx;
    border-radius: 0 6rpx 6rpx 0;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
}

.stuff-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.stuff-main {
    flex: 1;
    overflow: hidden;
    margin-right: 16rpx;
}

.stuff-title {
    display: block;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stuff-company {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #6B7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stuff-desc {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #8A94A6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stuff-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
}

.stuff-price {
    margin-bottom: 14rpx;
    font-size: 30rpx;
    color: #465CFF;
    font-weight: 700;
    letter-spacing: 0.5rpx;
}

.notice-actions {
    margin-top: 28rpx;
    padding: 0 4rpx 8rpx;
}

.scope-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.scope-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 20rpx;
}
</style>

<template>
<view class="export-page">
    <logo-loading />
    <view class="page-mesh"></view>
    <view class="page-glow page-glow-a"></view>
    <view class="page-glow page-glow-b"></view>
    <view class="page-glow page-glow-c"></view>

    <!-- 全幅 Hero，不再是「白底圆角列表」 -->
    <view class="hero-bleed">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy-block">
            <text class="hero-title">导出中心</text>
            <text class="hero-sub">选好时间，点选能力，后台出表随时下载</text>
        </view>

        <view class="date-deck" @click="open_plan_date">
            <view class="date-deck-glow"></view>
            <view class="date-deck-inner">
                <view class="date-col">
                    <text class="date-cap">起始</text>
                    <text class="date-num">{{ begin_date }}</text>
                </view>
                <view class="date-mid">
                    <view class="date-mid-line"></view>
                    <text class="date-mid-text">至</text>
                    <view class="date-mid-line"></view>
                </view>
                <view class="date-col right">
                    <text class="date-cap">截止</text>
                    <text class="date-num">{{ end_date }}</text>
                </view>
            </view>
            <view class="date-cta">
                <fui-icon name="calendar" size="26" color="#2F3FCF"></fui-icon>
                <text class="date-cta-text">调整区间</text>
            </view>
        </view>

        <view class="mode-tabs">
            <view class="mode-tab" :class="{ on: cur_page === 0 }" @click="sectionChange(0)">
                <text class="mode-tab-text">执行导出</text>
            </view>
            <view class="mode-tab" :class="{ on: cur_page === 1 }" @click="sectionChange(1)">
                <text class="mode-tab-text">导出记录</text>
            </view>
        </view>
    </view>

    <fui-date-picker range :show="show_plan_date" type="3" :value="begin_date" :valueEnd="end_date"
        @change="choose_date" @cancel="close_plan_date"></fui-date-picker>
    <fui-date-picker type="7" :show="show_start_time" :hour="begin_hour" :minute="begin_minute"
        :second="begin_second" @change="handleBeginTimeChange" @cancel="close_start_time" />
    <fui-date-picker type="7" :show="show_end_time" :hour="end_hour" :minute="end_minute"
        :second="end_second" @change="handleEndTimeChange" @cancel="close_end_time" />

    <view class="content-stack">
        <view v-if="cur_page === 0" class="export-panels">
            <view v-if="!has_any_export" class="empty-export">
                <view class="empty-export-icon">
                    <fui-icon name="info" size="48" color="#8A94A6"></fui-icon>
                </view>
                <text class="empty-export-title">暂无可用导出能力</text>
                <text class="empty-export-desc">当前账号未开通相关业务模块，如需导出请联系管理员</text>
            </view>

            <view v-if="visible_plan_modules.length" class="block">
                <view class="block-head">
                    <view class="block-mark mark-blue"></view>
                    <view class="block-titles">
                        <text class="block-title">订单明细</text>
                        <text class="block-en">ORDER · DETAILS</text>
                    </view>
                </view>

                <view v-if="show_order_filters" class="control-deck">
                    <view class="deck-row">
                        <text class="deck-label">称重时刻</text>
                        <text class="deck-value">{{ time_range_text }}</text>
                    </view>
                    <view class="deck-actions">
                        <view class="deck-btn solid" @click="open_start_time">开始时间</view>
                        <view class="deck-btn solid" @click="open_end_time">结束时间</view>
                        <view class="deck-btn ghost" @click="clearTime">清除</view>
                    </view>
                    <view class="deck-row mt">
                        <text class="deck-label">称重类型</text>
                        <u-radio-group v-model="weight_time_type" placement="row">
                            <u-radio name="first" label="一次"></u-radio>
                            <u-radio name="second" label="二次"></u-radio>
                        </u-radio-group>
                    </view>
                    <view class="deck-filters">
                        <data-filter filter_name="公司" :get_func="get_customers" search_key="name"
                            tag_color="success" v-model="company_filter"></data-filter>
                        <data-filter filter_name="物料" :get_func="get_stuff" search_key="name"
                            tag_color="primary" v-model="stuff_filter"></data-filter>
                    </view>
                </view>

                <view class="tile-grid" :class="{ single: visible_plan_modules.length === 1 }">
                    <view class="tile-cell" v-for="item in visible_plan_modules" :key="item.module">
                        <view class="tile tile-blue" @click="export_plan_by_module(item.module)">
                            <view class="tile-icon">
                                <fui-icon name="order" size="34" color="#FFFFFF"></fui-icon>
                            </view>
                            <text class="tile-title">{{ item.name }}</text>
                            <text class="tile-desc">导出明细报表</text>
                            <text class="tile-go">立即导出 →</text>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="show_rate_export" class="block">
                <view class="block-head">
                    <view class="block-mark mark-cyan"></view>
                    <view class="block-titles">
                        <text class="block-title">执行率</text>
                        <text class="block-en">EXECUTION · RATE</text>
                    </view>
                </view>
                <view class="tile-grid single">
                    <view class="tile-cell">
                        <view class="tile tile-cyan wide" @click="export_rate">
                            <view class="tile-icon">
                                <fui-icon name="piechart" size="34" color="#FFFFFF"></fui-icon>
                            </view>
                            <view class="tile-copy">
                                <text class="tile-title">导出执行率</text>
                                <text class="tile-desc">按时间段汇总执行情况</text>
                            </view>
                            <text class="tile-go">立即导出 →</text>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="show_balance_export" class="block">
                <view class="block-head">
                    <view class="block-mark mark-orange"></view>
                    <view class="block-titles">
                        <text class="block-title">余额明细</text>
                        <text class="block-en">BALANCE · FLOW</text>
                    </view>
                </view>
                <view class="balance-panel">
                    <view class="balance-select">
                        <view class="balance-select-meta">
                            <fui-icon name="community" size="28" color="#FF8A2B"></fui-icon>
                            <text class="balance-select-label">筛选公司</text>
                        </view>
                        <data-filter filter_name="公司" :get_func="get_sale_contract" search_key="name"
                            tag_color="warning" v-model="contract_filter"></data-filter>
                    </view>
                    <view class="balance-cta" @click="export_balance">
                        <view class="balance-cta-left">
                            <view class="balance-cta-icon">
                                <fui-icon name="wallet" size="32" color="#FFFFFF"></fui-icon>
                            </view>
                            <view class="balance-cta-copy">
                                <text class="balance-cta-title">导出余额明细</text>
                                <text class="balance-cta-desc">按合同公司导出资金流水</text>
                            </view>
                        </view>
                        <text class="balance-cta-go">立即导出 →</text>
                    </view>
                </view>
            </view>

            <view v-if="visible_ticket_modules.length" class="block">
                <view class="block-head">
                    <view class="block-mark mark-indigo"></view>
                    <view class="block-titles">
                        <text class="block-title">磅单归档</text>
                        <text class="block-en">WEIGHT · TICKETS</text>
                    </view>
                </view>
                <view class="tile-grid" :class="{ single: visible_ticket_modules.length === 1 }">
                    <view class="tile-cell" v-for="item in visible_ticket_modules" :key="item.module">
                        <view class="tile tile-indigo" @click="export_weight_ticket(item.module)">
                            <view class="tile-icon">
                                <fui-icon name="transport" size="34" color="#FFFFFF"></fui-icon>
                            </view>
                            <text class="tile-title">{{ item.name }}</text>
                            <text class="tile-desc">打包已完成磅单</text>
                            <text class="tile-go">立即导出 →</text>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="visible_sc_modules.length" class="block">
                <view class="block-head">
                    <view class="block-mark mark-green"></view>
                    <view class="block-titles">
                        <text class="block-title">安检登记表</text>
                        <text class="block-en">SECURITY · CHECK</text>
                    </view>
                </view>
                <view class="tile-grid" :class="{ single: visible_sc_modules.length === 1 }">
                    <view class="tile-cell" v-for="item in visible_sc_modules" :key="item.module">
                        <view class="tile tile-green" @click="export_sc_contents(item.module)">
                            <view class="tile-icon">
                                <fui-icon name="captcha" size="34" color="#FFFFFF"></fui-icon>
                            </view>
                            <text class="tile-title">{{ item.name }}</text>
                            <text class="tile-desc">安检登记材料包</text>
                            <text class="tile-go">立即导出 →</text>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="show_fc_export" class="block">
                <view class="block-head">
                    <view class="block-mark mark-green"></view>
                    <view class="block-titles">
                        <text class="block-title">现场检查表</text>
                        <text class="block-en">FIELD · CHECK</text>
                    </view>
                </view>
                <view class="tile-grid single">
                    <view class="tile-cell">
                        <view class="tile tile-green wide" @click="export_fc_contents">
                            <view class="tile-icon">
                                <fui-icon name="checkbox" size="34" color="#FFFFFF"></fui-icon>
                            </view>
                            <view class="tile-copy">
                                <text class="tile-title">导出现场检查表</text>
                                <text class="tile-desc">汇总现场检查记录</text>
                            </view>
                            <text class="tile-go">立即导出 →</text>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="show_exam_export" class="block">
                <view class="block-head">
                    <view class="block-mark mark-blue"></view>
                    <view class="block-titles">
                        <text class="block-title">司机考试试卷</text>
                        <text class="block-en">DRIVER · EXAM</text>
                    </view>
                </view>
                <view class="tile-grid single">
                    <view class="tile-cell">
                        <view class="tile tile-blue wide" @click="export_driver_exam">
                            <view class="tile-icon">
                                <fui-icon name="edit" size="34" color="#FFFFFF"></fui-icon>
                            </view>
                            <view class="tile-copy">
                                <text class="tile-title">导出司机考试试卷</text>
                                <text class="tile-desc">题干 · 选项 · 答案</text>
                            </view>
                            <text class="tile-go">立即导出 →</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <view v-if="cur_page === 1" class="block">
            <view class="block-head">
                <view class="block-mark mark-blue"></view>
                <view class="block-titles">
                    <text class="block-title">导出记录</text>
                    <text class="block-en">DOWNLOAD · HISTORY</text>
                </view>
                <text class="list-hint">下拉刷新</text>
            </view>
                <list-show ref="dr" :fetch_function="get_export_record" height="62vh" v-model="records">
                    <view class="record-item" v-for="item in records" :key="item.id"
                        @click="download_file(item.url)">
                        <view class="record-accent" :class="item.status_class"></view>
                        <view class="record-body">
                            <text class="record-name">{{ item.name }}</text>
                            <text class="record-time">{{ item.create_time }}</text>
                        </view>
                        <view class="record-status" :class="item.status_class">
                            <text class="record-status-text">{{ item.status_text }}</text>
                        </view>
                    </view>
                </list-show>
        </view>
    </view>
    <app-tab-bar :selected="3" />
</view>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
import ListShow from '../components/ListShow.vue';
import DataFilter from '../components/DataFilter.vue';
import AppTabBar from '../components/AppTabBar.vue';
import { setTabBarSelected } from '@/utils/setTabBarSelected';
export default {
    name: 'Export',
    components: {
        "list-show": ListShow,
        "data-filter": DataFilter,
        "app-tab-bar": AppTabBar,
    },
    data: function () {
        return {
            begin_hour: '',
            begin_minute: '',
            begin_second: '',
            end_hour: '',
            end_minute: '',
            end_second: '',
            weight_time_type: 'first',
            stuff_filter: {
                id: undefined,
                name: '',
            },
            company_filter: {
                id: undefined,
                name: '',
            },
            contract_filter: {
                id: undefined,
                name: '',
            },
            show_plan_date: false,
            show_start_time: false,
            show_end_time: false,
            begin_date: '',
            cur_page: 0,
            end_date: '',
            records: [],
            all_module: [
                'sale_management',
                'buy_management',
                'customer',
                'supplier',
            ],
            button_name: [
                '销售接单', '采购接单', '采购下单', '销售下单'
            ],
            company_is_group: false,
            self_company_id: null,
            stat_scopes: [],
        };
    },
    computed: {
        has_group_view_grant: function () {
            if (!this.company_is_group) {
                return false;
            }
            return (this.stat_scopes || []).some((s) => s.id !== this.self_company_id);
        },
        order_and_ticket_modules: function () {
            let ret = [];
            this.all_module.forEach((m, i) => {
                if (m === 'sale_management' && this.company_is_group && !this.has_group_view_grant) {
                    return;
                }
                ret.push({ module: m, name: this.button_name[i] });
            });
            return ret;
        },
        visible_plan_modules: function () {
            return this.order_and_ticket_modules.filter((item) => this.$has_module(item.module));
        },
        visible_ticket_modules: function () {
            return this.visible_plan_modules;
        },
        visible_sc_modules: function () {
            return this.all_module
                .map((m, i) => ({ module: m, name: this.button_name[i] }))
                .filter((item) => this.$has_module(item.module));
        },
        show_order_filters: function () {
            return this.$has_module('sale_management') || this.$has_module('buy_management');
        },
        show_rate_export: function () {
            return this.$has_module('sale_management');
        },
        show_balance_export: function () {
            return this.$has_module('cash') && this.$has_module('stuff');
        },
        show_fc_export: function () {
            return this.$has_module('sale_management') || this.$has_module('buy_management');
        },
        show_exam_export: function () {
            return this.$has_module('exam');
        },
        has_any_export: function () {
            return this.visible_plan_modules.length > 0
                || this.show_rate_export
                || this.show_balance_export
                || this.visible_ticket_modules.length > 0
                || this.visible_sc_modules.length > 0
                || this.show_fc_export
                || this.show_exam_export;
        },
        time_range_text: function () {
            if (!this.begin_hour && !this.end_hour) {
                return '未限定称重时刻';
            }
            const start = [this.begin_hour, this.begin_minute, this.begin_second]
                .map((v) => (v || '00')).join(':');
            const end = [this.end_hour, this.end_minute, this.end_second]
                .map((v) => (v || '00')).join(':');
            return start + ' - ' + end;
        },
    },
    methods: {
        open_plan_date: function () {
            this.show_plan_date = true;
        },
        close_plan_date: function () {
            this.show_plan_date = false;
        },
        open_start_time: function () {
            this.show_start_time = true;
        },
        close_start_time: function () {
            this.show_start_time = false;
        },
        open_end_time: function () {
            this.show_end_time = true;
        },
        close_end_time: function () {
            this.show_end_time = false;
        },
        go_records_and_refresh: function () {
            this.cur_page = 1;
            this.$nextTick(() => {
                if (this.$refs.dr) {
                    this.$refs.dr.refresh();
                }
            });
        },
        clearTime() {
            this.begin_hour = '';
            this.begin_minute = '';
            this.begin_second = '';
            this.end_hour = '';
            this.end_minute = '';
            this.end_second = '';
            this.show_start_time = false;
            this.show_end_time = false;
        },
        download_file: function (url) {
            if (!url || url === 'no') {
                return;
            }
            uni.downloadFile({
                url: this.$convert_attach_url(url),
                success: function (res) {
                    var filePath = res.tempFilePath;
                    uni.openDocument({
                        filePath: filePath,
                        showMenu: true,
                    });
                }
            });
        },
        handleBeginTimeChange(e) {
            this.begin_hour = e.hour;
            this.begin_minute = e.minute;
            this.begin_second = e.second;
            this.show_start_time = false;
        },
        handleEndTimeChange(e) {
            this.end_hour = e.hour;
            this.end_minute = e.minute;
            this.end_second = e.second;
            this.show_end_time = false;
        },
        get_export_record: async function (pageNo) {
            let res = await this.$send_req('/global/get_export_record', {
                pageNo: pageNo,
            });
            // fetch_function 由 ListShow 调用时 this 可能不是本页，状态计算勿依赖 methods
            return (res.records || []).map((item) => {
                const url = item.url;
                let status_class = 'pending';
                let status_text = '导出中';
                if (url === 'no') {
                    status_class = 'fail';
                    status_text = '失败';
                } else if (url) {
                    status_class = 'ok';
                    status_text = '下载';
                }
                return Object.assign({}, item, {
                    status_class: status_class,
                    status_text: status_text,
                });
            });
        },
        sectionChange(e) {
            const index = typeof e === 'number' ? e : e.index;
            this.cur_page = index;
            if (index === 1) {
                this.$nextTick(() => {
                    if (this.$refs.dr) {
                        this.$refs.dr.refresh();
                    }
                });
            }
        },
        choose_date: function (e) {
            this.show_plan_date = false;
            this.begin_date = e.startDate.result;
            this.end_date = e.endDate.result;
        },
        export_plan_by_module: async function (module_name) {
            await this.export_plan('/' + module_name);
        },
        export_plan: async function (prefix) {
            let export_params = {
                start_time: this.begin_date,
                end_time: this.end_date,
                stuff_id: this.stuff_filter.id,
                company_id: this.company_filter.id,
                m_start_time: undefined,
                m_end_time: undefined,
            };
            if (this.begin_hour || this.end_hour) {
                export_params.m_start_time = this.begin_date + ' ' + this.begin_hour + ':' + this.begin_minute + ':' + this.begin_second;
                export_params.m_end_time = this.end_date + ' ' + this.end_hour + ':' + this.end_minute + ':' + this.end_second;
                export_params.weight_time_type = this.weight_time_type;
            }
            await this.$send_req(prefix + '/export_plans', export_params);
            this.go_records_and_refresh();
        },
        get_stuff: async function (pageNo) {
            if (this.$has_module('stuff')) {
                let ret = await this.$send_req('/stuff/get_all', {
                    pageNo: pageNo
                });
                return ret.stuff;
            } else {
                return [];
            }
        },
        export_rate: async function () {
            await this.$send_req('/sale_management/export_exe_rate', {
                start_time: this.begin_date,
                end_time: this.end_date,
            });
            this.go_records_and_refresh();
        },
        export_balance: async function () {
            await this.$send_req('/cash/export_history', {
                contract_id: this.contract_filter.id,
                begin_time: this.begin_date,
                end_time: this.end_date,
            });
            this.go_records_and_refresh();
        },
        export_weight_ticket: async function (ticket_type) {
            try {
                await this.$send_req('/global/download_ticket_zip', {
                    start_time: this.begin_date,
                    end_time: this.end_date,
                    ticket_type: ticket_type,
                    only_finished: true,
                });
                this.go_records_and_refresh();
            } catch (error) {
                uni.showToast({
                    title: error,
                    icon: 'none',
                    duration: 2000
                });
            }
        },
        export_sc_contents: async function (export_type) {
            try {
                await this.$send_req('/global/download_sc_contents_zip', {
                    start_time: this.begin_date,
                    end_time: this.end_date,
                    export_type: export_type,
                });
                this.go_records_and_refresh();
            } catch (error) {
                uni.showToast({
                    title: error,
                    icon: 'none',
                    duration: 2000
                });
            }
        },
        export_fc_contents: async function () {
            try {
                await this.$send_req('/sc/export_fc_table', {
                    start_time: this.begin_date,
                    end_time: this.end_date,
                });
                this.go_records_and_refresh();
            } catch (error) {
                uni.showToast({
                    title: error,
                    icon: 'none',
                    duration: 2000
                });
            }
        },
        export_driver_exam: async function () {
            try {
                await this.$send_req('/exam/export_exam_papers', {
                    start_time: this.begin_date,
                    end_time: this.end_date,
                });
                this.go_records_and_refresh();
            } catch (error) {
                uni.showToast({
                    title: error,
                    icon: 'none',
                    duration: 2000
                });
            }
        },
        get_sale_contract: async function (pageNo) {
            if (!this.$has_module('sale_management')) {
                return [];
            }
            let ret = await this.$send_req('/sale_management/contract_get', {
                pageNo: pageNo
            });
            ret.contracts.forEach(item => {
                item.name = item.company.name;
            });
            return ret.contracts;
        },
        get_customers: async function (pageNo) {
            let companies = [];
            if (this.$has_module('sale_management')) {
                let ret = await this.$send_req('/sale_management/contract_get', {
                    pageNo: pageNo
                });
                companies = companies.concat(ret.contracts);
            }
            if (this.$has_module('buy_management')) {
                let ret = await this.$send_req('/buy_management/contract_get', {
                    pageNo: pageNo
                });
                companies = companies.concat(ret.contracts);
            }
            let ret = [];
            companies.forEach(item => {
                ret.push({
                    id: item.company.id,
                    name: item.company.name,
                });
            });
            return ret;
        },
    },
    async onLoad() {
        let today = new Date();
        let five_days_before = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
        this.begin_date = utils.dateFormatter(five_days_before, 'y-m-d', 4, false);
        this.end_date = utils.dateFormatter(today, 'y-m-d', 4, false);

        this.begin_hour = today.getHours().toString().padStart(2, '0');
        this.begin_minute = today.getMinutes().toString().padStart(2, '0');
        this.begin_second = today.getSeconds().toString().padStart(2, '0');

        this.end_hour = today.getHours().toString().padStart(2, '0');
        this.end_minute = today.getMinutes().toString().padStart(2, '0');
        this.end_second = today.getSeconds().toString().padStart(2, '0');

        try {
            let self_info = uni.getStorageSync('self_info');
            this.company_is_group = !!(self_info && self_info.company_is_group);
            this.self_company_id = self_info && self_info.company_id != null ? self_info.company_id : null;
        } catch (e) {
            console.warn('读取 self_info 失败，使用默认值:', e);
            this.company_is_group = false;
            this.self_company_id = null;
        }
        if (this.company_is_group) {
            try {
                let ret = await this.$send_req('/global/home_stat_scope_list', {});
                this.stat_scopes = (ret && ret.scopes) || [];
            } catch (e) {
                console.warn('获取 home_stat_scope_list 失败，使用默认值:', e);
                this.stat_scopes = [];
            }
        }
    },
    onPullDownRefresh() {
        if (this.$refs.dr) {
            this.$refs.dr.refresh();
        }
        uni.stopPullDownRefresh();
    },
    onShow() {
        setTabBarSelected();
    },
}
</script>

<style scoped>
.export-page {
    position: relative;
    min-height: 100vh;
    background: #F2F4FA;
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
    overflow: hidden;
}

.page-mesh {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 520rpx;
    background:
        radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.22) 0%, transparent 30%),
        radial-gradient(circle at 88% 8%, rgba(109, 140, 255, 0.4) 0%, transparent 34%),
        linear-gradient(180deg, #2F3FCF 0%, #465CFF 55%, #8BA0FF 82%, #F2F4FA 100%);
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
    top: 180rpx;
    right: -120rpx;
    width: 420rpx;
    height: 420rpx;
    background: radial-gradient(circle, rgba(125, 255, 179, 0.18) 0%, rgba(125, 255, 179, 0) 70%);
}

.page-glow-b {
    top: 520rpx;
    left: -160rpx;
    width: 460rpx;
    height: 460rpx;
    background: radial-gradient(circle, rgba(70, 92, 255, 0.35) 0%, rgba(70, 92, 255, 0) 72%);
}

.page-glow-c {
    display: none;
}

.hero-bleed {
    position: relative;
    z-index: 1;
    padding: 12rpx 28rpx 8rpx;
    overflow: hidden;
}

.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -40rpx;
    width: 280rpx;
    height: 280rpx;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
}

.hero-logo-img {
    width: 280rpx;
    height: 280rpx;
    opacity: 0.34;
    transform: translate(18%, -8%);
}

.hero-copy-block {
    position: relative;
    z-index: 1;
    padding: 8rpx 8rpx 28rpx;
}

.hero-title {
    display: block;
    font-size: 56rpx;
    color: #FFFFFF;
    font-weight: 800;
    letter-spacing: 2rpx;
    line-height: 1.15;
    text-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.28);
}

.hero-sub {
    display: block;
    margin-top: 14rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.5;
    max-width: 560rpx;
}

.date-deck {
    position: relative;
    z-index: 1;
    border-radius: 28rpx;
    overflow: hidden;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.1));
    border: 1rpx solid rgba(255, 255, 255, 0.38);
    box-shadow: 0 28rpx 60rpx rgba(6, 12, 48, 0.42);
    padding: 22rpx 22rpx 18rpx;
}

.date-deck-glow {
    position: absolute;
    top: -40rpx;
    right: -20rpx;
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    pointer-events: none;
}

.date-deck-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.date-col {
    flex: 1;
    min-width: 0;
}

.date-col.right {
    text-align: right;
}

.date-cap {
    display: block;
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 2rpx;
}

.date-num {
    display: block;
    margin-top: 8rpx;
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 800;
}

.date-mid {
    width: 100rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
}

.date-mid-line {
    width: 36rpx;
    height: 2rpx;
    background: rgba(255, 255, 255, 0.35);
}

.date-mid-text {
    margin: 8rpx 0;
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.75);
}

.date-cta {
    position: relative;
    z-index: 1;
    margin-top: 18rpx;
    align-self: stretch;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    height: 64rpx;
    border-radius: 18rpx;
    background: #FFFFFF;
    box-shadow: 0 10rpx 24rpx rgba(20, 30, 90, 0.22);
}

.date-cta-text {
    margin-left: 10rpx;
    font-size: 26rpx;
    color: #2F3FCF;
    font-weight: 800;
}

.mode-tabs {
    position: relative;
    z-index: 1;
    margin-top: 22rpx;
    display: flex;
    flex-direction: row;
    padding: 8rpx;
    border-radius: 999rpx;
    background: rgba(8, 14, 56, 0.35);
    border: 1rpx solid rgba(255, 255, 255, 0.16);
}

.mode-tab {
    flex: 1;
    height: 68rpx;
    border-radius: 999rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mode-tab.on {
    background: #FFFFFF;
    box-shadow: 0 10rpx 24rpx rgba(8, 14, 56, 0.28);
}

.mode-tab-text {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.72);
    font-weight: 700;
}

.mode-tab.on .mode-tab-text {
    color: #2F3FCF;
}

.content-stack {
    position: relative;
    z-index: 1;
    margin-top: 20rpx;
    padding: 28rpx 24rpx 8rpx;
    background: #F2F4FA;
    border-radius: 36rpx 36rpx 0 0;
    min-height: 60vh;
}

.export-panels {
    padding-top: 0;
}

.block {
    margin-bottom: 28rpx;
}

.block-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 16rpx;
    padding: 0 4rpx;
}

.block-mark {
    width: 12rpx;
    height: 40rpx;
    border-radius: 8rpx;
    margin-right: 14rpx;
    box-shadow: 0 8rpx 18rpx rgba(70, 92, 255, 0.28);
}

.mark-blue { background: linear-gradient(180deg, #6B7CFF, #2F3FCF); }
.mark-cyan { background: linear-gradient(180deg, #5AD8D8, #13C2C2); }
.mark-orange { background: linear-gradient(180deg, #FFB06B, #FF8A2B); }
.mark-indigo { background: linear-gradient(180deg, #8BA0FF, #465CFF); }
.mark-green { background: linear-gradient(180deg, #6FDB9A, #2DBE6C); }

.block-titles {
    flex: 1;
    min-width: 0;
}

.block-title {
    display: block;
    font-size: 32rpx;
    color: #121833;
    font-weight: 800;
}

.block-en {
    display: block;
    margin-top: 2rpx;
    font-size: 16rpx;
    color: #8A94A6;
    letter-spacing: 2rpx;
}

.list-hint {
    font-size: 20rpx;
    color: #8A94A6;
}

.control-deck {
    margin-bottom: 16rpx;
    padding: 22rpx;
    border-radius: 28rpx;
    background: #FFFFFF;
    box-shadow: 0 18rpx 40rpx rgba(24, 36, 90, 0.1);
    border: 1rpx solid rgba(255, 255, 255, 0.9);
}

.balance-panel {
    border-radius: 28rpx;
    overflow: hidden;
    background: #FFFFFF;
    box-shadow: 0 18rpx 40rpx rgba(24, 36, 90, 0.1);
    border: 1rpx solid #F0E4D6;
}

.balance-select {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 18rpx 20rpx;
    background: linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%);
    border-bottom: 1rpx solid #F5E8D8;
}

.balance-select-meta {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
    margin-right: 12rpx;
}

.balance-select-label {
    margin-left: 10rpx;
    font-size: 24rpx;
    color: #8A5A2B;
    font-weight: 700;
}

.balance-select .data-filter {
    margin: 0;
}

.balance-cta {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 26rpx 24rpx;
    background: linear-gradient(145deg, #FFA35A 0%, #FF8A2B 55%, #E56F12 100%);
}

.balance-cta-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
    min-width: 0;
    margin-right: 12rpx;
}

.balance-cta-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.22);
    border: 1rpx solid rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.balance-cta-copy {
    flex: 1;
    min-width: 0;
}

.balance-cta-title {
    display: block;
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 800;
}

.balance-cta-desc {
    display: block;
    margin-top: 6rpx;
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.82);
}

.balance-cta-go {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #FFFFFF;
    font-weight: 800;
}

.deck-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.deck-row.mt {
    margin-top: 18rpx;
}

.deck-label {
    font-size: 22rpx;
    color: #8A94A6;
}

.deck-value {
    font-size: 26rpx;
    color: #121833;
    font-weight: 700;
}

.deck-actions {
    display: flex;
    flex-direction: row;
    margin-top: 16rpx;
}

.deck-btn {
    margin-right: 12rpx;
    padding: 12rpx 22rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
}

.deck-btn.solid {
    background: #2F3FCF;
    color: #FFFFFF;
}

.deck-btn.ghost {
    background: #EEF1F8;
    color: #6B7388;
}

.deck-filters {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 18rpx;
    padding-top: 16rpx;
    border-top: 1rpx dashed #E4E8F2;
}

.tile-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin: 0 -8rpx;
}

.tile-cell {
    width: 50%;
    box-sizing: border-box;
    padding: 8rpx;
}

.tile-grid.single .tile-cell {
    width: 100%;
}

.empty-export {
    margin: 24rpx 0 12rpx;
    padding: 64rpx 40rpx;
    border-radius: 28rpx;
    background: #FFFFFF;
    box-shadow: 0 14rpx 32rpx rgba(24, 36, 90, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
}

.empty-export-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 28rpx;
    background: #F3F5FF;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22rpx;
}

.empty-export-title {
    font-size: 30rpx;
    color: #121833;
    font-weight: 800;
}

.empty-export-desc {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #8A94A6;
    text-align: center;
    line-height: 1.5;
}

.tile {
    position: relative;
    min-height: 220rpx;
    border-radius: 28rpx;
    padding: 24rpx 22rpx 20rpx;
    overflow: hidden;
    box-shadow: 0 22rpx 40rpx rgba(24, 36, 90, 0.22);
}

.tile.wide {
    min-height: 168rpx;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.tile-blue {
    background: linear-gradient(145deg, #5B6FFF 0%, #2F3FCF 58%, #2436B8 100%);
}

.tile-cyan {
    background: linear-gradient(145deg, #3ED4D4 0%, #13C2C2 55%, #0EA0A0 100%);
}

.tile-orange {
    background: linear-gradient(145deg, #FFA35A 0%, #FF8A2B 55%, #E56F12 100%);
}

.tile-indigo {
    background: linear-gradient(145deg, #7A8CFF 0%, #465CFF 58%, #3348D8 100%);
}

.tile-green {
    background: linear-gradient(145deg, #55D68C 0%, #2DBE6C 55%, #1FA85A 100%);
}

.tile-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 20rpx;
    background: rgba(255, 255, 255, 0.2);
    border: 1rpx solid rgba(255, 255, 255, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18rpx;
    flex-shrink: 0;
}

.tile.wide .tile-icon {
    margin-bottom: 0;
    margin-right: 18rpx;
}

.tile-copy {
    flex: 1;
    min-width: 0;
    margin-right: 12rpx;
}

.tile-title {
    display: block;
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 800;
    line-height: 1.25;
}

.tile-desc {
    display: block;
    margin-top: 8rpx;
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.78);
}

.tile-go {
    display: block;
    margin-top: 22rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.92);
    font-weight: 700;
}

.tile.wide .tile-go {
    margin-top: 0;
    flex-shrink: 0;
}

.record-item {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 14rpx;
    padding: 24rpx 22rpx 24rpx 28rpx;
    border-radius: 24rpx;
    background: #FFFFFF;
    box-shadow: 0 14rpx 32rpx rgba(24, 36, 90, 0.1);
    overflow: hidden;
}

.record-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 10rpx;
}

.record-accent.ok { background: linear-gradient(180deg, #6B7CFF, #2F3FCF); }
.record-accent.pending { background: linear-gradient(180deg, #FFB06B, #FF8A2B); }
.record-accent.fail { background: linear-gradient(180deg, #FF8A8B, #FF4D4F); }

.record-body {
    flex: 1;
    min-width: 0;
    margin-right: 12rpx;
}

.record-name {
    display: block;
    font-size: 26rpx;
    color: #121833;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.record-time {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #8A94A6;
}

.record-status {
    flex-shrink: 0;
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
}

.record-status.ok { background: rgba(47, 63, 207, 0.12); }
.record-status.pending { background: rgba(255, 138, 43, 0.14); }
.record-status.fail { background: rgba(255, 77, 79, 0.14); }

.record-status-text {
    font-size: 22rpx;
    font-weight: 800;
}

.record-status.ok .record-status-text { color: #2F3FCF; }
.record-status.pending .record-status-text { color: #FF8A2B; }
.record-status.fail .record-status-text { color: #FF4D4F; }
</style>

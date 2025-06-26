<template>
<view>
    <u-subsection :list="sub_pages" :current="cur_page" @change="sectionChange"></u-subsection>
    <view v-if="cur_page == 0">
        <u-cell-group title="时间段">
            <u-cell :title="begin_date + '~' + end_date">
                <fui-button slot="right-icon" text="选择日期" @click="show_plan_date = true" btnSize="mini" type="warning"></fui-button>
            </u-cell>
        </u-cell-group>
        <fui-date-picker range :show="show_plan_date" type="3" :value="begin_date" :valueEnd="end_date" @change="choose_date" @cancel="show_plan_date = false"></fui-date-picker>
        <u-divider lineColor="blue"></u-divider>
        <module-filter :rm_array="['sale_management', 'buy_management', 'supplier', 'customer']">
            <u-cell-group title="订单明细导出">
                <module-filter :rm_array="['sale_management', 'buy_management']">
                    <view>
                        <view class="time-display">
                            <text class="time-text">{{ begin_hour }}:{{ begin_minute }}:{{ begin_second }}</text>
                            <text class="divider">-</text>
                            <text class="time-text">{{ end_hour }}:{{ end_minute }}:{{ end_second }}</text>
                            <fui-button btnSize="mini" type="gray" text="清除时间" @click="clearTime" style="margin-left: 10px;" />
                        </view>
                        <view style="display: flex;justify-content: center; gap: 10px;">
                            <fui-button btnSize="mini" type="warning" @click="show_start_time = true">开始时间</fui-button>
                            <fui-button btnSize="mini" type="warning" @click="show_end_time = true">结束时间</fui-button>
                        </view>
                        <fui-date-picker type="7" :show="show_start_time" :hour="begin_hour" :minute="begin_minute" :second="begin_second" @change="handleBeginTimeChange" @cancel="show_start_time = false" />
                        <fui-date-picker type="7" :show="show_end_time" :hour="end_hour" :minute="end_minute" :second="end_second" @change="handleEndTimeChange" @cancel="show_end_time = false" />
                    </view>
                    <view style="display:flex; justify-content: start;">
                        <data-filter filter_name="公司" :get_func="get_customers" search_key="name" tag_color="success" v-model="company_filter"></data-filter>
                        <data-filter filter_name="物料" :get_func="get_stuff" search_key="name" tag_color="purple" v-model="stuff_filter"></data-filter>
                    </view>
                </module-filter>
                <module-filter v-for="(single_module, index) in all_module" :key="index" :require_module="single_module">
                    <u-cell :title="button_name[index]" isLink @click="export_plan('/' + single_module)"></u-cell>
                </module-filter>
            </u-cell-group>
        </module-filter>
        <u-divider lineColor="blue"></u-divider>
        <module-filter require_module="sale_management">
            <u-cell-group title="执行率导出">
                <u-cell title="导出" isLink @click="export_rate()"></u-cell>
            </u-cell-group>
        </module-filter>
        <u-divider lineColor="blue"></u-divider>
        <module-filter require_module="cash">
            <module-filter require_module="stuff">
                <u-cell-group title="余额明细导出">
                    <data-filter filter_name="公司" :get_func="get_sale_contract" search_key="name" tag_color="success" v-model="contract_filter"></data-filter>
                    <u-cell title="导出" isLink @click="export_balance()"></u-cell>
                </u-cell-group>
            </module-filter>
        </module-filter>
        <u-divider lineColor="blue"></u-divider>
        <module-filter :rm_array="['sale_management', 'buy_management', 'supplier', 'customer']">
            <u-cell-group title="磅单导出">
                <module-filter v-for="(single_module, index) in all_module" :key="index" :require_module="single_module">
                    <u-cell :title="'导出' + button_name[index] + '磅单'" isLink @click="export_weight_ticket(single_module)"></u-cell>
                </module-filter>
            </u-cell-group>
        </module-filter>
        <u-divider lineColor="blue"></u-divider>
        <module-filter :rm_array="['sale_management', 'buy_management', 'supplier', 'customer']">
            <u-cell-group title="安检登记表导出">
                <module-filter v-for="(single_module, index) in all_module" :key="index" :require_module="single_module">
                    <u-cell :title="'导出' + button_name[index] + '安检登记表'" isLink @click="export_sc_contents(single_module)"></u-cell>
                </module-filter>
            </u-cell-group>
        </module-filter>
        <u-divider lineColor="blue"></u-divider>
        <module-filter :rm_array="['sale_management', 'buy_management']">
            <u-cell-group title="现场检查表导出">
                <u-cell title="导出现场检查表" isLink @click="export_fc_contents()"></u-cell>
            </u-cell-group>
        </module-filter>
    </view>
    <view v-if="cur_page == 1">
        <list-show ref="dr" :fetch_function="get_export_record" height="90vh" v-model="records">
            <view v-for="item in records" :key="item.id">
                <u-cell :title="item.name" :label="item.create_time" :value="status_string(item.url)" :isLink="item.url != undefined" @click="download_file(item.url)"></u-cell>
            </view>
        </list-show>
    </view>
</view>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
import ListShow from '../components/ListShow.vue';
import ModuleFilter from '../components/ModuleFilter.vue';
import DataFilter from '../components/DataFilter.vue';
export default {
    name: 'Export',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilter,
        "data-filter": DataFilter,
    },
    data: function () {
        return {
            begin_hour: '',
            begin_minute: '',
            begin_second: '',
            end_hour: '',
            end_minute: '',
            end_second: '',
            status_string: function (url) {
                let ret = '正在导出';
                if (url == 'no') {
                    ret = "导出失败";
                } else if (url) {
                    ret = '下载';
                }
                return ret;
            },
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
            sub_pages: ['执行导出', '导出记录'],
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
        };
    },
    methods: {
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
            return res.records;
        },
        sectionChange(index) {
            this.cur_page = index;
        },
        choose_date: function (e) {
            this.show_plan_date = false;
            this.begin_date = e.startDate.result;
            this.end_date = e.endDate.result;
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
            }
            await this.$send_req(prefix + '/export_plans', export_params);
            this.cur_page = 1;
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
            this.cur_page = 1;
        },
        export_balance: async function () {
            await this.$send_req('/cash/export_history', {
                contract_id: this.contract_filter.id,
                begin_time: this.begin_date,
                end_time: this.end_date,
            });
            this.cur_page = 1;
        },
        export_weight_ticket: async function (ticket_type) {
            try {
                await this.$send_req('/global/download_ticket_zip', {
                    start_time: this.begin_date,
                    end_time: this.end_date,
                    ticket_type: ticket_type,
                });
                this.cur_page = 1;
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
                this.cur_page = 1;
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
                this.cur_page = 1;
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
    onLoad() {
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
    },
    onPullDownRefresh() {
        this.$refs.dr.refresh();
        uni.stopPullDownRefresh();
    },

}
</script>

<style>
.time-display {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 15px;
    background-color: #f5f5f5;
    border-radius: 8px;
    margin: 10px 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.time-text {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    min-width: 80px;
    text-align: center;
}

.divider {
    margin: 0 10px;
    color: #999;
    font-size: 14px;
}
</style>

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
            <u-cell-group title="计划导出">
                <module-filter :rm_array="['sale_management', 'buy_management']">
                    <view style="display:flex; justify-content: start;">
                        <data-filter filter_name="公司" :get_func="get_customers" search_key="name" tag_color="success" v-model="company_filter"></data-filter>
                        <data-filter filter_name="物料" :get_func="get_stuff" search_key="name" tag_color="purple" v-model="stuff_filter"></data-filter>
                    </view>
                </module-filter>
                <module-filter v-for="(single_module, index) in all_module" :key="index" :require_module="single_module">
                    <u-cell :title="'导出' + button_name[index] + '计划'" isLink @click="export_plan('/' + single_module)"></u-cell>
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
        <module-filter :rm_array="['sc']">
            <u-cell-group title="磅单导出">
                <u-cell title="导出" isLink @click="export_weight_ticket()"></u-cell>
            </u-cell-group>
        </module-filter>
    </view>
    <view v-if="cur_page == 1">
        <list-show ref="dr" :fetch_function="get_export_record" height="90vh" v-model="records">
            <view v-for="item in records" :key="item.id">
                <u-cell :title="item.name" :label="item.create_time" :value="status_string(item.url)" :isLink="item.url != undefined" @click="download_file(item.url,item.name)"></u-cell>
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
                '被采购', '被销售', '采购', '销售'
            ],
        };
    },
    methods: {
        download_file: function (url, name) {
            if (name == '磅单导出') {
                this.download_zip_file(url);
            } else {
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

            }
        },
        download_zip_file: function (url) {
            try {
                uni.downloadFile({
                    url: this.$convert_attach_url(url),
                    success: (res) => {
                        if (res.statusCode === 200) {
                            uni.saveFile({
                                tempFilePath: res.tempFilePath,
                                success: (res) => {
                                    uni.showToast({
                                        title: '下载成功',
                                        icon: 'success',
                                        duration: 2000
                                    });
                                },
                                fail: () => {
                                    uni.showToast({
                                        title: '下载失败',
                                        icon: 'none',
                                        duration: 2000
                                    });
                                }
                            });
                        }
                    },
                    fail: () => {
                        uni.showToast({
                            title: '下载失败',
                            icon: 'none',
                            duration: 2000
                        });
                    }
                });
            } catch (error) {
                uni.showToast({
                    title: '下载失败',
                    icon: 'none',
                    duration: 2000
                });
            }
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
            await this.$send_req(prefix + '/export_plans', {
                start_time: this.begin_date,
                end_time: this.end_date,
                stuff_id: this.stuff_filter.id,
                company_id: this.company_filter.id,
            });
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
        export_weight_ticket: async function () {
            await this.$send_req('/global/download_ticket_zip', {
                begin_time: this.begin_date,
                end_time: this.end_date,
            });

            this.cur_page = 1;
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
    },
    onPullDownRefresh() {
        this.$refs.dr.refresh();
        uni.stopPullDownRefresh();
    },
}
</script>

<style></style>

<template>
<div class="dashboard-container">
    <el-alert v-if="!can_view_dashboard" title="当前操作主体暂无查看权限，无法查看首页统计数据。" type="warning" :closable="false" show-icon style="margin-bottom: 10px;" />
    <template v-else>
        <el-row :gutter="10">
            <el-col :span="12">
                <el-card class="box-card" :body-style="{padding : 10}">
                    <el-row>
                        <el-col :span="12" v-for="(chartOption, index) in charts" :key="index">
                            <div class="grid-content bg-purple-dark">
                                <ChartComponent :chartOption="chartOption" />
                            </div>
                        </el-col>
                    </el-row>
                </el-card>
            </el-col>
            <el-col :span="12">
                <el-card class="box-card" :body-style="{padding : 0}" v-if="module_filter('sale_management')">
                    <div slot="header" class="clearfix">
                        <span>客户统计</span>
                        <el-date-picker v-model="statistic_day" type="date" placeholder="选择日期" @change="base_day_change" value-format="yyyy-MM-dd">
                        </el-date-picker>
                        <el-radio-group v-model="day_offset" size="medium" @change="init_statistic" style="float: right; padding: 3px 0">
                            <el-radio-button label="-1">前日</el-radio-button>
                            <el-radio-button label="0">当日</el-radio-button>
                            <el-radio-button label="1">翌日</el-radio-button>
                        </el-radio-group>
                    </div>
                    <div class="grid-content bg-purple-dark">
                        <page-content ref="statistic" body_key="statistic" :req_body="statistic_table_body" :req_url="req_url" :enable="true" @data_loaded="stat_loading = false">
                            <template v-slot:default="slotProps">
                                <el-table ref="stat_table" v-loading="stat_loading" :data="slotProps.content" stripe style="width: 100%" max-height="300" show-summary>
                                    <el-table-column prop="company.name" label="客户">
                                    </el-table-column>
                                    <el-table-column prop="confirm_count" min-width="25" label="总数">
                                    </el-table-column>
                                    <el-table-column prop="cancel_count" min-width="25" label="取消">
                                    </el-table-column>
                                    <el-table-column prop="finish_count" min-width="25" label="完成">
                                    </el-table-column>
                                </el-table>
                            </template>
                        </page-content>
                    </div>
                </el-card>

                <el-card class="box-card" :body-style="{padding : 0}" v-if="module_filter('stuff')">
                    <div slot="header" class="clearfix">
                        <span>物料统计</span>
                    </div>
                    <div class="grid-content bg-purple-dark">
                        <el-table ref="stuff_count_table" v-loading="stat_loading" :data="tableData" stripe style="width: 100%">
                            <el-table-column prop="name" label="物料名称"></el-table-column>
                            <el-table-column prop="yesterday_count" label="昨天" min-width="25"></el-table-column>
                            <el-table-column prop="today_count" label="今天" min-width="25"></el-table-column>
                            <el-table-column prop="second_unit" label="单位" min-width="25"></el-table-column>
                        </el-table>
                    </div>
                </el-card>

                <el-card class="box-card" :body-style="{padding : 0}" v-if="module_filter('customer')">
                    <div slot="header" class="clearfix">
                        <span>采购提单</span>
                    </div>

                    <div class="grid-content bg-purple-dark">
                        <page-content ref="sb_page" body_key="stuff" :req_body="stuff_list_req_body" :req_url="sb_url" :enable="true" @data_loaded="sb_loading = false">
                            <template v-slot:default="slotProps">
                                <el-table ref="sb_table" v-loading="sb_loading" :data="slotProps.content.filter(item => item.price != -1)" stripe style="width: 100%" max-height="400">
                                    <el-table-column prop="name" label="名称" min-width="40"></el-table-column>
                                    <el-table-column prop="company.name" label="公司"></el-table-column>
                                    <el-table-column prop="price" label="价格" min-width="40">
                                    </el-table-column>
                                    <el-table-column prop="comment" label="备注" min-width="40">
                                    </el-table-column>
                                    <el-table-column label="操作">
                                        <template slot-scope="scope">
                                            <el-button size="mini" type="primary" @click="start_plan_creation(scope.row)" min-width="40">下单</el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>

                            </template>

                        </page-content>
                    </div>
                </el-card>

                <el-card class="box-card" :body-style="{padding : 0}" v-if="module_filter('supplier')">
                    <div slot="header" class="clearfix">
                        <span>销售提单</span>
                    </div>

                    <div class="grid-content bg-purple-dark">
                        <page-content ref="ss_page" body_key="stuff" :req_body="stuff_list_req_body" :req_url="ss_url" :enable="true" @data_loaded="ss_loading = false">
                            <template v-slot:default="slotProps">
                                <el-table ref="sb_table" v-loading="ss_loading" :data="slotProps.content" stripe style="width: 100%" max-height="400">
                                    <el-table-column prop="name" label="名称" min-width="40"></el-table-column>
                                    <el-table-column prop="company.name" label="公司"></el-table-column>
                                    <el-table-column prop="price" label="价格" min-width="40">
                                    </el-table-column>
                                    <el-table-column prop="comment" label="备注" min-width="40">
                                    </el-table-column>
                                    <el-table-column label="操作">
                                        <template slot-scope="scope">
                                            <el-button v-if="scope.row.price != -1" size="mini" type="primary" @click="start_plan_creation(scope.row, true)" min-width="40">下单</el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </template>
                        </page-content>
                    </div>
                </el-card>
            </el-col>
        </el-row>
        <el-row :gutter="10">
            <el-col :span="12">
                <div class="grid-content bg-purple-dark" v-if="module_filter('stuff')">
                    <el-card class="box-card">
                        <div slot="header" class="clearfix">
                            <span>通知管理</span>
                            <el-button style="float: right;" @click="save_notice" size="mini" type="primary">保存</el-button>
                        </div>
                        <el-form ref="form" :model="notice" label-width="80px">
                            <el-form-item label="下单通知">
                                <el-input type="textarea" :autosize="{ minRows: 3, maxRows: 5}" placeholder="请输入内容" maxlength="2000" show-word-limit v-model="notice.notice"></el-input>
                            </el-form-item>
                            <el-form-item label="司机通知">
                                <el-input type="textarea" :autosize="{ minRows: 3, maxRows: 5}" placeholder="请输入内容" maxlength="2000" show-word-limit v-model="notice.driver_notice"></el-input>
                            </el-form-item>
                        </el-form>

                    </el-card>
                </div>
            </el-col>
            <el-col :span="12">
                <div class="grid-content bg-purple-dark">
                    <el-card class="box-card">
                        <div slot="header" class="clearfix">
                            <span>智能导出</span>
                            <el-button style="float: right;" @click="llm_record_show = true" size="mini" type="primary">操作历史</el-button>
                        </div>
                        <el-input ref="llm_export_input" type="textarea" :autosize="{ minRows: 3, maxRows: 5}" placeholder="请输入导出内容描述" maxlength="2000" show-word-limit v-model="llm_export_content"></el-input>
                        <el-button type="primary" :loading="llm_export_loading" :disabled="!llm_export_content.trim()" @click="execute_llm_export">执行</el-button>
                    </el-card>
                </div>
            </el-col>
        </el-row>
        <el-dialog title="智能导出" :visible.sync="llm_step_show" width="560px">
            <div class="llm-step-content">
                <el-alert title="请求已提交，后台正在生成导出文件。" type="success" :closable="false" show-icon></el-alert>
                <div class="llm-step-label">导出内容描述</div>
                <div class="llm-step-description">{{ llm_step_description }}</div>
                <el-button type="text" @click="open_llm_history">查看操作历史</el-button>
            </div>
        </el-dialog>
        <el-drawer title="智能导出操作历史" :visible.sync="llm_record_show" direction="rtl" size="70%">
            <page-content v-if="llm_record_show" body_key="records" req_url="/global/list_le_records" :enable="true">
                <template v-slot:default="slotProps">
                    <el-table :data="slotProps.content" stripe style="width: 100%" height="calc(100vh - 180px)">
                        <el-table-column prop="export_time" label="请求时间" width="160"></el-table-column>
                        <el-table-column prop="export_description" label="导出内容描述" min-width="220" show-overflow-tooltip></el-table-column>
                        <el-table-column label="状态" width="100">
                            <template slot-scope="scope">
                                <el-tag v-if="scope.row.status === 0" type="warning">处理中</el-tag>
                                <el-tag v-else-if="scope.row.status === 1" type="success">成功</el-tag>
                                <el-tag v-else type="danger">失败</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="spend" label="耗时(秒)" width="100"></el-table-column>
                        <el-table-column label="结果" min-width="160">
                            <template slot-scope="scope">
                                <el-button v-if="scope.row.status === 1 && scope.row.export_result" type="text" @click="$download_file(scope.row.export_result, '智能导出_' + scope.row.id + '.csv')">下载文件</el-button>
                                <span v-else-if="scope.row.status === 2" class="llm-export-error" :title="scope.row.export_result">{{ scope.row.export_result || '导出失败' }}</span>
                                <span v-else-if="scope.row.status === 0">正在生成文件</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="100">
                            <template slot-scope="scope">
                                <el-button type="text" @click="edit_llm_record(scope.row)">再次编辑</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </template>
            </page-content>
        </el-drawer>
    </template>
</div>
</template>

<script>
import {
    mapGetters
} from 'vuex'
import ChartComponent from '../components/Charts.vue';
import page_content from '../components/PageContent.vue';
import moment from 'moment';

function hasCanViewPermission(scope) {
    return !!scope;
}

export default {
    name: 'Dashboard',
    components: {
        ChartComponent,
        'page-content': page_content,
    },
    computed: {
        ...mapGetters([
            'name',
            'roles',
            'globalStatCompanyIsGroup',
            'globalStatSelfCompanyId',
            'globalStatScopes',
            'globalStatContextCompanyId',
        ]),
        can_view_dashboard() {
            if (!this.globalStatCompanyIsGroup) {
                return true;
            }
            if (this.globalStatContextCompanyId == null) {
                return false;
            }
            if (String(this.globalStatContextCompanyId) === String(this.globalStatSelfCompanyId)) {
                return true;
            }
            const selectedScope = (this.globalStatScopes || []).find(
                (s) => s && String(s.id) === String(this.globalStatContextCompanyId)
            );
            return hasCanViewPermission(selectedScope);
        },
        statistic_table_body() {
            return {
                day_offset: +this.day_offset,
                base_day: this.statistic_day,
                stat_context_company_id: this.globalStatContextCompanyId,
            };
        },
        stuff_list_req_body() {
            return {
                stat_context_company_id: this.globalStatContextCompanyId,
            };
        },
    },
    data() {
        return {
            llm_export_content: '',
            llm_record_show: false,
            llm_step_show: false,
            llm_step_description: '',
            llm_export_loading: false,
            statistic_day: moment().format('YYYY-MM-DD'),
            stat_loading: true,
            sb_loading: true,
            ss_loading: true,
            day_offset: "0",
            tableData: [],
            charts: [],
            notice: {
                notice: '',
                driver_notice: '',
            },
            req_url: '/sale_management/get_count_by_customer',
            sb_url: '/customer/get_stuff_on_sale',
            ss_url: '/supplier/get_stuff_need_buy',
        }
    },
    async mounted() {
        await this.$store.dispatch('statScope/initialize', {
            force: true
        });
        this.init_brief_info();
        this.init_statistic();
        this.show_today_yesterday();
    },
    watch: {
        globalStatContextCompanyId: function (newVal, oldVal) {
            if (newVal === oldVal) {
                return;
            }
            this.on_stat_scope_change();
        },
    },

    methods: {
        on_stat_scope_change: function () {
            if (!this.can_view_dashboard) {
                return;
            }
            this.init_brief_info();
            this.init_statistic();
            this.show_today_yesterday();
            if (this.$refs.statistic) {
                this.$refs.statistic.refresh(1);
            }
            if (this.$refs.sb_page) {
                this.$refs.sb_page.refresh(1);
            }
            if (this.$refs.ss_page) {
                this.$refs.ss_page.refresh(1);
            }
        },
        show_today_yesterday: async function () {
            if (!this.can_view_dashboard) {
                return;
            }
            if (!this.$hasPermission('stuff')) {
                return;
            }
            this.stat_loading = true;
            let resp = await this.$send_req('/stuff/get_count_by_today_yesterday', {
                stat_context_company_id: this.globalStatContextCompanyId,
            });
            this.tableData = resp.statistic;
            this.tableData.forEach(item => {
                if (item.second_unit == '吨') {
                    item.yesterday_count = item.yesterday_count.toFixed(2)
                    item.today_count = item.today_count.toFixed(2)
                } else {
                    item.yesterday_count = item.yesterday_count.toFixed(item.second_unit_decimal)
                    item.today_count = item.today_count.toFixed(item.second_unit_decimal)
                }
            });
        },
        save_notice: async function () {
            await this.$send_req('/stuff/set_notice', this.notice);
            this.$message({
                message: '保存成功',
                type: 'success'
            });
        },
        execute_llm_export: async function () {
            if (!this.llm_export_content.trim() || this.llm_export_loading) {
                return;
            }
            this.llm_export_loading = true;
            try {
                await this.$send_req('/global/llm_export', {
                    export_description: this.llm_export_content,
                });
                this.llm_step_description = this.llm_export_content;
                this.llm_step_show = true;
            } finally {
                this.llm_export_loading = false;
            }
        },
        open_llm_history: function () {
            this.llm_step_show = false;
            this.llm_record_show = true;
        },
        edit_llm_record: function (record) {
            this.llm_export_content = record.export_description || '';
            this.llm_record_show = false;
            this.$nextTick(() => {
                const input = this.$refs.llm_export_input;
                if (input && input.$el) {
                    input.$el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    input.focus();
                }
            });
        },
        start_plan_creation: function (item, is_sale) {
            let is_buy = 'false';
            if (is_sale) {
                is_buy = 'true'
            }
            this.$router.push('/subPage/OrderCreate?stuff_id=' + item.id + '&stuff_name=' + item.name + '&company_name=' + item.company.name + '&is_buy=' + is_buy + "&company_id=" + item.company.id);
        },
        chart_opt: function (title, subtitle, total_count, done_count) {
            return {
                title: {
                    text: title,
                    subtext: subtitle,
                    left: 'center',
                    bottom: '0'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: function (params) {
                        let result = `<div>${params[0].axisValue}</div>`;
                        params.forEach(function (param) {
                            result += `<div><span style="display: inline-block; margin-right: 5px; width: 10px; height: 10px; background-color: ${param.color}; border: 2px solid ${param.borderColor};"></span>${param.seriesName} ${param.value}</div>`;
                        });
                        return result;
                    }
                },
                toolbox: {},
                legend: {},
                xAxis: [{
                    type: 'category',
                    data: ['昨日', '今日', '明日'],
                    axisTick: {
                        show: false
                    },
                    axisLine: {
                        show: false
                    }
                }],
                yAxis: [{
                    type: 'value',
                    axisTick: {
                        show: false
                    },
                    axisLine: {
                        show: false
                    }
                }],
                series: [{
                        name: '已完成',
                        barGap: '-100%',
                        type: 'bar',
                        data: done_count, //已完成订单数
                        barWidth: '30%',
                        itemStyle: {
                            color: '#1890ff'
                        },
                        label: {
                            show: true,
                            position: 'insideBottom', // 数值显示在柱子内部底部
                            color: '#000'
                        }
                    },
                    {
                        name: '订单总数',
                        barGap: '-100%',
                        type: 'bar',
                        data: total_count, // 订单总数
                        barWidth: '30%',
                        itemStyle: {
                            color: 'rgba(0, 0, 0, 0)', // 透明填充色
                            borderColor: '#1890ff', // 边框颜色，这里设置为和已完成柱子相同的颜色，可按需调整
                            borderWidth: 2 // 边框宽度
                        },
                        // stack: 'total',  // 设置相同的堆叠名称
                        label: {
                            show: true,
                            position: 'top',
                            color: '#000',

                        },
                        // z: -1  // 调整图层顺序，让透明柱子在底层
                    }
                ]
            };
        },
        init_statistic: async function () {
            if (!this.can_view_dashboard) {
                return;
            }
            if (!this.$hasPermission('sale_management')) {
                return
            }
            this.stat_loading = true;
            this.$refs.statistic.refresh();
        },

        init_data_brief: async function () {
            if (!this.can_view_dashboard) {
                return;
            }
            // 生成查询条件的函数
            let cond = (day_offset, status) => {
                let date = moment();
                date.add(day_offset, 'days');
                return {
                    start_time: date.format('YYYY-MM-DD'),
                    end_time: date.format('YYYY-MM-DD'),
                    status: status,
                    hide_manual_close: true,
                    only_count: true,
                    stat_context_company_id: this.globalStatContextCompanyId,
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

                    let total_count = [
                        db.yst_unfinish_count + db.yst_finished_count,
                        db.today_unfinish_count + db.today_finished_count,
                        db.tmr_unfinish_count + db.tmr_finished_count
                    ];
                    let done_count = [db.yst_finished_count, db.today_finished_count, db.tmr_finished_count]
                    // 返回图表配置和数据
                    return this.chart_opt(title, subtitle, total_count, done_count)
                } catch (err) {
                    console.log("页面数据初始化异常", err);
                    // 发生错误时返回 null 或默认数据
                    return null;
                }
            };

            let tmp = [];
            // 根据模块权限生成不同模块的图表数据
            if (this.$hasPermission('customer')) {
                tmp.push(await make_data('/customer/order_buy_search', '我方下单', '采购'));
            }
            if (this.$hasPermission('buy_management')) {
                tmp.push(await make_data('/buy_management/order_search', '对方下单', '采购'));
            }
            if (this.$hasPermission('supplier')) {
                tmp.push(await make_data('/supplier/order_sale_search', '我方下单', '销售'));
            }
            if (this.$hasPermission('sale_management')) {
                tmp.push(await make_data('/sale_management/order_search', '对方下单', '销售'));
            }
            this.charts = [];
            tmp.forEach((item, index) => {
                // 过滤掉可能的 null 值
                if (item !== null) {
                    this.charts.push(item);
                }
            });
        },
        base_day_change: function () {
            this.init_statistic();
        },
        init_notice: async function () {
            if (!this.can_view_dashboard) {
                return;
            }
            if (!this.$hasPermission('stuff')) {
                return
            }
            let res = await this.$send_req('/stuff/get_notice');
            this.notice = res;
        },
        init_brief_info: async function () {
            if (!this.can_view_dashboard) {
                return;
            }
            this.init_data_brief();
            this.init_notice();
            if (this.$refs.sb_page)
                this.$refs.sb_page.refresh();
            if (this.$refs.ss_page)
                this.$refs.ss_page.refresh();
        },
        module_filter: function (role) {
            return this.can_view_dashboard && this.$hasPermission(role);
        }
    }
}
</script>

<style lang="scss" scoped>
.dashboard {
    &-container {
        margin: 10px;
    }

    &-text {
        font-size: 30px;
        line-height: 46px;
    }
}

.box-card {
    margin-bottom: 10px
}

.llm-step-content {
    padding: 0 20px;
}

.llm-step-label {
    margin-top: 24px;
    font-weight: 600;
}

.llm-step-description {
    margin-top: 8px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.llm-export-error {
    color: #f56c6c;
}
</style>

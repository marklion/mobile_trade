<template>
<div class="tplus-page">
    <div class="page-header card">
        <div class="header-left">
            <img src="@/assets/tpluslogo.png" class="tplus-logo" alt="Tplus">
            <div>
                <div class="panel-title">Tplus 对接系统</div>
            </div>
        </div>
    </div>

    <div class="config-area">
        <div class="config-block card">
            <div class="panel-header">
                <span class="panel-title">采购结算</span>
            </div>
            <div class="config-grid">
                <div class="config-row">
                    <span class="config-label">结算时间点</span>
                    <el-time-picker
                        v-model="buy_settle_time_value"
                        value-format="HH:mm:ss"
                        placeholder="选择时间"
                        :clearable="false"
                        class="config-control"
                        @change="save_config"
                    ></el-time-picker>
                </div>
                <div class="config-row">
                    <span class="config-label">结算周期</span>
                    <div class="cycle-wrap">
                        <el-input-number v-model="config.buy_settle_cycle" :min="1" :max="365" @change="save_config"></el-input-number>
                        <span class="unit-text">天</span>
                    </div>
                </div>
            </div>
            <el-button class="action-btn" type="primary" :loading="buy_settling" @click="direct_settle(true)">直接结算</el-button>
        </div>

        <div class="config-block card">
            <div class="panel-header">
                <span class="panel-title">销售结算</span>
            </div>
            <div class="config-grid">
                <div class="config-row">
                    <span class="config-label">结算时间点</span>
                    <el-time-picker
                        v-model="sale_settle_time_value"
                        value-format="HH:mm:ss"
                        placeholder="选择时间"
                        :clearable="false"
                        class="config-control"
                        @change="save_config"
                    ></el-time-picker>
                </div>
                <div class="config-row">
                    <span class="config-label">结算周期</span>
                    <div class="cycle-wrap">
                        <el-input-number v-model="config.sale_settle_cycle" :min="1" :max="365" @change="save_config"></el-input-number>
                        <span class="unit-text">天</span>
                    </div>
                </div>
            </div>
            <el-button class="action-btn" type="primary" :loading="sale_settling" @click="direct_settle(false)">直接结算</el-button>
        </div>
    </div>

    <div class="record-box card">
        <div class="panel-header">
            <div class="record-title-row">
                <span class="panel-title">结算记录</span>
                <el-input
                    class="record-filter"
                    placeholder="按车号过滤"
                    v-model="filter_string"
                    clearable
                    @clear="cancel_search"
                    @keyup.enter.native="do_search"
                >
                    <el-button slot="append" type="primary" icon="el-icon-search" @click="do_search">搜索</el-button>
                </el-input>
            </div>
            <div class="header-actions">
                <div class="success-switch">
                    <span class="success-switch-label">{{ only_success ? '仅成功' : '全部' }}</span>
                    <el-switch v-model="only_success" active-color="#3a7afe" @change="on_success_filter_change"></el-switch>
                </div>
                <el-button class="export-btn" type="primary" :loading="exporting" @click="export_detail">导出明细</el-button>
            </div>
        </div>
        <page-content
            ref="records"
            :key="'tplus-records-' + (only_success ? 'ok' : 'fail')"
            body_key="records"
            enable
            req_url="/tplus/settle_records_get"
            :req_body="records_req_body"
            :search_input="filter_string"
            :search_key="record_search_keys"
        >
            <template v-slot:default="slotProps">
                <div class="record-table-wrap">
                    <el-table :data="slotProps.content" style="width: 100%" height="100%" class="record-table">
                        <el-table-column prop="plan_date" label="计划日期" min-width="170"></el-table-column>
                        <el-table-column prop="plate" label="车号" min-width="110"></el-table-column>
                        <el-table-column prop="order_company" label="下单公司" min-width="140"></el-table-column>
                        <el-table-column prop="accept_company" label="接单公司" min-width="140"></el-table-column>
                        <el-table-column prop="stuff_name" label="物料" min-width="100"></el-table-column>
                        <el-table-column prop="unit_price" label="单价" min-width="90"></el-table-column>
                        <el-table-column prop="count" label="数量" min-width="90"></el-table-column>
                        <el-table-column prop="total_price" label="总价" min-width="90"></el-table-column>
                        <el-table-column prop="execute_result" label="执行结果" min-width="110"></el-table-column>
                        <el-table-column label="操作" width="90" fixed="right">
                            <template slot-scope="scope">
                                <el-button type="text" @click="open_detail(scope.row)">详情</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </template>
        </page-content>
    </div>

    <el-dialog
        title="推送日志"
        :visible.sync="detail_visible"
        width="720px"
        append-to-body
    >
        <el-table :data="push_logs" v-loading="push_logs_loading" style="width: 100%" max-height="420">
            <el-table-column prop="push_time" label="时间" min-width="170"></el-table-column>
            <el-table-column prop="success" label="是否成功" width="100">
                <template slot-scope="scope">
                    <span :class="scope.row.success ? 'ok-text' : 'fail-text'">{{ scope.row.success ? '成功' : '失败' }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" min-width="100"></el-table-column>
            <el-table-column prop="execute_result" label="操作" min-width="200"></el-table-column>
        </el-table>
    </el-dialog>
</div>
</template>

<script>
import PageContent from '../../components/PageContent.vue'
export default {
    name: 'Tplus',
    components: {
        'page-content': PageContent,
    },
    data: function () {
        return {
            config: {
                buy_settle_time: '00:00:00',
                buy_settle_cycle: 5,
                sale_settle_time: '00:00:00',
                sale_settle_cycle: 5,
            },
            buy_settle_time_value: '00:00:00',
            sale_settle_time_value: '00:00:00',
            buy_settling: false,
            sale_settling: false,
            saving: false,
            exporting: false,
            only_success: true,
            filter_string: '',
            record_search_keys: ['plate'],
            detail_visible: false,
            push_logs: [],
            push_logs_loading: false,
        }
    },
    computed: {
        records_req_body: function () {
            return {
                only_success: this.only_success,
            }
        },
    },
    methods: {
        do_search: function () {
            this.$refs.records.do_search()
        },
        cancel_search: function () {
            this.filter_string = ''
            this.$refs.records.cancel_search()
        },
        on_success_filter_change: function () {
            this.filter_string = ''
            this.$nextTick(() => {
                if (this.$refs.records) {
                    this.$refs.records.refresh(1)
                }
            })
        },
        init_config: async function () {
            const resp = await this.$send_req('/tplus/config_get', {})
            this.config = {
                buy_settle_time: resp.buy_settle_time || '00:00:00',
                buy_settle_cycle: resp.buy_settle_cycle || 5,
                sale_settle_time: resp.sale_settle_time || '00:00:00',
                sale_settle_cycle: resp.sale_settle_cycle || 5,
            }
            this.buy_settle_time_value = this.config.buy_settle_time
            this.sale_settle_time_value = this.config.sale_settle_time
        },
        save_config: async function () {
            if (this.saving) {
                return
            }
            this.saving = true
            try {
                await this.$send_req('/tplus/config_set', {
                    buy_settle_time: this.buy_settle_time_value || '00:00:00',
                    buy_settle_cycle: this.config.buy_settle_cycle,
                    sale_settle_time: this.sale_settle_time_value || '00:00:00',
                    sale_settle_cycle: this.config.sale_settle_cycle,
                })
                this.config.buy_settle_time = this.buy_settle_time_value
                this.config.sale_settle_time = this.sale_settle_time_value
            } finally {
                this.saving = false
            }
        },
        direct_settle: async function (is_buy) {
            if (is_buy) {
                this.buy_settling = true
            } else {
                this.sale_settling = true
            }
            try {
                await this.save_config()
                const resp = await this.$send_req('/tplus/direct_settle', { is_buy: is_buy })
                this.$message.success(resp.status || '结算完成')
                this.$refs.records.refresh(1)
            } finally {
                if (is_buy) {
                    this.buy_settling = false
                } else {
                    this.sale_settling = false
                }
            }
        },
        export_detail: async function () {
            this.exporting = true
            try {
                await this.$send_req('/tplus/export_settle_detail', {})
                this.$message.success('导出成功,请到导出记录中查看')
            } finally {
                this.exporting = false
            }
        },
        open_detail: async function (row) {
            this.detail_visible = true
            this.push_logs = []
            this.push_logs_loading = true
            try {
                const resp = await this.$send_req('/tplus/push_log_get', { plan_id: row.id })
                this.push_logs = resp.logs || []
            } finally {
                this.push_logs_loading = false
            }
        },
    },
    mounted: async function () {
        await this.init_config()
    },
}
</script>

<style scoped>
.tplus-page {
    min-width: 980px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px;
    height: calc(100vh - 120px);
    box-sizing: border-box;
    background: #f3f6fb;
}

.card {
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(27, 42, 66, 0.06);
}

.page-header {
    padding: 14px 16px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.tplus-logo {
    width: 44px;
    height: 44px;
    object-fit: contain;
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.panel-title {
    color: #1f2d3d;
    font-size: 20px;
    font-weight: 600;
}


.config-area {
    display: flex;
    gap: 14px;
}

.config-block {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.config-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(200px, 1fr));
    gap: 10px;
}

.config-row {
    border: 1px solid #ebf0f6;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafcff;
    gap: 10px;
}

.config-label {
    color: #6f7d90;
    font-size: 14px;
    white-space: nowrap;
}

.config-control {
    width: 150px;
}

.cycle-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
}

.unit-text {
    color: #6f7d90;
    font-size: 14px;
}

.action-btn {
    width: 132px;
    font-size: 16px;
    height: 42px;
    border-radius: 10px;
    align-self: flex-start;
}

.export-btn {
    border-radius: 10px;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.success-switch {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 4px;
}

.success-switch-label {
    color: #6f7d90;
    font-size: 13px;
    white-space: nowrap;
}

.record-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    margin-right: 12px;
}

.record-filter {
    max-width: 420px;
    flex: 1;
}

.record-filter /deep/ .el-input__inner {
    border-radius: 10px 0 0 10px;
    border-color: #d8e0ec;
    height: 36px;
    line-height: 36px;
}

.record-box {
    flex: 1;
    min-height: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.record-table-wrap {
    flex: 1;
    min-height: 280px;
    height: calc(100vh - 420px);
}

.record-table /deep/ th {
    background: #f8fafc !important;
    color: #6f7d90;
    font-weight: 600;
}

.record-table /deep/ td {
    color: #1f2d3d;
}

.tplus-page /deep/ .el-input__inner,
.tplus-page /deep/ .el-input-number .el-input__inner {
    border-radius: 10px;
    border-color: #d8e0ec;
}

.tplus-page /deep/ .el-button--text {
    color: #3a7afe;
    font-weight: 600;
}

.ok-text {
    color: #19a87b;
}

.fail-text {
    color: #e34d59;
}
</style>

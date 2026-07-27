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
            </div>
            <div class="header-actions">
                <el-button class="export-btn" type="primary" icon="el-icon-refresh" @click="refresh_records">刷新</el-button>
            </div>
        </div>
        <page-content
            ref="records"
            body_key="records"
            enable
            req_url="/tplus/settle_records_get"
            :req_body="{}"
        >
            <template v-slot:default="slotProps">
                <div class="record-table-wrap">
                    <el-table :data="slotProps.content" style="width: 100%" height="100%" class="record-table">
                        <el-table-column prop="settle_time" label="结算时间" min-width="180"></el-table-column>
                        <el-table-column prop="settle_type" label="类型" min-width="100">
                            <template slot-scope="scope">
                                {{ scope.row.settle_type === 'buy' ? '采购' : '销售' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="结算状态" min-width="140"></el-table-column>
                        <el-table-column prop="plate_summary" label="车号" min-width="140"></el-table-column>
                        <el-table-column prop="operator" label="操作人" min-width="120"></el-table-column>
                        <el-table-column label="操作" width="120" fixed="right">
                            <template slot-scope="scope">
                                <el-button
                                    type="text"
                                    :loading="exporting_id === scope.row.id"
                                    @click="export_record_detail(scope.row)"
                                >导出详情</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </template>
        </page-content>
    </div>
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
            exporting_id: null,
        }
    },
    methods: {
        refresh_records: function () {
            if (this.$refs.records) {
                this.$refs.records.refresh(1)
            }
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
                this.refresh_records()
            } finally {
                if (is_buy) {
                    this.buy_settling = false
                } else {
                    this.sale_settling = false
                }
            }
        },
        export_record_detail: async function (row) {
            this.exporting_id = row.id
            try {
                await this.$send_req('/tplus/export_settle_detail', { record_id: row.id })
                this.$message.success('导出成功,请到导出记录中查看')
            } finally {
                this.exporting_id = null
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

.record-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    margin-right: 12px;
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
</style>

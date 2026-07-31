<template>
    <div class="tplus-page">
        <div class="page-header card">
            <div class="header-left">
                <img src="@/assets/tpluslogo.png" class="tplus-logo" alt="Tplus">
                <div class="panel-title">Tplus 对接系统</div>
            </div>
        </div>

        <div class="main-card card">
            <el-tabs v-model="active_tab" @tab-click="on_tab_click">
                <el-tab-pane label="结算" name="settle">
                    <div class="config-area">
                        <div class="config-block">
                            <div class="panel-header">
                                <span class="section-title">采购结算</span>
                                <el-button type="primary" class="action-btn" :disabled="!can_buy_settle"
                                    :loading="buy_settling" @click="direct_settle(true)">直接结算</el-button>
                            </div>
                            <div class="buy-body">
                                <div class="buy-top">
                                    <span class="field-label">结算周期</span>
                                    <div class="cycle-wrap">
                                        <el-input-number v-model="config.buy_settle_cycle" :min="1" :max="365"
                                            @change="save_config"></el-input-number>
                                        <span class="unit-text">天</span>
                                    </div>
                                </div>
                                <div class="buy-prices">
                                    <div class="field-bar">
                                        <span class="field-label">物料价格</span>
                                        <el-button type="text" icon="el-icon-plus"
                                            @click="add_buy_stuff_price">添加</el-button>
                                    </div>
                                    <el-table :data="buy_stuff_prices" size="small" border class="stuff-table"
                                        empty-text="暂无物料，点击添加">
                                        <el-table-column label="物料" min-width="160">
                                            <template slot-scope="scope">
                                                <el-select :key="'buy-stuff-' + scope.$index + '-' + selected_stuff_key"
                                                    v-model="scope.row.stuff_id" filterable clearable placeholder="选择物料"
                                                    size="small" style="width: 100%" @change="save_config">
                                                    <el-option v-for="item in get_stuff_options_for_row(scope.$index)"
                                                        :key="item.id" :label="item.name + ' (#' + item.id + ')'"
                                                        :value="item.id"></el-option>
                                                </el-select>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="价格" width="150" align="center">
                                            <template slot-scope="scope">
                                                <el-input-number v-model="scope.row.price" :min="0" :precision="2"
                                                    size="small" controls-position="right" class="price-input"
                                                    @change="save_config"></el-input-number>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="操作" width="64" align="center">
                                            <template slot-scope="scope">
                                                <el-button type="text" icon="el-icon-delete" class="remove-btn"
                                                    @click="remove_buy_stuff_price(scope.$index)"></el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </div>
                            </div>
                        </div>

                        <div class="config-block">
                            <div class="panel-header">
                                <span class="section-title">销售结算</span>
                                <el-button type="primary" class="action-btn" :loading="sale_settling"
                                    @click="direct_settle(false)">直接结算</el-button>
                            </div>
                            <div class="sale-body">
                                <div class="sale-field">
                                    <div class="field-label">结算时间点</div>
                                    <el-time-picker v-model="sale_settle_time_value" value-format="HH:mm:ss"
                                        placeholder="选择时间" :clearable="false" class="time-picker"
                                        @change="save_config"></el-time-picker>
                                </div>
                                <div class="sale-field">
                                    <div class="field-label">结算周期</div>
                                    <div class="cycle-wrap">
                                        <el-input-number v-model="config.sale_settle_cycle" :min="1" :max="365"
                                            @change="save_config"></el-input-number>
                                        <span class="unit-text">天</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="结算记录" name="records">
                    <div class="record-box">
                        <div class="record-toolbar">
                            <el-button class="export-btn" type="primary" icon="el-icon-refresh"
                                @click="refresh_records">刷新</el-button>
                        </div>
                        <page-content v-if="records_ready" ref="records" body_key="records" enable
                            req_url="/tplus/settle_records_get" :req_body="{}">
                            <template v-slot:default="slotProps">
                                <div class="record-table-wrap">
                                    <el-table :data="slotProps.content" style="width: 100%" height="100%"
                                        class="record-table">
                                        <el-table-column prop="settle_time" label="结算时间"
                                            min-width="180"></el-table-column>
                                        <el-table-column prop="settle_type" label="类型" min-width="100">
                                            <template slot-scope="scope">
                                                {{ scope.row.settle_type === 'buy' ? '采购' : '销售' }}
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="status" label="结算状态" min-width="140"></el-table-column>
                                        <el-table-column prop="plate_summary" label="车号"
                                            min-width="140"></el-table-column>
                                        <el-table-column prop="operator" label="操作人" min-width="120"></el-table-column>
                                        <el-table-column label="操作" width="120" fixed="right">
                                            <template slot-scope="scope">
                                                <el-button type="text" :loading="exporting_id === scope.row.id"
                                                    @click="export_record_detail(scope.row)">导出详情</el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </div>
                            </template>
                        </page-content>
                    </div>
                </el-tab-pane>
            </el-tabs>
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
            active_tab: 'settle',
            records_ready: false,
            config: {
                buy_settle_cycle: 5,
                sale_settle_time: '00:00:00',
                sale_settle_cycle: 5,
            },
            sale_settle_time_value: '00:00:00',
            buy_stuff_prices: [],
            buy_stuff_options: [],
            buy_settling: false,
            sale_settling: false,
            saving: false,
            exporting_id: null,
        }
    },
    computed: {
        can_buy_settle: function () {
            return this.get_valid_buy_stuff_prices().length > 0
        },
        selected_stuff_key: function () {
            return this.buy_stuff_prices.map((row) => row.stuff_id || '').join(',')
        },
    },
    methods: {
        on_tab_click: function (tab) {
            if (tab.name === 'records') {
                this.records_ready = true
                this.$nextTick(() => {
                    this.refresh_records()
                })
            }
        },
        refresh_records: function () {
            if (this.$refs.records) {
                this.$refs.records.refresh(1)
            }
        },
        normalize_buy_stuff_prices: function (list) {
            const rows = Array.isArray(list) ? list : []
            return rows
                .map((item) => ({
                    stuff_id: item.stuff_id ? Number(item.stuff_id) : null,
                    price: item.price === undefined || item.price === null || item.price === ''
                        ? undefined
                        : Number(item.price),
                }))
                .filter((item) => item.stuff_id)
        },
        get_valid_buy_stuff_prices: function () {
            return this.normalize_buy_stuff_prices(this.buy_stuff_prices)
                .filter((item) => item.price !== undefined && !Number.isNaN(item.price))
        },
        is_stuff_selected: function (stuff_id, current_index) {
            return this.buy_stuff_prices.some((row, index) => {
                return index !== current_index && Number(row.stuff_id) === Number(stuff_id)
            })
        },
        get_stuff_options_for_row: function (current_index) {
            return this.buy_stuff_options.filter((item) => {
                return !this.is_stuff_selected(item.id, current_index)
            })
        },
        add_buy_stuff_price: function () {
            this.buy_stuff_prices.push({
                stuff_id: null,
                price: undefined,
            })
        },
        remove_buy_stuff_price: async function (index) {
            this.buy_stuff_prices.splice(index, 1)
            await this.save_config()
        },
        init_stuff_options: async function () {
            const resp = await this.$send_req('/stuff/get_all', {})
            const stuff_list = (resp && resp.stuff) ? resp.stuff : []
            this.buy_stuff_options = stuff_list.filter((item) => item.use_for_buy)
            if (this.buy_stuff_options.length === 0) {
                this.buy_stuff_options = stuff_list
            }
        },
        init_config: async function () {
            const resp = await this.$send_req('/tplus/config_get', {})
            this.config = {
                buy_settle_cycle: resp.buy_settle_cycle || 5,
                sale_settle_time: resp.sale_settle_time || '00:00:00',
                sale_settle_cycle: resp.sale_settle_cycle || 5,
            }
            this.sale_settle_time_value = this.config.sale_settle_time
            this.buy_stuff_prices = this.normalize_buy_stuff_prices(resp.buy_stuff_prices)
        },
        save_config: async function () {
            if (this.saving) {
                return
            }
            this.saving = true
            try {
                await this.$send_req('/tplus/config_set', {
                    buy_settle_cycle: this.config.buy_settle_cycle,
                    buy_stuff_prices: this.get_valid_buy_stuff_prices(),
                    sale_settle_time: this.sale_settle_time_value || '00:00:00',
                    sale_settle_cycle: this.config.sale_settle_cycle,
                })
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
                this.$message.success('结算完成')
                this.records_ready = true
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
        await this.init_stuff_options()
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

.panel-title {
    color: #1f2d3d;
    font-size: 20px;
    font-weight: 600;
}

.main-card {
    flex: 1;
    min-height: 0;
    padding: 8px 18px 16px;
    display: flex;
    flex-direction: column;
}

.main-card /deep/ .el-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.main-card /deep/ .el-tabs__header {
    margin-bottom: 14px;
}

.main-card /deep/ .el-tabs__content {
    flex: 1;
    min-height: 0;
    overflow: auto;
}

.main-card /deep/ .el-tab-pane {
    height: 100%;
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.section-title {
    color: #1f2d3d;
    font-size: 18px;
    font-weight: 600;
}

.config-area {
    display: flex;
    align-items: flex-start;
    gap: 14px;
}

.config-block {
    flex: 1;
    min-width: 0;
    padding: 14px 16px;
    border: 1px solid #ebf0f6;
    border-radius: 10px;
    background: #fafcff;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.buy-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.buy-top {
    display: flex;
    align-items: center;
    gap: 12px;
}

.buy-prices {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 22px;
}

.field-label {
    color: #6f7d90;
    font-size: 14px;
    line-height: 22px;
    white-space: nowrap;
}

.time-picker {
    width: 150px;
}

.stuff-table {
    width: 100%;
}

.stuff-table /deep/ th {
    background: #f8fafc !important;
    color: #6f7d90;
    font-weight: 600;
}

.stuff-table /deep/ .cell {
    padding-left: 8px;
    padding-right: 8px;
}

.price-input {
    width: 130px;
}

.sale-body {
    display: flex;
    gap: 20px;
    align-items: flex-end;
    flex-wrap: wrap;
}

.sale-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 180px;
}

.sale-field .time-picker {
    width: 100%;
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

.remove-btn {
    color: #f56c6c !important;
    padding: 0;
}

.action-btn {
    width: 116px;
    height: 36px;
    font-size: 14px;
    border-radius: 8px;
}

.export-btn {
    border-radius: 10px;
}

.record-box {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.record-toolbar {
    display: flex;
    justify-content: flex-end;
}

.record-table-wrap {
    flex: 1;
    min-height: 360px;
    height: calc(100vh - 280px);
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
    border-radius: 8px;
    border-color: #d8e0ec;
}

.tplus-page /deep/ .el-button--text {
    color: #3a7afe;
    font-weight: 600;
}
</style>

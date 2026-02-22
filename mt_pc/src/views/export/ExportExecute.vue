<template>
<div class="export_execute_show">
    <div class="export_execute_header">
        <h2>订单明细导出</h2>
        <array-selector-button v-model="columns_defined" @change="save_cd_local"></array-selector-button>
    </div>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in all_module" :key="index" width="3of12">
            <export-date :is_need_pm_time="true" :is_buy="single_module.is_buy" :need_stuff="single_module.has_more_filter" :need_company="single_module.has_more_filter" :export_name="single_module.module_name" @do_export="export_order($event, single_module.module)" concern_finished></export-date>
        </vue-cell>
    </vue-grid>
    <el-divider></el-divider>
    <h2>磅单导出</h2>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in all_module" :key="index" width="3of12">
            <export-date :export_name="single_module.module_name" @do_export="export_ticket($event, single_module.module)" :need_company="single_module.has_more_filter"></export-date>
        </vue-cell>
    </vue-grid>
    <el-divider></el-divider>
    <h2>安检登记表导出</h2>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in all_module" :key="index" width="3of12">
            <export-date :export_name="single_module.module_name" @do_export="export_sc($event, single_module.module)"></export-date>
        </vue-cell>
    </vue-grid>
    <el-divider></el-divider>
    <h2>其他</h2>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" width="4of12" v-if="$hasPermission('sale_management')">
            <export-date export_name="执行率导出" @do_export="export_rate"></export-date>
        </vue-cell>
        <vue-cell class="cell_show" width="4of12" v-if="$hasPermission('cash')">
            <export-date need_contract export_name="余额明细导出" @do_export="export_charge"></export-date>
        </vue-cell>
        <vue-cell class="cell_show" width="4of12" v-if="$hasPermission('sale_management')">
            <export-date export_name="现场检查表" @do_export="export_fc"></export-date>
        </vue-cell>
    </vue-grid>
</div>
</template>

<script>
import ExportDate from '../../components/ExportDate.vue';
import {
    VueGrid,
    VueCell
} from 'vue-grd';
import ArraySelectorButton from '../../components/ArraySelectorButton.vue';
export default {
    name: 'ExportExecute',
    components: {
        "array-selector-button": ArraySelectorButton,
        "export-date": ExportDate,
        VueGrid,
        VueCell,
    },
    data: function () {
        return {
            columns_defined: [{
                label: '下单公司',
                name: 'create_company',
            }, {
                label: '接单公司',
                name: 'accept_company',
            }, {
                label: '计划时间',
                name: 'plan_time',
            }, {
                label: '过皮时间',
                name: 'p_time',
            }, {
                label: '过毛时间',
                name: 'm_time',
            }, {
                label: '主车号',
                name: 'mv',
            }, {
                label: '挂车号',
                name: 'bv',
            }, {
                label: '司机姓名',
                name: 'driver_name',
            }, {
                label: '司机电话',
                name: 'driver_phone',
            }, {
                label: '皮重',
                name: 'p_weight',
            }, {
                label: '毛重',
                name: 'm_weight',
            }, {
                label: '装车量',
                name: 'count',
            }, {
                label: '单价',
                name: 'unit_price',
            }, {
                label: '总价',
                name: 'total_price',
            }, {
                label: '铅封号',
                name: 'seal_no',
            }, {
                label: '磅单号',
                name: 'ticket_no',
            }, {
                label: '物料名',
                name: 'stuff_name',
            }, {
                label: '卸货地址',
                name: 'drop_address',
            }, {
                label: '发票已开?',
                name: 'fapiao_delivered',
            }, {
                label: '备注',
                name: 'comment',
            }, {
                label: '装卸区域',
                name: 'drop_take_zone_name'
            }, {
                label: '代理公司',
                name: 'delegate'
            }, {
                label: '打折后单价',
                name: 'subsidy_price'
            }, {
                label: '打折后总价',
                name: 'subsidy_total_price'
            }, {
                label: '打折数',
                name: 'subsidy_discount'
            }, {
                label: '第二单位',
                name: 'second_unit'
            }, {
                label: '第二单位装卸量',
                name: 'second_value'
            }, {
                label: '金蝶星辰同步信息',
                name: 'king_dee_comment'
            }],
            orig_all_module: [{
                    module: 'sale_management',
                    module_name: '销售接单',
                    is_buy: false,
                    has_more_filter: true,
                },
                {
                    module: 'buy_management',
                    module_name: '采购接单',
                    is_buy: true,
                    has_more_filter: true,
                },
                {
                    module: 'customer',
                    module_name: '采购下单',
                    is_buy: false,
                },
                {
                    module: 'supplier',
                    module_name: '销售下单',
                    is_buy: true,
                }
            ],
        };
    },
    computed: {
        all_module: function () {
            return this.orig_all_module.filter((module) => {
                return this.$hasPermission(module.module);
            });
        },
    },
    methods: {
        show_export_success: function () {
            this.$notify({
                title: '导出成功',
                message: '导出成功',
                type: 'success',
            });
        },
        show_export_fail: function (error) {
            this.$notify({
                title: '导出失败',
                message: error,
                type: 'error',
            });
        },
        export_order: async function (filter, module) {
            try {
                await this.$send_req(module + '/export_plans', {
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    stuff_id: filter.stuff_id,
                    company_id: filter.company_id,
                    m_start_time: filter.m_start_time,
                    m_end_time: filter.m_end_time,
                    only_finished: filter.only_finished,
                    columns:this.columns_defined,
                });
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_ticket: async function (filter, module) {
            try {

                await this.$send_req('/global/download_ticket_zip', {
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    ticket_type: module,
                    company_id: filter.company_id,
                    only_finished: true,
                });
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_rate: async function (filter) {
            try {

                await this.$send_req('/sale_management/export_exe_rate', {
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                });
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_charge: async function (filter) {
            try {
                await this.$send_req('/cash/export_history', {
                    contract_id: filter.contract_id,
                    begin_time: filter.start_time,
                    end_time: filter.end_time,
                });
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        save_cd_local: function () {
            localStorage.setItem('export_columns_defined', JSON.stringify(this.columns_defined));
        },
        export_sc: async function (filter, module) {
            try {

                await this.$send_req('/global/download_sc_contents_zip', {
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    export_type: module,
                });
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_fc: async function (filter) {
            try {
                await this.$send_req('/sc/export_fc_table', {
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                });
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
    },
    mounted: async function () {
        const cd_local = localStorage.getItem('export_columns_defined');
        if (cd_local) {
            try {
                this.columns_defined = JSON.parse(cd_local);
            } catch (error) {
                console.error('Failed to parse columns_defined from localStorage:', error);
            }
        }
    },
}
</script>

<style scoped>
.export_execute_show {
    padding: 20px;
}

.export_execute_header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cell_show {
    padding-left: 8px;
    padding-right: 8px;
}

.cell_show:first-child {
    padding-left: 0;
}

.cell_show:last-child {
    padding-right: 0;
}
</style>

<template>
<div class="export_execute_show">
    <h2>订单明细导出</h2>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in all_module" :key="index" width="3of12">
            <export-date :is_need_pm_time="true" :is_buy="single_module.is_buy" :need_stuff="single_module.has_more_filter" :need_company="single_module.has_more_filter" :export_name="single_module.module_name" @do_export="export_order($event, single_module.module)"></export-date>
        </vue-cell>
    </vue-grid>
    <el-divider></el-divider>
    <h2>磅单导出</h2>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in all_module" :key="index" width="3of12">
            <export-date :export_name="single_module.module_name" @do_export="export_ticket($event, single_module.module)"></export-date>
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
export default {
    name: 'ExportExecute',
    components: {
        "export-date": ExportDate,
        VueGrid,
        VueCell,
    },
    data: function () {
        return {
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
                    m_end_time: filter.m_end_time
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
    mounted: async function () {},
}
</script>

<style scoped>
.export_execute_show {
    padding: 20px;
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

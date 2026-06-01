<template>
<div class="export_execute_show">
    <div v-if="!can_view_export_execute" class="export_no_permission_tip">
        当前集团账号暂无查看权限，无法使用导出执行。
    </div>
    <template v-else>
    <div class="export_execute_header">
        <h2>订单明细导出</h2>
        <array-selector-button v-model="columns_defined" :options="export_column_options" @change="save_cd_local"></array-selector-button>
    </div>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in order_and_ticket_modules" :key="index" width="3of12">
            <export-date
                :key="'order-' + single_module.module + '-' + (globalStatContextCompanyId || 0)"
                :is_need_pm_time="true"
                :is_buy="single_module.is_buy"
                :need_stuff="single_module.has_more_filter"
                :need_company="single_module.has_more_filter"
                :export_name="single_module.module_name"
                :external_scope_id="scope_selector_enabled ? globalStatContextCompanyId : null"
                @do_export="export_order($event, single_module.module)"
                concern_finished></export-date>
        </vue-cell>
    </vue-grid>
    <el-divider></el-divider>
    <h2>磅单导出</h2>
    <vue-grid align="stretch">
        <vue-cell class="cell_show" v-for="(single_module, index) in order_and_ticket_modules" :key="index" width="3of12">
            <export-date
                :key="'ticket-' + single_module.module + '-' + (globalStatContextCompanyId || 0)"
                :export_name="single_module.module_name"
                :need_company="single_module.has_more_filter"
                :external_scope_id="scope_selector_enabled ? globalStatContextCompanyId : null"
                @do_export="export_ticket($event, single_module.module)"></export-date>
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
            <export-date
                need_contract
                export_name="余额明细导出"
                :external_scope_id="scope_selector_enabled ? globalStatContextCompanyId : null"
                @do_export="export_charge"></export-date>
        </vue-cell>
        <vue-cell class="cell_show" width="4of12" v-if="$hasPermission('sale_management')">
            <export-date export_name="现场检查表" @do_export="export_fc"></export-date>
        </vue-cell>
        <vue-cell class="cell_show" width="4of12" v-if="$hasPermission('sale_management')">
            <export-date export_name="销售汇总表" @do_export="export_sale_summary"></export-date>
        </vue-cell>
        <vue-cell class="cell_show" width="4of12" v-if="$hasPermission('sale_management')">
            <export-date
                need_company
                export_name="客户对账单"
                :external_scope_id="scope_selector_enabled ? globalStatContextCompanyId : null"
                @do_export="export_customer_statement"></export-date>
        </vue-cell>
    </vue-grid>
    </template>
</div>
</template>

<script>
import ExportDate from '../../components/ExportDate.vue';
import {
    VueGrid,
    VueCell
} from 'vue-grd';
import { mapGetters } from 'vuex';
import ArraySelectorButton from '../../components/ArraySelectorButton.vue';

const BASE_EXPORT_COLUMNS = [{
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
    name: 'drop_take_zone_name',
}, {
    label: '代理公司',
    name: 'delegate',
}, {
    label: '打折后单价',
    name: 'subsidy_price',
}, {
    label: '打折后总价',
    name: 'subsidy_total_price',
}, {
    label: '打折数',
    name: 'subsidy_discount',
}, {
    label: '第二单位',
    name: 'second_unit',
}, {
    label: '第二单位装卸量',
    name: 'second_value',
}, {
    label: '金蝶星辰同步信息',
    name: 'king_dee_comment',
}];

const SUPPLY_EXPORT_COLUMN = { label: '货源公司', name: 'supply_company' };

function insert_supply_column(columns) {
    const cols = columns.filter((c) => c.name !== 'supply_company');
    const accept_idx = cols.findIndex((c) => c.name === 'accept_company');
    cols.splice(accept_idx >= 0 ? accept_idx + 1 : 2, 0, SUPPLY_EXPORT_COLUMN);
    return cols;
}

function hasCanViewPermission(scope) {
    return !!scope;
}

function isSameScopeId(leftId, rightId) {
    if (leftId == null || rightId == null) {
        return false;
    }
    return String(leftId) === String(rightId);
}

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
            columns_defined: [...BASE_EXPORT_COLUMNS],
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
        ...mapGetters([
            'globalStatCompanyIsGroup',
            'globalStatSelfCompanyId',
            'globalStatScopes',
            'globalStatScopeVisible',
            'globalStatContextCompanyId',
        ]),
        company_is_group: function () {
            return this.globalStatCompanyIsGroup;
        },
        self_company_id: function () {
            return this.globalStatSelfCompanyId;
        },
        stat_scopes: function () {
            return this.globalStatScopes || [];
        },
        scope_selector_enabled: function () {
            return this.globalStatScopeVisible && this.globalStatContextCompanyId != null;
        },
        all_module: function () {
            return this.orig_all_module.filter((module) => {
                return this.$hasPermission(module.module);
            });
        },
        has_group_view_grant: function () {
            if (!this.company_is_group) {
                return false;
            }
            const memberScopes = (this.stat_scopes || []).filter((s) => s && !isSameScopeId(s.id, this.self_company_id));
            if (memberScopes.length === 0) {
                return false;
            }
            return memberScopes.some((s) => hasCanViewPermission(s));
        },
        selected_scope: function () {
            return (this.stat_scopes || []).find((s) =>
                s && isSameScopeId(s.id, this.globalStatContextCompanyId)
            ) || null;
        },
        selected_scope_can_view: function () {
            if (!this.company_is_group) {
                return true;
            }
            if (this.globalStatContextCompanyId == null) {
                return false;
            }
            if (isSameScopeId(this.globalStatContextCompanyId, this.self_company_id)) {
                return true;
            }
            return hasCanViewPermission(this.selected_scope);
        },
        can_view_export_execute: function () {
            return this.selected_scope_can_view;
        },
        order_and_ticket_modules: function () {
            return this.all_module.filter((module) => {
                if (module.module === 'sale_management' && this.company_is_group) {
                    return this.selected_scope_can_view;
                }
                return true;
            });
        },
        export_column_options: function () {
            return this.company_is_group
                ? insert_supply_column(BASE_EXPORT_COLUMNS)
                : [...BASE_EXPORT_COLUMNS];
        },
    },
    methods: {
        with_stat_context: function (body = {}, fallbackScopeId = null) {
            const ret = { ...body };
            if (!this.scope_selector_enabled) {
                delete ret.stat_context_company_id;
                return ret;
            }
            const scopeId = ret.stat_context_company_id != null ? ret.stat_context_company_id : fallbackScopeId;
            if (scopeId != null) {
                ret.stat_context_company_id = scopeId;
            }
            return ret;
        },
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
                await this.$send_req(module + '/export_plans', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    stuff_id: filter.stuff_id,
                    company_id: filter.company_id,
                    m_start_time: filter.m_start_time,
                    m_end_time: filter.m_end_time,
                    weight_time_type: filter.weight_time_type,
                    only_finished: filter.only_finished,
                    columns:this.columns_defined,
                    stat_context_company_id: filter.stat_context_company_id,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_ticket: async function (filter, module) {
            try {

                await this.$send_req('/global/download_ticket_zip', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    ticket_type: module,
                    company_id: filter.company_id,
                    only_finished: true,
                    stat_context_company_id: filter.stat_context_company_id,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_rate: async function (filter) {
            try {

                await this.$send_req('/sale_management/export_exe_rate', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_charge: async function (filter) {
            try {
                await this.$send_req('/cash/export_history', this.with_stat_context({
                    contract_id: filter.contract_id,
                    begin_time: filter.start_time,
                    end_time: filter.end_time,
                    stat_context_company_id: filter.stat_context_company_id,
                }, this.globalStatContextCompanyId));
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

                await this.$send_req('/global/download_sc_contents_zip', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    export_type: module,
                    stat_context_company_id: filter.stat_context_company_id,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_fc: async function (filter) {
            try {
                await this.$send_req('/sc/export_fc_table', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_sale_summary: async function (filter) {
            try {
                await this.$send_req('/sale_management/export_sale_summary', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
        export_customer_statement: async function (filter) {
            try {
                await this.$send_req('/sale_management/export_customer_statement', this.with_stat_context({
                    start_time: filter.start_time,
                    end_time: filter.end_time,
                    company_id: filter.company_id,
                    stat_context_company_id: filter.stat_context_company_id,
                }, this.globalStatContextCompanyId));
                this.show_export_success();
            } catch (error) {
                this.show_export_fail(error);
            }
        },
    },
    mounted: async function () {
        await this.$store.dispatch('statScope/initialize', { force: true });
        const cd_local = localStorage.getItem('export_columns_defined');
        if (cd_local) {
            try {
                this.columns_defined = JSON.parse(cd_local);
            } catch (error) {
                console.error('Failed to parse columns_defined from localStorage:', error);
            }
        }
        const opts = this.export_column_options;
        let cols = this.columns_defined.filter((c) => opts.some((o) => o.name === c.name));
        if (this.company_is_group && !cols.some((c) => c.name === 'supply_company')) {
            cols = insert_supply_column(cols);
        }
        this.columns_defined = cols;
    },
}
</script>

<style scoped>
.export_execute_show {
    padding: 20px;
}

.export_no_permission_tip {
    margin: 8px 0 16px;
    color: #909399;
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

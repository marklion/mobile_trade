<template>
<div class="export_date_show">
    <el-card shadow="always">
        <div slot="header">
            <span>{{export_name}}</span>
        </div>
        <div>
            <el-date-picker style="width:260px" v-model="date_range" type="daterange" align="right" unlink-panels range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="pickerOptions">
            </el-date-picker>
        </div>
        <div v-if="need_company">
            <select-search filterable body_key="contracts" first_item="所有公司" :get_url="contract_get_url" item_label="company.name" item_value="company.id" :permission_array="['sale_management', 'stuff_management']" v-model="company_id"></select-search>
        </div>
        <div v-if="need_contract">
            <select-search filterable body_key="contracts" first_item="所有公司" :get_url="contract_get_url" item_label="company.name" item_value="id" :permission_array="['sale_management', 'stuff_management']" v-model="contract_id"></select-search>
        </div>
        <div v-if="need_stuff">
            <select-search body_key="stuff" first_item="所有物料" get_url="/stuff/get_all" item_label="name" item_value="id" :permission_array="['stuff']" v-model="stuff_id"></select-search>
        </div>
        <el-button size="small" type="primary" @click="do_export">导出</el-button>
    </el-card>
</div>
</template>

<script>
import moment from 'moment';
import SelectSearch from './SelectSearch.vue';
export default {
    name: 'ExportDate',
    components: {
        "select-search": SelectSearch,
    },
    props: {
        is_buy: {
            type: Boolean,
            default: false,
        },
        export_name: {
            type: String,
        },
        need_company: {
            type: Boolean,
            default: false,
        },
        need_stuff: {
            type: Boolean,
            default: false,
        },
        need_contract: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        contract_get_url: function () {
            if (this.is_buy) {
                return '/buy_management/contract_get';
            } else {
                return '/sale_management/contract_get';
            }
        }
    },
    data: function () {
        return {
            contract_id: 0,
            company_id: 0,
            stuff_id: 0,
            date_range: '',
            filter: {
                start_time: '',
                end_time: '',
            },
            pickerOptions: {
                shortcuts: [{
                    text: '最近一周',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
                        picker.$emit('pick', [start, end]);
                    }
                }, {
                    text: '最近一个月',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
                        picker.$emit('pick', [start, end]);
                    }
                }, {
                    text: '最近三个月',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
                        picker.$emit('pick', [start, end]);
                    }
                }]
            },
        };
    },
    methods: {
        reset_filter() {
            this.filter = {
                end_time: moment().format('YYYY-MM-DD'),
                start_time: moment().add(-7, 'days').format('YYYY-MM-DD'),
            };
            this.date_range = [new Date(this.filter.start_time), new Date(this.filter.end_time)];
        },
        get_date_range() {
            this.filter.start_time = moment(this.date_range[0]).format('YYYY-MM-DD');
            this.filter.end_time = moment(this.date_range[1]).format('YYYY-MM-DD');
            return this.filter;
        },
        do_export: async function () {
            let filter = {};
            this.get_date_range();
            filter.start_time = this.filter.start_time;
            filter.end_time = this.filter.end_time;
            if (this.need_company && this.company_id) {
                filter.company_id = this.company_id;
            }
            if (this.need_stuff && this.stuff_id) {
                filter.stuff_id = this.stuff_id;
            }
            if (this.need_contract && this.contract_id) {
                filter.contract_id = this.contract_id;
            }
            this.$emit('do_export', filter);
        },
    },
    mounted: async function () {
        this.reset_filter();
    },
}
</script>

<style>

</style>

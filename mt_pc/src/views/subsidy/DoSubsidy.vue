<template>
<div class="do_subsidy_show">
    <page-content enable ref="subsidy_record" body_key="records" req_url="/cash/get_subsidy_record">
        <template v-slot:default="slotProps">
            <div style="height: 80vh">
                <el-table :data="slotProps.content" style="width: 100%" stripe height="100%">
                    <el-table-column prop="range" label="时间范围"></el-table-column>
                    <el-table-column prop="order_count" label="影响订单数"></el-table-column>
                    <el-table-column prop="status">
                        <template slot="header">
                            <el-button size="mini" type="success" @click="do_subsidy_diag = true">执行</el-button>
                            <el-button size="mini" type="primary" @click="refresh_page">刷新</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
    <el-dialog title="执行补贴" :visible.sync="do_subsidy_diag" width="50%">
        <el-form :model="subsidy_range" ref="do_subsidy">
            <el-form-item label="时间过滤类型">
                <el-select v-model="subsidy_range.type" placeholder="请选择活动区域">
                    <el-option label="计划时间" value="plan_time"></el-option>
                    <el-option label="出厂时间" value="m_time"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="时间范围">
                <el-date-picker v-model="subsidy_range.range" type="datetimerange" :picker-options="pickerOptions" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" align="right">
                </el-date-picker>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="do_subsidy_diag = false">取消</el-button>
            <el-button type="primary" @click="do_subsidy">确定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import PageContent from '../../components/PageContent.vue'
import moment from 'moment';
export default {
    name: 'DoSubsidy',
    components: {
        "page-content": PageContent,
    },
    data: function () {
        return {
            subsidy_range: {
                type: 'plan_time',
                range: [],
            },
            pickerOptions: this.$quik_date_option,
            do_subsidy_diag: false,
        };
    },
    methods: {
        refresh_page() {
            this.$refs.subsidy_record.refresh();
        },
        get_date_range() {
            return {
                time_start: moment(this.subsidy_range.range[0]).format('YYYY-MM-DD HH:mm:ss'),
                time_end: moment(this.subsidy_range.range[1]).format('YYYY-MM-DD HH:mm:ss')
            }
        },
        do_subsidy: async function () {
            if (this.subsidy_range.range.length == 0) {
                this.$message.error('请选择时间范围');
                return;
            }
            let req = {};
            let range = this.get_date_range();
            if (this.subsidy_range.type == 'plan_time') {
                req.plan_time_start = range.time_start;
                req.plan_time_end = range.time_end;
            } else {
                req.m_time_start = range.time_start;
                req.m_time_end = range.time_end;
            }
            await this.$send_req('/cash/do_subsidy', req);
            this.do_subsidy_diag = false;
            this.refresh_page();
            this.subsidy_range.range = [];
        },
    },
}
</script>

<style>

</style>

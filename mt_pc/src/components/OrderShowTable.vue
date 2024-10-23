<template>
<div class="order_show">
    <div class="filter_bar">
        <el-tabs v-model="status" @tab-click="refresh_order">
            <el-tab-pane label="全部" name="all"></el-tab-pane>
            <el-tab-pane label="未确认" name="0"></el-tab-pane>
            <el-tab-pane v-if="!is_buy" label="未付款" name="1"></el-tab-pane>
            <el-tab-pane label="未发车" name="2"></el-tab-pane>
            <el-tab-pane label="已关闭" name="3"></el-tab-pane>
        </el-tabs>
        <el-date-picker v-model="date_range" type="daterange" align="right" unlink-panels range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="pickerOptions" @change="refresh_order">
        </el-date-picker>
    </div>
    <page-content ref="order" body_key="plans" :req_body="filter" :req_url="req_url" :enable="filter_ready">
        <template v-slot:default="slotProps">
            <div style="height: 85vh">
                <el-table :data="slotProps.content" style="width: 100%" stripe height="100%">
                    <el-table-column v-if="motived" prop="stuff.company.name" label="接单公司">
                    </el-table-column>
                    <el-table-column v-else prop="company.name" label="下单公司">
                    </el-table-column>
                    <el-table-column prop="stuff.name" label="物料">
                    </el-table-column>
                    <el-table-column prop="plan_time" label="计划日期">
                    </el-table-column>
                    <el-table-column prop="main_vehicle.plate" label="主车号">
                    </el-table-column>
                    <el-table-column prop="behind_vehicle.plate" label="挂车号">
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
</div>
</template>

<script>
import page_content from './PageContent.vue';
import moment from 'moment';
export default {
    name: 'OrderShowTable',
    components: {
        'page-content': page_content,
    },
    data: function () {
        return {
            date_range: '',
            status: 'all',
            filter: {
                start_time: '',
                end_time: '',
            },
            filter_ready: false,
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
    props: {
        req_url: String,
        motived: Boolean,
        is_buy: Boolean,
    },
    methods: {
        refresh_order: function () {
            if (this.status != 'all') {
                this.filter.status = parseInt(this.status);
            }
            this.filter.status
            this.filter.start_time = moment(this.date_range[0]).format('YYYY-MM-DD');
            this.filter.end_time = moment(this.date_range[1]).format('YYYY-MM-DD');
            this.$refs.order.refresh(1);
        },
        reset_filter: function () {
            this.filter = {
                start_time: moment().format('YYYY-MM-DD'),
                end_time: moment().add(1, 'days').format('YYYY-MM-DD'),
            };
            this.date_range = [new Date(this.filter.start_time), new Date(this.filter.end_time)];
            this.status = 'all';
            this.filter_ready = true;
            this.$nextTick(() => {
                this.refresh_order();
            });
        },
    },
    mounted: function () {
        this.reset_filter();
    }

}
</script>

<style scoped>
.order_show {
    height: calc(100vh - 50px);
    overflow-y: auto;
}

.filter_bar {
    display: flex;
    justify-content: space-between;
    /* 使元素靠右排列 */
    align-items: center;
    /* 垂直居中对齐 */
}
</style>

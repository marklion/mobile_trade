<template>
<div class="order_show">
    <div class="filter_bar">
        <el-tabs v-model="status" @tab-click="refresh_order">
            <el-tab-pane label="全部" name="all"></el-tab-pane>
            <el-tab-pane name="0">
                <template slot="label">
                    <span>未确认</span>
                    <el-badge v-if="count_by_status.need_confirm != 0" :value="count_by_status.need_confirm" size="mini"></el-badge>
                </template>
            </el-tab-pane>
            <el-tab-pane v-if="!is_buy" name="1">
                <template slot="label">
                    <span>未付款</span>
                    <el-badge v-if="count_by_status.need_pay!= 0" :value="count_by_status.need_pay" size="mini"></el-badge>
                </template>
            </el-tab-pane>
            <el-tab-pane :name="is_buy?'1':'2'">
                <template slot="label">
                    <span>未发车</span>
                    <el-badge v-if="count_by_status.need_deliver!= 0" :value="count_by_status.need_deliver" size="mini"></el-badge>
                </template>
            </el-tab-pane>
            <el-tab-pane label="已关闭" name="3"></el-tab-pane>
        </el-tabs>
        <div style="display:flex;">
            <el-input placeholder="输入车号过滤" v-model="filter_string">
                <div slot="suffix">
                    <el-button type="primary" size="small" @click="do_search">搜索</el-button>
                    <el-button type="danger" size="small" @click="cancel_search">清除</el-button>
                </div>
            </el-input>
            <el-date-picker style="width:450px" v-model="date_range" type="daterange" align="right" unlink-panels range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="pickerOptions" @change="refresh_order">
            </el-date-picker>
        </div>
    </div>
    <page-content ref="order" body_key="plans" :search_func="search_func" :req_body="filter" :req_url="req_url" :enable="filter_ready">
        <template v-slot:default="slotProps">
            <div style="height: 85vh">
                <el-table :data="slotProps.content" style="width: 100%" stripe height="100%">
                    <el-table-column min-width="170" v-if="motived" prop="stuff.company.name" label="接单公司">
                    </el-table-column>
                    <el-table-column min-width="170" v-else label="下单公司">
                        <template slot-scope="scope">
                            {{scope.row.company.name}}({{scope.row.rbac_user.name}})
                        </template>
                    </el-table-column>
                    <el-table-column min-width="50" prop="stuff.name" label="物料">
                    </el-table-column>
                    <el-table-column min-width="70" label="状态">
                        <template slot-scope="scope">
                            {{status_string(scope.row.status)}}
                        </template>
                    </el-table-column>
                    <el-table-column min-width="100" prop="plan_time" label="计划日期">
                    </el-table-column>
                    <el-table-column min-width="100" prop="main_vehicle.plate" label="主车号">
                    </el-table-column>
                    <el-table-column min-width="100" prop="behind_vehicle.plate" label="挂车号">
                    </el-table-column>
                    <el-table-column min-width="80" prop="driver.name" label="司机姓名">
                    </el-table-column>
                    <el-table-column min-width="120" prop="driver.phone" label="司机电话">
                    </el-table-column>
                    <el-table-column prop="comment" label="备注">
                    </el-table-column>
                    <el-table-column fixed="right" label="操作" width="50">
                        <template slot-scope="scope">
                            <el-button type="text" size="small" @click="expend(scope.row)">展开</el-button>
                        </template>
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
import PinyinMatch from 'pinyin-match';
export default {
    name: 'OrderShowTable',
    components: {
        'page-content': page_content,
    },
    data: function () {
        return {
            status_string: function (status) {
                let status_array = ['未确认', '未付款', '未发车', '已关闭'];
                let index = status;
                if (this.is_buy && status == 1) {
                    index = 2;
                }
                return status_array[index];
            },
            filter_string: '',
            date_range: '',
            status: 'all',
            filter: {
                start_time: '',
                end_time: '',
            },
            count_by_status: {
                need_confirm: 0,
                need_pay: 0,
                need_deliver: 0,
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
        expend: function (plan) {
            console.log(plan);
        },
        cancel_search: function () {
            this.filter_string = '';
            this.$refs.order.cancel_search();
        },
        do_search: function () {
            this.$refs.order.do_search();
        },
        search_func: function (item) {
            if (this.filter_string) {
                return PinyinMatch.match(item.main_vehicle.plate, this.filter_string) || PinyinMatch.match(item.behind_vehicle.plate, this.filter_string);
            } else {
                return true;
            }
        },
        refresh_order_count: async function () {
            this.count_by_status.need_confirm = (await this.$send_req(this.req_url, {
                ...this.filter,
                status: 0,
                only_count: true
            })).total;
            if (this.is_buy) {
                this.count_by_status.need_deliver = (await this.$send_req(this.req_url, {
                    ...this.filter,
                    status: 1,
                    only_count: true
                })).total;
            } else {
                this.count_by_status.need_pay = (await this.$send_req(this.req_url, {
                    ...this.filter,
                    status: 1,
                    only_count: true
                })).total;
                this.count_by_status.need_deliver = (await this.$send_req(this.req_url, {
                    ...this.filter,
                    status: 2,
                    only_count: true
                })).total;
            }

        },
        refresh_order: function () {
            if (this.status != 'all') {
                this.filter.status = parseInt(this.status);
            } else {
                this.filter.status = undefined;
            }
            this.filter.start_time = moment(this.date_range[0]).format('YYYY-MM-DD');
            this.filter.end_time = moment(this.date_range[1]).format('YYYY-MM-DD');
            this.$nextTick(async () => {
                await this.refresh_order_count();
                this.$refs.order.refresh(1);
            });
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

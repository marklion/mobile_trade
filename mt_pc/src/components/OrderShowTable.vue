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
        <el-dropdown v-if="order_selected.length > 0" size="small" split-button type="primary" @command="do_batch_operate">
            {{order_selected.length}}条批量操作
            <el-dropdown-menu slot="dropdown">
                <el-dropdown-item v-for="(single_action, index) in batch_operate_array" :key="index" :command="index">{{single_action.name}}</el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>
        <div style="display:flex;">
            <select-search filterable body_key="contracts" first_item="所有公司" :get_url="contract_get_url" item_label="company.name" item_value="company.id" :permission_array="['sale_management', 'stuff_management']" v-model="company_id" @refresh="refresh_order"></select-search>
            <select-search body_key="stuff" first_item="所有物料" get_url="/stuff/get_all" item_label="name" item_value="id" :permission_array="['stuff']" v-model="stuff_id" @refresh="refresh_order"></select-search>
            <el-input placeholder="输入车号过滤" v-model="filter_string" style="width: 250px;">
                <div slot="suffix">
                    <el-button type="primary" size="small" @click="do_search">搜索</el-button>
                    <el-button type="danger" size="small" @click="cancel_search">清除</el-button>
                </div>
            </el-input>
            <el-date-picker style="width:260px" v-model="date_range" type="daterange" align="right" unlink-panels range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="pickerOptions" @change="refresh_order">
            </el-date-picker>
        </div>
    </div>
    <page-content ref="order" body_key="plans" :search_input="filter_string" :search_key="['main_vehicle.plate', 'behind_vehicle.plate']" :req_body="filter" :req_url="req_url" :enable="filter_ready">
        <template v-slot:default="slotProps">
            <div style="height: 80vh">
                <el-table ref="order_table" :data="slotProps.content" style="width: 100%" stripe height="100%" @selection-change="record_selection">
                    <el-table-column type="selection"></el-table-column>
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
                            <div v-if="scope.row.status == 1 && scope.row.arrears > 0">
                                <el-tag size="mini" type="warning">
                                    欠:{{scope.row.arrears}}需付{{ scope.row.outstanding_vehicles}}车
                                </el-tag>
                            </div>
                            <div>
                                {{status_string(scope.row.status)}}
                            </div>
                            <div v-if="scope.row.status == 3 && !scope.row.manual_close">
                                <el-tag size="mini" type="primary">
                                    装卸量:{{scope.row.count}}
                                </el-tag>
                            </div>
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
    <el-drawer destroy-on-close title="计划详情" :visible.sync="show_plan_detail" direction="rtl" size="70%">
        <order-detail :motived="motived" :plan="focus_plan" @refresh="show_plan_detail= false; refresh_order()"></order-detail>
    </el-drawer>
    <el-dialog append-to-body title="设置代理" :visible.sync="delegate_show" width="30%">
        <select-search body_key="delegates" get_url="/stuff/get_delegates" item_label="name" item_value="id" :permission_array="['sale_management', 'buy_management']" v-model="delegate_id"></select-search>
        <span slot="footer">
            <el-button @click="delegate_show= false">取 消</el-button>
            <el-button type="primary" @click="set_delegate">确 定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import page_content from './PageContent.vue';
import moment from 'moment';
import SelectSearch from './SelectSearch.vue';
import OrderDetail from './OrderDetail.vue';
export default {
    name: 'OrderShowTable',
    components: {
        'page-content': page_content,
        'select-search': SelectSearch,
        'order-detail': OrderDetail,
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
            delegate_show: false,
            delegate_id: 0,
            order_selected: [],
            show_plan_detail: false,
            focus_plan: {},
            stuff_id: 0,
            company_id: 0,
            company_search_input: '',
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
            pickerOptions: this.$quik_date_option,
            batch_operate_array: [{
                name: '批量确认',
                url: this.is_buy ? '/buy_management/order_buy_confirm/' : '/sale_management/order_sale_confirm',
            }, {
                name: '批量验款',
                url: '',
                is_pay: true,
            }, {
                name: '批量取消',
                url: (() => {
                    let ret = '';
                    if (this.is_buy) {
                        if (this.motived) {
                            ret = '/supplier/order_sale_cancel';
                        } else {
                            ret = '/buy_management/close';
                        }
                    } else {
                        if (this.motived) {
                            ret = '/customer/order_buy_cancel';
                        } else {
                            ret = '/sale_management/close';
                        }
                    }
                    return ret;
                })()
            }, {
                name: '批量调价',
                is_change_price: true,
                url: '/stuff/change_price_by_plan'
            }, {
                name: '批量代理',
                is_set_delegate: true,
                url: '/sale_management/change_plan_delegate'
            }],
        };
    },
    props: {
        req_url: String,
        motived: Boolean,
        is_buy: Boolean,
    },
    methods: {
        get_pay_url: async function () {
            let verify_pay_by_cash = (await this.$send_req('/stuff/get_verify_pay_config', {})).verify_pay_by_cash;
            let url_prefix = '/sale_management';
            if (verify_pay_by_cash) {
                url_prefix = '/cash'
            }
            return url_prefix + '/order_sale_pay';
        },
        set_delegate: async function () {
            for (let i = 0; i < this.order_selected.length; i++) {
                let order = this.order_selected[i];
                await this.$send_req('/sale_management/change_plan_delegate', {
                    plan_id: order.id,
                    delegate_id: this.delegate_id,
                });
            }
            this.delegate_show = false;
            this.$refs.order_table.clearSelection();
            this.refresh_order();
        },
        do_batch_operate: async function (_index) {
            let opt = this.batch_operate_array[_index];
            if (opt.is_change_price) {
                this.$prompt('请输入新价格', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    inputPattern: /^\d+(\.\d{1,2})?$/,
                }).then(async ({
                    value
                }) => {
                    let unit_price = parseFloat(value);
                    this.$prompt('请输入原因', '提示', {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                    }).then(async ({
                        value
                    }) => {
                        let plan_ids = this.order_selected.map(item => item.id);
                        let plan_id_string = plan_ids.join(',');
                        await this.$send_req(opt.url, {
                            plan_id: plan_id_string,
                            unit_price: unit_price,
                            comment: value
                        });
                        this.$refs.order_table.clearSelection();
                        this.refresh_order();
                    });
                });
            } else if (opt.is_set_delegate) {
                this.delegate_show = true;
            } else {
                this.$confirm('此操作将批量操作选中的订单, 是否继续?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(async () => {
                    let url = opt.url;
                    if (opt.is_pay) {
                        url = await this.get_pay_url();
                    }
                    for (let i = 0; i < this.order_selected.length; i++) {
                        let order = this.order_selected[i];
                        await this.$send_req(url, {
                            plan_id: order.id,
                        });
                    }
                    this.$refs.order_table.clearSelection();
                    this.refresh_order();
                });
            }
        },
        record_selection: function (val) {
            this.order_selected = val;
        },
        expend: function (plan) {
            this.focus_plan = plan;
            this.show_plan_detail = true;
        },
        cancel_search: function () {
            this.filter_string = '';
            this.$refs.order.cancel_search();
        },
        do_search: function () {
            this.$refs.order.do_search();
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
            if (this.stuff_id != 0) {
                this.filter.stuff_id = this.stuff_id;
            } else {
                this.filter.stuff_id = undefined;
            }
            if (this.company_id != 0) {
                this.filter.company_id = this.company_id;
            } else {
                this.filter.company_id = undefined;
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
    height: calc(100vh - 83px);
    overflow-y: auto;
}

.filter_bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>

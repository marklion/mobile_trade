<template>
<el-container>
    <el-header style="padding-top: 20px;">
        <div style="display:flex; justify-content:flex-start;gap: 10px;">
            <el-button type="success" @click="show_create_diag = true">新增</el-button>
            <select-search v-model="search_info" filterable get_url="/stuff/get_all" first_item="所有物料" :search_key="['stuff.name']" item_label="name" item_value="name" :permission_array="['stuff']" body_key="stuff" @refresh="do_search"></select-search>
        </div>
    </el-header>
    <el-main>
        <page-content :ref="'bc_list'" body_key="biddings" :search_input="search_info" :search_key="['stuff.name']" :req_url="'/bid/get_all_created'" :enable="true">
            <template #default="slotProps">
                <el-table :data="slotProps.content" :table-layout="table_layout">
                    <el-table-column label="展开" type="expand">
                        <template #default="scope">
                            <el-table :data="scope.row.bidding_turns" :table-layout="table_layout" size="mini" style="padding-left: 50px;">
                                <el-table-column label="竞价项" type="expand" width="120">
                                    <template #default="scope">
                                        <el-table :data="scope.row.bidding_items" size="mini" :table-layout="table_layout" style="padding-left: 50px;">
                                            <el-table-column prop="rbac_user.company.name" label="竞价公司"></el-table-column>
                                            <el-table-column prop="rbac_user.name" label="竞价用户"></el-table-column>
                                            <el-table-column prop="price" label="出价">
                                                <template slot-scope="itemScope">
                                                    ￥{{ itemScope.row.price }}
                                                </template>
                                            </el-table-column>
                                            <el-table-column prop="time" label="出价时间"></el-table-column>
                                            <el-table-column prop="accept" label="是否接受">
                                                <template slot-scope="itemScope">
                                                    <el-tag :type="itemScope.row.accept ? 'success' : 'info'">
                                                        {{ itemScope.row.accept ? '接受' : '未接受' }}
                                                    </el-tag>
                                                </template>
                                            </el-table-column>
                                        </el-table>
                                    </template>
                                </el-table-column>
                                <el-table-column label="轮次">
                                    <template slot-scope="scope">
                                        第{{ scope.row.turn + 1 }}轮
                                    </template>
                                </el-table-column>
                                <el-table-column prop="begin_time" label="开始时间"></el-table-column>
                                <el-table-column prop="end_time" label="结束时间"></el-table-column>
                                <el-table-column prop="finish" label="是否结束">
                                    <template slot-scope="scope">
                                        <el-tag :type="scope.row.finish ? 'success' : 'info'">
                                            {{ scope.row.finish ? '已结束' : '进行中' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>

                            </el-table>
                        </template>
                    </el-table-column>
                    <el-table-column prop="stuff.name" label="物料">
                        <template slot-scope="scope">
                            <span style="font-weight: bold;">{{ scope.row.stuff.name }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="total" label="物料总量"></el-table-column>
                    <el-table-column label="竞价轮次">
                        <template slot-scope="scope">
                            共{{ scope.row.total_turn }}轮
                        </template>
                    </el-table-column>
                    <el-table-column prop="min" label="最低出价">
                        <template slot-scope="scope">
                            <span style="color: red;">￥{{ scope.row.min }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="max" label="最高出价">
                        <template slot-scope="scope">
                            <span style="color: green;">￥{{ scope.row.max }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="status" label="竞价状态">
                        <template slot-scope="scope">
                            <el-tooltip v-if="scope.row.customer_confirm_time" placement="right">
                                <template #content>
                                    出价用户: {{ scope.row.confirm_opt_name }} <br> 出价时间: {{
                                            scope.row.customer_confirm_time }}
                                </template>
                                <el-tag type="success">价格已确认</el-tag>
                            </el-tooltip>
                            <el-tag type="danger" v-else-if="scope.row.status == 1">
                                价格未确认
                            </el-tag>
                            <el-tag type="info" v-else>
                                未出价
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="pay_first" label="押金">
                        <template slot-scope="scope">
                            ￥{{ scope.row.pay_first }}
                        </template>
                    </el-table-column>
                    <el-table-column label="备注" show-overflow-tooltip>
                        <template slot-scope="scope">
                            <div>
                                {{ scope.row.comment }}
                            </div>
                            <div>
                                <el-tag size="mini" type="primary" v-if="scope.row.price_hide">价格隐藏</el-tag>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column v-permission="['bid']" label="操作" width="300">
                        <template slot-scope="scope">
                            <el-button v-if="scope.row.status == 0 && scope.row.bidding_turns.length == 0" type="primary" size="mini" @click="handle_start_bid(scope.row)">开启</el-button>
                            <el-button v-else-if="scope.row.status == 0 && scope.row.bidding_turns.length != scope.row.total_turn" type="warning" size="mini" @click="handle_next_bid(scope.row)">开启下一轮</el-button>
                            <el-button v-if="scope.row.status == 0" type="danger" size="mini" @click="stop_bid(scope.row)">停止</el-button>
                            <el-button type="success" size="mini" @click="export_bc(scope.row)">导出</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </template>
        </page-content>
        <el-dialog :visible.sync="show_create_diag" width="600px" @close="reset_bc_form">
            <el-form ref="add_bc" :model="new_bc" :rules="rules" label-width="120px">
                <el-form-item label="备注" prop="comment">
                    <el-input v-model="new_bc.comment" placeholder="请输入备注"></el-input>
                </el-form-item>
                <el-form-item label="最低出价" prop="min">
                    <el-input type="number" v-model="new_bc.min" placeholder="请输入最低出价"></el-input>
                </el-form-item>
                <el-form-item label="最高出价" prop="max">
                    <el-input type="number" v-model="new_bc.max" placeholder="请输入最高出价"></el-input>
                </el-form-item>
                <el-form-item label="押金" prop="pay_first">
                    <el-input type="number" v-model="new_bc.pay_first" placeholder="请输入押金"></el-input>
                </el-form-item>
                <el-form-item label="物料" prop="stuff_name">
                    <select-search ref="stuff_select" v-model="new_bc.stuff_id" filterable get_url="/stuff/get_all" first_item="请选择" :search_key="['stuff.name']" item_label="name" item_value="id" :permission_array="['stuff']" body_key="stuff" @on-change="add_stuff2bc"></select-search>
                </el-form-item>
                <el-form-item label="物料总量" prop="total">
                    <el-input type="number" v-model="new_bc.total" placeholder="请输入总量"></el-input>
                </el-form-item>
                <el-form-item label="竞价轮次" prop="total_turn">
                    <el-input type="number" v-model="new_bc.total_turn" placeholder="请输入竞价轮次"></el-input>
                </el-form-item>
                <el-form-item label="隐藏价格" prop="price_hide">
                    <el-switch v-model="new_bc.price_hide" size="small">
                    </el-switch>
                </el-form-item>
            </el-form>
            <span slot="footer" class="dialog-footer">
                <el-button @click="reset_bc_form">取消</el-button>
                <el-button type="primary" @click="submitForm('add_bc')">确定</el-button>
            </span>
        </el-dialog>
        <el-dialog title="开启竞价" :visible.sync="show_start_bid" width="600px" @close="show_start_bid = false">
            <el-form ref="start_bid" label-width="120px">
                <el-form-item label="时间范围">
                    <el-date-picker v-model="bt_time_range" format="yyyy-MM-dd HH:mm" value-format="yyyy-MM-dd HH:mm" type="datetimerange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期">
                    </el-date-picker>
                </el-form-item>
                <el-form-item label="客户范围">
                    <page-select v-model="selected_companies" placeholder="点击选择客户" :fetch-function="get_related_companies" :params="{ stuff_id: new_bc.stuff_id }" mode="pagenation" multiple @change="handleCustomerSelect">
                        <template #option-list="{ options }">
                            <el-option v-for="item in options" :key="item.id" :label="`${item.company.name} - ${item.rbac_users[0].name}`" :value="item.rbac_users[0].id">
                            </el-option>
                        </template>
                    </page-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="show_start_bid = false">取消</el-button>
                <el-button type="primary" @click="start_bid">确定</el-button>
            </template>
        </el-dialog>
        <el-dialog title="开启下一轮竞价" :visible.sync="show_next_bid" width="600px" @close="show_next_bid = false">
            <el-form ref="next_bid" label-width="120px">
                <el-form-item label="时间范围">
                    <el-date-picker v-model="bt_time_range" format="yyyy-MM-dd HH:mm" value-format="yyyy-MM-dd HH:mm" type="datetimerange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期">
                    </el-date-picker>
                </el-form-item>
                <el-form-item label="前几入围">
                    <el-input type="number" placeholder="请输入前几名" v-model="next_bid_req.top_n"></el-input>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="show_next_bid = false">取消</el-button>
                <el-button type="primary" @click="next_bid">确定</el-button>
            </template>
        </el-dialog>
    </el-main>
</el-container>
</template>

<script>
import PageContent from '@/components/PageContent.vue';
import PageSelect from '@/components/PageSelect.vue';
import SelectSearch from '@/components/SelectSearch.vue';
export default {
    name: 'BiddingConfig',
    components: {
        "page-content": PageContent,
        "page-select": PageSelect,
        "select-search": SelectSearch
    },
    data: function () {
        return {
            table_layout: 'auto',
            search_info: '',
            search_stuff_info: '',
            show_create_diag: false,
            stuff_data2show: [],
            show_start_bid: false,
            show_next_bid: false,
            bt_time_range: [new Date(), new Date(Date.now() + 60 * 60 * 1000)],
            cust_selected: '',
            next_bid_req: {
                bc_id: 0,
                begin_time: '',
                end_time: '',
                top_n: 0,
            },
            start_bid_req: {
                bc_id: 0,
                begin_time: '',
                end_time: '',
                joiner_ids: [],
            },
            selected_companies: [],
            new_bc: {
                "comment": "",
                "max": 120,
                "min": 80,
                "pay_first": 0,
                "stuff_id": 0,
                "total": 0,
                "total_turn": 1,
                "stuff_name": '',
                price_hide: false,
            },
            rules: {
                comment: [{
                    required: true,
                    message: '输入备注',
                    trigger: 'change'
                }],
                max: [{
                    required: true,
                    message: '输入最高出价',
                    trigger: 'change'
                }, ],
                min: [{
                    required: true,
                    message: '输入最低出价',
                    trigger: 'change'
                }, ],
                stuff_name: [{
                    required: true,
                    message: '选择物料',
                    trigger: 'change'
                }],
                total: [{
                    required: true,
                    message: '输入总量',
                    trigger: 'change'
                }, ],
                total_turn: [{
                    required: true,
                    message: '输入竞价总轮次',
                    trigger: 'change'
                }, ]
            },
            stuff_list: [],
        };
    },
    watch: {
        bt_time_range: function (newVal) {
            this.start_bid_req.begin_time = newVal[0];
            this.start_bid_req.end_time = newVal[1];
            this.next_bid_req.begin_time = newVal[0];
            this.next_bid_req.end_time = newVal[1];
        }
    },
    methods: {
        refresh: function () {
            let cur_page = this.$refs.bc_list.cur_page;
            this.$refs.bc_list.refresh(cur_page);
        },
        do_search: function () {
            if (this.search_info == '' || this.search_info == '所有物料') {
                this.$refs.bc_list.cancel_search();
            } else {
                this.$refs.bc_list.do_search();
            }
        },
        do_search_stuff: function () {
            this.$refs.stuff_list.do_search();
        },
        cancel_search: function () {
            this.search_info = '';
            this.$refs.bc_list.cancel_search();
        },
        cancel_search_stuff: function () {
            this.search_stuff_info = '';
            this.$refs.stuff_list.cancel_search();
        },
        reset_bc_form: function () {
            this.show_create_diag = false;
            this.$refs.add_bc.resetFields();
        },
        reset_stuff_select: function () {
            this.show_stuff_select = false;
            this.search_stuff_info = '';
        },
        submitForm(formName) {
            this.$refs[formName].validate((valid) => {
                if (valid) {
                    if (parseFloat(this.new_bc.max) <= parseFloat(this.new_bc.min)) {
                        this.$message.error('最高出价必须大于最低出价');
                        return;
                    }
                    this.new_bc.max = parseFloat(this.new_bc.max);
                    this.new_bc.min = parseFloat(this.new_bc.min);
                    this.new_bc.total = parseFloat(this.new_bc.total);
                    this.new_bc.total_turn = parseInt(this.new_bc.total_turn);
                    this.new_bc.pay_first = parseInt(this.new_bc.pay_first);
                    this.$send_req('/bid/create', this.new_bc).then(() => {
                        this.$refs.bc_list.refresh();
                        this.show_create_diag = false;
                    });
                } else {
                    console.log('error submit!!');
                    return false;
                }
            });
        },
        add_stuff2bc: async function (item) {
            if (item.id == 0) {
                return;
            }
            this.new_bc.stuff_id = item.id;
            this.new_bc.stuff_name = item.name;
        },
        get_related_companies: async function (params) {
            let ret = [];
            let resp = await this.$send_req('/sale_management/contract_get', {
                pageNo: params.pageNo,
                stuff_id: params.stuff_id,
            })
            resp.contracts.forEach(item => {
                item.cond = item.company.name
                if (item.rbac_users.length > 0) {
                    ret.push(item)
                }
            });
            return ret;
        },
        handle_start_bid: function (bc) {
            console.log('handle_start_bid', bc);
            this.new_bc.stuff_id = bc.stuff.id;
            this.start_bid_req.bc_id = bc.id;
            this.show_start_bid = true;
        },
        handle_next_bid: function (bc) {
            if (bc.bidding_turns.length > bc.total_turn) {
                this.$message.warning('已达到最多轮次');
                return;
            }
            this.next_bid_req.bc_id = bc.id;
            this.show_next_bid = true;
        },
        handle_select_stuff: async function () {
            this.show_stuff_select = true;
        },
        handleCustomerSelect: function (value) {
            console.log('handleCustomerSelect', value);
        },
        start_bid: async function () {
            this.selected_companies.forEach(item => {
                this.start_bid_req.joiner_ids.push({
                    id: item
                });
            });
            if (this.selected_companies.length <= 1) {
                this.$message.warning('至少选择两家客户');
                return;
            }
            await this.$send_req('/bid/add_turn', this.start_bid_req);
            this.refresh();
            this.show_start_bid = false;
        },
        next_bid: async function () {
            this.$confirm('确定要开启下一轮竞价吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                this.next_bid_req.top_n = parseInt(this.next_bid_req.top_n);
                await this.$send_req('/bid/next_turn', this.next_bid_req);
                this.refresh();
                this.show_next_bid = false;
            }).catch(() => {
                this.$message({
                    type: 'info',
                    message: '已取消'
                });
            });
        },
        stop_bid: async function (bc) {

            this.$confirm('确定要停止竞价吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/bid/stop', {
                    bc_id: bc.id
                });
                this.refresh();
            }).catch(() => {
                this.$message({
                    type: 'info',
                    message: '已取消'
                });
            });
        },
        export_bc: async function (bc) {
            await this.$send_req('/bid/export_bc', {
                bc_id: bc.id
            });
            this.$message.success('导出成功,请到导出记录中查看');
        },
        prepare_company_select: function () {
            this.cust_selected = '';
            this.show_company_select = true;
        },
        get_stuff: async function () {
            let resp = await this.$send_req('/stuff/get_all');
            this.stuff_list = resp.stuff;
        }

    }
}
</script>

<style scoped></style>

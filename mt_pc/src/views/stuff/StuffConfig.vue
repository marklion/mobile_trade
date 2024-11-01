<template>
    <el-container>
        <el-header height="50" style="padding-top: 20px;">
            <template>
                <el-button icon="el-icon-circle-plus" type="success"
                    @click="show_stuff_fetch = true; is_update = false">新增物料</el-button>
                <el-button :icon="view_type == 'card' ? 'el-icon-s-grid' : 'el-icon-s-data'" type="primary"
                    @click="change_view_type()">{{ view_type == 'card' ? '卡片视图' : '表格视图' }}</el-button>
            </template>
        </el-header>
        <el-main>
            <template>
                <div v-if="view_type == 'card'" class="stuff_card_list">
                    <div class="stuff_card_item" v-for="(item, index) in stuff_data" :key="index">
                        <el-card>
                            <template #header>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>{{ item.name }}</span>
                                    <span>￥{{ item.price }}</span>
                                </div>
                            </template>
                            <div style="display: flex;gap: 10px; flex-wrap: wrap; align-items: center;">
                                <el-tag v-if="item.comment" type="info">{{ item.comment }}</el-tag>
                                <el-tag v-if="item.expect_count" type="danger">期望单车装载量: {{ item.expect_count }}</el-tag>
                                <el-tag v-if="item.close_time" type="warning">自动关闭时间点: {{ item.close_time }}</el-tag>
                                <el-tag v-if="item.delay_days" type="danger">允许迟到{{ item.delay_days }}天</el-tag>
                                <el-tag v-if="item.use_for_buy" type="primary">用于采购</el-tag>
                                <el-tag v-if="item.change_last_minutes" type="info">{{ next_price_show(item) }}</el-tag>
                                <el-tag v-else type="success">用于销售</el-tag>
                                <el-tag v-if="item.concern_fapiao" type="primary">关注发票</el-tag>
                            </div>
                            <el-divider></el-divider>
                            <el-row style="display: flex; flex-wrap: nowrap; align-items: center;">
                                <el-button size="mini" @click="prepare_update(item)">修改</el-button>
                                <el-button size="mini" type="danger" @click="prepare_delete(item)">删除</el-button>
                                <el-button size="mini" type="warning" @click="prepare_change_price(item)">调价</el-button>
                                <el-button size="mini" type="info" @click="prepare_history(item)">调价历史</el-button>
                                <el-button v-if="!item.change_last_minutes" size="mini" type="success"
                                    @click="prepare_next_price(item)">定时调价</el-button>
                                <el-button v-else size="mini" type="success"
                                    @click="prepare_cancel_next_price(item)">取消定时调价</el-button>
                            </el-row>
                            <el-divider></el-divider>
                            <el-row>
                                <el-col :span="12">
                                    <el-switch v-model="item.need_sc" class="ml-2" inline-prompt active-text="需要安检"
                                        @change="change_need_sc($event, item)" />
                                </el-col>
                                <el-col :span="12">
                                    <el-switch v-model="item.need_enter_weight" inline-prompt active-text="需要进厂前重量"
                                        @change="change_need_enter_weight($event, item)"></el-switch>
                                </el-col>
                            </el-row>
                            <el-divider></el-divider>
                            <el-row>
                                <el-col :span="12">
                                    <el-switch v-model="item.need_exam" inline-prompt active-text="需要考试"
                                        @change="change_need_exam($event, item)" />
                                </el-col>
                                <el-col :span="12">
                                    <el-switch v-model="item.no_need_register" inline-prompt active-text="不用排号"
                                        @change="change_no_need_register($event, item)" />
                                </el-col>
                            </el-row>
                            <el-divider></el-divider>
                            <el-row>
                                <el-col :span="12">
                                    <el-switch v-model="item.checkout_delay" inline-prompt active-text="延迟结算"
                                        @change="change_checkout_delay($event, item)"></el-switch>
                                </el-col>
                                <el-col :span="12">
                                    <el-switch v-model="item.manual_weight" inline-prompt active-text="手动计量"
                                        @change="change_manual_weight($event, item)"></el-switch>
                                </el-col>
                            </el-row>
                            <el-divider content-position="center">装卸区域配置</el-divider>
                            <div style="display: flex; flex-wrap: nowrap; align-items: center;">
                                <el-tag v-for="zone in item.drop_take_zones" :key="zone.id" closable
                                    @close="prepare_del_zone(zone.id)">{{
                                    zone.name }}</el-tag>
                                <el-button size="mini" type="primary" @click="prepare_add_zone(item)">添加</el-button>
                            </div>
                        </el-card>
                    </div>
                </div>
                <div v-else>
                    <el-table :data="stuff_data" style="width: 100%" border stripe
                        :default-sort="{prop: 'name', order: 'ascending'}">
                        <el-table-column prop="name" label="物料名称" width="120" align="center" sortable></el-table-column>
                        <el-table-column label="配置" fixed="left" width="100" align="center">
                            <template slot-scope="scope">
                                <el-popover
                                    placement="left"
                                    trigger="click"
                                    width="300">
                                    <div class="switch-group">
                                        <el-switch v-model="scope.row.need_sc" inline-prompt active-text="需要安检" @change="change_need_sc($event, scope.row)" />
                                        <el-switch v-model="scope.row.need_enter_weight" inline-prompt active-text="需要进厂前重量" @change="change_need_enter_weight($event, scope.row)"></el-switch>
                                        <el-switch v-model="scope.row.need_exam" inline-prompt active-text="需要考试" @change="change_need_exam($event, scope.row)" />
                                        <el-switch v-model="scope.row.no_need_register" inline-prompt active-text="不用排号" @change="change_no_need_register($event, scope.row)" />
                                        <el-switch v-model="scope.row.checkout_delay" inline-prompt active-text="延迟结算" @change="change_checkout_delay($event, scope.row)"></el-switch>
                                        <el-switch v-model="scope.row.manual_weight" inline-prompt active-text="手动计量" @change="change_manual_weight($event, scope.row)"></el-switch>
                                    </div>
                                    <el-button slot="reference" size="mini" type="primary">配置</el-button>
                                </el-popover>
                            </template>
                        </el-table-column>
                        <el-table-column prop="price" label="价格" align="center" sortable>
                            <template slot-scope="scope">
                                <span>￥{{ scope.row.price }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="调价历史" width="100" align="center">
                            <template slot-scope="scope">
                                <el-button size="mini" type="info" @click="prepare_history(scope.row)">调价历史</el-button>
                            </template>
                        </el-table-column>
                        <el-table-column prop="comment" label="备注" width="120" align="center"></el-table-column>
                        <el-table-column prop="expect_count" label="期望单车装载量" width="150" align="center" sortable></el-table-column>
                        <el-table-column prop="delay_days" label="允许迟到天数" width="150" align="center" sortable></el-table-column>
                        <el-table-column prop="close_time" label="自动关闭时间点" width="150" align="center" sortable></el-table-column>
                        <el-table-column prop="use_for_buy" label="用于采购" width="100" align="center">
                            <template slot-scope="scope">
                                <el-tag :type="scope.row.use_for_buy ? 'success' : 'info'">{{ scope.row.use_for_buy ? '是' : '否' }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="concern_fapiao" label="关注发票" width="100" align="center">
                            <template slot-scope="scope">
                                <el-tag :type="scope.row.concern_fapiao ? 'success' : 'info'">{{ scope.row.concern_fapiao ? '是' : '否' }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" fixed="right" width="400" align="center">
                            <template slot-scope="scope">
                                <el-button-group>
                                    <el-button size="mini" type="primary" @click="prepare_update(scope.row)">修改</el-button>
                                    <el-button size="mini" type="danger" @click="prepare_delete(scope.row)">删除</el-button>
                                    <el-button size="mini" type="warning" @click="prepare_change_price(scope.row)">调价</el-button>
                                    <el-button v-if="!scope.row.change_last_minutes" size="mini" type="success" @click="prepare_next_price(scope.row)">定时调价</el-button>
                                    <el-button v-else size="mini" type="success" @click="prepare_cancel_next_price(scope.row)">取消定时调价</el-button>
                                </el-button-group>
                            </template>
                        </el-table-column>
                        
                    </el-table>
                </div>
            </template>

            <el-dialog :visible.sync="show_zone_add" width="600px" title="添加区域">
                <el-form ref="zone_form" :model="zone_req" :rules="zone_rules">
                    <el-form-item label="区域名称" prop="zone_name">
                        <el-input v-model="zone_req.zone_name"></el-input>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="zone_add">确定</el-button>
                        <el-button @click="show_zone_add = false">取消</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>
            <el-dialog :visible.sync="show_stuff_fetch" :title="is_update ? '修改物料' : '新增物料'">
                <el-form ref="form" :model="stuff_ready_fetch" :rules="rules">
                    <el-form-item label="物料名称" prop="name">
                        <el-input v-model="stuff_ready_fetch.name" :disabled="is_update"></el-input>
                    </el-form-item>
                    <el-form-item label="备注" prop="comment">
                        <el-input v-model="stuff_ready_fetch.comment"></el-input>
                    </el-form-item>
                    <el-form-item label="期望单车装载量" prop="expect_count">
                        <el-input v-model="stuff_ready_fetch.expect_count"></el-input>
                    </el-form-item>
                    <el-form-item label="允许迟到天数" prop="delay_days">
                        <el-input v-model="stuff_ready_fetch.delay_days"></el-input>
                    </el-form-item>
                    <el-form-item label="自动关闭时间点" prop="close_time">
                        <el-date-picker v-model="stuff_ready_fetch.close_time" type="datetime"
                            placeholder="选择时间，不填就是不关闭"></el-date-picker>
                    </el-form-item>
                    <el-form-item label="用于采购" prop="use_for_buy">
                        <el-switch v-model="stuff_ready_fetch.use_for_buy"></el-switch>
                    </el-form-item>
                    <el-form-item label="关注发票" prop="concern_fapiao">
                        <el-switch v-model="stuff_ready_fetch.concern_fapiao"></el-switch>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="fetch_stuff">确定</el-button>
                        <el-button @click="show_stuff_fetch = false">取消</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>
            <el-dialog :visible.sync="show_cancel_next_price" width="600px" @close="show_cancel_next_price = false">
                <span>确定要关闭定时调价吗?</span>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="show_cancel_next_price = false">取消</el-button>
                    <el-button type="primary" @click="do_cancel_next_price">确定</el-button>
                </span>
            </el-dialog>
            <el-dialog :visible.sync="show_change_price" width="600px" title="调价">
                <el-form ref="change_price_form" :model="stuff2change_price" :rules="price_rules">
                    <el-form-item label="新价格" prop="price">
                        <el-input v-model="stuff2change_price.price"></el-input>
                    </el-form-item>
                    <el-form-item label="备注" prop="comment">
                        <el-input v-model="stuff2change_price.comment"></el-input>
                    </el-form-item>
                    <el-form-item label="影响计划？" v-if="!price_profile.hide_impact_selector">
                        <el-switch v-model="stuff2change_price.to_plan"></el-switch>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="change_price">确定</el-button>
                        <el-button @click="show_change_price = false">取消</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>
            <el-dialog :visible.sync="show_next_price" width="600px" title="定时调价" @close="show_next_price = false">
                <el-form ref="next_price_form" :model="next_price_req" :rules="next_price_rules">
                    <el-form-item label="新价格" :rules="[{ required: true, message: '请输入新价格', trigger: 'blur' }]">
                        <el-input v-model="next_price_req.next_price"></el-input>
                    </el-form-item>
                    <el-form-item label="备注" :rules="[{ required: true, message: '请输入备注', trigger: 'blur' }]">
                        <el-input v-model="next_price_req.next_comment"></el-input>
                    </el-form-item>
                    <el-form-item label="调价时间">
                        <el-date-picker v-model="next_price_req.next_time" type="datetime"
                            placeholder="点击选择时间"></el-date-picker>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="do_next_price">确定</el-button>
                        <el-button @click="show_next_price = false">取消</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>
            <el-dialog :visible.sync="show_history" title="调价历史" @close="show_history = false">
                <el-table :data="price_history_data">
                    <el-table-column prop="operator" label="操作人"></el-table-column>
                    <el-table-column prop="new_price" label="新价格"></el-table-column>
                    <el-table-column label="备注">
                        <template slot-scope="scope">
                            <el-tag type="info">{{ scope.row.comment }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="时间">
                        <template slot-scope="scope">
                            <el-tag type="danger">{{ scope.row.time }}</el-tag>
                        </template>
                    </el-table-column>
                </el-table>
            </el-dialog>
        </el-main>
    </el-container>
</template>

<script>
import moment from 'moment';
export default {
    name: 'StuffConfig',
    components: {
    },
    data: function () {
        return {
            view_type: 'table',
            currentPage: 0,
            pageSize: 20,
            total: 0,
            price_profile: {
                default_impact_plan: false,
                hide_impact_selector: false,
            },
            show_cancel_next_price: false,
            cancel_next_stuff_id: 0,
            show_next_date: false,
            show_next_price: false,
            next_price_req: {
                next_price: '',
                next_comment: '',
                next_time: '',
            },
            next_price_show: function (item) {
                let ret = '';
                let now = new Date();
                now.setMinutes(now.getMinutes() + item.change_last_minutes);
                ret = moment(now).format('YYYY-MM-DD HH:mm') + '后，调价为' + item.next_price.toFixed(2);
                return ret;
            },
            stuff_ready_fetch: {
                name: '',
                comment: undefined,
                expect_count: undefined,
                use_for_buy: false,
                close_time: '',
                delay_days: 0,
                concern_fapiao: false,
            },
            show_stuff_fetch: false,
            is_update: false,
            item_for_delete: {
                name: ''
            },
            show_change_price: false,
            show_history: false,
            stuff2change_price: {
                price: undefined,
                comment: undefined,
                to_plan: false,
                stuff_id: undefined
            },
            stuff_for_history: {
                id: 0,
            },
            price_history_data: [],
            stuff_data: [],
            show_close_time: false,
            today_date: moment().format('YYYY-MM-DD HH:mm'),
            qualification_check: false,
            add_zone_stuff_id: 0,
            show_zone_add: false,
            zone_req: {
                zone_name: ''
            },
            rules: {
                name: [{ required: true, message: '请输入物料名', trigger: 'change' }],
                expect_count: [{ required: true, message: '请输入预计单车装货量', trigger: 'change' }],
                delay_days: [{ required: true, message: '请输入允许迟到天数', trigger: 'change' }],
            },
            price_rules: {
                price: [{ required: true, message: '请输入新价格', trigger: 'change' }],
                comment: [{ required: true, message: '请输入备注', trigger: 'change' }],
            },
            zone_rules: {
                zone_name: [{ required: true, message: '请输入区域名称', trigger: 'change' }]
            },
            next_price_rules: {
                next_price: [{ required: true, message: '请输入新价格', trigger: 'change' }],
                next_comment: [{ required: true, message: '请输入备注', trigger: 'change' }],
            }
        }
    },
    mounted: async function () {
        this.stuff_data = await this.get_all_stuff(this.currentPage);
    },
    methods: {
        change_view_type: function () {
            this.view_type = this.view_type == 'card' ? 'table' : 'card';
        },
        handleCurrentChange: async function (val) {
            console.log(val);
            this.currentPage = val;
            this.stuff_data = await this.get_all_stuff(val);
        },
        prepare_del_zone: function (zone_id) {
            this.$confirm(`确定要删除吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/stuff/del_zone', {
                    id: zone_id
                });
                this.$router.go(0);
            });
        },
        zone_add: async function () {
            this.$refs.zone_form.validate(async (valid) => {
                if (valid) {
                    await this.$send_req('/stuff/add_zone', {
                        stuff_id: this.add_zone_stuff_id,
                        name: this.zone_req.zone_name
                    });

                    this.zone_req.zone_name = '';
                    this.show_zone_add = false;
                    this.$router.go(0);
                } else {
                    return false;
                }
            });
        },
        prepare_add_zone: function (item) {
            this.add_zone_stuff_id = item.id;
            this.show_zone_add = true;
        },
        update_price_profile: async function () {
            await this.$send_req('/sale_management/set_price_change_profile', this.price_profile);
            await this.init_price_profile();
        },
        set_company_qualification: async function () {
            await this.$send_req('/stuff/set_check_qualification', {
                enable: this.qualification_check
            });
            await this.get_company_qualification();
        },
        get_company_qualification: async function () {
            let ret = await this.$send_req('/stuff/get_check_qualification', {});
            this.qualification_check = ret.enable;
        },
        set_next_date: function (e) {
            this.next_price_req.next_time = e.result;
            this.show_next_date = false;
        },
        choose_time: function (e) {
            this.stuff_ready_fetch.close_time = e.result;
            this.show_close_time = false;
        },
        change_no_need_register: async function (event, item) {
            await this.$send_req('/stuff/no_need_register', {
                stuff_id: item.id,
                no_need_register: event,
            });
        },
        change_need_exam: async function (event, item) {
            await this.$send_req('/stuff/exam_config', {
                stuff_id: item.id,
                need_exam: event,
            });
        },
        change_checkout_delay: async function (event, item) {
            await this.$send_req('/stuff/checkout_delay_config', {
                stuff_id: item.id,
                checkout_delay: event,
            });
        },
        change_manual_weight: async function (event, item) {
            await this.$send_req('/stuff/manual_weight_config', {
                stuff_id: item.id,
                manual_weight: event
            });
        },
        change_need_enter_weight: async function (event, item) {
            await this.$send_req('/stuff/enter_weight', {
                stuff_id: item.id,
                need_enter_weight: event
            });
        },
        change_need_sc: async function (event, item) {
            await this.$send_req('/stuff/sc_config', {
                stuff_id: item.id,
                need_sc: event
            });
        },
        get_price_history: async function (_pageNo, params) {
            if (params[0] == 0) {
                return [];
            }
            let ret = await this.$send_req('/stuff/get_price_history', {
                pageNo: _pageNo,
                stuff_id: params[0]
            });

            return ret.histories;
        },
        do_next_price: async function () {
            this.$refs.next_price_form.validate(async (valid) => {
                if (!valid) {
                    return;
                }
                let clm = new Date(this.next_price_req.next_time).getTime() - new Date().getTime();
                clm = clm / 1000 / 60;
                await this.$send_req('/stuff/set_next_price', {
                    stuff_id: this.next_price_req.stuff_id,
                    next_price: parseFloat(this.next_price_req.next_price),
                    next_comment: this.next_price_req.next_comment,
                    change_last_minutes: clm
                });
                this.show_next_price = false;
            });
        },
        do_cancel_next_price: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/stuff/clear_next_price', {
                    stuff_id: this.cancel_next_stuff_id,
                })

            }
            this.show_cancel_next_price = false;
        },
        prepare_cancel_next_price: function (item) {
            this.show_cancel_next_price = true;
            this.cancel_next_stuff_id = item.id;
        },
        prepare_next_price: function (item) {
            this.next_price_req.stuff_id = item.id;
            this.show_next_price = true;
        },
        prepare_history: async function (item) {
            this.show_history = true;
            this.stuff_for_history = item
            this.price_history_data = await this.get_price_history(0, [item.id]);
        },
        change_price: async function () {
            this.$refs.change_price_form.validate(async (valid) => {
                if (valid) {
                    this.stuff2change_price.price = parseFloat(this.stuff2change_price.price);
                    await this.$send_req('/stuff/change_price', this.stuff2change_price);
                    this.show_change_price = false;
                }
            });
        },
        prepare_change_price: function (item) {
            this.stuff2change_price = {
                price: item.price,
                comment: '',
                to_plan: this.price_profile.default_impact_plan,
                stuff_id: item.id
            }
            this.show_change_price = true;
        },
        prepare_delete: function (item) {
            this.item_for_delete = item;
            this.$confirm(`确定要删除物料${item.name}吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/stuff/del', {
                    id: item.id
                });
                this.$router.go(0);
            });
        },
        prepare_update: function (item) {
            if (item.delay_days == null) {
                item.delay_days = 0;
            }
            this.stuff_ready_fetch = {
                name: item.name,
                comment: item.comment,
                expect_count: item.expect_count,
                use_for_buy: item.use_for_buy,
                close_time: item.close_time,
                delay_days: item.delay_days,
                concern_fapiao: item.concern_fapiao,
            }
            this.show_stuff_fetch = true;
            this.is_update = true;
        },
        fetch_stuff: async function () {
            this.$refs.form.validate(async (valid) => {
                if (valid) {
                    if (this.stuff_ready_fetch.expect_count) {
                        this.stuff_ready_fetch.expect_count = parseFloat(this.stuff_ready_fetch.expect_count);
                    }
                    if (this.stuff_ready_fetch.delay_days) {
                        this.stuff_ready_fetch.delay_days = parseInt(this.stuff_ready_fetch.delay_days);
                    }
                    await this.$send_req('/stuff/fetch', this.stuff_ready_fetch);
                    this.show_stuff_fetch = false;
                    this.$router.go(0);
                } else {
                    return false;
                }
            });
        },
        get_all_stuff: async function (_pageNo) {
            let ret = await this.$send_req('/stuff/get_all', {
                pageNo: _pageNo
            });

            return ret.stuff
        },
    }
}
</script>
<style>
.stuff_card_list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.stuff_card_item {
    flex: 1;
}

.switch-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

</style>

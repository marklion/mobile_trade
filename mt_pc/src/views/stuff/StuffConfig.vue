<template>
<el-container>
    <el-header height="50" style="padding-top: 20px;">
        <template>
            <el-button icon="el-icon-circle-plus" type="success" @click="show_stuff_fetch = true; is_update = false;clean_form()">新增物料</el-button>
            <el-input placeholder="输入物料名称搜索" v-model="filter_string" clearable @clear="cancel_search" style="width: 300px;margin-left: 10px;">
                <template #append>
                    <el-button type="primary" size="small" icon="el-icon-search" @click="do_search" @keyup.enter="do_search">搜索</el-button>
                </template>
            </el-input>
        </template>
    </el-header>
    <el-main>
        <template>
            <page-content ref="stuff" body_key="stuff" :search_input="filter_string" :search_key="['name']" :req_url="'/stuff/get_all'" :enable="true">
                <template v-slot:default="slotProps">
                    <div>
                        <el-table :data="slotProps.content" style="width: 100%" stripe :default-sort="{ prop: 'name', order: 'ascending' }">
                            <el-table-column prop="name" label="物料名称" width="120" align="center" sortable></el-table-column>
                            <el-table-column label="配置" width="100" align="center">
                                <template slot-scope="scope">
                                    <el-popover placement="right" trigger="hover" width="300">
                                        <div class="switch-group">
                                            <el-switch v-model="scope.row.need_sc" inline-prompt active-text="需要安检" @change="change_need_sc($event, scope.row)" />
                                            <el-switch v-model="scope.row.need_enter_weight" inline-prompt active-text="需要进厂前重量" @change="change_need_enter_weight($event, scope.row)"></el-switch>
                                            <el-switch v-model="scope.row.need_exam" inline-prompt active-text="需要考试" @change="change_need_exam($event, scope.row)" />
                                            <el-switch v-model="scope.row.no_need_register" inline-prompt active-text="不用排号" @change="change_no_need_register($event, scope.row)" />
                                            <el-switch v-model="scope.row.checkout_delay" inline-prompt active-text="延迟结算" @change="change_checkout_delay($event, scope.row)"></el-switch>
                                            <el-switch v-model="scope.row.manual_weight" inline-prompt active-text="手动计量" @change="change_manual_weight($event, scope.row)"></el-switch>
                                            <el-switch v-model="scope.row.need_expect_weight" inline-prompt active-text="需要填写期望重量" @change="change_expect_weight($event,scope.row)"></el-switch>
                                            <el-switch v-model="scope.row.auto_confirm_goods" inline-prompt active-text="自动确认装卸货" @change="change_auto_confirm_goods($event,scope.row)"></el-switch>
                                            <div class="unit-input-group">
                                                <div class="input-item">
                                                    <span class="unit-label">第二单位配置:</span>
                                                    <el-input v-model="scope.row.second_unit" placeholder="例:千克" size="small" clearable @change="validateUnitInput" />
                                                </div>
                                                <div class="input-item">
                                                    <span class="unit-label">系数配置:</span>
                                                    <el-input-number v-model="scope.row.coefficient" placeholder="例:1.00" :precision="2" :step="0.1" :min="0" :max="999999" size="small" controls-position="right" />
                                                </div>
                                                <div class="input-item">
                                                    <span class="unit-label">小数位数:</span>
                                                    <el-input-number v-model="scope.row.second_unit_decimal" placeholder="例:2" :precision="0" :step="1" :min="0" :max="6" size="small" controls-position="right" />
                                                </div>
                                                <el-button type="primary" size="small" :loading="saving" @click="set_scunit_coe_configuration(scope.row)">保存配置</el-button>
                                            </div>
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
                            <el-table-column label="调价历史" width="120" align="center">
                                <template slot-scope="scope">
                                    <el-button size="mini" type="info" @click="prepare_history(scope.row)">调价历史</el-button>
                                </template>
                            </el-table-column>
                            <el-table-column label="装卸区域" width="120" align="center">
                                <template slot-scope="scope">
                                    <el-popover placement="right" trigger="hover" width="300">
                                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                            <el-tag v-for="zone in scope.row.drop_take_zones" closable :key="zone.id" @close="prepare_del_zone(zone.id)">{{ zone.name }}</el-tag>
                                            <el-button size="mini" type="primary" @click="prepare_add_zone(scope.row)">添加</el-button>
                                        </div>
                                        <el-button slot="reference" size="mini" type="link">查看</el-button>
                                    </el-popover>
                                </template>
                            </el-table-column>
                            <el-table-column prop="comment" show-overflow-tooltip label="备注" width="120" align="center"></el-table-column>
                            <el-table-column prop="expect_count" label="期望单车装载量" width="150" align="center" sortable></el-table-column>
                            <el-table-column prop="delay_days" label="允许迟到天数" width="150" align="center" sortable></el-table-column>
                            <el-table-column label="自动关闭时间点" width="150" align="center" sortable>
                                <template slot-scope="scope">
                                    <span v-if="scope.row.close_time">{{ scope.row.close_time }}({{scope.row.close_today?'当日':'前日'}})</span>
                                    <span v-else>不关闭</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="磅单前缀" width="200">
                                <template slot-scope="scope">
                                    <div>
                                        <el-input v-model="scope.row.ticket_prefix" size="mini" style="width: 100%;">
                                            <template slot="prepend">前缀</template>
                                            <el-button size="mini" type="text" slot="append" @click="set_ticket_prefix(scope.row)">保存</el-button>
                                        </el-input>
                                    </div>
                                    <div>
                                        <el-input v-model="scope.row.add_base" size="mini" style="width: 100%;">
                                            <template slot="prepend">自增</template>
                                            <el-button size="mini" type="text" slot="append" @click="set_add_base(scope.row)">保存</el-button>
                                        </el-input>
                                    </div>
                                </template>
                            </el-table-column>
                            <el-table-column prop="use_for_buy" label="用于采购" width="100" align="center">
                                <template slot-scope="scope">
                                    <el-tag :type="scope.row.use_for_buy ? 'success' : 'info'">{{
                                            scope.row.use_for_buy ? '是' : '否' }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="concern_fapiao" label="关注发票" width="100" align="center">
                                <template slot-scope="scope">
                                    <el-tag :type="scope.row.concern_fapiao ? 'success' : 'info'">{{
                                            scope.row.concern_fapiao ? '是' : '否' }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="stuff_code" label="物料编码" align="center"></el-table-column>
                            <el-table-column label="结构化手动计量" type="expand" width="150">
                                <template #default="scope">
                                    <el-table :data="scope.row.sct_scale_items" size="mini" style="padding-left: 50px;">
                                        <el-table-column prop="name" label="名称" width="150"></el-table-column>
                                        <el-table-column label="类型" width="250">
                                            <template slot-scope="sub_scope">
                                                <el-tag size="mini" type="primary">{{sub_scope.row.type=='datetime'?'时间日期':'输入'}}</el-tag>
                                                <el-button type="text" size="mini" @click="change_sct_type(sub_scope.row)">切换</el-button>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="操作" width="200">
                                            <template slot="header">
                                                <el-button size="mini" type="success" @click="add_sct(scope.row.id)">新增</el-button>
                                            </template>
                                            <template slot-scope="sub_scope">
                                                <el-button size="mini" type="warning" @click="update_sct(sub_scope.row)">修改</el-button>
                                                <el-button size="mini" type="danger" @click="delete_sct(sub_scope.row.id)">删除</el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" fixed="right" width="300" align="center">
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
            </page-content>
        </template>
        <el-dialog :visible.sync="show_zone_add" width="600px" title="添加物料装卸区域">
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
                <el-form-item label="物料编码" prop="stuff_code">
                    <el-input v-model="stuff_ready_fetch.stuff_code"></el-input>
                </el-form-item>
                <el-form-item label="期望单车装载量" prop="expect_count">
                    <el-input v-model="stuff_ready_fetch.expect_count"></el-input>
                </el-form-item>
                <el-form-item label="允许迟到天数" prop="delay_days">
                    <el-input v-model="stuff_ready_fetch.delay_days"></el-input>
                </el-form-item>
                <el-form-item label="自动关闭时间点" prop="close_time">
                    <el-time-picker v-model="stuff_ready_fetch.close_time" format="HH:mm" placeholder="选择时间，不填就是不关闭" :default-value="new Date('2000-01-01T01:00:00')"></el-time-picker>
                    <el-switch v-model="stuff_ready_fetch.close_today" active-text="关闭当日" inactive-text="关闭前日"></el-switch>
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
                    <el-date-picker v-model="next_price_req.next_time" type="datetime" placeholder="点击选择时间"></el-date-picker>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="do_next_price">确定</el-button>
                    <el-button @click="show_next_price = false">取消</el-button>
                </el-form-item>
            </el-form>
        </el-dialog>
        <el-dialog :visible.sync="show_history" title="调价历史" @close="show_history = false">
            <div style="height: 65vh; overflow-y: auto;">
                <el-input placeholder="搜索调价理由" v-model="history_filter_string">
                    <div slot="suffix">
                        <el-button type="primary" size="small" @click="history_do_search">搜索</el-button>
                        <el-button type="danger" size="small" @click="history_cancel_search">清除</el-button>
                    </div>
                </el-input>
                <page-content ref="history" body_key="histories" :search_input="history_filter_string" :search_key="['comment']" enable :req_body="stuff_for_history" req_url="/stuff/get_price_history">
                    <template v-slot:default="slotProps">
                        <el-table :data="slotProps.content">
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
                    </template>
                </page-content>
            </div>
        </el-dialog>
    </el-main>
</el-container>
</template>

<script>
import moment from 'moment';
import PageContent from '../../components/PageContent.vue';
export default {
    name: 'StuffConfig',
    components: {
        'page-content': PageContent,
    },
    data: function () {
        return {
            history_filter_string: '',
            filter_string: '',
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
                stuff_code: '',
                close_today: false,
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
                name: [{
                    required: true,
                    message: '请输入物料名',
                    trigger: 'change'
                }],
                expect_count: [{
                    required: true,
                    message: '请输入预计单车装货量',
                    trigger: 'change'
                }],
                delay_days: [{
                    required: true,
                    message: '请输入允许迟到天数',
                    trigger: 'change'
                }],
            },
            price_rules: {
                price: [{
                    required: true,
                    message: '请输入新价格',
                    trigger: 'change'
                }],
                comment: [{
                    required: true,
                    message: '请输入备注',
                    trigger: 'change'
                }],
            },
            zone_rules: {
                zone_name: [{
                    required: true,
                    message: '请输入区域名称',
                    trigger: 'change'
                }]
            },
            next_price_rules: {
                next_price: [{
                    required: true,
                    message: '请输入新价格',
                    trigger: 'change'
                }],
                next_comment: [{
                    required: true,
                    message: '请输入备注',
                    trigger: 'change'
                }],
            }
        }
    },
    mounted: async function () {
        await this.update_price_profile();
    },
    methods: {
        set_add_base: async function (stuff) {
            await this.$send_req('/stuff/set_add_base', {
                stuff_id: stuff.id,
                add_base: stuff.add_base
            });
            this.refresh_stuff();
        },
        set_ticket_prefix: async function (stuff) {
            await this.$send_req('/stuff/set_ticket_prefix', {
                stuff_id: stuff.id,
                ticket_prefix: stuff.ticket_prefix
            });
            this.refresh_stuff();
        },
        change_sct_type: async function (sct) {
            let new_type = sct.type;
            if (new_type == 'datetime') {
                new_type = 'string';
            } else {
                new_type = 'datetime';
            }
            await this.$send_req('/stuff/update_sct_scale_item', {
                id: sct.id,
                name: sct.name,
                type: new_type
            })
            this.refresh_stuff();
        },
        add_sct: async function (stuff_id) {
            try {
                let input_value = (await this.$prompt('请输入结构化手动计量名称', '结构化手动计量名称', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    inputPattern: /^.+$/,
                    inputErrorMessage: '请输入结构化手动计量名称'
                })).value;
                await this.$send_req('/stuff/add_sct_scale_item ', {
                    stuff_id: stuff_id,
                    name: input_value
                })
                this.refresh_stuff();
            } catch (error) {
                console.log(error);
            }
        },
        delete_sct: async function (sct_id) {
            try {
                await this.$confirm('确定要删除吗？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
                await this.$send_req('/stuff/del_sct_scale_item', {
                    id: sct_id
                })
                this.refresh_stuff();
            } catch (error) {
                console.log(error);
            }
        },
        update_sct: async function (sct) {
            try {
                let input_value = (await this.$prompt('请输入结构化手动计量名称', '结构化手动计量名称', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    inputPattern: /^.+$/,
                    inputErrorMessage: '请输入结构化手动计量名称'
                })).value;
                await this.$send_req('/stuff/update_sct_scale_item', {
                    id: sct.id,
                    name: input_value,
                    type: sct.type
                })
                this.refresh_stuff();
            } catch (error) {
                console.log(error);
            }
        },
        refresh_stuff: function () {
            let current_page = this.$refs.stuff.cur_page;
            this.$refs.stuff.refresh(current_page);
        },
        do_search: function () {
            this.$refs.stuff.do_search();
        },
        cancel_search: function () {
            this.filter_string = '';
            this.$refs.stuff.cancel_search();
        },
        history_do_search: function () {
            this.$refs.history.do_search();
        },
        history_cancel_search: function () {
            this.history_filter_string = '';
            this.$refs.history.cancel_search();
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
                this.refresh_stuff();
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
                    this.refresh_stuff();
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
            this.price_profile = await this.$send_req('/sale_management/get_price_change_profile');

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
        change_need_expect_weight: async function (event, item) {
            await this.$send_req('/stuff/expect_weight_config', {
                stuff_id: item.id,
                need_expect_weight: event
            });
        },
        change_auto_confirm_goods: async function (event, item) {
            await this.$send_req('/stuff/auto_confirm_goods', {
                stuff_id: item.id,
                auto_confirm_goods: event
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
        change_expect_weight: async function (event, item) {
            await this.$send_req('/stuff/expect_weight_config', {
                stuff_id: item.id,
                need_expect_weight: event
            });
        },
        set_scunit_coe_configuration: async function (item) {
            try {
                if (item.second_unit && typeof item.second_unit !== 'string') {
                    this.$message.error('第二单位必须是字符串类型');
                    return;
                }
                if (item.coefficient && (typeof item.coefficient !== 'number' || isNaN(item.coefficient))) {
                    this.$message.error('系数必须是数字类型');
                    return;
                }
                await this.$send_req('/stuff/set_unit_coefficient', {
                    stuff_id: item.id,
                    unit_coefficient: {
                        second_unit: item.second_unit || '',
                        coefficient: parseFloat(item.coefficient || 0),
                        second_unit_decimal: parseInt(item.second_unit_decimal == undefined ? 2 : item.second_unit_decimal, 10)
                    }
                });
                this.$message.success('配置保存成功');
                this.refresh_stuff();

            } catch (error) {
                this.$message.error('保存失败：' + error.message);
            }
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
            this.stuff_for_history = {
                stuff_id: item.id
            }
            this.$nextTick(() => {
                this.$refs.history.refresh(1);
            });
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
                this.refresh_stuff();
            });
        },
        clean_form: function () {
            if (this.$refs.form) {
                this.$refs.form.resetFields();
            }
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
                close_time: item.close_time ? new Date(`2000-01-01T${item.close_time}`) : null,
                delay_days: item.delay_days,
                concern_fapiao: item.concern_fapiao,
                stuff_code: item.stuff_code,
                close_today: item.close_today
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
                    if (this.stuff_ready_fetch.close_time) {
                        this.stuff_ready_fetch.close_time = moment(this.stuff_ready_fetch.close_time).format('HH:mm');
                    }
                    await this.$send_req('/stuff/fetch', this.stuff_ready_fetch);
                    this.show_stuff_fetch = false;
                    this.refresh_stuff();
                } else {
                    return false;
                }
            });
        }
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

.unit-input-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 4px;
}

.input-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.unit-label {
    font-size: 14px;
    color: #606266;
    white-space: nowrap;
}

.el-input,
.el-input-number {
    width: 120px;
}

.el-button {
    margin-left: auto;
}
</style>

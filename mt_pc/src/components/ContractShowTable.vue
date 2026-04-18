<template>
<div>
    <el-radio-group
        v-if="show_stat_scope_selector && stat_scopes.length > 1"
        v-model="stat_context_company_id"
        size="small"
        style="margin-right: 10px;"
        @change="on_scope_change"
    >
        <el-radio-button v-for="s in stat_scopes" :key="s.id" :label="s.id">{{ s.name }}</el-radio-button>
    </el-radio-group>
    <el-button v-if="is_motive" icon="el-icon-circle-plus" type="success" @click="prepare_new_contract">新增合同</el-button>
    <el-button
        v-if="can_manage_discount"
        icon="el-icon-s-operation"
        type="primary"
        style="margin-left: 10px;"
        @click="open_scheme_dialog"
    >
        优惠方案
    </el-button>
    <el-input placeholder="输入公司名搜索" v-model="filter_string" clearable @clear="cancel_search" style="width: 300px;margin-left: 10px;">
        <template #append>
            <el-button type="primary" size="small" icon="el-icon-search" @click="do_search">搜索</el-button>
        </template>
    </el-input>
    <page-content ref="contracts" body_key="contracts" enable :req_body="contract_req_body" :req_url="req_path" :search_input="filter_string" :search_key="['company.name']">
        <template v-slot:default="slotProps">
            <el-table :data="slotProps.content" stripe>
                <el-table-column label="对方公司" min-width="170">
                    <template slot-scope="scope">
                        <div>
                            {{ scope.row.company.name }}
                        </div>
                        <el-tag v-for="single_user in scope.row.rbac_users" :key="single_user.id" type="success" closable @close="handle_user_close(scope.row, single_user)">
                            {{ single_user.name }}|{{ single_user.phone }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="begin_time" label="开始日期"></el-table-column>
                <el-table-column prop="end_time" label="结束日期"></el-table-column>
                <el-table-column prop="sign_time" label="签订日期"></el-table-column>
                <el-table-column label="编号">
                    <template slot-scope="scope">
                        <div v-if="scope.row.number">
                            <el-tag type="primary">合同编号:{{ scope.row.number }}</el-tag>
                        </div>
                        <div v-if="scope.row.customer_code">
                            <el-tag type="success">客商编号:{{ scope.row.customer_code}}</el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column v-if="!is_buy" label="余额" min-width="130">
                    <template slot-scope="scope">
                        <div>
                            {{ scope.row.balance }}
                        </div>
                        <div v-if="is_motive || req_path === '/customer/contract_get'">
                            <el-button v-if="is_motive" type="text" size="small" @click="prepare_charge(scope.row)">充值</el-button>
                            <el-button type="text" size="small" @click="show_history(scope.row)">充值历史</el-button>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="关联物料">
                    <template slot-scope="scope">
                        <div v-if="scope.row.stuff">
                            <el-tag v-for="single_stuff in scope.row.stuff" :key="single_stuff.id" :closable="is_motive" type="primary" @close="handle_stuff_close(scope.row, single_stuff)">
                                {{ single_stuff.name }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column v-if="can_manage_discount" label="优惠策略" min-width="180">
                    <template slot-scope="scope">
                        <div>
                            方案: {{ scope.row.discount_scheme ? scope.row.discount_scheme.name : '无' }}
                        </div>
                        <div v-if="scope.row.contract_stuff_prices && scope.row.contract_stuff_prices.length > 0">
                            <div>物料特价:</div>
                            <el-tag
                                v-for="one_price in scope.row.contract_stuff_prices"
                                :key="one_price.id || (one_price.stuffId + '-' + one_price.unit_price)"
                                size="mini"
                                type="warning"
                                style="margin: 4px 6px 0 0;"
                            >
                                {{ one_price.stuff && one_price.stuff.name ? one_price.stuff.name : ('物料#' + one_price.stuffId) }}: {{ one_price.unit_price }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="操作" fixed="right" width="200">
                    <template slot-scope="scope">
                        <div v-if="is_motive">
                            <el-button type="warning" size="small" @click="prepare_update_contract(scope.row)">修改</el-button>
                            <el-button type="danger" size="small" @click="del_contract(scope.row)">删除</el-button>
                        </div>
                        <div>
                            <el-button type="text" size="small" @click="preview_company_attach(scope.row)">查看资质</el-button>
                            <el-button v-if="is_motive" type="text" size="small" @click="prepare_add_stuff(scope.row)">新增物料</el-button>
                            <el-button v-if="is_motive && !is_buy" type="text" size="small" @click="add_auth_user(scope.row)">新增授权</el-button>
                            <el-button v-if="can_manage_discount" type="text" size="small" @click="prepare_contract_scheme(scope.row)">设置方案</el-button>
                            <el-button v-if="can_manage_discount" type="text" size="small" @click="prepare_stuff_price(scope.row)">物料单价</el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </template>
    </page-content>
    <el-image-viewer v-if="show_pics" :on-close="close_preview" :url-list="pics">
    </el-image-viewer>
    <el-dialog title="新增物料" :visible.sync="show_add_stuff" width="30%">
        <select-search body_key="stuff" :req_body="contract_req_body" :get_url="stuff_select_url" item_label="name" item_value="id" :permission_array="stuff_select_url === '/sale_management/get_stuff_for_contract' ? ['sale_management'] : ['stuff']" v-model="selected_stuff_id"></select-search>
        <span slot="footer">
            <el-button @click="show_add_stuff = false">取 消</el-button>
            <el-button type="primary" @click="do_add_stuff">确 定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="编辑合同" :visible.sync="show_contract_edit" width="50%">
        <el-form :model="contract_edit_body" label-width="80px">
            <el-form-item v-if="!is_update" label="对方公司">
                <select-search filterable body_key="all_company" get_url="/global/company_get_all" item_label="name" item_value="id" :permission_array="['sale_management', 'stuff_management']" v-model="contract_edit_body.customer_id"></select-search>
            </el-form-item>
            <el-form-item label="开始日期">
                <el-date-picker value-format="yyyy-MM-dd" v-model="contract_edit_body.begin_time" type="date" placeholder="选择日期"></el-date-picker>
            </el-form-item>
            <el-form-item label="结束日期">
                <el-date-picker value-format="yyyy-MM-dd" v-model="contract_edit_body.end_time" type="date" placeholder="选择日期"></el-date-picker>
            </el-form-item>
            <el-form-item label="合同编号">
                <el-input v-model="contract_edit_body.number"></el-input>
            </el-form-item>
            <el-form-item label="客商编号">
                <el-input v-model="contract_edit_body.customer_code"></el-input>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="show_contract_edit = false">取 消</el-button>
            <el-button type="primary" @click="do_edit_contract">确 定</el-button>
        </span>

    </el-dialog>
    <el-dialog title="充值" :visible.sync="show_charge_diag" width="30%">
        <el-form ref="charge_form" :model="charge_req" label-width="80px" :rules="charge_input_rules">
            <el-form-item label="充值金额" prop="cash_increased">
                <el-input v-model="charge_req.cash_increased"></el-input>
            </el-form-item>
            <el-form-item label="充值原因" prop="comment">
                <el-input v-model="charge_req.comment"></el-input>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="show_charge_diag = false">取 消</el-button>
            <el-button type="primary" @click="do_charge">确 定</el-button>
        </span>
    </el-dialog>

    <el-drawer destroy-on-close title="充值历史" :visible.sync="show_history_drawer" direction="rtl" size="70%">
        <page-content ref="charge_history" body_key="histories" enable :req_body="{contract_id:focus_contract.id}" :req_url="charge_history_url">
            <template v-slot:default="slotProps">
                <el-table :data="slotProps.content">
                    <el-table-column prop="cash_increased" label="充值金额"></el-table-column>
                    <el-table-column prop="comment" label="充值原因"></el-table-column>
                    <el-table-column prop="operator" label="充值人"></el-table-column>
                    <el-table-column prop="time" label="充值时间"></el-table-column>
                    <el-table-column label="操作">
                        <template slot-scope="scope">
                        <div v-if="scope.row.reversed">已冲销</div>
                            <el-button 
                                v-else
                                type="warning" 
                                size="small" 
                                @click="reverseCharge(scope.row)"
                            >冲销</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </template>
        </page-content>
    </el-drawer>
    <el-dialog title="优惠方案管理" :visible.sync="show_scheme_dialog" width="50%">
        <el-form :inline="true" :model="scheme_form">
            <el-form-item label="方案名称">
                <el-input v-model="scheme_form.name" placeholder="如：单价-1元"></el-input>
            </el-form-item>
            <el-form-item label="单价调整">
                <el-input-number v-model="scheme_form.delta_price" :step="0.1" :precision="2"></el-input-number>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="save_scheme">保存</el-button>
                <el-button @click="reset_scheme_form">重置</el-button>
            </el-form-item>
        </el-form>
        <el-table :data="discount_schemes" stripe>
            <el-table-column prop="name" label="方案名"></el-table-column>
            <el-table-column prop="delta_price" label="单价调整"></el-table-column>
            <el-table-column label="操作" width="160">
                <template slot-scope="scope">
                    <el-button type="text" size="small" @click="edit_scheme(scope.row)">编辑</el-button>
                    <el-button type="text" size="small" style="color: #f56c6c" @click="delete_scheme(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-dialog>
    <el-dialog title="设置合同优惠方案" :visible.sync="show_contract_scheme_dialog" width="30%">
        <el-select v-model="selected_scheme_id" clearable placeholder="请选择优惠方案" style="width: 100%;">
            <el-option v-for="item in discount_schemes" :key="item.id" :label="`${item.name}（${item.delta_price}）`" :value="item.id"></el-option>
        </el-select>
        <span slot="footer">
            <el-button @click="show_contract_scheme_dialog = false">取 消</el-button>
            <el-button type="primary" @click="save_contract_scheme">确 定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="设置合同物料单价" :visible.sync="show_stuff_price_dialog" width="40%">
        <el-table :data="stuff_price_rows" stripe>
            <el-table-column prop="name" label="物料"></el-table-column>
            <el-table-column label="单价">
                <template slot-scope="scope">
                    <el-input-number v-model="scope.row.unit_price" :min="0" :step="0.1" :precision="2" :controls="false"></el-input-number>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="180">
                <template slot-scope="scope">
                    <el-button type="text" size="small" @click="save_single_stuff_price(scope.row)">保存</el-button>
                    <el-button type="text" size="small" @click="clear_single_stuff_price(scope.row)">清空</el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-dialog>
</div>
</template>

<script>
import page_content from './PageContent.vue';
import SelectSearch from './SelectSearch.vue';
export default {
    name: 'ContractShowTable',
    data: function () {
        return {
            show_pics: false,
            pics: [],
            show_contract_edit: false,
            is_update: false,
            filter_string: '',
            show_add_stuff: false,
            focus_contract: {},
            selected_stuff_id: 0,
            contract_edit_body: {
                begin_time: '',
                end_time: '',
                number: '',
                customer_id: 0,
                customer_code: '',
            },
            show_charge_diag: false,
            show_history_drawer: false,
            charge_req: {
                cash_increased: '',
                comment: '',
            },
            charge_input_rules: {
                cash_increased: [{
                    pattern: /^(-?\d+)(\.\d{1,2})?$/,
                    message: '请输入正确的充值金额',
                    trigger: 'blur'
                }],
                comment: [{
                    required: true,
                    message: '请输入充值原因',
                    trigger: 'blur'
                }],
            },
            stat_scopes: [],
            stat_context_company_id: null,
            show_scheme_dialog: false,
            discount_schemes: [],
            scheme_form: {
                id: 0,
                name: '',
                delta_price: 0,
            },
            show_contract_scheme_dialog: false,
            selected_scheme_id: null,
            show_stuff_price_dialog: false,
            stuff_price_rows: [],
            self_info: {
                company_is_group: false,
                company_id: null,
            },
        }
    },
    components: {
        'page-content': page_content,
        'el-image-viewer': () => import('element-ui/packages/image/src/image-viewer'),
        'select-search': SelectSearch,
    },
    props: {
        req_path: String,
        is_buy: Boolean,
        is_motive: Boolean,

    },
    computed: {
        can_manage_discount() {
            return this.show_stat_scope_selector && this.has_group_member_scope && this.is_motive && !this.is_buy;
        },
        has_group_member_scope() {
            if (!this.self_info || this.self_info.company_id == null) {
                return false;
            }
            return (this.stat_scopes || []).some((s) => s.id !== this.self_info.company_id);
        },
        show_stat_scope_selector() {
            return this.req_path === '/sale_management/contract_get'
                && this.self_info
                && this.self_info.company_is_group === true;
        },
        contract_req_body() {
            return this.make_context_req();
        },
        charge_history_url() {
            return this.req_path === '/customer/contract_get' ? '/customer/history' : '/cash/history';
        },
        stuff_select_url() {
            if (!this.is_buy && this.is_motive) {
                return '/sale_management/get_stuff_for_contract';
            }
            return '/stuff/get_all';
        }
    },
    mounted() {
        this.load_self_info().then(() => {
            this.load_stat_scopes();
        });
    },
    methods: {
        load_self_info: async function () {
            try {
                const ret = await this.$send_req('/global/self_info', {});
                this.self_info = ret || { company_is_group: false, company_id: null };
            } catch (e) {
                this.self_info = { company_is_group: false, company_id: null };
            }
        },
        make_context_req: function (body = {}) {
            let ret = { ...body };
            if (this.show_stat_scope_selector && this.stat_context_company_id != null) {
                ret.stat_context_company_id = this.stat_context_company_id;
            }
            return ret;
        },
        load_stat_scopes: async function () {
            if (
                this.req_path !== '/sale_management/contract_get'
                || !this.self_info
                || this.self_info.company_is_group !== true
            ) {
                return;
            }
            try {
                const ret = await this.$send_req('/global/home_stat_scope_list', {});
                this.stat_scopes = ret.scopes || [];
                if (this.stat_scopes.length && this.stat_context_company_id == null) {
                    this.stat_context_company_id = this.stat_scopes[0].id;
                    this.$nextTick(() => {
                        if (this.$refs.contracts) {
                            this.$refs.contracts.refresh(1);
                        }
                    });
                }
            } catch (e) {
                this.stat_scopes = [];
            }
        },
        on_scope_change: function () {
            this.$refs.contracts.refresh(1);
            if (this.can_manage_discount) {
                this.load_discount_schemes();
            }
        },
        open_scheme_dialog: async function () {
            this.show_scheme_dialog = true;
            this.reset_scheme_form();
            await this.load_discount_schemes();
        },
        load_discount_schemes: async function () {
            const ret = await this.$send_req('/sale_management/discount_scheme_list', this.make_context_req({}));
            this.discount_schemes = ret.schemes || [];
        },
        reset_scheme_form: function () {
            this.scheme_form = {
                id: 0,
                name: '',
                delta_price: 0,
            };
        },
        edit_scheme: function (row) {
            this.scheme_form = {
                id: row.id,
                name: row.name,
                delta_price: row.delta_price,
            };
        },
        save_scheme: async function () {
            if (!this.scheme_form.name) {
                this.$message.warning('请输入方案名称');
                return;
            }
            await this.$send_req('/sale_management/discount_scheme_upsert', this.make_context_req({
                id: this.scheme_form.id || undefined,
                name: this.scheme_form.name,
                delta_price: this.scheme_form.delta_price,
            }));
            this.$message.success('保存成功');
            this.reset_scheme_form();
            await this.load_discount_schemes();
            this.$refs.contracts.refresh(1);
        },
        delete_scheme: function (row) {
            this.$confirm(`确认删除优惠方案「${row.name}」吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }).then(async () => {
                await this.$send_req('/sale_management/discount_scheme_delete', this.make_context_req({ id: row.id }));
                this.$message.success('删除成功');
                await this.load_discount_schemes();
                this.$refs.contracts.refresh(1);
            });
        },
        prepare_contract_scheme: async function (contract) {
            this.focus_contract = contract;
            this.selected_scheme_id = contract.discountSchemeId || null;
            await this.load_discount_schemes();
            this.show_contract_scheme_dialog = true;
        },
        save_contract_scheme: async function () {
            await this.$send_req('/sale_management/contract_set_discount_scheme', this.make_context_req({
                contract_id: this.focus_contract.id,
                scheme_id: this.selected_scheme_id || null,
            }));
            this.show_contract_scheme_dialog = false;
            this.$message.success('设置成功');
            this.$refs.contracts.refresh(this.$refs.contracts.cur_page || 1);
        },
        prepare_stuff_price: function (contract) {
            this.focus_contract = contract;
            const override_map = new Map();
            (contract.contract_stuff_prices || []).forEach((x) => {
                override_map.set(x.stuffId, x.unit_price);
            });
            this.stuff_price_rows = (contract.stuff || []).map((x) => ({
                stuff_id: x.id,
                name: x.name,
                unit_price: override_map.get(x.id),
            }));
            this.show_stuff_price_dialog = true;
        },
        save_single_stuff_price: async function (row) {
            await this.$send_req('/sale_management/contract_set_stuff_price', this.make_context_req({
                contract_id: this.focus_contract.id,
                stuff_id: row.stuff_id,
                unit_price: row.unit_price,
            }));
            this.$message.success('保存成功');
            this.$refs.contracts.refresh(this.$refs.contracts.cur_page || 1);
        },
        clear_single_stuff_price: async function (row) {
            row.unit_price = undefined;
            await this.$send_req('/sale_management/contract_set_stuff_price', this.make_context_req({
                contract_id: this.focus_contract.id,
                stuff_id: row.stuff_id,
                unit_price: null,
            }));
            this.$message.success('已清空');
            this.$refs.contracts.refresh(this.$refs.contracts.cur_page || 1);
        },
        reverseCharge: function (charge) { 
            this.$confirm('确定冲销该充值吗?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(async () => {
            await this.$send_req('/cash/charge', this.make_context_req({
                contract_id: this.focus_contract.id,
                cash_increased: -parseFloat(charge.cash_increased),
                comment: `回退${charge.time}的充值: ${charge.comment}`
            }));
            this.$refs.charge_history.refresh(1);
        });
        },      
        del_contract: function (contract) {
            this.$confirm('确定删除该合同吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                if (this.is_buy) {
                    await this.$send_req('/buy_management/contract_destroy', this.make_context_req({
                        contract_id: contract.id
                    }));
                } else {
                    await this.$send_req('/sale_management/contract_destroy', this.make_context_req({
                        contract_id: contract.id
                    }));
                }
                this.$refs.contracts.refresh(1);
            });
        },
        do_charge: async function () {
            this.$refs.charge_form.validate(async (valid) => {
                if (valid) {
                    await this.$send_req('/cash/charge', this.make_context_req({
                        contract_id: this.focus_contract.id,
                        cash_increased: parseFloat(this.charge_req.cash_increased),
                        comment: this.charge_req.comment,
                    }));
                    this.$refs.contracts.refresh(1);
                    this.show_charge_diag = false;
                }
            });
        },
        prepare_charge: function (contract) {
            this.focus_contract = contract;
            this.show_charge_diag = true;
        },
        show_history: function (contract) {
            this.show_history_drawer = true;
            this.focus_contract = contract;
            this.$nextTick(() => {
                this.$refs.charge_history.refresh(1);
            });
        },
        prepare_new_contract: function () {
            this.show_contract_edit = true;
            this.is_update = false;
            this.contract_edit_body = {
                begin_time: '',
                end_time: '',
                number: '',
                customer_id: 0,
                customer_code: '',
            };
        },
        prepare_update_contract: function (contract) {
            this.show_contract_edit = true;
            this.is_update = true;
            this.contract_edit_body = {
                begin_time: contract.begin_time,
                end_time: contract.end_time,
                number: contract.number,
                customer_code: contract.customer_code,
                contract_id: contract.id,
            };
        },
        do_edit_contract: async function () {
            this.contract_edit_body.supplier_id = this.contract_edit_body.customer_id;
            if (this.is_update) {
                let update_url = '/sale_management/contract_update';
                if (this.is_buy) {
                    update_url = '/buy_management/contract_update';
                }
                await this.$send_req(update_url, this.make_context_req(this.contract_edit_body));
            } else {
                let make_url = '/sale_management/contract_make';
                if (this.is_buy) {
                    make_url = '/buy_management/contract_make';
                }
                await this.$send_req(make_url, this.make_context_req(this.contract_edit_body));
            }
            this.$refs.contracts.refresh(1);
            this.show_contract_edit = false;
        },
        add_auth_user: function (contract) {
            this.$prompt('请输入授权人手机号', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputPattern: /^1[3456789]\d{9}$/,
                inputErrorMessage: '手机号格式不正确'
            }).then(async ({
                value
            }) => {
                await this.$send_req('/sale_management/authorize_user', this.make_context_req({
                    contract_id: contract.id,
                    phone: value
                }));
                this.$refs.contracts.refresh(1);
            });
        },
        do_add_stuff: async function () {
            let req = {
                contract_id: this.focus_contract.id,
                stuff_id: this.selected_stuff_id,
            };
            let url = '/sale_management/contract_add_stuff';
            if (this.is_buy) {
                url = "/buy_management/contract_add_stuff"
            }
            await this.$send_req(url, this.make_context_req(req));
            this.$refs.contracts.refresh(1);
            this.show_add_stuff = false;
        },
        prepare_add_stuff: function (contract) {
            this.show_add_stuff = true;
            this.focus_contract = contract;
        },
        handle_user_close: function (contract, user) {
            this.$confirm('确定删除该授权人吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/sale_management/unauthorize_user', this.make_context_req({
                    contract_id: contract.id,
                    phone: user.phone,
                }));
                this.$refs.contracts.refresh(1);
            });
        },
        do_search: function () {
            this.$refs.contracts.do_search();
        },
        cancel_search: function () {
            this.filter_string = '';
            this.$refs.contracts.cancel_search();
        },
        close_preview: function () {
            this.show_pics = false;
        },
        preview_company_attach: function (item) {
            this.pics = [];
            if (item.company.attachment) {
                this.pics.push(this.$make_file_url(item.company.attachment));
            } else {
                this.pics.push(this.$make_file_url('/static/no_att.jpg'))
            }
            console.log(this.pics);

            this.show_pics = true;
        },
        handle_stuff_close: function (contract, stuff) {
            this.$confirm('确定删除该物料吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                let url = '/sale_management/contract_del_stuff';
                if (this.is_buy) {
                    url = '/buy_management/contract_del_stuff';
                }
                await this.$send_req(url, this.make_context_req({
                    contract_id: contract.id,
                    stuff_id: stuff.id
                }));
                this.$refs.contracts.refresh(1);
            });
        },
    },
}
</script>

<style>

</style>

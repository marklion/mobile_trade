<template>
<div>
    <el-button v-if="is_motive" icon="el-icon-circle-plus" type="success" @click="prepare_new_contract">新增合同</el-button>
    <el-input placeholder="输入公司名搜索" v-model="filter_string" clearable @clear="cancel_search" style="width: 300px;margin-left: 10px;">
        <template #append>
            <el-button type="primary" size="small" icon="el-icon-search" @click="do_search">搜索</el-button>
        </template>
    </el-input>
    <page-content ref="contracts" body_key="contracts" enable :req_body="{}" :req_url="req_path" :search_input="filter_string" :search_key="['company.name']">
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
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </template>
    </page-content>
    <el-image-viewer v-if="show_pics" :on-close="close_preview" :url-list="pics">
    </el-image-viewer>
    <el-dialog title="新增物料" :visible.sync="show_add_stuff" width="30%">
        <select-search body_key="stuff" get_url="/stuff/get_all" item_label="name" item_value="id" :permission_array="['stuff']" v-model="selected_stuff_id"></select-search>
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
        charge_history_url() {
            return this.req_path === '/customer/contract_get' ? '/customer/history' : '/cash/history';
        }
    },
    methods: {
        reverseCharge: function (charge) { 
            this.$confirm('确定冲销该充值吗?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(async () => {
            await this.$send_req('/cash/charge', {
                contract_id: this.focus_contract.id,
                cash_increased: -parseFloat(charge.cash_increased),
                comment: `回退${charge.time}的充值: ${charge.comment}`
            });
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
                    await this.$send_req('/buy_management/contract_destroy', {
                        contract_id: contract.id
                    });
                } else {
                    await this.$send_req('/sale_management/contract_destroy', {
                        contract_id: contract.id
                    });
                }
                this.$refs.contracts.refresh(1);
            });
        },
        do_charge: async function () {
            this.$refs.charge_form.validate(async (valid) => {
                if (valid) {
                    await this.$send_req('/cash/charge', {
                        contract_id: this.focus_contract.id,
                        cash_increased: parseFloat(this.charge_req.cash_increased),
                        comment: this.charge_req.comment,
                    });
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
                await this.$send_req(update_url, this.contract_edit_body);
            } else {
                let make_url = '/sale_management/contract_make';
                if (this.is_buy) {
                    make_url = '/buy_management/contract_make';
                }
                await this.$send_req(make_url, this.contract_edit_body);
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
                await this.$send_req('/sale_management/authorize_user', {
                    contract_id: contract.id,
                    phone: value
                });
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
            await this.$send_req(url, req);
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
                await this.$send_req('/sale_management/unauthorize_user', {
                    contract_id: contract.id,
                    phone: user.phone,
                });
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
                await this.$send_req(url, {
                    contract_id: contract.id,
                    stuff_id: stuff.id
                });
                this.$refs.contracts.refresh(1);
            });
        },
    },
}
</script>

<style>

</style>

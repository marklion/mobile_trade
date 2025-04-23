<template>
<div class="global-strategy-show">
    <el-container>
        <el-main style="display: flex; flex-direction: column; align-items: start;gap: 20px;">
            <el-switch v-model="price_profile.default_impact_plan" active-text="默认调价影响计划" size="small" @change="update_price_profile">
            </el-switch>
            <el-switch v-model="price_profile.hide_impact_selector" active-text="隐藏调价影响计划开关" size="large" @change="update_price_profile">
            </el-switch>
            <el-switch v-model="qualification_check" active-text="检查对方资质" @change="set_company_qualification">
            </el-switch>
            <el-switch v-model="verify_pay_by_cash" active-text="验款权限设为余额管理" @change="set_verify_pay_config">
            </el-switch>
        </el-main>
    </el-container>
    <h3>代理配置</h3>
    <page-content ref="all_delegates" body_key="delegates" enable req_url="/stuff/get_delegates">
        <template #default="slotProps">
            <el-table :data="slotProps.content">
                <el-table-column prop="name" label="名称"></el-table-column>
                <el-table-column prop="code" label="编号"></el-table-column>
                <el-table-column label="合同" type="expand">
                    <template #default="scope">
                        <el-table :data="scope.row.contracts" size="mini" style="padding-left: 50px;">
                            <el-table-column prop="buy_company.name" label="名称"></el-table-column>
                            <el-table-column fixed="right" width="80px" label="操作">
                                <template slot-scope="sub_scope">
                                    <el-button size="mini" type="danger" @click="del_delegate_contract(sub_scope.row.id, scope.row.id)">删除</el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </template>
                </el-table-column>
                <el-table-column fixed="right" width="350">
                    <template slot="header">
                        <el-button size="mini" type="success" @click="create_delegate = true">新增</el-button>
                    </template>
                    <template slot-scope="scope">
                        <el-button type="danger" size="small" @click="delete_delegate(scope.row)">删除</el-button>
                        <el-button type="primary" size="small" @click="show_add_contract(scope.row)">增加合同</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </template>
    </page-content>
    <h3>磅单配置</h3>
        <el-form label-width="100px" v-model="replace_form" style="width: 800px;">
            <el-form-item label="称重单" >
                <template>
                    <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                </template>
                <el-input v-model="replace_form.replace_weighingSheet" placeholder="请输入称重单的替换文字" style="width:200px"></el-input>
            </el-form-item>
            <el-form-item label="装载量">
                <template>
                    <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                </template>
                <el-input v-model="replace_form.replace_count" placeholder="请输入装载量的替换文字"  style="width:200px"></el-input>
            </el-form-item>
            <el-form-item label="一次计量">
                <template>
                    <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                </template>
                <el-input v-model="replace_form.replace_fw_info" placeholder="请输入一次计量的替换文字" style="width:200px"></el-input>
            </el-form-item>
            <el-form-item label="二次计量">
                <template>
                    <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                </template>
                <el-input v-model="replace_form.replace_sw_info" placeholder="请输入二次计量的替换文字" style="width:200px"></el-input>
            </el-form-item>
            <el-button type="" @click="onReset" style="float: right;">重置</el-button>
            <el-button type="primary" @click="onSaveReplace" style="float: right;">保存</el-button>
        </el-form>
    
    <el-dialog title="新增合同" :visible.sync="show_add_contract_diag" width="50%">
        <select-search filterable body_key="contracts" get_url="/sale_management/contract_get" item_label="company.name" item_value="id" :permission_array="['sale_management', 'stuff_management']" v-model="contract_id_selected"></select-search>
        <span slot="footer">
            <el-button @click="show_add_contract_diag= false">取消</el-button>
            <el-button type="primary" @click="add_contract_delegate">确定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="新增代理" :visible.sync="create_delegate" width="50%">
        <el-form :model="new_delegate" ref="new_delegate" :rules="new_delegate_rules">
            <el-form-item label="代理名称" prop="name">
                <el-input v-model="new_delegate.name"></el-input>
            </el-form-item>
            <el-form-item label="代理编号" prop="code">
                <el-input v-model="new_delegate.code"></el-input>
            </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
            <el-button @click="create_delegate = false">取 消</el-button>
            <el-button type="primary" @click="add_delegate">确 定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import PageContent from '../../components/PageContent.vue';
import SelectSearch from '../../components/SelectSearch.vue';
export default {
    name: 'GlobalStrategy',
    components: {
        "page-content": PageContent,
        "select-search": SelectSearch
    },
    data() {
        return {
            show_add_contract_diag: false,
            contract_id_selected: 0,
            focus_delegate_id: 0,
            new_delegate: {
                name: '',
                code: '',
            },
            new_delegate_rules: {
                name: [{
                    required: true,
                    message: '请输入代理名称',
                    trigger: 'blur'
                }, ],
                code: [{
                    required: true,
                    message: '请输入代理编号',
                    trigger: 'blur'
                }, ],
            },
            price_profile: {
                default_impact_plan: false,
                hide_impact_selector: false,
            },
            qualification_check: false,
            create_delegate: false,
            verify_pay_by_cash: false,
            replace_form:{
                replace_weighingSheet: '',
                replace_count: '',
                replace_fw_info: '',
                replace_sw_info: ''
            }
        }
    },
    mounted() {
        this.init_price_profile();
        this.get_company_qualification();
        this.get_verify_pay_config();
        this.fetchReplaceField();
    },
    methods: {
        async fetchReplaceField() {
            try {
                const ret = await this.$send_req('/stuff/get_replace_field');
                console.log('获取替换字段:', ret);
                if (ret && ret.replace_form) {
                this.replace_form = ret.replace_form;
                }
            } catch (error) {
                console.error('获取替换字段失败:', error);
                this.$message.error('获取替换字段失败');
            }
        },
        del_delegate_contract: async function (contract_id, delegate_id) {
            if (await this.$confirm('此操作将永久删除该合同, 是否继续?', '提示', {
                    type: 'warning'
                }) == false) {
                return;
            }
            let ret = await this.$send_req('/sale_management/del_delegate_contract', {
                contract_id: contract_id,
                delegate_id: delegate_id
            });
            if (ret) {
                this.$message.success('删除成功');
                this.refresh_all_delegates();
            } else {
                this.$message.error('删除失败');
            }
        },
        add_contract_delegate: async function () {
            if (this.contract_id_selected == 0) {
                this.$message.error('请选择合同');
                return;
            }
            let ret = await this.$send_req('/sale_management/add_delegate_contract', {
                delegate_id: this.focus_delegate_id,
                contract_id: this.contract_id_selected
            });
            if (ret) {
                this.show_add_contract_diag = false;
                this.$message.success('新增成功');
                this.refresh_all_delegates();
            } else {
                this.$message.error('新增失败');
            }
        },
        show_add_contract: function (delegate) {
            this.focus_delegate_id = delegate.id;
            this.show_add_contract_diag = true;
        },
        delete_delegate: async function (delegate) {
            if (await this.$confirm('此操作将永久删除该代理, 是否继续?', '提示', {
                    type: 'warning'
                }) == false) {
                return;
            }
            let ret = await this.$send_req('/stuff/del_delegate', {
                id: delegate.id
            });
            if (ret) {
                this.$message.success('删除成功');
                this.refresh_all_delegates();
            } else {
                this.$message.error('删除失败');
            }
        },
        refresh_all_delegates: function () {
            this.$refs.all_delegates.refresh();
        },
        add_delegate: async function () {
            if (await this.$refs.new_delegate.validate() == false) {
                return;
            }
            let ret = await this.$send_req('/stuff/add_delegate', this.new_delegate);
            if (ret) {
                this.create_delegate = false;
                this.$refs.new_delegate.resetFields();
                this.$message.success('新增成功');
                this.refresh_all_delegates();
            } else {
                this.$message.error('新增失败');
            }
        },
        init_price_profile: async function () {
            let resp = await this.$send_req('/sale_management/get_price_change_profile', {});
            this.price_profile = resp;
        },
        get_company_qualification: async function () {
            let ret = await this.$send_req('/stuff/get_check_qualification', {});
            this.qualification_check = ret.enable;
        },
        get_verify_pay_config: async function () {
            this.verify_pay_by_cash = (await this.$send_req('/stuff/get_verify_pay_config', {})).verify_pay_by_cash;
        },
        set_verify_pay_config: async function () {
            await this.$send_req('/stuff/set_verify_pay_config', {
                verify_pay_by_cash: this.verify_pay_by_cash
            });
            await this.get_verify_pay_config();
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
        onReset() {
            this.replace_form = {
                weighingSheet: '',
                loadingCapacity: '',
                fw_info: '',
                sw_info: ''
            }
        },
        onSaveReplace: async function () {
            console.log(this.replace_form);
            await this.$send_req('/stuff/set_replace_field', { 
                replace_form: { 
                    replace_weighingSheet: this.replace_form.replace_weighingSheet || '称重单',
                    replace_count: this.replace_form.replace_count || '装载量',
                    replace_fw_info: this.replace_form.replace_fw_info || '一次计量',
                    replace_sw_info: this.replace_form.replace_sw_info || '二次计量'
                }
                }).then((res) => {
            if (res) {
                this.$message.success('保存成功');
            } else {
                this.$message.error('保存失败');
            }
        }).catch((err) => {
            this.$message.error('保存失败');
        });
        }
    }
}
</script>

<style scoped>
.global-strategy-show {
    display: flex;
    flex-direction: column;
}
</style>

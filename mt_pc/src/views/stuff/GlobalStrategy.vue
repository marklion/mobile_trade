<template>
<div class="global-strategy-show">
    <el-container>
        <el-main style="gap: 20px;">
            <vue-grid align="stretch" justify="start">
                <vue-cell width="3of12">
                    <el-switch v-model="price_profile.default_impact_plan" active-text="默认调价影响计划" size="small" @change="update_price_profile">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="price_profile.hide_impact_selector" active-text="隐藏调价影响计划开关" size="large" @change="update_price_profile">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="qualification_check" active-text="检查对方资质" @change="set_company_qualification">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="verify_pay_by_cash" active-text="验款权限设为余额管理" @change="set_verify_pay_config">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="show_sc_in_field" active-text="排队车辆界面操作安检" @change="set_show_sc_in_field">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="buy_config_hard" active-text="采购严格模式" @change="set_buy_config_hard">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="push_messages_writable_roles" active-text="是否只推送消息给可写角色" @change="set_push_messages_writable_roles">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="ticket_hasOrhasnt_place" active-text="榜单上是否显示装卸车地点" @change="set_ticket_hasOrhasnt_place">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="access_control_permission" active-text="门禁权限是否关闭" @change="set_access_control_permission">
                    </el-switch>
                </vue-cell>
                <vue-cell width="3of12">
                    <el-switch v-model="support_location_detail" active-text="卸车地点支持细节输入" @change="set_support_location_detail">
                    </el-switch>
                </vue-cell>
            </vue-grid>
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
                        <el-table-column label="磅单印章">
                            <template slot-scope="scope">
                                <stamp-pic :get_pic_interface="get_get_pic_interface(scope.row)" :set_pic_interface="get_set_pic_interface(scope.row.id)"></stamp-pic>
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
            <el-row :gutter="10">
                <el-col :span="12">
                    <h3>磅单配置</h3>
                    <el-form label-width="100px" v-model="replace_form" style="width: 800px;">
                        <el-form-item label="称重单">
                            <template>
                                <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                            </template>
                            <el-input v-model="replace_form.replace_weighingSheet" placeholder="请输入称重单的替换文字" style="width:200px"></el-input>
                        </el-form-item>
                        <el-form-item label="装载量">
                            <template>
                                <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                            </template>
                            <el-input v-model="replace_form.replace_count" placeholder="请输入装载量的替换文字" style="width:200px"></el-input>
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
                        <el-form-item label="下单公司">
                            <template>
                                <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                            </template>
                            <el-input v-model="replace_form.order_company" placeholder="请输入下单公司的替换文字" style="width:200px"></el-input>
                        </el-form-item>
                        <el-form-item label="运输公司">
                            <template>
                                <el-tag type="success" style="margin-right:10px">替换为:</el-tag>
                            </template>
                            <el-input v-model="replace_form.transportation_company" placeholder="请输入运输公司的替换文字" style="width:200px"></el-input>
                        </el-form-item>
                        <el-button type="" @click="onReset">重置</el-button>
                        <el-button type="primary" @click="onSaveReplace">保存</el-button>
                    </el-form>
                </el-col>
                <el-col :span="12">
                    <h3>订单额外信息</h3>
                    <page-content ref="all_extra" body_key="extra_info_configs" enable req_url="/stuff/get_extra_info_config">
                        <template #default="slotProps">
                            <el-table :data="slotProps.content">
                                <el-table-column prop="title" label="标题"></el-table-column>
                                <el-table-column fixed="right" width="350">
                                    <template slot="header">
                                        <el-button size="mini" type="success" @click="add_extra_info_config">新增</el-button>
                                    </template>
                                    <template slot-scope="scope">
                                        <el-button type="danger" size="small" @click="del_extra_info_config(scope.row)">删除</el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </template>
                    </page-content>
                </el-col>
            </el-row>
        </el-main>
    </el-container>

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
import StampPic from '../../components/StampPic.vue';

import {
    VueGrid,
    VueCell
} from 'vue-grd';
export default {
    name: 'GlobalStrategy',
    components: {
        "page-content": PageContent,
        "select-search": SelectSearch,
        "stamp-pic": StampPic,
        VueGrid,
        VueCell,
    },
    data() {
        return {
            show_add_contract_diag: false,
            push_messages_writable_roles: false,
            ticket_hasOrhasnt_place: false,
            access_control_permission: false,
            support_location_detail: false,
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
            show_sc_in_field: false,
            create_delegate: false,
            verify_pay_by_cash: false,
            buy_config_hard: false,
            replace_form: {
                replace_weighingSheet: '',
                replace_count: '',
                replace_fw_info: '',
                replace_sw_info: '',
                order_company: '',
                transportation_company: ''
            }
        }
    },
    mounted() {
        this.init_price_profile();
        this.get_company_qualification();
        this.get_verify_pay_config();
        this.fetchReplaceField();
        this.get_buy_config_hard();
        this.get_show_sc_in_field();
        this.get_push_messages_writable_roles();
        this.get_ticket_hasOrhasnt_place();
        this.get_access_control_permission();
        this.get_support_location_detail();
    },
    methods: {
        add_extra_info_config: async function () {
            try {
                let title = await this.$prompt('请输入配置标题', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消'
                });
                let ret = await this.$send_req('/stuff/add_extra_info_config', {
                    title: title.value
                });
                if (ret) {
                    this.$message.success('新增成功');
                    this.$refs.all_extra.refresh();
                } else {
                    this.$message.error('新增失败');
                }
            } catch (error) {
                console.log(error);
            }
        },
        del_extra_info_config: async function (row) {
            if (await this.$confirm('此操作将永久删除该配置, 是否继续?', '提示', {
                    type: 'warning'
                }) == false) {
                return;
            }
            let ret = await this.$send_req('/stuff/del_extra_info_config', {
                id: row.id
            });
            if (ret) {
                this.$message.success('删除成功');
                this.$refs.all_extra.refresh();
            } else {
                this.$message.error('删除失败');
            }
        },
        get_set_pic_interface: function (id) {
            return async (pic) => {
                this.$send_req('/stuff/set_delegate_stamp_pic', {
                    id: id,
                    stamp_pic: pic,
                });
            };
        },
        get_get_pic_interface: function (row) {
            return () => {
                return row.stamp_pic;
            };
        },

        async fetchReplaceField() {
            try {
                const ret = await this.$send_req('/stuff/get_replace_field', {});
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
        get_show_sc_in_field: async function () {
            let ret = await this.$send_req('/global/get_show_sc_in_field', {});
            this.show_sc_in_field = ret.show_sc_in_field;
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
        set_show_sc_in_field: async function () {
            await this.$send_req('/stuff/set_show_sc_in_field', {
                show_sc_in_field: this.show_sc_in_field
            });
            await this.get_show_sc_in_field();
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
            let res = await this.$send_req('/stuff/set_replace_field', {
                replace_form: {
                    replace_weighingSheet: this.replace_form.replace_weighingSheet || '称重单',
                    replace_count: this.replace_form.replace_count || '装载量',
                    replace_fw_info: this.replace_form.replace_fw_info || '一次计量',
                    replace_sw_info: this.replace_form.replace_sw_info || '二次计量',
                    order_company: this.replace_form.order_company || '下单公司',
                    transportation_company: this.replace_form.transportation_company || '运输公司',
                }
            });
            if (res) {
                this.$message.success('保存成功');
            } else {
                this.$message.error('保存失败');
            }
        },
        get_buy_config_hard: async function () {
            let ret = await this.$send_req('/global/get_buy_config_hard', {});
            this.buy_config_hard = ret.buy_config_hard;
        },
        set_buy_config_hard: async function () {
            await this.$send_req('/stuff/set_buy_config_hard', {
                buy_config_hard: this.buy_config_hard
            });
            await this.get_buy_config_hard();
        },
        get_push_messages_writable_roles: async function () {
            let ret = await this.$send_req('/global/get_push_messages_writable_roles', {});
            this.push_messages_writable_roles = ret.push_messages_writable_roles;
        },
        set_push_messages_writable_roles: async function () {
            await this.$send_req('/stuff/set_push_messages_writable_roles', {
                push_messages_writable_roles: this.push_messages_writable_roles
            });
        },
        get_ticket_hasOrhasnt_place: async function () {
            let ret = await this.$send_req('/global/get_ticket_hasOrhasnt_place', {});
            this.ticket_hasOrhasnt_place = ret.ticket_hasOrhasnt_place;
        },
        set_ticket_hasOrhasnt_place: async function () {
            await this.$send_req('/stuff/set_ticket_hasOrhasnt_place', {
                ticket_hasOrhasnt_place: this.ticket_hasOrhasnt_place
            });
        },
        get_access_control_permission: async function () {
            let ret = await this.$send_req('/global/get_access_control_permission', {});
            this.access_control_permission = ret.access_control_permission;
        },
        set_access_control_permission: async function () { 
            await this.$send_req('/stuff/set_access_control_permission', {
                access_control_permission: this.access_control_permission
            });
        },
        set_support_location_detail: async function () {
            await this.$send_req('/stuff/set_support_location_detail', {
                support_location_detail: this.support_location_detail
            });
        },
        get_support_location_detail: async function () {
            let ret = await this.$send_req('/global/get_support_location_detail', {});
            this.support_location_detail = ret.support_location_detail;
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

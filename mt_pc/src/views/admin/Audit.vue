<template>
<div class="audit_view">
    <el-tabs v-model="activeName">
        <el-tab-pane label="审批执行" name="first">
        </el-tab-pane>
        <el-tab-pane label="审批配置" name="second">
            <page-content ref="audit_config" body_key="configs" req_url="/audit/get_audit_configs" enable>
                <template v-slot:default="slotProps">
                    <div>
                        <el-table :data="slotProps.content" style="width: 100%" stripe :default-sort="{ prop: 'url-name', order: 'ascending' }">
                            <el-table-column prop="url_name" label="接口名称" align="center" sortable></el-table-column>
                            <el-table-column prop="rbac_role.name" label="角色名称" align="center" sortable></el-table-column>
                            <el-table-column>
                                <template slot="header">
                                    <el-button size="mini" type="success" @click="add_audit_config_diag = true">新增</el-button>
                                </template>
                                <template v-slot="scope">
                                    <el-button type="danger" size="mini" @click="del_audit_config(scope.row.id)">删除</el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>
                </template>
            </page-content>
        </el-tab-pane>
    </el-tabs>
    <el-dialog title="新增审批项" :visible.sync="add_audit_config_diag" width="50%">
        <el-form :model="new_audit_config" ref="new_audit_config" :rules="new_audit_config_rules">
            <el-form-item label="接口" prop="url">
                <select-search filterable body_key="apis" get_url="/audit/get_all_api" item_label="name" item_value="url" v-model="new_audit_config.url" :permission_array="['audit']"></select-search>
            </el-form-item>
            <el-form-item label="角色" prop="role_id">
                <select-search body_key="all_role" get_url="/rbac/role_get_all" item_label="name" item_value="id" v-model="new_audit_config.role_id" :permission_array="['rbac']"></select-search>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="add_audit_config_diag = false">取消</el-button>
            <el-button type="primary" @click="add_audit_config">确定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import PageContent from '../../components/PageContent.vue';
import SelectSearch from '../../components/SelectSearch.vue';
export default {
    name: "Audit",
    components: {
        "page-content": PageContent,
        "select-search": SelectSearch,
    },
    data: function () {
        return {
            activeName: 'first',
            add_audit_config_diag: false,
            new_audit_config: {
                url: '',
                role_id: null,
            },
            new_audit_config_rules: {
                url: [{
                    required: true,
                    message: '请选择接口',
                    trigger: 'change'
                }, ],
                role_id: [{
                    required: true,
                    message: '请选择角色',
                    trigger: 'change'
                }, ],
            },
        };
    },
    methods: {
        refresh_config: function () {
            this.$refs.audit_config.refresh(this.$refs.audit_config.cur_page);
        },
        add_audit_config: async function () {
            let is_valid = await this.$refs.new_audit_config.validate();
            if (!is_valid) {
                return;
            }
            await this.$send_req('/audit/add_audit_config', {
                url: this.new_audit_config.url,
                role_id: this.new_audit_config.role_id,
            });
            this.add_audit_config_diag = false;
            this.refresh_config();
        },
        del_audit_config: async function (id) {
            await this.$confirm('确定删除该审批配置吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            });
            await this.$send_req('/audit/del_audit_config', {
                id: id
            });
            this.refresh_config();
        },
    },
}
</script>

<style>

</style>

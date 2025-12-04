<template>
<div class="audit_view">
    <el-tabs v-model="activeName" @tab-click="handle_tab_click">
        <el-tab-pane label="全部" name="all">
        </el-tab-pane>
        <el-tab-pane label="待审批" name="waiting">
        </el-tab-pane>
        <el-tab-pane label="已审批" name="audited">
        </el-tab-pane>
        <el-tab-pane label="已驳回" name="closed">
        </el-tab-pane>
        <el-tab-pane label="审批配置" name="config">
            <page-content ref="audit_config" body_key="configs" req_url="/audit/get_audit_configs" enable>
                <template v-slot:default="slotProps">
                    <div>
                        <el-table :data="slotProps.content" style="width: 100%" stripe :default-sort="{ prop: 'url-name', order: 'ascending' }">
                            <el-table-column prop="url_name" label="请求名称" align="center" sortable></el-table-column>
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
    <div v-if="activeName != 'config'">
        <page-content ref="audit_record" body_key="records" req_url="/audit/get_audit4req" enable :req_body="ar_get_req">
            <template v-slot:default="slotProps">
                <div>
                    <el-table :data="slotProps.content" style="width: 100%" :row-class-name="tableRowClassName">
                        <el-table-column prop="url_name" label="请求名称" sortable></el-table-column>
                        <el-table-column prop="comment" label="审批事项" sortable></el-table-column>
                        <el-table-column prop="submiter" label="请求人"></el-table-column>
                        <el-table-column prop="submit_time" label="请求时间"></el-table-column>
                        <el-table-column prop="auditer" label="审批人"></el-table-column>
                        <el-table-column prop="audit_time" label="审批时间"></el-table-column>
                        <el-table-column prop="close_time" label="拒绝时间"></el-table-column>
                        <el-table-column label="操作" fixed="right" width="220">
                            <template v-slot="scope">
                                <el-button type="success" v-if="!scope.row.audit_time && !scope.row.close_time" size="mini" @click="audit_req(scope.row.id, true)">通过</el-button>
                                <el-button type="danger" v-if="!scope.row.audit_time && !scope.row.close_time" size="mini" @click="audit_req(scope.row.id, false)">拒绝</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </template>
        </page-content>
    </div>
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
    computed: {
        ar_get_req: function () {
            let req = {};
            if (this.activeName == 'waiting') {
                req.status = 0;
            } else if (this.activeName == 'audited') {
                req.status = 1;
            } else if (this.activeName == 'closed') {
                req.status = 2;
            }
            return req;
        },
    },
    data: function () {
        return {
            activeName: 'all',
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
        handle_tab_click: function () {
            this.$nextTick(async () => {
                if (this.activeName == 'config') {
                    return;
                }
                this.refresh_record();
            });
        },
        refresh_record: function () {
            this.$refs.audit_record.refresh(this.$refs.audit_record.cur_page);
        },
        audit_req: async function (id, is_approve) {
            if (!is_approve) {
                await this.$confirm('确定拒绝该审批请求吗？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
            }
            await this.$send_req('/audit/audit_req', {
                id: id,
                is_approve: is_approve,
            });
            this.refresh_record();
        },
        tableRowClassName({
            row,
            rowIndex
        }) {
            if (row.audit_time) {
                return 'success-row';
            } else if (row.close_time) {
                return 'warning-row';
            }
            return '';
        },
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
.el-table .warning-row {
    background: oldlace;
}

.el-table .success-row {
    background: #f0f9eb;
}
</style>

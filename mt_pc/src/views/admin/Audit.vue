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
        <el-tab-pane v-if="can_config_approval" label="审批配置" name="config">
            <el-form label-width="120px" class="approval-config-form">
                <el-table :data="approval_config.projects" style="width: 100%" stripe>
                    <el-table-column prop="name" label="审批项目"></el-table-column>
                    <el-table-column label="是否审批">
                        <template v-slot="scope">
                            <el-checkbox v-model="scope.row.enabled">启用</el-checkbox>
                        </template>
                    </el-table-column>
                    <el-table-column label="审批人" min-width="260">
                        <template v-slot="scope">
                            <el-radio-group v-model="scope.row.approver_mode" @change="on_approver_mode_change(scope.row)">
                                <el-radio label="default">默认审批人</el-radio>
                                <el-radio label="submit_specify">提交时指定</el-radio>
                            </el-radio-group>
                            <div v-if="scope.row.approver_mode === 'default'" style="margin-top: 8px;">
                                <select-search body_key="all_user" get_url="/approval/get_auditer_pick_list" item_label="name" item_value="name" v-model="scope.row.auditer" :permission_array="['approval']" clearable></select-search>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
                <el-form-item style="margin-top: 16px;">
                    <el-button type="primary" @click="save_approval_config">保存审批配置</el-button>
                </el-form-item>
            </el-form>
        </el-tab-pane>
    </el-tabs>
    <div v-if="activeName != 'config'">
        <page-content ref="audit_record" body_key="records" req_url="/approval/get_audit4req" enable :req_body="ar_get_req">
            <template v-slot:default="slotProps">
                <div>
                    <el-table :data="slotProps.content" style="width: 100%" :row-class-name="tableRowClassName">
                        <el-table-column prop="url_name" label="请求名称" sortable></el-table-column>
                        <el-table-column prop="comment" label="审批事项" sortable></el-table-column>
                        <el-table-column prop="submiter" label="请求人"></el-table-column>
                        <el-table-column prop="progress" label="审批进度" sortable min-width="100"></el-table-column>
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
            can_config_approval: false,
            approval_config: {
                projects: [
                    { key: 'closed_order_price', name: '已关闭订单的调价', enabled: false, approver_mode: 'default', auditer: '' },
                    { key: 'manual_verify_pay', name: '手动验款', enabled: false, approver_mode: 'default', auditer: '' },
                ]
            },
        };
    },
    methods: {
        refresh_self_info: async function () {
            const info = await this.$send_req('/global/self_info', {});
            this.can_config_approval = !!(info && info.company_is_group && info.is_group_admin);
            if (!this.can_config_approval && this.activeName === 'config') {
                this.activeName = 'all';
            }
        },
        handle_tab_click: function () {
            this.$nextTick(async () => {
                if (this.activeName == 'config') {
                    if (!this.can_config_approval) {
                        this.activeName = 'all';
                        this.$message.warning('仅集团管理员可配置审批项');
                        return;
                    }
                    await this.refresh_config();
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
            await this.$send_req('/approval/audit_req', {
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
        refresh_config: async function () {
            const ret = await this.$send_req('/approval/get_approval_projects', {});
            const list = ret.projects || [];
            for (const row of list) {
                if (row.approver_mode !== 'submit_specify') {
                    row.approver_mode = 'default';
                }
            }
            this.approval_config.projects = list;
        },
        on_approver_mode_change: function (row) {
            if (row.approver_mode === 'submit_specify') {
                row.auditer = '';
            }
        },
        save_approval_config: async function () {
            if (!this.can_config_approval) {
                this.$message.error('仅集团管理员可配置审批项');
                return;
            }
            for (const row of this.approval_config.projects) {
                if (row.enabled && row.approver_mode === 'default' && !row.auditer) {
                    this.$message.error(`「${row.name}」为默认审批人时请选择具体审批人`);
                    return;
                }
            }
            await this.$send_req('/approval/set_approval_projects', {
                projects: this.approval_config.projects,
            });
            this.$message.success('审批配置已保存');
        },
    },
    mounted: async function () {
        await this.refresh_self_info();
        if (this.can_config_approval) {
            await this.refresh_config();
        }
    }
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

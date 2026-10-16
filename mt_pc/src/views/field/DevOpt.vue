<template>
<el-container>
    <el-main>
        <el-alert v-permission="['rbac']" :type="health_info ? 'warning' : 'success'" :closable="false" show-icon style="margin-bottom: 10px;">
            <div slot="title" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span>
                    自动过磅系统状态：{{ health_info || '正常' }}
                </span>
                <el-button type="danger" size="mini" @click="reboot_scale_system">重启过磅系统</el-button>
            </div>
        </el-alert>

        <el-table :data="all_dev">
            <el-table-column prop="name" label="设备名称" width="180">
                <template slot-scope="scope">
                    {{ scope.row.name }} - {{ scope.row.scale_status }}
                </template>
            </el-table-column>
            <el-table-column label="状态">
                <template slot-scope="scope">
                    <div v-if="scope.row.scale_status">
                        重量：{{ scope.row.cur_weight }}
                        <el-tag v-if="scope.row.enter_gate" type="success">前门已关</el-tag>
                        <el-tag v-else type="danger">前门未关</el-tag>
                        <el-tag v-if="scope.row.exit_gate" type="success">后门已关</el-tag>
                        <el-tag v-else type="danger">后门未关</el-tag>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="操作">
                <template slot-scope="scope">
                    <el-button type="primary" size="mini" @click="gate_ctrl(scope.row, true, true)">开{{ gate_name.fg }}</el-button>
                    <el-button type="primary" size="mini" @click="gate_ctrl(scope.row, false, true)">开{{ gate_name.bg }}</el-button>
                    <el-button type="danger" size="mini" @click="gate_ctrl(scope.row, true, false)">关{{ gate_name.fg }}</el-button>
                    <el-button type="danger" size="mini" @click="gate_ctrl(scope.row, false, false)">关{{ gate_name.bg }}</el-button>
                </template>
            </el-table-column>
            <el-table-column label="功能" align="left">
                <template slot-scope="scope">
                    <el-button type="success" size="mini" @click="take_pic(scope.row, true)">{{ gate_name.fg }}拍照</el-button>
                    <el-button type="primary" size="mini" @click="prepare_cap(scope.row, true)">{{ gate_name.fg }}识别</el-button>
                    <el-button v-if="scope.row.scale_status" type="warning" size="mini" @click="manual_scale(scope.row)">手动称重</el-button>
                    <el-button type="success" size="mini" @click="take_pic(scope.row, false)">{{ gate_name.bg }}拍照</el-button>
                    <el-button type="primary" size="mini" @click="prepare_cap(scope.row, false)">{{ gate_name.bg }}识别</el-button>
                    <el-button v-if="scope.row.scale_status" type="danger" size="mini" @click="reset_scale(scope.row)">重置</el-button>
                </template>
            </el-table-column>
        </el-table>

        <div v-permission="['rbac']" style="margin-top: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h3 style="margin: 0;">设备权限绑定</h3>
                <div>
                    <el-button type="primary" size="mini" @click="open_bind_dialog">新增绑定</el-button>
                    <el-button size="mini" @click="load_bindings">刷新</el-button>
                </div>
            </div>
            <el-table v-loading="binding_loading" :data="bindings" stripe>
                <el-table-column prop="device_name" label="设备" min-width="140" />
                <el-table-column prop="action_name" label="动作" min-width="120" />
                <el-table-column prop="role_name" label="角色" min-width="140" />
                <el-table-column prop="role_description" label="角色描述" min-width="160" />
                <el-table-column label="操作" width="100" fixed="right">
                    <template slot-scope="scope">
                        <el-button type="text" size="small" style="color: #f56c6c" @click="remove_binding(scope.row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <el-dialog :visible.sync="pic_path.length != 0" center>
            <el-image :src="pic_path"></el-image>
        </el-dialog>

        <el-dialog title="请输入车牌号" :visible.sync="show_cap" width="30%">
            <el-input v-model="focus_plate" placeholder="不输入即直接抓拍识别"></el-input>
            <span slot="footer">
                <el-button @click="show_cap = false">取 消</el-button>
                <el-button type="primary" @click="trigger_cap(cap_enter)">确 定</el-button>
            </span>
        </el-dialog>

        <el-dialog title="新增设备权限绑定" :visible.sync="show_bind_dialog" width="480px" @closed="reset_bind_form">
            <el-form label-width="90px">
                <el-form-item label="设备" required>
                    <el-select v-model="bind_form.device_name" placeholder="选择设备" filterable style="width: 100%">
                        <el-option v-for="dev in all_dev" :key="dev.name" :label="dev.name" :value="dev.name" />
                    </el-select>
                </el-form-item>
                <el-form-item label="动作" required>
                    <el-select v-model="bind_form.action" placeholder="选择动作" style="width: 100%">
                        <el-option v-for="act in actions" :key="act.name" :label="act.description" :value="act.name" />
                    </el-select>
                </el-form-item>
                <el-form-item label="角色" required>
                    <el-select v-model="bind_form.role_id" placeholder="选择角色" filterable style="width: 100%">
                        <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
                    </el-select>
                </el-form-item>
            </el-form>
            <span slot="footer">
                <el-button @click="show_bind_dialog = false">取消</el-button>
                <el-button type="primary" :loading="bind_saving" @click="save_binding">保存</el-button>
            </span>
        </el-dialog>
    </el-main>
</el-container>
</template>

<script>
export default {
    name: 'DevOpt',
    description: '设备管理',
    data: function () {
        return {
            pic_path: '',
            show_scale_confirm: false,
            show_scale_reset: false,
            show_cap: false,
            focus_plate: '',
            cap_enter: false,
            all_dev: [],
            health_info: '',
            device: {
                name: '',
                enter_gate: false,
                exit_gate: false,
                saler_name: '',
                scale_status: '',
            },
            bindings: [],
            binding_loading: false,
            actions: [],
            roles: [],
            show_bind_dialog: false,
            bind_saving: false,
            bind_form: {
                device_name: '',
                action: '',
                role_id: '',
            },
        };
    },
    mounted() {
        this.init_dev();
        this.init_health_info();
        if (this.$hasPermission('rbac')) {
            this.load_permission_meta();
            this.load_bindings();
        }
    },
    computed: {
        gate_name: function () {
            let fg = '前门';
            let bg = '后门';
            if (this.device.scale_status == '') {
                fg = '入口';
                bg = '出口';
            }
            return {
                fg: fg,
                bg: bg,
            }
        },
    },
    methods: {
        init_dev: async function () {
            let resp = await this.$send_req('/scale/get_device_status', {});
            this.$set(this, 'all_dev', resp.devices);
        },
        init_health_info: async function () {
            if (this.$hasPermission('rbac')) {
                let resp = await this.$send_req('/rbac/get_health_info', {});
                this.health_info = resp.result;
            }
        },
        load_permission_meta: async function () {
            try {
                let [action_ret, role_ret] = await Promise.all([
                    this.$send_req('/rbac/device_action_get_all', {}),
                    this.$send_req('/rbac/role_get_all', { pageNo: 0 }),
                ]);
                this.actions = action_ret.actions || [];
                this.roles = role_ret.all_role || [];
            } catch (e) {
                this.actions = [];
                this.roles = [];
            }
        },
        load_bindings: async function () {
            this.binding_loading = true;
            try {
                let ret = await this.$send_req('/rbac/device_permission_get_all', {});
                this.bindings = ret.bindings || [];
            } catch (e) {
                this.bindings = [];
            } finally {
                this.binding_loading = false;
            }
        },
        open_bind_dialog: async function () {
            if (!this.all_dev.length) {
                await this.init_dev();
            }
            if (!this.actions.length || !this.roles.length) {
                await this.load_permission_meta();
            }
            this.show_bind_dialog = true;
        },
        reset_bind_form: function () {
            this.bind_form = {
                device_name: '',
                action: '',
                role_id: '',
            };
            this.bind_saving = false;
        },
        save_binding: async function () {
            if (!this.bind_form.device_name || !this.bind_form.action || !this.bind_form.role_id) {
                this.$message.warning('请完整选择设备、动作和角色');
                return;
            }
            this.bind_saving = true;
            try {
                await this.$send_req('/rbac/bind_device_action2role', {
                    device_name: this.bind_form.device_name,
                    action: this.bind_form.action,
                    role_id: this.bind_form.role_id,
                });
                this.$message.success('绑定成功');
                this.show_bind_dialog = false;
                await this.load_bindings();
            } finally {
                this.bind_saving = false;
            }
        },
        remove_binding: function (row) {
            this.$confirm('确定删除该设备权限绑定吗?').then(async () => {
                await this.$send_req('/rbac/unbind_device_action2role', { id: row.id });
                this.$message.success('已删除');
                await this.load_bindings();
            }).catch(() => {});
        },
        reboot_scale_system: function () {
            this.$confirm('确定要重启过磅系统吗?').then(async () => {
                await this.$send_req('/rbac/reboot', {});
                this.$message.success('重启指令已发送');
            });
        },
        dev_refresh: async function () {
            this.init_dev()
        },
        prepare_cap: function (is_enter) {
            this.show_cap = true;
            this.cap_enter = is_enter;
        },
        gate_ctrl: async function (device, is_enter, _is_open) {
            await this.$send_req('/scale/gate_ctrl', {
                is_enter: is_enter,
                is_open: _is_open,
                name: device.name,
            });
            this.dev_refresh();
        },
        take_pic: async function (device, is_enter) {
            let resp = await this.$send_req('/scale/take_pic', {
                is_enter: is_enter,
                name: device.name,
            });
            this.pic_path = resp.pic;
        },
        reset_scale: async function (device) {
            this.$confirm('确定要重置吗?').then(async () => {
                await this.$send_req('/scale/reset_scale', {
                    name: device.name,
                });
                this.dev_refresh();
            });
        },
        manual_scale: async function (device) {
            await this.$send_req('/scale/confirm_scale', {
                name: this.device.name
            });
            this.dev_refresh();
        },
        trigger_cap: async function (device, is_enter) {
            await this.$send_req('/scale/trigger_cap', {
                name: this.device.name,
                vehicle_number: this.focus_plate,
                is_enter: is_enter
            });
            this.dev_refresh();
        },
    }
}
</script>

<style scoped>
/* el-alert__content is a table-cell that doesn't grow to fill the row by default */
::v-deep .el-alert__content {
    flex: 1;
}
</style>

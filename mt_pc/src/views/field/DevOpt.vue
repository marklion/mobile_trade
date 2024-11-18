<template>
    <el-container>
        <el-main>
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
                        <el-button type="primary" size="mini"
                            @click="gate_ctrl(scope.row, true, true)">开{{ gate_name.fg }}</el-button>
                        <el-button type="primary" size="mini"
                            @click="gate_ctrl(scope.row, false, true)">开{{ gate_name.bg }}</el-button>
                        <el-button type="danger" size="mini"
                            @click="gate_ctrl(scope.row, true, false)">关{{ gate_name.fg }}</el-button>
                        <el-button type="danger" size="mini"
                            @click="gate_ctrl(scope.row, false, false)">关{{ gate_name.bg }}</el-button>
                    </template>
                </el-table-column>
                <el-table-column label="功能" align="left">
                    <template slot-scope="scope">
                        <el-button type="success" size="mini"
                            @click="take_pic(scope.row, true)">{{ gate_name.fg }}拍照</el-button>
                        <el-button type="primary" size="mini"
                            @click="prepare_cap(scope.row, true)">{{ gate_name.fg }}识别</el-button>
                        <el-button v-if="scope.row.scale_status" type="warning" size="mini"
                            @click="manual_scale(scope.row)">手动称重</el-button>
                        <el-button type="success" size="mini"
                            @click="take_pic(scope.row, false)">{{ gate_name.bg }}拍照</el-button>
                        <el-button type="primary" size="mini"
                            @click="prepare_cap(scope.row, false)">{{ gate_name.bg }}识别</el-button>
                        <el-button v-if="scope.row.scale_status" type="danger" size="mini"
                            @click="reset_scale(scope.row)">重置</el-button>
                    </template>
                </el-table-column>
            </el-table>

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
            device: {
                name: '',
                enter_gate: false,
                exit_gate: false,
                saler_name: '',
                scale_status: '',
            },
        };
    },
    mounted() {
        this.init_dev();
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
<template>
<el-container>
    <el-header style="padding-top: 20px;">
        <el-form>
            <el-form-item style="width: 400px;">
                <el-input v-model="search_key" placeholder="输入公司名称/车牌号/司机姓名/电话查询" clearable @clear="cancel_search">
                    <el-button slot="append" icon="el-icon-search" @click="do_search"></el-button>
                </el-input>
            </el-form-item>
        </el-form>
    </el-header>
    <el-main>
        <page-content ref="wait_que" :req_url="'/scale/wait_que'" :search_input="search_key" :search_key="['company.name', 'main_vehicle.plate', 'behind_vehicle.plate', 'driver.name', 'driver.phone']" body_key="plans" :req_body="{}" :enable="true">
            <template v-slot:default="scope">
                <el-table :data="scope.content" height="80vh" table-layout="auto">
                    <el-table-column prop="register_number" label="序号" width="60">
                    </el-table-column>
                    <el-table-column prop="company.name" label="公司名称" width="120">
                    </el-table-column>
                    <el-table-column prop="main_vehicle.plate" label="主车号" show-overflow-tooltip>
                    </el-table-column>
                    <el-table-column prop="behind_vehicle.plate" label="挂车号" show-overflow-tooltip>
                    </el-table-column>
                    <el-table-column prop="driver.name" label="司机姓名" show-overflow-tooltip>
                    </el-table-column>
                    <el-table-column prop="driver.phone" label="司机电话" width="120">
                    </el-table-column>
                    <el-table-column prop="register_time" label="排号时间" show-overflow-tooltip>
                        <template slot-scope="scope">
                            <div>
                                {{scope.row.register_time}}
                            </div>
                            <el-tag v-if="scope.row.expect_weight > 0">
                                期望重量：{{scope.row.expect_weight}}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="call_time" label="叫号时间" show-overflow-tooltip>
                    </el-table-column>
                    <el-table-column prop="p_weight" label="一次重量">
                    </el-table-column>
                    <el-table-column prop="confirmed" label="装卸货确认" align="center" show-overflow-tooltip>
                        <template slot-scope="scope">
                            <el-tag v-if="scope.row.confirmed" type="success">已确认</el-tag>
                            <el-tag v-else type="warning">未确认</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="铅封号" prop="seal_no" align="center">
                        <template slot-scope="scope">
                            <span v-if="scope.row.seal_no">{{scope.row.seal_no}}</span>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="装卸地址" prop="drop_take_zone_name" align="center">
                        <template slot-scope="scope">
                            <span v-if="scope.row.drop_take_zone_name">{{scope.row.drop_take_zone_name}}</span>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="300">
                        <template slot-scope="scope">
                            <template v-if="!scope.row.call_time">
                                <el-button size="mini" type="success" @click="call_vehicle(scope.row)">叫号</el-button>
                            </template>
                            <template v-else-if="!scope.row.enter_time">
                                <el-button size="mini" type="danger" @click="prepare_pass_vehicle(scope.row)">过号</el-button>
                                <el-button v-if="scope.row.stuff.manual_weight" size="mini" type="primary" @click="prepare_enter_vehicle(scope.row)">进厂</el-button>
                            </template>
                            <template v-else>
                                <el-button size="mini" type="warning" @click="prepare_confirm_vehicle(scope.row)">装卸货</el-button>
                                <el-button size="mini" type="danger" @click="prepare_enter_vehicle(scope.row, true)">撤销进厂</el-button>
                                <el-button size="mini" type="primary" v-if="scope.row.stuff.manual_weight" @click="prepare_manual_weight(scope.row)">计量</el-button>
                            </template>
                        </template>
                    </el-table-column>
                </el-table>
            </template>
        </page-content>

        <el-dialog title="过号确认" :visible.sync="show_pass_vehicle" width="30%">
            <span>确定要过号吗？</span>
            <span slot="footer">
                <el-button @click="show_pass_vehicle = false">取 消</el-button>
                <el-button type="primary" @click="pass_vehicle">确 定</el-button>
            </span>
        </el-dialog>

        <el-dialog :title="(is_exit_confirm ? '撤销' : '') + '进厂确认'" :visible.sync="show_enter_vehicle" width="30%">
            <span>确定{{ is_exit_confirm ? '撤销' : '' }}车辆进厂吗？</span>
            <span slot="footer">
                <el-button @click="show_enter_vehicle = false">取 消</el-button>
                <el-button type="primary" @click="enter_vehicle">确 定</el-button>
            </span>
        </el-dialog>

        <el-dialog title="装卸货确认" :visible.sync="show_confirm_vehicle" width="30%">
            <el-form>
                <el-form-item label="铅封号">
                    <el-input v-model="tmp_seal_no" placeholder="请输入铅封号">
                        <el-button slot="append" type="success" v-if="focus_company.pressure_config" @click="confirmSealNo">确认泄压</el-button>
                    </el-input>
                </el-form-item>
                <el-form-item label="装卸区域" v-if="zones">
                    <el-select v-model="zone_name" placeholder="请选择">
                        <el-option v-for="item in zones" :key="item.id" :label="item.name" :value="item.name"></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <span slot="footer">
                <el-button @click="show_confirm_vehicle = false">取 消</el-button>
                <el-button type="primary" @click="confirm_vehicle">确 定</el-button>
            </span>
        </el-dialog>
        <measurement ref="measurement" :focus_plan="focus_plan" @refresh="refresh_wait_que" />
    </el-main>
</el-container>
</template>

<script>
import PageContent from '@/components/PageContent.vue';
import Measurement from '@/components/Measurement.vue';
export default {
    name: 'Field',
    description: '排队车辆',
    components: {
        "page-content": PageContent,
        "measurement": Measurement
    },
    data() {
        return {
            show_pass_vehicle: false,
            show_enter_vehicle: false,
            show_confirm_vehicle: false,
            focus_plan_id: 0,
            search_key: '',
            plans: [],
            tmp_seal_no: '',
            is_exit_confirm: false,
            focus_company: {},
            zones: [],
            zone_name: '',
            focus_plan: {},
        };
    },
    methods: {
        init_dev: async function () {
            let resp = await this.$send_req('/scale/get_device_status', {});
            this.$set(this, 'all_dev', resp.devices);
        },
        dev_refresh: async function () {
            this.loading = true;
            setTimeout(async () => {
                await this.init_dev();
                this.loading = false;
            }, 2000);
        },
        do_search() {
            this.$refs.wait_que.do_search();
        },
        cancel_search() {
            this.search_key = '';
            this.$refs.wait_que.cancel_search();
        },
        refresh_wait_que() {
            let cur_page = this.$refs.wait_que.cur_page;
            this.$refs.wait_que.refresh(cur_page);
        },

        after_other_action(e) {
            if (e.action == 'delete') {
                this.stamp_pic = '';
            }
        },
        sectionChange(index) {
            this.cur_page = index;
        },
        pass_vehicle: async function () {
            await this.$send_req('/scale/cancel_check_in', {
                plan_id: this.focus_plan_id
            });
            this.refresh_wait_que();
            this.show_pass_vehicle = false;
        },
        prepare_pass_vehicle(item) {
            this.focus_plan_id = item.id;
            this.show_pass_vehicle = true;
        },
        prepare_enter_vehicle: async function (item, is_exit = false) {
            this.focus_plan_id = item.id;
            this.show_enter_vehicle = true;
            this.is_exit_confirm = is_exit;
        },
        prepare_manual_weight(item) {
            console.log(item);
            this.focus_plan_id = item.id;
            this.focus_plan = item;
            this.$refs.measurement.show();
        },
        enter_vehicle: async function () {
            await this.$send_req('/scale/vehicle_enter', {
                plan_id: this.focus_plan_id,
                is_exit: this.is_exit_confirm
            });
            this.refresh_wait_que();
            this.show_enter_vehicle = false;
        },
        prepare_confirm_vehicle: async function (item) {
            this.focus_plan_id = item.id;
            this.tmp_seal_no = item.seal_no;
            this.show_confirm_vehicle = true;
            this.focus_company = item.stuff.company;
            this.zones = item.stuff.drop_take_zones;
        },
        confirmSealNo() {
            this.tmp_seal_no = '正在泄压';
        },
        confirm_vehicle: async function () {
            await this.$send_req('/scale/confirm_vehicle', {
                plan_id: this.focus_plan_id,
                is_confirm: true,
                seal_no: this.tmp_seal_no,
                drop_take_zone_name: this.zone_name
            });
            this.refresh_wait_que();
            this.show_confirm_vehicle = false;
        },
        call_vehicle: async function (item) {
            await this.$send_req('/scale/call_vehicle', {
                plan_id: item.id
            });
            this.refresh_wait_que();
        },
    }
}
</script>

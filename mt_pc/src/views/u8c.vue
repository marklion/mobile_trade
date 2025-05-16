<template>
<div class="u8c_show">
    <span class="sub_title_show">订单选择</span>
    <el-date-picker style="width:260px" :clearable="false" v-model="date_range" type="daterange" align="right" unlink-panels range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="pickerOptions" @change="refresh_info">
    </el-date-picker>
    <el-button v-if="order_selected.length > 0" size="mini" type="success" @click="sync_selected2u8c">同步所选</el-button>
    <el-button size="mini" type="primary" @click="sync_all">全部同步</el-button>
    <el-button size="mini" type="text" @click="config_show = true">同步配置</el-button>
    <page-content ref="plans" body_key="plans" :enable="filter.plan_time_start.length > 0" req_url="/u8c/unsynced_plans_get" :req_body="filter">
        <template v-slot:default="slotProps">
            <div class="top_part_show">
                <el-table ref="order_table" :data="slotProps.content" style="width: 100%" stripe height="100%" @selection-change="record_selection">
                    <el-table-column type="selection"></el-table-column>
                    <el-table-column min-width="170" prop="company.name" label="下单公司">
                    </el-table-column>
                    <el-table-column min-width="170" prop="delegate.name" label="代理公司">
                    </el-table-column>
                    <el-table-column min-width="50" prop="stuff.name" label="物料">
                    </el-table-column>
                    <el-table-column min-width="100" prop="plan_time" label="计划日期">
                    </el-table-column>
                    <el-table-column min-width="100" prop="main_vehicle.plate" label="主车号">
                    </el-table-column>
                    <el-table-column min-width="100" prop="behind_vehicle.plate" label="挂车号">
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
    <el-divider></el-divider>
    <span class="sub_title_show">同步记录</span>
    <el-button v-if="ois_selected.length > 0" size="mini" type="success" @click="del_ois">删除</el-button>
    <page-content body_key="ois" enable req_url="/u8c/u8c_get_oi" ref="ois">
        <template v-slot:default="slotProps">
            <div class="bottom_part_show">
                <el-table ref="oi_table" :data="slotProps.content" style="width: 100%" stripe height="100%" @selection-change="ois_selection">
                    <el-table-column type="selection"></el-table-column>
                    <el-table-column prop="time" label="时间" width="100px">
                    </el-table-column>
                    <el-table-column prop="operator" label="操作员" width="80px">
                    </el-table-column>
                    <el-table-column label="日志" width="800px">
                        <template #default="scope">
                            <el-input type="textarea" :rows="3" :value="scope.row.run_log" readonly>
                            </el-input>
                        </template>
                    </el-table-column>
                    <el-table-column label="下单公司" width="200px">
                        <template #default="scope">
                            {{scope.row.plans[0].company.name}}
                        </template>
                    </el-table-column>
                    <el-table-column label="订单" type="expand">
                        <template #default="scope">
                            <el-table :data="scope.row.plans" size="mini" style="padding-left: 50px;">
                                <el-table-column prop="company.name" label="公司"></el-table-column>
                                <el-table-column prop="plan_time" label="订单日期"></el-table-column>
                                <el-table-column prop="count" label="装车量"></el-table-column>
                            </el-table>
                        </template>
                    </el-table-column>
                    <el-table-column label="状态">
                        <template #default="scope">
                            <el-tag v-if="scope.row.is_running" type="warning" size="small">运行中</el-tag>
                            <el-tag v-else-if="scope.row.error_msg" type="danger" size="small">失败</el-tag>
                            <el-tag v-else type="success" size="small">完成</el-tag>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
    <el-drawer title="同步配置" :visible.sync="config_show" direction="rtl">
        <el-form :model="u8c_config" ref="u8c_config">
            <vue-grid align="stretch">
                <vue-cell class="cell_show" v-for="(single_uc, index) in u8c_config_array" :key="index" width="6of12">
                    <el-form-item :label="single_uc.label" :prop="single_uc.key">
                        <el-input v-model="u8c_config[single_uc.key]"></el-input>
                    </el-form-item>
                </vue-cell>
            </vue-grid>
            <el-form-item>
                <el-button type="primary" @click="save_u8c_config">保存</el-button>
            </el-form-item>
        </el-form>
    </el-drawer>

</div>
</template>

<script>
import PageContent from '../components/PageContent.vue'
import {
    VueGrid,
    VueCell
} from 'vue-grd';
import moment from 'moment';
export default {
    name: 'u8c',
    components: {
        "page-content": PageContent,
        VueGrid,
        VueCell,
    },
    data: function () {
        return {
            ois_selected: [],
            pickerOptions: this.$quik_date_option,
            filter: {
                plan_time_start: '',
                plan_time_end: '',
            },
            date_range: '',
            config_show: false,
            order_selected: [],
            u8c_config: {
                system_code: '',
                usercode: '',
                password: '',
                url: '',
                corpid: '',
                cbiztype_sale: '',
                cdeptid_sale: '',
                csalecorpid: '',
                ccalbodyid: '',
                ccurrencytypeid: '',
                cbiztype_buy: '',
                cdeptid_buy: '',
                cpurorganization: '',
                idiscounttaxtype: '',
                ntaxrate_buy: '',
                vnote: '',
                coperatorid:'',
            },
            u8c_config_array: [{
                    key: 'system_code',
                    label: '系统编码',
                },
                {
                    key: 'usercode',
                    label: '用户编码',
                },
                {
                    key: 'password',
                    label: '密码',
                },
                {
                    key: 'url',
                    label: '路径',
                },
                {
                    key: 'corpid',
                    label: '公司ID',
                },
                {
                    key: 'cbiztype_sale',
                    label: '销售流程ID',
                },
                {
                    key: 'cdeptid_sale',
                    label: '销售部门ID',
                },
                {
                    key: 'csalecorpid',
                    label: '销售组织ID',
                },
                {
                    key: 'ccalbodyid',
                    label: '库存组织ID',
                },
                {
                    key: 'ccurrencytypeid',
                    label: '币种ID',
                },
                {
                    key: 'cbiztype_buy',
                    label: '采购流程ID',
                },
                {
                    key: 'cdeptid_buy',
                    label: '采购部门ID',
                },
                {
                    key: 'cpurorganization',
                    label: '采购组织ID',
                },
                {
                    key: 'idiscounttaxtype',
                    label: '扣税方法',
                },
                {
                    key: 'ntaxrate_buy',
                    label: '税率',
                },
                {
                    key: 'vnote',
                    label: '备注',
                },
                {
                    key: 'coperatorid',
                    label: '操作员ID',
                }
            ],
        }
    },
    methods: {
        ois_selection: function (val) {
            this.ois_selected = val;
        },
        del_ois: async function () {
            let oi_ids = this.ois_selected.map((item) => {
                return {
                    id: item.id
                }
            });
            await this.$send_req('/u8c/u8c_del_oi', {
                oi_ids: oi_ids,
            });
            this.refresh_info();
        },
        record_selection: function (val) {
            this.order_selected = val;
        },
        sync_selected2u8c: async function () {
            let plan_ids = this.order_selected.map((item) => {
                return {
                    id: item.id
                }
            });
            await this.$send_req('/u8c/u8c_sync_order', {
                plan_ids: plan_ids,
                plan_time_start: this.filter.plan_time_start,
                plan_time_end: this.filter.plan_time_end,
            });
            this.refresh_info();
        },
        refresh_info: function () {
            this.filter.plan_time_start = moment(this.date_range[0]).format('YYYY-MM-DD');
            this.filter.plan_time_end = moment(this.date_range[1]).format('YYYY-MM-DD');
            this.$refs.plans.refresh();
            this.$refs.ois.refresh();
            this.order_selected = [];
            this.ois_selected = [];
        },
        sync_all: async function () {
            await this.$send_req('/u8c/u8c_sync_order', {
                all: true,
                plan_time_start: this.filter.plan_time_start,
                plan_time_end: this.filter.plan_time_end,
            });
            this.refresh_info();
        },
        init_u8c_config: async function () {
            this.filter = {
                plan_time_start: moment().format('YYYY-MM-DD'),
                plan_time_end: moment().add(1, 'days').format('YYYY-MM-DD'),
            };
            this.date_range = [new Date(this.filter.plan_time_start), new Date(this.filter.plan_time_end)];
            this.u8c_config = await this.$send_req('/u8c/u8c_config_get', {});
            this.refresh_info();
        },
        save_u8c_config: async function () {
            await this.$send_req('/u8c/u8c_config_set', this.u8c_config);
            await this.init_u8c_config();
            this.config_show = false;
        },
    },
    mounted: async function () {
        await this.init_u8c_config();
    }
}
</script>

<style scoped>
.top_part_show {
    height: 34vh;
}

.bottom_part_show {
    height: 34vh;
}

.sub_title_show {
    font-size: 20px;
    margin-right: 20px;
}

.u8c_show {
    padding: 20px;
}

.cell_show {
    padding-left: 8px;
    padding-right: 8px;
}

.cell_show:first-child {
    padding-left: 0;
}

.cell_show:last-child {
    padding-right: 0;
}
</style>

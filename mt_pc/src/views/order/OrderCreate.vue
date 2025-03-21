<template>
<div class="dashboard-container">
    <el-alert v-if="notice_show" show-icon :title="notice" type="info" close-text="了解"></el-alert>

    <el-row :gutter="20">
        <el-col :span="12">
            <div class="dashboard-text"> {{ query.stuff_name }}</div>
            <el-form ref="plan" :model="plan" :rules="order_rules" label-width="80px">
                <el-form-item label="买方">
                    <el-input v-model="buyer_name" readonly></el-input>
                    <div class="sub-title" v-if="bidding_id != 0">竞价成功发起</div>
                </el-form-item>

                <el-form-item label="卖方">
                    <el-input v-model="saler_name" readonly></el-input>
                </el-form-item>

                <el-form-item label="计划日期" prop="plan_time">
                    <el-date-picker v-model="plan.plan_time" type="date" :default-value="default_time" placeholder="选择日期" value-format="yyyy-MM-dd">
                    </el-date-picker>
                </el-form-item>

                <div v-if="type_define.is_sale">
                    <el-form-item label="用途" prop="use_for">
                        <el-select v-model="plan.use_for" placeholder="请选择">
                            <el-option v-for="item in use_for_array" :key="item" :label="item" :value="item">
                            </el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="卸车地点" prop="drop_address">
                        <el-cascader v-model="plan.drop_address" placeholder="请选择，可搜索" :options="getRegion()" filterable></el-cascader>
                    </el-form-item>
                </div>
                <div v-else>
                    <el-form-item label="单价" prop="price">
                        <el-input type="number" placeholder="请输入单价" v-model="plan.price"></el-input>
                    </el-form-item>
                    <el-form-item label="连续派车" prop="is_repeat">
                        <el-switch v-model="plan.is_repeat"></el-switch>
                    </el-form-item>
                    <el-form-item label="我要代提">
                        <el-switch v-model="is_proxy" @change="onProxyChange"></el-switch>
                    </el-form-item>
                </div>
                <el-form-item label="承运公司">
                    <el-input v-model="plan.trans_company_name" placeholder="请输入承运公司"></el-input>
                </el-form-item>
            </el-form>
        </el-col>
        <el-col :span="12">

            <el-radio-group v-model="add_type" style="margin-top: 20px;">
            <el-radio-button label="single" icon="el-icon-plus"><i class="el-icon-plus"></i> 新增车辆</el-radio-button>
            <el-radio-button label="team" icon="el-icon-truck"><i class="el-icon-truck"></i> 选择车队</el-radio-button>
            <el-radio-button label="batch" icon="el-icon-upload2"><i class="el-icon-upload2"></i> 批量导入</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="onSubmit" style="float:right; margin-top: 20px;">提交订单</el-button>
        <el-card v-if="add_type == 'single'" class="add_vehicle_card">
            <el-form ref="v_form" :model="new_vehicle" :rules="rules" label-width="80px">
                <el-form-item label="选择">
                    <el-select v-model="new_vehicle_select" filterable placeholder="选择历史记录" @change="vehicle_selected">
                        <el-option v-for="item in data2show" :key="item.search_cond" :label="item.search_cond" :value="item">
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="主车牌" prop="main_vehicle_plate">
                    <el-input v-model="new_vehicle.main_vehicle_plate"></el-input>
                </el-form-item>
                <el-form-item label="挂车牌" prop="behind_vehicle_plate">
                    <el-input v-model="new_vehicle.behind_vehicle_plate"></el-input>
                </el-form-item>
                <el-form-item label="司机姓名" prop="driver_name">
                    <el-input v-model="new_vehicle.driver_name"></el-input>
                </el-form-item>
                <el-form-item label="司机电话" prop="driver_phone">
                    <el-input v-model="new_vehicle.driver_phone"></el-input>
                </el-form-item>
                <el-form-item label="备注">
                    <el-input v-model="new_vehicle.comment"></el-input>
                </el-form-item>
                <el-button type="primary" style="width : 100%" @click="add_vehicle">添加</el-button>
            </el-form>
        </el-card>
        <el-card v-if="add_type == 'team'" class="add_vehicle_card">
            <el-form ref="vt_form" label-width="80px">
                <el-form-item label="选择车队">
                    <el-select v-model="new_vt_select" filterable placeholder="选择车队" @change="vehicle_team_selected">
                        <el-option v-for="item in all_vt_list" :key="item.id" :label="`${item.name} - ${item.vehicle_sets.length}辆`" :value="item">
                        </el-option>
                    </el-select>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card v-if="add_type == 'batch'" class="add_vehicle_card">

            <el-form ref="vb_form" :model="new_vehicle" :rules="rules" label-width="80px">
                <el-form-item label="选择文件">
                    <el-upload class="upload-demo" ref="upload" :limit="1" accept=".xls,.xlsx" action="https://jsonplaceholder.typicode.com/posts/" :file-list="fileList" :before-upload="handlerBeforeUpload" :auto-upload="true">
                        <el-button slot="trigger" size="small" type="primary">选取文件</el-button>
                        <el-button size="small" type="default" style="margin-left: 10px;" @click="doDownloadTemplate">下载模版</el-button>
                        <div slot="tip" class="el-upload__tip">只能上传jpg/png文件，且不超过500kb</div>
                    </el-upload>
                </el-form-item>
                <el-form-item label="主车牌" prop="main_vehicle_plate" hidden>
                    <el-input v-model="new_vehicle.main_vehicle_plate"></el-input>
                </el-form-item>
                <el-form-item label="挂车牌" prop="behind_vehicle_plate" hidden>
                    <el-input v-model="new_vehicle.behind_vehicle_plate"></el-input>
                </el-form-item>
                <el-form-item label="司机姓名" prop="driver_name" hidden>
                    <el-input v-model="new_vehicle.driver_name"></el-input>
                </el-form-item>
                <el-form-item label="司机电话" prop="driver_phone" hidden>
                    <el-input v-model="new_vehicle.driver_phone"></el-input>
                </el-form-item>
                <el-form-item label="备注" hidden>
                    <el-input v-model="new_vehicle.comment"></el-input>
                </el-form-item>
            </el-form>
        </el-card>
        </el-col>
    </el-row>
    <el-row>
        <el-table :data="vehicles" style="width: 100%" max-height="250">
            <el-table-column fixed prop="main_vehicle.plate" label="主车牌">
            </el-table-column>
            <el-table-column prop="behind_vehicle.plate" label="挂车牌">
            </el-table-column>
            <el-table-column prop="driver.name" label="司机姓名">
            </el-table-column>
            <el-table-column prop="driver.phone" label="司机电话">
            </el-table-column>
            <el-table-column prop="comment" label="备注">
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="120">
                <template slot-scope="scope">
                    <el-button @click.native.prevent="deleteRow(scope.$index, vehicles)" type="text" size="small">
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-row>
    

        

        

    

    

</div>
</template>

<script>
import {
    mapGetters
} from 'vuex';
import moment from 'moment';
import {
    pcTextArr
} from "element-china-area-data";

export default {
    name: 'Dashboard',
    computed: {
        ...mapGetters([
            'name',
            'company_name',
            'roles'
        ])
    },
    data() {
        return {
            fileList: [],

            add_type: '',
            query: {},

            order_rules: {
                plan_time: [{
                    required: true,
                    message: '请选择计划日期',
                    trigger: 'blur'
                }],
                drop_address: [{
                    required: true,
                    message: '请选择卸车地点',
                    trigger: 'blur'
                }],
                use_for: [{
                    required: true,
                    message: '请选择用途',
                    trigger: 'blur'
                }],
                price: [{
                    type: 'number',
                    message: '请输入正确的金额',
                    trigger: 'blur'
                }]
            },

            bidding_id: 0,
            all_vt_list: [],
            new_vt_select: null,

            notice_show: false,
            notice: '',

            is_proxy: false,
            type_define: {
                vh_fetch_url: '/customer/fetch_vehicle',
                dr_fetch_url: '/customer/fetch_driver',
                order_create_url: '/customer/order_buy_create',
                pair_get_url: '/customer/get_vehicle_pair',
                is_sale: true,
            },
            data2show: [], //历史可供选择的车辆
            new_vehicle_select: null,
            new_vehicle: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_name: '',
                driver_phone: '',
                comment: '',
            },
            rules: {
                main_vehicle_plate: [{
                        required: true,
                        message: '请输入主车牌',
                        trigger: 'blur'
                    },
                    {
                        validator: this.carNoValidator,
                        message: '请输入正确的车牌号码',
                        trigger: 'blur'
                    },
                ],
                behind_vehicle_plate: [

                    {
                        validator: this.carNoValidator,
                        message: '请输入正确的车牌号码',
                        trigger: 'blur'
                    },
                ],
                driver_name: [{
                        required: true,
                        message: '请输入司机姓名',
                        trigger: 'blur'
                    },
                    {
                        pattern: /^[\u4e00-\u9fa5·]{2,10}$/,
                        message: '请输入正确的司机姓名',
                        trigger: 'blur'
                    }
                ],
                driver_phone: [{
                        required: true,
                        message: '请输入司机电话',
                        trigger: 'blur'
                    },
                    {
                        pattern: /^1[3-9]\d{9}$/,
                        message: '请输入正确的手机号码',
                        trigger: 'blur'
                    }
                ]

            },

            use_for_array: [
                '气化', '气站', '其他'
            ],
            plan: {
                comment: "",
                drop_address: [],
                plan_time: "",
                stuff_id: 0,
                use_for: "",
                trans_company_name: '',
                price: 0,
                is_repeat: false,
            },
            stuff_name: '',
            company_id: 0,
            saler_name: '',
            buyer_name: '',
            default_time: new Date(),
            // 页面添加的车辆
            vehicles: []
        }
    },
    methods: {
        onProxyChange(is_proxy) {
            this.is_proxy = is_proxy;
            let tmp = this.plan.trans_company_name;
            this.plan.trans_company_name = this.saler_name;
            this.saler_name = tmp;

        },
        deleteRow(index, rows) {
            rows.splice(index, 1);
        },
        async handlerBeforeUpload(file) {
            try {
                let ar = await this.convert_excel2array(file.arrayBuffer());
                let importInfo = {
                    successCount: 0,
                    errorCount: 0,
                    totalCount: ar.length
                };
                const processedData = await Promise.all(ar.map(async (element) => {
                    try {
                        this.new_vehicle = {
                            ...this.new_vehicle,
                            ...element
                        };
                        await this.$nextTick();
                        await this.$refs.vb_form.validate(); //校验失败抛异常，此处

                        this.$refs.vb_form.resetFields();
                        try {
                            const [mv, bv, dr] = await Promise.all([
                                this.$send_req(this.type_define.vh_fetch_url, {
                                    plate: element.main_vehicle_plate
                                }),
                                this.$send_req(this.type_define.vh_fetch_url, {
                                    plate: element.behind_vehicle_plate
                                }),
                                this.$send_req(this.type_define.dr_fetch_url, {
                                    phone: element.driver_phone,
                                    name: element.driver_name
                                })
                            ]);

                            importInfo.successCount++;
                            return {
                                main_vehicle: {
                                    id: mv.id,
                                    plate: element.main_vehicle_plate
                                },
                                behind_vehicle: {
                                    id: bv.id,
                                    plate: element.behind_vehicle_plate
                                },
                                driver: {
                                    id: dr.id,
                                    name: element.driver_name,
                                    phone: element.driver_phone
                                },
                                comment: element.comment || '文件导入',

                            };
                        } catch (error) {
                            console.error('error:', error);
                            importInfo.errorCount++;
                            return null;
                        }

                    } catch (e) {
                        console.log('e', e)
                        importInfo.errorCount++;
                        return null;
                    }

                }));
                this.vehicles.unshift(...processedData.filter(item => item !== null));
                this.$message({
                    message: `成功导入${importInfo.successCount}条,失败${importInfo.errorCount}条`,
                    type: 'success',
                    duration: 5000
                });
            } catch (error) {
                console.error('Import failed:', error);
                this.$message({
                    message: '导入失败，请重试',
                    type: 'warning',
                    duration: 5000
                });
            } finally {
                this.add_type = '';
                return false; //实际上不上传
            }
        },
        convert_excel2array: async function (file_content) {
            const Excel = require('exceljs');
            let wb = new Excel.Workbook();
            let workbook = await wb.xlsx.load(file_content)
            let ws = workbook.getWorksheet(1);
            let ret = [];
            const regStrReplace = /[\t\s]/g;
            ws.eachRow(function (row, rowNumber) {
                if (rowNumber != 1) {
                    ret.push({
                        main_vehicle_plate: row.getCell(1).text.toUpperCase().replaceAll(regStrReplace, ''),
                        behind_vehicle_plate: row.getCell(2).text.toUpperCase().replaceAll(regStrReplace, ''),
                        driver_name: row.getCell(3).text.toUpperCase().replaceAll(regStrReplace, ''),
                        driver_phone: row.getCell(4).text.toUpperCase().replaceAll(regStrReplace, ''),
                        // 模板最后一列放备注信息
                        comment: row.getCell(row.cellCount).text.replaceAll(regStrReplace, ''),
                    })
                }
            });
            return ret;
        },
        doDownloadTemplate: async function () {
            this.$download_file('/uploads/模板1.xlsx', '导入模版');
        },
        onSubmit: async function () {
            try {
                await this.$refs.plan.validate();
                if (this.vehicles.length == 0) {
                    this.$message({
                        message: "请添加车辆",
                        type: 'danger',
                        duration: 5000
                    })
                    return;
                }
                if (this.plan.price) {
                    this.plan.price = parseFloat(this.plan.price);
                }
                for (let index = 0; index < this.vehicles.length; index++) {
                    let ele = this.vehicles[index];
                    let req = {
                        ...this.plan,
                        drop_address: this.plan.drop_address.join('-'),
                        main_vehicle_id: ele.main_vehicle.id,
                        behind_vehicle_id: ele.behind_vehicle.id,
                        driver_id: ele.driver.id,
                        is_proxy: this.is_proxy,
                        bidding_id: this.bidding_id,
                        comment: ele.comment,
                    };
                    if (req.is_proxy) {
                        req.proxy_company_name = this.saler_name;
                    }
                    await this.$send_req(this.type_define.order_create_url, req);

                }
                this.$router.push('/order/order_' + (this.type_define.is_sale ? "buy" : "sale"));
            } catch (err) {
                console.log(err)
            } finally {

            }
        },
        getRegion() {
            return pcTextArr;
        },
        get_vehicles: async function (pair_get_url = this.type_define.pair_get_url) {

            let res = await this.$send_req(pair_get_url, {});
            let vt = await this.$send_req('/global/get_vehicle_team', {});
            const vehicles = vt.vehicle_teams.flatMap(team =>
                team.vehicle_sets.map(set => ({
                    behind_vehicle_plate: set.behind_vehicle.plate,
                    driver_name: set.driver.name,
                    driver_phone: set.driver.phone,
                    main_vehicle_plate: set.main_vehicle.plate
                }))
            );
            let mergedPairs = [...res.pairs, ...vehicles];

            const uniquePairs = Array.from(new Set(mergedPairs.map(JSON.stringify))).map(JSON.parse);

            res.pairs = mergedPairs

            res.pairs.forEach(ele => {
                ele.search_cond = `${ele.main_vehicle_plate}-${ele.behind_vehicle_plate}-${ele.driver_name}-${ele.driver_phone}`;
            });
            this.data2show = res.pairs;
            return res.pairs;
        },
        get_vt_list: async function () {
            let res = await this.$send_req('/global/get_vehicle_team', {});
            this.all_vt_list = res.vehicle_teams;
        },
        vehicle_selected: function () {
            this.new_vehicle = this.new_vehicle_select;
            this.new_vehicle_select = null;
        },
        add_vehicle: async function () {
            this.$refs.v_form.validate(async valid => {
                try {
                    if (valid) {
                        let mv = await this.$send_req(this.type_define.vh_fetch_url, {
                            plate: this.new_vehicle.main_vehicle_plate,
                        });
                        let bv = await this.$send_req(this.type_define.vh_fetch_url, {
                            plate: this.new_vehicle.behind_vehicle_plate,
                        });
                        let dr = await this.$send_req(this.type_define.dr_fetch_url, {
                            phone: this.new_vehicle.driver_phone,
                            name: this.new_vehicle.driver_name,
                        });
                        this.vehicles.unshift({
                            main_vehicle: {
                                id: mv.id,
                                plate: this.new_vehicle.main_vehicle_plate,
                            },
                            behind_vehicle: {
                                id: bv.id,
                                plate: this.new_vehicle.behind_vehicle_plate,
                            },
                            driver: {
                                id: dr.id,
                                name: this.new_vehicle.driver_name,
                                phone: this.new_vehicle.driver_phone,
                            },
                            comment: this.new_vehicle.comment,
                        });

                        this.$refs.v_form.resetFields();
                        this.add_type = null;
                    } else {
                        console.log('error submit!!');
                        return false;
                    }
                } catch (err) {
                    console.log('error', err)
                }
            })
        },

        isCarNo: function (carNo) {
            // 定义普通燃油车车牌的正则表达式
            const regularPlatePattern = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼]{1}[A-HJ-NP-Z]{1}[A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]{1}$/;
            // 定义新能源车牌的正则表达式
            const newEnergyPlatePattern = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼]{1}[A-HJ-NP-Z]{1}(([0-9]{5}[DF])|([DF][A-HJ-NP-Z0-9][0-9]{4}))$/;
            // 先检查是否符合普通燃油车车牌格式
            if (regularPlatePattern.test(carNo)) {
                return true;
            }
            // 再检查是否符合新能源车牌格式
            if (newEnergyPlatePattern.test(carNo)) {
                return true;
            }
            return false;
        },
        carNoValidator: function (rule, carNo, callback) {
            if (!this.isCarNo(carNo)) {
                callback(rule.message);
            } else {
                //此处必须有，去掉会发生奇怪错误
                callback();
            }
        },
        vehicle_team_selected: async function (vt) {
            let vs = vt.vehicle_sets;
            vs.forEach(ele => {
                this.vehicles.unshift({
                    main_vehicle: ele.main_vehicle,
                    behind_vehicle: ele.behind_vehicle,
                    driver: ele.driver,
                    comment: '',
                });
            });
            this.new_vt_select = null;
            this.add_type = '';
        },
    },
    async mounted() {
        this.query = this.$route.query

        this.plan.stuff_id = parseInt(this.query.stuff_id);
        if (this.query.bidding_id) {
            this.bidding_id = parseInt(this.query.bidding_id);
        }
        this.stuff_name = this.query.stuff_name;
        this.saler_name = this.query.company_name;
        this.company_id = parseInt(this.query.company_id);
        this.buyer_name = this.company_name;
        let tmp_date = new Date();
        tmp_date.setDate(tmp_date.getDate() + 1);

        if (this.query.is_buy == 'true') {
            this.type_define = {
                vh_fetch_url: '/supplier/fetch_vehicle',
                dr_fetch_url: '/supplier/fetch_driver',
                order_create_url: '/supplier/order_sale_create',
                pair_get_url: '/supplier/get_vehicle_pair',
                is_sale: false,
            }
            this.saler_name = this.buyer_name;
            this.buyer_name = this.query.company_name;
        }
        let resp = await this.$send_req('/global/get_notice', {
            company_id: this.company_id
        });
        this.get_vehicles();
        this.get_vt_list();
        this.notice = resp.notice;
        if (this.notice) {
            this.notice_show = true;
        }
    }

}
</script>

<style lang="scss" scoped>
.dashboard {
    &-container {
        margin: 30px;
    }

    &-text {
        font-size: 30px;
        line-height: 46px;
    }
}

.add_vehicle_card {
    width: 400px
}
</style>

<template>
<view>
    <list-show ref="all_vt" :fetch_function="get_vehicle_team" height="88vh" search_key="name" v-model="all_vehicle_team">
        <view v-for="item in all_vehicle_team" :key="item.id">
            <u-cell :title="item.name" :value="'共' + (item.vehicle_sets?item.vehicle_sets.length:0) + '车'" isLink @click="show_vt_detail(item)"></u-cell>
        </view>
    </list-show>
    <fui-button type="success" @click="show_add_vt = true" text="新增"></fui-button>

    <fui-modal :zIndex="1002" width="600" title="新增车队" :show="show_add_vt" v-if="show_add_vt" @click="do_add_vt">
        <fui-form ref="new_vt" top="100">
            <fui-input required label="名称" borderTop placeholder="请输入车队名称" v-model="vt_name"></fui-input>
        </fui-form>
    </fui-modal>

    <fui-modal :zIndex="1002" width="600" title="新增车辆" :show="new_vehicle_show" v-if="new_vehicle_show" @click="do_add_vehicle">
        <fui-form ref="new_vehicle" top="100">
            <fui-input required label="主车号" borderTop placeholder="请输入车牌号" v-model="new_vehicle.main_vehicle"></fui-input>
            <fui-input label="挂车号" borderTop placeholder="请输入车牌号" v-model="new_vehicle.behind_vehicle"></fui-input>
            <fui-input required label="司机姓名" borderTop placeholder="请输入姓名" v-model="new_vehicle.driver_name"></fui-input>
            <fui-input required label="司机电话" borderTop placeholder="请输入电话" v-model="new_vehicle.driver_phone"></fui-input>
            <fui-input required label="司机身份证" borderTop placeholder="请输入身份证" v-model="new_vehicle.driver_id_card"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="vt_detail_show" @close="vt_detail_show = false" v-if="vt_detail_show">
        <fui-row>
            <fui-col :span="10">
                <fui-button type="success" text="新增车辆" @click="new_vehicle_show = true"></fui-button>
            </fui-col>
            <fui-col :span="10">
                <fui-button type="primary" text="导入车辆" @click="import_vt_files"></fui-button>
            </fui-col>
            <fui-col :span="4">
                <fui-text text="查看模板" decoration="underline" type="purple" @click="show_temple"></fui-text>
            </fui-col>
        </fui-row>
        <list-show ref="vs" :fetch_function="get_vs" :fetch_params="[focus_team]" height="65vh" search_key="cond" v-model="all_vs">
            <view v-for="item in all_vs" :key="item.id">
                <u-cell :title="item.mv" :value="item.bv" :label="item.dr.name + '|' +  item.dr.phone">
                    <view slot="right-icon">
                        <fui-button text="删除" type="danger" btnSize="mini" @click="prepare_del_vehicle(item.id)"></fui-button>
                    </view>
                </u-cell>
            </view>
        </list-show>
        <fui-button type="danger" text="删除车队" @click="show_del_vt_confirm = true"></fui-button>
    </fui-bottom-popup>
    <fui-modal :zIndex="1002" width="600" title="删除车队" descr="确定要删除吗?" :show="show_del_vt_confirm" v-if="show_del_vt_confirm" @click="del_vehicle_team">
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" title="删除车辆" descr="确定要删除吗?" :show="show_del_vehicle_confirm" v-if="show_del_vehicle_confirm" @click="do_del_vehicle">
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'VehicleTeam',
    components: {
        "list-show": ListShow
    },
    data() {
        return {
            all_vs: [],
            all_vehicle_team: [],
            focus_team: {
                id: 0
            },
            show_add_vt: false,
            vt_name: '',
            vt_detail_show: false,
            show_del_vt_confirm: false,
            new_vehicle_show: false,
            new_vehicle: {
                main_vehicle: '',
                behind_vehicle: '',
                driver_name: '',
                driver_phone: '',
                driver_id_card: ''
            },
            focus_vehicle_id: 0,
            show_del_vehicle_confirm: false,
        }
    },
    methods: {
        show_temple: async function () {
            uni.downloadFile({
                url: this.$convert_attach_url('/uploads/模板.xlsx'),
                success: (res) => {
                    const filePath = res.tempFilePath
                    console.log(filePath);
                    uni.openDocument({
                        filePath: filePath,
                        showMenu: true,
                    })
                },
                fail: (res) => {
                    console.log(res);
                }
            })
        },
        convert_excel2array: async function (file_content) {
            const Excel = require('exceljs');
            let wb = new Excel.Workbook();
            let workbook = await wb.xlsx.load(file_content)
            let ws = workbook.getWorksheet(1);
            let ret = [];
            ws.eachRow(function (row, rowNumber) {
                if (rowNumber != 1) {
                    ret.push({
                        main_vehicle: row.getCell(1).text,
                        behind_vehicle: row.getCell(2).text,
                        driver_name: row.getCell(3).text,
                        driver_phone: row.getCell(4).text,
                        driver_id_card: row.getCell(5).text
                    })
                }
            });
            return ret;
        },
        import_vt_files: async function () {
            let res = await wx.chooseMessageFile({
                count: 1,
                type: 'file',
                extension: ['xlsx'],
            });
            let file_path = res.tempFiles[0].path;
            let fsm = wx.getFileSystemManager();
            let file_buffer = fsm.readFileSync(file_path, 'binary');
            let ar = await this.convert_excel2array(file_buffer)
            for (let index = 0; index < ar.length; index++) {
                const element = ar[index];
                await this.$send_req('/global/add_vehicle2team', {
                    vt_id: this.focus_team.id,
                    main_vehicle: element.main_vehicle,
                    behind_vehicle: element.behind_vehicle,
                    driver_name: element.driver_name,
                    driver_phone: element.driver_phone,
                    driver_id_card: element.driver_id_card
                });
            }
            this.vt_detail_show = false;
            uni.startPullDownRefresh();
        },
        do_del_vehicle: async function (e) {
            if (e.index == 1) {
                this.$send_req('/global/del_vehicle_from_team', {
                    vt_id: this.focus_team.id,
                    set_id: this.focus_vehicle_id
                })
                this.vt_detail_show = false;
                uni.startPullDownRefresh();
            }
            this.show_del_vehicle_confirm = false;
        },
        prepare_del_vehicle: function (id) {
            this.show_del_vehicle_confirm = true;
            this.focus_vehicle_id = id;
        },
        do_add_vehicle: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'main_vehicle',
                    rule: ['required', 'isCarNo'],
                    msg: ['请输入车牌号', '请输入正确的车牌号']
                }, {
                    name: 'behind_vehicle',
                    rule: ['isCarNo'],
                    msg: ['请输入正确的车牌号']
                }, {
                    name: 'driver_name',
                    rule: ['required'],
                    msg: ['请输入司机姓名']
                }, {
                    name: 'driver_phone',
                    rule: ['required', 'isMobile'],
                    msg: ['请输入司机手机号', '请输入正确的手机号']
                }, {
                    name: 'driver_id_card',
                    rule: ['required', 'isIdCard'],
                    msg: ['请输入司机身份证号', '请输入正确的身份证号']
                }];
                let val_ret = await this.$refs.new_vehicle.validator(this.new_vehicle, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/global/add_vehicle2team', {
                    vt_id: this.focus_team.id,
                    main_vehicle: this.new_vehicle.main_vehicle,
                    behind_vehicle: this.new_vehicle.behind_vehicle,
                    driver_name: this.new_vehicle.driver_name,
                    driver_phone: this.new_vehicle.driver_phone,
                    driver_id_card: this.new_vehicle.driver_id_card
                });
                this.vt_detail_show = false;
                uni.startPullDownRefresh();
            }
            this.new_vehicle_show = false;
        },
        del_vehicle_team: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/global/del_vehicle_team', {
                    id: this.focus_team.id
                });
                uni.startPullDownRefresh();
                this.vt_detail_show = false;
            }
            this.show_del_vt_confirm = false;
        },
        show_vt_detail: function (_vt) {
            this.focus_team = _vt;
            this.vt_detail_show = true;
        },
        get_vs: async function (pageNo, [focus_team]) {
            let ret = [];
            if (pageNo == 0) {
                if (focus_team.id != 0) {
                    focus_team.vehicle_sets.forEach((vs) => {
                        ret.push({
                            id: vs.id,
                            cond: vs.main_vehicle.plate + ' ' + vs.driver.name + ' ' + vs.behind_vehicle.plate,
                            mv: vs.main_vehicle.plate,
                            bv: vs.behind_vehicle.plate,
                            dr: {
                                name: vs.driver.name,
                                phone: vs.driver.phone,
                                id_card: vs.driver.id_card
                            }
                        });
                    });
                }
            }

            return ret;
        },
        do_add_vt: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'vt_name',
                    rule: ['required'],
                    msg: ['请输入车队名称']
                }];
                let val_ret = await this.$refs.new_vt.validator({
                    vt_name: this.vt_name
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/global/add_vehicle_team', {
                    name: this.vt_name
                });
                uni.startPullDownRefresh();
            }
            this.show_add_vt = false;
        },
        get_vehicle_team: async function (pageNo) {
            let res = await this.$send_req('/global/get_vehicle_team', {
                pageNo: pageNo
            });
            return res.vehicle_teams;
        },
    },
    onPullDownRefresh() {
        this.$refs.all_vt.refresh();
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

<template>
<view class="vt-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">车辆管理</text>
            <text class="hero-title">车队配置</text>
            <text class="hero-sub">维护车队、车辆与司机信息</text>
        </view>
    </view>

    <view class="shell">
        <list-show ref="all_vt" :fetch_function="get_vehicle_team" height="62vh" search_key="name" v-model="all_vehicle_team">
            <view class="team-card" v-for="item in all_vehicle_team" :key="item.id" @click="show_vt_detail(item)">
                <view class="team-main">
                    <view class="team-icon">
                        <fui-icon name="transport" color="#2F3FCF" :size="40"></fui-icon>
                    </view>
                    <view class="team-copy">
                        <text class="team-name">{{ item.name }}</text>
                        <text class="team-sub">点击查看车辆明细</text>
                    </view>
                </view>
                <view class="team-meta">
                    <text class="team-count">共{{ item.vehicle_sets ? item.vehicle_sets.length : 0 }}车</text>
                    <fui-icon name="arrowright" color="#98A2B3" :size="32"></fui-icon>
                </view>
            </view>
        </list-show>
    </view>

    <view class="bottom-bar">
        <view class="primary-btn" @click="show_add_vt = true">
            <text class="primary-btn-text">新增车队</text>
        </view>
    </view>

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
        <view class="popup-panel">
            <view class="popup-head">
                <text class="popup-title">{{ focus_team.name }}</text>
                <text class="popup-sub">车辆与司机明细</text>
            </view>
            <view class="popup-actions">
                <view class="popup-btn primary" @click="new_vehicle_show = true">
                    <text class="popup-btn-text">新增车辆</text>
                </view>
                <view class="popup-btn ghost" @click="import_vt_files">
                    <text class="popup-btn-text ghost">导入车辆</text>
                </view>
                <view class="popup-link" @click="show_temple">
                    <text class="popup-link-text">查看模板</text>
                </view>
            </view>
            <list-show ref="vs" :fetch_function="get_vs" :fetch_params="[focus_team]" height="52vh" search_key="cond" v-model="all_vs">
                <view class="vs-card" v-for="item in all_vs" :key="item.id">
                    <view class="vs-main">
                        <view class="plate-row">
                            <text class="plate-main">{{ item.mv }}</text>
                            <text class="plate-behind" v-if="item.bv">{{ item.bv }}</text>
                        </view>
                        <text class="vs-driver">{{ item.dr.name }} · {{ item.dr.phone }}</text>
                    </view>
                    <view class="vs-del" @click="prepare_del_vehicle(item.id)">
                        <text class="vs-del-text">删除</text>
                    </view>
                </view>
            </list-show>
            <view class="popup-danger" @click="show_del_vt_confirm = true">
                <text class="popup-danger-text">删除车队</text>
            </view>
        </view>
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
                    main_vehicle: element.main_vehicle.trim(),
                    behind_vehicle: element.behind_vehicle.trim(),
                    driver_name: element.driver_name.trim(),
                    driver_phone: element.driver_phone.trim(),
                    driver_id_card: element.driver_id_card.trim()
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
                    main_vehicle: this.new_vehicle.main_vehicle.trim(),
                    behind_vehicle: this.new_vehicle.behind_vehicle.trim(),
                    driver_name: this.new_vehicle.driver_name.trim(),
                    driver_phone: this.new_vehicle.driver_phone.trim(),
                    driver_id_card: this.new_vehicle.driver_id_card.trim()
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

<style scoped>
.vt-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #eef1ff 0%, #f7f8fc 42%, #f3f5f9 100%);
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.hero {
    position: relative;
    overflow: hidden;
    padding: 36rpx 32rpx 48rpx;
    background: linear-gradient(135deg, #2F3FCF 0%, #465CFF 55%, #6B7CFF 100%);
}

.hero-logo-bg {
    position: absolute;
    right: -20rpx;
    top: -10rpx;
    width: 220rpx;
    height: 220rpx;
    opacity: 0.18;
}

.hero-logo-img {
    width: 100%;
    height: 100%;
}

.hero-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
}

.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.78);
    letter-spacing: 4rpx;
}

.hero-title {
    margin-top: 10rpx;
    font-size: 44rpx;
    font-weight: 700;
    color: #fff;
}

.hero-sub {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.86);
}

.shell {
    margin: -24rpx 24rpx 0;
    position: relative;
    z-index: 2;
}

.team-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-radius: 16rpx;
    padding: 28rpx 24rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.05);
}

.team-main {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.team-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 16rpx;
    background: #eef1ff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    flex-shrink: 0;
}

.team-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.team-name {
    font-size: 30rpx;
    font-weight: 600;
    color: #1d2129;
}

.team-sub {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #98a2b3;
}

.team-meta {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: 16rpx;
}

.team-count {
    font-size: 22rpx;
    color: #2F3FCF;
    background: #eef1ff;
    padding: 6rpx 14rpx;
    border-radius: 8rpx;
    margin-right: 8rpx;
}

.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    border-top: 1rpx solid #EEF1F8;
    box-shadow: 0 -8rpx 24rpx rgba(26, 31, 54, 0.06);
}

.primary-btn {
    height: 84rpx;
    border-radius: 14rpx;
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
    display: flex;
    align-items: center;
    justify-content: center;
}

.primary-btn-text {
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
}

.popup-panel {
    padding: 8rpx 24rpx 24rpx;
}

.popup-head {
    padding: 20rpx 8rpx 12rpx;
}

.popup-title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #1d2129;
}

.popup-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #98a2b3;
}

.popup-actions {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;
}

.popup-btn {
    height: 64rpx;
    padding: 0 28rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
}

.popup-btn.primary {
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
}

.popup-btn.ghost {
    background: #eef1ff;
}

.popup-btn-text {
    font-size: 26rpx;
    font-weight: 500;
    color: #fff;
}

.popup-btn-text.ghost {
    color: #2F3FCF;
}

.popup-link {
    margin-left: auto;
    padding: 8rpx;
}

.popup-link-text {
    font-size: 24rpx;
    color: #2F3FCF;
    text-decoration: underline;
}

.vs-card {
    display: flex;
    align-items: center;
    background: #fff;
    border: 1rpx solid #eef1f8;
    border-radius: 14rpx;
    padding: 22rpx 20rpx;
    margin-bottom: 16rpx;
}

.vs-main {
    flex: 1;
    min-width: 0;
}

.plate-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}

.plate-main,
.plate-behind {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 180rpx;
    height: 52rpx;
    padding: 0 14rpx;
    margin-right: 12rpx;
    margin-bottom: 4rpx;
    box-sizing: border-box;
    border-radius: 6rpx;
    border: 3rpx solid #1a1a1a;
    background: linear-gradient(180deg, #ffe566 0%, #f5c400 48%, #efb700 100%);
    box-shadow:
        inset 0 0 0 2rpx #fff3a8,
        0 2rpx 4rpx rgba(0, 0, 0, 0.12);
    font-size: 26rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
    color: #111;
    line-height: 1;
}

.plate-behind {
    min-width: 160rpx;
    height: 46rpx;
    font-size: 22rpx;
    opacity: 0.95;
}

.vs-driver {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #667085;
}

.vs-del {
    flex-shrink: 0;
    margin-left: 16rpx;
    height: 56rpx;
    padding: 0 22rpx;
    border-radius: 10rpx;
    background: #fdecee;
    display: flex;
    align-items: center;
    justify-content: center;
}

.vs-del-text {
    font-size: 24rpx;
    color: #E34D59;
    font-weight: 500;
}

.popup-danger {
    margin-top: 8rpx;
    height: 80rpx;
    border-radius: 14rpx;
    background: #fdecee;
    display: flex;
    align-items: center;
    justify-content: center;
}

.popup-danger-text {
    font-size: 28rpx;
    color: #E34D59;
    font-weight: 600;
}
</style>

<template>
<view class="create-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">创建订单</text>
            <text class="hero-title">{{ stuff_name }}</text>
            <text class="hero-tag" v-if="bidding_id != 0">竞价成功发起</text>
        </view>
    </view>

    <view class="body">
        <view class="party-card">
            <view class="party-row">
                <text class="party-label">买方</text>
                <text class="party-value">{{ buyer_name }}</text>
            </view>
            <view class="party-row party-row-border linkable" @click="show_select_company = true">
                <text class="party-label">卖方</text>
                <view class="party-right">
                    <text class="party-value">{{ saler_name ? saler_name : '(未指定)' }}</text>
                    <fui-icon v-if="!saler_name || saler_name == '(未指定)'" name="arrowright" size="28"
                        color="#C5CAD5"></fui-icon>
                </view>
            </view>
        </view>

        <view class="form-shell">
            <view class="section-head">
                <view class="section-bar"></view>
                <view class="section-titles">
                    <text class="section-title">计划信息</text>
                    <text class="section-en">PLAN</text>
                </view>
            </view>

            <fui-form ref="plan_form" :model="plan">
                <view class="form-block">
                    <fui-form-item class="req-item" label="计划日期" :padding="[0,'18px',0,'88rpx']"
                        asterisk asteriskColor="#FF8A2B" prop="plan_time" @click="show_plan_time = true">
                        <fui-input placeholder="请输入计划日期" disabled v-model="plan.plan_time"></fui-input>
                    </fui-form-item>
                    <view v-if="type_define.is_sale">
                        <fui-form-item class="req-item" label="用途" :padding="[0,'18px',0,'88rpx']"
                            asterisk asteriskColor="#FF8A2B" prop="use_for" @click="show_use_for = true">
                            <fui-input placeholder="请输入用途" disabled v-model="plan.use_for"></fui-input>
                        </fui-form-item>
                        <pick-regions @getRegion="pick_address">
                            <fui-form-item class="req-item" label="卸车地点" :padding="[0,'18px',0,'88rpx']"
                                asterisk asteriskColor="#FF8A2B" prop="drop_address">
                                <fui-input placeholder="请输入卸车地点" disabled v-model="plan.drop_address"></fui-input>
                            </fui-form-item>
                        </pick-regions>
                        <fui-form-item v-if="support_location_detail" label="详细地址"
                            :padding="[0,'18px',0,'88rpx']" prop="location_detail">
                            <fui-input placeholder="请输入详细地址" v-model="plan.location_detail"></fui-input>
                        </fui-form-item>
                    </view>
                    <view v-else>
                        <fui-form-item label="单价" :padding="[0,'18px',0,'88rpx']" prop="price">
                            <fui-input placeholder="请输入单价" v-model="plan.price"></fui-input>
                        </fui-form-item>
                        <fui-form-item label="连续派车" :padding="[0,'18px',0,'88rpx']" prop="is_repeat">
                            <u-switch v-model="plan.is_repeat"></u-switch>
                        </fui-form-item>
                    </view>
                    <fui-form-item label="承运公司" :padding="[0,'18px',0,'88rpx']" prop="trans_company_name">
                        <fui-input placeholder="请输入承运公司" v-model="plan.trans_company_name"></fui-input>
                    </fui-form-item>
                </view>

                <view class="vehicle-section">
                    <view class="section-head compact">
                        <view class="section-bar"></view>
                        <view class="section-titles">
                            <text class="section-title">车辆信息</text>
                            <text class="section-en">VEHICLES</text>
                        </view>
                        <text class="vehicle-count" v-if="vehicles.length">已选 {{ vehicles.length }} 车</text>
                    </view>

                    <view class="action-row">
                        <view class="action-chip success" @click="show_add_vehicle = true">
                            <text class="action-chip-text">新增车辆</text>
                        </view>
                        <view class="action-chip warn" @click="show_add_vt = true">
                            <text class="action-chip-text">选择车队</text>
                        </view>
                        <view class="action-chip primary" v-if="!type_define.is_sale" @click="prepare_proxy_buy">
                            <text class="action-chip-text">我要代提</text>
                        </view>
                        <view class="action-chip purple" @click="show_import = true">
                            <text class="action-chip-text">导入</text>
                        </view>
                    </view>

                    <scroll-view class="vehicle-list" scroll-x enable-flex :show-scrollbar="false"
                        v-if="vehicles.length">
                        <view class="vehicle-container" :class="{ 'single-vehicle': vehicles.length === 1 }">
                            <view v-for="(single_v, index) in vehicles" :key="index" class="vehicle-card"
                                :class="{ 'full-width': vehicles.length === 1 }">
                                <view class="vc-head">
                                    <view class="vc-head-left">
                                        <text class="vc-index">第{{ vehicles.length - index }}车</text>
                                        <text class="vc-total">共{{ vehicles.length }}车</text>
                                    </view>
                                    <view class="vc-del" @click.stop="remove_vehicle(index)">
                                        <text class="vc-del-text">删除</text>
                                    </view>
                                </view>
                                <view class="vc-plate-row">
                                    <text class="vc-plate">{{ single_v.main_vehicle.plate }}</text>
                                    <text class="vc-plate sub" v-if="single_v.behind_vehicle.plate">
                                        {{ single_v.behind_vehicle.plate }}
                                    </text>
                                </view>
                                <view class="vc-meta">
                                    <view class="vc-meta-item">
                                        <text class="vc-meta-label">司机</text>
                                        <text class="vc-meta-value">{{ single_v.driver.name }}</text>
                                    </view>
                                    <view class="vc-meta-item">
                                        <text class="vc-meta-label">电话</text>
                                        <text class="vc-meta-value">{{ single_v.driver.phone }}</text>
                                    </view>
                                </view>
                                <view class="vc-comment" v-if="single_v.comment">
                                    <text class="vc-comment-text">{{ single_v.comment }}</text>
                                </view>
                            </view>
                        </view>
                    </scroll-view>
                    <view class="vehicle-empty" v-else>
                        <text class="vehicle-empty-text">请添加车辆后再提交</text>
                    </view>
                </view>

                <view class="submit-wrap">
                    <fui-button text="提交" bold background="#465CFF" color="#FFFFFF" radius="44rpx" height="88rpx"
                        @click="submit"></fui-button>
                </view>
            </fui-form>
        </view>
    </view>

    <fui-date-picker :show="show_plan_time" type="3" :value="default_time" @change="fill_plan_time"
        @cancel="show_plan_time = false"></fui-date-picker>
    <fui-bottom-popup :show="show_use_for" @close="show_use_for = false">
        <fui-list>
            <fui-list-cell v-for="(single_uf, index) in use_for_array" :key="index" arrow
                @click="choose_use_for(single_uf)">
                {{ single_uf }}
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_add_vehicle" @close="show_add_vehicle = false">
        <view class="popup-title">新增车辆</view>
        <view class="vehicle-popup-form">
        <fui-form ref="new_vehicle_form" :show="false" :model="new_vehicle">
            <fui-form-item class="req-item" asterisk asteriskColor="#FF8A2B" label="主车牌"
                :padding="['24rpx','32rpx','24rpx','88rpx']" :rules="rules[0]" prop="main_vehicle_plate">
                <fui-input :padding="[0]" v-model="new_vehicle.main_vehicle_plate">
                    <fui-button btnSize="mini" type="purple" text="选择" @click="show_pick_vehicles = true"></fui-button>
                </fui-input>
            </fui-form-item>
            <fui-form-item label="挂车牌" :padding="['24rpx','32rpx','24rpx','88rpx']"
                :rules="rules[1]" prop="behind_vehicle_plate">
                <fui-input :padding="[0]" v-model="new_vehicle.behind_vehicle_plate">
                    <fui-button btnSize="mini" type="purple" text="选择"
                        @click="show_behind_vehicle_plate = true"></fui-button>
                </fui-input>
            </fui-form-item>
            <fui-form-item class="req-item" asterisk asteriskColor="#FF8A2B" label="司机姓名"
                :padding="['24rpx','32rpx','24rpx','88rpx']" :rules="rules[2]" prop="driver_name">
                <fui-input :padding="[0]" v-model="new_vehicle.driver_name">
                    <fui-button btnSize="mini" type="purple" text="选择" @click="show_driver_info = true"></fui-button>
                </fui-input>
            </fui-form-item>
            <fui-form-item class="req-item" asterisk asteriskColor="#FF8A2B" label="司机电话"
                :padding="['24rpx','32rpx','24rpx','88rpx']" :rules="rules[3]" prop="driver_phone">
                <fui-input :padding="[0]" v-model="new_vehicle.driver_phone"></fui-input>
            </fui-form-item>
            <fui-input label="备注" v-model="new_vehicle.comment"></fui-input>
            <view class="popup-submit">
                <fui-button type="success" text="添加" background="#465CFF" radius="40rpx"
                    @click="add_vehicle"></fui-button>
            </view>
        </fui-form>
        </view>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_add_vt" @close="show_add_vt = false">
        <view class="popup-title">选择车队</view>
        <list-show :fetch_function="get_vt_list" height="70vh" search_key="name" v-model="all_vt_list">
            <view v-for="item in all_vt_list" :key="item.id">
                <u-cell :title="item.name" :value="'共' + (item.vehicle_sets ? item.vehicle_sets.length : 0) + '车'"
                    isLink @click="choose_vt(item)"></u-cell>
            </view>
        </list-show>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_select_company" @close="show_select_company = false">
        <view class="popup-title">选择卖方</view>
        <fui-list>
            <list-show v-model="copmany4select" :fetch_function="get_company4select" search_key="cond" height="40vh"
                :fetch_params="[company_id]">
                <fui-list-cell v-for="item in copmany4select" :key="item.id" arrow
                    @click="saler_name = item.name; show_select_company = false;">
                    {{ item.name }}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_pick_vehicles" @close="show_pick_vehicles = false">
        <fui-list>
            <list-show v-model="data2show" :fetch_function="get_vehicles" search_key="search_cond" height="40vh"
                :fetch_params="[type_define.pair_get_url]">
                <fui-list-cell v-for="(item, index) in data2show" :key="index" arrow @click="choose_vehicles(item)">
                    {{ item.main_vehicle_plate }}-{{ item.behind_vehicle_plate }}-{{ item.driver_name }}-{{ item.driver_phone }}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_behind_vehicle_plate" @close="show_behind_vehicle_plate = false">
        <fui-list>
            <list-show v-model="data2show" :fetch_function="get_vehicles" search_key="search_cond" height="40vh"
                :fetch_params="[type_define.pair_get_url]">
                <fui-list-cell v-for="(item, index) in data2show" :key="index" arrow
                    @click="choose_behind_vehicle(item)">
                    挂车牌: {{ item.behind_vehicle_plate }}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_driver_info" @close="show_driver_info = false">
        <fui-list>
            <list-show v-model="data2show" :fetch_function="get_vehicles" search_key="search_cond" height="40vh"
                :fetch_params="[type_define.pair_get_url]">
                <fui-list-cell v-for="(item, index) in data2show" :key="index" arrow
                    @click="choose_driver_info(item)">
                    司机姓名: {{ item.driver_name }}- 司机电话: {{ item.driver_phone }}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-modal :show="notice_show" v-if="notice_show" title="通知" :descr="notice" @click="notice_show = false"
        :buttons="[{ text: '了解' }]"></fui-modal>
    <fui-actionsheet v-if="show_import" :show="show_import" :tips="tips" :itemList="import_sheet"
        @cancel="show_import = false" @click="driver_import"></fui-actionsheet>
    <fui-message ref="msg"></fui-message>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import pickRegions from '@/components/pick-regions/pick-regions.vue'
export default {
    name: 'OrderCreate',
    data: function () {
        return {
            bidding_id: 0,
            show_import: false,
            import_sheet: [{
                text: '选择文件',
                color: '#0000FF'
            }, {
                text: '下载模板',
            }],
            all_vt_list: [],
            show_add_vt: false,
            support_location_detail: false,
            notice_show: false,
            show_behind_vehicle_plate: false,
            show_driver_info: false,
            notice: '',
            show_select_company: false,
            is_proxy: false,
            type_define: {
                vh_fetch_url: '/customer/fetch_vehicle',
                dr_fetch_url: '/customer/fetch_driver',
                order_create_url: '/customer/order_buy_create',
                pair_get_url: '/customer/get_vehicle_pair',
                is_sale: true,
            },
            data2show: [],
            show_pick_vehicles: false,
            new_vehicle: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_name: '',
                driver_phone: '',
                comment: '',
            },
            rules: [{
                    name: "main_vehicle_plate",
                    rule: ["required", "isCarNo"],
                    msg: ["请输入主车牌", "请输入正确的主车牌"]
                },
                {
                    name: "behind_vehicle_plate",
                    rule: ["isCarNo"],
                    msg: ["请输入正确的挂车牌"]
                },
                {
                    name: "driver_name",
                    rule: ["required", "isChinese"],
                    msg: ["请输入司机姓名", "请输入正确的司机姓名"]
                }, {
                    name: "driver_phone",
                    rule: ["required", "isMobile"],
                    msg: ["请输入司机电话", "请输入正确的手机号"]
                },
            ],
            show_add_vehicle: false,
            address: [],
            show_plan_time: false,
            show_use_for: false,
            use_for_array: [
                '气化', '气站', '其他'
            ],
            plan: {
                comment: "",
                drop_address: "",
                location_detail: "",
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
            default_time: '',
            vehicles: [],
            copmany4select: [],
        }
    },
    components: {
        "list-show": ListShow,
        "pick-regions": pickRegions,
    },
    watch: {
        'new_vehicle.main_vehicle_plate': {
            handler(newValue, oldValue) {
                // 转换为大写
                const upperCaseValue = newValue.toUpperCase();
                this.$nextTick(() => {
                    this.new_vehicle.main_vehicle_plate = upperCaseValue;
                });
            },
            immediate: true,
        },
        'new_vehicle.behind_vehicle_plate': {
            handler(newValue, oldValue) {
                // 转换为大写
                const upperCaseValue = newValue.toUpperCase();
                this.$nextTick(() => {
                    this.new_vehicle.behind_vehicle_plate = upperCaseValue;
                });
            },
            immediate: true,
        }
    },
    methods: {
        choose_vt: async function (vt) {
            let vs = vt.vehicle_sets;
            vs.forEach(ele => {
                this.vehicles.unshift({
                    main_vehicle: ele.main_vehicle,
                    behind_vehicle: ele.behind_vehicle,
                    driver: ele.driver,
                    comment: '',
                });
            });
            this.show_add_vt = false;
        },
        get_vt_list: async function (pageNo) {
            let res = await this.$send_req('/global/get_vehicle_team', {
                pageNo: pageNo
            });
            return res.vehicle_teams;
        },
        get_support_location_detail: async function () {
            let ret = await this.$send_req('/global/get_support_location_detail', {
                company_id: this.company_id,
            });
            this.support_location_detail = ret.support_location_detail;
        },
        prepare_proxy_buy: function () {
            this.is_proxy = true;
            this.plan.trans_company_name = this.saler_name;
            this.saler_name = '';
        },
        remove_vehicle: function (_index) {
            this.vehicles.splice(_index, 1);
        },
        add_vehicle: async function () {
            this.$refs.new_vehicle_form.validator(null, null, true).then(async res => {
                if (res.isPassed) {
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
                    this.new_vehicle = {
                        main_vehicle_plate: '',
                        behind_vehicle_plate: '',
                        driver_name: '',
                        driver_phone: '',
                        comment: '',
                    };
                    this.show_add_vehicle = false;
                }
            }).catch(err => {
                console.log(err)
            })

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
                        main_vehicle: row.getCell(1).text.toUpperCase().replaceAll(regStrReplace, ''),
                        behind_vehicle: row.getCell(2).text.toUpperCase().replaceAll(regStrReplace, ''),
                        driver_name: row.getCell(3).text.toUpperCase().replaceAll(regStrReplace, ''),
                        driver_phone: row.getCell(4).text.toUpperCase().replaceAll(regStrReplace, ''),
                        comment: row.getCell(6).text.replaceAll(regStrReplace, ''),
                        trans_company_name: row.getCell(7).text.replaceAll(regStrReplace, ''),
                    })
                }
            });
            return ret;
        },
        driver_import: function (event) {
            if (event.index == 0) {
                this.import_vehicle();
            }
            if (event.index == 1) {
                this.download_temple();
            }
        },
        download_temple: async function () {
            uni.downloadFile({
                url: this.$convert_attach_url('/uploads/模板2.xlsx'),
                success: (res) => {
                    const filePath = res.tempFilePath
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
        import_vehicle: async function () {
            try {
                // 选择文件
                let res = await wx.chooseMessageFile({
                    count: 1,
                    type: 'file',
                    extension: ['xlsx'],
                });

                // 读取文件
                let file_path = res.tempFiles[0].path;
                let fsm = wx.getFileSystemManager();
                let file_buffer = fsm.readFileSync(file_path, 'binary');

                // 转换Excel到数组
                let ar = await this.convert_excel2array(file_buffer);

                let importInfo = {
                    successCount: 0,
                    errorCount: 0,
                    totalCount: ar.length
                };

                // 主车牌、挂车牌、司机姓名、电话均需合法，避免仅一侧车牌合法时放行不合规数据
                const isValidData = (element) => {
                    return this.$regExp('plate', element.main_vehicle) &&
                        this.$regExp('plate', element.behind_vehicle) &&
                        this.$regExp('name', element.driver_name) &&
                        this.$regExp('phone', element.driver_phone);
                };

                // 处理数据
                const processedData = await Promise.all(ar.map(async (element) => {
                    if (isValidData(element)) {
                        try {
                            const [mv, bv, dr] = await Promise.all([
                                this.$send_req(this.type_define.vh_fetch_url, {
                                    plate: element.main_vehicle
                                }),
                                this.$send_req(this.type_define.vh_fetch_url, {
                                    plate: element.behind_vehicle
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
                                    plate: element.main_vehicle
                                },
                                behind_vehicle: {
                                    id: bv.id,
                                    plate: element.behind_vehicle
                                },
                                driver: {
                                    id: dr.id,
                                    name: element.driver_name,
                                    phone: element.driver_phone
                                },
                                comment: element.comment || '文件导入',
                                trans_company_name:element.trans_company_name || '',

                            };
                        } catch (error) {
                            console.error('error:', error);
                            importInfo.errorCount++;
                            return null;
                        }
                    } else {
                        importInfo.errorCount++;
                        return null;
                    }
                }));

                // 添加有效数据到 vehicles 数组
                this.vehicles.unshift(...processedData.filter(item => item !== null));

                this.show_import = false;
                this.$refs.msg.show({
                    text: `成功导入${importInfo.successCount}条,失败${importInfo.errorCount}条`,
                    duration: 3000
                });
            } catch (error) {
                console.error('Import failed:', error);
                this.$refs.msg.show({
                    text: '导入失败，请重试',
                    duration: 3000
                });
            }
        },
        get_vehicles: async function (pageNo, [pair_get_url]) {

            let res = await this.$send_req(pair_get_url, {
                pageNo: pageNo,
            });
            let vt = await this.$send_req('/global/get_vehicle_team', {
                pageNo: pageNo
            });
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
                ele.search_cond = ele.main_vehicle_plate + ele.behind_vehicle_plate + ele.driver_name +
                    ele.driver_phone;
            });
            return res.pairs;
        },
        choose_vehicles: function (item) {
            this.new_vehicle.main_vehicle_plate = item.main_vehicle_plate;
            this.new_vehicle.behind_vehicle_plate = item.behind_vehicle_plate;
            this.new_vehicle.driver_name = item.driver_name;
            this.new_vehicle.driver_phone = item.driver_phone;
            this.show_pick_vehicles = false;
        },
        choose_behind_vehicle: function (item) {
            this.new_vehicle.behind_vehicle_plate = item.behind_vehicle_plate;
            this.show_behind_vehicle_plate = false;
        },
        choose_driver_info: function (item) {
            this.new_vehicle.driver_name = item.driver_name;
            this.new_vehicle.driver_phone = item.driver_phone;
            this.show_driver_info = false;
        },
        pick_address: function (e) {
            this.plan.drop_address = e.map(item => item.name).join('-')
        },
        choose_use_for: function (_name) {
            this.plan.use_for = _name;
            this.show_use_for = false;
        },
        fill_plan_time: function (e) {
            this.plan.plan_time = e.result;
            this.show_plan_time = false;
        },
        get_company4select: async function (pageNo, [company_id]) {
            if (company_id == 0) {
                return [];
            }
            let res = await this.$send_req('/supplier/get_company4proxy', {
                pageNo: pageNo,
                company_id: company_id,
            });
            res.companies.forEach(ele => {
                ele.cond = ele.name;
            });
            return res.companies;
        },
        submit: async function () {
            let rules = [{
                name: 'plan_time',
                rule: ['required'],
                msg: ['请选择填写计划日期']
            }];
            if (this.type_define.is_sale) {
                rules.push({
                    name: 'drop_address',
                    rule: ['required'],
                    msg: ['请选择填写卸车地点']
                })
                rules.push({
                    name: 'use_for',
                    rule: ['required'],
                    msg: ['请选择填写用途']
                });
            } else {
                rules.push({
                    name: 'price',
                    rule: ['isAmount'],
                    msg: ['请填写正确的单价']
                });
            }
            let val_ret = await this.$refs.plan_form.validator(this.plan, rules);
            if (!val_ret.isPassed) {
                return;
            }
            if (this.vehicles.length == 0) {
                uni.showToast({
                    title: '请添加车辆',
                    icon: 'none',
                });
                return;
            }
            if (this.plan.price) {
                this.plan.price = parseFloat(this.plan.price);
            }
            for (let index = 0; index < this.vehicles.length; index++) {
                let ele = this.vehicles[index];
                let req = {
                    ...this.plan,
                    drop_address: this.plan.drop_address + (this.plan.location_detail ? '-' + this.plan.location_detail : ''),
                    main_vehicle_id: ele.main_vehicle.id,
                    behind_vehicle_id: ele.behind_vehicle.id,
                    driver_id: ele.driver.id,
                    is_proxy: this.is_proxy,
                    bidding_id: this.bidding_id,
                    comment: ele.comment,
                };
                if (ele.trans_company_name) {
                    req.trans_company_name = ele.trans_company_name;
                }
                if (req.is_proxy) {
                    req.proxy_company_name = this.saler_name;
                }
                await this.$send_req(this.type_define.order_create_url, req);
            }
            uni.switchTab({
                url: '/pages/OrderList',
            });
        },
    },
    onLoad: async function (options) {
        this.plan.stuff_id = parseInt(options.stuff_id);
        if (options.bidding_id) {
            this.bidding_id = parseInt(options.bidding_id);
        }
        this.stuff_name = options.stuff_name;
        this.saler_name = options.company_name;
        this.company_id = parseInt(options.company_id);
        this.buyer_name = uni.getStorageSync('self_info').company;
        let tmp_date = new Date();
        tmp_date.setDate(tmp_date.getDate() + 1);
        this.default_time = utils.dateFormatter(tmp_date, 'y-m-d', 4, false);
        if (options.is_buy == 'true') {
            this.type_define = {
                vh_fetch_url: '/supplier/fetch_vehicle',
                dr_fetch_url: '/supplier/fetch_driver',
                order_create_url: '/supplier/order_sale_create',
                pair_get_url: '/supplier/get_vehicle_pair',
                is_sale: false,
            }
            this.saler_name = this.buyer_name;
            this.buyer_name = options.company_name;
        }
        let resp = await this.$send_req('/global/get_notice', {
            company_id: this.company_id
        });
        this.notice = resp.notice;
        if (this.notice) {
            this.notice_show = true;
        }
        this.get_support_location_detail();
    },
}
</script>

<style scoped>
.create-page {
    min-height: 100vh;
    background: #F2F4FA;
    box-sizing: border-box;
    padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.hero {
    position: relative;
    padding: 28rpx 32rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}

.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 260rpx;
    height: 260rpx;
    opacity: 0.16;
    pointer-events: none;
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
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}

.hero-title {
    margin-top: 10rpx;
    font-size: 44rpx;
    color: #FFFFFF;
    font-weight: 700;
    line-height: 1.25;
}

.hero-tag {
    margin-top: 14rpx;
    align-self: flex-start;
    padding: 6rpx 16rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.18);
    color: #FFFFFF;
    font-size: 20rpx;
}

.body {
    margin-top: -24rpx;
    padding: 0 24rpx;
    position: relative;
    z-index: 2;
}

.party-card,
.form-shell {
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    overflow: hidden;
}

.party-card {
    margin-bottom: 20rpx;
    padding: 8rpx 0;
}

.party-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 28rpx;
    gap: 20rpx;
}

.party-row-border {
    border-top: 1rpx solid #EEF1F8;
}

.party-row.linkable:active {
    background: #F7F8FE;
}

.party-label {
    flex-shrink: 0;
    font-size: 26rpx;
    color: #8A94A6;
}

.party-right {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8rpx;
    min-width: 0;
    flex: 1;
    justify-content: flex-end;
}

.party-value {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 600;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.section-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 24rpx 28rpx 8rpx;
    background: linear-gradient(90deg, #F3F5FF 0%, #FFFFFF 70%);
}

.section-head.compact {
    padding-top: 20rpx;
}

.section-bar {
    width: 8rpx;
    height: 34rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 14rpx;
    flex-shrink: 0;
}

.section-titles {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.section-title {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.2;
}

.section-en {
    margin-top: 2rpx;
    font-size: 16rpx;
    color: #9AA3B8;
    letter-spacing: 2rpx;
}

.form-block {
    padding-bottom: 8rpx;
}

/* 必填标记：放在标签左侧独立区域，避免和文字叠字 */
.create-page ::v-deep .fui-form__asterisk {
    left: 12rpx !important;
    top: 50% !important;
    transform: translateY(-50%);
    height: auto !important;
    line-height: 1 !important;
    font-size: 0 !important;
    color: transparent !important;
    width: auto;
    z-index: 2;
}

.create-page ::v-deep .fui-form__asterisk::after {
    content: '必填';
    display: inline-block;
    font-size: 18rpx;
    line-height: 1;
    color: #FF8A2B;
    background: rgba(255, 138, 43, 0.12);
    border-radius: 6rpx;
    padding: 4rpx 8rpx;
    font-weight: 600;
}

.vehicle-section {
    border-top: 1rpx solid #EEF1F8;
    padding-bottom: 8rpx;
}

.vehicle-count {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 600;
}

.action-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12rpx;
    padding: 16rpx 24rpx 8rpx;
}

.action-chip {
    padding: 14rpx 22rpx;
    border-radius: 999rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-chip-text {
    font-size: 24rpx;
    font-weight: 700;
    color: #FFFFFF;
}

.action-chip.success {
    background: linear-gradient(145deg, #6FDB9A 0%, #2DBE6C 100%);
}

.action-chip.warn {
    background: linear-gradient(145deg, #FFB06B 0%, #FF8A2B 100%);
}

.action-chip.primary {
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 100%);
}

.action-chip.purple {
    background: linear-gradient(145deg, #A78BFA 0%, #7C5CFC 100%);
}

.vehicle-list {
    width: 100%;
    height: 320rpx;
    white-space: nowrap;
    padding: 12rpx 0 8rpx;
    box-sizing: border-box;
}

.vehicle-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    padding: 0 24rpx;
    box-sizing: border-box;
}

.vehicle-card {
    background: linear-gradient(145deg, #FFFFFF 0%, #F7F8FE 100%);
    border-radius: 20rpx;
    border: 1rpx solid #E8ECF6;
    box-shadow: 0 8rpx 20rpx rgba(40, 58, 120, 0.06);
    margin-right: 16rpx;
    width: 560rpx;
    flex-shrink: 0;
    overflow: hidden;
    padding: 22rpx 24rpx 20rpx;
    box-sizing: border-box;
}

.single-vehicle {
    display: flex;
    padding: 0 24rpx;
}

.full-width {
    width: 100%;
    margin-right: 0;
}

.vc-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
}

.vc-head-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12rpx;
}

.vc-index {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 700;
}

.vc-total {
    font-size: 20rpx;
    color: #8A94A6;
}

.vc-del {
    padding: 8rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(255, 77, 79, 0.1);
    border: 1rpx solid rgba(255, 77, 79, 0.28);
}

.vc-del-text {
    font-size: 22rpx;
    color: #FF4D4F;
    font-weight: 600;
}

.vc-plate-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 16rpx;
}

.vc-plate {
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    background: #F5D000;
    color: #1A1A1A;
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 1rpx;
    border: 2rpx solid #1A1A1A;
}

.vc-plate.sub {
    background: #F5D000;
    color: #1A1A1A;
    font-weight: 700;
}

.vc-meta {
    display: flex;
    flex-direction: row;
    gap: 24rpx;
}

.vc-meta-item {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.vc-meta-label {
    font-size: 20rpx;
    color: #9AA3B8;
    margin-bottom: 4rpx;
}

.vc-meta-value {
    font-size: 26rpx;
    color: #2D3748;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.vc-comment {
    margin-top: 14rpx;
    padding-top: 12rpx;
    border-top: 1rpx solid #EEF1F8;
}

.vc-comment-text {
    font-size: 22rpx;
    color: #8A94A6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.vehicle-empty {
    margin: 12rpx 24rpx 20rpx;
    padding: 36rpx 24rpx;
    border-radius: 16rpx;
    background: #F7F8FE;
    border: 1rpx dashed #D7DCF0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.vehicle-empty-text {
    font-size: 24rpx;
    color: #9AA3B8;
}

.submit-wrap {
    padding: 16rpx 24rpx 28rpx;
}

.popup-title {
    padding: 28rpx 28rpx 12rpx;
    font-size: 30rpx;
    font-weight: 700;
    color: #1A1F36;
    text-align: center;
}

.popup-submit {
    padding: 16rpx 24rpx 32rpx;
}
</style>

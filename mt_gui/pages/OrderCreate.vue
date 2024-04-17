<template>
<view>
    <fui-white-space size="large"></fui-white-space>
    <fui-section :title="stuff_name" size="50" isLine></fui-section>
    <u-cell title="买方" :value="buyer_name"></u-cell>
    <u-cell title="卖方" :value="saler_name"></u-cell>
    <fui-divider></fui-divider>
    <fui-form ref="plan_form" :model="plan">
        <fui-form-item label="计划日期" :padding="[0,'18px']" asterisk prop="plan_time" @click="show_plan_time = true">
            <fui-input placeholder="请输入计划日期" disabled v-model="plan.plan_time"></fui-input>
        </fui-form-item>
        <fui-form-item label="用途" :padding="[0,'18px']" asterisk prop="use_for" @click="show_use_for = true">
            <fui-input placeholder="请输入用途" disabled v-model="plan.use_for"></fui-input>
        </fui-form-item>
        <pick-regions @getRegion="pick_address">
            <fui-form-item label="卸车地点" :padding="[0,'18px']" asterisk prop="drop_address">
                <fui-input placeholder="请输入卸车地点" disabled v-model="plan.drop_address"></fui-input>
            </fui-form-item>
        </pick-regions>
        <view style="display:flex; justify-content: center;">
            <fui-button text="新增车辆" btnSize="small" type="success" @click="show_add_vehicle = true"></fui-button>
        </view>
        <view style="border:solid;" v-for="(single_v, index) in vehicles" :key="index">
            <fui-preview :previewData="make_vc_show(single_v)" @click="remove_vehicle(index)"></fui-preview>
        </view>
        <fui-divider></fui-divider>
        <fui-button text="提交" bold @click="submit"></fui-button>
    </fui-form>
    <fui-date-picker :show="show_plan_time" type="3" :value="default_time" @change="fill_plan_time" @cancel="show_plan_time = false"></fui-date-picker>
    <fui-bottom-popup :show="show_use_for" @close="show_use_for = false">
        <fui-list>
            <fui-list-cell v-for="(single_uf, index) in use_for_array" :key="index" arrow @click="choose_use_for(single_uf)">
                {{single_uf}}
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_add_vehicle" @close="show_add_vehicle= false">
        <fui-input label="主车牌" v-model="new_vehicle.main_vehicle_plate">
            <fui-button btnSize="mini" type="purple" text="选择" @click="show_pick_vehicles = true"></fui-button>
        </fui-input>
        <fui-input label="挂车牌" v-model="new_vehicle.behind_vehicle_plate"></fui-input>
        <fui-input label="司机姓名" v-model="new_vehicle.driver_phone"></fui-input>
        <fui-input label="司机电话" v-model="new_vehicle.driver_name"></fui-input>
        <fui-input label="备注" v-model="new_vehicle.comment"></fui-input>
        <fui-button type="success" text="添加" @click="add_vehicle"></fui-button>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_pick_vehicles" @close="show_pick_vehicles = false">
        <fui-list>
            <list-show :fetch_function="get_vehicles" search_key="search_cond" height="40vh">
                <fui-list-cell arrow slot-scope="{item}" @click="choose_vehicles(item)">
                    {{item.main_vehicle_plate}}-{{item.behind_vehicle_plate}}-{{item.driver_name}}-{{item.driver_phone}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
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
            show_pick_vehicles: false,
            new_vehicle: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_name: '',
                driver_phone: '',
                comment: '',
            },
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
                plan_time: "",
                stuff_id: 0,
                use_for: ""
            },
            stuff_name: '',
            saler_name: '',
            buyer_name: '',
            default_time: '',
            vehicles: [],
        }
    },
    components: {
        "list-show": ListShow,
        "pick-regions": pickRegions,
    },
    methods: {
        remove_vehicle: function (_index) {
            this.vehicles.splice(_index, 1);
        },
        make_vc_show: function (_v) {
            return {
                value: '第' + (this.vehicles.length - this.vehicles.indexOf(_v)) + '车',
                label: '共' + this.vehicles.length + '车',
                list: [{
                        label: '主车牌',
                        value: _v.main_vehicle.plate
                    },
                    {
                        label: '挂车牌',
                        value: _v.behind_vehicle.plate
                    },
                    {
                        label: '司机姓名',
                        value: _v.driver.name
                    },
                    {
                        label: '司机电话',
                        value: _v.driver.phone
                    },
                    {
                        label: '备注',
                        value: _v.comment
                    }
                ],
                buttons: [{
                    text: '删除',
                    color: 'red'
                }],
            }
        },
        add_vehicle: async function () {
            let mv = await this.$send_req('/vehicle/fetch', {
                plate: this.new_vehicle.main_vehicle_plate,
            });
            let bv = await this.$send_req('/vehicle/fetch', {
                plate: this.new_vehicle.behind_vehicle_plate,
            });
            let dr = await this.$send_req('/driver/fetch', {
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
        },
        get_vehicles: async function (pageNo) {
            let res = await this.$send_req('/plan/get_self_vehicle_pairs', {
                pageNo: pageNo,
            });
            res.pairs.forEach(ele => {
                ele.search_cond = ele.main_vehicle_plate + ele.behind_vehicle_plate + ele.driver_name + ele.driver_phone;
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
        submit: async function () {
            let rules = [{
                name: 'plan_time',
                rule: ['required'],
                msg: ['请选择填写计划日期']
            }, {
                name: 'drop_address',
                rule: ['required'],
                msg: ['请选择填写卸车地点']
            }, {
                name: 'use_for',
                rule: ['required'],
                msg: ['请选择填写用途']
            }];
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
            console.log(this.vehicles);
            for (let index = 0; index < this.vehicles.length; index++) {
                let ele = this.vehicles[index];
                let req = {
                    ...this.plan,
                    main_vehicle_id: ele.main_vehicle.id,
                    behind_vehicle_id: ele.behind_vehicle.id,
                    driver_id: ele.driver.id
                };
                await this.$send_req('/plan/create_single_plan', req);
            }
            uni.switchTab({
                url: '/pages/OrderList',
            });
        },
    },
    onLoad: function (options) {
        this.plan.stuff_id = parseInt(options.stuff_id);
        this.stuff_name = options.stuff_name;
        this.saler_name = options.company_name;
        this.buyer_name = uni.getStorageSync('self_info').company;
        let tmp_date = new Date();
        tmp_date.setDate(tmp_date.getDate() + 1);
        this.default_time = utils.dateFormatter(tmp_date, 'y-m-d', 4, false);
    },
}
</script>

<style>

</style>

<template>
<view>
    <fui-white-space size="large"></fui-white-space>
    <fui-section :title="stuff_name" size="50" isLine></fui-section>
    <u-cell title="买方" :value="buyer_name"></u-cell>
    <u-cell title="卖方" :is_link="saler_name == '(未指定)'" :value="saler_name?saler_name:'(未指定)'" @click="show_select_company= true"></u-cell>
    <fui-divider></fui-divider>
    <fui-form ref="plan_form" :model="plan">
        <fui-form-item label="计划日期" :padding="[0,'18px']" asterisk prop="plan_time" @click="show_plan_time = true">
            <fui-input placeholder="请输入计划日期" disabled v-model="plan.plan_time"></fui-input>
        </fui-form-item>
        <view v-if="type_define.is_sale">
            <fui-form-item label="用途" :padding="[0,'18px']" asterisk prop="use_for" @click="show_use_for = true">
                <fui-input placeholder="请输入用途" disabled v-model="plan.use_for"></fui-input>
            </fui-form-item>
            <pick-regions @getRegion="pick_address">
                <fui-form-item label="卸车地点" :padding="[0,'18px']" asterisk prop="drop_address">
                    <fui-input placeholder="请输入卸车地点" disabled v-model="plan.drop_address"></fui-input>
                </fui-form-item>
            </pick-regions>
        </view>
        <view v-else>
            <fui-form-item label="单价" :padding="[0,'18px']" prop="price">
                <fui-input placeholder="请输入单价" v-model="plan.price"></fui-input>
            </fui-form-item>
            <fui-form-item label="连续派车" :padding="[0,'18px']" prop="is_repeat">
                <u-switch v-model="plan.is_repeat"></u-switch>
            </fui-form-item>
        </view>
        <fui-form-item label="承运公司" :padding="[0,'18px']" prop="trans_company_name">
            <fui-input placeholder="请输入承运公司" v-model="plan.trans_company_name"></fui-input>
        </fui-form-item>
        <view style="display:flex; justify-content: center;">
            <fui-button text="新增车辆" btnSize="small" type="success" @click="show_add_vehicle = true"></fui-button>
            <fui-button v-if="!type_define.is_sale" text="我要代提" btnSize="small" type="primary" @click="prepare_proxy_buy"></fui-button>
        </view>
        <fui-grid :columns="2" :square="false">
            <fui-grid-item v-for="(single_v, index) in vehicles" :key="index">
                <view style="border:solid;">
                    <fui-preview bdSize="26" :isBorder="false" :previewData="make_vc_show(single_v)" @click="remove_vehicle(index)"></fui-preview>
                </view>
            </fui-grid-item>
        </fui-grid>
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
        <fui-input label="司机姓名" v-model="new_vehicle.driver_name"></fui-input>
        <fui-input label="司机电话" v-model="new_vehicle.driver_phone"></fui-input>
        <fui-input label="备注" v-model="new_vehicle.comment"></fui-input>
        <fui-button type="success" text="添加" @click="add_vehicle"></fui-button>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_select_company" @close="show_select_company= false">
        <fui-list>
            <list-show v-model="copmany4select" :fetch_function="get_company4select" search_key="cond" height="40vh" :fetch_params="[company_id]">
                <fui-list-cell v-for="item in copmany4select" :key="item.id" arrow @click="saler_name = item.name;show_select_company = false;">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_pick_vehicles" @close="show_pick_vehicles = false">
        <fui-list>
            <list-show v-model="data2show" :fetch_function="get_vehicles" search_key="search_cond" height="40vh" :fetch_params="[type_define.pair_get_url]">
                <fui-list-cell v-for="(item, index) in data2show" :key="index" arrow @click="choose_vehicles(item)">
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
    methods: {
        prepare_proxy_buy: function () {
            this.is_proxy = true;
            this.plan.trans_company_name = this.saler_name;
            this.saler_name = '';
        },
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
        },
        get_vehicles: async function (pageNo, [pair_get_url]) {
            let res = await this.$send_req(pair_get_url, {
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
                    main_vehicle_id: ele.main_vehicle.id,
                    behind_vehicle_id: ele.behind_vehicle.id,
                    driver_id: ele.driver.id,
                    is_proxy: this.is_proxy,
                };
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
        let resp = await this.$send_req('/global/get_notice', {});
        this.notice = resp.notice;
    },
}
</script>

<style>

</style>

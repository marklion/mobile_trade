<template>
<view>
    <u-subsection :list="sub_pages" :current="cur_page" @change="sectionChange"></u-subsection>
    <view v-if="cur_page == 0">
        <list-show ref="plans" :fetch_function="get_wait_que" height="90vh" search_key="search_cond" v-model="plans" :fetch_params="[show_sc_in_field]">
            <view v-for="item in plans" :key="item.id" class="single_card_show">
                <u-cell :icon="icon_make(item)" :title="item.main_vehicle.plate + '-' + item.behind_vehicle.plate">
                    <view slot="label" style="display:flex; flex-direction: column;">
                        <fui-text :text="item.company.name" size="24"></fui-text>
                        <fui-text v-if="item.register_time" type="primary" :text="'排号时间：' + item.register_time" size="24"></fui-text>
                        <fui-text v-if="item.call_time" type="success" :text="'叫号时间：' + item.call_time" size="24"></fui-text>
                        <fui-text v-if="item.confirmed" type="danger" :text="'已确认装卸货' + (item.seal_no?item.seal_no:'') + '-' + (item.drop_take_zone_name?item.drop_take_zone_name:'')" size="24"></fui-text>
                        <fui-text v-if="item.enter_time" type="purple" :text="'一次重量:' + item.p_weight" size="24"></fui-text>
                    </view>
                    <view slot="value" style="display:flex; flex-direction: column;">
                        <fui-text :text="item.driver.name" size="24"></fui-text>
                        <fui-text type="primary" :text="item.driver.phone" size="24" textType="mobile" @click="copy_text(item.driver.phone)"></fui-text>
                        <fui-text :text="'序号:' + item.register_number" size="24"></fui-text>
                        <fui-text v-if="item.expect_weight > 0" size="24" :text="'期望重量:' + item.expect_weight"></fui-text>
                    </view>
                    <view slot="right-icon">
                        <view v-if="item.register_time">
                            <fui-button btnSize="mini" v-if="!item.call_time" text="叫号" type="success" @click="call_vehicle(item)"></fui-button>
                            <view v-else-if="!item.enter_time">
                                <fui-button btnSize="mini" text="过号" type="danger" @click="prepare_pass_vehicle(item)"></fui-button>
                                <fui-button v-if="item.stuff.manual_weight" btnSize="mini" text="进厂" type="primary" @click="prepare_enter_vehicle(item)"></fui-button>
                            </view>
                            <view v-else>
                                <fui-button btnSize="mini" text="装卸货" type="warning" @click="prepare_confirm_vehicle(item)"></fui-button>
                                <fui-button btnSize="mini" text="撤销进厂" type="danger" @click="prepare_enter_vehicle(item, true)"></fui-button>
                                <fui-button btnSize="mini" v-if="item.stuff.manual_weight" text="计量" type="primary" @click="prepare_manual_weight(item)"></fui-button>
                            </view>
                        </view>
                    </view>
                </u-cell>
                <view style="display: flex;  padding: 10rpx;">
                    <fui-button btnSize="mini" text="审批" type="primary" @click="prepare_sc_confirm(item)"></fui-button>
                    <fui-button btnSize="mini" text="检查" type="warning" @click="nav_to_fc(item)"></fui-button>
                </view>
            </view>
        </list-show>
    </view>
    <view v-else-if="cur_page == 1">
        <dev-opt v-for="(single_dev,index) in all_dev" :key="index" :device="single_dev" @refresh="dev_refresh"></dev-opt>
    </view>
    <view v-else-if="cur_page == 2">
        <view v-if="stamp_pic">
            <fui-avatar width="100%" mode="widthFix" block shape="square" v-if="stamp_pic" :src="$convert_attach_url(stamp_pic)"></fui-avatar>
            <fui-button text="删除" @click="delete_stamp_pic" type="danger"></fui-button>
        </view>
        <view v-else>
            <fui-upload max="1" :sizeType="['compressed']" immediate :fileList="fileList" :url="upload_url" ref="upload_kit" @success="after_attach_uploaded" @error="meet_upload_error" @complete="after_other_action"></fui-upload>
        </view>
    </view>
    <fui-modal width="600" descr="确定要过号吗？" v-if="show_pass_vehicle" :show="show_pass_vehicle" @click="pass_vehicle">
    </fui-modal>
    <fui-modal width="600" :descr="'确定' + (is_exit_confirm ? '撤销' : '') + '车辆进厂吗？'" v-if="show_enter_vehicle" :show="show_enter_vehicle" @click="enter_vehicle">
    </fui-modal>
    <fui-modal width="600" v-if="show_confirm_vehicle" :show="show_confirm_vehicle" @click="confirm_vehicle">
        <fui-input label="铅封号" borderTop placeholder="请输入铅封号" v-model="tmp_seal_no">
            <slot v-if="focus_company.pressure_config" name="default">
                <fui-button type="success" btnSize="mini" @click="confirmSealNo">确认泄压</fui-button>
            </slot>
        </fui-input>
        <fui-input label="装卸区域" v-if="zones" disabled v-model="zone_name" @click="show_zone_select = true"></fui-input>
    </fui-modal>
    <fui-bottom-popup :show="show_zone_select" @close="show_zone_select = false" z-index="1002">
        <fui-list>
            <fui-list-cell v-for="item in zones" :key="item.id" arrow @click="zone_name = item.name; show_zone_select = false">
                {{item.name}}
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <measurement ref="measurement" :focus_plan="focus_plan" @refresh="measurement_refresh"></measurement>

    <fui-bottom-popup :show="show_sc_confirm" @close="show_sc_confirm= false" z-index="1002">
        <sc-execute ref="sc_confirm" :focus_plan="focus_plan"></sc-execute>
    </fui-bottom-popup>
</view>
</template>

<script>
import ListShow from '@/components/ListShow.vue';
import $fui from '@/components/firstui/fui-clipboard';
import DevOpt from './DevOpt.vue';
import Measurement from '@/components/Measurement.vue';
import ScExecute from '../components/ScExecute.vue';
export default {
    name: 'Field',
    components: {
        "list-show": ListShow,
        "dev-opt": DevOpt,
        "measurement": Measurement,
        "sc-execute": ScExecute,
    },
    data: function () {
        return {
            show_sc_confirm: false,
            upload_url: this.$remote_url() + '/api/v1/upload_file',
            fileList: [],
            sub_pages: ['排队车辆', '设备管理', '磅单印章'],
            cur_page: 0,
            show_pass_vehicle: false,
            show_enter_vehicle: false,
            show_confirm_vehicle: false,
            focus_plan_id: 0,
            plans: [],
            tmp_seal_no: '',
            stamp_pic: '',
            all_dev: [],
            is_exit_confirm: false,
            focus_company: {},
            zones: [],
            zone_name: '',
            show_zone_select: false,
            focus_plan: {},
            show_sc_in_field: false,
        };
    },
    methods: {
        prepare_sc_confirm: function (item) {
            this.focus_plan = item;
            this.show_sc_confirm = true;
            this.$nextTick(() => {
                this.$refs.sc_confirm.refresh();
            });
        },
        nav_to_fc: function (_plan) {
            uni.navigateTo({
                url: '/subPage1/FcExecute?plan_id=' + _plan.id
            })
        },
        init_dev: async function () {
            let resp = await this.$send_req('/scale/get_device_status', {});
            this.$set(this, 'all_dev', resp.devices);
        },
        dev_refresh: async function () {
            uni.showLoading()
            setTimeout(async () => {
                this.init_dev()
                uni.hideLoading()
            }, 2000);

        },
        measurement_refresh: function () {
            this.$refs.plans.refresh();
        },
        delete_stamp_pic: async function () {
            await this.$send_req('/scale/set_stamp_pic', {
                stamp_pic: ''
            });
            uni.startPullDownRefresh();
        },
        after_other_action: function (e) {
            if (e.action == 'delete') {
                this.stamp_pic = '';
            }
        },
        after_attach_uploaded: async function (e) {
            this.stamp_pic = e.res.data
            await this.set_stamp_pic()
        },
        meet_upload_error: async function (e) {
            uni.showToast({
                title: '上传失败',
                icon: 'none',
                duration: 2000
            });
        },
        init_stamp_pic: async function () {
            let ret = await this.$send_req('/scale/get_stamp_pic');
            this.stamp_pic = ret.stamp_pic;
        },
        set_stamp_pic: async function () {
            await this.$send_req('/scale/set_stamp_pic', {
                stamp_pic: this.stamp_pic
            });
            uni.startPullDownRefresh();
        },
        sectionChange(index) {
            this.cur_page = index;
        },
        pass_vehicle: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/scale/cancel_check_in', {
                    plan_id: this.focus_plan_id
                })
                uni.startPullDownRefresh();
            }
            this.show_pass_vehicle = false;
        },
        prepare_pass_vehicle: function (item) {
            this.focus_plan_id = item.id;
            this.show_pass_vehicle = true;
        },
        prepare_enter_vehicle: async function (item, is_exit = false) {
            this.focus_plan_id = item.id;
            this.show_enter_vehicle = true;
            this.is_exit_confirm = is_exit;
        },
        prepare_manual_weight: function (item) {
            this.focus_plan_id = item.id;
            this.focus_plan = item;
            this.$refs.measurement.show();
        },
        enter_vehicle: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/scale/vehicle_enter', {
                    plan_id: this.focus_plan_id,
                    is_exit: this.is_exit_confirm
                });
                uni.startPullDownRefresh();
            }
            this.show_enter_vehicle = false;
        },
        prepare_confirm_vehicle: async function (item) {
            this.focus_plan_id = item.id;
            this.tmp_seal_no = item.seal_no;
            this.show_confirm_vehicle = true;
            this.focus_company = item.stuff.company;
            this.zones = item.stuff.drop_take_zones;
        },
        confirmSealNo: function () {
            this.tmp_seal_no = '正在泄压';
        },
        confirm_vehicle: async function (e) {
            await this.$send_req('/scale/confirm_vehicle', {
                plan_id: this.focus_plan_id,
                is_confirm: e.index == 1,
                seal_no: this.tmp_seal_no,
                drop_take_zone_name: this.zone_name
            });
            uni.startPullDownRefresh();
            this.show_confirm_vehicle = false;
        },
        icon_make: function (item) {
            let ret = 'hourglass';
            if (item.call_time) {
                ret = 'volume';
            }
            if (item.enter_time) {
                ret = 'rewind-right';
            }
            return ret;
        },
        get_wait_que: async function (pageNo, [show_sc_in_field]) {
            if (show_sc_in_field == undefined) {
                return [];
            }
            let ret = await this.$send_req('/scale/wait_que', {
                pageNo: pageNo,
                include_license: show_sc_in_field
            });
            ret.plans.forEach(ele => {
                ele.search_cond = ele.main_vehicle.plate + ' ' + ele.behind_vehicle.plate;
            });
            return ret.plans;
        },
        copy_text: function (e) {
            $fui.getClipboardData(e, res => {
                if (res) {
                    uni.showToast({
                        title: '复制成功',
                        icon: 'success',
                        duration: 2000
                    });
                }
            });
        },
        call_vehicle: async function (item) {
            await this.$send_req('/scale/call_vehicle', {
                plan_id: item.id
            });
            uni.startPullDownRefresh();
        },
        init_sc_show_switch: async function () {
            this.show_sc_in_field = (await this.$send_req('/global/get_show_sc_in_field', {})).show_sc_in_field;
            this.$refs.sc_confirm.refresh();
        }
    },
    onPullDownRefresh: function () {
        if (this.$refs.plans) {
            this.$refs.plans.refresh();
        }
        this.init_stamp_pic();
        this.init_dev();
        uni.stopPullDownRefresh();
        this.init_sc_show_switch();
    },
    onShow: function () {
        this.init_stamp_pic();
        this.init_dev();
        this.init_sc_show_switch();
    },
}
</script>

<style scoped>
.single_card_show {
    border: 1px dashed red;
    border-radius: 10rpx;
    margin-bottom: -2px;
}

.single_card_show:not(:last-child) {
    border-bottom: none;
    /* 隐藏相邻框框的底部边框 */
}
</style>

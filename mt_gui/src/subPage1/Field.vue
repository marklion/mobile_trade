<template>
<view>
    <u-subsection :list="sub_pages" :current="cur_page" @change="sectionChange"></u-subsection>
    <view v-if="cur_page == 0">
        <list-show ref="plans" :fetch_function="get_wait_que" height="90vh" search_key="search_cond" v-model="plans">
            <view v-for="item in plans" :key="item.id">
                <u-cell :icon="icon_make(item)" :title="item.main_vehicle.plate + '-' + item.behind_vehicle.plate">
                    <view slot="label" style="display:flex; flex-direction: column;">
                        <fui-text :text="item.company.name" size="24"></fui-text>
                        <fui-text type="primary" :text="'排号时间：' + item.register_time" size="24"></fui-text>
                        <fui-text v-if="item.call_time" type="success" :text="'叫号时间：' + item.call_time" size="24"></fui-text>
                        <fui-text v-if="item.confirmed" type="danger" :text="'已确认装卸货' + (item.seal_no?item.seal_no:'') + '-' + (item.drop_take_zone_name?item.drop_take_zone_name:'')" size="24"></fui-text>
                        <fui-text v-if="item.enter_time" type="purple" :text="'一次重量:' + item.p_weight" size="24"></fui-text>
                    </view>
                    <view slot="value" style="display:flex; flex-direction: column;">
                        <fui-text :text="item.driver.name" size="24"></fui-text>
                        <fui-text type="primary" :text="item.driver.phone" size="24" textType="mobile" @click="copy_text(item.driver.phone)"></fui-text>
                        <fui-text :text="'序号:' + item.register_number" size="24"></fui-text>
                    </view>
                    <view slot="right-icon">
                        <fui-button btnSize="mini" v-if="!item.call_time" text="叫号" type="success" @click="call_vehicle(item)"></fui-button>
                        <view v-else-if="!item.enter_time">
                            <fui-button btnSize="mini" text="过号" type="danger" @click="prepare_pass_vehicle(item)"></fui-button>
                            <fui-button btnSize="mini" text="进厂" type="primary" @click="prepare_enter_vehicle(item)"></fui-button>
                        </view>
                        <view v-else>
                            <fui-button btnSize="mini" text="装卸货" type="warning" @click="prepare_confirm_vehicle(item)"></fui-button>
                            <fui-button btnSize="mini" text="撤销进厂" type="danger" @click="prepare_enter_vehicle(item, true)"></fui-button>
                            <fui-button btnSize="mini" text="计量" type="primary" @click="prepare_manual_weight(item)"></fui-button>
                        </view>
                    </view>
                </u-cell>
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
    <fui-modal v-if="show_manual_weight" :show="show_manual_weight"  @cancel="manual_weight_form_reset(); show_manual_weight = false" @click="confirm_manual_weight">
        <fui-form ref="manual_weight_form">
            <fui-form-item label="一次计量">
                <fui-input v-model="manual_weight_form.first_weight" placeholder="请输入一次计量">
                    <fui-button type="primary" btnSize="mini" @click="upload_first_weight">上传</fui-button>
                </fui-input>
            </fui-form-item>
            <fui-form-item>
                <fui-upload max="4" width="80" height="80" :sizeType="['compressed']"   ref="first_weight_upload" :url="upload_url" @success="after_first_weight_uploaded" @error="meet_upload_error" @complete="after_first_weight_action" @delete="delete_first_weight_file"></fui-upload>
            </fui-form-item>
            <fui-form-item label="二次计量">
                <fui-input v-model="manual_weight_form.second_weight" placeholder="请输入二次计量">
                    <fui-button type="primary" btnSize="mini" @click="upload_second_weight">上传</fui-button>
                </fui-input>
            </fui-form-item>
            <fui-form-item>
                <fui-upload max="4" width="80" height="80" :sizeType="['compressed']"   ref="second_weight_upload" :url="upload_url" @success="after_second_weight_uploaded" @error="meet_upload_error" @complete="after_second_weight_action" @delete="delete_second_weight_file"></fui-upload>
            </fui-form-item>
            <fui-form-item label="装卸量">
                <fui-input v-model="manual_weight_form.load_weight" type="number" placeholder="请输入装卸量"></fui-input>
            </fui-form-item>
        </fui-form>
    </fui-modal>
</view>
</template>

<script>
import ListShow from '@/components/ListShow.vue';
import $fui from '@/components/firstui/fui-clipboard';
import DevOpt from './DevOpt.vue';
export default {
    name: 'Field',
    components: {
        "list-show": ListShow,
        "dev-opt": DevOpt
    },
    data: function () {
        return {
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
            show_manual_weight: false,
            manual_weight_form: {
                first_weight: '',
                second_weight: '',
                load_weight: '',
                first_weight_fileList: [],
                second_weight_fileList: [],
                first_weight_file_len: 0,
                second_weight_file_len: 0,
            },
            menual_weight_rules: [{
                    name: 'first_weight',
                    rule: ['required'],
                    msg: ['请输入一次计量']
                },
                {
                    name: 'second_weight',
                    rule: ['required'],
                    msg: ['请输入二次计量']
                },
                {
                    name: 'load_weight',
                    rule: ['required'],
                    msg: ['请输入装卸量']
                },
            ],
        };
    },
    methods: {
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
            console.log('meet_upload_error');
            console.log(e);
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
            this.show_manual_weight = true;
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
        get_wait_que: async function (pageNo) {
            let ret = await this.$send_req('/scale/wait_que', {
                pageNo: pageNo
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
        confirm_manual_weight: async function (event) {
            if (event.index == 1) {
                this.$refs.manual_weight_form.validator(this.manual_weight_form, this.menual_weight_rules).then(async res => {
                    if (res.isPassed) {
                        let ret = await this.$send_req('/scale/manual_weight', {
                            plan_id: this.focus_plan_id,
                            first_weight: this.manual_weight_form.first_weight,
                            second_weight: this.manual_weight_form.second_weight,
                            load_weight: Number(this.manual_weight_form.load_weight),
                            first_weight_fileList: this.manual_weight_form.first_weight_fileList.join('|'),
                            second_weight_fileList: this.manual_weight_form.second_weight_fileList.join('|'),
                        });
                        if(ret.result) {
                            uni.showToast({
                                title: '提交成功',
                                icon: 'success',
                                duration: 2000
                            });
                            this.show_manual_weight = false;
                            this.manual_weight_form_reset();
                        } else {
                            uni.showToast({
                                title: '提交失败',
                                icon: 'none',
                                duration: 2000
                            });
                        }
                    }
                }).catch(err => {
                    console.log('validator', err);
                });
                console.log('upload file end');

            } else {
                this.show_manual_weight = false;
                this.manual_weight_form_reset();
            }
        },
        manual_weight_form_reset: function () {
            this.manual_weight_form = {
                first_weight: '',
                second_weight: '',
                load_weight: '',
                first_weight_fileList: [],
                second_weight_fileList: []
            };
        },
        upload_first_weight: async function () {
            if(this.manual_weight_form.first_weight_file_len==0) {
                uni.showToast({
                    title: '请选择一次计量图片',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }
            this.$refs.first_weight_upload.start();
        },
        upload_second_weight: async function () {
            if(this.manual_weight_form.second_weight_file_len==0) {
                uni.showToast({
                    title: '请选择二次计量图片',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }
            this.$refs.second_weight_upload.start();
        },
        after_first_weight_action: function (e) {
            this.manual_weight_form.first_weight_file_len = e.urls.length;
        },
        after_second_weight_action: function (e) {
            this.manual_weight_form.second_weight_file_len = e.urls.length;
        },
        after_first_weight_uploaded: async function (e) {
            this.manual_weight_form.first_weight_fileList[e.index] = e.res.data;
            uni.showToast({
                title: '上传成功',
                icon: 'none',
                duration: 2000
            });
        },
        after_second_weight_uploaded: async function (e) {
            this.manual_weight_form.second_weight_fileList[e.index]= e.res.data;
            uni.showToast({
                title: '上传成功',
                icon: 'none',
                duration: 2000
            });
        },
    },
    onPullDownRefresh: function () {
        if (this.$refs.plans) {
            this.$refs.plans.refresh();
        }
        this.init_stamp_pic();
        this.init_dev();
        uni.stopPullDownRefresh();
    },
    onShow: function () {
        this.init_stamp_pic();
        this.init_dev();
    },
}
</script>

<style></style>

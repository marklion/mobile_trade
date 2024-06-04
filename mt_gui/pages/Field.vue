<template>
<view>
    <u-subsection :list="sub_pages" :current="cur_page" @change="sectionChange"></u-subsection>
    <view v-if="cur_page == 0">
        <list-show ref="plans" :fetch_function="get_wait_que" height="90vh" search_key="search_cond" v-model="plans">
            <view v-for="item in  plans" :key="item.id">
                <u-cell :icon="icon_make(item)" :title="item.main_vehicle.plate + '-' + item.behind_vehicle.plate">
                    <view slot="label" style="display:flex; flex-direction: column;">
                        <fui-text :text="item.company.name" size="24"></fui-text>
                        <fui-text type="primary" :text="'排号时间：' + item.register_time" size="24"></fui-text>
                        <fui-text v-if="item.call_time" type="success" :text="'叫号时间：' + item.call_time" size="24"></fui-text>
                        <fui-text v-if="item.confirmed" type="danger" :text="'已确认装卸货' + item.seal_no" size="24"></fui-text>
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
                        <fui-button btnSize="mini" v-else text="确认装卸货" type="warning" @click="prepare_confirm_vehicle(item)"></fui-button>
                    </view>
                </u-cell>
            </view>
        </list-show>
    </view>
    <view v-else-if="cur_page == 1">
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
    <fui-modal width="600" descr="确定车辆进厂吗？" v-if="show_enter_vehicle" :show="show_enter_vehicle" @click="enter_vehicle">
    </fui-modal>
    <fui-modal width="600" v-if="show_confirm_vehicle" :show="show_confirm_vehicle" @click="confirm_vehicle">
        <fui-input label="铅封号" borderTop placeholder="请输入铅封号" v-model="tmp_seal_no"></fui-input>
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import $fui from '@/components/firstui/fui-clipboard';
export default {
    name: 'Field',
    components: {
        "list-show": ListShow
    },
    data: function () {
        return {
            upload_url: this.$remote_url() + '/api/v1/upload_file',
            fileList: [],
            sub_pages: ['排队车辆', '磅单印章'],
            cur_page: 0,
            show_pass_vehicle: false,
            show_enter_vehicle: false,
            show_confirm_vehicle: false,
            focus_plan_id: 0,
            plans: [],
            tmp_seal_no: '',
            stamp_pic: '',
        };
    },
    methods: {
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
        prepare_enter_vehicle: async function (item) {
            this.focus_plan_id = item.id;
            this.show_enter_vehicle = true;
        },
        enter_vehicle: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/scale/vehicle_enter', {
                    plan_id: this.focus_plan_id
                });
                uni.startPullDownRefresh();
            }
            this.show_enter_vehicle = false;
        },
        prepare_confirm_vehicle: async function (item) {
            this.focus_plan_id = item.id;
            this.show_confirm_vehicle = true;
        },
        confirm_vehicle: async function (e) {
            await this.$send_req('/scale/confirm_vehicle', {
                plan_id: this.focus_plan_id,
                is_confirm: e.index == 1,
                seal_no: this.tmp_seal_no
            });
            this.show_confirm_vehicle = false;
            uni.startPullDownRefresh();
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
        }
    },
    onPullDownRefresh: function () {
        if (this.$refs.plans) {
            this.$refs.plans.refresh();
        }
        this.init_stamp_pic();
        uni.stopPullDownRefresh();
    },
    onShow: function () {
        this.init_stamp_pic();
    },
}
</script>

<style>

</style>

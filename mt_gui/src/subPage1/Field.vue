<template>
<view class="field-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">现场作业</text>
            <text class="hero-title">{{ sub_pages[cur_page] }}</text>
            <text class="hero-sub" v-if="cur_page === 0">当前排队 {{ plans.length }} 辆</text>
        </view>
    </view>

    <view class="shell">
        <view class="tabs">
            <view class="tab-item" :class="{ active: cur_page === 0 }" @click="sectionChange(0)">
                <text class="tab-text">排队车辆</text>
            </view>
            <view class="tab-item" :class="{ active: cur_page === 1 }" @click="sectionChange(1)">
                <text class="tab-text">设备管理</text>
            </view>
            <view class="tab-item" :class="{ active: cur_page === 2 }" @click="sectionChange(2)">
                <text class="tab-text">磅单印章</text>
            </view>
        </view>

        <view class="body" v-if="cur_page == 0">
            <view class="filter-bar">
                <text class="filter-label">仅显示未叫号</text>
                <fui-switch :checked="only_show_uncalled" color="#465CFF" @change="on_uncalled_change"></fui-switch>
            </view>
            <list-show ref="plans" :fetch_function="get_wait_que" height="58vh" search_key="search_cond"
                v-model="plans" :fetch_params="[show_sc_in_field, only_show_uncalled]">
                <view class="plan-card" v-for="(item, p_index) in plans" :key="item.id">
                    <view class="plan-top">
                        <view class="plan-plates">
                            <text class="plate-tag">{{ plate_of(item) }}</text>
                            <text class="plate-tag" v-if="behind_of(item)">{{ behind_of(item) }}</text>
                        </view>
                        <view class="status-tag enter" v-if="item.enter_time">
                            <text class="status-tag-text">已进厂</text>
                        </view>
                        <view class="status-tag call" v-else-if="item.call_time">
                            <text class="status-tag-text">已叫号</text>
                        </view>
                        <view class="status-tag wait" v-else-if="item.register_time">
                            <text class="status-tag-text">排队中</text>
                        </view>
                        <view class="status-tag wait" v-else>
                            <text class="status-tag-text">未排号</text>
                        </view>
                    </view>

                    <view class="plan-title-row">
                        <text class="plan-company">{{ company_of(item) }}</text>
                        <text class="plan-stuff" v-if="stuff_of(item)">{{ stuff_of(item) }}</text>
                    </view>

                    <view class="plan-meta">
                        <text class="meta-item">{{ driver_name(item) }}</text>
                        <text class="meta-sep">·</text>
                        <text class="meta-item phone" :data-phone="driver_phone(item)" @click="on_copy_phone">{{ driver_phone(item) }}</text>
                    </view>

                    <view class="plan-facts">
                        <text class="fact no" v-if="item.register_number != null">No.{{ item.register_number }}</text>
                        <text class="fact" v-if="item.register_time">排号 {{ short_time(item.register_time) }}</text>
                        <text class="fact ok" v-if="item.call_time">叫号 {{ short_time(item.call_time) }}</text>
                        <text class="fact" v-if="item.enter_time">一次重 {{ item.p_weight }}</text>
                        <text class="fact" v-if="item.enter_count">进厂前 {{ item.enter_count }}</text>
                        <text class="fact" v-if="item.expect_weight > 0">期望 {{ item.expect_weight }}</text>
                        <text class="fact warn" v-if="item.confirmed">
                            {{ item.seal_no || '已确认' }}{{ item.drop_take_zone_name ? ('·' + item.drop_take_zone_name) : '' }}
                        </text>
                    </view>

                    <view class="plan-actions">
                        <template v-if="item.register_time">
                            <template v-if="!item.call_time">
                                <view class="act success" :data-pindex="p_index" @click="on_call_vehicle">
                                    <text class="act-text">叫号</text>
                                </view>
                                <view class="act danger" :data-pindex="p_index" @click="on_pass_vehicle">
                                    <text class="act-text">过号</text>
                                </view>
                            </template>
                            <template v-else-if="!item.enter_time">
                                <view class="act danger" :data-pindex="p_index" @click="on_pass_vehicle">
                                    <text class="act-text">过号</text>
                                </view>
                                <view class="act primary" v-if="item.stuff && item.stuff.manual_weight"
                                    :data-pindex="p_index" @click="on_enter_vehicle">
                                    <text class="act-text">进厂</text>
                                </view>
                            </template>
                            <template v-else>
                                <view class="act warn" :data-pindex="p_index" @click="on_confirm_vehicle">
                                    <text class="act-text">装卸货</text>
                                </view>
                                <view class="act danger" :data-pindex="p_index" data-exit="1" @click="on_enter_vehicle">
                                    <text class="act-text">撤销进厂</text>
                                </view>
                                <view class="act primary" v-if="item.stuff && item.stuff.manual_weight"
                                    :data-pindex="p_index" @click="on_manual_weight">
                                    <text class="act-text">计量</text>
                                </view>
                            </template>
                        </template>
                        <view class="act primary" :data-pindex="p_index" @click="on_sc_confirm">
                            <text class="act-text">审批</text>
                        </view>
                        <view class="act warn" :data-pindex="p_index" @click="on_nav_fc">
                            <text class="act-text">检查</text>
                        </view>
                        <view class="act success" v-if="item.enter_attachment"
                            :data-pindex="p_index" @click="on_show_attach">
                            <text class="act-text">磅单</text>
                        </view>
                    </view>
                </view>
            </list-show>
        </view>

        <view class="body body-pad" v-else-if="cur_page == 1">
            <dev-opt v-for="(single_dev, index) in all_dev" :key="index" :company="current_company"
                :device="single_dev" @refresh="dev_refresh"></dev-opt>
            <view class="empty-block" v-if="!all_dev || !all_dev.length">
                <text class="empty-text">暂无设备</text>
            </view>
        </view>

        <view class="body body-pad" v-else-if="cur_page == 2">
            <view class="stamp-card" v-if="stamp_pic">
                <view class="stamp-head">
                    <text class="stamp-title">当前印章</text>
                    <text class="stamp-sub">用于磅单盖章展示</text>
                </view>
                <view class="stamp-preview">
                    <image class="stamp-img" :src="$convert_attach_url(stamp_pic)" mode="aspectFit"></image>
                </view>
            </view>
            <view class="stamp-card" v-else>
                <view class="stamp-head">
                    <text class="stamp-title">上传印章</text>
                    <text class="stamp-sub">请上传清晰的印章图片</text>
                </view>
                <view class="stamp-upload">
                    <fui-upload max="1" :sizeType="['compressed']" immediate :fileList="fileList" :url="upload_url"
                        ref="upload_kit" @success="after_attach_uploaded" @error="meet_upload_error"
                        @complete="after_other_action"></fui-upload>
                </view>
            </view>
        </view>
    </view>

    <fui-modal width="600" descr="确定要过号吗？" v-if="show_pass_vehicle" :show="show_pass_vehicle" @click="pass_vehicle">
    </fui-modal>
    <fui-modal width="600" :descr="'确定' + (is_exit_confirm ? '撤销' : '') + '车辆进厂吗？'" v-if="show_enter_vehicle"
        :show="show_enter_vehicle" @click="enter_vehicle">
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
            <fui-list-cell v-for="(item, index) in zones" :key="item.id" :index="index" arrow
                @click="on_pick_zone">
                {{ item.name }}
            </fui-list-cell>
        </fui-list>
    </fui-bottom-popup>
    <measurement ref="measurement" :focus_plan="focus_plan" @refresh="measurement_refresh"></measurement>

    <fui-bottom-popup :show="show_sc_confirm" @close="show_sc_confirm= false" z-index="1002">
        <sc-execute v-if="show_sc_confirm" ref="sc_confirm" :focus_plan="focus_plan"></sc-execute>
    </fui-bottom-popup>
    <fui-backdrop :zIndex="8888" :show="show_one_att" @click="show_one_att = false">
        <view class="image-viewer-container" @click.stop>
            <movable-area scale-area class="movable-area">
                <movable-view class="movable-view" direction="all" inertia scale scale-min="1" scale-max="6">
                    <image class="lookimg" :src="one_att.length>0?one_att[0]:''" mode="aspectFit"></image>
                </movable-view>
            </movable-area>
            <view class="close-button-container">
                <fui-icon @click="show_one_att=false" name="close" size="80" color="white"></fui-icon>
            </view>
        </view>
    </fui-backdrop>
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
            current_company: '',
            is_exit_confirm: false,
            focus_company: {},
            zones: [],
            zone_name: '',
            show_zone_select: false,
            focus_plan: {},
            show_sc_in_field: false,
            only_show_uncalled: false,
            show_one_att: false,
            one_att: [''],
        };
    },
    methods: {
        plate_of: function (item) {
            return (item && item.main_vehicle && item.main_vehicle.plate) ? item.main_vehicle.plate : '-';
        },
        behind_of: function (item) {
            return (item && item.behind_vehicle && item.behind_vehicle.plate) ? item.behind_vehicle.plate : '';
        },
        company_of: function (item) {
            return (item && item.company && item.company.name) ? item.company.name : '-';
        },
        stuff_of: function (item) {
            return (item && item.stuff && item.stuff.name) ? item.stuff.name : '';
        },
        driver_name: function (item) {
            return (item && item.driver && item.driver.name) ? item.driver.name : '-';
        },
        driver_phone: function (item) {
            return (item && item.driver && item.driver.phone) ? item.driver.phone : '-';
        },
        short_time: function (val) {
            if (!val) {
                return '-';
            }
            const text = String(val);
            if (text.length >= 16) {
                return text.slice(5, 16);
            }
            return text;
        },
        get_plan_by_event: function (e) {
            const pindex = Number(e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.pindex
                : -1);
            const item = (this.plans || [])[pindex];
            if (!item) {
                uni.showToast({ title: '未找到车辆，请重试', icon: 'none' });
                return null;
            }
            return item;
        },
        on_copy_phone: function (e) {
            const phone = e && e.currentTarget && e.currentTarget.dataset
                ? e.currentTarget.dataset.phone
                : '';
            if (!phone || phone === '-') {
                return;
            }
            this.copy_text(phone);
        },
        on_call_vehicle: function (e) {
            const item = this.get_plan_by_event(e);
            if (item) {
                this.call_vehicle(item);
            }
        },
        on_pass_vehicle: function (e) {
            const item = this.get_plan_by_event(e);
            if (item) {
                this.prepare_pass_vehicle(item);
            }
        },
        on_enter_vehicle: function (e) {
            const item = this.get_plan_by_event(e);
            if (!item) {
                return;
            }
            const is_exit = !!(e && e.currentTarget && e.currentTarget.dataset
                && (e.currentTarget.dataset.exit === '1' || e.currentTarget.dataset.exit === 1));
            this.prepare_enter_vehicle(item, is_exit);
        },
        on_confirm_vehicle: function (e) {
            const item = this.get_plan_by_event(e);
            if (item) {
                this.prepare_confirm_vehicle(item);
            }
        },
        on_manual_weight: function (e) {
            const item = this.get_plan_by_event(e);
            if (item) {
                this.prepare_manual_weight(item);
            }
        },
        on_sc_confirm: function (e) {
            const item = this.get_plan_by_event(e);
            if (item) {
                this.prepare_sc_confirm(item);
            }
        },
        on_nav_fc: function (e) {
            const item = this.get_plan_by_event(e);
            if (item) {
                this.nav_to_fc(item);
            }
        },
        on_show_attach: function (e) {
            const item = this.get_plan_by_event(e);
            if (item && item.enter_attachment) {
                this.show_image(item.enter_attachment);
            }
        },
        on_pick_zone: function (e) {
            const index = e && typeof e.index === 'number' ? e.index : -1;
            const item = (this.zones || [])[index];
            if (!item) {
                return;
            }
            this.zone_name = item.name;
            this.show_zone_select = false;
        },
        on_uncalled_change: function (e) {
            const checked = !!(e && e.detail && e.detail.value);
            this.only_show_uncalled = checked;
            this.$nextTick(() => {
                this.refresh_plans();
            });
        },
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
            this.current_company = {
                access_control_permission: !resp.switchAcc,
                barriergate_control_permission: !resp.switchGate
            };
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
                this.refresh_plans();
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
                this.refresh_plans();
            }
            this.show_enter_vehicle = false;
        },
        prepare_confirm_vehicle: async function (item) {
            this.focus_plan_id = item.id;
            this.tmp_seal_no = item.seal_no;
            this.zone_name = '';
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
            this.refresh_plans();
            this.show_confirm_vehicle = false;
            this.zone_name = '';
            this.tmp_seal_no = '';
        },
        get_wait_que: async function (pageNo, [show_sc_in_field, only_show_uncalled]) {
            if (show_sc_in_field == undefined) {
                return [];
            }
            let ret = await this.$send_req('/scale/wait_que', {
                pageNo: pageNo,
                include_license: show_sc_in_field,
                only_show_uncalled: !!only_show_uncalled
            });
            ret.plans.forEach(ele => {
                ele.search_cond = ele.main_vehicle.plate + ' ' + ele.behind_vehicle.plate;
            });
            return ret.plans;
        },
        refresh_plans() {
            if (this.$refs.plans) {
                this.$refs.plans.refresh();
            }

            this.show_one_att = false;
            this.one_att = [''];
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
            this.refresh_plans();
        },
        init_sc_show_switch: async function () {
            const prev = this.show_sc_in_field;
            this.show_sc_in_field = (await this.$send_req('/global/get_show_sc_in_field', {})).show_sc_in_field;
            // 仅开关变化时刷新列表，避免每次 onShow/下拉都整表重拉
            if (prev !== this.show_sc_in_field || this.plans.length === 0) {
                this.refresh_plans();
            }
            if (this.$refs.sc_confirm) {
                this.$refs.sc_confirm.refresh();
            }
        },
        show_image: function (attachment) {
            this.show_one_att = true;
            this.one_att = [this.$convert_attach_url(attachment)];
        },
    },
    onLoad: function (options) {
        if (options && options.tab != null && options.tab !== '') {
            const tab = Number(options.tab);
            if (!Number.isNaN(tab) && tab >= 0 && tab < this.sub_pages.length) {
                this.cur_page = tab;
            }
        }
    },
    onPullDownRefresh: function () {
        this.refresh_plans();
        this.init_stamp_pic();
        this.init_dev();
        this.init_sc_show_switch();
        uni.stopPullDownRefresh();
    },
    onShow: function () {
        this.init_stamp_pic();
        this.init_dev();
        this.init_sc_show_switch();
    },
}
</script>

<style scoped>
.field-page {
    min-height: 100vh;
    background: #F4F6FB;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}
.hero {
    position: relative;
    padding: 28rpx 28rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}
.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 240rpx;
    height: 240rpx;
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
}
.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}
.hero-title {
    display: block;
    margin-top: 10rpx;
    font-size: 40rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.hero-sub {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.88);
}
.shell {
    position: relative;
    z-index: 2;
    margin: -24rpx 20rpx 12rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.08);
    overflow: hidden;
    min-height: 70vh;
}
.tabs {
    padding: 10rpx;
    display: flex;
    flex-direction: row;
    border-bottom: 1rpx solid #F2F4FA;
}
.tab-item {
    flex: 1;
    height: 68rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14rpx;
}
.tab-item.active {
    background: rgba(70, 92, 255, 0.1);
}
.tab-text {
    font-size: 26rpx;
    color: #6B7280;
    font-weight: 600;
}
.tab-item.active .tab-text {
    color: #2F3FCF;
}
.body {
    padding: 12rpx 12rpx 20rpx;
}
.body-pad {
    padding: 16rpx;
}
.filter-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 10rpx 14rpx;
    margin-bottom: 8rpx;
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 12rpx;
}
.filter-label {
    font-size: 24rpx;
    color: #3A4256;
    font-weight: 600;
}
.plan-card {
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 14rpx;
    padding: 10rpx 12rpx 8rpx;
    margin-bottom: 8rpx;
}
.plan-top {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 4rpx;
}
.plan-plates {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
}
.plate-tag {
    padding: 2rpx 10rpx;
    margin-right: 6rpx;
    border-radius: 4rpx;
    background: #F5D000;
    color: #111111;
    font-size: 22rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
    border: 2rpx solid #111111;
    line-height: 1.25;
}
.status-tag {
    flex-shrink: 0;
    padding: 2rpx 10rpx;
    border-radius: 999rpx;
}
.status-tag.wait {
    background: rgba(255, 138, 43, 0.12);
}
.status-tag.call {
    background: rgba(45, 190, 108, 0.12);
}
.status-tag.enter {
    background: rgba(70, 92, 255, 0.12);
}
.status-tag-text {
    font-size: 18rpx;
    font-weight: 700;
}
.status-tag.wait .status-tag-text {
    color: #FF8A2B;
}
.status-tag.call .status-tag-text {
    color: #1FA85A;
}
.status-tag.enter .status-tag-text {
    color: #2F3FCF;
}
.plan-title-row {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    flex-wrap: wrap;
    margin-bottom: 2rpx;
}
.plan-company {
    font-size: 24rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.25;
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.plan-stuff {
    margin-left: 10rpx;
    font-size: 20rpx;
    color: #6B7280;
    line-height: 1.25;
}
.plan-meta {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 2rpx;
}
.meta-item {
    font-size: 20rpx;
    color: #4A5568;
    font-weight: 600;
    line-height: 1.3;
}
.meta-item.phone {
    color: #465CFF;
}
.meta-sep {
    margin: 0 6rpx;
    color: #C5CAD5;
    font-size: 20rpx;
}
.plan-facts {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: 4rpx;
}
.fact {
    margin: 2rpx 8rpx 2rpx 0;
    padding: 2rpx 8rpx;
    border-radius: 6rpx;
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    font-size: 18rpx;
    color: #6B7280;
    line-height: 1.3;
}
.fact.no {
    padding: 0 4rpx 0 0;
    background: transparent;
    border: none;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 800;
    letter-spacing: 0.5rpx;
    line-height: 1.2;
}
.fact.ok {
    color: #1FA85A;
    border-color: rgba(45, 190, 108, 0.25);
    background: rgba(45, 190, 108, 0.08);
}
.fact.warn {
    color: #FF4D4F;
    border-color: rgba(255, 77, 79, 0.25);
    background: rgba(255, 77, 79, 0.06);
}
.plan-actions {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: 6rpx;
    padding-top: 6rpx;
    border-top: 1rpx solid #EEF1F8;
}
.act {
    width: 20%;
    box-sizing: border-box;
    padding: 3rpx;
    height: 54rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}
.act-text {
    width: 100%;
    height: 48rpx;
    line-height: 48rpx;
    text-align: center;
    border-radius: 8rpx;
    font-size: 20rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.act.success .act-text { background: #2DBE6C; }
.act.danger .act-text { background: #FF4D4F; }
.act.primary .act-text { background: #465CFF; }
.act.warn .act-text { background: #FF8A2B; }
.stamp-card {
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 18rpx;
    padding: 22rpx 20rpx;
}
.stamp-head {
    margin-bottom: 18rpx;
}
.stamp-title {
    display: block;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
}
.stamp-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #9AA3B8;
}
.stamp-preview {
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-radius: 16rpx;
    padding: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 360rpx;
}
.stamp-img {
    width: 100%;
    height: 360rpx;
    display: block;
}
.stamp-upload {
    background: #FFFFFF;
    border: 1rpx dashed rgba(70, 92, 255, 0.28);
    border-radius: 16rpx;
    padding: 24rpx;
}
.stamp-del {
    margin-top: 20rpx;
    height: 80rpx;
    border-radius: 14rpx;
    background: #FF4D4F;
    display: flex;
    align-items: center;
    justify-content: center;
}
.stamp-del-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.empty-block {
    padding: 80rpx 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}
.empty-text {
    font-size: 26rpx;
    color: #9AA3B8;
}
.image-viewer-container {
    width: 100%;
    height: 100%;
    position: relative;
    padding-bottom: 200rpx;
    box-sizing: border-box;
}
.movable-view {
    height: 100%;
    width: 100%;
}
.movable-area {
    height: 100%;
    width: 100%;
    overflow: hidden;
    z-index: 9999;
}
.lookimg {
    width: 100%;
    height: 100%;
    display: block;
}
.close-button-container {
    position: absolute;
    bottom: 40rpx;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 8889;
}
</style>

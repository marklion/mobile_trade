<template>
<view class="dev-card">
    <view class="dev-head">
        <view class="dev-head-main">
            <text class="dev-name">{{ device.name }}</text>
            <text class="dev-status" v-if="device.scale_status">{{ device.scale_status }}</text>
            <text class="dev-status muted" v-else>门禁设备</text>
        </view>
        <view class="dev-weight" v-if="device.scale_status">
            <text class="dev-weight-label">当前重量</text>
            <text class="dev-weight-value">{{ device.cur_weight }}</text>
        </view>
    </view>

    <view class="gate-status" v-if="device.scale_status">
        <view class="gate-pill ok" v-if="device.enter_gate">
            <text class="gate-pill-text">前门已关</text>
        </view>
        <view class="gate-pill bad" v-else>
            <text class="gate-pill-text">前门未关</text>
        </view>
        <view class="gate-pill ok" v-if="device.exit_gate">
            <text class="gate-pill-text">后门已关</text>
        </view>
        <view class="gate-pill bad" v-else>
            <text class="gate-pill-text">后门未关</text>
        </view>
    </view>

    <view class="section"
        v-if="device.scale_status ? company.barriergate_control_permission : company.access_control_permission">
        <text class="section-title">道闸控制</text>
        <view class="btn-grid">
            <view class="dev-btn primary" @click="gate_ctrl(true, true)">
                <text class="dev-btn-text">开{{ gate_name.fg }}</text>
            </view>
            <view class="dev-btn primary" @click="gate_ctrl(false, true)">
                <text class="dev-btn-text">开{{ gate_name.bg }}</text>
            </view>
            <view class="dev-btn danger" @click="gate_ctrl(true, false)">
                <text class="dev-btn-text">关{{ gate_name.fg }}</text>
            </view>
            <view class="dev-btn danger" @click="gate_ctrl(false, false)">
                <text class="dev-btn-text">关{{ gate_name.bg }}</text>
            </view>
        </view>
    </view>

    <view class="section">
        <text class="section-title">抓拍识别</text>
        <view class="btn-grid">
            <view class="dev-btn success" @click="take_pic(true)">
                <text class="dev-btn-text">{{ gate_name.fg }}拍照</text>
            </view>
            <view class="dev-btn primary" @click="prepare_cap(true)">
                <text class="dev-btn-text">{{ gate_name.fg }}识别</text>
            </view>
            <view class="dev-btn warn" v-if="device.scale_status" @click="manual_scale">
                <text class="dev-btn-text">手动称重</text>
            </view>
            <view class="dev-btn success" @click="take_pic(false)">
                <text class="dev-btn-text">{{ gate_name.bg }}拍照</text>
            </view>
            <view class="dev-btn primary" @click="prepare_cap(false)">
                <text class="dev-btn-text">{{ gate_name.bg }}识别</text>
            </view>
            <view class="dev-btn danger" v-if="device.scale_status" @click="show_scale_reset = true">
                <text class="dev-btn-text">重置</text>
            </view>
        </view>
    </view>

    <fui-backdrop :zIndex="9000" :show="!!pic_path" @click="pic_path = ''">
        <view class="pic-wrap" @click.stop>
            <image class="pic-img" :src="pic_path" mode="aspectFit"></image>
            <view class="pic-close" @click="pic_path = ''">
                <text class="pic-close-text">关闭</text>
            </view>
        </view>
    </fui-backdrop>

    <fui-modal width="600" descr="确定要重置吗？" v-if="show_scale_reset" :show="show_scale_reset"
        @click="on_reset_modal"></fui-modal>

    <fui-modal width="600" v-if="show_cap" :show="show_cap" @click="on_cap_modal">
        <view class="cap-form">
            <label class="cap-title" for="dev-cap-plate">请输入车牌号</label>
            <input id="dev-cap-plate" name="dev-cap-plate" class="cap-input" type="text"
                :value="focus_plate" placeholder="不输入即直接抓拍识别"
                placeholder-class="cap-ph" @input="on_plate_input" />
        </view>
    </fui-modal>
</view>
</template>

<script>
export default {
    name: 'DevOpt',
    data: function () {
        return {
            pic_path: '',
            show_scale_confirm: false,
            show_scale_reset: false,
            show_cap: false,
            focus_plate: '',
            cap_enter: false,
        };
    },
    props: {
        device: {
            type: Object,
            default: () => ({}),
        },
        company: {
            type: Object,
            required: true,
            default: () => ({ access_control_permission: false, barriergate_control_permission: false }),
        }
    },
    computed: {
        gate_name: function () {
            let fg = '前门';
            let bg = '后门';
            if (this.device.scale_status == '') {
                fg = '入口';
                bg = '出口';
            }
            return {
                fg: fg,
                bg: bg,
            }
        },
    },
    methods: {
        prepare_cap: function (is_enter) {
            this.focus_plate = '';
            this.show_cap = true;
            this.cap_enter = is_enter;
        },
        on_plate_input: function (e) {
            this.focus_plate = (e && e.detail && e.detail.value != null) ? e.detail.value : '';
        },
        on_reset_modal: function (e) {
            if (e.index == 1) {
                this.reset_scale();
            } else {
                this.show_scale_reset = false;
            }
        },
        on_cap_modal: function (e) {
            if (e.index == 1) {
                this.trigger_cap(this.cap_enter);
            }
            this.show_cap = false;
        },
        pop_event: function () {
            this.$emit('refresh');
        },
        gate_ctrl: async function (is_enter, _is_open) {
            await this.$send_req('/scale/gate_ctrl', {
                is_enter: is_enter,
                is_open: _is_open,
                name: this.device.name,
            });
            this.pop_event();
        },
        take_pic: async function (is_enter) {
            let resp = await this.$send_req('/scale/take_pic', {
                is_enter: is_enter,
                name: this.device.name,
            });
            this.pic_path = resp.pic;
        },
        reset_scale: async function () {
            await this.$send_req('/scale/reset_scale', {
                name: this.device.name,
            });
            this.show_scale_reset = false;
            this.pop_event();
        },
        manual_scale: async function () {
            await this.$send_req('/scale/confirm_scale', {
                name: this.device.name
            });
            this.pop_event();
        },
        trigger_cap: async function (is_enter) {
            await this.$send_req('/scale/trigger_cap', {
                name: this.device.name,
                vehicle_number: this.focus_plate,
                is_enter: is_enter
            });
            this.pop_event();
        },
    }
}
</script>

<style scoped>
.dev-card {
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 18rpx;
    padding: 20rpx;
    margin-bottom: 14rpx;
}
.dev-head {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
}
.dev-head-main {
    flex: 1;
    min-width: 0;
}
.dev-name {
    display: block;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
}
.dev-status {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 600;
}
.dev-status.muted {
    color: #9AA3B8;
}
.dev-weight {
    flex-shrink: 0;
    min-width: 140rpx;
    padding: 10rpx 14rpx;
    border-radius: 12rpx;
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}
.dev-weight-label {
    font-size: 18rpx;
    color: #9AA3B8;
}
.dev-weight-value {
    margin-top: 2rpx;
    font-size: 28rpx;
    color: #2F3FCF;
    font-weight: 800;
}
.gate-status {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-top: 14rpx;
}
.gate-pill {
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
}
.gate-pill.ok {
    background: rgba(45, 190, 108, 0.12);
}
.gate-pill.bad {
    background: rgba(255, 77, 79, 0.12);
}
.gate-pill-text {
    font-size: 20rpx;
    font-weight: 700;
}
.gate-pill.ok .gate-pill-text {
    color: #1FA85A;
}
.gate-pill.bad .gate-pill-text {
    color: #FF4D4F;
}
.section {
    margin-top: 18rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #EEF1F8;
}
.section-title {
    display: block;
    margin-bottom: 12rpx;
    font-size: 22rpx;
    color: #6B7280;
    font-weight: 700;
}
.btn-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10rpx;
}
.dev-btn {
    flex: 1 1 40%;
    min-width: 40%;
    height: 68rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0 12rpx;
}
.dev-btn.primary { background: #465CFF; }
.dev-btn.success { background: #2DBE6C; }
.dev-btn.warn { background: #FF8A2B; }
.dev-btn.danger { background: #FF4D4F; }
.dev-btn-text {
    font-size: 24rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.pic-wrap {
    width: 86vw;
    max-width: 640rpx;
    background: #FFFFFF;
    border-radius: 20rpx;
    padding: 20rpx;
    box-sizing: border-box;
}
.pic-img {
    width: 100%;
    height: 60vh;
    display: block;
    background: #F4F6FB;
}
.pic-close {
    margin-top: 16rpx;
    height: 72rpx;
    border-radius: 12rpx;
    background: #465CFF;
    display: flex;
    align-items: center;
    justify-content: center;
}
.pic-close-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.cap-form {
    width: 100%;
    padding: 8rpx 8rpx 0;
    box-sizing: border-box;
}
.cap-title {
    display: block;
    margin-bottom: 16rpx;
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    text-align: center;
}
.cap-input {
    height: 80rpx;
    padding: 0 20rpx;
    border-radius: 12rpx;
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    font-size: 26rpx;
    color: #1A1F36;
    box-sizing: border-box;
}
.cap-ph {
    color: #B2B2B2;
    font-size: 26rpx;
}
</style>

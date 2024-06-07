<template>
<view>
    <u-cell-group :title="name + '-' + scale_status">
        <u-cell>
            <view slot="label">
                <u-row gutter="10" justify="space-between">
                    <u-col :span="3">
                        <u-button type="primary" size="mini" text="开前门" @click="gate_ctrl(true, true)"></u-button>
                    </u-col>
                    <u-col :span="3">
                        <u-button type="primary" size="mini" text="开后门" @click="gate_ctrl(false, true)"></u-button>
                    </u-col>
                    <u-col :span="3">
                        <u-button type="error" size="mini" text="关前门" @click="gate_ctrl(true, false)"></u-button>
                    </u-col>
                    <u-col :span="3">
                        <u-button type="error" size="mini" text="关后门" @click="gate_ctrl(false, false)"></u-button>
                    </u-col>
                </u-row>
            </view>
            <view slot="title">
                <u-row gutter="10" justify="space-between">
                    <u-col :span="4">
                        重量：{{cur_weight}}
                    </u-col>
                    <u-col :span="4">
                        <u-tag text="前门已关" v-if="enter_gate" plain shape="circle" size="mini" type="success"></u-tag>
                        <u-tag text="前门未关" v-else plain shape="circle" size="mini" type="error"></u-tag>
                    </u-col>
                    <u-col :span="4">
                        <u-tag text="后门已关" v-if="exit_gate" plain shape="circle" size="mini" type="success"></u-tag>
                        <u-tag text="后门未关" v-else plain shape="circle" size="mini" type="error"></u-tag>
                    </u-col>
                </u-row>
            </view>
        </u-cell>
        <u-cell>
            <view slot="title">
                <u-grid :col="3">
                    <u-grid-item>
                        <u-button type="success" size="mini" text="入口拍照" @click="take_pic(true)"></u-button>
                    </u-grid-item>
                    <u-grid-item>
                        <u-button type="primary" size="mini" text="入口识别" @click="prepare_cap(true)"></u-button>
                    </u-grid-item>
                    <u-grid-item>
                        <u-button type="warning" size="mini" text="手动称重" @click="manual_scale"></u-button>
                    </u-grid-item>
                    <u-grid-item>
                        <u-button type="success" size="mini" text="出口拍照" @click="take_pic(false)"></u-button>
                    </u-grid-item>
                    <u-grid-item>
                        <u-button type="primary" size="mini" text="出口识别" @click="prepare_cap(false)"></u-button>
                    </u-grid-item>
                    <u-grid-item>
                        <u-button type="error" size="mini" text="重置" @click="show_scale_reset = true"></u-button>
                    </u-grid-item>
                </u-grid>
            </view>
        </u-cell>
    </u-cell-group>
    <u-popup :show="pic_path.length != 0" mode="center" @close="pic_path = ''">
        <view>
            <u--image :src="pic_path"></u--image>
        </view>
    </u-popup>
    <u-modal :show="show_scale_reset" title="确定要重置吗?" closeOnClickOverlay @close="show_scale_reset = false" @confirm="reset_scale">
    </u-modal>
    <u-modal :show="show_cap" title="请输入车牌号" closeOnClickOverlay @close="show_cap = false" @confirm="trigger_cap(cap_enter)">
        <view>
            <u--input placeholder="不输入即直接抓拍识别" border="surround" v-model="focus_plate"></u--input>
        </view>
    </u-modal>
</view>
</template>

<script>
export default {
    name: 'DevOpt',
    data: function () {
        return {
            pic_path: '',
            show_scale_confirm:false,
            show_scale_reset:false,
            show_cap:false,
            focus_plate:'',
            cap_enter:false,
        };
    },
    props: {
        name: String,
        enter_gate: Boolean,
        exit_gate: Boolean,
        scale_status: String,
        cur_weight: String,
    },
    methods: {
        prepare_cap:function(is_enter) {
            this.show_cap = true;
            this.cap_enter = is_enter;
        },
        pop_event:function() {
            this.$emit('refresh');
        },
        gate_ctrl: async function (is_enter, _is_open) {
            await this.$send_req('/scale/gate_ctrl', {
                is_enter: is_enter,
                is_open: _is_open,
                name:this.name,
            });
            this.pop_event();
        },
        take_pic: async function (is_enter) {
            let resp = await this.$send_req('/scale/take_pic', {
                is_enter: is_enter,
                name:this.name,
            });
            this.pic_path = resp.pic;
        },
        reset_scale: async function () {
            await this.$send_req('/scale/reset_scale', {
                name:this.name,
            });
            this.show_scale_reset = false;
            this.pop_event();
        },
        manual_scale:async function () {
            await this.$send_req('/scale/confirm_scale', {
                name:this.name
            });
            this.pop_event();
        },
        trigger_cap: async function (is_enter) {
            await this.$send_req('/scale/trigger_cap', {
                name:this.name,
                vehicle_number:this.focus_plate,
                is_enter:is_enter
            });
            this.pop_event();
        },
    }
}
</script>

<style>

</style>

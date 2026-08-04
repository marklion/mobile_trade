<template>
<fui-modal :zIndex="1002" :buttons="[]" v-if="show_manual_weight" :show="show_manual_weight">
    <view class="mw-panel">
        <view class="mw-head">
            <text class="mw-title">计量信息</text>
            <text class="mw-sub" v-if="focus_plan && focus_plan.stuff">{{ focus_plan.stuff.name }}</text>
        </view>
        <scroll-view class="mw-scroll" scroll-y>
            <fui-form ref="form" :disabled="plan_owner">
                <view class="mw-section" v-if="!has_sct">
                    <text class="mw-section-title">一次计量</text>
                    <fui-form-item label="重量">
                        <fui-input v-model="form_data.first_weight" placeholder="请输入一次计量"></fui-input>
                    </fui-form-item>
                    <fui-form-item label="附件">
                        <fui-upload max="4" width="160" height="160" :fileList="first_weight_fileUrl" immediate
                            :url="upload_url" :sizeType="['compressed']" ref="first_weight_upload"
                            @success="handleFirstWeightSuccess" @complete="handleFirstWeightComplete" />
                    </fui-form-item>
                </view>
                <view class="mw-section" v-if="!has_sct">
                    <text class="mw-section-title">二次计量</text>
                    <fui-form-item label="重量">
                        <fui-input v-model="form_data.second_weight" placeholder="请输入二次计量"></fui-input>
                    </fui-form-item>
                    <fui-form-item label="附件">
                        <fui-upload max="4" width="160" height="160" :fileList="second_weight_fileUrl" immediate
                            :url="upload_url" :sizeType="['compressed']" ref="second_weight_upload"
                            @success="handleSecondWeightSuccess" @complete="handleSecondWeightComplete"></fui-upload>
                    </fui-form-item>
                </view>
                <view class="mw-section" v-if="has_sct">
                    <text class="mw-section-title">扩展计量</text>
                    <fui-form-item v-for="psi in focus_plan.plan_sct_infos" :key="psi.id"
                        :label="psi.sct_scale_item.name" @click="prepare_input_datetime(psi)">
                        <fui-input :disabled="psi.sct_scale_item.type == 'datetime'" v-model="psi.value"></fui-input>
                    </fui-form-item>
                </view>
                <view class="mw-section">
                    <text class="mw-section-title">装卸量</text>
                    <fui-form-item label="数量">
                        <fui-input v-model="form_data.count" placeholder="请输入装卸量,非0即关闭订单"></fui-input>
                    </fui-form-item>
                </view>
            </fui-form>
        </scroll-view>
        <view class="mw-actions">
            <view class="mw-btn ghost" @click="hide">
                <text class="mw-btn-text ghost">取消</text>
            </view>
            <view class="mw-btn success"
                v-if="focus_plan.stuff.checkout_delay && focus_plan.status != 3 && plan_owner && focus_plan.count > 0"
                @click="checkout_plan">
                <text class="mw-btn-text">结算</text>
            </view>
            <view class="mw-btn primary" v-if="!focus_plan.is_buy && !plan_owner" @click="confirm_manual_weight">
                <text class="mw-btn-text">提交</text>
            </view>
        </view>
    </view>
    <fui-date-picker :show="show_psi_datetime" type="5" :value="default_time" @change="confirm_psi_datetime"
        @cancel="show_psi_datetime = false"></fui-date-picker>
</fui-modal>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
export default {
    name: 'Measurement',
    props: {
        focus_plan: Object
    },
    data() {
        return {
            first_weight_upload: {
                urls: [],
                status: 'choose',
            },
            second_weight_upload: {
                urls: [],
                status: 'choose',
            },
            show_manual_weight: false,
            upload_url: this.$remote_url() + '/api/v1/upload_file',
            form_data: {
                first_weight: '',
                second_weight: '',
                count: 0,
                first_weight_fileList: '',
                second_weight_fileList: '',
                stuff: {
                    checkout_delay: false,
                }
            },
            focus_psi: undefined,
            show_psi_datetime: false,
            default_time: '',
        };
    },
    watch: {
        focus_plan: {
            handler: function (newVal, oldVal) {
                this.form_data = newVal;
            },
            deep: true
        }
    },
    computed: {
        has_sct: function () {
            let ret = false;
            if (this.focus_plan.plan_sct_infos && this.focus_plan.plan_sct_infos.length > 0) {
                ret = true;
            }
            return ret;
        },
        first_weight_fileUrl: function () {
            if (this.focus_plan.first_weight_fileList && this.focus_plan.first_weight_fileList != '') {
                return this.focus_plan.first_weight_fileList.split('|').map(ele => {
                    return this.$convert_attach_url(ele);
                });
            } else {
                return [];
            }
        },
        second_weight_fileUrl: function () {
            if (this.focus_plan.second_weight_fileList && this.focus_plan.second_weight_fileList != '') {
                return this.focus_plan.second_weight_fileList.split('|').map(ele => {
                    return this.$convert_attach_url(ele);
                });
            } else {
                return [];
            }
        },
        plan_owner: function () {
            let ret = false;
            let self = uni.getStorageSync('self_info');
            if (self.id == this.focus_plan.rbac_user.id) {
                ret = true;
            }
            return ret;
        },
    },
    methods: {
        handleFirstWeightSuccess(e) {
            this.first_weight_upload.status = e.status;
            if (e.res.data) {
                this.$refs.first_weight_upload.result(this.$convert_attach_url(e.res.data), e.index)
            }
        },
        handleSecondWeightSuccess(e) {
            this.second_weight_upload.status = e.status;
            if (e.res.data) {
                this.$refs.second_weight_upload.result(this.$convert_attach_url(e.res.data), e.index)
            }
        },
        async handleFirstWeightComplete(e) {
            this.first_weight_upload.status = e.status
            this.first_weight_upload.urls = e.urls.map(url => {
                return url.replace(this.$remote_url(), '')
            })
            if (e.status === 'success' && e.action === 'upload') {
                uni.showToast({
                    title: '上传完成！',
                    icon: 'success',
                    duration: 2000
                });
            }
        },
        async handleSecondWeightComplete(e) {
            this.second_weight_upload.status = e.status
            this.second_weight_upload.urls = e.urls.map(url => {
                return url.replace(this.$remote_url(), '')
            })
            if (e.status === 'success' && e.action === 'upload') {
                uni.showToast({
                    title: '上传完成！',
                    icon: 'success',
                    duration: 2000
                });
            }
        },
        show: function () {
            this.show_manual_weight = true;
        },
        hide: function () {
            this.show_manual_weight = false;
        },
        reset: function () {
            this.first_weight_file_len = 0;
            this.second_weight_file_len = 0;
            this.form_data = {
                first_weight: '',
                second_weight: '',
                count: 0,
                first_weight_fileList: '',
                second_weight_fileList: '',
            };
            this.$emit('refresh');
        },
        checkout_plan: async function () {
            await this.$send_req('/customer/checkout_plan', {
                plan_id: this.form_data.id
            });
            this.hide();
            this.reset();
        },
        confirm_psi_datetime: function (e) {
            this.focus_psi.value = e.result;
            this.show_psi_datetime = false;
        },
        prepare_input_datetime: function (psi) {
            if (psi.sct_scale_item.type != 'datetime') {
                return;
            }
            this.focus_psi = psi;
            this.show_psi_datetime = true;
            this.default_time = utils.dateFormatter(new Date(), 'y-m-d h:i', 4, false);
        },
        confirm_manual_weight: async function () {
            for (let index = 0; index < this.focus_plan.plan_sct_infos.length; index++) {
                const element = this.focus_plan.plan_sct_infos[index];
                await this.$send_req('/scale/input_psi_info', {
                    plan_id: this.focus_plan.id,
                    psi_id: element.id,
                    value: element.value
                });
            }
            if (!/^\d+(\.\d+)?$/.test(this.form_data.count)) {
                uni.showToast({
                    title: '装卸量必须为数字,未装卸完时请写0',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }
            let fwfs = this.form_data.first_weight_fileList;
            let swfs = this.form_data.second_weight_fileList;
            if (this.first_weight_upload.urls.length > 0) {
                fwfs = this.first_weight_upload.urls.join('|');
            }
            if (this.second_weight_upload.urls.length > 0) {
                swfs = this.second_weight_upload.urls.join('|');
            }

            let ret = await this.$send_req('/scale/manual_weight', {
                plan_id: this.form_data.id,
                first_weight: this.form_data.first_weight,
                second_weight: this.form_data.second_weight,
                count: Number(this.form_data.count) || 0,
                first_weight_fileList: fwfs,
                second_weight_fileList: swfs
            });
            if (ret.result) {
                uni.showToast({
                    title: '提交成功',
                    icon: 'success',
                    duration: 2000
                });
                this.show_manual_weight = false;
                this.$emit('refresh');
            } else {
                uni.showToast({
                    title: '提交失败',
                    icon: 'none',
                    duration: 2000
                });
            }
        },
    },
};
</script>

<style scoped>
.mw-panel {
    width: 100%;
    box-sizing: border-box;
    padding: 8rpx 8rpx 0;
}
.mw-head {
    padding: 8rpx 16rpx 20rpx;
    border-bottom: 1rpx solid #EEF1F8;
}
.mw-title {
    display: block;
    font-size: 34rpx;
    color: #1A1F36;
    font-weight: 700;
}
.mw-sub {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #6B7280;
}
.mw-scroll {
    max-height: 58vh;
    width: 100%;
    box-sizing: border-box;
}
.mw-section {
    margin-top: 16rpx;
    padding: 16rpx 12rpx 8rpx;
    background: #F8F9FD;
    border-radius: 16rpx;
    border: 1rpx solid #EEF1F8;
}
.mw-section-title {
    display: block;
    margin: 0 8rpx 8rpx;
    font-size: 24rpx;
    color: #2F3FCF;
    font-weight: 700;
}
.mw-actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 16rpx;
    padding: 20rpx 8rpx 8rpx;
}
.mw-btn {
    min-width: 160rpx;
    height: 72rpx;
    padding: 0 28rpx;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}
.mw-btn.ghost {
    background: #FFFFFF;
    border: 1rpx solid #D8DEEA;
}
.mw-btn.primary {
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
}
.mw-btn.success {
    background: #2DBE6C;
}
.mw-btn-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.mw-btn-text.ghost {
    color: #6B7280;
}
</style>

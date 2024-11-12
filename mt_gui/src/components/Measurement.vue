<!-- MeasurementComponent.vue -->
<template>
    <fui-modal :zIndex="1002" :buttons="[]" v-if="show_manual_weight" :show="show_manual_weight">
        <fui-form ref="form" :disabled="plan_owner">
            <fui-form-item label="一次计量">
                <fui-input v-model="form_data.first_weight" placeholder="请输入一次计量">
                </fui-input>
            </fui-form-item>
            <fui-form-item>
                <fui-upload max="4" width="80" height="80" :fileList="first_weight_fileUrl" immediate :url="upload_url"
                    :sizeType="['compressed']" ref="first_weight_upload" @success="handleFirstWeightSuccess"
                    @complete="handleFirstWeightComplete" />
            </fui-form-item>
            <fui-form-item label="二次计量">
                <fui-input v-model="form_data.second_weight" placeholder="请输入二次计量">
                </fui-input>
            </fui-form-item>
            <fui-form-item>
                <fui-upload max="4" width="80" height="80" :fileList="second_weight_fileUrl" immediate :url="upload_url"
                    :sizeType="['compressed']" ref="second_weight_upload" @success="handleSecondWeightSuccess"
                    @complete="handleSecondWeightComplete"></fui-upload>
            </fui-form-item>
            <fui-form-item label="装卸量">
                <fui-input v-model="form_data.count" placeholder="请输入装卸量"></fui-input>
            </fui-form-item>
        </fui-form>
        <view style="display: flex; justify-content: space-between;">
            <fui-button btnSize="small" text="取消" @click="hide"></fui-button>
            <fui-button
                v-if="focus_plan.stuff.checkout_delay && focus_plan.status != 3 && plan_owner && focus_plan.count > 0"
                btnSize="small" type="success" text="结算" @click="checkout_plan"></fui-button>
            <fui-button v-if="!focus_plan.is_buy && !plan_owner" btnSize="small" type="success" text="提交"
                @click="confirm_manual_weight"></fui-button>
        </view>

    </fui-modal>
</template>

<script>
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
            }
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
        first_weight_fileUrl: function () {
            if (this.focus_plan.first_weight_fileList != '') {
                return this.focus_plan.first_weight_fileList.split('|').map(ele => {
                    return this.$convert_attach_url(ele);
                });
            } else {
                return [];
            }
        },
        second_weight_fileUrl: function () {
            if (this.focus_plan.second_weight_fileList != '') {
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
        handleFirstWeightComplete(e) {
            this.first_weight_upload.status = e.status
            this.first_weight_upload.urls = e.urls
            if (e.status === 'success' && e.action === 'upload') {
                uni.showToast({
                    title: '上传完成！',
                    icon: 'success',
                    duration: 2000
                });
            }
        },
        handleSecondWeightComplete(e) {
            this.second_weight_upload.status = e.status
            this.second_weight_upload.urls = e.urls
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
        confirm_manual_weight: async function () {
            if (!/^\d+(\.\d+)?$/.test(this.form_data.count)) {
                uni.showToast({
                    title: '装卸量必须为数字',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }
            let ret = await this.$send_req('/scale/manual_weight', {
                plan_id: this.form_data.id,
                first_weight: this.form_data.first_weight,
                second_weight: this.form_data.second_weight,
                count: Number(this.form_data.count) || 0,
                first_weight_fileList: this.first_weight_upload.urls.join('|'),
                second_weight_fileList: this.second_weight_upload.urls.join('|'),
            });
            if (ret.result) {
                uni.showToast({
                    title: '提交成功',
                    icon: 'success',
                    duration: 2000
                });
                this.show_manual_weight = false;
                this.reset();
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
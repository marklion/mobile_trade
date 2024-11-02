<!-- MeasurementComponent.vue -->
<template>
<fui-modal :zIndex="1002" :buttons="[]" v-if="show_manual_weight" :show="show_manual_weight">
    <fui-form ref="form" :disabled="plan_owner">
        <fui-form-item label="一次计量">
            <fui-input v-model="form_data.first_weight" placeholder="请输入一次计量">
                <fui-button type="primary" btnSize="mini" @click="upload_first_weight">上传</fui-button>
            </fui-input>
        </fui-form-item>
        <fui-form-item>
            <fui-upload max="4" width="80" height="80" callUpload :fileList="first_weight_fileUrl" :sizeType="['compressed']" ref="first_weight_upload" @reupload="reupload_first_weight" @error="meet_upload_error" @complete="after_first_weight_action" />
        </fui-form-item>
        <fui-form-item label="二次计量">
            <fui-input v-model="form_data.second_weight" placeholder="请输入二次计量">
                <fui-button type="primary" btnSize="mini" @click="upload_second_weight">上传</fui-button>
            </fui-input>
        </fui-form-item>
        <fui-form-item>
            <fui-upload max="4" width="80" height="80" callUpload :fileList="second_weight_fileUrl" :sizeType="['compressed']" ref="second_weight_upload" @reupload="reupload_second_weight" @error="meet_upload_error" @complete="after_second_weight_action"></fui-upload>
        </fui-form-item>
        <fui-form-item label="装卸量">
            <fui-input v-model="form_data.count" type="number" placeholder="请输入装卸量"></fui-input>
        </fui-form-item>
    </fui-form>
    <view style="display: flex; justify-content: space-between;">
        <fui-button btnSize="small" text="取消" @click="hide"></fui-button>
        <fui-button v-if="focus_plan.stuff.checkout_delay && focus_plan.status != 3 && plan_owner && focus_plan.count > 0" btnSize="small" type="success" text="结算" @click="checkout_plan"></fui-button>
        <fui-button v-if="!focus_plan.is_buy && !plan_owner" btnSize="small" type="success" text="提交" @click="confirm_manual_weight"></fui-button>
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
            first_weight_file_len: 0,
            second_weight_file_len: 0,
            show_manual_weight: false,
            upload_url: this.$remote_url() + '/api/v1/upload_file',
            form_data: {
                first_weight: '',
                second_weight: '',
                count: '',
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
            this.$refs.form.validator(this.form_data, []).then(async res => {
                if (res.isPassed) {
                    let ret = await this.$send_req('/scale/manual_weight', {
                        plan_id: this.form_data.id,
                        first_weight: this.form_data.first_weight,
                        second_weight: this.form_data.second_weight,
                        count: Number(this.form_data.count) || 0,
                        first_weight_fileList: this.$refs.first_weight_upload.urls.map(url => url.replace(/^.*uploads\//, '/uploads/')).join('|'),
                        second_weight_fileList: this.$refs.second_weight_upload.urls.map(url => url.replace(/^.*uploads\//, '/uploads/')).join('|'),
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
                }
            }).catch(err => {
                console.log('validator', err);
            });
        },
        fileUpload: function (file) {
            return new Promise((resolve, reject) => {
                uni.uploadFile({
                    url: this.upload_url,
                    name: 'file',
                    filePath: file.path,
                    success: (res) => {
                        if (res.statusCode == 200) {
                            //返回上传成功后的图片
                            resolve(res.data)
                        } else {
                            //上传失败
                            reject(false)
                        }
                    },
                    fail: (err) => {
                        //上传失败
                        reject(false)
                    }
                })
            })
        },
        upload_first_weight: async function () {
            if (this.$refs.first_weight_upload.urls.length == 0) {
                uni.showToast({
                    title: '请选择一次计量图片',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }
            this.$refs.first_weight_upload.upload(this.fileUpload);
        },
        upload_second_weight: async function () {
            if (this.$refs.second_weight_upload.urls.length == 0) {
                uni.showToast({
                    title: '请选择二次计量图片',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }
            this.$refs.second_weight_upload.upload(this.fileUpload);
        },
        after_first_weight_action: function (e) {
            if (e.action == 'upload') {
                uni.showToast({
                    title: '上传成功',
                    icon: 'none',
                    duration: 2000
                });
            }
        },
        after_second_weight_action: function (e) {
            if (e.action == 'upload') {
                uni.showToast({
                    title: '上传成功',
                    icon: 'none',
                    duration: 2000
                });
            }
        },
        reupload_first_weight: function (e) {
            this.$refs.first_weight_upload.upload(this.fileUpload, e.index);
        },
        reupload_second_weight: function (e) {
            this.$refs.second_weight_upload.upload(this.fileUpload, e.index);
        },
    },
};
</script>

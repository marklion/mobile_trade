<template>
<fui-modal :zIndex="1002" :buttons="[]" v-if="show_manual_weight" :show="show_manual_weight">
    <div class="scrollable-container">
        <fui-form ref="form" :disabled="plan_owner">
            <fui-form-item label="一次计量" v-if="!has_sct">
                <fui-input v-model="form_data.first_weight" placeholder="请输入一次计量">
                </fui-input>
            </fui-form-item>
            <fui-form-item label="附件一">
                <fui-upload max="4" width="160" height="160" :fileList="first_weight_fileUrl" immediate :url="upload_url" :sizeType="['compressed']" ref="first_weight_upload" @success="handleFirstWeightSuccess" @complete="handleFirstWeightComplete" />
            </fui-form-item>
            <fui-form-item label="二次计量" v-if="!has_sct">
                <fui-input v-model="form_data.second_weight" placeholder="请输入二次计量">
                </fui-input>
            </fui-form-item>
            <fui-form-item label="附件二">
                <fui-upload max="4" width="160" height="160" :fileList="second_weight_fileUrl" immediate :url="upload_url" :sizeType="['compressed']" ref="second_weight_upload" @success="handleSecondWeightSuccess" @complete="handleSecondWeightComplete"></fui-upload>
            </fui-form-item>
            <fui-form-item v-for="psi in focus_plan.plan_sct_infos" :key="psi.id" :label="psi.sct_scale_item.name" @click="prepare_input_datetime(psi)">
                <fui-input :disabled="psi.sct_scale_item.type == 'datetime'" v-model="psi.value"></fui-input>
            </fui-form-item>
            <fui-form-item label="装卸量">
                <fui-input v-model="form_data.count" placeholder="请输入装卸量,非0即关闭订单"></fui-input>
            </fui-form-item>
        </fui-form>
        <view style="display: flex; justify-content: space-between;">
            <fui-button btnSize="small" text="取消" @click="hide"></fui-button>
            <fui-button v-if="focus_plan.stuff.checkout_delay && focus_plan.status != 3 && plan_owner && focus_plan.count > 0" btnSize="small" type="success" text="结算" @click="checkout_plan"></fui-button>
            <fui-button v-if="!focus_plan.is_buy && !plan_owner" btnSize="small" type="success" text="提交" @click="confirm_manual_weight"></fui-button>
        </view>
    </div>
    <fui-date-picker :show="show_psi_datetime" type="5" :value="default_time" @change="confirm_psi_datetime" @cancel="show_psi_datetime = false"></fui-date-picker>
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
.scrollable-container {
    max-height: 75vh;
    /* 最大高度为 75% 的视口高度 */
    overflow-y: auto;
    /* 超出时允许垂直滚动 */
}
</style>

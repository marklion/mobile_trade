<template>
    <el-drawer :visible.sync="show_manual_weight" destroy-on-close direction="rtl" size="60%">
        <template slot="default">
            <el-form ref="form" :disabled="plan_owner">
                <el-form-item label="一次计量" label-width="100px">
                    <el-input v-model="form_data.first_weight" placeholder="请输入一次计量" style="width: 300px"
                        clearable>
                    </el-input>
                </el-form-item>
                <el-form-item label-width="100px">
                    <el-upload ref="first_weight_uploader" :action="upload_url" :limit="4" :file-list="bind_first_weight_fileUrl" multiple
                        :on-success="handleUploadSuccess" 
                        :on-exceed="handleExceed"
                        :on-error="handleUploadError"
                        :on-preview="handlePreview" list-type="picture-card">
                        <el-button size="small" type="primary">上传</el-button>
                    </el-upload>
                </el-form-item>
                <el-form-item label="二次计量" label-width="100px">
                    <el-input v-model="form_data.second_weight" placeholder="请输入二次计量" style="width: 300px"
                        clearable>
                    </el-input>
                </el-form-item>
                <el-form-item label-width="100px">
                    <el-upload ref="second_weight_uploader" :action="upload_url" :limit="4" :file-list="bind_second_weight_fileUrl" multiple
                        :on-success="handleUploadSuccess" 
                        :on-exceed="handleExceed"
                        :on-error="handleUploadError"
                        :on-preview="handlePreview" list-type="picture-card">
                        <el-button size="small" type="primary">上传</el-button>
                    </el-upload>
                </el-form-item>
                <el-form-item label="装卸量" label-width="100px">
                    <el-input v-model="form_data.count" placeholder="请输入装卸量" style="width: 300px" clearable>
                    </el-input>
                </el-form-item>
                <el-form-item label-width="100px">
                    <el-button size="small" @click="hide">取消</el-button>
                    <el-button v-if="checkoutable && plan_owner" size="small" type="success" 
                        @click="checkout_plan">结算</el-button>
                    <el-button v-if="!focus_plan.is_buy && !plan_owner" size="small" type="success"
                        @click="confirm_manual_weight">提交</el-button>
                </el-form-item>
            </el-form>
            <el-image ref="preview_image" v-show="false" :src="preview_url" :preview-src-list="[preview_url]"
                fit="contain">
            </el-image>
        </template>
    </el-drawer>
</template>

<script>
export default {
    name: 'Measurement',
    props: {
        focus_plan: {
            type: Object,
            required: true,
            default: () => ({
                id: null,
                first_weight: '',
                second_weight: '',
                count: 0,
                first_weight_fileList: '',
                second_weight_fileList: '',
                stuff: {
                    checkout_delay: false,
                    manual_weight: false
                },
                status: 0,
                is_buy: false,
                rbac_user: {
                    id: null
                }
            })
        }
    },
    data() {
        return {
            show_preview: false,
            preview_url: '',
            first_weight_upload: {
                urls: []
            },
            second_weight_upload: {
                urls: []
            },
            show_manual_weight: false,
            upload_url: this.$make_file_url(),
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
            handler: function(newVal) {
                if(newVal) {
                    this.form_data = newVal;
                }
            },
            deep: true,
            immediate: true
        }
    },
    computed: {
        plan_owner() {
            const self = this.$store.getters.self_info;
            return self.id === this.focus_plan?.rbac_user?.id;
        },
        checkoutable() {
            return this.focus_plan?.stuff?.checkout_delay && this.focus_plan.status != 3 && this.focus_plan.count > 0;
        },
        bind_first_weight_fileUrl() {
            const fileList = this.form_data.first_weight_fileList || '';
            if(fileList) {
                return fileList.split('|').map(url => ({
                    name: url.split('/').pop(),
                    url: this.$make_file_url(url)
                }));
            }
        },
        bind_second_weight_fileUrl() {
            const fileList = this.form_data.second_weight_fileList || '';
            if(fileList) {
                return fileList.split('|').map(url => ({
                    name: url.split('/').pop(),
                    url: this.$make_file_url(url)
                }));
            }
        },
    },
    methods: {
        handleExceed() {
            this.$message.warning('最多只能上传4张图片');
        },
        handleUploadSuccess(res,file) {
            if(res) {
                this.$message.success(`${file.name}上传成功`);
            }
        },
        handleUploadError(err, file) {
            this.$message.error(`${file.name}上传失败`);
        },
        handlePreview(file) {
            this.preview_url = file.url;
            this.$refs.preview_image.showViewer = true;
        },
        show() {
            this.show_manual_weight = true;
        },
        hide() {
            this.show_manual_weight = false;
        },
        reset() {
            this.form_data = {
                first_weight: '',
                second_weight: '',
                count: 0,
                first_weight_fileList: '',
                second_weight_fileList: '',
            };
            this.first_weight_upload.urls = [];
            this.second_weight_upload.urls = [];
            this.$emit('refresh');
        },
        async checkout_plan() {
            await this.$send_req('/customer/checkout_plan', {
                plan_id: this.form_data.id
            });
            this.hide();
            this.reset();
        },
        async confirm_manual_weight() {
            if (!/^\d+(\.\d+)?$/.test(this.form_data.count)) {
                this.$message({
                    message: '装卸量必须为数字,未装卸完时请写0',
                    type: 'warning'
                });
                return;
            }
            let fwfs = this.$refs.first_weight_uploader.uploadFiles.map(item => {
                if(item.response) {
                    return item.response;
                }else{
                    return '/uploads/' + item.name;
                }
            });
            let swfs = this.$refs.second_weight_uploader.uploadFiles.map(item => {
                if(item.response) {
                    return item.response;
                }else{
                    return '/uploads/' + item.name;
                }
            });
            const ret = await this.$send_req('/scale/manual_weight', {
                plan_id: this.form_data.id,
                first_weight: this.form_data.first_weight,
                second_weight: this.form_data.second_weight,
                count: Number(this.form_data.count) || 0,
                first_weight_fileList: fwfs.join('|'),
                second_weight_fileList: swfs.join('|')
            });

            if (ret.result) {
                this.$message({
                    message: '提交成功',
                    type: 'success'
                });
                this.show_manual_weight = false;
                this.reset();
            } else {
                this.$message.error('提交失败');
            }
        },
    },
};
</script>

<template>
<div>
    <el-form :model="form" ref="form" label-position="left" :rules="rules">
        <el-form-item v-if="item.need_input" label="证件内容" prop="input">
            <el-input v-model="form.input" placeholder="请输入内容"></el-input>
        </el-form-item>
        <el-form-item v-if="item.need_attach" label="附件" prop="attachment">
            <el-upload ref="upload" :action="upload_url" list-type="picture-card" :on-preview="handlePictureCardPreview" :on-remove="handleRemove" :auto-upload="true" :limit="1" :on-success="handle_upload_result">
                <i class="el-icon-plus"></i>
            </el-upload>
            <el-dialog :visible.sync="dialogVisible">
                <img width="100%" :src="dialogImageUrl" alt="">
            </el-dialog>
        </el-form-item>
        <el-form-item v-if="item.need_expired" label="到期时间" prop="expired_time">
            <el-date-picker v-model="form.expired_time" type="date" placeholder="请输入到期时间" :default-value="new Date()" value-format="yyyy-MM-dd"></el-date-picker>
        </el-form-item>
    </el-form>
</div>
</template>

<script>
import moment from 'moment';
import {
    TableColumn
} from 'element-ui';
export default {
    name: 'UploadForm',
    components: {},
    props: {
        item: Object,
        plan: Object
    },
    computed: {

    },
    data: function () {
        return {
            form: {
                attachment: undefined,
                expired_time: undefined,
                input: undefined,
                open_id: this.plan.driver.open_id || "",
                plan_id: this.plan.id,
                req_id: this.item.id,
            },
            upload_url: "/api/v1/upload_file",

            rules: {
                attachment: [{
                    required: true,
                    message: '请上传附件',
                    trigger: 'change'
                }],
                input: [{
                    required: true,
                    message: '请输入证件内容',
                    trigger: 'change'
                }],
                expired_time: [{
                    required: true,
                    message: '请选择到期日期',
                    trigger: 'change'
                }]
            },
            dialogImageUrl: '',
            dialogVisible: false,
            disabled: true
        }
    },
    watch: {
        item(newItem) {
            this.form.req_id = newItem.id;
        }
    },
    methods: {
        handleRemove(file, fileList) {
            this.form.attachment = undefined;
        },
        handlePictureCardPreview(file) {
            this.dialogImageUrl = file.url;
            this.dialogVisible = true;
        },
        handlePictureCardPreview(file) {
            this.dialogImageUrl = file.url;
            this.dialogVisible = true;
        },
        handle_upload_result(resp, file, fileList) {
            this.form.attachment = resp;
        },
        resetFormData() {
            this.$refs.form.resetFields();
            this.$refs.upload.clearFiles();
        }
    },
    mounted: async function () {
        // console.log('表单启动', this.item)
        // this.init_contract();

    },
}
</script>

<style scoped>

</style>

<template>
<view>
    <fui-modal :zIndex="1003" width="600" :show="show" @click="upload_sc">
        <fui-form ref="upload">
            <fui-input v-if="need_input" label="证件内容" borderTop placeholder="请输入内容" v-model="upload_req.input"></fui-input>
            <fui-form-item v-if="need_attach" label="附件">
                <fui-upload max="1" :sizeType="['compressed']" immediate :fileList="fileList" :url="upload_url" ref="upload_kit" @success="after_attach_uploaded" @error="meet_upload_error" @complete="after_other_action"></fui-upload>
            </fui-form-item>
            <fui-input v-if="need_expired" label="到期日期" disabled borderTop placeholder="请输入时间" v-model="upload_req.expired_time" @click="show_pick_date = true"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-date-picker zIndex="1004" :show="show_pick_date" type="3" :value="default_date" @change="choose_expired_date" @cancel="show_pick_date = false"></fui-date-picker>
</view>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
export default {
    name: 'ScUpload',
    props: {
        plan_id: {
            type: Number,
            default: 0
        },
        req_id: {
            type: Number,
            default: 0
        },
        open_id: {
            type: String,
            default: ''
        },
        need_attach: {
            type: Boolean,
            default: false
        },
        need_input: {
            type: Boolean,
            default: false
        },
        need_expired: {
            type: Boolean,
            default: false
        },

    },
    data: function () {
        return {
            fileList: [],
            upload_url: this.$remote_url() + '/api/v1/upload_file',
            default_date: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            show: false,
            upload_req: {
                "attachment": "",
                "expired_time": "",
                "input": "",
                "open_id": "",
                "plan_id": 1,
                "req_id": 1
            },
            show_pick_date: false,
        };
    },
    methods: {
        choose_expired_date: function (e) {
            this.upload_req.expired_time = e.result;
            this.show_pick_date = false;
        },
        after_other_action: function (e) {
            if (e.action == 'delete') {
                this.upload_req.attachment = '';
            }
        },
        after_attach_uploaded: function (e) {
            this.upload_req.attachment = e.res.data
        },
        meet_upload_error: async function (e) {
            console.log('meet_upload_error');
            console.log(e);
        },
        upload_sc: async function (e) {
            if (e.index == 1) {
                this.upload_req.open_id = this.open_id;
                this.upload_req.plan_id = this.plan_id;
                this.upload_req.req_id = this.req_id;
                await this.$send_req('/sc/upload_sc_content', this.upload_req);
                this.$emit('uploaded')
            }
            this.show = false;
        },
        show_modal: function () {
            this.upload_req = {
                "attachment": "",
                "expired_time": "",
                "input": "",
                "open_id": "",
                "plan_id": 1,
                "req_id": 1
            };
            this.fileList = [];
            this.show = true;
        },
    },
}
</script>

<style>

</style>

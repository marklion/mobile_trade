<template>
<view>
    <fui-card v-if="!show_upload">
        <view>
            <image class="fui-cover" :src="(orig_attach?$convert_attach_url(orig_attach):'/static/no_att.jpg')" mode="widthFix"></image>
            <fui-date-picker :show="show_expire_date" type="3" :value="expire_date" @change="set_qualification_date" @cancel="show_expire_date = false"></fui-date-picker>
            <fui-button v-if="orig_attach"  type="link" color="#000" :text="!cur_exp_date?'设置有效期':`有效期至${cur_exp_date}`" @click="show_expire_date = true"></fui-button>
        </view>
        <view>
            <fui-button type="success" text="重新上传" @click="show_upload = true"></fui-button>
            <fui-button type="danger" text="删除" @click="confirm_delete = true"></fui-button>
        </view>
    </fui-card>
    <view v-if="show_upload">
        <fui-notice-bar :padding="['0','32rpx']" content="可以上传多张照片，系统会将其自动拼图" single></fui-notice-bar>
        <fui-upload ref="upload" :sizeType="['compressed']" :url="$remote_url() + '/api/v1/upload_file'" @success="upload_done"></fui-upload>
        <fui-button text="上传" type="primary" @click="upload_pics"></fui-button>
        <fui-button text="取消" color="#465CFF" borderColor="#465CFF" :plain="true" @click="show_upload = false"></fui-button>
    </view>

    <fui-modal width="600" descr="确定要删除吗？" v-if="confirm_delete" :show="confirm_delete" @click="do_delete">
    </fui-modal>
</view>
</template>

<script>
import moment from 'moment'
export default {
    name: 'CompanyAttach',
    data: function () {
        return {
            confirm_delete: false,
            show_upload: false,
            orig_attach: '',
            already_uploaded: [],
            show_expire_date: false,
            expire_date: moment().format('YYYY-MM-DD'),
            cur_exp_date:''
        };
    },
    methods: {
        do_delete: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/global/set_company_attach', {
                    attach: ''
                });
                this.init_attach();
            }
            this.confirm_delete = false;
        },
        init_attach: async function () {
            let resp = await this.$send_req('/global/get_company_attach', {});
            this.orig_attach = resp.attach;
        },
        upload_done: async function (e) {
            this.already_uploaded.push(e.res.data);
            if (e.status == 'success') {
                await this.merge_pics();
                uni.hideLoading();
            }
        },
        upload_pics: async function () {
            this.$refs.upload.start();
            uni.showLoading({
                title: '拼图上传',
                mask: true
            });
        },
        merge_pics: async function () {
            let whole_pic = await this.$send_req('/merge_pics', {
                pic_list: this.already_uploaded
            });
            await this.$send_req('/global/set_company_attach', {
                attach: whole_pic
            });
            this.init_attach();
            this.show_upload = false;
        },
        set_qualification_date: async function (date) {
            await this.$send_req('/global/set_qualification_expire_date', {
                expire_date: date.result
            });
            this.show_expire_date = false;
            await this.get_qualification_expire_date();
        },
        get_qualification_expire_date: async function () {
            let resp = await this.$send_req('/global/get_qualification_expire_date', {});
            this.cur_exp_date = resp.expire_date;
        },
    },
    onLoad: function () {
        this.init_attach();
        this.get_qualification_expire_date();
    },
}
</script>

<style scoped>
.fui-cover {
    width: 100%;
    height: 385rpx;
    display: block;
}
</style>

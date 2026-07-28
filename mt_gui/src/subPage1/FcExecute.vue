<template>
<view>
    <list-show ref="fc_table" :fetch_function="get_fc_plan_tables" :fetch_params="[plan_id]" height="95vh" v-model="tables">
        <view v-for="single_table in tables" :key="single_table.id">
            <fui-card :margin="['20rpx', '20rpx']" shadow="0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)" :title="single_table.name" :tag="single_table.fc_plan_table.finish_time?(single_table.fc_plan_table.finish_time + ' 提交人:' + single_table.fc_plan_table.rbac_user.name):'未提交'">
                <view style="display: flex; justify-content: flex-end;">
                    <fui-text text="一键检查" type="primary" @click="toggleAll(single_table)"></fui-text>
                </view>
                <view v-for="item in single_table.fc_plan_table.fc_check_results" :key="item.id">
                    <view v-if="item.field_check_item.need_photo" style="padding: 20rpx;">
                        <view style="margin-bottom: 12rpx;">{{item.field_check_item.name}}</view>
                        <fui-upload :ref="'photo_up_' + item.id" max="1" :sizeType="['compressed']" :sourceType="['camera']" :formData="{compress: '1'}" immediate :fileList="item.photo_file_list" :url="photo_upload_url" @success="after_photo_uploaded($event, item)" @complete="after_photo_complete($event, item)"></fui-upload>
                    </view>
                    <u--form v-else-if="item.field_check_item.need_input" labelPosition="left">
                        <u-form-item :label="item.field_check_item.name" borderBottom>
                            <u--input v-model="item.input" border="none"></u--input>
                            <u-button slot="right" @tap="input_fc(item.input, item)" text="保存" type="success" size="mini"></u-button>
                        </u-form-item>
                    </u--form>
                    <u-cell v-else :title="item.field_check_item.name">
                        <u-switch slot="value" inactiveColor="red" asyncChange :value="item.checked" @change="pass_fc($event, item)"></u-switch>
                    </u-cell>
                </view>
                <view style="display:flex; justify-content:center;">
                    <fui-button btnSize="small" text="提交检查" @click="commit(single_table)"></fui-button>
                </view>
            </fui-card>
        </view>
    </list-show>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'FcExecute',
    components: {
        ListShow,
    },
    data: function () {
        return {
            plan_id: 0,
            tables: [],
            photo_upload_url: this.$remote_url() + '/api/v1/upload_file?compress=1',
        }
    },
    methods: {
        get_photo_uploader: function (item) {
            let ref = this.$refs['photo_up_' + item.id];
            if (Array.isArray(ref)) {
                return ref[0];
            }
            return ref;
        },
        after_photo_uploaded: async function (e, item) {
            let path = e.res && e.res.data;
            if (typeof path === 'object' && path !== null) {
                path = path.result || path.url || path.path || '';
            }
            if (!path || typeof path !== 'string' || path.indexOf('/uploads/') !== 0) {
                uni.showToast({ title: '上传失败', icon: 'none' });
                return;
            }
            await this.$send_req('/sc/input_fc_item', {
                fc_result_id: item.id,
                input: path,
            });
            item.input = path;
            item.checked = true;
            const full_url = this.$convert_attach_url(path);
            const uploader = this.get_photo_uploader(item);
            if (uploader && typeof uploader.result === 'function' && e.index !== undefined) {
                uploader.result(full_url, e.index);
            }
            // fui-upload 的 fileList 需要字符串数组，不是 {url} 对象
            this.$set(item, 'photo_file_list', [full_url]);
        },
        after_photo_complete: async function (e, item) {
            if (e.action === 'delete') {
                await this.$send_req('/sc/input_fc_item', {
                    fc_result_id: item.id,
                    input: '',
                });
                item.input = '';
                item.checked = false;
                this.$set(item, 'photo_file_list', []);
            }
        },
        commit: async function (table) {
            await this.$send_req('/sc/commit_fc_plan', {
                fc_plan_id: table.fc_plan_table.id,
            });
            uni.startPullDownRefresh();
        },
        input_fc:async function(value, item) {
            await this.$send_req('/sc/input_fc_item', {
                fc_result_id: item.id,
                input: value,
            });
            item.input = value;
        },
        pass_fc: async function (value, item) {
            await this.$send_req('/sc/set_fc_pass', {
                fc_result_id: item.id,
                is_pass: value,
            });
            item.checked = value;
        },
        get_fc_plan_tables: async function (pageNo, [plan_id]) {
            let resp = await this.$send_req('/sc/get_fc_plan_table', {
                plan_id: plan_id,
                pageNo: pageNo,
            });
            resp.fc_plan_tables.forEach((table) => {
                table.fc_plan_table.fc_check_results.forEach((item) => {
                    item.checked = item.pass_time && item.pass_time.length > 0;
                    if (item.field_check_item.need_photo && item.input) {
                        item.photo_file_list = [this.$convert_attach_url(item.input)];
                    } else {
                        item.photo_file_list = [];
                    }
                });
            });
            return resp.fc_plan_tables;
        },
        toggleAll: async function (table) {
            for (let item of table.fc_plan_table.fc_check_results) {
                if (!item.field_check_item.need_input && !item.field_check_item.need_photo) {
                    await this.pass_fc(true, item);
                }
            }
            await this.commit(table);
        },
    },
    onLoad: function (options) {
        this.plan_id = parseInt(options.plan_id);
    },
    onPullDownRefresh: function () {
        this.$refs.fc_table.refresh();
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

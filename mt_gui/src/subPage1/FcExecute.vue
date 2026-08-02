<template>
<view class="fc-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">现场检查</text>
            <text class="hero-title">检查表</text>
            <text class="hero-sub">共 {{ tables.length }} 张表</text>
        </view>
    </view>

    <view class="shell">
        <view class="table-card" v-for="single_table in tables" :key="single_table.id">
            <view class="table-head">
                <view class="table-head-main">
                    <text class="table-name">{{ single_table.name }}</text>
                    <text class="table-meta done" v-if="single_table.fc_plan_table.finish_time">
                        {{ single_table.fc_plan_table.finish_time }} · {{ single_table.fc_plan_table.rbac_user.name }}
                    </text>
                    <text class="table-meta" v-else>未提交</text>
                </view>
                <view class="table-onekey" @click="toggleAll(single_table)">
                    <text class="table-onekey-text">一键检查</text>
                </view>
            </view>

            <view class="item-row" v-for="item in single_table.fc_plan_table.fc_check_results" :key="item.id">
                <view class="item-photo" v-if="item.field_check_item.need_photo">
                    <text class="item-label">{{ item.field_check_item.name }}</text>
                    <fui-upload :ref="'photo_up_' + item.id" max="1" :sizeType="['compressed']"
                        :sourceType="['camera']" :formData="{compress: '1'}" immediate
                        :fileList="item.photo_file_list" :url="photo_upload_url"
                        @success="after_photo_uploaded($event, item)"
                        @complete="after_photo_complete($event, item)"></fui-upload>
                </view>

                <view class="item-input" v-else-if="item.field_check_item.need_input">
                    <text class="item-label">{{ item.field_check_item.name }}</text>
                    <view class="item-input-row">
                        <input class="item-input-field" type="text" :value="item.input || ''"
                            placeholder="请输入内容" placeholder-class="item-input-ph"
                            @input="on_item_input($event, item)" />
                        <view class="item-save" @click="input_fc(item.input || '', item)">
                            <text class="item-save-text">保存</text>
                        </view>
                    </view>
                </view>

                <view class="item-check" v-else>
                    <text class="item-label flex">{{ item.field_check_item.name }}</text>
                    <fui-switch :checked="!!item.checked" color="#2DBE6C"
                        @change="on_switch_change($event, item)"></fui-switch>
                </view>
            </view>

            <view class="table-foot">
                <view class="table-submit" @click="commit(single_table)">
                    <text class="table-submit-text">提交检查</text>
                </view>
            </view>
        </view>

        <view class="empty" v-if="!tables.length && !loading">
            <text class="empty-text">暂无检查表</text>
        </view>
    </view>
</view>
</template>

<script>
export default {
    name: 'FcExecute',
    data: function () {
        return {
            plan_id: 0,
            tables: [],
            loading: false,
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
            await this.load_tables();
        },
        on_item_input: function (e, item) {
            var val = (e && e.detail && e.detail.value != null) ? e.detail.value : '';
            this.$set(item, 'input', val);
        },
        input_fc: async function (value, item) {
            await this.$send_req('/sc/input_fc_item', {
                fc_result_id: item.id,
                input: value == null ? '' : value,
            });
            item.input = value == null ? '' : value;
            uni.showToast({ title: '已保存', icon: 'success' });
        },
        on_switch_change: function (e, item) {
            var value = !!(e && e.detail && e.detail.value);
            this.pass_fc(value, item);
        },
        pass_fc: async function (value, item) {
            await this.$send_req('/sc/set_fc_pass', {
                fc_result_id: item.id,
                is_pass: value,
            });
            item.checked = value;
        },
        decorate_tables: function (list) {
            var vue_this = this;
            (list || []).forEach(function (table) {
                table.fc_plan_table.fc_check_results.forEach(function (item) {
                    item.checked = item.pass_time && item.pass_time.length > 0;
                    if (item.input == null) {
                        item.input = '';
                    }
                    if (item.field_check_item.need_photo && item.input) {
                        item.photo_file_list = [vue_this.$convert_attach_url(item.input)];
                    } else {
                        item.photo_file_list = [];
                    }
                });
            });
            return list || [];
        },
        load_tables: async function () {
            if (!this.plan_id) {
                this.tables = [];
                return;
            }
            this.loading = true;
            try {
                var all = [];
                var pageNo = 0;
                while (pageNo < 20) {
                    var resp = await this.$send_req('/sc/get_fc_plan_table', {
                        plan_id: this.plan_id,
                        pageNo: pageNo,
                    });
                    var chunk = resp.fc_plan_tables || [];
                    if (!chunk.length) {
                        break;
                    }
                    all = all.concat(chunk);
                    pageNo++;
                    if (chunk.length < 20) {
                        break;
                    }
                }
                this.tables = this.decorate_tables(all);
            } catch (err) {
                console.log('load_tables error', err);
                this.tables = [];
            }
            this.loading = false;
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
        this.load_tables();
    },
    onPullDownRefresh: async function () {
        await this.load_tables();
        uni.stopPullDownRefresh();
    },
}
</script>

<style scoped>
.fc-page {
    min-height: 100vh;
    background: #F4F6FB;
    padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}
.hero {
    position: relative;
    padding: 28rpx 28rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}
.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 240rpx;
    height: 240rpx;
    opacity: 0.16;
    pointer-events: none;
}
.hero-logo-img {
    width: 100%;
    height: 100%;
}
.hero-copy {
    position: relative;
    z-index: 1;
}
.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}
.hero-title {
    display: block;
    margin-top: 10rpx;
    font-size: 40rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.hero-sub {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.88);
}
.shell {
    margin: -24rpx 20rpx 0;
}
.table-card {
    background: #FFFFFF;
    border-radius: 20rpx;
    border: 1rpx solid #EEF1F8;
    box-shadow: 0 8rpx 24rpx rgba(40, 58, 120, 0.06);
    margin-bottom: 16rpx;
    overflow: hidden;
}
.table-head {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
    padding: 22rpx 20rpx 16rpx;
    border-bottom: 1rpx solid #F2F4FA;
}
.table-head-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}
.table-name {
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
}
.table-meta {
    font-size: 22rpx;
    color: #FF8A2B;
    font-weight: 600;
}
.table-meta.done {
    color: #1FA85A;
}
.table-onekey {
    flex-shrink: 0;
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.1);
}
.table-onekey-text {
    font-size: 22rpx;
    color: #2F3FCF;
    font-weight: 700;
}
.item-row {
    padding: 18rpx 20rpx;
    border-bottom: 1rpx solid #F5F7FC;
}
.item-label {
    display: block;
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 12rpx;
}
.item-label.flex {
    flex: 1;
    min-width: 0;
    margin-bottom: 0;
    padding-right: 16rpx;
}
.item-check {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}
.item-input-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12rpx;
}
.item-input-field {
    flex: 1;
    min-width: 0;
    height: 72rpx;
    padding: 0 20rpx;
    border-radius: 12rpx;
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    font-size: 26rpx;
    color: #1A1F36;
    box-sizing: border-box;
}
.item-input-ph {
    color: #B2B2B2;
    font-size: 26rpx;
}
.item-save {
    flex-shrink: 0;
    min-width: 112rpx;
    height: 72rpx;
    padding: 0 24rpx;
    border-radius: 12rpx;
    background: #2DBE6C;
    display: flex;
    align-items: center;
    justify-content: center;
}
.item-save-text {
    font-size: 26rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.table-foot {
    padding: 20rpx;
}
.table-submit {
    height: 80rpx;
    border-radius: 16rpx;
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 16rpx rgba(47, 63, 207, 0.22);
}
.table-submit-text {
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.empty {
    padding: 80rpx 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    border-radius: 20rpx;
}
.empty-text {
    font-size: 26rpx;
    color: #9AA3B8;
}
</style>

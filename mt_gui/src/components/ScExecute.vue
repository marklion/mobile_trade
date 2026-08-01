<template>
<div class="sc_execute_show">
    <view class="sc-head">
        <view class="sc-head-left">
            <text class="sc-head-title">安检审批</text>
            <text class="sc-head-count" v-if="sc_data2show.length">{{ passed_count }}/{{ sc_data2show.length }}</text>
        </view>
        <text
            class="sc-head-status"
            :class="(sc_data2show.length > 0 && sc_data2show[0].passed_total) ? 'ok' : 'bad'"
        >
            {{ (sc_data2show.length > 0 && sc_data2show[0].passed_total) ? '通过' : '未通过' }}
        </text>
    </view>
    <list-show ref="sc_confirm" v-model="sc_data2show" :fetch_function="get_plan_sc" height="62vh" :fetch_params="[focus_plan.id]">
        <view class="sc-grid">
            <view class="sc-card" v-for="item in sc_data2show" :key="item.id">
                <view class="sc-card-top" @click="item.sc_content && item.sc_content.attachment && show_image(item.sc_content.attachment)">
                    <view class="sc-thumb-wrap">
                        <image
                            v-if="item.sc_content && item.sc_content.attachment"
                            class="sc-thumb"
                            :src="$convert_attach_url(item.sc_content.attachment)"
                            mode="aspectFill"
                        ></image>
                        <view class="sc-thumb sc-thumb-empty" v-else>
                            <text class="sc-thumb-empty-text">无</text>
                        </view>
                        <view class="sc-status-dot" :class="'d-' + sc_status_string(item.sc_content).type"></view>
                    </view>
                    <view class="sc-card-copy">
                        <text class="sc-card-name">{{ item.name }}</text>
                        <text class="sc-card-meta" v-if="item.sc_content">
                            {{ item.need_expired ? item.sc_content.expired_time : '长期' }}
                            <text v-if="item.sc_content.checker"> · {{ item.sc_content.checker }}</text>
                        </text>
                        <text class="sc-card-meta muted" v-else>待上传</text>
                        <text class="sc-card-comment" v-if="item.sc_content && item.sc_content.comment">{{ item.sc_content.comment }}</text>
                    </view>
                </view>
                <view class="sc-card-actions">
                    <text class="sc-tag" :class="'t-' + sc_status_string(item.sc_content).type">
                        {{ sc_status_string(item.sc_content).text }}
                    </text>
                    <view class="sc-act-group">
                        <view class="sc-act primary" v-if="!item.sc_content" @click="prepare_upload_sc(item)">
                            <text class="sc-act-text">代传</text>
                        </view>
                        <template v-else-if="item.sc_content">
                            <view class="sc-act danger" v-if="!item.sc_content.passed" @click="prepare_delete_sc(item)">
                                <text class="sc-act-text">删除</text>
                            </view>
                            <view class="sc-act success" v-if="!item.sc_content.passed" @click="pass_sc(item.sc_content.id)">
                                <text class="sc-act-text">通过</text>
                            </view>
                            <view class="sc-act danger" v-else @click="prepare_reject_sc(item)">
                                <text class="sc-act-text">反审</text>
                            </view>
                            <view class="sc-act warn" v-if="!item.sc_content.passed" @click="prepare_reject_sc(item)">
                                <text class="sc-act-text">附言</text>
                            </view>
                        </template>
                    </view>
                </view>
            </view>
        </view>
    </list-show>
    <sc-upload ref="sc_up" @uploaded="refresh" :prompt="upload_sc.prompt" :title="upload_sc.name" :open_id="upload_sc.open_id" :plan_id="upload_sc.plan_id" :req_id="upload_sc.req_id" :need_attach="upload_sc.need_attach" :need_expired="upload_sc.need_expired" :need_input="upload_sc.need_input"></sc-upload>
    <fui-modal :zIndex="1003" width="600" descr="确定要删除吗？" v-if="show_delete_sc_content" :show="show_delete_sc_content" @click="delete_sc_content">
    </fui-modal>
    <fui-backdrop :zIndex="8888" :show="show_one_att" @click="show_one_att = false">
        <view class="image-viewer-container" @click.stop>
            <movable-area scale-area class="movable-area">
                <movable-view class="movable-view" direction="all" inertia scale scale-min="1" scale-max="6">
                    <image class="lookimg" :src="one_att.length>0?one_att[0]:''" mode="aspectFit"></image>
                </movable-view>
            </movable-area>
            <view class="close-button-container">
                <fui-icon @click="show_one_att=false" name="close" size="80" color="white"></fui-icon>
            </view>
        </view>
    </fui-backdrop>

    <fui-modal :zIndex="1004" width="600" v-if="show_reject_sc" :show="show_reject_sc" @click="reject_sc">
        <fui-input required label="附言" borderTop placeholder="请输入附言" v-model="reject_sc_comment"></fui-input>
    </fui-modal>
</div>
</template>

<script>
import ListShow from './ListShow.vue';
import ScUpload from './ScUpload.vue';
export default {
    name: 'ScExecute',
    components: {
        "list-show": ListShow,
        "sc-upload": ScUpload,
    },
    props: {
        focus_plan: {
            type: Object,
            default: () => ({})
        },
    },
    data: function () {
        return {
            show_reject_sc: false,
            one_att: [''],
            show_one_att: false,
            sc_data2show: [],
            show_delete_sc_content: false,
            upload_sc: {
                plan_id: 0,
                open_id: '',
                req_id: 0,
                content_id: 0,
                need_attach: false,
                need_expired: false,
                need_input: false,
                name: '',
                prompt: '',
            },
            focus_sc_content_id: 0,
            reject_sc_comment: '',
        };
    },
    computed: {
        passed_count: function () {
            return (this.sc_data2show || []).filter(item => item.sc_content && item.sc_content.passed).length;
        },
    },
    methods: {
        refresh: function () {
            // 每次刷新安检列表时，重置图片预览状态，避免再次打开审批时自动弹出上次查看的大图
            this.show_one_att = false;
            this.one_att = [''];
            this.$refs.sc_confirm.refresh();
        },
        prepare_reject_sc: function (item) {
            this.show_reject_sc = true;
            this.focus_sc_content_id = item.sc_content.id;
            this.reject_sc_comment = '';
        },
        get_plan_sc: async function (pageNo, [id]) {
            if (!id) {
                return [];
            }
            let res = await this.$send_req('/sc/plan_status', {
                pageNo: pageNo,
                plan_id: id
            });
            if (res.reqs.length > 0) {
                res.reqs[0].passed_total = res.passed;
            }
            return res.reqs;
        },
        prepare_upload_sc: function (item) {
            this.upload_sc.req_id = item.id;
            this.upload_sc.plan_id = this.focus_plan.id;
            this.upload_sc.open_id = this.focus_plan.driver.open_id;
            if (item.sc_content) {
                this.upload_sc.content_id = item.sc_content.id;
            }
            this.upload_sc.need_attach = item.need_attach;
            this.upload_sc.need_expired = item.need_expired;
            this.upload_sc.need_input = item.need_input;
            this.upload_sc.name = item.name;
            this.upload_sc.prompt = item.prompt;
            this.$refs.sc_up.show_modal();
        },
        prepare_delete_sc: function (item) {
            this.upload_sc.content_id = item.sc_content.id;
            this.show_delete_sc_content = true;
        },
        delete_sc_content: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/global/driver_delete_sc_content', {
                    content_id: this.upload_sc.content_id,
                    open_id: ''
                });
                this.$refs.sc_confirm.refresh();
            }
            this.show_delete_sc_content = false;
        },
        sc_status_string: function (item) {
            let ret = {
                text: '未上传',
                type: 'warning'
            }
            if (item) {
                if (item.passed) {
                    ret.text = '已通过';
                    ret.type = 'success';
                } else {
                    ret.text = '未通过';
                    ret.type = 'danger';
                }
            }
            return ret;
        },
        pass_sc: async function (id, comment) {
            await this.$send_req('/sc/check', {
                content_id: id,
                comment: comment,
                plan_id: this.focus_plan.id
            });
            this.$refs.sc_confirm.refresh();
        },
        reject_sc: async function (e) {
            if (e.index == 1) {
                if (!this.reject_sc_comment) {
                    uni.showToast({
                        title: '请填写附言',
                        icon: 'none',
                        duration: 2000
                    });
                    return;
                }
                await this.pass_sc(this.focus_sc_content_id, this.reject_sc_comment);
            }
            this.show_reject_sc = false;
        },
        show_image: function (attachment) {
            this.show_one_att = true;
            this.one_att = [this.$convert_attach_url(attachment)];
        },
    },
}
</script>

<style scoped>
.sc_execute_show {
    height: 100%;
    width: 100%;
    background: #F2F4FA;
}
.sc-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 22rpx 24rpx 16rpx;
    background: #FFFFFF;
    border-bottom: 1rpx solid #EEF1F8;
}
.sc-head-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12rpx;
    min-width: 0;
}
.sc-head-title {
    font-size: 32rpx;
    color: #1A1F36;
    font-weight: 700;
}
.sc-head-count {
    font-size: 22rpx;
    color: #465CFF;
    font-weight: 700;
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.1);
}
.sc-head-status {
    font-size: 24rpx;
    font-weight: 700;
    padding: 6rpx 16rpx;
    border-radius: 999rpx;
}
.sc-head-status.ok {
    color: #1FA85A;
    background: rgba(45, 190, 108, 0.12);
}
.sc-head-status.bad {
    color: #FF4D4F;
    background: rgba(255, 77, 79, 0.12);
}
.sc-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 12rpx 12rpx 24rpx;
}
.sc-card {
    width: 50%;
    box-sizing: border-box;
    padding: 8rpx;
}
.sc-card-top {
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-bottom: none;
    border-radius: 14rpx 14rpx 0 0;
    padding: 14rpx;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 12rpx;
}
.sc-thumb-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: 10rpx;
    overflow: hidden;
    flex-shrink: 0;
    background: #E8ECF5;
    position: relative;
}
.sc-thumb {
    width: 72rpx;
    height: 72rpx;
    display: block;
}
.sc-thumb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}
.sc-thumb-empty-text {
    font-size: 20rpx;
    color: #9AA3B8;
}
.sc-status-dot {
    position: absolute;
    right: 4rpx;
    bottom: 4rpx;
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    border: 2rpx solid #FFFFFF;
    box-sizing: border-box;
}
.sc-status-dot.d-success { background: #2DBE6C; }
.sc-status-dot.d-danger { background: #FF4D4F; }
.sc-status-dot.d-warning { background: #FF8A2B; }
.sc-card-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
}
.sc-card-name {
    font-size: 22rpx;
    color: #1A1F36;
    font-weight: 600;
    line-height: 1.3;
    height: 56rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-all;
}
.sc-card-meta {
    font-size: 18rpx;
    color: #6B7CFF;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.sc-card-meta.muted {
    color: #9AA3B8;
}
.sc-card-comment {
    font-size: 18rpx;
    color: #FF8A2B;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.sc-card-actions {
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-top: 1rpx solid #F2F4FA;
    border-radius: 0 0 14rpx 14rpx;
    padding: 8rpx 12rpx;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8rpx;
    min-height: 56rpx;
}
.sc-tag {
    flex-shrink: 0;
    font-size: 18rpx;
    font-weight: 700;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
}
.sc-tag.t-success {
    color: #1FA85A;
    background: rgba(45, 190, 108, 0.12);
}
.sc-tag.t-danger {
    color: #FF4D4F;
    background: rgba(255, 77, 79, 0.12);
}
.sc-tag.t-warning {
    color: #FF8A2B;
    background: rgba(255, 138, 43, 0.12);
}
.sc-act-group {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8rpx;
}
.sc-act {
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
}
.sc-act-text {
    font-size: 20rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.sc-act.primary { background: #465CFF; }
.sc-act.success { background: #2DBE6C; }
.sc-act.warn { background: #FF8A2B; }
.sc-act.danger { background: #FF4D4F; }

.close-button-container {
    position: absolute;
    bottom: 40rpx;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 8889;
}

.image-viewer-container {
    width: 100%;
    height: 100%;
    position: relative;
    padding-bottom: 200rpx;
    box-sizing: border-box;
}

.movable-view {
    height: 100%;
    width: 100%;
}

.movable-area {
    height: 100%;
    width: 100%;
    overflow: hidden;
    z-index: 9999;
}

.lookimg {
    width: 100%;
    height: 100%;
    display: block;
}
</style>

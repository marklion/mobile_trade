<template>
<div class="sc_execute_show">
    <u-cell title="安检结果">
        <view slot="value">
            <fui-text v-if="(sc_data2show.length > 0 && sc_data2show[0].passed_total)" type="success" text="通过"></fui-text>
            <fui-text v-else type="danger" text="未通过"></fui-text>
        </view>
    </u-cell>
    <list-show ref="sc_confirm" v-model="sc_data2show" :fetch_function="get_plan_sc" height="70vh" :fetch_params="[focus_plan.id]">
        <view v-for="item in sc_data2show" :key="item.id">
            <u-cell>
                <view slot="icon">
                    <fui-button v-if="!item.sc_content" type="primary" btnSize="mini" text="代传" @click="prepare_upload_sc(item)"></fui-button>
                    <fui-button v-else-if="!item.sc_content.passed" type="danger" btnSize="mini" text="删除" @click="prepare_delete_sc(item)"></fui-button>
                </view>
                <view slot="label" style="font-size:14px;color:gray;">
                    <view v-if="item.sc_content">
                        <view>
                            {{item.need_expired?('到期时间：' + item.sc_content.expired_time):'长期有效'}}
                        </view>
                        <view v-if="item.sc_content">
                            <view v-if="item.sc_content.checker">
                                审批人：{{item.sc_content.checker}}
                            </view>
                            <view v-if="item.sc_content.comment">
                                附言：{{item.sc_content.comment}}
                            </view>
                            <view v-if="item.sc_content.check_time">
                                审批时间：{{item.sc_content.check_time}}
                            </view>
                        </view>
                    </view>
                </view>
                <view slot="title">
                    {{item.name}}
                    <fui-tag theme="plain" :text="sc_status_string(item.sc_content).text" :scaleRatio="0.8" :type="sc_status_string(item.sc_content).type"></fui-tag>
                </view>
                <view slot="value">
                    <view v-if="item.sc_content">
                        {{item.sc_content.input}}
                        <fui-avatar v-if="item.sc_content.attachment" :src="$convert_attach_url(item.sc_content.attachment)" @click="show_one_att = true;one_att=[$convert_attach_url( item.sc_content.attachment)]"></fui-avatar>
                    </view>
                </view>
                <view slot="right-icon">
                    <view v-if="item.sc_content">
                        <fui-button type="success" v-if="!item.sc_content.passed" btnSize="mini" text="通过" @click="pass_sc(item.sc_content.id)"></fui-button>
                        <fui-button type="danger" v-else btnSize="mini" text="反审" @click="prepare_reject_sc(item)"></fui-button>
                        <fui-button type="warning" v-if="!item.sc_content.passed" btnSize="mini" text="附言" @click="prepare_reject_sc(item)"></fui-button>
                    </view>
                </view>
            </u-cell>
        </view>
    </list-show>
    <sc-upload ref="sc_up" @uploaded="refresh" :prompt="upload_sc.prompt" :title="upload_sc.name" :open_id="upload_sc.open_id" :plan_id="upload_sc.plan_id" :req_id="upload_sc.req_id" :need_attach="upload_sc.need_attach" :need_expired="upload_sc.need_expired" :need_input="upload_sc.need_input"></sc-upload>
    <fui-modal :zIndex="1003" width="600" descr="确定要删除吗？" v-if="show_delete_sc_content" :show="show_delete_sc_content" @click="delete_sc_content">
    </fui-modal>
    <fui-backdrop :zIndex="8888" :show="show_one_att">
        <movable-area scale-area class="movable-area">
            <movable-view class="movable-view" direction="all" inertia scale scale-min="1" scale-max="6">
                <image class="lookimg" :src="one_att.length>0?one_att[0]:''" mode="aspectFit"></image>
            </movable-view>
            <view class="close-button-container">
                <fui-icon @click="show_one_att=false" name="close" size="80" color="white"></fui-icon>
            </view>
        </movable-area>
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
    methods: {
        refresh:function() {
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
    },
}
</script>

<style>

</style>

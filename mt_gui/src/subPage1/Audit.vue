<template>
<view>
    <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
    <list-show ref="audit_record" :fetch_function="get_ar" height="90vh" :fetch_params="[focus_audit_status]" v-model="cur_ar">
        <view v-for="single_r in cur_ar" :key="single_r.id" class="record_item">
            <u-cell :title="single_r.comment">
                <view slot="value">
                    <view>{{single_r.submiter}} 提交</view>
                    <view v-if="single_r.auditer">{{single_r.auditer}} 审核</view>
                </view>
                <view slot="right-icon">
                    <view v-if="!single_r.audit_time && !single_r.close_time">
                        <fui-button type="success" btnSize="mini" text="通过" @click="audit_req(single_r.id, true)"></fui-button>
                        <fui-button type="danger" btnSize="mini" text="拒绝" @click="audit_req(single_r.id, false)"></fui-button>
                    </view>
                </view>
                <view slot="label">
                    <fui-tag theme="plain" :scaleRatio="0.8" :text="single_r.url_name" type="primary"></fui-tag>
                </view>
            </u-cell>
            <view class="status_tags">
                <u-tag v-if="single_r.submit_time" :text="single_r.submit_time + '请求'" plain size="mini" type="warning"></u-tag>
                <u-tag v-if="single_r.audit_time" :text="single_r.audit_time+ '审批'" type="success" plain size="mini"></u-tag>
                <u-tag v-if="single_r.close_time" :text="single_r.close_time+ '驳回'" type="error" plain size="mini"></u-tag>
            </view>
        </view>
    </list-show>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue'
export default {
    name: 'Audit',
    components: {
        'list-show': ListShow,
    },
    data: function () {
        return {
            cur_ar: [],
            focus_audit_status: -1,
            tabs: [{
                id: 0,
                name: '全部'
            }, {
                id: 1,
                name: '待审核'
            }, {
                id: 2,
                name: '已通过'
            }, {
                id: 3,
                name: '已驳回'
            }],
        }
    },
    methods: {
        change_tab: function (e) {
            let index = e.index
            this.focus_audit_status = this.tabs[index].id - 1;
            this.$nextTick(() => {
                this.$refs.audit_record.refresh()
            })
        },
        get_ar: async function (pageNo, [focus_audit_status]) {
            let resp = await this.$send_req('/audit/get_audit4req', {
                pageNo: pageNo,
                status: focus_audit_status == -1 ? null : focus_audit_status,
            });
            return resp.records;
        },
        audit_req: async function (id, is_approve) {
            if (!is_approve) {
                await new Promise((resolve, reject) => {
                    uni.showModal({
                        title: '提示',
                        content: '确定拒绝该审批请求吗？',
                        success: (res) => {
                            if (res.confirm) {
                                resolve();
                            } else {
                                reject(new Error('用户取消拒绝'));
                            }
                        }
                    });
                });
            }
            await this.$send_req('/audit/audit_req', {
                id: id,
                is_approve: is_approve,
            });
            this.$refs.audit_record.refresh()
        },
    },

    onPullDownRefresh: function () {
        this.$refs.audit_record.refresh()
        uni.stopPullDownRefresh()
    },
}
</script>

<style scoped>
.record_item {
    margin-bottom: 10px;
    border: 1px solid #25ce47;
}

.status_tags {
    margin: 10px;
    display: flex;
    gap: 10px;
}
</style>

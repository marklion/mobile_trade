<template>
<view>
    <list-show ref="fc_table" :fetch_function="get_fc_plan_tables" :fetch_params="[plan_id]" height="95vh" v-model="tables">
        <view v-for="single_table in tables" :key="single_table.id">
            <fui-card :margin="['20rpx', '20rpx']" shadow="0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)" :title="single_table.name" :tag="single_table.fc_plan_table.finish_time?(single_table.fc_plan_table.finish_time + ' 提交人:' + single_table.fc_plan_table.rbac_user.name):'未提交'">
                <view v-for="item in single_table.fc_plan_table.fc_check_results" :key="item.id">
                    <u-cell :title="item.field_check_item.name">
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
        }
    },
    methods: {
        commit: async function (table) {
            await this.$send_req('/sc/commit_fc_plan', {
                fc_plan_id: table.fc_plan_table.id,
            });
            uni.startPullDownRefresh();
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
                });
            });
            return resp.fc_plan_tables;
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

<template>
<view>
    <list-show :fetch_function="get_all_paper" :fetch_params="[plan_id, open_id]" height="40vh" v-model="all_paper">
        <view v-for="single_paper in all_paper" :key="single_paper.id">
            <u-cell :title="single_paper.name">
                <view slot="right-icon">
                    <fui-button btnSize="mini" text="答题" type="primary"></fui-button>
                </view>
            </u-cell>
        </view>
    </list-show>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'Exam',
    components: {
        'list-show': ListShow
    },
    data: function () {
        return {
            plan_id: 0,
            open_id: '',
            all_paper: [],
        };
    },
    methods: {
        get_all_paper: async function (pageNo, [plan_id, open_id]) {
            if (plan_id == 0) {
                return [];
            }
            let resp = await this.$send_req('/global/driver_get_paper', {
                plan_id: plan_id,
                pageNo: pageNo,
                open_id: open_id
            });
            return resp.papers;
        },
    },
    onLoad: function (option) {
        this.plan_id = parseInt(option.plan_id);
        this.open_id = option.open_id;
    }
}
</script>

<style>

</style>

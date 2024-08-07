<template>
<view>
    <list-show :fetch_function="get_all_paper" :fetch_params="[plan_id]" height="40vh" v-model="all_paper">

    </list-show>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'Exam',
    components:{
        'list-show': ListShow
    },
    data: function () {
        return {
            plan_id: 0,
            all_paper:[],
        };
    },
    methods:{
        get_all_paper:async function([plan_id]) {

            let resp = await this.$send_req('/global/driver_get_paper', {

            });
            return resp.data;
        },
    },
    onLoad: function (option) {
        let plan_id = 0;
        if (option.id) {
            plan_id = parseInt(option.id);
        }
        this.plan_id = plan_id;
    }
}
</script>

<style>

</style>

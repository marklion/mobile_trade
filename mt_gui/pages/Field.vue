<template>
<view>
    <list-show ref="plans" :fetch_function="get_wait_que" height="90vh" search_key="search_cond" v-model="plans">
        <view v-for="item in  plans" :key="item.id">
            <u-cell :icon="icon_make(item)" :title="item.main_vehicle.plate + '-' + item.behind_vehicle.plate">
                <view slot="label" style="display:flex; flex-direction: column;">
                    <fui-text :text="item.company.name" size="24"></fui-text>
                    <fui-text :text="'排号时间：' + item.register_time" size="24"></fui-text>
                </view>
                <view slot="value" style="display:flex; flex-direction: column;">
                    <fui-text :text="item.driver.name" size="24"></fui-text>
                    <fui-text type="primary" :text="item.driver.phone" size="24" textType="mobile" @click="copy_text(item.driver.phone)"></fui-text>
                </view>
                <view slot="right-icon">
                    <fui-button btnSize="mini" v-if="item.call_time" text="过号" type="danger" @click="prepare_pass_vehicle(item)"></fui-button>
                    <fui-button btnSize="mini" v-else text="叫号" type="success" @click="call_vehicle(item)"></fui-button>
                </view>
            </u-cell>
        </view>
    </list-show>
    <fui-modal width="600" descr="确定要过号吗？" :show="show_pass_vehicle" @click="pass_vehicle">
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import $fui from '@/components/firstui/fui-clipboard';
export default {
    name: 'Field',
    components: {
        "list-show": ListShow
    },
    data: function () {
        return {
            show_pass_vehicle: false,
            focus_plan_id: 0,
            plans: [],
        };
    },
    methods: {
        pass_vehicle: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/plan/cancel_check_in', {
                    plan_id: this.focus_plan_id
                })
                uni.startPullDownRefresh();
            }
            this.show_pass_vehicle = false;
        },
        prepare_pass_vehicle: function (item) {
            this.focus_plan_id = item.id;
            this.show_pass_vehicle = true;
        },
        icon_make: function (item) {
            let ret = 'hourglass';
            if (item.call_time) {
                ret = 'volume';
            }
            if (item.enter_time) {
                ret = 'rewind-right';
            }
            return ret;
        },
        get_wait_que: async function (pageNo) {
            let ret = await this.$send_req('/plan/wait_que', {
                pageNo: pageNo
            });
            ret.plans.forEach(ele => {
                ele.search_cond = ele.main_vehicle.plate + ' ' + ele.behind_vehicle.plate;
            });
            return ret.plans;
        },
        copy_text: function (e) {
            $fui.getClipboardData(e, res => {
                if (res) {
                    uni.showToast({
                        title: '复制成功',
                        icon: 'success',
                        duration: 2000
                    });
                }
            });
        },
        call_vehicle: async function (item) {
            await this.$send_req('/plan/call_vehicle', {
                plan_id: item.id
            });
            uni.startPullDownRefresh();
        }
    },
    onPullDownRefresh: function () {
        this.$refs.plans.refresh();
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

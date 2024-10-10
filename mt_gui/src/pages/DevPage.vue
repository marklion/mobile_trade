<template>
<view>
    <fui-form ref="dev_info" top="100">
        <fui-input v-for="(sd, index) in item_array" :key="index" :label="sd" borderTop v-model="dev_data[sd]"></fui-input>
    </fui-form>
    <fui-button text="保存" @click="set_dev_data"></fui-button>
</view>
</template>

<script>
export default {
    name: 'DevPage',
    data: function () {
        return {
            dev_data: {

            },
        }
    },
    computed: {
        item_array: function () {
            let ret = [];
            Object.keys(this.dev_data).forEach((key) => {
                ret.push(key);
            });
            return ret;
        },
    },
    methods: {
        init_dev_data: async function () {
            this.dev_data = await this.$send_req('/rbac/get_dev_data', {});
        },
        set_dev_data: async function () {
            await this.$send_req('/rbac/set_dev_data', this.dev_data);
            this.init_dev_data();
        },
    },
    onShow: function () {
        this.init_dev_data();
    },
}
</script>

<style>

</style>

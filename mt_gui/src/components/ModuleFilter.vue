<template>
<view>
    <slot v-if="should_show">
    </slot>
    <slot v-else name="instead">
    </slot>
</view>
</template>

<script>
export default {
    name: 'ModuleFilter',
    props: {
        require_module: String,
        rm_array: Array,
    },
    computed: {
        should_show: function () {
            if (this.require_module && this.$has_module(this.require_module)) {
                return true;
            }
            const arr = Array.isArray(this.rm_array) ? this.rm_array : [];
            for (let i = 0; i < arr.length; i++) {
                if (this.$has_module(arr[i])) {
                    return true;
                }
            }
            return false;
        }
    },
}
</script>

<style>

</style>

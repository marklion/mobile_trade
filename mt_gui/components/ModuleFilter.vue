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
    data() {
        return {
            modules: [],
        }
    },
    props: {
        require_module: String,
    },
    computed: {
        should_show: function () {
            return this.modules.indexOf(this.require_module) != -1;
        }
    },
    mounted: function () {
        let mods = uni.getStorageSync('self_info').modules;
        this.modules = [];
        mods.forEach(element => {
            this.modules.push(element.name);
        });
    },
}
</script>

<style>

</style>

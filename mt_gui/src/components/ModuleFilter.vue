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
        rm_array: Array,
    },
    computed: {
        should_show: function () {
            let ret = this.modules.indexOf(this.require_module) != -1;
            if (false == ret && this.rm_array)
            {
                for (let i = 0; i < this.rm_array.length; i++)
                {
                    if (this.modules.indexOf(this.rm_array[i]) != -1)
                    {
                        ret = true;
                        break;
                    }
                }
            }
            return ret;
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

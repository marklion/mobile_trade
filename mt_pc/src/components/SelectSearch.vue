<template>
<el-select :filterable="filterable" ref="select" :filter-method="search_item" v-permission="permission_array" v-model="filter_id" placeholder="请选择" @change="refresh">
    <page-content :search_input="search_input" :search_key="[item_label]" ref="filter" :body_key="body_key" :enable="should_enable" :req_url="get_url">
        <template v-slot:default="slotProps">
            <el-option v-if="first_item" :label="first_item" :value="0"></el-option>
            <el-option v-for="item in slotProps.content" :key="item.id" :label="$getNestedProperty(item, item_label)" :value="$getNestedProperty(item, item_value)">
            </el-option>
        </template>
    </page-content>
</el-select>
</template>

<script>
import PageContent from './PageContent.vue';
export default {
    name: 'SelectSearch',
    components: {
        "page-content": PageContent,
    },
    props: {
        permission_array: Array,
        body_key: String,
        get_url: String,
        first_item: String,
        filterable: Boolean,
        item_label: String,
        item_value: String,
        value: Number,
    },
    computed: {
        should_enable: function () {
            let ret = false;
            for (let index = 0; index < this.permission_array.length; index++) {
                const element = this.permission_array[index];
                if (this.$hasPermission(element)) {
                    ret = true;
                    break;
                }
            }
            return ret;
        }
    },
    data: function () {
        return {
            search_input: '',
            filter_id: this.first_item ? 0 : '',
            is_waiting: false,
        };
    },
    watch: {
        filter_id: function () {
            this.$emit('input', this.filter_id);
        }
    },
    methods: {
        refresh: function () {
            this.$nextTick(() => {
                this.$emit('refresh', this.value);
                this.$emit('on-change', {
                    name: this.$refs.select.selectedLabel,
                    id: this.filter_id
                });
                this.$refs.filter.cancel_search();
            });
        },
        search_item: function (input) {
            this.search_input = input;
            if (!this.is_waiting) {
                this.is_waiting = true;
                setTimeout(() => {
                    if (this.search_input.length == 0) {
                        this.$refs.filter.cancel_search();
                    } else {
                        this.$refs.filter.do_search();
                    }
                    this.is_waiting = false;
                }, 500);
            }
        },
    }
}
</script>

<style>

</style>

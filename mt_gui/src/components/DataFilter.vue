<template>
<view style="padding: 10rpx 0;">
    <fui-tag theme="plain" :type="tag_color" @click="show_list= true" marginLeft="30">
        {{value.id == undefined?('全部'+filter_name):value.name}}
        <fui-icon v-if=" !value.id" name="arrowright" size="32"></fui-icon>
        <fui-icon v-else name="close" size="32" @click.native.stop="reset_filter"></fui-icon>
    </fui-tag>
    <fui-bottom-popup :show="show_list" @close="show_list= false">
        <fui-list>
            <list-show v-model="data2show" :fetch_function="get_func" :search_key="search_key" height="40vh">
                <fui-list-cell arrow v-for="item in data2show" :key="item.id" @click="choose_data(item)">
                    {{item[show_name]}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
</view>
</template>

<script>
import ListShow from './ListShow.vue';
export default {
    name: 'DataFilter',
    model: {
        prop: 'value',
        event: 'input'
    },
    components: {
        "list-show": ListShow,
    },
    props: {
        show_name: {
            type: String,
            default: 'name',
        },
        search_key: {
            type: String,
            default: '',
        },
        get_func: {
            type: Function,
        },
        tag_color: {
            type: String,
            default: 'purple',
        },
        filter_name: {
            type: String,
            default: '',
        },
        value: {
            type: Object,
            default: () => {
                return {
                    id: undefined,
                    name: '',
                }
            },
        },
    },
    data: function () {
        return {
            show_list: false,
            data2show: [],
        };
    },
    methods: {
        pop_event: function (new_value) {
            this.$nextTick(() => {
                this.$emit('input', new_value);
                this.$emit('update');
            });
        },
        reset_filter: function () {
            this.pop_event({
                name: '全部' + this.filter_name,
                id: undefined,
            });
        },
        choose_data: function (item) {
            this.show_list = false;
            this.pop_event({
                name: item.name,
                id: item.id,
            });
        },
    },
}
</script>

<style>

</style>

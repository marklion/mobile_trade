<template>
<view>
    <scroll-view ref="container" :style="'height: ' + height + ';'" @scrolltolower="scrollToLower" show-scrollbar scroll-y>
        <view ref="content">
            <fui-sticky v-if="search_key" z-index="20">
                <fui-search-bar @search="search" @cancel="cancel"></fui-search-bar>
            </fui-sticky>
            <slot>
            </slot>
        </view>
        <fui-divider v-if="finish" text="没有更多了"></fui-divider>
    </scroll-view>
</view>
</template>

<script>
import PinyinMatch from 'pinyin-match'
export default {
    name: 'ListShow',
    model: {
        prop: 'value',
        event: 'input'
    },
    data: function () {
        return {
            search_condition: '',
            all_data: [],
            page: 0,
            finish: false,
            fetching: false,
        }
    },
    computed: {
        show_count: function () {
            return this.data2show.length;
        },
        data2show: function () {
            let ret = [];
            if (this.search_condition == '') {
                ret = this.all_data;
            } else {
                this.all_data.forEach(ele => {
                    if (PinyinMatch.match(ele[this.search_key], this.search_condition)) {
                        ret.push(ele);
                    }
                });
            }
            return ret;
        }
    },
    props: {
        value: {
            type: Array,
            default: () => [],
        },
        fetch_params: {
            type: Array,
            default: () => [],
        },
        height: {
            type: String,
            default: '100%'
        },
        fetch_function: {
            type: Function,
        },
        search_key: {
            type: String,
            default: ''
        },
    },
    watch: {
        show_count: function () {
            if (this.show_count < 20) {
                this.fetch_new();
            }
        },
        data2show: function () {
            this.$emit('input', this.data2show);
        }
    },
    methods: {
        cancel: function () {
            this.search_condition = '';
        },
        search: async function (e) {
            this.search_condition = e.detail.value;
        },
        refresh: function () {
            this.all_data = [];
            this.page = 0;
            this.finish = false;
            this.fetch_new();
        },
        fetch_new: async function () {
            if (!this.finish && !this.fetching) {
                this.fetching = true;
                let new_data = await this.fetch_function(this.page, this.fetch_params);
                if (new_data.length == 0) {
                    this.finish = true;
                } else {
                    new_data.forEach(ele => {
                        this.$set(this.all_data, this.all_data.length, ele)
                    });
                    this.page++;
                }
                this.fetching = false;
                if (this.show_count < 20) {
                    this.fetch_new();
                }
            }
        },
        scrollToLower: async function () {
            await this.fetch_new();
        }
    },
    mounted: function () {
        this.fetch_new();
    }
}
</script>

<style>

</style>

<template>
<view>
    <scroll-view ref="container" :style="'height: ' + height + ';'" @scrolltolower="scrollToLower" show-scrollbar scroll-y>
        <view ref="content">
            <fui-sticky v-if="search_key" z-index="20">
                <fui-search-bar ref="searchBar" @search="search" @clear="cancel" @cancel="cancel"></fui-search-bar>
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
            type: [Function, String],
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
        resolve_fetch_by_name: function (fn_name) {
            let cur = this.$parent;
            while (cur) {
                if (typeof cur[fn_name] === 'function') {
                    return {
                        ctx: cur,
                        func: cur[fn_name],
                    };
                }
                cur = cur.$parent;
            }
            return null;
        },
        resolve_fetch_context: function (req_func) {
            let cur = this.$parent;
            while (cur) {
                const methods = cur.$options && cur.$options.methods;
                if (methods) {
                    const is_owner = Object.keys(methods).some((key) => cur[key] === req_func);
                    if (is_owner) {
                        return cur;
                    }
                }
                cur = cur.$parent;
            }
            return this.$parent || this;
        },
        cancel: function () {
            this.search_condition = '';
            this.$refs.searchBar.reset()
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
                try {
                    let req_func = this.fetch_function;
                    let exec_ctx = this.$parent || this;
                    if (typeof req_func === 'string') {
                        const resolved = this.resolve_fetch_by_name(req_func);
                        if (!resolved) {
                            console.error('ListShow can not resolve fetch function by name', req_func);
                            this.finish = true;
                            return;
                        }
                        req_func = resolved.func;
                        exec_ctx = resolved.ctx;
                    } else if (typeof req_func === 'function') {
                        exec_ctx = this.resolve_fetch_context(req_func);
                    } else {
                        console.error('ListShow fetch_function is not function/string', req_func);
                        this.finish = true;
                        return;
                    }
                    const new_data = await req_func.call(exec_ctx, this.page, this.fetch_params);
                    if (!Array.isArray(new_data) || new_data.length == 0) {
                        this.finish = true;
                    } else {
                        new_data.forEach(ele => {
                            this.$set(this.all_data, this.all_data.length, ele)
                        });
                        this.page++;
                    }
                } catch (err) {
                    console.log(err);
                    this.finish = true;
                } finally {
                    this.fetching = false;
                }
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

<template>
<view class="list-show">
    <view class="list-search" v-if="search_key">
        <view class="list-search-box">
            <fui-icon name="search" size="32" color="#8A94A6"></fui-icon>
            <input class="list-search-input" type="text" confirm-type="search"
                placeholder="请输入搜索关键词" placeholder-class="list-search-ph"
                :value="search_condition" @input="on_search_input" @confirm="on_search_confirm" />
            <fui-icon v-if="search_condition" name="close" size="28" color="#C5CAD5"
                @click="cancel"></fui-icon>
            <text class="list-search-btn" v-if="search_condition" @tap.stop="on_search_confirm">搜索</text>
        </view>
    </view>
    <scroll-view ref="container" class="list-show-scroll" :style="'height: ' + height + ';'"
        @scrolltolower="scrollToLower" show-scrollbar scroll-y>
        <view ref="content">
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
            } else if (this.server_search) {
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
        server_search: {
            type: Boolean,
            default: false,
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
            this.refresh();
        },
        on_search_input: function (e) {
            this.search_condition = e.detail.value;
        },
        on_search_confirm: function (e) {
            if (e && e.detail && e.detail.value != null) {
                this.search_condition = e.detail.value;
            }
            this.refresh();
        },
        reset: function () {
            this.search_condition = '';
        },
        search: async function (e) {
            this.search_condition = e.detail.value;
            this.refresh();
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
                let fetch_options = {};
                if (this.server_search && this.search_condition) {
                    fetch_options.search_key = this.search_condition;
                }
                let new_data = await this.fetch_function(this.page, this.fetch_params, fetch_options);
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
.list-show {
    width: 100%;
}

.list-search {
    padding: 16rpx 24rpx;
    background: #F1F4FA;
    box-sizing: border-box;
}

.list-search-box {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 72rpx;
    padding: 0 24rpx;
    border-radius: 12rpx;
    background: #FFFFFF;
    box-sizing: border-box;
}

.list-search-input {
    flex: 1;
    min-width: 0;
    height: 72rpx;
    padding: 0 16rpx;
    font-size: 28rpx;
    color: #181818;
    background: transparent;
}

.list-search-ph {
    color: #B2B2B2;
    font-size: 28rpx;
}

.list-search-btn {
    flex-shrink: 0;
    margin-left: 16rpx;
    font-size: 28rpx;
    color: #465CFF;
    font-weight: 600;
}
</style>

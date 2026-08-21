<template>
<view class="list-show">
    <view class="list-search" v-if="search_key && !hide_search">
        <view class="list-search-box">
            <fui-icon name="search" size="32" color="#8A94A6"></fui-icon>
            <input class="list-search-input" type="text" confirm-type="search"
                :id="search_input_id" :name="search_input_id"
                placeholder="请输入搜索关键词" placeholder-class="list-search-ph"
                :value="search_input" @input="on_search_input" @confirm="on_search_confirm" />
            <fui-icon v-if="search_input" name="close" size="28" color="#C5CAD5"
                @click="cancel"></fui-icon>
            <view class="list-search-btn" @tap.stop="on_search_confirm">
                <text class="list-search-btn-text">搜索</text>
            </view>
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

let list_show_search_id_seq = 0;

export default {
    name: 'ListShow',
    model: {
        prop: 'value',
        event: 'input'
    },
    data: function () {
        return {
            search_input_id: 'list-show-search-' + (++list_show_search_id_seq),
            search_input: '',
            search_condition: '',
            all_data: [],
            page: 0,
            finish: false,
            fetching: false,
            fetch_token: 0,
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
        hide_search: {
            type: Boolean,
            default: false,
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
            this.search_input = '';
            this.search_condition = '';
            this.refresh();
        },
        on_search_input: function (e) {
            this.search_input = e.detail.value;
        },
        on_search_confirm: function (e) {
            if (e && e.detail && e.detail.value != null) {
                this.search_input = e.detail.value;
            }
            this.search_condition = this.search_input;
            this.refresh();
        },
        reset: function () {
            this.search_input = '';
            this.search_condition = '';
        },
        search: async function (e) {
            this.search_input = e.detail.value;
            this.search_condition = e.detail.value;
            this.refresh();
        },
        refresh: function () {
            // 递增 token，丢弃进行中的旧请求结果；并解除 fetching 锁，否则刷新会被吞掉
            this.fetch_token += 1;
            this.all_data = [];
            this.page = 0;
            this.finish = false;
            this.fetching = false;
            this.fetch_new();
        },
        fetch_new: async function () {
            if (this.finish || this.fetching) {
                return;
            }
            this.fetching = true;
            const token = this.fetch_token;
            const page = this.page;
            try {
                let fetch_options = {};
                if (this.server_search && this.search_condition) {
                    fetch_options.search_key = this.search_condition;
                }
                let new_data = await this.fetch_function(page, this.fetch_params, fetch_options);
                if (token !== this.fetch_token) {
                    return;
                }
                if (!new_data || new_data.length == 0) {
                    this.finish = true;
                } else {
                    new_data.forEach(ele => {
                        this.$set(this.all_data, this.all_data.length, ele)
                    });
                    this.page = page + 1;
                }
            } finally {
                if (token === this.fetch_token) {
                    this.fetching = false;
                    if (!this.finish && this.show_count < 20) {
                        this.fetch_new();
                    }
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
    height: 100%;
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
    height: 80rpx;
    padding: 0 10rpx 0 24rpx;
    border-radius: 40rpx;
    background: #FFFFFF;
    border: 1rpx solid rgba(70, 92, 255, 0.08);
    box-shadow: 0 6rpx 18rpx rgba(40, 58, 120, 0.04);
    box-sizing: border-box;
    position: relative;
}

.list-search-input {
    flex: 1;
    min-width: 0;
    height: 80rpx;
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
    margin-left: 8rpx;
    min-width: 112rpx;
    height: 60rpx;
    padding: 0 24rpx;
    border-radius: 30rpx;
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
    box-shadow: 0 8rpx 16rpx rgba(47, 63, 207, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.list-search-btn-text {
    font-size: 26rpx;
    color: #FFFFFF;
    font-weight: 700;
    letter-spacing: 2rpx;
}
</style>

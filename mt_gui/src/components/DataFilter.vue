<template>
<view class="data-filter">
    <view class="filter-chip" :class="[tone_class, { on: !!value.id }]" @click="open_list">
        <text class="filter-chip-text">{{ chip_label }}</text>
        <fui-icon v-if="!value.id" name="arrowright" :size="26" :color="icon_color"></fui-icon>
        <fui-icon v-else name="close" :size="26" :color="icon_color" @click.native.stop="reset_filter"></fui-icon>
    </view>
    <fui-bottom-popup v-if="show_list" :show="show_list" @close="close_list">
        <fui-list>
            <list-show v-model="data2show" :fetch_function="get_func" :search_key="search_key" height="40vh">
                <fui-list-cell arrow v-for="item in data2show" :key="item.id" @click="choose_data(item)">
                    {{ item[show_name] }}
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
    computed: {
        chip_label: function () {
            if (this.value.id == undefined) {
                return '全部' + this.filter_name;
            }
            return this.value.name;
        },
        tone_class: function () {
            if (this.tag_color === 'success') {
                return 'tone-green';
            }
            if (this.tag_color === 'warning') {
                return 'tone-orange';
            }
            if (this.tag_color === 'danger') {
                return 'tone-red';
            }
            return 'tone-blue';
        },
        icon_color: function () {
            if (this.value.id) {
                return '#FFFFFF';
            }
            if (this.tag_color === 'success') {
                return '#2DBE6C';
            }
            if (this.tag_color === 'warning') {
                return '#FF8A2B';
            }
            if (this.tag_color === 'danger') {
                return '#FF4D4F';
            }
            return '#465CFF';
        },
    },
    data: function () {
        return {
            show_list: false,
            data2show: [],
        };
    },
    methods: {
        open_list: function () {
            this.show_list = true;
        },
        close_list: function () {
            this.show_list = false;
        },
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

<style scoped>
.data-filter {
    display: inline-flex;
    margin: 0 12rpx 12rpx 0;
}

.filter-chip {
    display: flex;
    flex-direction: row;
    align-items: center;
    max-width: 320rpx;
    min-height: 64rpx;
    padding: 0 22rpx;
    border-radius: 999rpx;
    box-sizing: border-box;
    border: 1rpx solid transparent;
    box-shadow: 0 8rpx 18rpx rgba(24, 36, 90, 0.08);
}

.filter-chip-text {
    margin-right: 8rpx;
    font-size: 24rpx;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tone-green {
    background: linear-gradient(145deg, #E9FBF1 0%, #D7F5E4 100%);
    border-color: rgba(45, 190, 108, 0.28);
}

.tone-green .filter-chip-text {
    color: #1FA85A;
}

.tone-green.on {
    background: linear-gradient(145deg, #2DBE6C 0%, #1FA85A 100%);
    border-color: transparent;
    box-shadow: 0 12rpx 24rpx rgba(45, 190, 108, 0.28);
}

.tone-green.on .filter-chip-text {
    color: #FFFFFF;
}

.tone-blue {
    background: linear-gradient(145deg, #EEF1FF 0%, #E0E6FF 100%);
    border-color: rgba(70, 92, 255, 0.28);
}

.tone-blue .filter-chip-text {
    color: #2F3FCF;
}

.tone-blue.on {
    background: linear-gradient(145deg, #5B6FFF 0%, #2F3FCF 100%);
    border-color: transparent;
    box-shadow: 0 12rpx 24rpx rgba(47, 63, 207, 0.28);
}

.tone-blue.on .filter-chip-text {
    color: #FFFFFF;
}

.tone-orange {
    background: linear-gradient(145deg, #FFF3E8 0%, #FFE4CC 100%);
    border-color: rgba(255, 138, 43, 0.28);
}

.tone-orange .filter-chip-text {
    color: #E56F12;
}

.tone-orange.on {
    background: linear-gradient(145deg, #FFA35A 0%, #FF8A2B 100%);
    border-color: transparent;
    box-shadow: 0 12rpx 24rpx rgba(255, 138, 43, 0.28);
}

.tone-orange.on .filter-chip-text {
    color: #FFFFFF;
}

.tone-red {
    background: linear-gradient(145deg, #FFF0F0 0%, #FFD6D7 100%);
    border-color: rgba(255, 77, 79, 0.28);
}

.tone-red .filter-chip-text {
    color: #FF4D4F;
}

.tone-red.on {
    background: linear-gradient(145deg, #FF8A8B 0%, #FF4D4F 100%);
    border-color: transparent;
    box-shadow: 0 12rpx 24rpx rgba(255, 77, 79, 0.28);
}

.tone-red.on .filter-chip-text {
    color: #FFFFFF;
}
</style>

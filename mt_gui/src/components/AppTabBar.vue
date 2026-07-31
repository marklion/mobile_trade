<template>
<view class="tab-shell">
    <view class="tab-dock">
        <view
            v-for="(item, index) in list"
            :key="item.pagePath"
            class="tab-item"
            :class="{ on: selected === index, mid: item.mid }"
            @click="switchTab(item, index)"
        >
            <view class="tab-icon-wrap" :class="{ on: selected === index, mid: item.mid }">
                <image
                    class="tab-icon"
                    :src="item.selectedIconPath"
                    mode="aspectFit"
                />
            </view>
            <text class="tab-text" :class="{ on: selected === index }">{{ item.text }}</text>
        </view>
    </view>
</view>
</template>

<script>
export default {
    name: 'AppTabBar',
    props: {
        selected: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            list: [
                {
                    pagePath: '/pages/Home',
                    text: '首页',
                    iconPath: '/static/tabbar/layout_default_3x.png',
                    selectedIconPath: '/static/tabbar/layout_selected_3x.png',
                },
                {
                    pagePath: '/pages/OrderList',
                    text: '订单',
                    iconPath: '/static/tabbar/mod_default_3x.png',
                    selectedIconPath: '/static/tabbar/mod_selected_3x.png',
                },
                {
                    pagePath: '/pages/AppPanel',
                    text: '工作台',
                    iconPath: '/static/tabbar/assembly_default_3x.png',
                    selectedIconPath: '/static/tabbar/assembly_selected_3x.png',
                    mid: true,
                },
                {
                    pagePath: '/pages/Export',
                    text: '导出',
                    iconPath: '/static/tabbar/export.png',
                    selectedIconPath: '/static/tabbar/export_select.png',
                },
                {
                    pagePath: '/pages/Myself',
                    text: '我的',
                    iconPath: '/static/tabbar/my_default_3x.png',
                    selectedIconPath: '/static/tabbar/my_selected_3x.png',
                },
            ],
        };
    },
    methods: {
        switchTab(item, index) {
            if (this.selected === index) {
                return;
            }
            uni.switchTab({ url: item.pagePath });
        },
    },
};
</script>

<style scoped>
.tab-shell {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    padding: 0;
    box-sizing: border-box;
    background: #FFFFFF;
}

.tab-dock {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    height: 96rpx;
    padding: 0 6rpx calc(6rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    border-top: 1rpx solid rgba(47, 63, 207, 0.08);
    box-shadow: 0 -6rpx 18rpx rgba(36, 54, 184, 0.05);
    box-sizing: content-box;
}

.tab-item {
    flex: 1;
    height: 96rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
    position: relative;
    box-sizing: border-box;
    padding-bottom: 4rpx;
}

.tab-icon-wrap {
    width: 48rpx;
    height: 48rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    /* 未选中：浅底 + 蓝图标，和选中实心拉开对比 */
    background: #E8ECFF;
    border: 1rpx solid rgba(70, 92, 255, 0.22);
    box-shadow: none;
}

.tab-icon-wrap.mid {
    width: 84rpx;
    height: 84rpx;
    border-radius: 26rpx;
    margin-bottom: 0;
    margin-top: -36rpx;
    background: #DCE3FF;
    border: 1rpx solid rgba(70, 92, 255, 0.28);
    box-shadow: 0 6rpx 16rpx rgba(70, 92, 255, 0.16);
}

.tab-icon-wrap.on {
    /* 选中：实心深蓝 + 白图标 */
    background: linear-gradient(145deg, #465CFF 0%, #2F3FCF 55%, #1E2DB0 100%);
    border-color: transparent;
    box-shadow: 0 8rpx 20rpx rgba(47, 63, 207, 0.42);
}

.tab-icon-wrap.mid.on {
    box-shadow: 0 12rpx 26rpx rgba(47, 63, 207, 0.48);
}

.tab-icon {
    width: 40rpx;
    height: 40rpx;
    display: block;
}

.tab-icon-wrap.on .tab-icon {
    filter: brightness(0) invert(1);
}

.tab-icon-wrap.mid .tab-icon {
    width: 46rpx;
    height: 46rpx;
}

.tab-text {
    margin-top: 2rpx;
    height: 28rpx;
    font-size: 20rpx;
    line-height: 28rpx;
    color: #8A94A6;
    font-weight: 500;
}

.tab-item.mid .tab-text {
    color: #6B7CFF;
    font-weight: 600;
}

.tab-text.on {
    color: #2F3FCF;
    font-weight: 700;
}
</style>

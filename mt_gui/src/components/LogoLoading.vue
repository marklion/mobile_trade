<template>
    <view class="logo-loading-mask" v-show="visible" @touchmove.stop.prevent="noop" @click.stop="noop">
        <view class="logo-loading-box">
            <view class="logo-stage">
                <image class="logo-img logo-light" src="/static/logo.jpg" mode="aspectFit"></image>
                <image class="logo-img logo-deep" src="/static/logo.jpg" mode="aspectFit"></image>
            </view>
            <view class="logo-dots">
                <view class="logo-dot logo-dot-a"></view>
                <view class="logo-dot logo-dot-b"></view>
                <view class="logo-dot logo-dot-c"></view>
            </view>
            <text class="logo-loading-text">{{ title }}</text>
        </view>
    </view>
</template>

<script>
import { loadingState, nativeBridge } from '@/utils/logoLoadingState.js'

export default {
    name: 'LogoLoading',
    data() {
        return {
            isPresenter: false
        }
    },
    computed: {
        visible() {
            return loadingState.visible && this.isPresenter
        },
        title() {
            return loadingState.title || '加载中'
        }
    },
    created() {
        // 同一时刻只由一个实例负责展示，避免遮罩叠两层
        this.isPresenter = loadingState.mounted === 0
        loadingState.mounted += 1
        // 自定义已就绪：立刻关掉可能刚弹出的原生 loading
        nativeBridge.cancel()
    },
    beforeDestroy() {
        loadingState.mounted = Math.max(0, loadingState.mounted - 1)
    },
    methods: {
        noop() {},
        show(title) {
            loadingState.title = title || '加载中'
            loadingState.visible = true
        },
        hide() {
            loadingState.visible = false
        }
    }
}
</script>

<style scoped>
/* 主页渐变参照：#D8E0F6(浅) → #465CFF → #2F3FCF(深) */
.logo-loading-mask {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(26, 31, 54, 0.32);
}

.logo-loading-box {
    min-width: 240rpx;
    padding: 44rpx 48rpx 36rpx;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 20rpx 56rpx rgba(47, 63, 207, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
}

.logo-stage {
    position: relative;
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    overflow: hidden;
    background: #FFFFFF;
}

.logo-img {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 50%;
}

.logo-light {
    opacity: 0.55;
    /* #ifndef MP */
    filter: brightness(1.9) contrast(0.82) saturate(0.9);
    /* #endif */
}

.logo-deep {
    position: absolute;
    left: 0;
    top: 0;
    animation: logo-deepen 1.6s ease-in-out infinite;
}

.logo-dots {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-top: 22rpx;
}

.logo-dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    margin: 0 6rpx;
    animation: dot-pulse 1.2s ease-in-out infinite;
}

.logo-dot-a {
    background: #D8E0F6;
    animation-delay: 0s;
}

.logo-dot-b {
    background: #465CFF;
    animation-delay: 0.15s;
}

.logo-dot-c {
    background: #2F3FCF;
    animation-delay: 0.3s;
}

.logo-loading-text {
    margin-top: 18rpx;
    font-size: 26rpx;
    color: #465CFF;
    letter-spacing: 2rpx;
    font-weight: 500;
}

@keyframes logo-deepen {
    0% {
        opacity: 0;
    }
    40% {
        opacity: 0.7;
    }
    55% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

@keyframes dot-pulse {
    0%,
    100% {
        transform: scale(0.75);
        opacity: 0.45;
    }
    50% {
        transform: scale(1.15);
        opacity: 1;
    }
}
</style>

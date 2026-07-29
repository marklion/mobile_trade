import Vue from 'vue'

export const loadingState = Vue.observable({
    visible: false,
    title: '加载中',
    mounted: 0
})

/** 由 logoLoading.js 注入：自定义组件挂载后取消原生回退 */
export const nativeBridge = {
    cancel() {}
}

export function setCancelNativeFallback(fn) {
    nativeBridge.cancel = typeof fn === 'function' ? fn : function () {}
}

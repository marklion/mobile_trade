import Vue from 'vue'
import LogoLoading from '@/components/LogoLoading.vue'
import { loadingState, setCancelNativeFallback } from '@/utils/logoLoadingState.js'

let count = 0
let patched = false
let nativeShowLoading = null
let nativeHideLoading = null
let usedNativeFallback = false
let h5Vm = null

function canUseDomOverlay() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function'
}

function ensureH5Vm() {
    if (h5Vm) return h5Vm
    if (!canUseDomOverlay()) return null
    const Ctor = Vue.extend(LogoLoading)
    h5Vm = new Ctor()
    h5Vm.$mount()
    document.body.appendChild(h5Vm.$el)
    return h5Vm
}

function hideNativeQuietly() {
    if (!nativeHideLoading) return
    try {
        nativeHideLoading.call(uni, { noConflict: true })
    } catch (e) {
        // ignore
    }
    usedNativeFallback = false
}

function cancelNativeFallback() {
    if (usedNativeFallback) {
        hideNativeQuietly()
    }
}

export function showLogoLoading(options = {}) {
    let title = (options && options.title) || '加载中'
    title = String(title).replace(/\.+$/, '').replace(/…+$/, '').replace(/。+$/, '') || '加载中'
    count += 1
    loadingState.pending = count
    loadingState.title = title

    // H5：挂 body 自定义层
    ensureH5Vm()

    if (loadingState.mounted > 0) {
        loadingState.visible = true
        hideNativeQuietly()
        return
    }

    // 小程序当前页还没有 <logo-loading />：只用原生，避免双层
    loadingState.visible = false
    if (nativeShowLoading) {
        usedNativeFallback = true
        nativeShowLoading.call(uni, {
            title,
            mask: options.mask !== false
        })
    }
}

export function hideLogoLoading() {
    count = Math.max(0, count - 1)
    loadingState.pending = count
    if (count > 0) return
    forceHideAll()
}

function forceHideAll() {
    count = 0
    loadingState.pending = 0
    loadingState.visible = false
    hideNativeQuietly()
}

export function patchUniLoading() {
    if (patched) return
    patched = true
    nativeShowLoading = uni.showLoading.bind(uni)
    nativeHideLoading = uni.hideLoading.bind(uni)

    uni.showLoading = function (options) {
        showLogoLoading(options || {})
    }
    uni.hideLoading = function () {
        // 兼容业务里偶发多次 hide：直接清干净，避免一直转
        if (count <= 1) {
            forceHideAll()
            return
        }
        hideLogoLoading()
    }
}

export function initLogoLoading() {
    setCancelNativeFallback(cancelNativeFallback)
    // 仅注册组件名，方便页面里写 <logo-loading />；不再 mixin 改写页面 render
    Vue.component('logo-loading', LogoLoading)
    Vue.component('LogoLoading', LogoLoading)
    patchUniLoading()
    ensureH5Vm()
}

import Vue from 'vue'
import LogoLoading from '@/components/LogoLoading.vue'
import { loadingState, setCancelNativeFallback } from '@/utils/logoLoadingState.js'

let count = 0
let patched = false
let mixinInstalled = false
let nativeShowLoading = null
let nativeHideLoading = null
let usedNativeFallback = false
let fallbackTimer = null
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

function isPageVm(vm) {
    if (!vm || !vm.$options) return false
    if (vm.$options.mpType === 'page') return true
    if (vm.$mp && vm.$mp.mpType === 'page') return true
    const file = vm.$options.__file || ''
    return /\/pages\/|\/subPage\d\//.test(file)
}

function clearFallbackTimer() {
    if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        fallbackTimer = null
    }
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
    clearFallbackTimer()
    if (usedNativeFallback) {
        hideNativeQuietly()
    }
}

export function showLogoLoading(options = {}) {
    let title = (options && options.title) || '加载中'
    title = String(title).replace(/\.+$/, '').replace(/…+$/, '').replace(/。+$/, '') || '加载中'
    count += 1

    loadingState.title = title
    loadingState.visible = true

    // 先清掉可能残留的原生 loading，只走自定义
    clearFallbackTimer()
    hideNativeQuietly()

    ensureH5Vm()

    // 若短时间内自定义组件仍未挂载，再回退原生（仅此一层）
    if (loadingState.mounted === 0) {
        fallbackTimer = setTimeout(() => {
            fallbackTimer = null
            if (count <= 0 || !loadingState.visible) return
            if (loadingState.mounted > 0) return
            if (!nativeShowLoading) return
            usedNativeFallback = true
            nativeShowLoading.call(uni, {
                title,
                mask: options.mask !== false
            })
        }, 100)
    }
}

export function hideLogoLoading() {
    count = Math.max(0, count - 1)
    if (count > 0) return

    clearFallbackTimer()
    loadingState.visible = false

    if (usedNativeFallback) {
        hideNativeQuietly()
    }
}

function installPageMixin() {
    if (mixinInstalled) return
    mixinInstalled = true

    Vue.component('logo-loading', LogoLoading)
    Vue.component('LogoLoading', LogoLoading)

    Vue.mixin({
        beforeCreate() {
            if (!isPageVm(this)) return
            if (this.$options.__mtLogoLoadingWrapped) return
            this.$options.__mtLogoLoadingWrapped = true

            const components = this.$options.components || {}
            components['logo-loading'] = LogoLoading
            components.LogoLoading = LogoLoading
            this.$options.components = components

            const originalRender = this.$options.render
            if (typeof originalRender !== 'function') return

            this.$options.render = function (h) {
                const pageVNode = originalRender.apply(this, arguments)
                return h(
                    'view',
                    {
                        class: ['mt-page-logo-loading-host'],
                        style: {
                            width: '100%',
                            height: '100%'
                        }
                    },
                    [
                        pageVNode,
                        h('logo-loading')
                    ]
                )
            }
        }
    })
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
        hideLogoLoading()
    }
}

export function initLogoLoading() {
    setCancelNativeFallback(cancelNativeFallback)
    installPageMixin()
    patchUniLoading()
    ensureH5Vm()
}

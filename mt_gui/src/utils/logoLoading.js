import Vue from 'vue'
import LogoLoading from '@/components/LogoLoading.vue'

let count = 0
let vm = null
let patched = false
let mixinInstalled = false
let nativeShowLoading = null
let nativeHideLoading = null
const pageInstances = []

function canUseDomOverlay() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function'
}

function getActiveInstance() {
    if (vm) return vm
    for (let i = pageInstances.length - 1; i >= 0; i--) {
        const item = pageInstances[i]
        if (item && !item._isDestroyed) {
            return item
        }
    }
    return null
}

function ensureH5Vm() {
    if (vm) return vm
    if (!canUseDomOverlay()) return null
    const Ctor = Vue.extend(LogoLoading)
    vm = new Ctor()
    vm.$mount()
    document.body.appendChild(vm.$el)
    return vm
}

function showOnInstance(instance, title) {
    if (!instance) return false
    if (typeof instance.show === 'function') {
        instance.show(title)
        return true
    }
    return false
}

export function showLogoLoading(options = {}) {
    const title = (options && options.title) || '加载中'
    count += 1

    const h5 = ensureH5Vm()
    if (showOnInstance(h5, title)) {
        return
    }

    const pageVm = getActiveInstance()
    if (showOnInstance(pageVm, title)) {
        return
    }

    if (nativeShowLoading) {
        nativeShowLoading.call(uni, {
            title,
            mask: options.mask !== false
        })
    }
}

export function hideLogoLoading() {
    count = Math.max(0, count - 1)
    if (count > 0) return

    const h5 = vm
    if (h5 && typeof h5.hide === 'function') {
        h5.hide()
        return
    }

    const pageVm = getActiveInstance()
    if (pageVm && typeof pageVm.hide === 'function') {
        pageVm.hide()
        return
    }

    if (nativeHideLoading) {
        nativeHideLoading.call(uni, { noConflict: true })
    }
}

function installPageMixin() {
    if (mixinInstalled) return
    mixinInstalled = true

    Vue.mixin({
        beforeCreate() {
            if (this.$options.mpType !== 'page') return
            if (this.$options.__mtLogoLoadingWrapped) return
            this.$options.__mtLogoLoadingWrapped = true

            const components = this.$options.components || {}
            components.LogoLoading = LogoLoading
            this.$options.components = components

            const originalRender = this.$options.render
            if (typeof originalRender !== 'function') return

            this.$options.render = function (h) {
                const pageVNode = originalRender.call(this, h)
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
                        h('LogoLoading', {
                            ref: 'mtLogoLoading'
                        })
                    ]
                )
            }
        },
        onReady() {
            if (this.$options.mpType !== 'page') return
            const inst = this.$refs && this.$refs.mtLogoLoading
            if (inst && pageInstances.indexOf(inst) === -1) {
                pageInstances.push(inst)
            }
        },
        onShow() {
            if (this.$options.mpType !== 'page') return
            const inst = this.$refs && this.$refs.mtLogoLoading
            if (inst && pageInstances.indexOf(inst) === -1) {
                pageInstances.push(inst)
            }
        },
        onUnload() {
            if (this.$options.mpType !== 'page') return
            const inst = this.$refs && this.$refs.mtLogoLoading
            if (!inst) return
            const idx = pageInstances.indexOf(inst)
            if (idx !== -1) {
                pageInstances.splice(idx, 1)
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
    installPageMixin()
    patchUniLoading()
    if (canUseDomOverlay()) {
        ensureH5Vm()
    }
}

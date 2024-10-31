<template>
<section class="app-main">
    <transition name="fade-transform" mode="out-in">
        <keep-alive :include="cachedViews">
            <router-view :key="key" />
        </keep-alive>
    </transition>
</section>
</template>

<script>
import {
    mapGetters
} from 'vuex'
export default {
    name: 'AppMain',
    computed: {
        key() {
            return this.$route.path
        },

        ...mapGetters([
            'cachedViews',
        ])
    }
}
</script>

<style scoped>
.app-main {
    /*50 = navbar  */
    min-height: calc(100vh - 83px);
    width: 100%;
    position: relative;
}

.fixed-header+.app-main {
    padding-top: 83px;
}
</style>

<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
    .fixed-header {
        padding-right: 15px;
    }
}
</style>

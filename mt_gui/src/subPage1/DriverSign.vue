<template>
<view>
    <sign-cmpnt :open_id="open_id" />
</view>
</template>

<script>
import SignCmpnt from './SignCmpnt.vue';
export default {
    name: 'DriverSign',
    components: {
        SignCmpnt
    },
    data() {
        return {
            open_id: ''
        }
    },
    onLoad(option) {
        this.open_id = option.open_id || '';
    }
};
</script>

<style>

</style>

<template>
<div></div>
</template>

<script>
export default {
    onLoad(option) {
        let id = undefined
        let scene = undefined
        let is_internal = undefined
        let url = '/subPage1/Ticket?'
        if (option.id) {
            id = option.id
            url += 'id=' + id + '&'
        }
        if (option.scene) {
            scene = option.scene
            url += 'scene=' + scene + '&'
        }
        if (option.is_internal) {
            is_internal = option.is_internal
            url += 'is_internal=' + is_internal + '&'
        }
        url = url.slice(0, -1)
        uni.navigateTo({
            url: url,
        });
    }

}
</script>

<style>

</style>
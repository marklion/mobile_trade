<template>
<div></div>
</template>

<script>
export default {
    onLoad(option) {
        let url = '/subPage1/order_detail?'
        if (option.id) {
            url += 'id=' + option.id + '&'
        }
        if (option.role) {
            url += 'role=' + option.role + '&'
        }
        if (option.stat_context_company_id) {
            url += 'stat_context_company_id=' + option.stat_context_company_id + '&'
        }
        url = url.slice(0, -1)
        uni.navigateTo({
            url: url,
        });
    }
}
</script>

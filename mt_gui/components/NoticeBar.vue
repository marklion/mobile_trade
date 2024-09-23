<template>
<fui-sticky v-if="noticeData">
    <fui-notice-bar background="#fff8d5" color="#FF2B2B" :content="noticeData.message" scrollable></fui-notice-bar>
</fui-sticky>
</template>

<script>
export default {
    name: "notice-bar",
    data() {
        return {
            noticeData: null
        }
    },
    methods: {
        async getNoticeData() {
            try {
                const response = await this.$send_req('/global/get_published_notice')
                this.noticeData = response.notice;
            } catch (error) {
                console.error('Failed to fetch notice data:', error);
            }
        }
    },
    mounted() {
        this.getNoticeData();
    }
}
</script>

<style>
</style>

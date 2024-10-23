<template>
<div>
    <div>
        <slot :content="content"></slot>
    </div>
    <el-pagination layout="prev, pager, next" :current-page.sync="cur_page" :page-count="total" @current-change="refresh">
    </el-pagination>
</div>
</template>

<script>
export default {
    name: 'PageContent',
    data: function () {
        return {
            total: 1,
            content: [],
            cur_page: 1,
        };
    },
    props: {
        req_url: String,
        req_body: {
            type: Object,
            default: function () {
                return {};
            }
        },
        body_key: String,
        enable: Boolean,
    },
    methods: {
        refresh: async function (pageNo) {
            if (!this.enable) {
                this.total = 1;
                this.content = [];
            } else {
                let req_body = this.req_body;
                req_body.pageNo = pageNo - 1;
                let resp = await this.$send_req(this.req_url, req_body);
                this.content = resp[this.body_key];
                this.total = parseInt(resp.total / 20) + 1;
                this.cur_page = pageNo;
            }
        },
    },
    mounted: function () {
        this.refresh(1);
    }
}
</script>

<style scoped>
</style>

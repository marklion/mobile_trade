<template>
<div>
    <div>
        <slot :content="content"></slot>
    </div>
    <el-button v-if="for_search" :disabled="search_finish" @click="search_more" type="primary">更多</el-button>
    <el-pagination v-else layout="prev, pager, next" :current-page.sync="cur_page" :page-count="total" @current-change="refresh">
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
            search_page: 1,
            search_finish: false,
            for_search: false,
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
        search_func: Function,
    },
    methods: {
        cancel_search: function () {
            this.for_search = false;
            this.refresh(1);
        },
        do_search: function () {
            this.for_search = true;
            this.search_page = 1;
            this.content = [];
            this.search_finish = false;
            this.search_more();
        },
        search_more: async function () {
            let new_records = [];
            let fetch_ret = [];
            do {
                new_records = [];
                fetch_ret = [];
                fetch_ret = await this.search_fetch();
                fetch_ret.forEach((record) => {
                    if (this.search_func(record)) {
                        new_records.push(record);
                    }
                });
                this.content = this.content.concat(new_records);
                this.search_page++;
            } while (new_records.length <= 0 && fetch_ret.length > 0);
            if (fetch_ret.length <= 0) {
                this.search_finish = true;
            }
        },
        search_fetch: async function () {
            let fetch_ret = [];
            if (this.enable) {
                let req_body = this.req_body;
                req_body.pageNo = this.search_page - 1;
                let resp = await this.$send_req(this.req_url, req_body);
                fetch_ret = resp[this.body_key];
            }
            return fetch_ret;
        },
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

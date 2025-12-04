<template>
<div>
    <div>
        <slot :content="content"></slot>
    </div>
    <el-button v-if="for_search" :disabled="search_finish" @click="search_more" type="primary">更多</el-button>
    <el-pagination v-else layout="prev, pager, next" :current-page.sync="cur_page" :page-count="total" @current-change="refresh" :hide-on-single-page="true">
    </el-pagination>
</div>
</template>

<script>
import PinyinMatch from 'pinyin-match';
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
        search_input: String,
        search_key: Array,
    },
    methods: {
        cancel_search: function (pageNo = 1) {
            this.for_search = false;
            this.refresh(pageNo);
        },
        do_search: async function () {
            this.for_search = true;
            this.search_page = 1;
            this.content = [];
            this.search_finish = false;
            this.search_more();
        },
        search_more: async function () {
            this.$emit('data_loading');
            let new_records = [];
            let fetch_ret = [];
            do {
                new_records = [];
                fetch_ret = [];
                fetch_ret = await this.search_fetch();
                fetch_ret.forEach((record) => {
                    if (this.search_input.length > 0) {
                        let search_key_string = '';
                        this.search_key.forEach(key => {
                            search_key_string += this.$getNestedProperty(record, key);
                        });
                        if (PinyinMatch.match(search_key_string, this.search_input)) {
                            new_records.push(record);
                        }
                    } else {
                        new_records.push(record);
                    }
                });
                this.content = this.content.concat(new_records);
                this.search_page++;
            } while (new_records.length <= 0 && fetch_ret.length > 0);
            if (fetch_ret.length <= 0) {
                this.search_finish = true;
            }
            this.$emit('data_loaded', this.content);
        },
        search_fetch: async function () {
            let fetch_ret = [];
            if (this.enable) {
                let req_body = this.req_body;
                req_body.pageNo = this.search_page - 1;
                let resp = await this.$send_req(this.req_url, req_body);
                fetch_ret = resp[this.body_key];
                this.cur_page = req_body.pageNo+1;
            }
            return fetch_ret;
        },
        refresh: async function (pageNo) {
            this.$emit('data_loading');
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
            this.$emit('data_loaded', this.content);
        },
    },
    mounted: function () {
        this.refresh(1);
    }
}
</script>

<style scoped>
</style>

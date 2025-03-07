<template>
<div>
    <div class="same_line">
        <el-tabs v-model="focus_stuff_id" @tab-click="refresh_list">
            <el-tab-pane v-for="single_stuff in all_stuff" :key="single_stuff.id" :label="single_stuff.name" :name="String(single_stuff.id)"></el-tab-pane>
        </el-tabs>
        <div style="display:flex;">
            <el-button type="success" size="mini" @click="pop_new_event">新增</el-button>
        </div>
    </div>
    <page-content ref="list" :body_key="body_key" :enable="focus_stuff_id.length > 0" :req_body="real_req_body" :req_url="req_url">
        <template v-slot:default="slotProps">
            <el-table :data="slotProps.content" stripe>
                <slot></slot>
            </el-table>
        </template>
    </page-content>
</div>
</template>

<script>
import PageContent from './PageContent.vue'
export default {
    name: 'List4Stuff',
    props: {
        body_key: {
            type: String,
            default: ''
        },
        req_body: {
            type: Object,
            default: () => {}
        },
        req_url: {
            type: String,
            default: ''
        }
    },
    components: {
        'page-content': PageContent
    },
    computed: {
        real_req_body: function () {
            let ret = {
                ...this.req_body
            };
            ret.stuff_id = parseInt(this.focus_stuff_id);
            return ret;
        }
    },
    data: function () {
        return {
            all_stuff: [],
            focus_stuff_id: '',
        }
    },
    methods: {
        get_cur_stuff_id: function () {
            return this.focus_stuff_id;
        },
        pop_new_event: function () {
            this.$emit('new_button_click', this.focus_stuff_id);
        },
        refresh_list: function () {
            this.$nextTick(() => {
                this.$refs.list.refresh(1);
            })
        },
        init_stuff: async function () {
            let stuff = [];
            let index = 0;
            while (true) {
                let res = await this.$send_req('/stuff/get_all', {
                    pageNo: index
                });
                if (res.stuff.length == 0) {
                    break;
                }
                stuff = stuff.concat(res.stuff);
                index++;
            }
            this.all_stuff = stuff;
            if (this.all_stuff.length > 0) {
                this.focus_stuff_id = String(this.all_stuff[0].id);
                this.refresh_list();
            }
        },
    },
    mounted: async function () {
        await this.init_stuff();
    },
}
</script>

<style scoped>
.same_line {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>

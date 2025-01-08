<template>
<div>
    <vue-grid align="stretch" justify="around">
        <el-card class="box-card">
            <page-content ref="plans" body_key="reqs" :req_body="{plan_id : plan.id}" :req_url="req_url" @data_loaded="on_page_data_loaded" :enable="true">

                <template v-slot:default="slotProps">
                    <div slot="header" class="clearfix">
                        <span>安检结果</span>
                        <el-button v-if="(slotProps.content.length > 0 && slotProps.content[0].passed_total)" type="success">通过</el-button>
                        <el-button v-else type="danger">未通过</el-button>
                    </div>
                    <el-table ref="sc_confirm" v-loading="loading" :data="slotProps.content" stripe style="width: 100%">
                        <el-table-column prop="status" label="">
                            <template slot-scope="scope">
                                <el-button :type="sc_status_string(scope.row).type" size="mini" plain>{{ sc_status_string(scope.row).text }}</el-button>
                            </template>
                        </el-table-column>
                        <el-table-column prop="name" label="项目" width="100">
                        </el-table-column>
                        <el-table-column label="到期时间" width="100" :formatter="expired_time_formatter">
                        </el-table-column>
                        <el-table-column label="审批人" :formatter="(row, column, cellValue) => sc_content_formatter(row, column, cellValue, 'checker')">
                        </el-table-column>
                        <el-table-column label="审批时间" width="200" :formatter="(row, column, cellValue) => sc_content_formatter(row, column, cellValue, 'check_time')">
                        </el-table-column>
                        <el-table-column label="附言" :formatter="(row, column, cellValue) => sc_content_formatter(row, column, cellValue, 'comment')">
                        </el-table-column>
                        <el-table-column label="附件" :formatter="(row, column, cellValue) => sc_content_formatter(row, column, cellValue, 'comment')" width="150">
                            <template slot-scope="scope">
                                <el-image style="width: 50px; height: 50px" :src="get_attachment_url(scope.row)" :preview-src-list="[get_attachment_url(scope.row)]">
                                </el-image>
                                <p v-if="scope.row.sc_content">{{ scope.row.sc_content.input }}</p>
                            </template>
                        </el-table-column>
                        <el-table-column fixed="right" label="操作" width="120">
                            <template slot-scope="scope" v-if="scope.row.sc_content">
                                <el-button type="success" v-if="!scope.row.sc_content.passed" size="mini" @click="pass_sc(scope.row)">
                                    通过
                                </el-button>
                                <el-button type="danger" v-else size="mini" @click="prepare_reject_sc(scope.row)">
                                    反审
                                </el-button>
                                <el-button type="warning" v-if="!scope.row.sc_content.passed" size="mini" @click="prepare_reject_sc(scope.row)">
                                    附言
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>

                </template>

            </page-content>

        </el-card>

        <vue-cell width="12of12">
            12
        </vue-cell>
    </vue-grid>
</div>
</template>

<script>
import {
    VueGrid,
    VueCell
} from 'vue-grd';
import moment from 'moment';
import page_content from './PageContent.vue';
import {
    TableColumn
} from 'element-ui';
export default {
    name: 'OrderVerify',
    components: {
        VueGrid,
        VueCell,
        'page-content': page_content,
        'el-image-viewer': () => import('element-ui/packages/image/src/image-viewer'),
    },
    props: {
        plan: Object
    },
    computed: {

    },
    data: function () {
        return {
            req_url: "/sc/plan_status",
            loading: true
        }
    },

    methods: {
        on_page_data_loaded(data) {
            this.loading = false;
            console.log('子组件数据加载完成，数据为:', data);
            // 在这里可以进行父组件相关的操作，如更新自身数据、触发其他方法等
        },
        expired_time_formatter(item) {
            return item.need_expired ? item.sc_content.expired_time : '长期有效'
        },
        sc_content_formatter(item, column, cellValue, key) {
            console.log(item, key)
            if (item.sc_content) {
                return item.sc_content[key] || "";
            } else {
                return ""
            }
        },
        sc_status_string: function (item) {
            console.log("status", item)
            let ret = {
                text: '未上传',
                type: 'warning'
            }
            if (item.sc_content) {
                if (item.sc_content.passed) {
                    ret.text = '已通过';
                    ret.type = 'success';
                } else {
                    ret.text = '未通过';
                    ret.type = 'danger';
                }
            }
            return ret;
        },
        get_attachment_url(item) {
            if (item.sc_content && item.sc_content.attachment) {
                return this.$make_file_url(item.sc_content.attachment)
            } else {
                return "";
            }
        },
        pass_sc: async function (item, comment) {
            await this.$send_req('/sc/check', {
                content_id: item.id,
                comment: comment,
                plan_id: this.plan.id
            });
            this.$refs.plans.refresh();
        },
        prepare_reject_sc : async function(item){
            this.$prompt('请输入附言', '驳回', {
                inputPattern: /^.+$/,
                inputErrorMessage: '必须提交附言'
            }).then(async (value) => {
                await this.pass_sc(item, value)
            })
        }
    },
    mounted: async function () {
        // this.init_contract();

    },
}
</script>

<style scoped>

</style>

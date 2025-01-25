<template>
<div>
    <vue-grid align="stretch" justify="around">
        <el-card class="box-card">
            <page-content ref="plans" body_key="reqs" :req_body="{plan_id : plan.id}" :req_url="req_url" @data_loaded="on_page_data_loaded" :enable="true">

                <template v-slot:default="slotProps">
                    <div slot="header" class="clearfix">
                        <span>安检结果</span>
                        <el-button v-if="is_all_passed(slotProps.content)" type="success">通过</el-button>
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
                            <template slot-scope="scope">
                                <el-button v-if="!scope.row.sc_content" type="primary" size="mini" @click="show_upload_form(scope.row)">
                                    代传
                                </el-button>
                                <template v-else-if="!scope.row.sc_content.passed">
                                    <el-button type="success" size="mini" @click="pass_sc(scope.row)">
                                        通过
                                    </el-button>
                                    <el-button type="warning" size="mini" @click="prepare_reject_sc(scope.row)">
                                        附言
                                    </el-button>
                                    <el-button type="danger" size="mini" @click="delete_sc(scope.row)">
                                        删除
                                    </el-button>
                                </template>
                                <el-button type="danger" v-else size="mini" @click="prepare_reject_sc(scope.row)">
                                    反审
                                </el-button>
                            </template>

                        </el-table-column>
                    </el-table>

                </template>

            </page-content>

        </el-card>
    </vue-grid>
</div>
</template>

<script>
import {
    VueGrid,
    VueCell
} from 'vue-grd';
import page_content from './PageContent.vue';
import upload_form from './UploadForm.vue';

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
        },
        is_all_passed(contents) {
            if (!contents || contents.length === 0) {
                return false;
            }
            return contents.every(c => c.sc_content && c.sc_content.passed);
        },
        expired_time_formatter(item) {
            if (item.sc_content) {
                return item.need_expired ? item.sc_content.expired_time : '长期有效'
            } else {
                return '';
            }
        },
        sc_content_formatter(item, column, cellValue, key) {
            if (item.sc_content) {
                return item.sc_content[key] || "";
            } else {
                return ""
            }
        },
        sc_status_string: function (item) {
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
                content_id: item.sc_content.id,
                comment: comment,
                plan_id: this.plan.id
            });
            this.$refs.plans.refresh();
        },
        prepare_reject_sc: async function (item) {
            this.$prompt('请输入附言', '驳回', {
                inputPattern: /^.+$/,
                inputErrorMessage: '必须提交附言'
            }).then(async (message) => {
                await this.pass_sc(item, message.value)
            }).catch(() => {
                this.$message({
                    type: "info",
                    message: "放弃操作"
                });
            })
        },
        delete_sc: async function (item) {
            this.$confirm('确定要删除附件吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/global/driver_delete_sc_content', {
                    content_id: item.sc_content.id,
                    open_id: ''
                });
                this.$nextTick(() => {
                    this.$refs.plans.refresh();
                    this.$message({
                        type: 'success',
                        message: '删除成功!'
                    });
                })
            }).catch(() => {});
        },
        show_upload_form: function (item) {
            const _this = this;
            const h = this.$createElement;
            const comp = h(upload_form, {
                props: {
                    item,
                    plan: this.plan
                }
            })
            this.$msgbox({
                title: item.name,
                message: comp,
                showCancelButton: true,
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                beforeClose: (action, instance, done) => {
                    const formIns = instance.$children.find(e => e.form);
                    const form = formIns.$refs.form;
                    try {
                        if (action === 'confirm') {
                            instance.confirmButtonLoading = true;
                            instance.confirmButtonText = '执行中...';

                            form.validate(async (verified, data) => {
                                if (verified) {
                                    //do form upload
                                    let r = await _this.$send_req('/global/driver_upload_sc_content', form.model)
                                    if (r.result) {
                                        formIns.resetFormData();
                                        _this.$refs.plans.refresh();
                                        done();
                                    } else {
                                        _this.$message.error('提交服务器出现错误');
                                    }
                                }
                                instance.confirmButtonLoading = false;
                                instance.confirmButtonText = '确定';
                            });
                        } else {
                            formIns.resetFormData();
                            done();
                        }
                    } catch (e) {
                        console.log('catch', e);
                        instance.confirmButtonLoading = false;
                        instance.confirmButtonText = '确定';
                        done()
                    }
                }
            }).then((action) => {

            }).catch(e => {});
        }
    },
    mounted: async function () {},
}
</script>


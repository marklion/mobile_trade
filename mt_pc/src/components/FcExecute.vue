<template>
    <div class="container">
    
        <page-content ref="plans" body_key="fc_plan_tables" :req_body="{plan_id : plan.id}" :req_url="req_url" @data_loaded="on_page_data_loaded" :enable="true">
    
            <template v-slot:default="slotProps">
                <el-row :gutter="12">
                    <el-col :span="12" v-for="fc of slotProps.content" :key="fc.id">
                        <el-card class="box-card">
                            <div slot="header" class="clearfix">
                                <span>{{ fc.name }}</span>
                                <el-button style="float: right; padding: 3px 0" type="text" @click="commit(fc.fc_plan_table.id)">提交检查</el-button>
                            </div>
                            <el-form ref="form" :model="form" label-width="auto" label-position="left">
                                <div v-for="item of fc.fc_plan_table.fc_check_results" :key="item.id">
                                    <el-row>
                                        <el-col :span="3">
                                            <el-form-item>
                                                <el-switch v-model="form[item.id]" @change="(value) => pass_fc(value, item)"></el-switch>
                                            </el-form-item>
                                        </el-col>
                                        <el-col :span="21">
                                            <span>{{ item.field_check_item.name  }}</span>
                                        </el-col>
                                    </el-row>
                                </div>
                            </el-form>
                        </el-card>
                    </el-col>
                </el-row>
            </template>
    
        </page-content>
    </div>
    </template>
    
    <script>
    import {
        VueGrid,
        VueCell
    } from 'vue-grd';
    import moment from 'moment';
    import page_content from './PageContent.vue';
    import upload_form from './UploadForm.vue';
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
                req_url: "/sc/get_fc_plan_table",
                loading: true,
                fc_plan_tables: [],
                form: {
                    
                }
            }
        },
    
        methods: {
            on_page_data_loaded(data) {
                let _this = this;
                this.loading = false;
                this.fc_plan_tables = data;
                data.forEach(item => {
                    item.fc_plan_table.fc_check_results.forEach(result => {
                        this.$set(this.form, result.id, !!result.pass_time);
                    })
                });
            },
            pass_fc: async function (value, item) {
                await this.$send_req('/sc/set_fc_pass', {
                    fc_result_id : item.id,
                    is_pass : value
                });
            },
            commit: async function(fc_plan_id){
                await this.$send_req('/sc/commit_fc_plan', {
                    fc_plan_id
                });
                this.$refs.plans.refresh();
            }
        },
        mounted: async function () {
        },
    }
    </script>
    
    <style scoped>
    .container {
        margin: 12px
    }
    
    .el-row {
        border-bottom: 1px solid #DCDFE6;
        padding: 10px 0;
    }
    </style>
    
<template>
<div>
    <list4-stuff body_key="reqs" req_url="/sc/get_req" @new_button_click="new_req" ref="license_list">
        <el-table-column prop="name" label="需求名称"></el-table-column>
        <el-table-column label="上传方式">
            <template slot-scope="scope">
                <div>
                    <el-tag type="primary" size="mini" v-if="scope.row.need_attach">上传图片</el-tag>
                </div>
                <div>
                    <el-tag type="success" size="mini" v-if="scope.row.need_input">输入</el-tag>
                </div>
            </template>
        </el-table-column>
        <el-table-column prop="prompt" label="上传提示"></el-table-column>
        <el-table-column label="证件归属">
            <template slot-scope="scope">
                <div v-if="scope.row.belong_type == 0">司乘</div>
                <div v-else-if="scope.row.belong_type == 1">主车</div>
                <div v-else>挂车</div>
            </template>
        </el-table-column>
        <el-table-column label="其他">
            <template slot-scope="scope">
                <div>
                    <el-tag v-if="scope.row.add_to_export" type="warning" size="mini">可以导出</el-tag>
                </div>
                <div>
                    <el-tag v-if="!scope.row.need_expired" type="primary" size="mini">长期有效</el-tag>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="操作">
            <template slot-scope="scope">
                <div>
                    <el-button size="mini" type="warning" @click="prepare_update_req(scope.row)">修改</el-button>
                    <el-button size="mini" type="danger" @click="del_req(scope.row)">删除</el-button>
                </div>
            </template>
        </el-table-column>
    </list4-stuff>
    <el-dialog title="编辑证件需求" :visible.sync="edit_req" width="50%">
        <el-form :model="edit_req_body" ref="edit_req_form" :rules="edit_req_rule">
            <el-form-item label="证件名称" prop="name">
                <el-input v-model="edit_req_body.name" :disabled="is_update"></el-input>
            </el-form-item>
            <el-form-item label="证件归属">
                <el-radio-group v-model="edit_req_body.belong_type">
                    <el-radio label="0">司乘</el-radio>
                    <el-radio label="1">主车</el-radio>
                    <el-radio label="2">挂车</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item label="上传方式">
                <el-checkbox v-model="edit_req_body.need_attach">上传图片</el-checkbox>
                <el-checkbox v-model="edit_req_body.need_input">输入</el-checkbox>
            </el-form-item>
            <el-form-item label="上传提示" prop="prompt">
                <el-input v-model="edit_req_body.prompt"></el-input>
            </el-form-item>
            <el-form-item label="其他">
                <el-checkbox v-model="edit_req_body.need_expired">需要有效期</el-checkbox>
                <el-checkbox v-model="edit_req_body.add_to_export">可以导出</el-checkbox>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="edit_req= false">取 消</el-button>
            <el-button type="primary" @click="do_edit_req">确 定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import List4Stuff from '../../components/List4Stuff.vue'
export default {
    name: 'LicenseCheck',
    components: {
        'list4-stuff': List4Stuff
    },
    data: function () {
        return {
            edit_req: false,
            is_update: false,
            edit_req_body: {
                belong_type: '0',
                name: "",
                need_attach: true,
                need_expired: true,
                need_input: true,
                prompt: "",
                stuff_id: 0,
                add_to_export: false
            },
            edit_req_rule: {
                name: [{
                    required: true,
                    message: '请输入证件名称',
                    trigger: 'blur'
                }, ],
                prompt: [{
                    required: true,
                    message: '请输入上传提示',
                    trigger: 'blur'
                }, ],
            },
        }
    },
    methods: {
        del_req: async function (req) {
            this.$confirm('确认删除该证件需求吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/sc/del_req', {
                    req_id: req.id
                });
                this.$refs.license_list.refresh_list();
            });
        },
        prepare_update_req: function (req) {
            this.edit_req = true;
            this.is_update = true;
            this.edit_req_body.name = req.name;
            this.edit_req_body.belong_type = String(req.belong_type);
            this.edit_req_body.need_attach = req.need_attach;
            this.edit_req_body.need_expired = req.need_expired;
            this.edit_req_body.need_input = req.need_input;
            this.edit_req_body.prompt = req.prompt;
            this.edit_req_body.stuff_id = this.$refs.license_list.get_cur_stuff_id();
            this.edit_req_body.add_to_export = req.add_to_export;
        },
        do_edit_req: async function () {
            this.$refs.edit_req_form.validate(async (valid) => {
                if (valid) {
                    let req = {
                        ...this.edit_req_body
                    };
                    req.stuff_id = parseInt(req.stuff_id);
                    req.belong_type = parseInt(req.belong_type);
                    await this.$send_req('/sc/fetch_req', req);
                    this.edit_req = false;
                    this.$refs.license_list.refresh_list();
                }
            });
        },
        new_req: function (stuff_id) {
            this.edit_req = true;
            this.is_update = false;
            this.edit_req_body = {
                belong_type: '0',
                name: "",
                need_attach: true,
                need_expired: true,
                need_input: true,
                prompt: "",
                stuff_id: stuff_id,
                add_to_export: false
            };
        },
    },
}
</script>

<style>

</style>

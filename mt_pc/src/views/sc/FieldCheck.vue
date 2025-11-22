<template>
<div>
    <list4-stuff body_key="fc_table" req_url="/sc/get_all_fc_table" @new_button_click="new_fc_table" ref="fc_list">
        <el-table-column label="展开" type="expand">
            <template #default="scope">
                <el-table :data="scope.row.field_check_items" size="mini" style="padding-left: 50px;">
                    <el-table-column prop="name" label="检查项"></el-table-column>
                    <el-table-column label="是否需要输入" width="150px">
                        <template slot-scope="sub_scope">
                            {{sub_scope.row.need_input ? '是' : '否'}}
                        </template>
                    </el-table-column>
                    <el-table-column fixed="right" width="80px" label="操作">
                        <template slot-scope="sub_scope">
                            <el-button size="mini" type="danger" @click="del_fc_item(sub_scope.row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </template>
        </el-table-column>
        <el-table-column prop="name" label="表名"></el-table-column>
        <el-table-column label="约束">
            <template slot-scope="scope">
                <div>
                    <span>未通过不允许叫号</span>
                    <el-switch v-model="scope.row.require_before_call" @change="update_fc_require(scope.row)">
                    </el-switch>
                </div>
                <div>
                    <span>未通过不允许确认出厂</span>
                    <el-switch v-model="scope.row.require_before_confirm" @change="update_fc_require(scope.row)">
                    </el-switch>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="绑定角色">
            <template slot-scope="scope">
                <div v-if="scope.row.rbac_role">
                    {{scope.row.rbac_role.name}}
                </div>
                <div v-else>
                    未绑定
                </div>
            </template>
        </el-table-column>
        <el-table-column label="导出模板">
            <template slot-scope="scope">
                <div style="display:flex;">
                    <el-upload :file-list="always_empty" :ref="'template_uploader' + scope.row.id" :show-file-list="false" :action="$make_file_url()" accept=".docx" :limit="1" :on-success="make_upload_template_func(scope.row)">
                        <el-button size="mini" type="primary">上传模板</el-button>
                    </el-upload>
                </div>
                <el-button size="mini" type="warning" @click="$download_file(scope.row.template_path, '下载模板')">下载模板</el-button>
            </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="300px">
            <template slot-scope="scope">
                <div>
                    <el-button size="mini" type="success" @click="show_new_fc_item(scope.row)">新增检查项</el-button>
                    <el-button size="mini" type="primary" @click="prepare_set_role(scope.row)">设定角色</el-button>
                    <el-button size="mini" type="danger" @click="del_fc_table(scope.row)">删除</el-button>
                </div>
            </template>
        </el-table-column>
    </list4-stuff>

    <el-dialog title="绑定角色" :visible.sync="role_set_diag" width="30%">
        <select-search body_key="all_role" first_item="未绑定" :permission_array="['rbac']" get_url="/rbac/role_get_all" item_label="name" item_value="id" v-model="role_id_selected"></select-search>
        <span slot="footer">
            <el-button @click="role_set_diag= false">取 消</el-button>
            <el-button type="primary" @click="do_role_set">确 定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="新增检查项" :visible.sync="new_check_item_diag" width="50%">
        <el-form :model="new_check_item" ref="new_check_item_form" :rules="new_check_item_rule">
            <el-form-item label="检查项名称" prop="name">
                <el-input v-model="new_check_item.name"></el-input>
            </el-form-item>
            <el-form-item label="检查方式">
                <el-radio-group v-model="new_check_item.check_method">
                    <el-radio label="0">打钩</el-radio>
                    <el-radio label="1">输入</el-radio>
                </el-radio-group>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="new_check_item_diag= false">取 消</el-button>
            <el-button type="primary" @click="new_fc_item">确 定</el-button>
        </span>
    </el-dialog>
</div>
</template>

<script>
import List4Stuff from '../../components/List4Stuff.vue'
import SelectSearch from '../../components/SelectSearch.vue'
export default {
    name: 'FieldCheck',
    components: {
        'list4-stuff': List4Stuff,
        'select-search': SelectSearch
    },
    data: function () {
        return {
            always_empty: [],
            role_set_diag: false,
            focus_table_id: 0,
            role_id_selected: 0,
            new_check_item_diag: false,
            new_check_item: {
                name: '',
                check_method: '0',
                table_id: 0,
            },
            new_check_item_rule: {
                name: [{
                    required: true,
                    message: '请输入检查项名称',
                    trigger: 'blur'
                }],
            },
        }
    },
    methods: {
        make_upload_template_func: function (fc_table) {
            let self = this;
            return async function (res) {
                await self.$send_req('/sc/set_table_template', {
                    table_id: fc_table.id,
                    template_path: res,
                });
                self.always_empty = [];
                self.$refs['template_uploader' + fc_table.id].clearFiles();
                self.$refs.fc_list.refresh_list();
            };
        },
        do_role_set: async function () {
            await this.$send_req('/rbac/add_fc_table2role', {
                role_id: this.role_id_selected,
                table_id: this.focus_table_id
            });
            this.$refs.fc_list.refresh_list();
            this.role_set_diag = false;
        },
        prepare_set_role: function (fc_table) {
            this.focus_table_id = fc_table.id;
            this.role_set_diag = true;
        },
        new_fc_item: async function () {
            await this.$send_req('/sc/add_item2fc_table', {
                name: this.new_check_item.name,
                table_id: this.new_check_item.table_id,
                need_input: this.new_check_item.check_method == 1,
            });
            this.new_check_item_diag = false;
            this.$refs.fc_list.refresh_list();
        },
        show_new_fc_item: function (fc_table) {
            this.new_check_item.table_id = fc_table.id;
            this.new_check_item.name = '';
            this.new_check_item.check_method = '0';
            this.new_check_item_diag = true;
        },
        del_fc_table: function (fc_table) {
            this.$confirm('确认删除该表吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/sc/del_fc_table', {
                    id: fc_table.id
                });
                this.$refs.fc_list.refresh_list();
            });
        },
        update_fc_require: async function (fc_table) {
            await this.$send_req('/sc/set_table_requirement', {
                table_id: fc_table.id,
                require_before_confirm: fc_table.require_before_confirm,
                require_before_call: fc_table.require_before_call
            });
            this.$refs.fc_list.refresh_list();
        },
        del_fc_item: function (fc_item) {
            this.$confirm('确认删除该检查项吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/sc/del_fc_item', {
                    id: fc_item.id
                });
                this.$refs.fc_list.refresh_list();
            });
        },
        new_fc_table: function (stuff_id) {
            this.$prompt('请输入表名', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
            }).then(async ({
                value
            }) => {
                await this.$send_req('/sc/add_fc_table', {
                    name: value,
                    stuff_id: parseInt(stuff_id)
                });
                this.$refs.fc_list.refresh_list();
            });
        },
    },
}
</script>

<style>

</style>

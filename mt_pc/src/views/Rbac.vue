<template>
<div class="rbac_show">
    <page-content ref="role_data" body_key="all_role" enable req_url="/rbac/role_get_all">
        <template v-slot:default="slotProps">
            <div style="height: 83vh">
                <el-table ref="role_table" :data="slotProps.content" style="width: 100%" stripe height="100%">
                    <el-table-column label="角色名称">
                        <template slot-scope="scope">
                            <div>
                                <span>
                                    {{scope.row.name}}
                                </span>
                                <el-tag v-if="scope.row.is_readonly" type="warning" size="mini">只读</el-tag>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="description" label="角色描述"></el-table-column>
                    <el-table-column label="用户" type="expand">
                        <template #default="scope">
                            <el-table :data="scope.row.related_users" size="mini" style="padding-left: 50px;">
                                <el-table-column prop="name" label="姓名"></el-table-column>
                                <el-table-column prop="phone" label="手机号"></el-table-column>
                                <el-table-column fixed="right" width="80px" label="操作">
                                    <template slot-scope="sub_scope">
                                        <el-button size="mini" type="danger" @click="del_user(sub_scope.row.phone, scope.row.id)">删除</el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </template>
                    </el-table-column>
                    <el-table-column label="模块" width="300px">
                        <template #default="scope">
                            <el-tag class="module_tag_show" v-for="single_module in scope.row.related_modules" :key="single_module.id" type="primay" closable @close="del_module(single_module.id, scope.row.id)" size="mini">{{single_module.description}}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column>
                        <template slot="header">
                            <el-button size="mini" type="success" @click="create_role_diag = true">新增</el-button>
                        </template>
                        <template slot-scope="scope">
                            <el-button size="mini" type="primary" @click="add_user(scope.row)">新增用户</el-button>
                            <el-button size="mini" type="warning" @click="focus_role_id = scope.row.id">新增模块</el-button>
                            <el-button size="mini" type="danger" @click="del_role(scope.row)">删除角色</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </template>
    </page-content>
    <el-dialog title="新增用户" :visible.sync="add_user_diag" width="30%">
        <select-search body_key="all_user" get_url="/rbac/module_get_company_all_user" :params="{companyId:current_company_id}" item_label="name" item_value="phone" v-model="new_user_phone" :permission_array="['rbac']"></select-search>
        <span slot="footer">
            <el-button @click="add_user_diag = false">取消</el-button>
            <el-button type="primary" @click="confirm_add_user">确定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="新增角色" :visible.sync="create_role_diag" width="50%">
        <el-form :model="new_role" ref="new_role" :rules="new_role_rules">
            <el-form-item label="角色名称" prop="name">
                <el-input v-model="new_role.name"></el-input>
            </el-form-item>
            <el-form-item label="角色描述" prop="description">
                <el-input v-model="new_role.description"></el-input>
            </el-form-item>
            <el-form-item label="是否只读" prop="is_readonly">
                <el-switch v-model="new_role.is_readonly"></el-switch>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="create_role_diag = false">取消</el-button>
            <el-button type="primary" @click="add_role">确定</el-button>
        </span>
    </el-dialog>
    <el-dialog title="新增模块" :visible.sync="add_module_diag" width="50%">
        <select-search body_key="all_module" get_url="/rbac/module_get_all" item_label="description" item_value="id" v-model="selected_module_id" :permission_array="['rbac']"></select-search>
        <span slot="footer">
            <el-button @click="add_module_diag = false">取消</el-button>
            <el-button type="primary" @click="add_module">确定</el-button>
        </span>
    </el-dialog>
    
</div>
</template>

<script>
import { mapState } from 'vuex';
import PageContent from '../components/PageContent.vue'
import SelectSearch from '../components/SelectSearch.vue';
export default {
    name: "Rbac",
    components: {
        "page-content": PageContent,
        "select-search": SelectSearch
    },
    computed: {
        ...mapState('user', ['id']), 
        add_module_diag: {
            get() {
                return this.focus_role_id != 0;
            },
            set(val) {
                if (!val) {
                    this.focus_role_id = 0;
                }
            }
        },
        current_company_id() {
            return this.id;
        }

    },
    data: function () {
        return {
            new_user_phone:'',
            selected_module_id: 0,
            selected_user_id: 0,
            focus_role_id: 0,
            add_user_diag: false,
            add_user_phone: '',
            new_role: {
                name: '',
                description: '',
                is_readonly: false,
            },
            create_role_diag: false,
            new_role_rules: {
                name: [{
                    required: true,
                    message: '请输入角色名称',
                    trigger: 'blur'
                }, ],
            },
        };
    },
    methods: {
        refresh_roles: function () {
            this.$refs.role_data.refresh();
        },
        add_role: async function () {
            this.$refs.new_role.validate(async (valid) => {
                if (valid) {
                    await this.$send_req('/rbac/role_add', this.new_role);
                    this.new_role = {
                        name: '',
                        description: '',
                        is_readonly: false,
                    };
                    this.create_role_diag = false;
                    this.refresh_roles();
                }
            });
        },
        del_module: function (mod_id, role_id) {
            this.$confirm('确定要移除该模块和角色的关联吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/rbac/unbind_module2role', {
                    role_id: role_id,
                    module_id: mod_id
                });
                this.refresh_roles();
            });
        },
        del_user: function (phone, role_id) {
            this.$confirm('确定要移除该用户和角色的关联吗?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/rbac/unbind_role2user', {
                    phone: phone,
                    role_id: role_id
                });
                this.refresh_roles();
            });
        },
        add_user: function (row) {
            
            this.add_user_diag = true; 
            this.current_role_id = row.id; 
        },
        confirm_add_user: async function () {
        if (!this.new_user_phone) {
            this.$message.error('手机号不能为空');
            return;
        }
        if (!this.current_role_id) {
            this.$message.error('角色 ID 缺失');
            return;
        }
        try {
            await this.$send_req('/rbac/bind_role2user', {
                phone: this.new_user_phone,
                role_id: this.current_role_id,
            });
            this.$message.success('用户绑定成功');
            this.add_user_diag = false;
            this.refresh_roles();
        } catch (error) {
            console.error('绑定用户失败:', error);
            this.$message.error('绑定用户失败');
        }
        },
        add_module: async function () {
            if (this.selected_module_id == 0) {
                this.$message.error('请选择模块');
                return;
            }
            await this.$send_req('/rbac/bind_module2role', {
                role_id: this.focus_role_id,
                module_id: this.selected_module_id
            });
            this.add_module_diag = false;
            this.refresh_roles();
        },
        del_role: function (row) {
            this.$confirm('此操作将永久删除该角色, 是否继续?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/rbac/role_del', {
                    id: row.id
                });
                this.refresh_roles();
            });
        }
    },
}
</script>

<style scoped>
.rbac_show {
    padding: 20px;
}

.module_tag_show {
    margin-right: 10px;
    margin-bottom: 10px;
}

.module_tag_show:last-child {
    margin-right: 0;
}

.module_tag_show:first-child {
    margin-left: 0;
}
</style>

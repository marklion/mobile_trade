<template>
<view>
    <list-show ref="roles" :fetch_function="get_all_roles" height="80vh" search_key="name">
        <view slot-scope="{item}">
            <fui-card :title="item.name + (item.is_readonly?'(只读)':'')" :tag="item.description" showBorder>
                <fui-tag v-for="(user, index) in item.related_users" :key="index" type="danger" theme="light">
                    {{user.name + '|' + user.phone}}
                    <fui-icon name="close" size="32" @click="show_confirm_user_unbind = true;focus_role = item.id;user_phone=user.phone"></fui-icon>
                </fui-tag>
                <fui-divider></fui-divider>
                <fui-tag v-for="(mod, index) in item.related_modules" :key="index" type="primary" theme="light">
                    {{mod.description}}
                    <fui-icon name="close" size="32" @click="show_confirm_module_unbind = true;focus_role = item.id;mod_id=mod.id"></fui-icon>
                </fui-tag>
                <template #footer>
                    <view style="display: flex;">
                        <fui-button btn-size="mini" text="新增用户" style="margin-right: 10px;" @click="focus_role = item.id;show_user_add = true" type="warning"></fui-button>
                        <fui-button btn-size="mini" text="新增模块" style="margin-right: 10px;" @click="focus_role = item.id;show_module_add = true"></fui-button>
                        <fui-button btn-size="mini" text="删除角色" style="margin-right: 10px;" @click="focus_role = item.id;show_delete_role = true" type="danger"></fui-button>
                    </view>
                </template>
            </fui-card>
        </view>
    </list-show>
    <fui-dialog :show="show_user_add" :buttons="[{text:'添加', color:'red'}]" maskClosable @click="bind_role_user" @close="show_user_add = false">
        <fui-input label="电话" placeholder="请输入电话" v-model="user_phone"></fui-input>
    </fui-dialog>
    <fui-dialog :show="show_confirm_user_unbind" content="确定要删除吗?" :buttons="[{text:'删除', color:'red'}]" maskClosable @click="unbind_role_user" @close="show_confirm_user_unbind= false">
    </fui-dialog>
    <fui-bottom-popup :show="show_module_add" @close="show_module_add= false">
        <fui-list>
            <list-show :fetch_function="get_module_list" search_key="description" height="40vh">
                <fui-list-cell arrow slot-scope="{item}" @click="bind_role_module(item.id)">
                    {{item.description}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-dialog :show="show_confirm_module_unbind" content="确定要删除吗?" :buttons="[{text:'删除', color:'red'}]" maskClosable @click="unbind_role_module" @close="show_confirm_module_unbind= false">
    </fui-dialog>
    <fui-divider></fui-divider>
    <fui-button type="success" text="新增" @click="show_add_role = true"></fui-button>

    <fui-dialog :show="show_add_role" title="新增角色" :buttons="[{text:'确定', color:'red'}]" maskClosable @click="add_role" @close="show_add_role= false">
        <fui-form-item label="角色名称" asterisk>
            <fui-input placeholder="请输入角色名称" v-model="new_role.name"></fui-input>
        </fui-form-item>
        <fui-form-item label="角色描述">
            <fui-input placeholder="请输入角色描述" v-model="new_role.description"></fui-input>
        </fui-form-item>
        <fui-form-item label="是否只读">
            <fui-switch @change="set_readonly"></fui-switch>
        </fui-form-item>

    </fui-dialog>

    <fui-dialog :show="show_delete_role" content="确定要删除吗?" :buttons="[{text:'删除', color:'red'}]" maskClosable @click="delete_role" @close="show_delete_role = false">
    </fui-dialog>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue'
export default {
    name: 'RoleConfig',
    components: {
        "list-show": ListShow
    },
    data() {
        return {
            focus_role: 0,
            show_module_add: false,
            show_user_add: false,
            show_confirm_user_unbind: false,
            show_confirm_module_unbind: false,
            show_delete_role: false,
            user_phone: '',
            mod_id: 0,
            show_add_role: false,
            new_role: {
                name: '',
                description: '',
                is_readonly: false
            },
        }
    },
    methods: {
        delete_role: async function () {
            await this.$send_req('/rbac/role_del', {
                id: this.focus_role
            });
            this.show_delete_role = false;
            this.$refs.roles.refresh();
        },
        add_role: async function () {
            await this.$send_req('/rbac/role_add', this.new_role);
            this.show_add_role = false;
            this.$refs.roles.refresh();
        },
        set_readonly: function (e) {
            console.log(e);
            this.new_role.is_readonly = e.detail.value;
        },
        unbind_role_user: async function () {
            await this.$send_req('/rbac/unbind_role2user', {
                phone: this.user_phone,
                role_id: this.focus_role
            });
            this.show_confirm_user_unbind = false;
            this.$refs.roles.refresh();
        },
        bind_role_user: async function () {
            await this.$send_req('/rbac/bind_role2user', {
                phone: this.user_phone,
                role_id: this.focus_role
            });
            this.show_user_add = false;
            this.$refs.roles.refresh();
        },
        bind_role_module: async function (_id) {
            await this.$send_req('/rbac/bind_module2role', {
                role_id: this.focus_role,
                module_id: _id
            });
            this.show_module_add = false;
            this.$refs.roles.refresh();
        },
        unbind_role_module: async function () {
            await this.$send_req('/rbac/unbind_module2role', {
                role_id: this.focus_role,
                module_id: this.mod_id
            });
            this.show_confirm_module_unbind = false;
            this.$refs.roles.refresh();
        },
        get_all_roles: async function (_pageNo) {
            let res = await this.$send_req('/rbac/role_get_all', {
                pageNo: _pageNo
            });
            return res.all_role;
        },
        get_module_list: async function (_pageNo) {
            let ret = [];
            let res = await this.$send_req('/rbac/module_get_all', {
                pageNo: _pageNo
            });
            ret = res.all_module;
            return ret;
        },
    },
}
</script>

<style>

</style>

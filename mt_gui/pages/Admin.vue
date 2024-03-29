<template>
<view>
    <list-show ref="cp_ref" height="95vh" :fetch_function="get_company" search_key="head">
        <template slot-scope="{item}">
            <fui-panel :panelData="item">
                <view style="display: flex;">
                    <fui-button btn-size="mini" text="管理员配置" style="margin-right: 10px;" @click="show_admin_config = true;focus_company=item.id"></fui-button>
                    <fui-button btn-size="mini" text="模块配置" @click="open_module_config(item)"></fui-button>
                </view>
            </fui-panel>
        </template>
    </list-show>
    <fui-bottom-popup :show="show_admin_config" @close="show_admin_config = false">
        <view>
            <fui-input label="姓名" placeholder="请输入姓名" v-model="admin_config.name"></fui-input>
            <fui-input label="电话" placeholder="请输入电话" v-model="admin_config.phone"></fui-input>
            <fui-button type="success" text="新增" @click="add_admin"></fui-button>
        </view>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_module_config" @close="show_module_config= false">
        <fui-checkbox-group v-model="valid_modules">
            <list-show :fetch_function="get_module_list" search_key="description" height="40vh">
                <view slot-scope="{item}">
                    <fui-label>
                        <fui-list-cell>
                            <text>{{item.description}}</text>
                            <fui-checkbox :value="item.id" :checked="has_module(item.id)"></fui-checkbox>
                        </fui-list-cell>
                    </fui-label>
                </view>
            </list-show>
        </fui-checkbox-group>
        <fui-button type="success" text="配置" @click="config_module"></fui-button>
    </fui-bottom-popup>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue'
export default {
    name: 'Admin',
    components: {
        "list-show": ListShow
    },
    data: function () {
        return {
            admin_config: {
                name: '',
                phone: ''
            },
            modules_pool: [],
            show_admin_config: false,
            show_module_config: false,
            focus_company: 0,
            valid_modules: [],
        }
    },
    methods: {
        config_module: async function () {
            let need_delete = [];
            for (let i = 0; i < this.modules_pool.length; i++) {
                if (this.valid_modules.indexOf(this.modules_pool[i]) == -1) {
                    need_delete.push(this.modules_pool[i]);
                }
            }
            for (let i = 0; i < need_delete.length; i++) {
                let req = {
                    company_id: this.focus_company,
                    module_id: need_delete[i]
                };
                await this.$send_req('/rbac/company_del_module', req);
            }
            for (let i = 0; i < this.valid_modules.length; i++) {
                let req = {
                    company_id: this.focus_company,
                    module_id: this.valid_modules[i]
                };
                await this.$send_req('/rbac/company_add_module', req);
            }

            this.show_module_config = false;
            uni.startPullDownRefresh();
        },
        has_module: function (module_id) {
            return this.modules_pool.indexOf(module_id) != -1;
        },
        open_module_config: function (company) {
            this.focus_company = company.id
            this.show_module_config = true;
            this.modules_pool = [];
            company.bound_modules.forEach(ele => {
                this.modules_pool.push(ele.id);
            });
            console.log(this.modules_pool);
        },
        change_module: function (e) {
            console.log(e);
        },
        get_module_list: async function (_pageNo) {
            let ret = [];
            let res = await this.$send_req('/rbac/module_get_all', {
                pageNo: _pageNo
            });
            ret = res.all_module;
            return ret;
        },
        get_company: async function (_pageNo) {
            let ret = [];
            let res = await this.$send_req('/rbac/company_get_all', {
                pageNo: _pageNo
            });
            res.all_company.forEach(ele => {
                let module_array = [];
                ele.bound_modules.forEach(item => {
                    module_array.push(item.description);
                });
                let config_users = [];
                ele.config_users.forEach(item => {
                    config_users.push(item.name + '|' + item.phone);
                });
                ret.push({
                    head: ele.name,
                    desc: module_array.join('|'),
                    source: config_users.join('\n'),
                    id: ele.id,
                    bound_modules: ele.bound_modules
                });
            });
            return ret;
        },
        add_admin: async function () {
            let req = {
                company_id: this.focus_company,
                name: this.admin_config.name,
                phone: this.admin_config.phone
            };
            await this.$send_req('/rbac/reg_company_admin', req);
            this.show_admin_config = false;
            uni.startPullDownRefresh();
        },
    },
    onPullDownRefresh() {
        this.$refs.cp_ref.refresh();
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

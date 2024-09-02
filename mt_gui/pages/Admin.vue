<template>
<view>
    <list-show v-model="data2show" ref="cp_ref" height="95vh" :fetch_function="get_company" search_key="head">
        <fui-panel v-for="item in data2show" :key="item.id" :panelData="item">
            <view style="display: flex;">
                <fui-button btn-size="mini" radius="0" text="管理员配置" class="btn_config" @click="show_admin_config = true;focus_company=item.id"></fui-button>
                <fui-button btn-size="mini" radius="0" text="模块配置" class="btn_config" @click="open_module_config(item)"></fui-button>
                <fui-button btn-size="mini" radius="0" text="设置logo" class="btn_config" @click="show_logo_set = true;focus_company=item.id;has_logo=item.src"></fui-button>
                <fui-button btn-size="mini" radius="0" :text="`泄压配置:${item.pressure_config?'开':'关'}`" class="btn_config" :type="`${item.pressure_config?'success':'primary'}`"  @click="change_pressure_config(item)"></fui-button>

            </view>
        </fui-panel>
    </list-show>
    <fui-bottom-popup :show="show_logo_set" @close="show_logo_set= false">
        <fui-upload v-if="!has_logo" max="1" :sizeType="['compressed']" immediate :url="upload_url" ref="upload_kit" @success="after_attach_uploaded"></fui-upload>
        <fui-button v-else text="删除logo" type="danger" @click="delete_logo"></fui-button>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_admin_config" @close="show_admin_config = false">
        <view>
            <fui-input label="姓名" placeholder="请输入姓名" v-model="admin_config.name"></fui-input>
            <fui-input label="电话" placeholder="请输入电话" v-model="admin_config.phone"></fui-input>
            <fui-button type="success" text="新增" @click="add_admin"></fui-button>
        </view>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_module_config" @close="show_module_config= false">
        <fui-checkbox-group v-model="valid_modules">
            <list-show v-model="module_data2show" :fetch_function="get_module_list" search_key="description" height="40vh">
                <view v-for="item in module_data2show" :key="item.id">
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
            has_logo: undefined,
            show_logo_set: false,
            admin_config: {
                name: '',
                phone: ''
            },
            modules_pool: [],
            show_admin_config: false,
            show_module_config: false,
            focus_company: 0,
            valid_modules: [],
            module_data2show: [],
            data2show: [],
            upload_url: this.$remote_url() + '/api/v1/upload_file',
        }
    },
    methods: {
        change_pressure_config: async function (company) {
            company.pressure_config = !company.pressure_config
            this.config_loding = true;
            await this.$send_req('/global/company_pressure_config', {
                id: company.id,
                pressure_config: company.pressure_config,
            });
            this.config_loding = false;
        },
        delete_logo: async function () {
            await this.$send_req('/global/company_set_logo', {
                id: this.focus_company,
                logo: '',
            });
            this.show_logo_set = false;
            uni.startPullDownRefresh();
        },
        after_attach_uploaded: async function (e) {
            let logo = e.res.data;
            await this.$send_req('/global/company_set_logo', {
                id: this.focus_company,
                logo: logo,
            });
            this.show_logo_set = false;
            uni.startPullDownRefresh();
        },
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
                await this.$send_req('/global/company_del_module', req);
            }
            for (let i = 0; i < this.valid_modules.length; i++) {
                let req = {
                    company_id: this.focus_company,
                    module_id: this.valid_modules[i]
                };
                await this.$send_req('/global/company_add_module', req);
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
            let res = await this.$send_req('/global/company_get_all', {
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
                let tmp = {
                    head: ele.name,
                    desc: module_array.join('|'),
                    source: config_users.join('\n'),
                    id: ele.id,
                    pressure_config: ele.pressure_config,
                    bound_modules: ele.bound_modules
                };
                if (ele.logo) {
                    tmp.src = this.$convert_attach_url(ele.logo);
                }
                ret.push(tmp);
            });
            return ret;
        },
        add_admin: async function () {
            let req = {
                company_id: this.focus_company,
                name: this.admin_config.name,
                phone: this.admin_config.phone
            };
            await this.$send_req('/global/reg_company_admin', req);
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
.btn_config{
    padding: 10rpx 10rpx;
}
</style>

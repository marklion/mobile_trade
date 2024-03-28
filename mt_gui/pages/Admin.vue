<template>
<view>
    <list-show ref="cp_ref" height="95vh" :fetch_function="get_company" search_key="head">
        <template slot-scope="{item}">
            <fui-panel :panelData="item">
                <view style="display: flex;">
                    <fui-button btn-size="mini" text="管理员配置" style="margin-right: 10px;" @click="show_admin_config = true;focus_company=item.id"></fui-button>
                    <fui-button btn-size="mini" text="模块配置"></fui-button>
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
            show_admin_config: false,
            focus_company: 0,
        }
    },

    methods: {
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
                ret.push({
                    head: ele.name,
                    desc: module_array.join('|'),
                    id: ele.id,
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

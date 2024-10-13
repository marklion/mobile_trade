<template>
<view>
    <fui-segmented-control :values="segs" @click="change_seg"></fui-segmented-control>
    <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
    <list-show ref="sc_config" v-model="data2show" :fetch_function="get_sc_config" height="80vh" :fetch_params="[focus_stuff_id, cur_get_url, cur_content_name]">
        <view v-if="cur_get_url == segs[0].url">
            <view v-for="(item, index) in data2show" :key="index">
                <u-cell :title="item.name" :value="belong_type_string(item.belong_type)">
                    <view slot="label">
                        <fui-tag theme="plain" :scaleRatio="0.8" v-if="item.need_attach" text="上传图片" type="primary"></fui-tag>
                        <fui-tag theme="plain" :scaleRatio="0.8" v-if="item.need_input" text="输入" type="success"></fui-tag>
                        <fui-tag theme="plain" :scaleRatio="0.8" v-if="!item.need_expired" text="长期有效" type="danger"></fui-tag>
                        <fui-text :text="'提示：' + item.prompt" type="warning"></fui-text>
                    </view>
                    <view slot="right-icon">
                        <fui-button type="warning" btnSize="mini" text="修改" @click="prepare_fetch(item)"></fui-button>
                        <fui-button type="danger" btnSize="mini" text="删除" @click="prepare_delete(item)"></fui-button>
                    </view>
                </u-cell>
            </view>
        </view>
        <view v-else-if="cur_get_url == segs[1].url">
            <view v-for="(item, index) in data2show" :key="index">
                <fui-card :margin="['20rpx', '20rpx']" shadow="0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)" :title="item.name" :tag="item.rbac_role?item.rbac_role.name:'未绑定角色'">
                    <view v-for="single_item in item.field_check_items" :key="single_item.id">
                        <u-cell :title="single_item.name">
                            <view slot="right-icon">
                                <fui-button type="danger" btnSize="mini" text="删除" @click="prepare_delete_item(single_item)"></fui-button>
                            </view>
                        </u-cell>
                    </view>
                    <view class="button-container">
                        <fui-button radius="0" btnSize="mini" type="success" text="新增检查项" @click="prepare_add_item2fc_table(item)"></fui-button>
                        <fui-button radius="0" btnSize="mini" type="primary" text="设定角色" @click="prepare_set_role(item)"></fui-button>
                        <fui-button radius="0" btnSize="mini" type="danger" text="删除表格" @click="prepare_del_table(item)"></fui-button>
                    </view>
                </fui-card>
            </view>
        </view>
    </list-show>
    <fui-button v-if="cur_get_url == segs[0].url" type="success" text="新增" @click="prepare_fetch(null)"></fui-button>
    <fui-button v-else-if="cur_get_url == segs[1].url" type="success" text="新增" @click="prepare_fetch_table(null)"></fui-button>
    <fui-modal width="600" :show="show_fetch" v-if="show_fetch" @click="fetch_req">
        <fui-form ref="sc_fetch" labelWidth="240" top="100">
            <fui-input required label="名称" :disabled="!new_fetch" borderTop placeholder="请输入名称" v-model="sc_fetch_req.name"></fui-input>
            <fui-input label="提示信息" borderTop placeholder="请输入提示信息" v-model="sc_fetch_req.prompt"></fui-input>
            <fui-input label="证件所属" borderTop disabled placeholder="点击选择" :value="belong_type_input" @click="show_belong_pick = true"></fui-input>
            <fui-form-item label="输入方式">
                <fui-checkbox-group v-model="input_method">
                    <fui-checkbox value="0"></fui-checkbox>
                    输入
                    <fui-checkbox value="1"></fui-checkbox>
                    上传
                </fui-checkbox-group>
            </fui-form-item>
            <fui-form-item label="需要有效期">
                <u-switch v-model="sc_fetch_req.need_expired"></u-switch>
            </fui-form-item>
            <fui-form-item label="添加到导出表">
                <u-switch v-model="sc_fetch_req.add_to_export"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>

    <fui-modal width="600" :show="show_fetch_table" v-if="show_fetch_table" @click="fetch_fc_table">
        <fui-input required label="名称" :disabled="!new_fetch" borderTop placeholder="请输入名称" v-model="new_fc_table.name"></fui-input>
    </fui-modal>

    <fui-modal width="600" :show="show_add_item2fc_table" v-if="show_add_item2fc_table" @click="add_item2fc_table">
        <fui-input required label="名称" borderTop placeholder="请输入名称" v-model="new_fc_item.name"></fui-input>
    </fui-modal>
    <fui-modal width="600" :show="show_fc_item_delete" v-if="show_fc_item_delete" @click="delete_fc_item" :descr="'确定要删除吗?'">
    </fui-modal>
    <fui-modal width="600" :show="show_del_table" v-if="show_del_table" @click="del_fc_table" :descr="'确定要删除吗?'">
    </fui-modal>
    <fui-bottom-popup :show="show_role_set" @close="show_role_set = false">
        <list-show ref="roles" v-model="all_roles" :fetch_function="get_all_roles" height="25vh" search_key="name">
            <fui-list-cell v-for="single_role in all_roles" :key="single_role.id" arrow @click="set_role2table(single_role.id)">{{single_role.name}}</fui-list-cell>
        </list-show>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_belong_pick" @close="show_belong_pick= false">
        <fui-list-cell arrow @click="choose_belong_type(0)">司乘</fui-list-cell>
        <fui-list-cell arrow @click="choose_belong_type(1)">主车</fui-list-cell>
        <fui-list-cell arrow @click="choose_belong_type(2)">挂车</fui-list-cell>
    </fui-bottom-popup>

    <fui-modal width="600" :show="show_delete" v-if="show_delete" @click="delete_req" :descr="'确定要删除 ' + sc_fetch_req.name + ' 吗?'">
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'ScConfig',
    components: {
        "list-show": ListShow,
    },
    computed: {
        belong_type_input: function () {
            if (this.sc_fetch_req.belong_type == 0) {
                return '司乘';
            } else if (this.sc_fetch_req.belong_type == 1) {
                return '主车';
            } else {
                return '挂车';
            }
        },
        tabs: function () {
            let ret = [];
            this.all_stuff.forEach(ele => {
                ret.push({
                    name: ele.name,
                    id: ele.id
                });
            });

            return ret;
        },
    },
    data: function () {
        return {
            all_roles: [],
            focus_fc_table: undefined,
            segs: [{
                id: 0,
                name: '证件要求',
                url: '/sc/get_req',
                content_name: 'reqs',
            }, {
                id: 1,
                name: '现场检查',
                url: '/sc/get_all_fc_table',
                content_name: 'fc_table',
            }],
            cur_get_url: '/sc/get_req',
            cur_content_name: 'reqs',
            data2show: [],
            show_delete: false,
            input_method: [],
            show_fetch: false,
            show_fetch_table: false,
            show_belong_pick: false,
            focus_stuff_id: 0,
            all_stuff: [],
            sc_fetch_req: {
                "belong_type": 0,
                "name": "",
                "need_attach": true,
                "need_expired": true,
                "need_input": true,
                "prompt": "",
                "stuff_id": 0,
                "add_to_export": false
            },
            new_fetch: false,
            new_fc_table: {
                "name": "",
                "stuff_id": 0,
            },
            show_add_item2fc_table: false,
            new_fc_item: {
                "name": "",
                "table_id": 0,
            },
            fc_item_to_delete: undefined,
            show_fc_item_delete: false,
            show_del_table: false,
            show_role_set: false,
        };
    },
    methods: {
        del_fc_table: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/del_fc_table', {
                    id: this.focus_fc_table.id
                });
                uni.startPullDownRefresh();
            }
            this.show_del_table = false;
        },
        set_role2table: async function (role_id) {
            await this.$send_req('/rbac/add_fc_table2role', {
                role_id: role_id,
                table_id: this.focus_fc_table.id
            });
            uni.startPullDownRefresh();
            this.show_role_set = false;
        },
        prepare_set_role: function (table) {
            this.show_role_set = true;
            this.focus_fc_table = table;
        },
        prepare_del_table: function (fc_table) {
            this.focus_fc_table = fc_table;
            this.show_del_table = true;
        },
        add_item2fc_table: async function (e) {
            if (e.index == 1) {
                this.new_fc_item.table_id = this.focus_fc_table.id;
                await this.$send_req('/sc/add_item2fc_table', this.new_fc_item);
                uni.startPullDownRefresh();
            }
            this.show_add_item2fc_table = false;
        },
        prepare_add_item2fc_table: function (fc_table) {
            this.focus_fc_table = fc_table;
            this.show_add_item2fc_table = true;
        },
        delete_fc_item: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/del_fc_item', {
                    id: this.fc_item_to_delete.id
                });
                uni.startPullDownRefresh();
            }
            this.show_fc_item_delete = false;
        },
        prepare_delete_item: function (fc_item) {
            this.fc_item_to_delete = fc_item;
            this.show_fc_item_delete = true;
        },
        change_seg: function (e) {
            this.cur_get_url = e.url;
            this.cur_content_name = e.content_name;
            uni.startPullDownRefresh();
        },
        delete_req: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/del_req', {
                    req_id: this.sc_fetch_req.id
                });
                uni.startPullDownRefresh();
            }
            this.show_delete = false;
        },
        prepare_delete: function (sc) {
            this.show_delete = true;
            this.sc_fetch_req = {
                ...sc
            };
        },
        fetch_req: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'name',
                    rule: ['required'],
                    msg: ['请填写名称']
                }];
                let val_ret = await this.$refs.sc_fetch.validator(this.sc_fetch_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.sc_fetch_req.need_attach = this.input_method.includes('1');
                this.sc_fetch_req.need_input = this.input_method.includes('0');
                this.sc_fetch_req.stuff_id = this.focus_stuff_id;
                await this.$send_req('/sc/fetch_req', this.sc_fetch_req);
                uni.startPullDownRefresh();
            }
            this.show_fetch = false;
        },
        fetch_fc_table: async function (e) {
            if (e.index == 1) {
                this.new_fc_table.stuff_id = this.focus_stuff_id;
                await this.$send_req('/sc/add_fc_table', this.new_fc_table);
                uni.startPullDownRefresh();
            }
            this.show_fetch_table = false;
        },
        prepare_fetch_table: function (fc) {
            if (fc) {
                this.new_fc_table = {
                    ...fc
                };
                this.new_fetch = false;
            } else {
                this.new_fc_table = {
                    "name": "",
                };
                this.new_fetch = true;
            }
            this.show_fetch_table = true;
        },
        prepare_fetch: function (sc) {
            if (sc) {
                this.sc_fetch_req = {
                    ...sc
                };
                if (this.sc_fetch_req.need_attach) {
                    this.input_method.push('1');
                }
                if (this.sc_fetch_req.need_input) {
                    this.input_method.push('0');
                }

                this.new_fetch = false;
            } else {
                this.sc_fetch_req = {
                    "belong_type": 0,
                    "name": "",
                    "need_attach": true,
                    "need_expired": true,
                    "need_input": true,
                    "prompt": "",
                };
                this.new_fetch = true;
            }
            this.show_fetch = true;
        },
        choose_belong_type: function (type) {
            this.sc_fetch_req.belong_type = type;
            this.show_belong_pick = false;
        },
        belong_type_string(belong_type) {
            if (belong_type == 0) {
                return '司乘';
            } else if (belong_type == 1) {
                return '主车';
            } else {
                return '挂车';
            }
        },
        change_tab: function (e) {
            let index = e.index
            this.focus_stuff_id = this.tabs[index].id;
            this.$nextTick(() => {
                this.$refs.sc_config.refresh()
            })
        },
        get_sc_config: async function (pageNo, params) {
            if (params[0] == 0) {
                return [];
            }
            let res = await this.$send_req(params[1], {
                pageNo: pageNo,
                stuff_id: params[0]
            });

            return res[params[2]];
        },
        get_all_roles: async function (_pageNo) {
            let res = await this.$send_req('/rbac/role_get_all', {
                pageNo: _pageNo
            });
            return res.all_role;
        },
    },
    onPullDownRefresh: function () {
        this.$refs.sc_config.refresh()
        uni.stopPullDownRefresh()
    },
    onLoad: async function () {
        let stuff = [];
        let index = 0;
        while (true) {
            let res = await this.$send_req('/stuff/get_all', {
                pageNo: index
            });
            if (res.stuff.length == 0) {
                break;
            }
            stuff = stuff.concat(res.stuff);
            index++;
        }
        this.all_stuff = stuff;
        if (this.all_stuff.length > 0) {
            this.focus_stuff_id = this.all_stuff[0].id;
            this.$nextTick(() => {
                this.$refs.sc_config.refresh()
            })
        }
    },
}
</script>

<style scoped>
.button-container {
    display: flex;
    justify-content: space-between;
    padding: 0 40px;
}
</style>

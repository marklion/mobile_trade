<template>
<view>
    <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
    <list-show ref="sc_config" v-model="data2show" :fetch_function="get_sc_config" height="83vh" :fetch_params="[focus_stuff_id]">
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
    </list-show>
    <fui-button type="success" text="新增" @click="prepare_fetch(null)"></fui-button>
    <fui-modal width="600" :show="show_fetch" @click="fetch_req">
        <fui-form ref="sc_fetch" labelWidth="240" top="100">
            <fui-input required label="名称" :disabled="!new_sc" borderTop placeholder="请输入名称" v-model="sc_fetch_req.name"></fui-input>
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
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_belong_pick" @close="show_belong_pick= false">
        <fui-list-cell arrow @click="choose_belong_type(0)">司乘</fui-list-cell>
        <fui-list-cell arrow @click="choose_belong_type(1)">主车</fui-list-cell>
        <fui-list-cell arrow @click="choose_belong_type(2)">挂车</fui-list-cell>
    </fui-bottom-popup>

    <fui-modal width="600" :show="show_delete" @click="delete_req" :descr="'确定要删除 ' + sc_fetch_req.name + ' 吗?'">
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
            data2show: [],
            vue_this: this,
            show_delete: false,
            input_method: [],
            show_fetch: false,
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
                "stuff_id": 0
            },
            new_sc: false,
        };
    },
    methods: {
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

                this.new_sc = false;
            } else {
                this.sc_fetch_req = {
                    "belong_type": 0,
                    "name": "",
                    "need_attach": true,
                    "need_expired": true,
                    "need_input": true,
                    "prompt": "",
                };
                this.new_sc = true;
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
            let res = await this.$send_req('/sc/get_req', {
                pageNo: pageNo,
                stuff_id: params[0]
            });
            return res.reqs;
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

<style>

</style>

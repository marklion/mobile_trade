<template>
<view>
    <list-show ref="stuff_ref" v-model="data2show2" :fetch_function="get_all_stuff" search_key="name" height="90vh">
        <u-cell v-for="(item, index) in data2show2" :key="index" size="large" :title="item.name" :value="item.price">
            <view slot="label">
                <view style="display:flex;">
                    <fui-tag v-if="item.comment" :text="item.comment" theme="plain" :scaleRatio="0.8" type="purple"></fui-tag>
                    <fui-tag v-if="item.expect_count" :text="'期望单车装载量:' + item.expect_count" theme="plain" :scaleRatio="0.8" type="danger"></fui-tag>
                    <fui-tag v-if="item.use_for_buy" text="用于采购" theme="plain" :scaleRatio="0.8" type="primary"></fui-tag>
                    <fui-tag v-else text="用于销售" theme="plain" :scaleRatio="0.8" type="success"></fui-tag>
                </view>
                <view style="display:flex;">
                    <fui-button text="修改" btnSize="mini" radius="0" @click="prepare_update(item)"></fui-button>
                    <fui-button text="删除" type="danger" radius="0" btnSize="mini" @click="prepare_delete(item)"></fui-button>
                    <fui-button text="调价" type="warning" radius="0" btnSize="mini" @click="prepare_change_price(item)"></fui-button>
                    <fui-button text="调价历史" type="purple" radius="0" btnSize="mini" @click="prepare_history(item)"></fui-button>
                </view>
            </view>
        </u-cell>
    </list-show>
    <fui-button type="success" text="新增" @click="show_stuff_fetch = true; is_update = false"></fui-button>
    <fui-modal width="600" :show="show_stuff_fetch" @click="fetch_stuff">
        <fui-form ref="form" top="100">
            <fui-input required label="物料名称" borderTop placeholder="请输入物料名" :disabled="is_update" v-model="stuff_ready_fetch.name"></fui-input>
            <fui-input label="备注" borderTop placeholder="请输入备注" v-model="stuff_ready_fetch.comment"></fui-input>
            <fui-input label="期望单车装载量" borderTop placeholder="请输入期望单车装载量" v-model="stuff_ready_fetch.expect_count"></fui-input>
            <fui-form-item label="用于采购">
                <u-switch v-model="stuff_ready_fetch.use_for_buy"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_delete" :descr="'确定要删除' + item_for_delete.name + '吗？'" @click="delete_stuff">
    </fui-modal>
    <fui-modal width="600" :show="show_change_price" @click="change_price">
        <fui-form ref="change_price_form" top="100">
            <fui-input required label="新价格" borderTop placeholder="请输入新价格" v-model="stuff2change_price.price"></fui-input>
            <fui-input required label="备注" borderTop placeholder="请输入备注" v-model="stuff2change_price.comment"></fui-input>
            <fui-form-item label="影响计划？" asterisk>
                <u-switch v-model="stuff2change_price.to_plan"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_history" @close="show_history = false">
        <view>
            <list-show ref="history" v-model="data2show" :fetch_function="get_price_history" :fetch_params="[stuff_for_history.id]" search_key="comment" height="40vh">
                <u-cell v-for="(item, index) in data2show" :key="index" size="large" :title="item.operator" :value="item.new_price">
                    <template #label>
                        <view style="display:flex;">
                            <fui-tag :text="item.comment" theme="plain" :scaleRatio="0.8" type="purple"></fui-tag>
                            <fui-tag :text="item.time" theme="plain" :scaleRatio="0.8" type="danger"></fui-tag>
                        </view>
                    </template>
                </u-cell>
            </list-show>
        </view>
    </fui-bottom-popup>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue'
export default {
    name: 'Stuff',
    components: {
        ListShow
    },
    data: function () {
        return {
            stuff_ready_fetch: {
                name: '',
                comment: undefined,
                expect_count: undefined,
                use_for_buy: false,
            },
            show_stuff_fetch: false,
            is_update: false,
            item_for_delete: {
                name: ''
            },
            show_delete: false,
            show_change_price: false,
            show_history: false,
            stuff2change_price: {
                price: undefined,
                comment: undefined,
                to_plan: false,
                stuff_id: undefined
            },
            stuff_for_history: {
                id: 0,
            },
            data2show: [],
            data2show2: []
        }
    },
    methods: {
        get_price_history: async function (_pageNo, params) {
            if (params[0] == 0) {
                return [];
            }
            let ret = await this.$send_req('/stuff/get_price_history', {
                pageNo: _pageNo,
                stuff_id: params[0]
            });

            return ret.histories;
        },
        prepare_history: function (item) {
            this.show_history = true;
            this.stuff_for_history = item
            this.$nextTick(() => {
                this.$refs.history.refresh();
            });
        },
        change_price: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'price',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入新价格', '价格请填写数字']
                }, {
                    name: 'comment',
                    rule: ['required'],
                    msg: ['请输入备注']
                }];
                let val_ret = await this.$refs.change_price_form.validator(this.stuff2change_price, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.stuff2change_price.price = parseFloat(this.stuff2change_price.price);
                await this.$send_req('/stuff/change_price', this.stuff2change_price);
                uni.startPullDownRefresh();
            }
            this.show_change_price = false;
        },
        delete_stuff: async function (detail) {
            if (detail.index == 1) {
                await this.$send_req('/stuff/del', {
                    id: this.item_for_delete.id
                });
                uni.startPullDownRefresh();
            }
            this.show_delete = false;
        },
        prepare_change_price: function (item) {
            this.stuff2change_price = {
                price: item.price,
                comment: '',
                to_plan: false,
                stuff_id: item.id
            }
            this.show_change_price = true;
        },
        prepare_delete: function (item) {
            this.item_for_delete = item;
            this.show_delete = true;
        },
        prepare_update: function (item) {
            this.stuff_ready_fetch = {
                name: item.name,
                comment: item.comment,
                expect_count: item.expect_count,
                use_for_buy: item.use_for_buy,
            }
            this.show_stuff_fetch = true;
            this.is_update = true;
        },
        fetch_stuff: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'name',
                    rule: ['required'],
                    msg: ['请输入物料名']
                }, {
                    name: 'expect_count',
                    rule: ['isAmount'],
                    msg: ['预计装货量请填写数字']
                }];
                let val_ret = await this.$refs.form.validator(this.stuff_ready_fetch, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.stuff_ready_fetch.expect_count) {
                    this.stuff_ready_fetch.expect_count = parseFloat(this.stuff_ready_fetch.expect_count);
                }
                await this.$send_req('/stuff/fetch', this.stuff_ready_fetch);
                uni.startPullDownRefresh();
            }
            this.show_stuff_fetch = false;
        },
        get_all_stuff: async function (_pageNo) {
            let ret = await this.$send_req('/stuff/get_all', {
                pageNo: _pageNo
            });

            return ret.stuff
        },
    },
    onPullDownRefresh() {
        this.$refs.stuff_ref.refresh();
        this.stuff_ready_fetch = {
            name: '',
            comment: undefined,
            expect_count: undefined,
            use_for_buy: false,
        }
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

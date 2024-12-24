<template>
<view>
    <u-subsection :list="seg_list" :current="cur_seg" @change="seg_change"></u-subsection>
    <view v-if="cur_seg == 0">
        <list-show style="background-color: aliceblue;" ref="stuff_ref" v-model="data2show2" :fetch_function="get_all_stuff" search_key="name" height="90vh">
            <fui-card :margin="['20rpx', '20rpx']" shadow="0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)" :title="item.name" :tag="item.price + ''" v-for="(item, index) in data2show2" :key="index">
                <view style="display:flex;flex-wrap: wrap; padding: 0 13rpx;">
                    <fui-tag v-if="item.comment" :text="item.comment" theme="plain" originLeft :scaleRatio="0.8" type="purple"></fui-tag>
                    <fui-tag v-if="item.expect_count" :text="'期望单车装载量:' + item.expect_count" theme="plain" originLeft :scaleRatio="0.8" type="danger"></fui-tag>
                    <fui-tag v-if="item.close_time" :text="'自动关闭时间点:' + item.close_time" theme="plain" originLeft :scaleRatio="0.8" type="warning"></fui-tag>
                    <fui-tag v-if="item.delay_days" :text="'允许迟到' + item.delay_days + '天'" theme="plain" originLeft :scaleRatio="0.8" type="danger"></fui-tag>
                    <fui-tag v-if="item.use_for_buy" text="用于采购" theme="plain" originLeft :scaleRatio="0.8" type="primary"></fui-tag>
                    <fui-tag v-if="item.change_last_minutes" :text="next_price_show(item)" theme="plain" originLeft :scaleRatio="0.8" type="purple"></fui-tag>
                    <fui-tag v-else text="用于销售" theme="plain" originLeft :scaleRatio="0.8" type="success"></fui-tag>
                    <fui-tag v-if="item.concern_fapiao" text="关注发票" theme="plain" originLeft :scaleRatio="0.8" type="primary"></fui-tag>
                </view>
                <fui-white-space size="large"></fui-white-space>
                <view style="display:flex;justify-content: space-around;">
                    <fui-button text="修改" btnSize="mini" radius="0" @click="prepare_update(item)"></fui-button>
                    <fui-button text="删除" type="danger" radius="0" btnSize="mini" @click="prepare_delete(item)"></fui-button>
                    <fui-button text="调价" type="warning" radius="0" btnSize="mini" @click="prepare_change_price(item)"></fui-button>
                    <fui-button text="调价历史" type="purple" radius="0" btnSize="mini" @click="prepare_history(item)"></fui-button>
                    <fui-button v-if="!item.change_last_minutes" text="定时调价" type="success" radius="0" btnSize="mini" @click="prepare_next_price(item)"></fui-button>
                    <fui-button v-else text="取消定时调价" type="success" radius="0" btnSize="mini" @click="prepare_cancel_next_price(item)"></fui-button>
                </view>
                <fui-white-space size="large"></fui-white-space>
                <fui-row>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="需要安检"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.need_sc" @change="change_need_sc($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="需要进厂前重量"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.need_enter_weight" @change="change_need_enter_weight($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                </fui-row>
                <fui-white-space size="large"></fui-white-space>
                <fui-row>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="需要考试"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.need_exam" @change="change_need_exam($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="不用排号"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.no_need_register" @change="change_no_need_register($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                </fui-row>
                <fui-white-space size="large"></fui-white-space>
                <fui-row>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="延迟结算"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.checkout_delay" @change="change_checkout_delay($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="手动计量"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.manual_weight" @change="change_manual_weight($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                    <fui-col v-if="item.manual_weight" :span="24">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="磅单号前缀"></fui-text>
                                    <fui-input v-model="item.ticket_prefix" placeholder="请输入磅单号前缀"></fui-input>
                                    <fui-button text="保存" btnSize="mini" type="primary" @click="save_ticket_prefix(item)"></fui-button>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                </fui-row>
                <fui-white-space size="large"></fui-white-space>
                <fui-row>
                    <fui-col :span="12">
                        <fui-label>
                            <fui-list-cell>
                                <view class="fui-list__cell">
                                    <fui-text size="28" text="需要填写期望重量"></fui-text>
                                    <fui-switch :scaleRatio="0.7" :checked="item.need_expect_weight" @change="change_need_expect_weight($event,item)"></fui-switch>
                                </view>
                            </fui-list-cell>
                        </fui-label>
                    </fui-col>
                </fui-row>
                <fui-divider text="装卸区域配置"></fui-divider>
                <view style="display: flex; flex-wrap:wrap;">
                    <fui-tag v-for="zone in item.drop_take_zones" :key="zone.id" :text="zone.name" theme="light" margin-right="24" :padding="['12rpx','20rpx']">
                        <view class="fui-close__icon">
                            <fui-icon name="close" color="#465CFF" :size="32" @click="prepare_del_zone(zone.id)"></fui-icon>
                        </view>
                    </fui-tag>
                    <fui-button text="添加" btnSize="mini" type="primary" @click="prepare_add_zone(item)"></fui-button>
                </view>
                <fui-white-space size="large"></fui-white-space>
            </fui-card>
        </list-show>
        <fui-button type="success" text="新增" @click="show_stuff_fetch = true; is_update = false"></fui-button>
    </view>
    <view v-else-if="cur_seg == 1">
        <u-cell title="默认调价影响计划">
            <u-switch slot="value" v-model="price_profile.default_impact_plan" @change="update_price_profile"></u-switch>
        </u-cell>
        <u-cell title="隐藏调价影响计划开关">
            <u-switch slot="value" v-model="price_profile.hide_impact_selector" @change="update_price_profile"></u-switch>
        </u-cell>
        <u-cell title="检查对方资质">
            <u-switch slot="value" v-model="qualification_check" @change="set_company_qualification"></u-switch>
        </u-cell>
    </view>
    <view v-else-if="cur_seg == 2">
        <BlackList ref="blacklist_ref" />
    </view>
    <fui-modal width="600" :show="show_zone_add" v-if="show_zone_add" @click="zone_add">
        <fui-form ref="zone_form" top="100">
            <fui-input required label="区域名称" borderTop placeholder="请输入区域名称" v-model="zone_req.zone_name"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_zone_del" v-if="show_zone_del" :descr="'确定要删除吗？'" @click="delete_zone">
    </fui-modal>
    <fui-modal width="600" :show="show_stuff_fetch" v-if="show_stuff_fetch" @click="fetch_stuff">
        <fui-form ref="form" top="100">
            <fui-input required label="物料名称" borderTop placeholder="请输入物料名" :disabled="is_update" v-model="stuff_ready_fetch.name"></fui-input>
            <fui-input label="备注" borderTop placeholder="请输入备注" v-model="stuff_ready_fetch.comment"></fui-input>
            <fui-input required label="期望单车装载量" borderTop placeholder="请输入期望单车装载量" v-model="stuff_ready_fetch.expect_count"></fui-input>
            <fui-input label="允许迟到天数" borderTop placeholder="请输入允许迟到天数" v-model="stuff_ready_fetch.delay_days"></fui-input>
            <fui-input label="自动关闭时间点" borderTop placeholder="选择时间，不填就是不关闭" v-model="stuff_ready_fetch.close_time" disabled @click="show_close_time = true">
                <fui-button v-if="stuff_ready_fetch.close_time" text="取消自动关闭" @click="stuff_ready_fetch.close_time = ''" btnSize="mini" type="warning"></fui-button>
            </fui-input>
            <fui-date-picker :show="show_close_time" type="6" @change="choose_time" @cancel="show_close_time = false"></fui-date-picker>
            <fui-form-item label="用于采购">
                <u-switch v-model="stuff_ready_fetch.use_for_buy"></u-switch>
            </fui-form-item>
            <fui-form-item label="关注发票">
                <u-switch v-model="stuff_ready_fetch.concern_fapiao"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_delete" v-if="show_delete" :descr="'确定要删除' + item_for_delete.name + '吗？'" @click="delete_stuff">
    </fui-modal>
    <fui-modal width="600" :show="show_cancel_next_price" v-if="show_cancel_next_price" descr="确定要关闭定时调价吗?" @click="do_cancel_next_price">
    </fui-modal>
    <fui-modal width="600" :show="show_change_price" v-if="show_change_price" @click="change_price">
        <fui-form ref="change_price_form" top="100">
            <fui-input required label="新价格" borderTop placeholder="请输入新价格" v-model="stuff2change_price.price"></fui-input>
            <fui-input required label="备注" borderTop placeholder="请输入备注" v-model="stuff2change_price.comment"></fui-input>
            <fui-form-item label="影响计划？" asterisk v-if="!price_profile.hide_impact_selector">
                <u-switch v-model="stuff2change_price.to_plan"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_next_price" v-if="show_next_price" @click="do_next_price">
        <fui-form ref="next_price_form" top="100">
            <fui-input required label="新价格" borderTop placeholder="请输入新价格" v-model="next_price_req.next_price"></fui-input>
            <fui-input required label="备注" borderTop placeholder="请输入备注" v-model="next_price_req.next_comment"></fui-input>
            <fui-input label="调价时间" borderTop disabled placeholder="点击选择时间" v-model="next_price_req.next_time" @click="show_next_date = true"></fui-input>
        </fui-form>
    </fui-modal>

    <fui-date-picker :show="show_next_date" :minDate="today_date" :value="today_date" type="5" @change="set_next_date" @cancel="show_next_date = false"></fui-date-picker>
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
import utils from '@/components/firstui/fui-utils';
import BlackList from './BlackList.vue';
export default {
    name: 'Stuff',
    components: {
        ListShow,
        BlackList
    },
    data: function () {
        return {
            price_profile: {
                default_impact_plan: false,
                hide_impact_selector: false,
            },
            cur_seg: 0,
            seg_list: ['物料配置', '全局策略', '黑名单'],
            show_cancel_next_price: false,
            cancel_next_stuff_id: 0,
            show_next_date: false,
            show_next_price: false,
            next_price_req: {
                next_price: '',
                next_comment: '',
                next_time: '',
            },
            next_price_show: function (item) {
                let ret = '';
                let now = new Date();
                now.setMinutes(now.getMinutes() + item.change_last_minutes);
                ret = utils.dateFormatter(now, 'y-m-d h:i', 4, false) + '后，调价为' + item.next_price.toFixed(2);
                return ret;
            },
            stuff_ready_fetch: {
                name: '',
                comment: undefined,
                expect_count: undefined,
                use_for_buy: false,
                close_time: '',
                delay_days: 0,
                concern_fapiao: false,
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
            data2show2: [],
            show_close_time: false,
            today_date: utils.dateFormatter(new Date(), 'y-m-d h:i', 4, false),
            qualification_check: false,
            add_zone_stuff_id: 0,
            show_zone_add: false,
            zone_req: {
                zone_name: ''
            },
            del_zone_id: 0,
            show_zone_del: false
        }
    },
    methods: {
        save_ticket_prefix: async function (item) {
            await this.$send_req('/stuff/set_ticket_prefix', {
                stuff_id: item.id,
                ticket_prefix: item.ticket_prefix
            });
            uni.startPullDownRefresh();
        },
        prepare_del_zone: function (zone_id) {
            this.del_zone_id = zone_id;
            this.show_zone_del = true;
        },
        delete_zone: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/stuff/del_zone', {
                    id: this.del_zone_id
                });
                uni.startPullDownRefresh();
            }
            this.show_zone_del = false;
        },
        zone_add: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'zone_name',
                    rule: ['required'],
                    msg: ['请输入区域名称']
                }];

                let val_ret = await this.$refs.zone_form.validator(this.zone_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/stuff/add_zone', {
                    stuff_id: this.add_zone_stuff_id,
                    name: this.zone_req.zone_name
                });
                uni.startPullDownRefresh();
                this.zone_req.zone_name = '';
            }
            this.show_zone_add = false;
        },
        prepare_add_zone: function (item) {
            this.add_zone_stuff_id = item.id;
            this.show_zone_add = true;
        },
        init_price_profile: async function () {
            let resp = await this.$send_req('/sale_management/get_price_change_profile', {});
            this.price_profile = resp;
        },
        update_price_profile: async function () {
            await this.$send_req('/sale_management/set_price_change_profile', this.price_profile);
            await this.init_price_profile();
        },
        set_company_qualification: async function () {
            await this.$send_req('/stuff/set_check_qualification', {
                enable: this.qualification_check
            });
            await this.get_company_qualification();
        },
        get_company_qualification: async function () {
            let ret = await this.$send_req('/stuff/get_check_qualification', {});
            this.qualification_check = ret.enable;
        },
        seg_change: function (e) {
            this.cur_seg = e;
        },
        set_next_date: function (e) {
            this.next_price_req.next_time = e.result;
            this.show_next_date = false;
        },
        choose_time: function (e) {
            this.stuff_ready_fetch.close_time = e.result;
            this.show_close_time = false;
        },
        change_no_need_register: async function (event, item) {
            await this.$send_req('/stuff/no_need_register', {
                stuff_id: item.id,
                no_need_register: event.detail.value,
            });
        },
        change_need_exam: async function (event, item) {
            await this.$send_req('/stuff/exam_config', {
                stuff_id: item.id,
                need_exam: event.detail.value,
            });
        },
        change_checkout_delay: async function (event, item) {
            await this.$send_req('/stuff/checkout_delay_config', {
                stuff_id: item.id,
                checkout_delay: event.detail.value,
            });
        },
        change_manual_weight: async function (event, item) {
            item.manual_weight = event.detail.value;
            await this.$send_req('/stuff/manual_weight_config', {
                stuff_id: item.id,
                manual_weight: event.detail.value
            });
        },
        change_need_enter_weight: async function (event, item) {
            await this.$send_req('/stuff/enter_weight', {
                stuff_id: item.id,
                need_enter_weight: event.detail.value
            });
        },
        change_need_expect_weight: async function (event, item) {
            await this.$send_req('/stuff/expect_weight_config', {
                stuff_id: item.id,
                need_expect_weight: event.detail.value
            });
        },
        change_need_sc: async function (event, item) {
            await this.$send_req('/stuff/sc_config', {
                stuff_id: item.id,
                need_sc: event.detail.value
            });
        },
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
        do_next_price: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'next_price',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入新价格', '价格请填写数字']
                }, {
                    name: 'next_comment',
                    rule: ['required'],
                    msg: ['请输入备注']
                }];
                let val_ret = await this.$refs.next_price_form.validator(this.next_price_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                let clm = new Date(this.next_price_req.next_time).getTime() - new Date().getTime();
                clm = clm / 1000 / 60;
                await this.$send_req('/stuff/set_next_price', {
                    stuff_id: this.next_price_req.stuff_id,
                    next_price: parseFloat(this.next_price_req.next_price),
                    next_comment: this.next_price_req.next_comment,
                    change_last_minutes: clm
                });
                uni.startPullDownRefresh();
            }
            this.show_next_price = false;
        },
        do_cancel_next_price: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/stuff/clear_next_price', {
                    stuff_id: this.cancel_next_stuff_id,
                })
                uni.startPullDownRefresh();
            }
            this.show_cancel_next_price = false;
        },
        prepare_cancel_next_price: function (item) {
            this.show_cancel_next_price = true;
            this.cancel_next_stuff_id = item.id;
        },
        prepare_next_price: function (item) {
            this.next_price_req.stuff_id = item.id;
            this.show_next_price = true;
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
                    rule: ['required', 'isNumber'],
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
                to_plan: this.price_profile.default_impact_plan,
                stuff_id: item.id
            }
            this.show_change_price = true;
        },
        prepare_delete: function (item) {
            this.item_for_delete = item;
            this.show_delete = true;
        },
        prepare_update: function (item) {
            if (item.delay_days == null) {
                item.delay_days = 0;
            }
            this.stuff_ready_fetch = {
                name: item.name,
                comment: item.comment,
                expect_count: item.expect_count,
                use_for_buy: item.use_for_buy,
                close_time: item.close_time,
                delay_days: item.delay_days,
                concern_fapiao: item.concern_fapiao,
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
                    rule: ['required', 'isAmount'],
                    msg: ['请输入预计单车装货量', '预计装货量请填写数字']
                }, {
                    name: 'delay_days',
                    rule: ['isNumber'],
                    msg: ['允许迟到天数请填写数字']
                }];
                let val_ret = await this.$refs.form.validator(this.stuff_ready_fetch, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.stuff_ready_fetch.expect_count) {
                    this.stuff_ready_fetch.expect_count = parseFloat(this.stuff_ready_fetch.expect_count);
                }
                if (this.stuff_ready_fetch.delay_days) {
                    this.stuff_ready_fetch.delay_days = parseInt(this.stuff_ready_fetch.delay_days)
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
        this.$refs?.stuff_ref?.refresh();
        this.$refs?.blacklist_ref?.refresh();
        this.stuff_ready_fetch = {
            name: '',
            comment: undefined,
            expect_count: undefined,
            use_for_buy: false,
            close_time: '',
            delay_days: 0,
            concern_fapiao: false,
        }
        uni.stopPullDownRefresh();
    },
    onLoad: function () {
        this.init_price_profile();
        this.get_company_qualification();
    }
}
</script>

<style scoped>
.fui-list__cell {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.fui-close__icon {
    display: flex;
    align-items: center;
    padding: 6rpx 0 4rpx 24rpx;
}
</style>

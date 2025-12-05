<template>
<view>
    <u-subsection :list="seg_list" :current="cur_seg" @change="seg_change"></u-subsection>
    <view v-if="cur_seg == 0">
        <list-show style="background-color: aliceblue;" ref="stuff_ref" v-model="data2show2" :fetch_function="get_all_stuff" search_key="name" height="90vh">
            <fui-card :margin="['20rpx', '20rpx']" shadow="0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)" :title="item.name" :tag="item.price + ''" v-for="(item, index) in data2show2" :key="index">
                <view style="display:flex;flex-wrap: wrap; padding: 0 13rpx;">
                    <fui-tag v-if="item.comment" :text="item.comment" theme="plain" originLeft :scaleRatio="0.8" type="purple"></fui-tag>
                    <fui-tag v-if="item.expect_count" :text="'期望单车装载量:' + item.expect_count" theme="plain" originLeft :scaleRatio="0.8" type="danger"></fui-tag>
                    <fui-tag v-if="item.close_time" :text="'自动关闭时间点:' + item.close_time + '(' +(item.close_today?'当日':'前日') + ')'" theme="plain" originLeft :scaleRatio="0.8" type="warning"></fui-tag>
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
                <u-collapse>
                    <u-collapse-item title="点击展开" name="Docs guide">
                        <view>
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
                            <fui-white-space size="large"></fui-white-space>
                            <fui-row>
                                <fui-col :span="12">
                                    <fui-label>
                                        <fui-list-cell>
                                            <view class="fui-list__cell">
                                                <fui-text size="28" text="自动确认装卸货"></fui-text>
                                                <fui-switch :scaleRatio="0.7" :checked="item.auto_confirm_goods" @change="change_auto_confirm_goods($event,item)"></fui-switch>
                                            </view>
                                        </fui-list-cell>
                                    </fui-label>
                                </fui-col>
                            </fui-row>
                            <fui-row>
                                <fui-col :span="12">
                                    <fui-label>
                                        <fui-list-cell>
                                            <view class="fui-list__cell">
                                                <fui-text size="28" text="需要司机签名"></fui-text>
                                                <fui-switch :scaleRatio="0.7" :checked="item.need_driver_sign" @change="change_need_driver_sign($event,item)"></fui-switch>
                                            </view>
                                        </fui-list-cell>
                                    </fui-label>
                                </fui-col>
                            </fui-row>
                            <fui-white-space size="large"></fui-white-space>
                            <view>
                                <fui-row>
                                    <fui-col :span="24">
                                        <fui-label>
                                            <fui-list-cell>
                                                <view class="fui-list__cell" @click="showDelayCheckoutPicker = item.id">
                                                    <fui-text size="28">延迟结算时间点：
                                                        <text style="font-size: 34rpx; color: #666;">{{ item.delay_checkout_time || '请选择时间' }}</text>
                                                    </fui-text>
                                                </view>
                                                <fui-date-picker :scaleRatio="0.7" :value="item.delay_checkout_time" type="7" :show="showDelayCheckoutPicker === item.id" @change="confirm_checkout_delay_time($event, item)" @cancel="showDelayCheckoutPicker = null" />
                                                <fui-button text="一键结算" btnSize="mini" type="success" @click="handleBatchCheckout(item)" />
                                            </fui-list-cell>
                                        </fui-label>
                                    </fui-col>
                                </fui-row>
                            </view>
                            <fui-white-space size="large"></fui-white-space>
                            <view>
                                <fui-row>
                                    <fui-col :span="24">
                                        <fui-label>
                                            <fui-list-cell>
                                                <view class="fui-list__cell">
                                                    <fui-text size="28" text="第二单位配置"></fui-text>
                                                    <fui-input v-model="item.second_unit" placeholder="请输入单位" style="flex: 1; margin-left: 20rpx;" />
                                                </view>
                                            </fui-list-cell>
                                        </fui-label>
                                    </fui-col>
                                </fui-row>
                                <fui-row>
                                    <fui-col :span="24">
                                        <fui-label>
                                            <fui-list-cell>
                                                <view class="fui-list__cell">
                                                    <fui-text size="28" text="系数配置"></fui-text>
                                                    <fui-input-number v-model="item.coefficient" :digit="2" :step="0.1" :value="1.00" :min="0" :max="999999" style="flex: 1; margin-left: 20rpx;" />
                                                </view>
                                            </fui-list-cell>
                                        </fui-label>
                                    </fui-col>
                                </fui-row>
                                <fui-row>
                                    <fui-col :span="24">
                                        <fui-label>
                                            <fui-list-cell>
                                                <view class="fui-list__cell">
                                                    <fui-text size="28" text="小数位"></fui-text>
                                                    <fui-input-number v-model="item.second_unit_decimal" :digit="0" :step="1" :value="2" :min="0" :max="6" style="flex: 1; margin-left: 20rpx;" />
                                                </view>
                                            </fui-list-cell>
                                        </fui-label>
                                    </fui-col>
                                </fui-row>
                                <view class="btn-wrapper">
                                    <fui-button text="保存配置" type="primary" btnSize="medium" @click="set_scunit_coe_configuration(item)" />
                                </view>
                            </view>
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
                        </view>
                    </u-collapse-item>
                </u-collapse>
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
        <u-cell title="验款权限改为余额管理">
            <u-switch slot="value" v-model="verify_pay_by_cash" @change="set_verify_pay_config"></u-switch>
        </u-cell>
        <u-cell title="排队车辆界面操作安检">
            <u-switch slot="value" v-model="show_sc_in_field" @change="set_show_sc_in_field"></u-switch>
        </u-cell>
        <u-cell title="采购严格模式">
            <u-switch slot="value" v-model="buy_config_hard" @change="set_buy_config_hard"></u-switch>
        </u-cell>
        <u-cell title="是否只推送消息给可写角色">
            <u-switch slot="value" v-model="push_messages_writable_roles" @change="set_push_messages_writable_roles"></u-switch>
        </u-cell>
        <u-cell title="磅单上是否显示装卸车地点">
            <u-switch slot="value" v-model="ticket_hasOrhasnt_place" @change="set_ticket_hasOrhasnt_place"></u-switch>
        </u-cell>
        <u-cell title="门禁权限是否关闭">
            <u-switch slot="value" v-model="access_control_permission" @change="set_access_control_permission"></u-switch>
        </u-cell>
        <u-cell title="磅上闸杆是否关闭">
            <u-switch slot="value" v-model="barriergate_control_permission" @change="set_barriergate_control_permission"></u-switch>
        </u-cell>
        <u-cell title="卸车地点支持细节输入">
            <u-switch slot="value" v-model="support_location_detail" @change="set_support_location_detail"></u-switch>
        </u-cell>
        <u-cell title="是否允许订单回退">
            <u-switch slot="value" v-model="is_allowed_order_return" @change="set_is_allowed_order_return"></u-switch>
        </u-cell>
        <u-cell title="订单列表是否显示价格">
            <u-switch slot="value" v-model="is_the_order_display_price" @change="set_the_order_display_price"></u-switch>
        </u-cell>
        <u-cell title="是否允许已完成订单调价">
            <u-switch slot="value" v-model="change_finished_order_price_switch" @change="set_change_finished_order_price_switch"></u-switch>
        </u-cell>
        <u-cell title="是否限制重复订单">
            <u-switch slot="value" v-model="dup_not_permit" @change="set_dup_not_permit"></u-switch>
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
            <fui-form-item label="当日关闭">
                <u-switch v-model="stuff_ready_fetch.close_today"></u-switch>
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
import FuiDatePicker from '../components/firstui/fui-date-picker/fui-date-picker.vue';
export default {
    name: 'Stuff',
    components: {
        ListShow,
        BlackList,
        FuiDatePicker
    },
    data: function () {
        return {
            price_profile: {
                default_impact_plan: false,
                hide_impact_selector: false,
            },
            showDelayCheckoutPicker: null,
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
                close_today: false,
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
            verify_pay_by_cash: false,
            add_zone_stuff_id: 0,
            show_zone_add: false,
            zone_req: {
                zone_name: ''
            },
            del_zone_id: 0,
            show_zone_del: false,
            show_sc_in_field: false,
            buy_config_hard: false,
            push_messages_writable_roles: false,
            ticket_hasOrhasnt_place: false,
            access_control_permission: false,
            barriergate_control_permission: false,
            support_location_detail: false,
            is_allowed_order_return: false,
            is_the_order_display_price: false,
            change_finished_order_price_switch: false,
            dup_not_permit: false,
            // 全局配置管理
            globalConfigs: {
                show_sc_in_field: {
                    getUrl: '/global/get_show_sc_in_field',
                    setUrl: '/stuff/set_show_sc_in_field',
                    key: 'show_sc_in_field'
                },
                buy_config_hard: {
                    getUrl: '/global/get_buy_config_hard',
                    setUrl: '/stuff/set_buy_config_hard',
                    key: 'buy_config_hard'
                },
                push_messages_writable_roles: {
                    getUrl: '/global/get_push_messages_writable_roles',
                    setUrl: '/stuff/set_push_messages_writable_roles',
                    key: 'push_messages_writable_roles'
                },
                ticket_hasOrhasnt_place: {
                    getUrl: '/global/get_ticket_hasOrhasnt_place',
                    setUrl: '/stuff/set_ticket_hasOrhasnt_place',
                    key: 'ticket_hasOrhasnt_place'
                },
                access_control_permission: {
                    getUrl: '/global/get_access_control_permission',
                    setUrl: '/stuff/set_access_control_permission',
                    key: 'access_control_permission'
                },
                barriergate_control_permission: {
                    getUrl: '/global/get_barriergate_control_permission',
                    setUrl: '/stuff/set_barriergate_control_permission',
                    key: 'barriergate_control_permission'
                },
                support_location_detail: {
                    getUrl: '/global/get_support_location_detail',
                    setUrl: '/stuff/set_support_location_detail',
                    key: 'support_location_detail'
                },
                is_allowed_order_return: {
                    getUrl: '/global/get_is_allowed_order_return',
                    setUrl: '/stuff/set_is_allowed_order_return',
                    key: 'is_allowed_order_return'
                },
                is_the_order_display_price: {
                    getUrl: '/global/get_the_order_display_price',
                    setUrl: '/stuff/set_the_order_display_price',
                    key: 'is_the_order_display_price'
                },
                change_finished_order_price_switch: {
                    getUrl: '/global/get_change_finished_order_price_switch',
                    setUrl: '/stuff/set_change_finished_order_price_switch',
                    key: 'change_finished_order_price_switch'
                },
                dup_not_permit:{
                    getUrl: '/global/get_dup_not_permit',
                    setUrl: '/stuff/set_dup_not_permit',
                    key: 'dup_not_permit'
                },
            }
        }
    },
    methods: {
        handleBatchCheckout(item, event) {
            if (event?.stopPropagation) {
                event.stopPropagation();
            }
            this.batch_checkout(item);
        },
        batch_checkout: async function (item) {
            try {
                const {
                    confirm
                } = await uni.showModal({
                    title: '提示',
                    content: '确定要一键结算吗？',
                    showCancel: true,
                    cancelText: '取消',
                    confirmText: '确定',
                    confirmColor: '#4CAF50'
                });

                if (confirm) {
                    let resp = await this.$send_req('/sale_management/batch_checkout', {
                        stuff_id: item.id
                    });
                    uni.showToast({
                        title: `一键结算成功，${resp.order_count}个订单已结算`,
                        icon: 'success'
                    });
                }
            } catch (error) {
                console.error(error);
                uni.showToast({
                    title: '操作失败，请查看控制台日志',
                    icon: 'none'
                });
            }
        },
        confirm_checkout_delay_time(event, stuff) {
            stuff.delay_checkout_time = event.result;

            this.set_delay_checkout_time(stuff);
            this.showDelayCheckoutPicker = null;
        },
        async set_delay_checkout_time(item) {
            try {
                await this.$send_req('/stuff/set_delay_checkout_time', {
                    stuff_id: item.id,
                    delay_checkout_time: item.delay_checkout_time || ''
                });
                uni.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
                uni.startPullDownRefresh();
            } catch (error) {
                uni.showToast({
                    title: '保存失败：' + error.message,
                    icon: 'none'
                });
            }
        },
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
        set_verify_pay_config: async function () {
            await this.$send_req('/stuff/set_verify_pay_config', {
                verify_pay_by_cash: this.verify_pay_by_cash
            });
            await this.get_verify_pay_config();
        },
        get_verify_pay_config: async function () {
            this.verify_pay_by_cash = (await this.$send_req('/stuff/get_verify_pay_config', {})).verify_pay_by_cash;
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
        change_auto_confirm_goods: async function (event, item) {
            await this.$send_req('/stuff/auto_confirm_goods', {
                stuff_id: item.id,
                auto_confirm_goods: event.detail.value
            });
        },
        change_need_driver_sign: async function (event, item) {
            await this.$send_req('/stuff/need_driver_sign', {
                stuff_id: item.id,
                need_driver_sign: event.detail.value
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
        set_scunit_coe_configuration: async function (item) {
            try {
                if (!item || !item.id) {
                    uni.showToast({
                        title: '参数错误',
                        icon: 'none'
                    });
                    return;
                }
                await this.$send_req('/stuff/set_unit_coefficient', {
                    stuff_id: item.id,
                    unit_coefficient: {
                        second_unit: item.second_unit || '',
                        coefficient: item.coefficient || 0,
                        second_unit_decimal: parseInt(item.second_unit_decimal == undefined ? 2 : item.second_unit_decimal, 10)
                    }
                });
                uni.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
                uni.startPullDownRefresh();
            } catch (error) {
                uni.showToast({
                    title: error.message || '保存失败',
                    icon: 'none'
                });
            }
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
                close_today: item.close_today,
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

        // 通用获取配置方法
        getGlobalConfig: async function (configKey) {
            const config = this.globalConfigs[configKey];
            if (!config) return;

            try {
                const ret = await this.$send_req(config.getUrl, {});
                this[configKey] = ret[config.key];
            } catch (error) {
                console.error(`获取配置 ${configKey} 失败:`, error);
            }
        },

        // 通用设置配置方法
        setGlobalConfig: async function (configKey) {
            const config = this.globalConfigs[configKey];
            if (!config) return;

            try {
                await this.$send_req(config.setUrl, {
                    [config.key]: this[configKey]
                });

                // 某些配置需要重新获取以确保同步
                if (['show_sc_in_field', 'buy_config_hard'].includes(configKey)) {
                    await this.getGlobalConfig(configKey);
                }
            } catch (error) {
                console.error(`设置配置 ${configKey} 失败:`, error);
                uni.showToast({
                    title: '设置失败',
                    icon: 'none'
                });
            }
        },

        // 批量初始化所有全局配置
        initAllGlobalConfigs: async function () {
            const configKeys = Object.keys(this.globalConfigs);
            const promises = configKeys.map(key => this.getGlobalConfig(key));
            await Promise.all(promises);
        },

        // 为每个配置生成对应的get/set方法
        get_show_sc_in_field: function () {
            return this.getGlobalConfig('show_sc_in_field');
        },
        set_show_sc_in_field: function () {
            return this.setGlobalConfig('show_sc_in_field');
        },
        get_buy_config_hard: function () {
            return this.getGlobalConfig('buy_config_hard');
        },
        set_buy_config_hard: function () {
            return this.setGlobalConfig('buy_config_hard');
        },
        get_push_messages_writable_roles: function () {
            return this.getGlobalConfig('push_messages_writable_roles');
        },
        set_push_messages_writable_roles: function () {
            return this.setGlobalConfig('push_messages_writable_roles');
        },
        get_ticket_hasOrhasnt_place: function () {
            return this.getGlobalConfig('ticket_hasOrhasnt_place');
        },
        set_ticket_hasOrhasnt_place: function () {
            return this.setGlobalConfig('ticket_hasOrhasnt_place');
        },
        get_access_control_permission: function () {
            return this.getGlobalConfig('access_control_permission');
        },
        set_access_control_permission: function () {
            return this.setGlobalConfig('access_control_permission');
        },
        get_barriergate_control_permission: function () {
            return this.getGlobalConfig('barriergate_control_permission');
        },
        set_barriergate_control_permission: function () {
            return this.setGlobalConfig('barriergate_control_permission');
        },
        get_support_location_detail: function () {
            return this.getGlobalConfig('support_location_detail');
        },
        set_support_location_detail: function () {
            return this.setGlobalConfig('support_location_detail');
        },
        get_is_allowed_order_return: function () {
            return this.getGlobalConfig('is_allowed_order_return');
        },
        set_is_allowed_order_return: function () {
            return this.setGlobalConfig('is_allowed_order_return');
        },
        get_the_order_display_price: function () {
            return this.getGlobalConfig('is_the_order_display_price');
        },
        set_the_order_display_price: function () {
            return this.setGlobalConfig('is_the_order_display_price');
        },
        get_change_finished_order_price_switch: function () {
            return this.getGlobalConfig('change_finished_order_price_switch');
        },
        set_change_finished_order_price_switch: function () {
            return this.setGlobalConfig('change_finished_order_price_switch');
        },
        get_dup_not_permit: function () {
            return this.getGlobalConfig('dup_not_permit');
        },
        set_dup_not_permit: function () {
            return this.setGlobalConfig('dup_not_permit');
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
            close_today: false,
        }
        uni.stopPullDownRefresh();
    },
    onLoad: function () {
        this.init_price_profile();
        this.get_company_qualification();
        this.get_verify_pay_config();
        this.initAllGlobalConfigs();
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

.btn-wrapper {
    padding: 20rpx;
    display: flex;
    justify-content: center;
}
</style>

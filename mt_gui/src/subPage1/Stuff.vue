<template>
<view>
    <u-subsection :list="seg_list" :current="cur_seg" @change="seg_change"></u-subsection>
    <view v-if="cur_seg == 0">
        <list-show style="background-color: aliceblue;" ref="stuff_ref" v-model="data2show2" :fetch_function="get_all_stuff" height="90vh">
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
        <!-- 基础配置 -->
        <u-cell title="默认调价影响计划">
            <u-switch slot="value" v-model="price_profile.default_impact_plan" @change="update_price_profile"></u-switch>
        </u-cell>
        <u-cell title="隐藏调价影响计划开关">
            <u-switch slot="value" v-model="price_profile.hide_impact_selector" @change="update_price_profile"></u-switch>
        </u-cell>
        <u-cell title="检查对方资质">
            <u-switch slot="value" v-model="qualification_check" @change="set_company_qualification"></u-switch>
        </u-cell>
        <u-cell title="验款权限设为余额管理">
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

        <!-- 磅单配置 -->
        <u-divider text="磅单配置" style="font-size: 36rpx; font-weight: bold;"></u-divider>
        <u-cell title="称重单替换文字">
            <fui-input slot="value" v-model="replace_form.replace_weighingSheet" placeholder="请输入称重单的替换文字" style="width:300px"></fui-input>
        </u-cell>
        <u-cell title="装载量替换文字">
            <fui-input slot="value" v-model="replace_form.replace_count" placeholder="请输入装载量的替换文字" style="width:300px"></fui-input>
        </u-cell>
        <u-cell title="一次计量替换文字">
            <fui-input slot="value" v-model="replace_form.replace_fw_info" placeholder="请输入一次计量的替换文字" style="width:300px"></fui-input>
        </u-cell>
        <u-cell title="二次计量替换文字">
            <fui-input slot="value" v-model="replace_form.replace_sw_info" placeholder="请输入二次计量的替换文字" style="width:300px"></fui-input>
        </u-cell>
        <u-cell title="下单公司替换文字">
            <fui-input slot="value" v-model="replace_form.order_company" placeholder="请输入下单公司的替换文字" style="width:300px"></fui-input>
        </u-cell>
        <u-cell title="运输公司替换文字">
            <fui-input slot="value" v-model="replace_form.transportation_company" placeholder="请输入运输公司的替换文字" style="width:300px"></fui-input>
        </u-cell>
        <view style="padding: 20rpx; display: flex; justify-content: center;">
            <fui-button text="重置" type="warning" @click="onReset" style="margin-right: 20rpx;"></fui-button>
            <fui-button text="保存" type="primary" @click="onSaveReplace"></fui-button>
        </view>

        <!-- 订单额外信息 -->
        <u-divider text="订单额外信息"></u-divider>
        <list-show ref="all_extra" v-model="extra_info_configs" :fetch_function="get_extra_info_config" height="40vh">
            <u-cell v-for="(item, index) in extra_info_configs" :key="index" :title="item.title" :value="'ID: ' + item.id">
                <fui-button slot="value" text="删除" type="danger" btnSize="mini" @click="del_extra_info_config(item)"></fui-button>
            </u-cell>
        </list-show>
        <view style="padding: 20rpx;">
            <fui-button text="新增额外信息" type="success" @click="show_add_extra_info = true"></fui-button>
        </view>

        <!-- 代理配置 -->
        <u-divider text="代理配置"></u-divider>
        <list-show ref="all_delegates" v-model="delegates" :fetch_function="get_delegates" height="40vh">
            <u-cell v-for="(item, index) in delegates" :key="index" :title="item.name" :value="item.code">
                <template #label>
                    <view style="display:flex;flex-wrap: wrap;">
                        <fui-tag v-for="contract in item.contracts" :key="contract.id" :text="contract.buy_company.name + ' (' + contract.id + ')'" theme="plain" :scaleRatio="0.8" type="primary" style="margin-right: 10rpx; margin-bottom: 10rpx;">
                            <view class="fui-close__icon">
                                <fui-icon name="close" color="#465CFF" :size="32" @click="del_delegate_contract(contract.id, item.id)"></fui-icon>
                            </view>
                        </fui-tag>
                    </view>
                </template>
                <view slot="value" style="display:flex;align-items: center;">
                    <view v-if="item.stamp_pic" style="margin-right: 10rpx;">
                        <image :src="item.stamp_pic" style="width: 60rpx; height: 60rpx; border-radius: 8rpx;" @click="preview_stamp_pic(item.stamp_pic)"></image>
                    </view>
                    <fui-button text="删除" type="danger" btnSize="mini" @click="delete_delegate(item)" style="margin-right: 10rpx;"></fui-button>
                    <fui-button text="增加合同" type="primary" btnSize="mini" @click="show_add_contract(item)"></fui-button>
                </view>
            </u-cell>
        </list-show>
        <view style="padding: 20rpx;">
            <fui-button text="新增代理" type="success" @click="create_delegate = true"></fui-button>
        </view>
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
            <list-show ref="history" v-model="data2show" :fetch_function="get_price_history" :fetch_params="[stuff_for_history.id]" height="40vh">
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

    <!-- 新增代理弹窗 -->
    <fui-modal width="600" :show="create_delegate" v-if="create_delegate" @click="add_delegate">
        <fui-form ref="new_delegate" top="100">
            <fui-input required label="代理名称" borderTop placeholder="请输入代理名称" v-model="new_delegate.name"></fui-input>
            <fui-input required label="代理编号" borderTop placeholder="请输入代理编号" v-model="new_delegate.code"></fui-input>
        </fui-form>
    </fui-modal>

    <!-- 新增合同弹窗 -->
    <fui-modal width="600" :show="show_add_contract_diag" v-if="show_add_contract_diag" @click="add_contract_delegate">
        <fui-form ref="contract_form" top="100">
            <fui-input required label="合同选择" borderTop placeholder="请选择合同" v-model="contract_selected_name" disabled @click="show_contract_picker = true"></fui-input>
        </fui-form>
    </fui-modal>

    <!-- 合同选择器 -->
    <fui-bottom-popup :show="show_contract_picker" @close="show_contract_picker = false">
        <view>
            <list-show ref="contracts" v-model="contracts_list" :fetch_function="get_contracts" height="40vh">
                <u-cell v-for="(item, index) in contracts_list" :key="index" :title="item.company.name" :value="'ID: ' + item.id" @click="select_contract(item)"></u-cell>
            </list-show>
        </view>
    </fui-bottom-popup>

    <!-- 新增额外信息弹窗 -->
    <fui-modal width="600" :show="show_add_extra_info" v-if="show_add_extra_info" @click="add_extra_info_config">
        <fui-form ref="extra_info_form" top="100">
            <fui-input required label="配置标题" borderTop placeholder="请输入配置标题" v-model="new_extra_info.title"></fui-input>
        </fui-form>
    </fui-modal>
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
            // 新增的配置项
            show_sc_in_field: false,
            buy_config_hard: false,
            push_messages_writable_roles: false,
            ticket_hasOrhasnt_place: false,
            access_control_permission: false,
            barriergate_control_permission: false,
            support_location_detail: false,
            is_allowed_order_return: false,
            is_the_order_display_price: false,
            replace_form: {
                replace_weighingSheet: '',
                replace_count: '',
                replace_fw_info: '',
                replace_sw_info: '',
                order_company: '',
                transportation_company: ''
            },
            extra_info_configs: [],
            delegates: [],
            create_delegate: false,
            new_delegate: {
                name: '',
                code: '',
            },
            show_add_contract_diag: false,
            contract_id_selected: 0,
            contract_selected_name: '',
            focus_delegate_id: 0,
            show_contract_picker: false,
            contracts_list: [],
            show_add_extra_info: false,
            new_extra_info: {
                title: ''
            }
        }
    },
    methods: {
        // 通用API调用方法 - 减少重复的错误处理代码
        async apiCall(endpoint, data = {}) {
            try {
                return await this.$send_req(endpoint, data);
            } catch (error) {
                uni.showToast({
                    title: error.message || '操作失败',
                    icon: 'none'
                });
                throw error;
            }
        },

        // 通用配置获取方法 - 减少重复的配置获取代码
        async getConfig(endpoint, propertyName) {
            const ret = await this.apiCall(endpoint, {});
            this[propertyName] = ret[propertyName];
        },

        // 通用配置设置方法 - 减少重复的配置设置代码
        async setConfig(endpoint, data) {
            await this.apiCall(endpoint, data);
        },

        async changeStuffConfig(endpoint, event, item, propertyName = null) {
            const value = event.detail.value;
            if (propertyName && item) {
                item[propertyName] = value;
            }
            await this.apiCall(endpoint, {
                stuff_id: item.id,
                [propertyName || endpoint.split('/').pop()]: value
            });
        },

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
            await this.apiCall('/stuff/set_ticket_prefix', {
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
                await this.apiCall('/stuff/del_zone', {
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
                await this.apiCall('/stuff/add_zone', {
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
            this.price_profile = await this.apiCall('/sale_management/get_price_change_profile', {});
        },
        update_price_profile: async function () {
            await this.apiCall('/sale_management/set_price_change_profile', this.price_profile);
            await this.init_price_profile();
        },
        set_company_qualification: async function () {
            await this.setConfig('/stuff/set_check_qualification', {
                enable: this.qualification_check
            });
            await this.get_company_qualification();
        },
        set_verify_pay_config: async function () {
            await this.setConfig('/stuff/set_verify_pay_config', {
                verify_pay_by_cash: this.verify_pay_by_cash
            });
            await this.get_verify_pay_config();
        },
        get_verify_pay_config: async function () {
            await this.getConfig('/stuff/get_verify_pay_config', 'verify_pay_by_cash');
        },
        get_company_qualification: async function () {
            await this.getConfig('/stuff/get_check_qualification', 'qualification_check');
        },
        seg_change: function (e) {
            this.cur_seg = e;
            // 当切换到全局策略页面时，手动触发数据加载
            if (e == 1) {
                this.$nextTick(() => {
                    this.$refs?.all_extra?.refresh();
                    this.$refs?.all_delegates?.refresh();
                });
            }
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
            await this.changeStuffConfig('/stuff/no_need_register', event, item, 'no_need_register');
        },
        change_need_exam: async function (event, item) {
            await this.changeStuffConfig('/stuff/exam_config', event, item, 'need_exam');
        },
        change_checkout_delay: async function (event, item) {
            await this.changeStuffConfig('/stuff/checkout_delay_config', event, item, 'checkout_delay');
        },
        change_manual_weight: async function (event, item) {
            await this.changeStuffConfig('/stuff/manual_weight_config', event, item, 'manual_weight');
        },
        change_auto_confirm_goods: async function (event, item) {
            await this.changeStuffConfig('/stuff/auto_confirm_goods', event, item, 'auto_confirm_goods');
        },
        change_need_enter_weight: async function (event, item) {
            await this.changeStuffConfig('/stuff/enter_weight', event, item, 'need_enter_weight');
        },
        change_need_expect_weight: async function (event, item) {
            await this.changeStuffConfig('/stuff/expect_weight_config', event, item, 'need_expect_weight');
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
            await this.changeStuffConfig('/stuff/sc_config', event, item, 'need_sc');
        },
        get_price_history: async function (_pageNo, params) {
            if (params[0] == 0) {
                return [];
            }
            let ret = await this.apiCall('/stuff/get_price_history', {
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
                await this.apiCall('/stuff/clear_next_price', {
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
        // 新增的配置方法
        get_show_sc_in_field: async function () {
            await this.getConfig('/global/get_show_sc_in_field', 'show_sc_in_field');
        },
        set_show_sc_in_field: async function () {
            await this.setConfig('/stuff/set_show_sc_in_field', {
                show_sc_in_field: this.show_sc_in_field
            });
            await this.get_show_sc_in_field();
        },
        get_buy_config_hard: async function () {
            await this.getConfig('/global/get_buy_config_hard', 'buy_config_hard');
        },
        set_buy_config_hard: async function () {
            await this.setConfig('/stuff/set_buy_config_hard', {
                buy_config_hard: this.buy_config_hard
            });
            await this.get_buy_config_hard();
        },
        get_push_messages_writable_roles: async function () {
            await this.getConfig('/global/get_push_messages_writable_roles', 'push_messages_writable_roles');
        },
        set_push_messages_writable_roles: async function () {
            await this.setConfig('/stuff/set_push_messages_writable_roles', {
                push_messages_writable_roles: this.push_messages_writable_roles
            });
        },
        get_ticket_hasOrhasnt_place: async function () {
            await this.getConfig('/global/get_ticket_hasOrhasnt_place', 'ticket_hasOrhasnt_place');
        },
        set_ticket_hasOrhasnt_place: async function () {
            await this.setConfig('/stuff/set_ticket_hasOrhasnt_place', {
                ticket_hasOrhasnt_place: this.ticket_hasOrhasnt_place
            });
        },
        get_access_control_permission: async function () {
            await this.getConfig('/global/get_access_control_permission', 'access_control_permission');
        },
        set_access_control_permission: async function () { 
            await this.setConfig('/stuff/set_access_control_permission', {
                access_control_permission: this.access_control_permission
            });
        },
        set_support_location_detail: async function () {
            await this.setConfig('/stuff/set_support_location_detail', {
                support_location_detail: this.support_location_detail
            });
        },
        get_support_location_detail: async function () {
            await this.getConfig('/global/get_support_location_detail', 'support_location_detail');
        },
        set_barriergate_control_permission: async function () {
            await this.setConfig('/stuff/set_barriergate_control_permission', {
                barriergate_control_permission: this.barriergate_control_permission
            });
        },
        get_barriergate_control_permission: async function () {
            await this.getConfig('/global/get_barriergate_control_permission', 'barriergate_control_permission');
        },
        get_the_order_display_price: async function () {
            await this.getConfig('/global/get_the_order_display_price', 'is_the_order_display_price');
        },
        set_the_order_display_price: async function () {
            await this.setConfig('/stuff/set_the_order_display_price', {
                is_the_order_display_price: this.is_the_order_display_price
            });
        },
        get_is_allowed_order_return: async function () {
            await this.getConfig('/global/get_is_allowed_order_return', 'is_allowed_order_return');
        },
        set_is_allowed_order_return: async function () {
            await this.setConfig('/stuff/set_is_allowed_order_return', {
                is_allowed_order_return: this.is_allowed_order_return
            });
        },
        // 磅单配置方法
        fetchReplaceField: async function () {
            try {
                const ret = await this.$send_req('/stuff/get_replace_field', {});
                if (ret && ret.replace_form) {
                    this.replace_form = ret.replace_form;
                }
            } catch (error) {
                console.error('获取替换字段失败:', error);
                uni.showToast({
                    title: '获取替换字段失败',
                    icon: 'none'
                });
            }
        },
        onReset: function () {
            this.replace_form = {
                replace_weighingSheet: '',
                replace_count: '',
                replace_fw_info: '',
                replace_sw_info: '',
                order_company: '',
                transportation_company: ''
            }
        },
        onSaveReplace: async function () {
            let res = await this.$send_req('/stuff/set_replace_field', {
                replace_form: {
                    replace_weighingSheet: this.replace_form.replace_weighingSheet || '称重单',
                    replace_count: this.replace_form.replace_count || '装载量',
                    replace_fw_info: this.replace_form.replace_fw_info || '一次计量',
                    replace_sw_info: this.replace_form.replace_sw_info || '二次计量',
                    order_company: this.replace_form.order_company || '下单公司',
                    transportation_company: this.replace_form.transportation_company || '运输公司',
                }
            });
            if (res) {
                uni.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
            } else {
                uni.showToast({
                    title: '保存失败',
                    icon: 'none'
                });
            }
        },
        // 订单额外信息方法
        get_extra_info_config: async function (_pageNo) {
            let ret = await this.$send_req('/stuff/get_extra_info_config', {
                pageNo: _pageNo
            });
            if (ret && ret.extra_info_configs) {
                return ret.extra_info_configs;
            }
            return [];
        },
        add_extra_info_config: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'title',
                    rule: ['required'],
                    msg: ['请输入配置标题']
                }];
                let val_ret = await this.$refs.extra_info_form.validator(this.new_extra_info, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                
                let ret = await this.$send_req('/stuff/add_extra_info_config', {
                    title: this.new_extra_info.title
                });
                if (ret) {
                    this.show_add_extra_info = false;
                    this.new_extra_info.title = '';
                    uni.showToast({
                        title: '新增成功',
                        icon: 'success'
                    });
                    this.$refs.all_extra.refresh();
                } else {
                    uni.showToast({
                        title: '新增失败',
                        icon: 'none'
                    });
                }
            } else {
                // 取消按钮
                this.show_add_extra_info = false;
                this.new_extra_info.title = '';
            }
        },
        del_extra_info_config: async function (row) {
            const { confirm } = await uni.showModal({
                title: '提示',
                content: '此操作将永久删除该配置, 是否继续?',
                showCancel: true,
                cancelText: '取消',
                confirmText: '确定'
            });
            
            if (confirm) {
                let ret = await this.$send_req('/stuff/del_extra_info_config', {
                    id: row.id
                });
                if (ret) {
                    uni.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                    this.$refs.all_extra.refresh();
                } else {
                    uni.showToast({
                        title: '删除失败',
                        icon: 'none'
                    });
                }
            }
        },
        // 代理配置方法
        get_delegates: async function (_pageNo) {
            let ret = await this.$send_req('/stuff/get_delegates', {
                pageNo: _pageNo
            });
            if (ret && ret.delegates) {
                return ret.delegates;
            }
            return [];
        },
        add_delegate: async function (detail) {
            if (detail.index == 1) {
                let rules = [{
                    name: 'name',
                    rule: ['required'],
                    msg: ['请输入代理名称']
                }, {
                    name: 'code',
                    rule: ['required'],
                    msg: ['请输入代理编号']
                }];
                let val_ret = await this.$refs.new_delegate.validator(this.new_delegate, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                let ret = await this.$send_req('/stuff/add_delegate', this.new_delegate);
                if (ret) {
                    this.create_delegate = false;
                    this.new_delegate = { name: '', code: '' };
                    uni.showToast({
                        title: '新增成功',
                        icon: 'success'
                    });
                    this.$refs.all_delegates.refresh();
                } else {
                    uni.showToast({
                        title: '新增失败',
                        icon: 'none'
                    });
                }
            } else {
                // 取消按钮
                this.create_delegate = false;
                this.new_delegate = { name: '', code: '' };
            }
        },
        delete_delegate: async function (delegate) {
            const { confirm } = await uni.showModal({
                title: '提示',
                content: '此操作将永久删除该代理, 是否继续?',
                showCancel: true,
                cancelText: '取消',
                confirmText: '确定'
            });
            
            if (confirm) {
                let ret = await this.$send_req('/stuff/del_delegate', {
                    id: delegate.id
                });
                if (ret) {
                    uni.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                    this.$refs.all_delegates.refresh();
                } else {
                    uni.showToast({
                        title: '删除失败',
                        icon: 'none'
                    });
                }
            }
        },
        show_add_contract: function (delegate) {
            this.focus_delegate_id = delegate.id;
            this.show_add_contract_diag = true;
        },
        get_contracts: async function (_pageNo) {
            let ret = await this.$send_req('/sale_management/contract_get', {
                pageNo: _pageNo
            });
            return ret.contracts || [];
        },
        select_contract: function (contract) {
            this.contract_id_selected = contract.id;
            this.contract_selected_name = contract.company.name;
            this.show_contract_picker = false;
        },
        add_contract_delegate: async function (detail) {
            if (detail.index == 1) {
                if (this.contract_id_selected == 0) {
                    uni.showToast({
                        title: '请选择合同',
                        icon: 'none'
                    });
                    return;
                }
                let ret = await this.$send_req('/sale_management/add_delegate_contract', {
                    delegate_id: this.focus_delegate_id,
                    contract_id: this.contract_id_selected
                });
                if (ret) {
                    this.show_add_contract_diag = false;
                    this.contract_id_selected = 0;
                    this.contract_selected_name = '';
                    uni.showToast({
                        title: '新增成功',
                        icon: 'success'
                    });
                    this.$refs.all_delegates.refresh();
                } else {
                    uni.showToast({
                        title: '新增失败',
                        icon: 'none'
                    });
                }
            } else {
                // 取消按钮
                this.show_add_contract_diag = false;
                this.contract_id_selected = 0;
                this.contract_selected_name = '';
            }
        },
        preview_stamp_pic: function (pic_url) {
            if (pic_url) {
                uni.previewImage({
                    urls: [pic_url],
                    current: pic_url
                });
            }
        },
        del_delegate_contract: async function (contract_id, delegate_id) {
            const { confirm } = await uni.showModal({
                title: '提示',
                content: '此操作将永久删除该合同, 是否继续?',
                showCancel: true,
                cancelText: '取消',
                confirmText: '确定'
            });
            
            if (confirm) {
                let ret = await this.$send_req('/sale_management/del_delegate_contract', {
                    contract_id: contract_id,
                    delegate_id: delegate_id
                });
                if (ret) {
                    uni.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                    this.$refs.all_delegates.refresh();
                } else {
                    uni.showToast({
                        title: '删除失败',
                        icon: 'none'
                    });
                }
            }
        },
    },
    onPullDownRefresh() {
        this.$refs?.stuff_ref?.refresh();
        this.$refs?.blacklist_ref?.refresh();
        this.$refs?.all_extra?.refresh();
        this.$refs?.all_delegates?.refresh();
        // 刷新配置项
        this.init_price_profile();
        this.fetchReplaceField();
        this.get_company_qualification();
        this.get_verify_pay_config();
        this.get_buy_config_hard();
        this.get_show_sc_in_field();
        this.get_push_messages_writable_roles();
        this.get_ticket_hasOrhasnt_place();
        this.get_access_control_permission();
        this.get_support_location_detail();
        this.get_barriergate_control_permission();
        this.get_is_allowed_order_return();
        this.get_the_order_display_price();
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
        this.fetchReplaceField();
        this.get_buy_config_hard();
        this.get_show_sc_in_field();
        this.get_push_messages_writable_roles();
        this.get_ticket_hasOrhasnt_place();
        this.get_access_control_permission();
        this.get_support_location_detail();
        this.get_barriergate_control_permission();
        this.get_is_allowed_order_return();
        this.get_the_order_display_price();
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

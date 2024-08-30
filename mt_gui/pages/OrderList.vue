<template>
<view>
    <fui-segmented-control :values="seg" @click="change_seg"></fui-segmented-control>
    <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
    <view style="padding: 10rpx;">
        <module-filter :rm_array="['sale_management', 'buy_management']">
            <fui-tag theme="plain" type="purple" @click="show_stuff_list = true" marginLeft="20">
                {{stuff_filter.name}}
                <fui-icon v-if="!stuff_filter.id" name="arrowright" size="32"></fui-icon>
                <fui-icon v-else name="close" size="32" @click.native.stop="reset_stuff_filter"></fui-icon>
            </fui-tag>
            <fui-tag theme="plain" type="success" @click="show_company_filter = true" marginLeft="20">
                {{company_filter.name}}
                <fui-icon v-if="!company_filter.id" name="arrowright" size="32"></fui-icon>
                <fui-icon v-else name="close" size="32" @click.native.stop="reset_company_filter"></fui-icon>
            </fui-tag>
        </module-filter>
        <module-filter :rm_array="['customer', 'supplier']">
            <fui-tag type="primary" text="全部复制" @click="show_batch_copy = true" marginLeft="20">
            </fui-tag>
        </module-filter>

        <view style="padding-top: 10rpx;">
            <fui-row :gutter="20">
                <fui-col :span="7" v-if="!select_active">
                    显示取消计划
                </fui-col>
                <fui-col :span="4" v-if="!select_active">
                    <u-switch v-model="need_show_close" @change="change_need_show"></u-switch>
                </fui-col>
                <fui-col :span="13">
                    <fui-tag v-if="!select_active" type="purple" text="多选" @click="select_active = true">
                    </fui-tag>
                    <view v-else style="display:flex; align-items: center;">
                        <fui-tag type="warning" text="关闭多选" @click="select_active = false">
                        </fui-tag>
                        <fui-tag type="success" text="全选" @click="select_all">
                        </fui-tag>
                        <fui-tag type="danger" text="反选" @click="select_other">
                        </fui-tag>
                        <fui-tag type="primary" v-if="plan_selected.length > 0" :text="plan_selected.length + '项批量操作'" @click="action_show = true">
                        </fui-tag>
                    </view>
                </fui-col>
            </fui-row>
        </view>
    </view>
    <fui-actionsheet :zIndex="1004" :show="action_show" :isCancel="false" v-if="action_show" maskClosable :itemList="action_list()" @click="do_action" @cancel="action_show = false"></fui-actionsheet>
    <u-cell title="计划时间" :value="begin_time + '~' + end_time">
        <view slot="right-icon" style="display:flex;">
            <fui-button text="选择日期" @click="show_pick_plan_date" btnSize="mini" type="warning"></fui-button>
            <fui-button text="恢复默认" @click="reset_order_date" btnSize="mini" type="primary"></fui-button>
        </view>
    </u-cell>
    <fui-date-picker range :show="show_plan_date" type="3" :value="begin_time" :valueEnd="end_time" @change="choose_date" @cancel="close_pick_plan_date"></fui-date-picker>
    <u-checkbox-group v-model="plan_selected" placement="column">
        <list-show v-model="sp_data2show" ref="sold_plans" :fetch_function="get_sold_plans" height="70vh" search_key="search_cond" :fetch_params="[plan_filter, cur_get_url, cur_is_motion]">
            <view v-for="item in sp_data2show" :key="item.id">
                <u-cell :title="item.company_show + '-' + item.stuff.name" clickable @click="prepare_plan_detail(item)">
                    <view slot="icon" style="display:flex;">
                        <u-checkbox :name="item.id" shape="circle" v-if="select_active" size="25">
                        </u-checkbox>
                        <u-icon :name="get_status_icon(item)"></u-icon>
                    </view>
                    <view slot="value" style="display:flex; flex-direction: column;">
                        <fui-tag theme="plain" :text="'计划:' + item.plan_time" :scaleRatio="0.8" type="danger"></fui-tag>
                        <fui-tag v-if="item.is_repeat" theme="plain" text="连续派车" :scaleRatio="0.8" type="warning"></fui-tag>
                        <fui-tag v-if="item.m_time" theme="plain" :text="'发车:' + item.m_time" :scaleRatio="0.8" type="primary"></fui-tag>
                        <fui-tag v-if="item.m_time" theme="plain" :text="'装车量' + item.count" :scaleRatio="0.8" type="success"></fui-tag>
                    </view>
                    <template slot="label">
                        <view>
                            <fui-text size="24" type="success" :text="item.main_vehicle.plate + ' ' + item.behind_vehicle.plate">
                            </fui-text>
                        </view>
                        <view>
                            <fui-text size="22" type="gray" v-if="item.comment" :text="item.comment">
                            </fui-text>
                            <fui-text size="22" :type="item.fapiao_delivered?'primary':'danger'" v-if="item.stuff.concern_fapiao" :text="' 发票' + (item.fapiao_delivered?'已开':'未开')">
                            </fui-text>
                        </view>
                    </template>
                </u-cell>
            </view>
        </list-show>
    </u-checkbox-group>
    <module-filter require_module="stuff">
        <fui-bottom-popup :show="show_stuff_list" @close="show_stuff_list = false">
            <fui-list>
                <list-show v-model="stuff_data2show" :fetch_function="get_stuff" search_key="name" height="40vh">
                    <fui-list-cell arrow v-for="item in stuff_data2show" :key="item.id" @click="choose_stuff(item)">
                        {{item.name}}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
        <fui-bottom-popup :show="show_company_filter" @close="show_company_filter= false">
            <fui-list>
                <list-show v-model="customer_data2show" :fetch_function="get_customers" search_key="search_cond" height="40vh">
                    <fui-list-cell arrow v-for="item in customer_data2show" :key="item.id" @click="choose_company(item)">
                        {{item.company.name}}
                    </fui-list-cell>
                </list-show>
            </fui-list>
        </fui-bottom-popup>
    </module-filter>

    <fui-bottom-popup :show="show_plan_detail" @close="show_plan_detail = false" z-index="1001">
        <scroll-view style="height: 80vh;" show-scrollbar scroll-y>
            <view class="group_sep">
                <u-cell-group title="计划信息">
                    <u-cell :title="comp_title(focus_plan.is_buy).a_title" :value="focus_plan.company.name">
                        <view slot="label">
                            <fui-text :text="focus_plan.rbac_user.name" size="24"></fui-text>
                            <fui-text type="primary" :text="focus_plan.rbac_user.phone" size="24" textType="mobile" @click="copy_text(focus_plan.rbac_user.phone)"></fui-text>
                        </view>
                        <view slot="right-icon">
                            <module-filter v-if="focus_plan.is_buy" require_module="buy_management">
                                <fui-button v-if="focus_plan.company.id == undefined" type="primary" btnSize="mini" text="指定" @click="prepare_choose_company"></fui-button>
                                <fui-button v-else type="warning" btnSize="mini" text="重新指定" @click="show_reassign_prompt = true"></fui-button>
                            </module-filter>
                        </view>
                    </u-cell>
                    <u-cell :title="comp_title(focus_plan.is_buy).b_title" :value="focus_plan.stuff.company.name">
                        <view slot="label">
                            <view style="display:flex;align-items: center">
                                <view style="font-size: 25rpx;">{{ focus_plan.stuff.name + '-单价-' + focus_plan.unit_price }}</view>
                                <module-filter require_module="sale_management" v-if="!focus_plan.is_buy">
                                    <fui-button btnSize="mini" @click="new_stuff_price.show=true">调价</fui-button>
                                </module-filter>
                            </view>
                        </view>
                    </u-cell>
                    <u-cell title="双方资质" is-link @click="open_attach_pics"></u-cell>

                    <u-cell v-if="focus_plan.trans_company_name" title="承运公司" :value="focus_plan.trans_company_name"></u-cell>
                    <module-filter require_module="sale_management" v-if="!focus_plan.is_buy">
                        <u-cell title="余额" :label="user_authorize">
                            <view slot="value">
                                <module-filter require_module="cash">
                                    {{cur_contract.balance}}
                                </module-filter>
                            </view>
                            <view slot="right-icon">
                                <fui-button type="success" btnSize="mini" text="授权" v-if="user_authorize == '未授权'" @click="authorize_user"></fui-button>
                            </view>
                        </u-cell>
                    </module-filter>
                    <u-cell title="计划时间" :value="focus_plan.plan_time"></u-cell>
                    <u-cell :title="'当前状态：' + plan_status">
                        <view slot="value" style="display:flex;">
                            <module-filter :rm_array="['customer', 'supplier']"></module-filter>
                            <fui-button v-if="focus_plan.status != 3 && plan_owner" btnSize="mini" text="取消" type="danger" @click="prepare_xxx_confirm(cur_cancel_url, '取消')"></fui-button>
                            <module-filter :rm_array="['sale_management', 'buy_management']" style="display:flex;">
                                <fui-button v-if="focus_plan.status == 0" btnSize="mini" type="success" text="确认" @click="prepare_xxx_confirm(cur_confirm_url, '确认')"></fui-button>
                                <fui-button v-if="focus_plan.status != 0" btnSize="mini" type="warning" text="回退" @click="show_rollback_confirm = true;"></fui-button>
                                <fui-button v-if="focus_plan.status != 3" btnSize="mini" type="danger" text="关闭" @click="prepare_xxx_confirm(cur_close_url, '关闭')"></fui-button>
                                <fui-button v-if="(focus_plan.status == 1 && !focus_plan.is_buy)" btnSize="mini" type="success" text="验款" @click="prepare_xxx_confirm('/sale_management/order_sale_pay', '验款')"></fui-button>
                            </module-filter>
                            <module-filter require_module="scale">
                                <fui-button v-if="(focus_plan.status == 2) || (focus_plan.status == 1 && focus_plan.is_buy)" btnSize="mini" type="success" text="发车" @click="show_scale_input = true"></fui-button>
                            </module-filter>
                        </view>
                        <view slot="label">
                            <fui-text v-if="focus_plan.status == 3 && !focus_plan.manual_close" type="primary" text="查看磅单" :size="28" decoration="underline" @click="go_to_ticket"></fui-text>
                        </view>
                    </u-cell>
                </u-cell-group>
            </view>
            <view class="group_sep" v-if="focus_plan.stuff.concern_fapiao">
                <u-cell title="发票信息" :value="(focus_plan.fapiao_delivered?'已开':'未开')">
                    <view slot="right-icon">
                        <module-filter :require_module="'sale_management'">
                            <fui-button v-if="focus_plan.status != -1" btnSize="mini" type="primary" :text="'标记' + (focus_plan.fapiao_delivered?'未开':'已开')" @click="mark_fapiao_deliver"></fui-button>
                        </module-filter>
                    </view>
                </u-cell>
            </view>
            <view class="group_sep">
                <u-cell title="车辆信息">
                    <view slot="right-icon">
                        <fui-button type="warning" btnSize="mini" text="修改" @click="prepare_update"></fui-button>
                    </view>
                </u-cell>
                <u-cell title="主车" :value="focus_plan.main_vehicle.plate">
                </u-cell>
                <u-cell title="挂车" :value="focus_plan.behind_vehicle.plate"></u-cell>
                <u-cell :title="'司机:' + focus_plan.driver.name" :value="focus_plan.driver.phone" clickable @click="copy_text(focus_plan.driver.phone)"></u-cell>
                <u-cell title="用途" :value="focus_plan.use_for" :label="'备注：' + focus_plan.comment"></u-cell>
            </view>
            <view class="group_sep">
                <u-cell-group title="出入信息">
                    <u-cell title="是否已经进场" :value="focus_plan.enter_time?'是':'否'" :label="focus_plan.enter_time"></u-cell>
                    <u-cell v-if="focus_plan.register_time" title="排队序号" :value="focus_plan.register_number" :label="focus_plan.register_time">
                    </u-cell>
                    <module-filter require_module="scale">
                        <u-cell title="代替司机操作" isLink :url="'/pages/Driver?driver_phone=' + focus_plan.driver.phone"></u-cell>
                    </module-filter>
                </u-cell-group>
            </view>
            <view class="group_sep">
                <u-cell-group v-if="focus_plan.sc_info" title="安检信息">
                    <view v-if="focus_plan.status == 3 ">
                        <u-cell v-for="(sc_node, index) in focus_plan.sc_info" :key="index" :title="sc_node.name" :label="sc_node.sc_content?('到期时间：' + sc_node.sc_content.expired_time):''">
                            <view slot="value">
                                <view v-if="sc_node.sc_content">
                                    <view>
                                        {{sc_node.sc_content.input}}
                                    </view>
                                    <fui-avatar v-if="sc_node.sc_content.attachment" :src="$convert_attach_url(sc_node.sc_content.attachment)" @click="show_sc = true"></fui-avatar>
                                </view>
                            </view>
                        </u-cell>
                    </view>
                </u-cell-group>
                <module-filter v-else require_module="sc">
                    <u-cell title="安检执行">
                        <fui-button slot="right-icon" btnSize="mini" type="primary" text="审批" @click="prepare_sc_confirm"></fui-button>
                    </u-cell>
                </module-filter>
                <module-filter require_module="exam">
                    <u-cell title="查看考试结果" isLink :url="'/subPage1/PlanExam?plan_id=' + focus_plan.id"></u-cell>
                </module-filter>
            </view>
            <view class="group_sep">
                <u-cell-group title="装卸信息">
                    <u-cell title="卸货地址" :value="focus_plan.drop_address"></u-cell>
                    <u-cell title="装车量" :value="focus_plan.count"></u-cell>
                    <u-cell v-if="focus_plan.p_time" title="皮重" :value="focus_plan.p_weight" :label="focus_plan.p_time"></u-cell>
                    <u-cell v-if="focus_plan.m_time" title="毛重" :value="focus_plan.m_weight" :label="focus_plan.m_time"></u-cell>
                </u-cell-group>
            </view>
            <view class="group_sep">
                <u-cell-group title="操作历史">
                    <u-cell v-for="(node, index) in focus_plan.plan_histories" :key="index" :title="node.action_type" :value="node.operator" :label="node.time"></u-cell>
                </u-cell-group>
            </view>

        </scroll-view>
    </fui-bottom-popup>
    <fui-gallery :urls="sc_attach_urls" :show="show_sc" @hide="show_sc = false"></fui-gallery>

    <fui-bottom-popup :show="choose_company_show" @close="choose_company_show= false" z-index="1002">
        <fui-list>
            <list-show v-model="supplier_list" :fetch_function="get_buy_contracts" search_key="cond" height="40vh">
                <fui-list-cell v-for="item in supplier_list" :key="item.id" arrow @click="assign_supplier(item.company.id)">
                    {{item.company.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_sc_confirm" @close="show_sc_confirm= false" z-index="1002">
        <u-cell title="安检结果">
            <view slot="value">
                <fui-text v-if="(sc_data2show.length > 0 && sc_data2show[0].passed_total)" type="success" text="通过"></fui-text>
                <fui-text v-else type="danger" text="未通过"></fui-text>
            </view>
        </u-cell>
        <list-show ref="sc_confirm" v-model="sc_data2show" :fetch_function="get_plan_sc" height="70vh" :fetch_params="[focus_plan.id]">
            <view v-for="item in sc_data2show" :key="item.id">
                <u-cell>
                    <view slot="icon">
                        <fui-button v-if="!item.sc_content" type="primary" btnSize="mini" text="代传" @click="prepare_upload_sc(item)"></fui-button>
                        <fui-button v-else-if="!item.sc_content.passed" type="danger" btnSize="mini" text="删除" @click="prepare_delete_sc(item)"></fui-button>
                    </view>
                    <view slot="label" style="font-size:14px;color:gray;">
                        <view v-if="item.sc_content">
                            <view>
                                {{item.need_expired?('到期时间：' + item.sc_content.expired_time):'长期有效'}}
                            </view>
                            <view v-if="item.sc_content">
                                <view v-if="item.sc_content.checker">
                                    审批人：{{item.sc_content.checker}}
                                </view>
                                <view v-if="item.sc_content.comment">
                                    附言：{{item.sc_content.comment}}
                                </view>
                                <view v-if="item.sc_content.check_time">
                                    审批时间：{{item.sc_content.check_time}}
                                </view>
                            </view>
                        </view>
                    </view>
                    <view slot="title">
                        {{item.name}}
                        <fui-tag theme="plain" :text="sc_status_string(item.sc_content).text" :scaleRatio="0.8" :type="sc_status_string(item.sc_content).type"></fui-tag>
                    </view>
                    <view slot="value">
                        <view v-if="item.sc_content">
                            {{item.sc_content.input}}
                            <fui-avatar v-if="item.sc_content.attachment" :src="$convert_attach_url(item.sc_content.attachment)" @click="show_one_att = true;one_att=[$convert_attach_url( item.sc_content.attachment)]"></fui-avatar>
                        </view>
                    </view>
                    <view slot="right-icon">
                        <view v-if="item.sc_content">
                            <fui-button type="success" v-if="!item.sc_content.passed" btnSize="mini" text="通过" @click="pass_sc(item.sc_content.id)"></fui-button>
                            <fui-button type="danger" v-else btnSize="mini" text="反审" @click="prepare_reject_sc(item)"></fui-button>
                            <fui-button type="warning" v-if="!item.sc_content.passed" btnSize="mini" text="附言" @click="prepare_reject_sc(item)"></fui-button>
                        </view>
                    </view>
                </u-cell>
            </view>
        </list-show>
    </fui-bottom-popup>
    <!-- <fui-gallery zIndex="1004" :urls="one_att" :show="show_one_att" @hide="show_one_att = false"></fui-gallery> -->
    <fui-backdrop :zIndex="8888" :show="show_one_att">
        <movable-area scale-area class="movable-area">
            <fui-icon @click="show_one_att=false" style="z-index: 8889; position: absolute;top: 20rpx;right: 20rpx;" name="close" size="80" color="white"></fui-icon>
            <movable-view class="movable-view" direction="all" inertia scale scale-min="1" scale-max="6">
                <image class="lookimg" :src="one_att.length>0?one_att[0]:''" mode="aspectFit"></image>
            </movable-view>
        </movable-area>
    </fui-backdrop>
    <fui-modal :zIndex="1002" width="600" :descr="'确定要' + confirm_info + focus_plan.main_vehicle.plate +'吗？' + (focus_plan.status == 1?'余额可能不足':'')" :show="show_xxx_confirm" v-if="show_xxx_confirm" @click="do_xxx">
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" title="回退原因" :show="show_rollback_confirm" v-if="show_rollback_confirm" @click="do_rollback">
        <fui-form ref="rollback_form" top="100">
            <fui-input required label="原因" borderTop placeholder="请输入原因" v-model="rollback_msg"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" v-if="show_scale_input" :show="show_scale_input" @click="deliver">
        <fui-form ref="deliver" top="100">
            <fui-input label="皮重" borderTop placeholder="请输入重量" v-model="deliver_req.p_weight"></fui-input>
            <fui-input label="过皮时间" disabled borderTop placeholder="请输入时间" v-model="deliver_req.p_time" @click="prepare_deliver_date_pick('p_time')"></fui-input>
            <fui-input label="毛重" borderTop placeholder="请输入重量" v-model="deliver_req.m_weight"></fui-input>
            <fui-input label="过毛时间" disabled borderTop placeholder="请输入时间" v-model="deliver_req.m_time" @click="prepare_deliver_date_pick('m_time')"></fui-input>
            <fui-input required label="装载量" type="number" borderTop placeholder="请输入装载量" v-model="deliver_req.count">
                <fui-button type="purple" btnSize="mini" text="计算" @click="calc_count"></fui-button>
            </fui-input>
        </fui-form>
    </fui-modal>

    <fui-modal :zIndex="80" width="600" v-if="show_batch_copy" :show="show_batch_copy" @click="batch_copy">
        <fui-form ref="plan_form" :model="dup_plan">
            <fui-form-item label="计划日期" :padding="[0,'18px']" asterisk prop="plan_time" @click="show_plan_time = true">
                <fui-input placeholder="请输入计划日期" disabled v-model="dup_plan.plan_time"></fui-input>
            </fui-form-item>
            <view v-if="!cur_is_buy">
                <fui-form-item label="用途" :padding="[0,'18px']" asterisk prop="use_for" @click="show_use_for = true">
                    <fui-input placeholder="请输入用途" disabled v-model="dup_plan.use_for"></fui-input>
                </fui-form-item>
                <pick-regions @getRegion="pick_address">
                    <fui-form-item label="卸车地点" :padding="[0,'18px']" asterisk prop="drop_address">
                        <fui-input placeholder="请输入卸车地点" disabled v-model="dup_plan.drop_address"></fui-input>
                    </fui-form-item>
                </pick-regions>
            </view>
            <view v-else>
                <fui-form-item label="单价" :padding="[0,'18px']" prop="price">
                    <fui-input placeholder="请输入单价" v-model="dup_plan.price"></fui-input>
                </fui-form-item>
            </view>
            <fui-form-item label="承运公司" :padding="[0,'18px']" prop="trans_company_name">
                <fui-input placeholder="请输入承运公司" v-model="dup_plan.trans_company_name"></fui-input>
            </fui-form-item>
        </fui-form>
        <fui-date-picker :show="show_plan_time" type="3" :value="default_time" @change="fill_plan_time" @cancel="show_plan_time = false"></fui-date-picker>
        <fui-bottom-popup :show="show_use_for" @close="show_use_for = false">
            <fui-list>
                <fui-list-cell v-for="(single_uf, index) in use_for_array" :key="index" arrow @click="choose_use_for(single_uf)">
                    {{single_uf}}
                </fui-list-cell>
            </fui-list>
        </fui-bottom-popup>
    </fui-modal>
    <fui-modal :zIndex="1004" width="600" v-if="show_reject_sc" :show="show_reject_sc" @click="reject_sc">
        <fui-input required label="附言" borderTop placeholder="请输入附言" v-model="reject_sc_comment"></fui-input>
    </fui-modal>
    <fui-date-picker zIndex="1003" :show="show_deliver_date" type="5" :value="deliver_time" @change="choose_deliver_date" @cancel="show_deliver_date= false"></fui-date-picker>
    <sc-upload ref="sc_up" @uploaded="prepare_sc_confirm" :prompt="upload_sc.prompt" :title="upload_sc.name" :open_id="upload_sc.open_id" :plan_id="upload_sc.plan_id" :req_id="upload_sc.req_id" :need_attach="upload_sc.need_attach" :need_expired="upload_sc.need_expired" :need_input="upload_sc.need_input"></sc-upload>
    <fui-modal :zIndex="1003" width="600" descr="确定要删除吗？" v-if="show_delete_sc_content" :show="show_delete_sc_content" @click="delete_sc_content">
    </fui-modal>
    <fui-modal :zIndex="1003" width="600" descr="确定要重新指定吗？" v-if="show_reassign_prompt" :show="show_reassign_prompt" @click="reassign_supplier">
    </fui-modal>
    <fui-modal :zIndex="1004" width="600" v-if="show_update" :show="show_update" @click="update_plan">
        <fui-form ref="plan_update" :model="update_req">
            <fui-input label="主车号" v-model="update_req.main_vehicle_plate"></fui-input>
            <fui-input label="挂车号" v-model="update_req.behind_vehicle_plate"></fui-input>
            <fui-input label="司机电话" v-model="update_req.driver_phone"></fui-input>
            <fui-input label="备注" v-model="update_req.comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" v-if="new_stuff_price.show" title="调价" :show="new_stuff_price.show" @cancel="cancel_new_stuff_price" @click="do_new_stuff_pirce">
        <fui-form ref="new_stuff_price_form" top="100">
            <fui-input required label="新单价" borderTop placeholder="请输入新单价" v-model="new_stuff_price.price"></fui-input>
            <fui-input label="备注" borderTop placeholder="调价备注" v-model="new_stuff_price.comment"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-message ref="po_msg"></fui-message>
    <fui-toast ref="toast"></fui-toast>
    <fui-gallery :urls="get_both_attach" v-if="show_attach" :show="show_attach" @hide="show_attach = false" @change="change_index"></fui-gallery>
    <fui-button v-if="show_attach" class="downloadBtn" type="link" text="下载" @click="download_img"></fui-button>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import ModuleFilterVue from '../components/ModuleFilter.vue';
import $fui from '@/components/firstui/fui-clipboard';
import ScUpload from '../components/ScUpload.vue';
import pickRegions from '@/components/pick-regions/pick-regions.vue'
export default {
    name: 'OrderList',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilterVue,
        "sc-upload": ScUpload,
        "pick-regions": pickRegions,
    },
    data: function () {
        return {
            show_attach: false,
            new_stuff_price: {
                show: false,
                price: 0,
                comment: '',
                isMuti: false
            },
            cur_contract: {
                balance: 0,
                rbac_users: [],
            },
            action_show: false,
            action_list: () => {
                return [{
                    text: "批量确认",
                    url: this.cur_confirm_url,
                }, {
                    text: '批量验款',
                    url: '/sale_management/order_sale_pay'
                }, {
                    text: '批量取消',
                    url: this.cur_close_url ? this.cur_close_url : this.cur_cancel_url,
                }, {
                    text: '批量调价',
                    url: '/stuff/change_price_by_plan',
                }]
            },
            select_active: false,
            plan_selected: [],
            show_update: false,
            update_req: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_phone: '',
            },
            rollback_msg: '',
            use_for_array: [
                '气化', '气站', '其他'
            ],
            default_time: '',
            dup_plan: {
                comment: "",
                drop_address: "",
                plan_time: "",
                stuff_id: 0,
                use_for: "",
                trans_company_name: '',
                price: 0,
            },
            show_plan_time: false,
            show_use_for: false,
            show_reassign_prompt: false,
            supplier_list: [],
            choose_company_show: false,
            comp_title: function (is_buy) {
                let ret = {
                    a_title: '买方',
                    b_title: '卖方'
                }
                if (is_buy) {
                    ret = {
                        a_title: '卖方',
                        b_title: '买方',
                    }
                }
                return ret;
            },
            cur_get_url: '',
            cur_is_motion: false,
            cur_is_buy: false,
            cur_batch_confirm_url: '',
            cur_confirm_url: '',
            cur_rollback_url: '',
            cur_update_url: '',
            cur_cancel_url: '',
            cur_dup_url: '',
            cur_close_url: '',
            sc_data2show: [],
            customer_data2show: [],
            stuff_data2show: [],
            sp_data2show: [],
            show_delete_sc_content: false,
            upload_sc: {
                plan_id: 0,
                open_id: '',
                req_id: 0,
                content_id: 0,
                need_attach: false,
                need_expired: false,
                need_input: false,
                name: '',
                prompt: '',
            },
            focus_sc_content_id: 0,
            show_reject_sc: false,
            reject_sc_comment: '',
            one_att: [''],
            show_one_att: false,
            sc_passed: false,
            show_sc_confirm: false,
            need_show_close: false,
            show_deliver_date: false,
            show_scale_input: false,
            deliver_req: {
                count: "",
                m_time: '',
                m_weight: '',
                p_time: '',
                p_weight: '',
            },
            xxx_url: '',
            confirm_info: '',
            show_xxx_confirm: false,
            show_rollback_confirm: false,
            show_sc: false,
            focus_plan: {
                "behind_vehicle": {
                    "id": 1,
                    "plate": "车牌"
                },
                "comment": "备注",
                "company": {
                    "id": 1,
                    "name": "公司名称"
                },
                "count": 1,
                "driver": {
                    "id": 1,
                    "id_card": "司机身份证",
                    "name": "司机名称",
                    "phone": "司机电话"
                },
                "drop_address": "卸货地址",
                "enter_time": "2020-01-01 12:00:00",
                "from_bidding": true,
                "id": 0,
                "m_time": "2020-01-01 12:00:00",
                "m_weight": 1,
                "main_vehicle": {
                    "id": 1,
                    "plate": "车牌"
                },
                "p_time": "2020-01-01 12:00:00",
                "p_weight": 1,
                "plan_histories": [{
                    "action_type": "操作",
                    "id": 1,
                    "operator": "操作人",
                    "time": "2020-01-01 12:00:00"
                }],
                "plan_time": "2020-01-01 12:00:00",
                "rbac_user": {
                    "id": 1,
                    "name": "用户姓名",
                    "phone": "用户电话"
                },
                "register_number": 1,
                "register_time": "2020-01-01 12:00:00",
                "sc_info": [{
                    "belong_type": 0,
                    "id": 1,
                    "name": "安检需求",
                    "need_attach": true,
                    "need_expired": true,
                    "need_input": true,
                    "sc_content": {
                        "attachment": "http://www.baidu.com",
                        "checker": "张三",
                        "expired_time": "2020-01-01 00:00:00",
                        "id": 1,
                        "input": "请输入",
                        "passed": true
                    }
                }],
                "status": 1,
                "stuff": {
                    "company": {
                        "id": 1,
                        "name": "公司名称"
                    },
                    "id": 1,
                    "name": "货物名称",
                    concern_fapiao: false,
                },
                "unit_price": 1,
                "use_for": "用途"
            },
            show_plan_detail: false,
            seg: [],
            company_filter: {
                name: '全部公司',
                id: undefined,
            },
            stuff_filter: {
                name: '全部物料',
                id: undefined,
            },
            show_stuff_list: false,
            show_company_filter: false,
            show_plan_date: false,
            focus_status: undefined,
            begin_time: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            end_time: utils.dateFormatter(new Date(), 'y-m-d', 4, false),
            deliver_time: utils.dateFormatter(new Date(), 'y-m-d h:i:s', 4, false),

            deliver_time_type: '',
            tabs: [],
            show_batch_copy: false,
            gallery_index:0
        }
    },
    computed: {
        get_both_attach: function () {
            let ret = [];
            let func = (path) => {
                let pic_ret = '';
                if (path) {
                    pic_ret = this.$convert_attach_url(path);
                } else {
                    pic_ret = '/static/no_att.jpg';
                }
                return pic_ret;
            };
            ret.push({
                src: func(this.focus_plan.company.attachment),
                descr: '下单方资质'
            });
            ret.push({
                src: func(this.focus_plan.stuff.company.attachment),
                descr: '接单方资质'
            });

            return ret;
        },
        user_authorize: function () {
            let ret = '未授权';
            this.cur_contract.rbac_users.forEach(ele => {
                if (ele.id == this.focus_plan.rbac_user.id) {
                    ret = '已授权';
                }
            });

            return ret;
        },
        plan_status: function () {
            let ret = '';
            if (this.focus_plan.status == 0) {
                ret = '未确认';
            } else if (this.focus_plan.status == 1) {
                ret = '未付款';
            } else if (this.focus_plan.status == 2) {
                ret = '未发车';
            } else if (this.focus_plan.status == 3) {
                ret = '已关闭';
            }
            return ret;
        },
        sc_attach_urls: function () {
            let ret = [];
            if (this.focus_plan.sc_info) {
                this.focus_plan.sc_info.forEach(ele => {
                    if (ele.sc_content && ele.sc_content.attachment) {
                        ret.push({
                            src: this.$convert_attach_url(ele.sc_content.attachment),
                            descr: ele.name
                        });
                    }
                });
            }
            return ret;
        },
        plan_filter: function () {
            return {
                start_time: this.begin_time,
                end_time: this.end_time,
                status: this.focus_status,
                stuff_id: this.stuff_filter.id,
                company_id: this.company_filter.id,
                hide_manual_close: !this.need_show_close,
            }
        },
        plan_owner: function () {
            let ret = false;
            let self = uni.getStorageSync('self_info');
            if (self.id == this.focus_plan.rbac_user.id) {
                ret = true;
            }

            return ret;
        },
    },
    methods: {
        change_index:function(e){
            this.gallery_index = e.index
        },
        download_img: function () {
            const imgs = [this.focus_plan.company.attachment,this.focus_plan.stuff.company.attachment]
            this.$download_file(this.$convert_attach_url(imgs[this.gallery_index]))
        },
        open_attach_pics: function () {
            this.show_attach = true;
        },
        mark_fapiao_deliver: async function () {
            await this.$send_req('/sale_management/set_fapiao_delivered', {
                plan_id: this.focus_plan.id,
                delivered: !this.focus_plan.fapiao_delivered
            });
            this.refresh_plans();
            this.show_plan_detail = false;
        },
        do_action: async function (e) {
            let muti_success = true;
            if (!this.new_stuff_price.isMuti) {
                if (e.text == "批量调价") {
                    this.new_stuff_price.show = true;
                    this.new_stuff_price.isMuti = true;
                    this.new_stuff_price.comment = "批量调价"
                    return
                }
            }
            try {

                for (let index = 0; index < this.plan_selected.length; index++) {
                    const element = this.plan_selected[index];
                    this.$send_req(e.url, {
                        plan_id: element,
                    }).catch((error) => {
                        console.log(error)
                        muti_success = false
                    })
                }
                if (muti_success) {
                    this.$refs.toast.show({
                        text: '操作成功'
                    })
                }

            } catch (error) {
                console.log(error)
            } finally {
                this.action_show = false;
                this.select_active = false;
                this.plan_selected = [];
                this.refresh_plans();
            }

        },
        select_all: function () {
            this.plan_selected = this.sp_data2show.map(item => item.id);
        },
        select_other: function () {
            let orig_selected = this.plan_selected;
            this.sp_data2show.forEach(item => {
                if (orig_selected.indexOf(item.id) == -1) {
                    this.plan_selected.push(item.id);
                } else {
                    this.plan_selected = this.plan_selected.filter(ele => ele != item.id);
                }
            });
        },
        update_plan: async function (e) {
            if (e.index == 1) {
                let rules = [{
                        name: 'main_vehicle_plate',
                        rule: ['isCarNo'],
                        msg: ['请填写正确的车牌号']
                    },
                    {
                        name: 'behind_vehicle_plate',
                        rule: ['isCarNo'],
                        msg: ['请填写正确的车牌号']
                    }, {
                        name: 'driver_phone',
                        rule: ['isMobile'],
                        msg: ['请填写正确的手机号']
                    }
                ];
                let val_ret = await this.$refs.plan_update.validator(this.update_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.update_req.main_vehicle_plate == this.focus_plan.main_vehicle.plate) {
                    delete this.update_req.main_vehicle_plate;
                }
                if (this.update_req.behind_vehicle_plate == this.focus_plan.behind_vehicle.plate) {
                    delete this.update_req.behind_vehicle_plate;
                }
                if (this.update_req.driver_phone == this.focus_plan.driver.phone) {
                    delete this.update_req.driver_phone;
                }
                if (this.update_req.comment == this.focus_plan.comment) {
                    delete this.update_req.comment;
                }
                this.update_req.plan_id = this.focus_plan.id;
                await this.$send_req(this.cur_update_url, this.update_req);
                this.refresh_plans();
                this.show_plan_detail = false;
            }
            this.show_update = false;
        },
        prepare_update: function () {
            this.show_update = true;
            this.update_req.main_vehicle_plate = this.focus_plan.main_vehicle.plate;
            this.update_req.behind_vehicle_plate = this.focus_plan.behind_vehicle.plate;
            this.update_req.driver_phone = this.focus_plan.driver.phone;
            this.update_req.comment = this.focus_plan.comment;
        },
        choose_use_for: function (_name) {
            this.dup_plan.use_for = _name;
            this.show_use_for = false;
        },
        batch_copy: async function (e) {
            if (e.index == 1) {

                let rules = [{
                    name: 'plan_time',
                    rule: ['required'],
                    msg: ['请选择填写计划日期']
                }];
                if (!this.cur_is_buy) {
                    rules.push({
                        name: 'drop_address',
                        rule: ['required'],
                        msg: ['请选择填写卸车地点']
                    })
                    rules.push({
                        name: 'use_for',
                        rule: ['required'],
                        msg: ['请选择填写用途']
                    });
                } else {
                    rules.push({
                        name: 'price',
                        rule: ['isAmount'],
                        msg: ['请填写正确的单价']
                    });
                }
                let val_ret = await this.$refs.plan_form.validator(this.dup_plan, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                if (this.dup_plan.price) {
                    this.dup_plan.price = parseFloat(this.dup_plan.price);
                }
                Object.keys(this.plan_filter).forEach(key => {
                    this.dup_plan[key] = this.plan_filter[key];
                });
                await this.$send_req(this.cur_dup_url, this.dup_plan);
                this.refresh_plans();
            }
            this.show_batch_copy = false;
        },
        pick_address: function (e) {
            this.dup_plan.drop_address = e.map(item => item.name).join('-')
        },
        reassign_supplier: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/buy_management/assign_supplier', {
                    plan_id: this.focus_plan.id,
                    supplier_id: 0
                });
                this.show_plan_detail = false;
            }
            this.show_reassign_prompt = false;
            this.refresh_plans();
        },
        assign_supplier: async function (id) {
            await this.$send_req('/buy_management/assign_supplier', {
                plan_id: this.focus_plan.id,
                supplier_id: id
            });
            this.choose_company_show = false;
            this.show_plan_detail = false;
            this.refresh_plans();
        },
        get_buy_contracts: async function (pageNo) {
            if (!this.$has_module('buy_management')) {
                return [];
            }
            let res = await this.$send_req('/buy_management/contract_get', {
                pageNo: pageNo
            })
            res.contracts.forEach(ele => {
                ele.cond = ele.company.name
            });
            return res.contracts;
        },
        prepare_choose_company: function () {
            this.choose_company_show = true;
        },
        go_to_ticket: function () {
            uni.navigateTo({
                url: '/pages/Ticket?id=' + this.focus_plan.id
            });
        },
        batch_confirm: async function () {
            await this.$send_req(this.cur_batch_confirm_url, this.plan_filter);
            this.refresh_plans();
        },
        close_pick_plan_date: function () {
            this.show_plan_date = false;
        },
        show_pick_plan_date: function () {
            console.log('test_click');
            this.show_plan_date = true;
        },
        get_status_icon: function (item) {
            let ret = '';
            if (item) {
                let status = item.status;
                if (status == 0) {
                    ret = 'info';
                } else if (status == 1) {
                    ret = 'rmb';
                } else if (status == 2) {
                    ret = 'hourglass';
                } else if (status == 3) {
                    ret = 'checkmark';
                }
                if (item.manual_close) {
                    ret = 'close';
                }
            }

            return ret;
        },
        delete_sc_content: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/global/driver_delete_sc_content', {
                    content_id: this.upload_sc.content_id,
                    open_id: ''
                });
                this.$refs.sc_confirm.refresh();
            }
            this.show_delete_sc_content = false;
        },
        prepare_delete_sc: function (item) {
            this.upload_sc.content_id = item.sc_content.id;
            this.show_delete_sc_content = true;
        },
        prepare_upload_sc: function (item) {
            this.upload_sc.req_id = item.id;
            this.upload_sc.plan_id = this.focus_plan.id;
            this.upload_sc.open_id = this.focus_plan.driver.open_id;
            if (item.sc_content) {
                this.upload_sc.content_id = item.sc_content.id;
            }
            this.upload_sc.need_attach = item.need_attach;
            this.upload_sc.need_expired = item.need_expired;
            this.upload_sc.need_input = item.need_input;
            this.upload_sc.name = item.name;
            this.upload_sc.prompt = item.prompt;
            this.$refs.sc_up.show_modal();
        },

        fill_plan_time: function (e) {
            this.dup_plan.plan_time = e.result;
            this.show_plan_time = false;
        },
        prepare_reject_sc: function (item) {
            this.show_reject_sc = true;
            this.focus_sc_content_id = item.sc_content.id;
            this.reject_sc_comment = '';
        },
        reject_sc: async function (e) {
            if (e.index == 1) {
                if (!this.reject_sc_comment) {
                    uni.showToast({
                        title: '请填写附言',
                        icon: 'none',
                        duration: 2000
                    });
                    return;
                }
                await this.pass_sc(this.focus_sc_content_id, this.reject_sc_comment);
            }
            this.show_reject_sc = false;
        },
        pass_sc: async function (id, comment) {
            await this.$send_req('/sc/check', {
                content_id: id,
                comment: comment
            });
            this.$refs.sc_confirm.refresh();
        },
        sc_status_string: function (item) {
            let ret = {
                text: '未上传',
                type: 'warning'
            }
            if (item) {
                if (item.passed) {
                    ret.text = '已通过';
                    ret.type = 'success';
                } else {
                    ret.text = '未通过';
                    ret.type = 'danger';
                }
            }
            return ret;
        },
        get_plan_sc: async function (pageNo, [id]) {
            if (!id) {
                return [];
            }
            let res = await this.$send_req('/sc/plan_status', {
                pageNo: pageNo,
                plan_id: id
            });
            if (res.reqs.length > 0) {
                res.reqs[0].passed_total = res.passed;
            }
            return res.reqs;
        },
        prepare_sc_confirm: function () {
            this.show_sc_confirm = true;
            this.$nextTick(() => {
                this.$refs.sc_confirm.refresh();
            });
        },
        copy_text: function (e) {
            $fui.getClipboardData(e, res => {
                if (res) {
                    uni.showToast({
                        title: '复制成功',
                        icon: 'success',
                        duration: 2000
                    });
                }
            });
        },

        change_need_show: function () {
            this.refresh_plans();
        },
        calc_count: function () {
            this.deliver_req.count = Math.abs(this.deliver_req.p_weight - this.deliver_req.m_weight);
            this.deliver_req.count = utils.moneyFormatter(this.deliver_req.count)
        },
        deliver: async function (e) {
            if (e.index == 1) {

                let rules = [{
                    name: 'count',
                    rule: ['required'],
                    msg: ['请输入装载量']
                }, {
                    name: 'p_weight',
                    rule: ['isAmount'],
                    msg: ['重量需要是数字']
                }, {
                    name: 'm_weight',
                    rule: ['isAmount'],
                    msg: ['重量需要是数字']
                }, ];
                let val_ret = await this.$refs.deliver.validator(this.deliver_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.deliver_req.plan_id = this.focus_plan.id;
                this.deliver_req.count = parseFloat(this.deliver_req.count);
                this.deliver_req.p_weight = parseFloat(this.deliver_req.p_weight);
                this.deliver_req.m_weight = parseFloat(this.deliver_req.m_weight);
                await this.$send_req('/scale/deliver', this.deliver_req);
                this.show_plan_detail = false;
                this.deliver_req = {
                    count: "",
                    m_time: '',
                    m_weight: '',
                    p_time: '',
                    p_weight: '',
                };
                uni.startPullDownRefresh();
            }
            this.show_scale_input = false;
        },
        prepare_deliver_date_pick: function (time_type) {
            this.deliver_time_type = time_type;
            this.show_deliver_date = true;
        },
        choose_deliver_date: function (e) {
            this.deliver_req[this.deliver_time_type] = e.result;
            this.show_deliver_date = false;
        },
        do_xxx: async function (e) {
            if (e.index == 1) {
                await this.$send_req(this.xxx_url, {
                    plan_id: this.focus_plan.id
                });
                this.show_plan_detail = false;
                uni.startPullDownRefresh();
            }
            this.show_xxx_confirm = false;
        },
        // 订单新单价调价
        do_new_stuff_pirce: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'unit_price',
                    rule: ['required', 'isNumber'],
                    msg: ['请输入新单价', '请输入正确的金额']
                }];
                let val_ret = await this.$refs.new_stuff_price_form.validator({
                    unit_price: this.new_stuff_price.price
                }, rules);
                if (val_ret.isPassed) {
                    this.$send_req("/stuff/change_price_by_plan", {
                        unit_price: Number(this.new_stuff_price.price),
                        plan_id: this.new_stuff_price.isMuti ? this.plan_selected.toString() : this.focus_plan.id + '',
                        comment: this.new_stuff_price.comment
                    }).then(res => {
                        this.$refs.toast.show({
                            text: '调价成功',
                        })
                    }).catch((error) => {
                        this.$refs.toast.show({
                            text: error,
                        })
                    }).finally(() => {
                        this.cancel_new_stuff_price();
                        this.show_plan_detail = false;
                        uni.startPullDownRefresh();
                    });
                }
            } else {
                this.cancel_new_stuff_price()
            }
        },
        cancel_new_stuff_price: function (e) {
            this.new_stuff_price.price = 0;
            this.new_stuff_price.comment = "";
            this.new_stuff_price.show = false;
            this.new_stuff_price.isMuti = false;
            this.action_show = false;
            this.select_active = false;
            this.plan_selected = [];
        },
        do_rollback: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'rollback_msg',
                    rule: ['required'],
                    msg: ['请输入原因']
                }];
                let val_ret = await this.$refs.rollback_form.validator({
                    rollback_msg: this.rollback_msg
                }, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req(this.cur_rollback_url, {
                    plan_id: this.focus_plan.id,
                    msg: this.rollback_msg
                });
                this.show_plan_detail = false;
                uni.startPullDownRefresh();
            }
            this.show_rollback_confirm = false;
        },
        prepare_xxx_confirm: function (url, info) {
            this.show_xxx_confirm = true;
            this.confirm_info = info;
            this.xxx_url = url;
        },
        authorize_user: async function () {
            await this.$send_req('/sale_management/authorize_user', {
                contract_id: this.cur_contract.id,
                phone: this.focus_plan.rbac_user.phone,
            })
            this.show_plan_detail = false;
            this.refresh_plans();
        },
        prepare_plan_detail: async function (item) {
            if (!item.is_buy && this.$has_module('sale_management')) {
                let resp = await this.$send_req('/sale_management/get_contract_by_customer', {
                    customer_id: item.company.id,
                })
                this.cur_contract = resp;
            }
            this.focus_plan = item;
            this.show_plan_detail = true;
        },
        init_tabs: function () {
            this.tabs = [{
                name: "全部",
            }, {
                name: "未确认",
                badge: 0,
            }, ]
            if (!this.cur_is_buy) {
                this.tabs.push({
                    name: "未付款",
                    badge: 0,
                });
            }
            this.tabs.push({
                name: "未发车",
                badge: 0,
            });
            this.tabs.push({
                name: "已关闭",
            });
        },
        change_seg: function (e) {
            this.cur_get_url = e.url;
            this.cur_is_motion = e.motion;
            this.cur_is_buy = e.is_buy;
            this.cur_batch_confirm_url = e.batch_url;
            this.cur_confirm_url = e.confirm_url;
            this.cur_rollback_url = e.rollback_url;
            this.cur_update_url = e.update_url;
            this.cur_close_url = e.close_url;
            this.cur_cancel_url = e.cancel_url;
            this.cur_dup_url = e.dup_url;
            this.init_tabs();
            this.refresh_plans();
        },
        reset_company_filter: function () {
            this.company_filter = {
                name: '全部公司',
                id: undefined,
            }
            this.refresh_plans();
        },
        reset_stuff_filter: function () {
            this.stuff_filter = {
                name: '全部物料',
                id: undefined,
            }
            this.refresh_plans();
        },
        refresh_plans: function () {
            this.$nextTick(() => {
                this.init_number_of_sold_plan();
            });
            this.$nextTick(() => {
                this.$refs.sold_plans.refresh();
            })

        },
        choose_company: function (item) {
            this.company_filter = {
                name: item.company.name,
                id: item.company.id,
            }
            this.show_company_filter = false;
            this.refresh_plans();
        },
        choose_stuff: function (item) {
            this.stuff_filter = {
                name: item.name,
                id: item.id,
            }
            this.show_stuff_list = false;
            this.refresh_plans();
        },
        choose_date: function (e) {
            this.show_plan_date = false;
            this.begin_time = e.startDate.result;
            this.end_time = e.endDate.result;
            this.refresh_plans();
        },
        change_tab: function (e) {
            let index = e.index
            if (index > 0) {
                this.focus_status = index - 1;
                if (this.focus_status == 2 && this.cur_is_buy) {
                    this.focus_status = 3;
                }
            } else {
                this.focus_status = undefined;
            }
            this.refresh_plans();
        },
        make_plan_get_url: function () {
            return this.cur_get_url;
        },
        get_sold_plans: async function (pageNo, [plan_filter, cur_get_url, cur_is_motion]) {
            let res = await this.$send_req(cur_get_url, {
                ...plan_filter,
                pageNo: pageNo,
            });
            let ret = [];
            res.plans.forEach(element => {
                element.search_cond = element.main_vehicle.plate + element.behind_vehicle.plate;
                if (cur_is_motion) {
                    element.company_show = element.stuff.company.name;
                } else {
                    element.company_show = element.company.name;
                }
                ret.push(element)
            });
            return ret;
        },
        init_number_of_sold_plan: async function () {
            let max_status = 3;
            if (this.cur_is_buy) {
                max_status = 2;
            }
            for (let i = 0; i < max_status; i++) {
                let res = await this.$send_req(this.make_plan_get_url(), {
                    ...this.plan_filter,
                    status: i,
                    only_count:true
                });
                this.tabs[i + 1].badge = res.total;
            }
        },
        get_stuff: async function (pageNo) {
            let mods = uni.getStorageSync('self_info').modules.map(ele => {
                return ele.name
            })
            if (mods.indexOf('stuff') != -1) {
                let ret = await this.$send_req('/stuff/get_all', {
                    pageNo: pageNo
                });
                return ret.stuff;
            } else {
                return [];
            }
        },
        get_customers: async function (pageNo) {
            let mods = uni.getStorageSync('self_info').modules.map(ele => {
                return ele.name
            })
            if (mods.indexOf('stuff') != -1) {
                let ret = await this.$send_req('/sale_management/contract_get', {
                    pageNo: pageNo
                });
                ret.contracts.forEach(item => {
                    item.search_cond = item.company.name;
                });
                return ret.contracts;
            } else {
                return [];
            }
        },
        init_top_seg: function () {
            this.seg = []
            if (this.$has_module('customer')) {
                this.seg.push({
                    name: '主动采购',
                    url: '/customer/order_buy_search',
                    cancel_url: '/customer/order_buy_cancel',
                    dup_url: '/customer/batch_copy',
                    update_url: '/customer/order_buy_update',
                    motion: true,
                    is_buy: false,
                });
            }
            if (this.$has_module('sale_management')) {
                this.seg.push({
                    name: '被动销售',
                    url: '/sale_management/order_search',
                    batch_url: '/sale_management/order_batch_confirm',
                    confirm_url: '/sale_management/order_sale_confirm',
                    rollback_url: '/sale_management/order_rollback',
                    close_url: '/sale_management/close',
                    update_url: '/sale_management/order_update',
                    motion: false,
                    is_buy: false,
                });
            }
            if (this.$has_module('supplier')) {
                this.seg.push({
                    name: '主动销售',
                    url: '/supplier/order_sale_search',
                    cancel_url: '/supplier/order_sale_cancel',
                    dup_url: '/supplier/batch_copy',
                    update_url: '/supplier/order_sale_update',
                    motion: true,
                    is_buy: true,
                });
            }
            if (this.$has_module('buy_management')) {
                this.seg.push({
                    name: '被动采购',
                    url: '/buy_management/order_search',
                    batch_url: '/buy_management/order_batch_confirm',
                    confirm_url: '/buy_management/order_buy_confirm',
                    rollback_url: '/buy_management/order_rollback',
                    close_url: '/buy_management/close',
                    update_url: '/buy_management/order_update',
                    motion: false,
                    is_buy: true,
                });
            }
            if (this.seg.length > 0) {
                this.cur_get_url = this.seg[0].url;
                this.cur_is_motion = this.seg[0].motion;
                this.cur_is_buy = this.seg[0].is_buy;
                this.cur_batch_confirm_url = this.seg[0].batch_url;
                this.cur_cancel_url = this.seg[0].cancel_url;
                this.cur_dup_url = this.seg[0].dup_url;
                this.cur_confirm_url = this.seg[0].confirm_url;
                this.cur_rollback_url = this.seg[0].rollback_url;
                this.cur_update_url = this.seg[0].update_url;
                this.cur_close_url = this.seg[0].close_url;
                this.init_tabs();
            }
        },
        reset_order_date: function (need_refresh = true) {
            if (need_refresh) {
                this.$refs.po_msg.show({
                    text: '默认日期范围可以在我的页面配置'
                })
            }
            let bt = new Date();
            let et = new Date();
            bt.setDate(bt.getDate() - uni.getStorageSync('self_info').prefer_order_begin_offset);
            et.setDate(et.getDate() + uni.getStorageSync('self_info').prefer_order_end_offset);
            this.begin_time = utils.dateFormatter(bt, 'y-m-d', 4, false);
            this.end_time = utils.dateFormatter(et, 'y-m-d', 4, false);
            if (need_refresh) {
                this.refresh_plans();
            }
        },
    },
    onPullDownRefresh() {
        this.refresh_plans();
        uni.stopPullDownRefresh();
    },
    onLoad() {
        this.init_top_seg();
        let tom = new Date();
        tom.setDate(tom.getDate() + 1);
        this.default_time = utils.dateFormatter(tom, 'y-m-d', 4, false);
        this.init_number_of_sold_plan();
        this.reset_order_date(false);
    },
}
</script>

<style scoped>
.group_sep:nth-child(odd) {
    background-color: #ffffff;
    /* 更深的颜色 */
}

.group_sep:nth-child(even) {
    background-color: #f1f1f1;
    /* 更浅的颜色 */
}

.movable-view {
    height: 100%;
    width: 100%;
}

.movable-area {
    height: 90%;
    width: 100%;
    overflow: hidden;
    z-index: 9999;
}

.lookimg {
    width: 100%;
    height: 100%;
}

.imagecontent {
    width: 50%;
    height: 100vh;
    margin: 0 40rpx;
}
.downloadBtn {
    position:absolute;
    z-index: 2000;
    top: 20rpx;
    right: 20rpx;
}
</style>

<template>
<view>
    <fui-segmented-control :values="seg" @click="change_seg"></fui-segmented-control>
    <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
    <view>
        <module-filter :rm_array="['sale_management', 'buy_management']">
            <fui-tag theme="plain" type="purple">
                {{stuff_filter.name}}
                <fui-icon v-if="!stuff_filter.id" name="arrowright" size="32" @click="show_stuff_list= true"></fui-icon>
                <fui-icon v-else name="close" size="32" @click="reset_stuff_filter"></fui-icon>
            </fui-tag>
            <fui-tag theme="plain" type="success">
                {{company_filter.name}}
                <fui-icon v-if="!company_filter.id" name="arrowright" size="32" @click="show_company_filter= true"></fui-icon>
                <fui-icon v-else name="close" size="32" @click="reset_company_filter"></fui-icon>
            </fui-tag>
            <fui-tag v-if="focus_status == 0" type="primary" text="批量确认" @click="batch_confirm">
            </fui-tag>
        </module-filter>
        <view style="display:flex; align-items: center;">
            显示取消计划
            <u-switch v-model="need_show_close" @change="change_need_show"></u-switch>
        </view>
    </view>
    <u-cell title="计划时间" :value="begin_time + '~' + end_time">
        <fui-button slot="right-icon" text="选择日期" @click="show_pick_plan_date" btnSize="mini" type="warning"></fui-button>
    </u-cell>
    <fui-date-picker range :show="show_plan_date" type="3" :value="begin_time" :valueEnd="end_time" @change="choose_date" @cancel="close_pick_plan_date"></fui-date-picker>
    <list-show v-model="sp_data2show" ref="sold_plans" :fetch_function="get_sold_plans" height="70vh" search_key="search_cond" :fetch_params="[plan_filter, cur_get_url, cur_is_motion]">
        <view v-for="item in sp_data2show" :key="item.id">
            <u-cell :icon="get_status_icon(item)" :title="item.company_show + '-' + item.stuff.name" :label="item.main_vehicle.plate + ' ' + item.behind_vehicle.plate" clickable @click="prepare_plan_detail(item)">
                <view slot="value" style="display:flex; flex-direction: column;">
                    <fui-tag theme="plain" :text="'计划:' + item.plan_time" :scaleRatio="0.8" type="danger"></fui-tag>
                    <fui-tag v-if="item.m_time" theme="plain" :text="'发车:' + item.m_time" :scaleRatio="0.8" type="primary"></fui-tag>
                    <fui-tag v-if="item.m_time" theme="plain" :text="'装车量' + item.count" :scaleRatio="0.8" type="success"></fui-tag>
                </view>
            </u-cell>
        </view>
    </list-show>
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
                    </u-cell>
                    <u-cell :title="comp_title(focus_plan.is_buy).b_title" :value="focus_plan.stuff.company.name" :label="focus_plan.stuff.name + '-单价-' + focus_plan.unit_price"></u-cell>
                    <u-cell v-if="focus_plan.trans_company_name" title="承运公司" :value="focus_plan.trans_company_name"></u-cell>
                    <u-cell title="计划时间" :value="focus_plan.plan_time"></u-cell>
                    <u-cell :title="'当前状态：' + plan_status">
                        <view slot="value" style="display:flex;">
                            <module-filter :rm_array="['customer', 'supplier']"></module-filter>
                            <fui-button v-if="focus_plan.status == 0 && plan_owner" btnSize="mini" text="取消" type="danger" @click="prepare_xxx_confirm(cur_cancel_url, '取消')"></fui-button>
                            <module-filter :rm_array="['sale_management', 'buy_management']" style="display:flex;">
                                <fui-button v-if="focus_plan.status == 0" btnSize="mini" type="success" text="确认" @click="prepare_xxx_confirm(cur_confirm_url, '确认')"></fui-button>
                                <fui-button v-if="focus_plan.status != 0" btnSize="mini" type="warning" text="回退" @click="prepare_xxx_confirm(cur_rollback_url, '回退')"></fui-button>
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
            <view class="group_sep">
                <u-cell-group title="车辆信息">
                    <u-cell title="主车" :value="focus_plan.main_vehicle.plate"></u-cell>
                    <u-cell title="挂车" :value="focus_plan.behind_vehicle.plate"></u-cell>
                    <u-cell :title="'司机:' + focus_plan.driver.name" :value="focus_plan.driver.phone" clickable @click="copy_text(focus_plan.driver.phone)"></u-cell>
                    <u-cell title="用途" :value="focus_plan.use_for" :label="'备注：' + focus_plan.comment"></u-cell>
                </u-cell-group>
            </view>
            <view class="group_sep">
                <u-cell-group title="出入信息">
                    <u-cell title="是否已经进场" :value="focus_plan.enter_time?'是':'否'" :label="focus_plan.enter_time"></u-cell>
                    <u-cell v-if="focus_plan.register_time" title="排队序号" :value="focus_plan.register_number" :label="focus_plan.register_time"></u-cell>
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
    <fui-gallery zIndex="1004" :urls="one_att" :show="show_one_att" @hide="show_one_att = false"></fui-gallery>
    <fui-modal :zIndex="1002" width="600" :descr="'确定要' + confirm_info + focus_plan.main_vehicle.plate +'吗？'" :show="show_xxx_confirm" @click="do_xxx">
    </fui-modal>
    <fui-modal :zIndex="1002" width="600" :show="show_scale_input" @click="deliver">
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
    <fui-modal :zIndex="1004" width="600" :show="show_reject_sc" @click="reject_sc">
        <fui-input required label="附言" borderTop placeholder="请输入附言" v-model="reject_sc_comment"></fui-input>
    </fui-modal>
    <fui-date-picker zIndex="1003" :show="show_deliver_date" type="5" :value="deliver_time" @change="choose_deliver_date" @cancel="show_deliver_date= false"></fui-date-picker>
    <sc-upload ref="sc_up" @uploaded="prepare_sc_confirm" :prompt="upload_sc.prompt" :title="upload_sc.name" :open_id="upload_sc.open_id" :plan_id="upload_sc.plan_id" :req_id="upload_sc.req_id" :need_attach="upload_sc.need_attach" :need_expired="upload_sc.need_expired" :need_input="upload_sc.need_input"></sc-upload>
    <fui-modal :zIndex="1003" width="600" descr="确定要删除吗？" :show="show_delete_sc_content" @click="delete_sc_content">
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import utils from '@/components/firstui/fui-utils';
import ModuleFilterVue from '../components/ModuleFilter.vue';
import $fui from '@/components/firstui/fui-clipboard';
import ScUpload from '../components/ScUpload.vue';
import Admin from './Admin.vue';
export default {
    name: 'OrderList',
    components: {
        "list-show": ListShow,
        "module-filter": ModuleFilterVue,
        "sc-upload": ScUpload,
        Admin,
    },
    data: function () {
        return {
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
            cur_batch_confirm_url:'',
            cur_confirm_url:'',
            cur_rollback_url:'',
            cur_cancel_url:'',
            cur_close_url:'',
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
                    "name": "货物名称"
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
        }
    },
    computed: {
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
        prepare_xxx_confirm: function (url, info) {
            this.show_xxx_confirm = true;
            this.confirm_info = info;
            this.xxx_url = url;
        },
        prepare_plan_detail: function (item) {
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
            this.cur_close_url = e.close_url;
            this.cur_cancel_url = e.cancel_url;
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
                    status: i
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
                    cancel_url:'/customer/order_buy_cancel',
                    motion: true,
                    is_buy: false,
                });
            }
            if (this.$has_module('sale_management')) {
                this.seg.push({
                    name: '被动销售',
                    url: '/sale_management/order_search',
                    batch_url:'/sale_management/order_batch_confirm',
                    confirm_url:'/sale_management/order_sale_confirm',
                    rollback_url:'/sale_management/order_rollback',
                    close_url:'/sale_management/close',
                    motion: false,
                    is_buy: false,
                });
            }
            if (this.$has_module('supplier')) {
                this.seg.push({
                    name: '主动销售',
                    url: '/supplier/order_sale_search',
                    cancel_url:'/supplier/order_sale_cancel',
                    motion: true,
                    is_buy: true,
                });
            }
            if (this.$has_module('buy_management')) {
                this.seg.push({
                    name: '被动采购',
                    url: '/buy_management/order_search',
                    batch_url:'/buy_management/order_batch_confirm',
                    confirm_url:'/buy_management/order_buy_confirm',
                    rollback_url:'/buy_management/order_rollback',
                    close_url:'/buy_management/close',
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
                this.cur_confirm_url = this.seg[0].confirm_url;
                this.cur_rollback_url = this.seg[0].rollback_url;
                this.cur_close_url = this.seg[0].close_url;
                this.init_tabs();
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
        this.end_time = utils.dateFormatter(tom, 'y-m-d', 4, false);
        this.init_number_of_sold_plan();
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
</style>

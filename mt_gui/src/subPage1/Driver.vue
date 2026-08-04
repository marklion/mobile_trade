<template>
<view class="driver-page" :class="page_extra_class">
    <fui-nav-bar title="掌易助理" background="#2F3FCF" color="#FFFFFF" :statusBar="true" :isFixed="true"
        :isOccupy="true" @leftClick="on_nav_back">
        <fui-icon v-if="need_return" name="arrowleft" color="#FFFFFF" :size="54"></fui-icon>
    </fui-nav-bar>

    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-top">
            <view class="hero-copy">
                <text class="hero-label">{{ need_return ? '代替司机操作' : '司机工作台' }}</text>
                <text class="hero-name">{{ driver_self.name || '未绑定' }}</text>
                <text class="hero-sub" v-if="driver_self.phone">{{ driver_self.phone }}</text>
            </view>
            <view class="hero-actions" v-if="driver_self.id && !need_return">
                <view class="hero-chip" @click="rebind_info">
                    <text class="hero-chip-text">修改身份</text>
                </view>
            </view>
        </view>
        <!--  #ifdef  H5 -->
        <view class="hero-h5" v-if="!need_return" @click="phone_login_show = true">
            <text class="hero-h5-text">司机手机登录</text>
        </view>
        <!--  #endif -->
    </view>

    <view class="shell">
        <view class="tabs">
            <view class="tab-item" :class="{ active: cur_page === 0 }" @click="sectionChange(0)">
                <text class="tab-text">当前承运</text>
                <text class="tab-count" v-if="cur_page === 0 && data2show.length">{{ data2show.length }}</text>
            </view>
            <view class="tab-item" :class="{ active: cur_page === 1 }" @click="sectionChange(1)">
                <text class="tab-text">历史磅单</text>
            </view>
        </view>

        <view class="body" v-if="cur_page == 0">
            <list-show ref="plan" v-model="data2show" :fetch_function="get_self_plan" height="68vh"
                :fetch_params="[is_online, driver_self.open_id]">
                <view class="plan-card" v-for="item in data2show" :key="item.id">
                    <view class="plan-plates">
                        <text class="plate-tag">{{ plate_of(item) }}</text>
                        <text class="plate-tag" v-if="behind_of(item)">{{ behind_of(item) }}</text>
                        <view class="enter-tag ok" v-if="enter_ok(item)">
                            <text class="enter-tag-text">可进厂</text>
                        </view>
                        <view class="enter-tag bad" v-else>
                            <text class="enter-tag-text">不可进</text>
                        </view>
                    </view>
                    <view class="plan-titles">
                        <text class="plan-stuff">{{ stuff_of(item) }}</text>
                        <text class="plan-yard">{{ yard_of(item) }}</text>
                    </view>
                    <view class="plan-stats">
                        <view class="plan-stat">
                            <text class="plan-stat-label">排队</text>
                            <text class="plan-stat-value">{{ item.register_time ? item.register_number : '-' }}</text>
                            <text class="plan-stat-sub" v-if="item.register_time">已排号</text>
                            <text class="plan-stat-sub muted" v-else-if="item.stuff && !item.stuff.no_need_register">未排号</text>
                            <text class="plan-stat-sub muted" v-else>免排号</text>
                        </view>
                        <view class="plan-stat">
                            <text class="plan-stat-label">计划日</text>
                            <text class="plan-stat-value ok" v-if="is_today_plan(item)">今天</text>
                            <text class="plan-stat-value" v-else>{{ plan_day(item) }}</text>
                        </view>
                        <view class="plan-stat">
                            <text class="plan-stat-label">叫号</text>
                            <text class="plan-stat-value ok" v-if="item.call_time">已叫</text>
                            <text class="plan-stat-value" v-else>未叫</text>
                        </view>
                    </view>
                    <view class="plan-actions" v-if="show_card_actions">
                        <view class="plan-btn" :class="btn.cls" v-for="(btn, bi) in plan_action_btns(item)" :key="bi"
                            @click="tap_plan_btn(item.id, bi)">
                            <text class="plan-btn-text">{{ btn.text }}</text>
                        </view>
                    </view>
                </view>
            </list-show>
        </view>

        <view class="body" v-if="cur_page == 1">
            <view class="date-bar" @click="show_plan_date = true">
                <view class="date-copy">
                    <text class="date-label">查询时间段</text>
                    <text class="date-range">{{ begin_date }} ~ {{ end_date }}</text>
                </view>
                <view class="date-btn">
                    <text class="date-btn-text">改期</text>
                </view>
            </view>
            <fui-date-picker range :show="show_plan_date" type="3" :value="begin_date" :valueEnd="end_date"
                @change="choose_date" @cancel="show_plan_date = false"></fui-date-picker>
            <list-show ref="ticket" v-model="all_ticket" :fetch_function="get_all_ticket" height="62vh"
                :fetch_params="[driver_self.open_id, begin_date, end_date]">
                <view class="ticket-card" v-for="item in all_ticket" :key="item.id" @click="go_ticket(item.id)">
                    <view class="ticket-main">
                        <text class="ticket-company">{{ item.order_company_name }}</text>
                        <text class="ticket-meta">{{ item.p_time }}</text>
                        <text class="ticket-stuff">{{ item.stuff_name }}</text>
                    </view>
                    <view class="ticket-right">
                        <text class="ticket-count">{{ item.count }}</text>
                        <text class="ticket-unit">吨</text>
                        <fui-icon name="arrowright" size="28" color="#C5CAD5"></fui-icon>
                    </view>
                </view>
            </list-show>
        </view>
    </view>

    <view class="bottom-bar" v-if="show_bottom_actions">
        <view class="bottom-btn" :class="btn.cls" v-for="(btn, bi) in bottom_action_btns" :key="bi"
            @click="tap_plan_btn(data2show[0].id, bi)">
            <text class="bottom-btn-text">{{ btn.text }}</text>
        </view>
    </view>

    <fui-modal width="600" :show="phone_login_show" v-if="phone_login_show" @click="do_phone_login">
        <fui-form ref="phone_login" top="100">
            <fui-input required label="手机号" borderTop placeholder="请输入手机号" v-model="phone_login_req.phone"></fui-input>
            <fui-input required password label="密码" borderTop placeholder="请输入密码" v-model="phone_login_req.password"></fui-input>
        </fui-form>
    </fui-modal>

    <fui-modal width="600" :show="show_bind_id_card" v-if="show_bind_id_card" :buttons="[]">
        <fui-form ref="driver" top="100">
            <fui-input required label="姓名" borderTop placeholder="请输入姓名" v-model="bind_req.name"></fui-input>
            <fui-input required label="身份证号" borderTop placeholder="请输入身份证" v-model="bind_req.id_card"></fui-input>
            <fui-button type="primary" open-type="getPhoneNumber" text="绑定" @getphonenumber="update_driver"></fui-button>
        </fui-form>
    </fui-modal>
    <fui-bottom-popup :show="show_sc" v-if="show_sc" @close="show_sc= false">
        <view class="driver-sc-head">
            <text class="driver-sc-title">安检结果</text>
            <text class="driver-sc-status ok" v-if="sc_data2show.length > 0 && sc_data2show[0].passed_total">通过</text>
            <text class="driver-sc-status bad" v-else>未通过</text>
        </view>
        <list-show ref="sc_confirm" v-model="sc_data2show" :fetch_function="get_plan_sc" height="70vh" :fetch_params="[focus_plan.id, driver_self.open_id]">
            <view class="driver-sc-grid">
                <view class="driver-sc-card" v-for="item in sc_data2show" :key="item.id">
                    <view class="driver-sc-top" @click="preview_sc_attach(item)">
                        <view class="driver-sc-thumb-wrap">
                            <image
                                v-if="item.sc_content && item.sc_content.attachment"
                                class="driver-sc-thumb"
                                :src="$convert_attach_url(item.sc_content.attachment)"
                                mode="aspectFill"
                            ></image>
                            <view class="driver-sc-thumb driver-sc-thumb-empty" v-else>
                                <text class="driver-sc-thumb-empty-text">无</text>
                            </view>
                        </view>
                        <view class="driver-sc-copy">
                            <text class="driver-sc-name">{{ item.name }}</text>
                            <text class="driver-sc-meta" v-if="item.sc_content">
                                {{ item.need_expired ? item.sc_content.expired_time : '长期有效' }}
                            </text>
                            <text class="driver-sc-meta muted" v-else>待上传</text>
                            <text class="driver-sc-meta dim" v-if="item.sc_content && item.sc_content.checker">
                                {{ item.sc_content.checker }}
                            </text>
                        </view>
                    </view>
                    <view class="driver-sc-actions">
                        <text class="driver-sc-tag t-success" v-if="item.sc_content && item.sc_content.passed">已通过</text>
                        <text class="driver-sc-tag t-danger" v-else-if="item.sc_content">未通过</text>
                        <text class="driver-sc-tag t-warning" v-else>未上传</text>
                        <view class="driver-sc-act primary" v-if="!item.sc_content" @click="prepare_upload_sc(item)">
                            <text class="driver-sc-act-text">上传</text>
                        </view>
                        <view class="driver-sc-act danger" v-else-if="!item.sc_content.passed" @click="prepare_delete_sc(item)">
                            <text class="driver-sc-act-text">删除</text>
                        </view>
                    </view>
                </view>
            </view>
        </list-show>
    </fui-bottom-popup>
    <!-- <fui-gallery zIndex="1004" :urls="one_att" :show="show_one_att" @hide="show_one_att = false"></fui-gallery> -->
    <fui-backdrop :zIndex="8888" :show="show_one_att" @click="show_one_att = false">
        <view class="image-viewer-container" @click.stop>
            <movable-area scale-area class="movable-area">
                <movable-view class="movable-view" direction="all" inertia scale scale-min="1" scale-max="6">
                    <image class="lookimg" :src="one_att.length>0?one_att[0]:''" mode="aspectFit"></image>
                </movable-view>
            </movable-area>
            <view class="close-button-container">
                <fui-icon @click="show_one_att=false" name="close" size="80" color="white"></fui-icon>
            </view>
        </view>
    </fui-backdrop>
    <sc-upload ref="sc_up" @uploaded="prepare_sc_confirm" :prompt="upload_sc.prompt" :title="upload_sc.name" :open_id="upload_sc.open_id" :plan_id="upload_sc.plan_id" :req_id="upload_sc.req_id" :need_attach="upload_sc.need_attach" :need_expired="upload_sc.need_expired" :need_input="upload_sc.need_input"></sc-upload>
    <fui-bottom-popup :show="show_company_select" v-if="show_company_select" @close="show_company_select= false">
        <list-show ref="cp" v-model="company_list" :fetch_function="get_company4select" :fetch_params="[focus_plan, driver_self.open_id]" height="45vh" search_key="cond">
            <view v-for="item in company_list" :key="item.id">
                <u-cell :title="item.name" @click="select_company(item)" is-link></u-cell>
            </view>
        </list-show>
    </fui-bottom-popup>
    <fui-modal :zIndex="1003" width="600" v-if="show_upload_enter" :show="show_upload_enter" @click="upload_enter_weight">
        <fui-form ref="uew" top="100">
            <fui-input label="装车量" borderTop placeholder="请输入进厂前装车量" v-model="enter_weight.weight"></fui-input>
            <fui-form-item label="磅单">
                <fui-upload max="1" :sizeType="['compressed']" immediate :fileList="fileList" :url="upload_url" ref="upload_kit" @success="after_attach_uploaded" @error="meet_upload_error" @complete="after_other_action"></fui-upload>
            </fui-form-item>
        </fui-form>
    </fui-modal>
    <fui-modal :zIndex="1003" width="600" v-if="show_expect_weight" :show="show_expect_weight" @click="set_expect_weight">
        <fui-form ref="sew" top="100">
            <fui-input label="重量" borderTop placeholder="请输入重量" v-model="expect_weight.weight"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal :zIndex="1003" width="600" v-if="show_delete_sc_content" descr="确定要删除吗？" :show="show_delete_sc_content" @click="delete_sc_content">
    </fui-modal>

    <fui-modal :show="driver_notice_show" v-if="driver_notice_show" title="通知" :descr="driver_notice" @click="close_notice" :buttons="[{text:'再想想', plain:true},{text:'明白'}]"></fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import ScUpload from '../components/ScUpload.vue';
import utils from '@/components/firstui/fui-utils';

export default {
    name: 'Driver',
    components: {
        "list-show": ListShow,
        "sc-upload": ScUpload,
    },
    computed: {
        page_extra_class: function () {
            return this.show_bottom_actions ? 'has-bottom' : '';
        },
        show_card_actions: function () {
            return !(this.need_return && this.data2show.length === 1);
        },
        show_bottom_actions: function () {
            return this.need_return && this.cur_page === 0 && this.data2show.length === 1 && this.bottom_action_btns.length > 0;
        },
        bottom_action_btns: function () {
            if (!(this.need_return && this.data2show.length === 1)) {
                return [];
            }
            return this.plan_action_btns(this.data2show[0]);
        },
    },
    data: function () {
        return {
            scale: 1,
            phone_login_req: {
                phone: '',
                password: '',
            },
            phone_login_show: false,
            driver_notice: '',
            driver_notice_show: false,
            button_event: {},
            show_plan_date: false,
            begin_date: '',
            end_date: '',
            all_ticket: [],
            sub_pages: ['当前承运', '历史磅单'],
            cur_page: 0,
            company_list: [],
            upload_url: this.$remote_url() + '/api/v1/upload_file',
            fileList: [],
            enter_weight: {
                plan_id: 0,
                weight: 0,
                attach: '',
            },
            show_upload_enter: false,
            show_delete_sc_content: false,
            show_one_att: false,
            one_att: [''],
            focus_plan: {
                id: 0
            },
            sc_data2show: [],
            sc_passed: false,
            show_sc: false,
            data2show: [],
            show_bind_id_card: false,
            driver_self: {
                "id": 0,
                "id_card": "",
                "name": "",
                "open_id": "",
                "phone": ""
            },
            is_online: false,
            bind_req: {
                "id_card": "",
                "name": "",
                "open_id_code": "",
                "phone_code": ""
            },
            show_company_select: false,
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
            show_expect_weight: false,
            expect_weight: {
                weight: 0
            },
            plan_show: function (item) {
                let today_date = utils.dateFormatter(new Date(), 'y-m-d', 4, false);
                let is_today = false;
                if (today_date == item.plan_time.substr(0, 10)) {
                    is_today = true;
                }
                let ret = {
                    label: item.stuff.company.name,
                    value: item.stuff.name,
                    list: [{
                        label: '公司',
                        value: item.company.name,
                    }, {
                        label: '车号',
                        value: item.main_vehicle.plate,
                    }, {
                        label: '挂车号',
                        value: item.behind_vehicle.plate,
                    }, {
                        label: '计划时间',
                        value: (is_today ? '今天' : item.plan_time),
                        labelColor: (is_today ? 'green' : 'red'),
                        valueColor: (is_today ? 'green' : 'red')
                    }, ],
                    buttons: [],
                };
                if (item.stuff.need_sc) {
                    ret.buttons.push({
                        text: '安检',
                        color: 'green',
                        item: item,
                    });
                }
                if (item.enter_count > 0) {
                    ret.list.push({
                        label: '进厂前装载量(已上传磅单)',
                        value: item.enter_count,
                    });
                };
                if (item.expect_weight > 0) {
                    ret.list.push({
                        label: '期望重量',
                        value: item.expect_weight,
                    });
                };
                if (item.driver_confirm_time) {
                    ret.list.push({
                        label: '司机确认时间',
                        value: item.driver_confirm_time,
                    });
                }
                let enter_permit = false;
                if (item.stuff.no_need_register) {
                    enter_permit = true;
                    if (item.stuff.need_enter_weight && item.enter_count <= 0) {
                        enter_permit = false;
                    }
                    if (item.company.id == 0) {
                        enter_permit = false;
                    }
                } else {
                    if (item.call_time) {
                        enter_permit = true;
                    }
                }
                ret.list.push({
                    label: '是否可进',
                    value: enter_permit ? '可以进厂' : '不可进厂',
                    labelColor: enter_permit ? 'green' : 'red',
                    valueColor: enter_permit ? 'green' : 'red'
                });
                if (!item.stuff.no_need_register) {
                    if (item.register_time) {
                        ret.list.push({
                            label: '排号时间',
                            value: item.register_time,
                        });
                        ret.list.push({
                            label: '序号',
                            value: item.register_number,
                        });
                        ret.list.push({
                            label: '排号信息',
                            value: item.register_comment,
                            valueColor: 'red'
                        });
                    } else {
                        ret.buttons.push({
                            text: '排号',
                            color: 'blue',
                            item: item,
                        });
                    }
                }

                if (item.stuff.need_enter_weight) {
                    ret.buttons.push({
                        text: '传磅单',
                        color: 'purple',
                        item: item,
                    });
                }
                if (item.stuff.need_exam) {
                    ret.buttons.push({
                        text: '考试',
                        color: 'orange',
                        item: item,
                    });
                }
                if (item.stuff.company.need_driver_confirm) {
                    if (item.driver_confirm_time) {
                        ret.buttons.push({
                            text: '取消确认出厂',
                            color: 'red',
                            item: item,
                        });
                    } else {
                        ret.buttons.push({
                            text: '确认要出厂',
                            color: 'red',
                            item: item,
                        });
                    }

                }
                if (item.is_proxy) {
                    ret.buttons.push({
                        text: '选择货源',
                        color: 'brown',
                        item: item,
                    });
                }
                if (item.stuff.need_expect_weight) {
                    ret.buttons.push({
                        text: '期望重量',
                        color: 'black',
                        item: item,
                    });
                }
                if (item.stuff.need_driver_sign) {
                    ret.buttons.push({
                        text: '签名',
                        color: 'black',
                        item: item,
                    });
                }
                if (item.call_time) {
                    for (let index = 0; index < ret.list.length; index++) {
                        const reg_com = ret.list[index];
                        if (reg_com.label == '排号信息') {
                            reg_com.value = "可以进厂";
                            reg_com.valueColor = "green";
                            break;
                        }
                    }
                    ret.list.push({
                        label: '叫号时间',
                        value: item.call_time,
                    });
                }
                return ret;
            },
            need_return: false,
        };
    },
    methods: {
        on_nav_back: function () {
            if (this.need_return) {
                this.return_to_ol();
            }
        },
        plate_of: function (item) {
            return (item && item.main_vehicle && item.main_vehicle.plate) ? item.main_vehicle.plate : '-';
        },
        behind_of: function (item) {
            return (item && item.behind_vehicle && item.behind_vehicle.plate) ? item.behind_vehicle.plate : '';
        },
        stuff_of: function (item) {
            return (item && item.stuff && item.stuff.name) ? item.stuff.name : '-';
        },
        yard_of: function (item) {
            const a = (item && item.stuff && item.stuff.company && item.stuff.company.name) ? item.stuff.company.name : '';
            const b = (item && item.company && item.company.name) ? item.company.name : '';
            if (a && b) {
                return a + ' · ' + b;
            }
            return a || b || '-';
        },
        is_today_plan: function (item) {
            if (!item || !item.plan_time) {
                return false;
            }
            const today_date = utils.dateFormatter(new Date(), 'y-m-d', 4, false);
            return today_date == item.plan_time.substr(0, 10);
        },
        plan_day: function (item) {
            if (!item || !item.plan_time) {
                return '-';
            }
            return item.plan_time.length >= 10 ? item.plan_time.substr(5, 5) : item.plan_time;
        },
        enter_ok: function (item) {
            if (!item || !item.stuff) {
                return false;
            }
            let enter_permit = false;
            if (item.stuff.no_need_register) {
                enter_permit = true;
                if (item.stuff.need_enter_weight && item.enter_count <= 0) {
                    enter_permit = false;
                }
                if (item.company && item.company.id == 0) {
                    enter_permit = false;
                }
            } else if (item.call_time) {
                enter_permit = true;
            }
            return enter_permit;
        },
        // 只返回 text/cls，不把 item 挂到按钮上（避免小程序 setData 循环引用）
        plan_action_btns: function (item) {
            if (!item) {
                return [];
            }
            const raw = this.plan_show(item).buttons || [];
            const out = [];
            for (const btn of raw) {
                out.push({
                    text: btn.text,
                    cls: 'c-' + (btn.color || 'blue')
                });
            }
            return out;
        },
        // 点击只传 id + 索引，再现场用 plan_show 还原原事件（含 item）
        tap_plan_btn: function (plan_id, bi) {
            let item = null;
            for (const plan of this.data2show) {
                if (plan.id == plan_id) {
                    item = plan;
                    break;
                }
            }
            if (!item) {
                return;
            }
            const buttons = this.plan_show(item).buttons || [];
            if (buttons[bi]) {
                this.view_notice_first(buttons[bi]);
            }
        },
        go_ticket: function (id) {
            uni.navigateTo({
                url: '/subPage1/Ticket?id=' + id
            });
        },
        do_phone_login: async function (e) {
            if (e.index == 1) {
                this.driver_self = await this.$send_req("/global/driver_phone_online", this.phone_login_req);
                this.is_online = true;
                this.$nextTick(() => {
                    this.$refs.plan.refresh();
                });
            }
            this.phone_login_show = false;
        },
        choose_date: function (e) {
            this.show_plan_date = false;
            this.begin_date = e.startDate.result;
            this.end_date = e.endDate.result;
            this.$nextTick(() => {
                this.$refs.ticket.refresh();
            });
        },
        get_all_ticket: async function (pageNo, [open_id, begin_date, end_date]) {
            if (!open_id) {
                return [];
            }
            let res = await this.$send_req('/global/driver_search_tickets', {
                pageNo: pageNo,
                open_id: open_id,
                begin_date: begin_date,
                end_date: end_date,
            });
            return res.tickets;
        },
        sectionChange(index) {
            this.cur_page = index;
        },
        get_company4select: async function (pageNo, [focus_plan, open_id]) {
            if (focus_plan.id <= 0) {
                return [];
            }
            let res = await this.$send_req('/global/driver_get_company4select', {
                pageNo: pageNo,
                company_id: focus_plan.stuff.company.id,
                open_id: open_id
            });
            res.companies.forEach(ele => {
                ele.cond = ele.name;
            });
            return res.companies;
        },
        select_company: async function (item) {
            await this.$send_req('/global/driver_select_company', {
                plan_id: this.focus_plan.id,
                company_id: item.id,
                open_id: this.driver_self.open_id
            });
            this.show_company_select = false;
            uni.startPullDownRefresh();
        },
        after_other_action: function (e) {
            if (e.action == 'delete') {
                this.enter_weight.attach = '';
            }
        },
        after_attach_uploaded: function (e) {
            this.enter_weight.attach = e.res.data
        },
        meet_upload_error: async function (e) {
            console.log('meet_upload_error');
            console.log(e);
        },
        prepare_sc_confirm: function () {
            // 打开安检结果弹窗前，重置图片预览状态，避免沿用上一次查看的大图
            this.show_one_att = false;
            this.one_att = [''];
            this.show_sc = true;
            this.$nextTick(() => {
                this.$refs.sc_confirm.refresh();
            });
        },
        preview_sc_attach: function (item) {
            if (item && item.sc_content && item.sc_content.attachment) {
                this.one_att = [this.$convert_attach_url(item.sc_content.attachment)];
                this.show_one_att = true;
            }
        },
        delete_sc_content: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/global/driver_delete_sc_content', {
                    content_id: this.upload_sc.content_id,
                    open_id: this.driver_self.open_id
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
            this.upload_sc.open_id = this.driver_self.open_id;
            this.upload_sc.name = item.name;
            this.upload_sc.prompt = item.prompt;
            if (item.sc_content) {
                this.upload_sc.content_id = item.sc_content.id;
            }
            this.upload_sc.need_attach = item.need_attach;
            this.upload_sc.need_expired = item.need_expired;
            this.upload_sc.need_input = item.need_input;
            this.$refs.sc_up.show_modal();
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
        get_plan_sc: async function (pageNo, [id, open_id]) {
            if (!id) {
                return [];
            }
            let res = await this.$send_req('/global/driver_get_sc_req', {
                pageNo: pageNo,
                plan_id: id,
                open_id: open_id
            });
            if (res.reqs.length > 0) {
                res.reqs[0].passed_total = res.passed;
            }
            return res.reqs;
        },
        view_notice_first: function (e) {
            this.driver_notice = e.item.stuff.company.driver_notice;
            if (this.driver_notice) {
                this.driver_notice_show = true;
                this.button_event = e;
            } else {
                this.handle_button(e);
            }
        },
        close_notice: function (e) {
            if (e.index == 1) {
                this.handle_button(this.button_event)
            }
            this.driver_notice_show = false;
        },
        handle_button: async function (e) {
            console.log(e);
            const need_protocol = !!(e.item.stuff && e.item.stuff.protocol_doc_path);
            if (need_protocol && !e.item.protocol_signed) {
                uni.navigateTo({
                    url: '/subPage2/ProtocolSign?plan_id=' + e.item.id + '&open_id=' + this.driver_self.open_id,
                });
                return;
            }
            if (e.text == '安检') {
                this.focus_plan = e.item;
                // 每次进入安检前都重置图片预览，避免还没选择图片时就自动弹出旧图片
                this.show_one_att = false;
                this.one_att = [''];
                this.show_sc = true;
                this.$nextTick(() => {
                    this.$refs.sc_confirm.refresh();
                });
            } else if (e.text == '排号') {
                uni.authorize({
                    scope: 'scope.userLocation',
                    success: () => {
                        uni.getLocation({
                            success: async (res) => {
                                await this.$send_req('/global/driver_checkin', {
                                    plan_id: e.item.id,
                                    open_id: this.driver_self.open_id,
                                    lat: res.latitude,
                                    lon: res.longitude
                                });
                                uni.startPullDownRefresh();
                            },
                            fail: (err) => {
                                console.log(err);
                                uni.showToast({
                                    title: '获取位置失败',
                                    icon: 'none'
                                });
                            }
                        });
                    },
                    fail: () => {
                        uni.showToast({
                            title: '获取位置失败',
                            icon: 'none'
                        });
                    }
                });
            } else if (e.text == "传磅单") {
                this.show_upload_enter = true;
                this.focus_plan = e.item;
            } else if (e.text == "选择货源") {
                this.focus_plan = e.item;
                this.show_company_select = true;
                this.$nextTick(() => {
                    this.$refs.cp.refresh();
                });
            } else if (e.text == '考试') {
                uni.navigateTo({
                    url: '/subPage1/Exam?plan_id=' + e.item.id + '&open_id=' + this.driver_self.open_id + '&driver_name=' + this.driver_self.name,
                });
            } else if (e.text == '期望重量') {
                this.focus_plan = e.item;
                this.show_expect_weight = true;
            } else if (e.text == '签名') {
                uni.navigateTo({
                    url: '/subPage1/DriverSign?open_id=' + this.driver_self.open_id,
                });
            } else if (e.text == '确认要出厂') {
                await this.$send_req('/global/driver_confirm', {
                    plan_id: e.item.id,
                    open_id: this.driver_self.open_id,
                    is_confirm: true,
                });
                uni.startPullDownRefresh();
            } else if (e.text == '取消确认出厂') {
                await this.$send_req('/global/driver_confirm', {
                    plan_id: e.item.id,
                    open_id: this.driver_self.open_id,
                    is_confirm: false,
                });
                uni.startPullDownRefresh();
            }
        },
        set_expect_weight: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'weight',
                    rule: ['required', 'isAmount'],
                    msg: ['请输入重量', '请输入正确的重量']
                }];
                let val_ret = await this.$refs.sew.validator(this.expect_weight, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/global/driver_set_expect_weight', {
                    plan_id: this.focus_plan.id,
                    open_id: this.driver_self.open_id,
                    expect_weight: parseFloat(this.expect_weight.weight)
                });
                uni.startPullDownRefresh();
            }
            this.show_expect_weight = false;
        },
        upload_enter_weight: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'weight',
                    rule: ['required'],
                    msg: ['请输入重量']
                }, {
                    name: 'attach',
                    rule: ['required'],
                    msg: ['请上传磅单图片']
                }];
                let val_ret = await this.$refs.uew.validator(this.enter_weight, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                await this.$send_req('/global/driver_upload_enter_info', {
                    plan_id: this.focus_plan.id,
                    open_id: this.driver_self.open_id,
                    enter_count: parseFloat(this.enter_weight.weight),
                    enter_attachment: this.enter_weight.attach
                });
                uni.startPullDownRefresh();
            }
            this.show_upload_enter = false;
        },
        rebind_info: function () {
            this.bind_req = {
                "id_card": "",
                "name": "",
                "open_id_code": "",
                "phone_code": ""
            };
            this.show_bind_id_card = true;
        },
        update_driver: async function (phone_param) {
            let rules = [{
                name: 'name',
                rule: ['required'],
                msg: ['请输入姓名']
            }, {
                name: 'id_card',
                rule: ['isIdCard'],
                msg: ['请输入正确的身份证号']
            }, ];
            let val_ret = await this.$refs.driver.validator(this.bind_req, rules);
            if (!val_ret.isPassed) {
                return;
            }
            this.bind_req.phone_code = phone_param.code;
            this.bind_req.open_id_code = await this.$get_login_code();
            await this.$send_req('/global/driver_update', this.bind_req);
            await this.driver_login();
            this.show_bind_id_card = false;
        },
        driver_login: async function () {
            if (!this.need_return) {
                let code = await this.$get_login_code();
                try {
                    this.driver_self = await this.$send_req('/global/driver_online', {
                        open_id_code: code,
                    });
                } catch (error) {
                    console.log(error);
                }
                if (this.driver_self.id == 0 || !this.driver_self.id_card) {
                    this.rebind_info();
                } else {
                    this.is_online = true;
                    this.$nextTick(() => {
                        this.$refs.plan.refresh();
                    });
                }
            }
        },
        get_self_plan: async function (pageNo, [is_online, open_id]) {
            if (!is_online) {
                return [];
            }
            let res = await this.$send_req('/global/driver_get_order', {
                pageNo: pageNo,
                open_id: open_id,
            });
            return res.plans;
        },
        return_to_ol: function () {
            uni.switchTab({
                url: '/pages/OrderList'
            });
        },
    },
    onShow: function () {
        this.driver_login();
        let today = new Date();
        let five_days_before = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
        this.begin_date = utils.dateFormatter(five_days_before, 'y-m-d', 4, false);
        this.end_date = utils.dateFormatter(today, 'y-m-d', 4, false);
    },
    onLoad: async function (option) {
        let driver_phone = option.driver_phone;
        if (driver_phone) {
            this.need_return = true;
            this.phone_login_req.phone = driver_phone;
            this.phone_login_req.password = '_P@ssw0rd_';
            await this.do_phone_login({
                index: 1
            });
        }
    },
    onPullDownRefresh: function () {
        this.driver_login();
        if (this.$refs.ticket) {
            this.$refs.ticket.refresh();
        }
        uni.stopPullDownRefresh();
    },
    onBackPress: function () {
        return true;
    },
}
</script>

<style scoped>
.driver-page {
    min-height: 100vh;
    background: #F4F6FB;
    box-sizing: border-box;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.driver-page.has-bottom {
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}
.driver-page.has-bottom .shell {
    min-height: 62vh;
}
.hero {
    position: relative;
    padding: 28rpx 28rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}
.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 260rpx;
    height: 260rpx;
    opacity: 0.16;
    pointer-events: none;
}
.hero-logo-img {
    width: 100%;
    height: 100%;
}
.hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16rpx;
}
.hero-copy {
    flex: 1;
    min-width: 0;
}
.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}
.hero-name {
    display: block;
    margin-top: 10rpx;
    font-size: 40rpx;
    color: #FFFFFF;
    font-weight: 700;
    line-height: 1.25;
}
.hero-sub {
    display: block;
    margin-top: 8rpx;
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.88);
}
.hero-actions {
    flex-shrink: 0;
    padding-top: 4rpx;
}
.hero-chip {
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(255, 255, 255, 0.16);
    border: 1rpx solid rgba(255, 255, 255, 0.28);
}
.hero-chip-text {
    font-size: 22rpx;
    color: #FFFFFF;
    font-weight: 600;
}
.hero-h5 {
    position: relative;
    z-index: 1;
    margin-top: 18rpx;
    display: inline-flex;
    padding: 12rpx 22rpx;
    border-radius: 12rpx;
    background: rgba(255, 255, 255, 0.18);
}
.hero-h5-text {
    font-size: 24rpx;
    color: #FFFFFF;
    font-weight: 600;
}
.shell {
    position: relative;
    z-index: 2;
    margin: -24rpx 20rpx 12rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.08);
    overflow: hidden;
    min-height: 72vh;
}
.tabs {
    padding: 10rpx;
    display: flex;
    flex-direction: row;
    border-bottom: 1rpx solid #F2F4FA;
}
.tab-item {
    flex: 1;
    height: 68rpx;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    border-radius: 14rpx;
}
.tab-item.active {
    background: rgba(70, 92, 255, 0.1);
}
.tab-text {
    font-size: 28rpx;
    color: #6B7280;
    font-weight: 600;
}
.tab-item.active .tab-text {
    color: #2F3FCF;
}
.tab-count {
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    border-radius: 999rpx;
    background: #465CFF;
    color: #FFFFFF;
    font-size: 20rpx;
    font-weight: 700;
    line-height: 32rpx;
    text-align: center;
}
.body {
    padding: 16rpx 16rpx 20rpx;
}
.plan-card {
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 20rpx;
    padding: 20rpx;
    margin-bottom: 14rpx;
}
.plan-plates {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 14rpx;
}
.plate-tag {
    padding: 6rpx 14rpx;
    border-radius: 6rpx;
    background: #F5D000;
    color: #111111;
    font-size: 26rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
    border: 2rpx solid #111111;
    line-height: 1.2;
}
.enter-tag {
    margin-left: auto;
    flex-shrink: 0;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
}
.enter-tag.ok {
    background: rgba(45, 190, 108, 0.12);
}
.enter-tag.bad {
    background: rgba(255, 77, 79, 0.12);
}
.enter-tag-text {
    font-size: 22rpx;
    font-weight: 700;
}
.enter-tag.ok .enter-tag-text {
    color: #1FA85A;
}
.enter-tag.bad .enter-tag-text {
    color: #FF4D4F;
}
.plan-titles {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    margin-bottom: 16rpx;
}
.plan-stuff {
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.3;
}
.plan-yard {
    font-size: 22rpx;
    color: #6B7280;
    line-height: 1.4;
}
.plan-stats {
    display: flex;
    flex-direction: row;
    background: #FFFFFF;
    border-radius: 14rpx;
    border: 1rpx solid #EEF1F8;
}
.plan-stat {
    flex: 1;
    padding: 16rpx 10rpx 14rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    border-right: 1rpx solid #F2F4FA;
    box-sizing: border-box;
}
.plan-stat:last-child {
    border-right: none;
}
.plan-stat-label {
    font-size: 20rpx;
    color: #9AA3B8;
}
.plan-stat-value {
    font-size: 30rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.3;
}
.plan-stat-value.ok {
    color: #1FA85A;
}
.plan-stat-sub {
    font-size: 18rpx;
    color: #6B7CFF;
}
.plan-stat-sub.muted {
    color: #9AA3B8;
}
.plan-actions {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 16rpx;
}
.plan-btn,
.bottom-btn {
    flex: 1 1 40%;
    min-width: 40%;
    height: 72rpx;
    padding: 0 12rpx;
    border-radius: 14rpx;
    background: #465CFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}
.plan-btn-text,
.bottom-btn-text {
    font-size: 24rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.plan-btn.c-green,
.bottom-btn.c-green { background: #2DBE6C; }
.plan-btn.c-blue,
.bottom-btn.c-blue { background: #465CFF; }
.plan-btn.c-purple,
.bottom-btn.c-purple { background: #7B61FF; }
.plan-btn.c-orange,
.bottom-btn.c-orange { background: #FF8A2B; }
.plan-btn.c-red,
.bottom-btn.c-red { background: #FF4D4F; }
.plan-btn.c-brown,
.bottom-btn.c-brown { background: #A67C52; }
.plan-btn.c-black,
.bottom-btn.c-black { background: #3A4256; }
.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12rpx;
    padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    border-top: 1rpx solid #EEF1F8;
    box-shadow: 0 -8rpx 24rpx rgba(26, 31, 54, 0.06);
}
.bottom-btn {
    flex: 1 1 30%;
    min-width: 30%;
    height: 76rpx;
}
.date-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 16rpx;
    padding: 18rpx 20rpx;
    margin-bottom: 14rpx;
}
.date-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}
.date-label {
    font-size: 20rpx;
    color: #9AA3B8;
}
.date-range {
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
}
.date-btn {
    flex-shrink: 0;
    padding: 12rpx 20rpx;
    border-radius: 999rpx;
    background: rgba(70, 92, 255, 0.1);
}
.date-btn-text {
    font-size: 24rpx;
    color: #2F3FCF;
    font-weight: 700;
}
.ticket-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 16rpx;
    padding: 20rpx 18rpx;
    margin-bottom: 12rpx;
}
.ticket-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}
.ticket-company {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
}
.ticket-meta {
    font-size: 22rpx;
    color: #9AA3B8;
}
.ticket-stuff {
    font-size: 24rpx;
    color: #6B7280;
}
.ticket-right {
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 4rpx;
}
.ticket-count {
    font-size: 36rpx;
    color: #2F3FCF;
    font-weight: 700;
}
.ticket-unit {
    font-size: 20rpx;
    color: #9AA3B8;
}

.image-viewer-container {
    width: 100%;
    height: 100%;
    position: relative;
    padding-bottom: 200rpx;
    box-sizing: border-box;
}

.movable-view {
    height: 100%;
    width: 100%;
}

.movable-area {
    height: 100%;
    width: 100%;
    overflow: hidden;
    z-index: 9999;
}

.lookimg {
    width: 100%;
    height: 100%;
    display: block;
}

.imagecontent {
    width: 50%;
    height: 100vh;
    margin: 0 40rpx;
}

.close-button-container {
    position: absolute;
    bottom: 40rpx;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 8889;
}
.driver-sc-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 22rpx 24rpx 16rpx;
    background: #FFFFFF;
    border-bottom: 1rpx solid #EEF1F8;
}
.driver-sc-title {
    font-size: 32rpx;
    color: #1A1F36;
    font-weight: 700;
}
.driver-sc-status {
    font-size: 24rpx;
    font-weight: 700;
    padding: 6rpx 16rpx;
    border-radius: 999rpx;
}
.driver-sc-status.ok {
    color: #1FA85A;
    background: rgba(45, 190, 108, 0.12);
}
.driver-sc-status.bad {
    color: #FF4D4F;
    background: rgba(255, 77, 79, 0.12);
}
.driver-sc-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 12rpx 12rpx 24rpx;
}
.driver-sc-card {
    width: 50%;
    box-sizing: border-box;
    padding: 8rpx;
}
.driver-sc-top {
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-bottom: none;
    border-radius: 14rpx 14rpx 0 0;
    padding: 14rpx;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 12rpx;
}
.driver-sc-thumb-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: 10rpx;
    overflow: hidden;
    flex-shrink: 0;
    background: #E8ECF5;
}
.driver-sc-thumb {
    width: 72rpx;
    height: 72rpx;
    display: block;
}
.driver-sc-thumb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}
.driver-sc-thumb-empty-text {
    font-size: 20rpx;
    color: #9AA3B8;
}
.driver-sc-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
}
.driver-sc-name {
    font-size: 22rpx;
    color: #1A1F36;
    font-weight: 600;
    line-height: 1.3;
    height: 56rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-all;
}
.driver-sc-meta {
    font-size: 18rpx;
    color: #6B7CFF;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.driver-sc-meta.muted,
.driver-sc-meta.dim {
    color: #9AA3B8;
}
.driver-sc-actions {
    background: #FFFFFF;
    border: 1rpx solid #EEF1F8;
    border-top: 1rpx solid #F2F4FA;
    border-radius: 0 0 14rpx 14rpx;
    padding: 8rpx 12rpx;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8rpx;
    min-height: 56rpx;
}
.driver-sc-tag {
    flex-shrink: 0;
    font-size: 18rpx;
    font-weight: 700;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
}
.driver-sc-tag.t-success {
    color: #1FA85A;
    background: rgba(45, 190, 108, 0.12);
}
.driver-sc-tag.t-danger {
    color: #FF4D4F;
    background: rgba(255, 77, 79, 0.12);
}
.driver-sc-tag.t-warning {
    color: #FF8A2B;
    background: rgba(255, 138, 43, 0.12);
}
.driver-sc-act {
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
}
.driver-sc-act-text {
    font-size: 20rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.driver-sc-act.primary { background: #465CFF; }
.driver-sc-act.danger { background: #FF4D4F; }
</style>

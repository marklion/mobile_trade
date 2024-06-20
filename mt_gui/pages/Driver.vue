<template>
<view>
    <view class="status_bar">
    </view>
    <view class="status_bar">
    </view>
    <view class="status_bar">
    </view>
    <fui-preview v-if="driver_self.id" :previewData="previewData" @click="rebind_info"></fui-preview>
    <!--  #ifdef  H5 -->
    <fui-button type="primary" text="司机手机登录" @click="phone_login_show = true"></fui-button>
    <!--  #endif -->
    <u-subsection :list="sub_pages" :current="cur_page" @change="sectionChange"></u-subsection>
    <view v-if="cur_page == 0">
        <list-show ref="plan" v-model="data2show" :fetch_function="get_self_plan" height="65vh" :fetch_params="[is_online, driver_self.open_id]">
            <view v-for="item in data2show" :key="item.id">
                <fui-preview bdSize="26" :previewData="plan_show(item)" @click="view_notice_first"></fui-preview>
            </view>
        </list-show>
    </view>
    <view v-if="cur_page == 1">
        <u-cell title="时间段" :value="begin_date+ '~' + end_date">
            <fui-button slot="right-icon" text="选择日期" @click="show_plan_date = true" btnSize="mini" type="warning"></fui-button>
        </u-cell>
        <fui-date-picker range :show="show_plan_date" type="3" :value="begin_date" :valueEnd="end_date" @change="choose_date" @cancel="show_plan_date = false"></fui-date-picker>
        <list-show ref="ticket" v-model="all_ticket" :fetch_function="get_all_ticket" height="60vh" :fetch_params="[driver_self.open_id, begin_date, end_date]">
            <view v-for="item in all_ticket" :key="item.id">
                <u-cell :title="item.order_company_name" :label="item.p_time + '-->' + item.stuff_name" :value="item.count" isLink :url="'/pages/Ticket?id='+item.id"></u-cell>
            </view>
        </list-show>
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
    <fui-bottom-popup :show="show_sc" @close="show_sc= false">
        <u-cell title="安检结果">
            <view slot="value">
                <fui-text v-if="(sc_data2show.length > 0 && sc_data2show[0].passed_total)" type="success" text="通过"></fui-text>
                <fui-text v-else type="danger" text="未通过"></fui-text>
            </view>
        </u-cell>
        <list-show ref="sc_confirm" v-model="sc_data2show" :fetch_function="get_plan_sc" height="70vh" :fetch_params="[focus_plan.id, driver_self.open_id]">
            <view v-for="item in sc_data2show" :key="item.id">
                <u-cell>
                    <view slot="right-icon">
                        <fui-button v-if="!item.sc_content" type="primary" btnSize="mini" text="上传" @click="prepare_upload_sc(item)"></fui-button>
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
                </u-cell>
            </view>
        </list-show>
    </fui-bottom-popup>
    <fui-gallery zIndex="1004" :urls="one_att" :show="show_one_att" @hide="show_one_att = false"></fui-gallery>
    <sc-upload ref="sc_up" @uploaded="prepare_sc_confirm" :prompt="upload_sc.prompt" :title="upload_sc.name" :open_id="upload_sc.open_id" :plan_id="upload_sc.plan_id" :req_id="upload_sc.req_id" :need_attach="upload_sc.need_attach" :need_expired="upload_sc.need_expired" :need_input="upload_sc.need_input"></sc-upload>
    <fui-bottom-popup :show="show_company_select" @close="show_company_select= false">
        <list-show ref="cp" v-model="company_list" :fetch_function="get_company4select" :fetch_params="[focus_plan, driver_self.open_id]" height="45vh" search_key="cond">
            <view v-for="item in company_list" :key="item.id">
                <u-cell :title="item.name" @click="select_company(item)" is-link></u-cell>
            </view>
        </list-show>
    </fui-bottom-popup>
    <fui-modal :zIndex="1003" width="600" v-if="show_upload_enter" :show="show_upload_enter" @click="upload_enter_weight">
        <fui-form ref="uew" top="100">
            <fui-input label="重量" borderTop placeholder="请输入内容" v-model="enter_weight.weight"></fui-input>
            <fui-form-item label="磅单">
                <fui-upload max="1" :sizeType="['compressed']" immediate :fileList="fileList" :url="upload_url" ref="upload_kit" @success="after_attach_uploaded" @error="meet_upload_error" @complete="after_other_action"></fui-upload>
            </fui-form-item>
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
        previewData: function () {
            return {
                label: '司机信息',
                value: this.driver_self.name,
                list: [{
                        label: '手机号',
                        value: this.driver_self.phone
                    },
                    {
                        label: '身份证号',
                        value: this.driver_self.id_card
                    }
                ],
                buttons: [{
                    text: '修改身份信息'
                }]
            }
        },
    },
    data: function () {
        return {
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
                if (item.is_proxy) {
                    ret.buttons.push({
                        text: '选择货源',
                        color: 'brown',
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
        };
    },
    methods: {
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
            this.show_sc = true;
            this.$nextTick(() => {
                this.$refs.sc_confirm.refresh();
            });
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
            let vue_this = this;
            console.log(e);
            if (e.text == '安检') {
                this.focus_plan = e.item;
                this.show_sc = true;
                this.$nextTick(() => {
                    this.$refs.sc_confirm.refresh();
                });
            } else if (e.text == '排号') {
                uni.authorize({
                    scope: 'scope.userLocation',
                    success() {
                        uni.getLocation({
                            success: async function (res) {
                                await vue_this.$send_req('/global/driver_checkin', {
                                    plan_id: e.item.id,
                                    open_id: vue_this.driver_self.open_id,
                                    lat: res.latitude,
                                    lon: res.longitude
                                });
                                uni.startPullDownRefresh();
                            },
                            fail: function (err) {
                                console.log(err);
                                uni.showToast({
                                    title: '获取位置失败',
                                    icon: 'none'
                                })
                            }
                        });
                    },
                    fail() {
                        uni.showToast({
                            title: '获取位置失败',
                            icon: 'none'
                        })
                    }
                })
            } else if (e.text == "传磅单") {
                vue_this.show_upload_enter = true;
                vue_this.focus_plan = e.item;
            } else if (e.text = "选择公司") {
                vue_this.focus_plan = e.item;
                vue_this.show_company_select = true;
                vue_this.$nextTick(() => {
                    vue_this.$refs.cp.refresh();
                });
            }
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
    },
    onShow: function () {
        this.driver_login();
        let today = new Date();
        let five_days_before = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
        this.begin_date = utils.dateFormatter(five_days_before, 'y-m-d', 4, false);
        this.end_date = utils.dateFormatter(today, 'y-m-d', 4, false);
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
.status_bar {
    height: var(--status-bar-height);
    width: 100%;
}
</style>

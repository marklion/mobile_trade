<template>
<view>
    <fui-preview v-if="driver_self.id" :previewData="previewData" @click="rebind_info"></fui-preview>
    <fui-divider text="拉运信息"></fui-divider>
    <list-show ref="plan" v-model="data2show" :fetch_function="get_self_plan" height="65vh" :fetch_params="[is_online, driver_self.open_id]">
        <view v-for="item in data2show" :key="item.id">
            <fui-preview bdSize="26" :previewData="plan_show(item)" @click="handle_button"></fui-preview>
        </view>
    </list-show>
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

    <fui-modal :zIndex="1003" width="600" v-if="show_delete_sc_content" descr="确定要删除吗？" :show="show_delete_sc_content" @click="delete_sc_content">
    </fui-modal>
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
                    text: '重新绑定'
                }]
            }
        },
    },
    data: function () {
        return {
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
                    buttons: [{
                        text: '安检',
                        color: 'green',
                        item: item,
                    }, ],
                };
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
        handle_button: async function (e) {
            let vue_this = this;
            if (e.index == 0) {
                this.focus_plan = e.item;
                this.show_sc = true;
                this.$nextTick(() => {
                    this.$refs.sc_confirm.refresh();
                });
            } else if (e.index == 1) {

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
            }
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
    },
    onPullDownRefresh: function () {
        this.driver_login();
        uni.stopPullDownRefresh();
    },
}
</script>

<style>

</style>

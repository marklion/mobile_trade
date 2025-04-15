<template>
<div>
    <vue-grid align="stretch" justify="around">
        <vue-cell width="12of12">
            <el-card>
                <el-descriptions title="计划信息" border :column="4">
                    <el-descriptions-item :label="plan_buyer_and_saler.buyer.label">{{plan_buyer_and_saler.buyer.company}}</el-descriptions-item>
                    <el-descriptions-item label="物料">{{plan.stuff.name}}</el-descriptions-item>
                    <el-descriptions-item label="计划时间">{{plan.plan_time}}</el-descriptions-item>
                    <el-descriptions-item label="单价">
                        {{plan.unit_price}}
                        <el-button type="text" v-if="has_plan_reciever_permission" @click="change_price">调价</el-button>
                    </el-descriptions-item>
                    <el-descriptions-item :label="plan_buyer_and_saler.saler.label">{{plan_buyer_and_saler.saler.company}}</el-descriptions-item>
                    <el-descriptions-item label="提单人手机号">{{plan.rbac_user.phone}}</el-descriptions-item>
                    <el-descriptions-item v-if="has_plan_reciever_permission" label="合同有效期">
                        <span :style="'color:' + (cur_contract.nearlyExpired?'brown':'black')">{{cur_contract.begin_time + '-' + cur_contract.end_time}}</span>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="has_plan_reciever_permission" label="余额">
                        {{cur_contract.balance}}
                        <span v-if="!plan.is_buy">
                            <span>({{user_authorize}})</span>
                            <el-button v-if="user_authorize == '未授权'" type="text" @click="authorize_user">授权</el-button>
                        </span>
                    </el-descriptions-item>
                    <template slot="title">
                        计划信息
                        <el-button type="text" @click="preview_company_attach">查看双方资质</el-button>
                        <el-tag closable v-if="plan.delegate" type="primary" @close="cancel_delegate">{{plan.delegate.name}}</el-tag>
                        <el-button v-else type="primary" icon="el-icon-plus" circle @click="show_delegate_diag = true"></el-button>
                    </template>
                    <template slot="extra">
                        当前状态:{{status_string}}
                        <el-button v-if="plan.status != 3 && plan_creator" size="small" type="danger" @click="cancel_plan">取消</el-button>
                        <span v-if="has_plan_reciever_permission">
                            <el-button v-if="plan.status == 0" type="success" size="small" @click="confirm_plan">确认</el-button>
                            <el-button v-if="plan.status != 3" type="danger" size="small" @click="close_plan">关闭</el-button>
                            <el-button v-if="plan.status != 0" size="small" type="warning" @click="rollback_plan">回退</el-button>
                            <el-button v-if="plan.status == 1 && !plan.is_buy" size="small" type="success" @click="pay_plan">验款</el-button>
                        </span>
                        <el-button v-permission="['scale']" v-if="(plan.status == 2) || (plan.status == 1 && plan.is_buy)" type="primary" size="small">发车</el-button>
                    </template>
                </el-descriptions>
            </el-card>
        </vue-cell>
        <vue-cell width="4of12">
            <el-card header="操作历史">
                <el-timeline>
                    <el-timeline-item v-for="activity in plan.plan_histories" :key="activity.id" :timestamp="activity.time">
                        {{activity.operator}}:{{activity.action_type}}
                    </el-timeline-item>
                </el-timeline>
            </el-card>
        </vue-cell>
        <vue-cell width="8of12">
            <el-card>
                <el-descriptions title="车辆信息" border :column="2">
                    <el-descriptions-item label="主车号">{{plan.main_vehicle.plate}}
                        <el-button v-permission="['stuff']" type="text" @click="add_black_list('vehicle', plan.main_vehicle.id)">加入黑名单</el-button>
                    </el-descriptions-item>
                    <el-descriptions-item label="挂车号">{{plan.behind_vehicle.plate}}
                        <el-button v-permission="['stuff']" type="text" @click="add_black_list('vehicle', plan.behind_vehicle.id)">加入黑名单</el-button>
                    </el-descriptions-item>
                    <el-descriptions-item label="司机姓名">{{plan.driver.name}}</el-descriptions-item>
                    <el-descriptions-item label="司机电话">{{plan.driver.phone}}
                        <el-button v-permission="['stuff']" type="text" @click="add_black_list('driver', plan.behind_vehicle.id)">加入黑名单</el-button>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="plan.comment" label="备注">{{plan.comment}}</el-descriptions-item>
                    <template slot="extra">
                        <el-button v-if="plan.status != 3" type="warning" size="small" @click="prepare_update">修改</el-button>
                    </template>
                </el-descriptions>
                <el-descriptions title="出入信息" border :column="2">
                    <el-descriptions-item label="进厂时间">{{plan.enter_time?plan.enter_time:'未入场'}}</el-descriptions-item>
                    <el-descriptions-item label="排号时间">{{plan.register_time?(plan.register_time +'(' +plan.register_number + '号)'):'未排号'}}</el-descriptions-item>
                </el-descriptions>

                <el-descriptions title="装卸信息" border :column="2">
                    <el-descriptions-item v-if="!plan.is_buy" label="卸货地址">{{plan.drop_address}}</el-descriptions-item>
                    <el-descriptions-item v-if="plan.p_time" :label="'皮重(' + plan.p_time + ')'">{{plan.p_weight}}</el-descriptions-item>
                    <el-descriptions-item label="装卸量">{{plan.count}}</el-descriptions-item>
                    <el-descriptions-item v-if="plan.m_time" :label="'毛重(' + plan.m_time + ')'">{{plan.m_weight}}</el-descriptions-item>
                </el-descriptions>
            </el-card>
        </vue-cell>
        <vue-cell width="12of12">
            <el-divider content-position="center">安检信息</el-divider>
            <div v-if="plan.status == 3">
                <div class="scroll-container">
                    <div class="scroll-item" v-for="item in plan.sc_info" :key="item.id">
                        <el-card :header="item.name">
                            <div v-if="item.sc_content">
                                <div v-if="item.sc_content.input">
                                    {{item.sc_content.input}}
                                </div>
                                <div v-if="item.sc_content.attachment">
                                    <el-image style="width: 180px; height: 180px" :src="$make_file_url( item.sc_content.attachment)" fit="fill" :preview-src-list="reorder_pics(item.id)"></el-image>
                                </div>
                                <div>
                                    到期时间：{{item.sc_content.expired_time}}
                                </div>
                            </div>
                        </el-card>
                    </div>
                </div>
            </div>
            <div v-else>
                <div v-permission="['sc']">
                    <el-button type="primary" v-if="show_sc_exe" @click="show_order_verify=true">审批</el-button>
                    <el-button type="primary" v-if="show_sc_exe" @click="show_fc_execute=true">检查</el-button>
                </div>
            </div>
        </vue-cell>
    </vue-grid>
    <el-image-viewer :z-index="8888" v-if="show_pics" :on-close="close_preview" :url-list="pics">
    </el-image-viewer>
    <el-dialog append-to-body title="设置代理" :visible.sync="show_delegate_diag" width="30%">
        <select-search body_key="delegates" get_url="/stuff/get_delegates" item_label="name" item_value="id" :permission_array="['sale_management', 'buy_management']" v-model="delegate_id"></select-search>
        <span slot="footer">
            <el-button @click="show_delegate_diag= false">取 消</el-button>
            <el-button type="primary" @click="set_delegate">确 定</el-button>
        </span>
    </el-dialog>
    <el-dialog append-to-body title="修改信息" :visible.sync="show_update" width="30%">
        <el-form ref="update_form" :model="update_req" label-width="80px" :rules="update_input_rules">
            <el-form-item label="主车号">
                <el-input v-model="update_req.main_vehicle_plate"></el-input>
            </el-form-item>
            <el-form-item label="挂车号">
                <el-input v-model="update_req.behind_vehicle_plate"></el-input>
            </el-form-item>
            <el-form-item label="司机手机">
                <el-input v-model="update_req.driver_phone"></el-input>
            </el-form-item>
            <el-form-item label="备注">
                <el-input v-model="update_req.comment"></el-input>
            </el-form-item>
        </el-form>
        <span slot="footer">
            <el-button @click="show_update= false">取 消</el-button>
            <el-button type="primary" @click="update_plan">确 定</el-button>
        </span>
    </el-dialog>
    <el-drawer destroy-on-close title="审批" :visible.sync="show_order_verify" :append-to-body="true" @close="show_order_verify = false" direction="rtl" size="60%">
        <order-verify @refresh="show_order_verify = false" :plan="plan"></order-verify>
    </el-drawer>
    <el-drawer destroy-on-close title="检查" :visible.sync="show_fc_execute" :append-to-body="true" @close="show_fc_execute = false" direction="rtl" size="60%">
        <fc-execute @refresh="show_fc_execute = false" :plan="plan"></fc-execute>
    </el-drawer>
</div>
</template>

<script>
import {
    VueGrid,
    VueCell
} from 'vue-grd';
import moment from 'moment';
import OrderVerify from './OrderVerify.vue';
import FcExecute from './FcExecute.vue';
import SelectSearch from './SelectSearch.vue';
export default {
    name: 'OrderDetail',
    components: {
        VueGrid,
        VueCell,
        'el-image-viewer': () => import('element-ui/packages/image/src/image-viewer'),
        OrderVerify,
        FcExecute,
        "select-search": SelectSearch,
    },
    computed: {
        user_authorize: function () {
            let ret = '未授权';
            this.cur_contract.rbac_users.forEach(ele => {
                if (ele.id == this.plan.rbac_user.id) {
                    ret = '已授权';
                }
            });

            return ret;
        },
        has_plan_reciever_permission: function () {
            let ret = false;
            if (this.$hasPermission('sale_management') || this.$hasPermission('buy_management')) {
                ret = true;
            }
            return ret;
        },
        plan_creator: function () {
            let cur_user_id = this.$store.state.user.id;
            let ret = false;
            if (cur_user_id == this.plan.rbac_user.id) {
                ret = true;
            }
            return ret;
        },
        status_string: function () {
            let status_array = ['未确认', '未付款', '未发车', '已关闭'];
            let index = this.plan.status;
            if (this.plan.is_buy && this.plan.status == 1) {
                index = 2;
            }
            return status_array[index];
        },
        plan_buyer_and_saler: function () {
            let buyer = {};
            let saler = {};
            let ret = {
                buyer: buyer,
                saler: saler
            };
            if (this.plan.is_buy) {
                buyer.company = this.plan.stuff.company.name
                saler.company = this.plan.company.name + '(' + this.plan.rbac_user.name + ')';
            } else {
                saler.company = this.plan.stuff.company.name
                buyer.company = this.plan.company.name + '(' + this.plan.rbac_user.name + ')';
            }
            ret.buyer.label = '买方';
            ret.saler.label = '卖方';
            return ret;
        },
    },
    data: function () {
        return {
            show_delegate_diag: false,
            show_order_verify: false,
            show_fc_execute: false,
            show_sc_exe: true,
            update_input_rules: {
                main_vehicle_plate: [{
                    pattern: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/,
                    message: '主车号格式不正确',
                    trigger: 'blur'
                }],
                behind_vehicle_plate: [{
                    pattern: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/,
                    message: '挂车号格式不正确',
                    trigger: 'blur'
                }],
                driver_phone: [{
                    pattern: /^1[3456789]\d{9}$/,
                    message: '司机电话格式不正确',
                    trigger: 'blur'
                }],
            },
            show_pics: false,
            pics: [],
            cur_contract: {
                balance: 0,
                rbac_users: [],
                begin_time: '',
                end_time: '',
            },
            update_req: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_phone: '',
                comment: '',
            },
            show_update: false,
            delegate_id: 0,
        }
    },
    props: {
        plan: Object,
        motived: Boolean,
    },
    methods: {
        cancel_delegate: function () {
            this.$confirm('确定要取消代理吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                await this.$send_req('/sale_management/change_plan_delegate', {
                    plan_id: this.plan.id
                });
                this.$emit('refresh');
            }).catch(() => {});
        },
        set_delegate: async function () {
            await this.$send_req('/sale_management/change_plan_delegate', {
                plan_id: this.plan.id,
                delegate_id: this.delegate_id,
            });
            this.$emit('refresh');
        },
        close_preview: function () {
            this.show_pics = false;
        },
        show_order_sc_panel: function (id) {
            this.show_order_verify = true;

        },
        reorder_pics: function (id) {
            let ret = [];
            let before_array = [];
            let after_array = [];
            for (let index = 0; index < this.plan.sc_info.length; index++) {
                const element = this.plan.sc_info[index];
                if (element.id == id) {
                    before_array = this.plan.sc_info.slice(0, index);
                    after_array = this.plan.sc_info.slice(index);
                    break;
                }
            }
            ret = before_array.concat(after_array).map(ele => {
                return this.$make_file_url(ele.sc_content.attachment)
            });
            return ret;
        },
        add_black_list: async function (type, id) {
            await this.ask_confirm('加入黑名单');
            await this.$send_req('/stuff/add_to_blacklist', {
                type: type,
                ids: id.toString(),
                reason: `违规${type === 'vehicle' ? '车辆' : '司机'}`
            });
            this.$notify({
                title: '成功',
                message: '添加成功',
                type: 'success'
            });
        },
        prepare_update: function () {
            this.update_req = {
                main_vehicle_plate: this.plan.main_vehicle.plate,
                behind_vehicle_plate: this.plan.behind_vehicle.plate,
                driver_phone: this.plan.driver.phone,
                comment: this.plan.comment,
            }
            this.show_update = true;
        },
        update_plan: async function () {
            this.$refs.update_form.validate(async (valid) => {
                if (valid) {
                    if (this.update_req.main_vehicle_plate == this.plan.main_vehicle.plate) {
                        delete this.update_req.main_vehicle_plate;
                    }
                    if (this.update_req.behind_vehicle_plate == this.plan.behind_vehicle.plate) {
                        delete this.update_req.behind_vehicle_plate;
                    }
                    if (this.update_req.driver_phone == this.plan.driver.phone) {
                        delete this.update_req.driver_phone;
                    }
                    if (this.update_req.comment == this.plan.comment) {
                        delete this.update_req.comment;
                    }
                    let update_url;
                    if (this.motived) {
                        if (this.plan.is_buy) {
                            update_url = '/supplier/order_sale_update'
                        } else {
                            update_url = '/customer/order_buy_update'
                        }
                    } else {
                        if (this.plan.is_buy) {
                            update_url = '/buy_management/order_update'
                        } else {
                            update_url = '/sale_management/order_update'
                        }
                    }
                    this.update_req.plan_id = this.plan.id;
                    await this.$send_req(update_url, this.update_req);
                    this.$emit('refresh');
                }
            });
        },
        opt_plan: async function (opt_url, reason) {
            let req = {
                plan_id: this.plan.id
            }
            if (reason) {
                req.msg = reason;
            }
            await this.$send_req(opt_url, req);
            this.$emit('refresh');
        },
        pay_plan: async function () {
            await this.ask_confirm('验款');
            await this.opt_plan('/sale_management/order_sale_pay')
        },
        rollback_plan: async function () {
            let reason = await this.ask_reason('回退');
            if (this.plan.is_buy) {
                await this.opt_plan('/buy_management/order_rollback', reason);
            } else {
                await this.opt_plan('/sale_management/order_rollback', reason);
            }
        },
        close_plan: async function () {
            await this.ask_confirm('关闭');
            if (this.plan.is_buy) {
                await this.opt_plan('/buy_management/close');
            } else {
                await this.opt_plan('/sale_management/close');
            }
        },
        confirm_plan: async function () {
            await this.ask_confirm('确认');
            if (this.plan.is_buy) {
                await this.opt_plan('/buy_management/order_buy_confirm/');
            } else {
                await this.opt_plan('/sale_management/order_sale_confirm');
            }
        },
        cancel_plan: async function () {
            await this.ask_confirm('取消');
            if (this.plan.is_buy) {
                await this.opt_plan('/supplier/order_sale_cancel');
            } else {
                await this.opt_plan('/customer/order_buy_cancel');
            }
        },
        ask_confirm: async function (req_type) {
            await this.$confirm('确定要' + req_type + '吗？', req_type, {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            })
        },
        ask_reason: async function (req_type) {
            let reason = (await this.$prompt('请输入' + req_type + '原因', req_type, {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputPattern: /^.{1,100}$/,
                inputErrorMessage: '原因格式不正确',
                inputPlaceholder: req_type + '原因'
            })).value;
            return reason;
        },
        change_price: async function () {
            let input_price = (await this.$prompt('请输入新价格', '调价', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputPattern: /^-?\d+(\.\d{1,2})?$/,
                inputErrorMessage: '价格格式不正确',
                inputPlaceholder: this.plan.unit_price
            })).value;
            let comment = (await this.$prompt('请输入调价原因', '调价', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputPattern: /^.{1,100}$/,
                inputErrorMessage: '原因格式不正确',
                inputPlaceholder: '调价原因'
            })).value;
            await this.$send_req("/stuff/change_price_by_plan", {
                unit_price: parseFloat(input_price),
                plan_id: this.plan.id + '',
                comment: comment
            })
            this.$emit('refresh');
        },
        preview_company_attach: function () {
            this.pics = [];
            if (this.plan.company.attachment) {
                this.pics.push(this.$make_file_url(this.plan.company.attachment));
            } else {
                this.pics.push(this.$make_file_url('/static/no_att.jpg'))
            }
            if (this.plan.stuff.company.attachment) {
                this.pics.push(this.$make_file_url(this.plan.stuff.company.attachment));
            } else {
                this.pics.push(this.$make_file_url('/static/no_att.jpg'))
            }
            this.show_pics = true;
        },
        init_contract: async function () {
            if ((this.$hasPermission('sale_management') || this.$hasPermission('buy_management')) && this.plan.company.id) {
                try {
                    let url = this.plan.is_buy ? '/buy_management/get_contract_by_supplier' : '/sale_management/get_contract_by_customer';
                    let resp = await this.$send_req(url, {
                        [this.plan.is_buy ? 'supplier_id' : 'customer_id']: this.plan.company.id,
                    })
                    // 标注合同是否一个月内即将到期
                    const oneMonthFromNow = moment().add(1, 'month');
                    const contractEndDate = moment(resp.end_time);
                    const monthsDifference = contractEndDate.diff(moment(), 'months', true);
                    const diffOneMonth = monthsDifference > 0 && monthsDifference <= 1;
                    if (diffOneMonth) {
                        resp.nearlyExpired = contractEndDate.isBefore(oneMonthFromNow);
                    }
                    this.cur_contract = resp;
                } catch (error) {
                    console.log(error);
                }
            }
        },
        authorize_user: async function () {
            await this.$send_req('/sale_management/authorize_user', {
                contract_id: this.cur_contract.id,
                phone: this.plan.rbac_user.phone,
            })
            this.init_contract();
        },
    },
    mounted: function () {
        this.init_contract();
    },
}
</script>

<style scoped>
.scroll-container {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    width: 100%;
}

.scroll-item {
    display: inline-block;
    margin: 10px;
    text-align: center;
}
</style>

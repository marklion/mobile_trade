<template>
    <el-container>
        <el-header style="padding-top: 20px;">
            <div style="display:flex; justify-content:flex-start;gap: 10px;">
                <el-input style="width: 400px;" placeholder="输入物料名称搜索" clearable @clear="cancel_search"
                    v-model="search_info">
                    <template #append>
                        <el-button type="primary" size="small" @click="do_search">搜索</el-button>
                    </template>
                </el-input>
            </div>
        </el-header>
        <el-main>
            <page-content ref="bi_list" body_key="items" :search_input="search_info" :search_key="['bidding_turn.bidding_config.stuff.name']"
                :req_url="'/customer/bidding_search'" :enable="true">
                <template #default="slotProps">
                    <el-table :data="slotProps.content">

                        <el-table-column label="物料">
                            <template #default="scope">
                                <el-tag>{{ scope.row.bidding_turn.bidding_config.stuff.name }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="轮次">
                            <template #default="scope">
                                第{{ scope.row.bidding_turn.turn + 1 }}轮，共{{
                                    scope.row.bidding_turn.bidding_config.total_turn }}轮
                            </template>
                        </el-table-column>
                        <el-table-column label="出价情况">
                            <template #default="scope">
                                <el-tag>{{ scope.row.time ? (scope.row.time + '出价' + scope.row.price) : '未出价'
                                    }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="竞价状态">
                            <template #default="scope">
                                <div>
                                    <el-tag v-if="scope.row.bidding_turn.finish" type="danger">已结束</el-tag>
                                    <el-tag v-else type="primary">正在进行</el-tag>
                                    <el-tag v-if="scope.row.win" type="success">恭喜，中标了</el-tag>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="倒计时">
                            <template #default="scope">
                                <div v-if="!scope.row.bidding_turn.finish && scope.row.bidding_turn.bidding_config.status == 0">
                                    <div v-if="second_before_begin(scope.row)">
                                        开始倒计时
                                        <el-countdown :value="second_before_begin(scope.row)" @end="refresh_bi_list"></el-countdown>
                                    </div>
                                    <div v-if="second_before_end(scope.row)">
                                        结束倒计时
                                        <el-countdown :value="second_before_end(scope.row)" @end="refresh_bi_list"></el-countdown>
                                    </div>
                                </div>
                                <div v-else>
                                    已结束
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="备注" show-overflow-tooltip>
                            <template #default="scope">
                                {{ scope.row.bidding_turn.bidding_config.comment }}
                            </template>
                        </el-table-column>
                        <el-table-column label="是否接受">
                            <template #default="scope">
                                <el-tag :type="scope.row.accept ? 'success' : 'danger'">
                                    {{ scope.row.accept ? '已接受' : '未接受' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="300">
                            <template #default="scope">
                                <div v-if="scope.row.win">
                                    <div>
                                        <el-button v-if="!scope.row.bidding_turn.bidding_config.customer_confirm_time" type="primary" size="mini" @click="prepare_confirm(scope.row)">中标价确认</el-button>
                                        <div v-else style="display: flex; gap: 10px;">
                                            <el-button type="success" size="mini" @click="prepare_confirm(scope.row)">查看确认单</el-button>
                                            <el-button type="primary" size="mini" @click="nav_plan(scope.row)">生成计划</el-button>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!scope.row.bidding_turn.finish">
                                    <div v-if="could_accept(scope.row)">
                                        <el-button type="purple" size="mini" @click="accept_bid(scope.row)">接受</el-button>
                                    </div>
                                    <div v-if="could_price(scope.row)">
                                        <el-button type="success" size="mini" @click="prepare_price(scope.row)">出价</el-button>
                                    </div>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                </template>
            </page-content>
            <el-dialog :visible.sync="show_price" v-if="show_price" width="600px" @close="show_price = false">
                <el-form ref="priceForm" :model="price_req" :rules="priceRules" label-width="120px">
                    <el-form-item label="出价" prop="price">
                        <el-input v-model="price_req.price" placeholder="请输入价格"></el-input>
                    </el-form-item>
                </el-form>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="show_price = false">取消</el-button>
                    <el-button type="primary" @click="price('priceForm')">确定</el-button>
                </span>
            </el-dialog>
            <el-dialog :visible.sync="show_price_confirm" v-if="show_price_confirm" width="600px"
                @close="show_price_confirm = false">
                <el-descriptions title="中标价确认" :column="1">
                    <el-descriptions-item label="竞价名称">{{ price_confirm_item.bidding_turn.bidding_config.comment
                        }}</el-descriptions-item>
                    <el-descriptions-item label="物料">{{ price_confirm_item.bidding_turn.bidding_config.stuff.name
                        }}</el-descriptions-item>
                    <el-descriptions-item label="中标价">{{ price_confirm_item.price }}</el-descriptions-item>
                    <el-descriptions-item label="中标时间">{{ price_confirm_item.bidding_turn.end_time
                        }}</el-descriptions-item>
                    <el-descriptions-item v-if="price_confirm_item.bidding_turn.bidding_config.customer_confirm_time"
                        label="价格确认时间">{{ price_confirm_item.bidding_turn.bidding_config.customer_confirm_time
                        }}</el-descriptions-item>
                    <el-descriptions-item v-if="price_confirm_item.bidding_turn.bidding_config.customer_confirm_time"
                        label="价格确认人">{{ price_confirm_item.bidding_turn.bidding_config.confirm_opt_name
                        }}</el-descriptions-item>
                </el-descriptions>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="show_price_confirm = false">关闭</el-button>
                    <el-button v-if="!price_confirm_item.bidding_turn.bidding_config.customer_confirm_time"
                        type="primary" @click="confirm_price">价格确认</el-button>
                </span>
            </el-dialog>
        </el-main>
    </el-container>
</template>

<script>
import PageContent from '../../components/PageContent.vue';
import moment from 'moment';
export default {
    name: 'BiddingJoin',
    components: {
        "page-content": PageContent,
    },
    data: function () {
        function isCurrentTimeInRange(startTime, endTime) {
            console.log(startTime, endTime);
            let currentTime = moment();
            return currentTime.isBetween(moment(startTime), moment(endTime));
        }

        function isCurBefore(startTime) {
            let currentTime = moment();
            return currentTime.isBefore(moment(startTime));
        }

        return {
            search_info: '',
            price_confirm_item: null,
            show_price_confirm: false,
            show_price: false,
            focus_bi: {},
            bi_list: [],
            price_req: {
                price: '',
            },
            priceRules: {
                price: [
                    { required: true, message: '请输入出价', trigger: 'blur' },
                    { type: 'number', message: '请输入正确的价格格式', trigger: 'blur' }
                ]
            },
            could_price: function (sbi) {
                let ret = false;
                if (sbi.accept && !sbi.time && isCurrentTimeInRange(sbi.bidding_turn.begin_time, sbi.bidding_turn.end_time)) {
                    ret = true
                }
                return ret;
            },
            could_accept: function (sbi) {
                let ret = false;
                if (!sbi.accept && isCurBefore(sbi.bidding_turn.begin_time)) {
                    ret = true
                }
                return ret;
            },
            second_before_begin: function (sbi) {
                let ret = 0;
                if (isCurBefore(sbi.bidding_turn.begin_time)) {
                    ret = moment(sbi.bidding_turn.begin_time).diff(moment(), 'seconds');
                }
                return ret;
            },
            second_before_end: function (sbi) {
                let ret = 0;
                if (isCurrentTimeInRange(sbi.bidding_turn.begin_time, sbi.bidding_turn.end_time)) {
                    ret = moment(sbi.bidding_turn.end_time).diff(moment(), 'seconds');
                }
                return ret;
            },
        };
    },
    computed: {
        price_confirm_button: function () {
            let ret = [{
                text: '关闭',
                plain: true,
            }];
            if (this.price_confirm_item && !this.price_confirm_item.bidding_turn.bidding_config.customer_confirm_time) {
                ret.push({
                    text: '价格确认',
                });
            }
            return ret;
        },
        confirm_file: function () {
            let ret = {};
            if (this.price_confirm_item) {
                ret = {
                    label: '中标价确认',
                    value: '确认后不可撤销',
                    valueColor: 'red',
                    list: [{
                        label: '竞价名称',
                        value: this.price_confirm_item.bidding_turn.bidding_config.comment,
                    },
                    {
                        label: '物料',
                        value: this.price_confirm_item.bidding_turn.bidding_config.stuff.name,
                    },
                    {
                        label: '中标价',
                        value: this.price_confirm_item.price,
                    },
                    {
                        label: '中标时间',
                        value: this.price_confirm_item.bidding_turn.end_time,
                    },
                    ],
                };
                if (this.price_confirm_item.bidding_turn.bidding_config.customer_confirm_time) {
                    ret.list.push({
                        label: '价格确认时间',
                        value: this.price_confirm_item.bidding_turn.bidding_config.customer_confirm_time,
                    });
                    ret.list.push({
                        label: '价格确认人',
                        value: this.price_confirm_item.bidding_turn.bidding_config.confirm_opt_name,
                    });
                    ret.value = '已确认';
                }
            }
            return ret;
        }
    },
    methods: {
        do_search: function () {
            this.$refs.bi_list.do_search();
        },
        cancel_search: function () {
            this.search_info = '';
            this.$refs.bi_list.cancel_search();
        },
        nav_plan: function (sbi) {
            let stuff = sbi.bidding_turn.bidding_config.stuff;
            this.$router.push({
                path: '/subPage1/OrderCreate',
                query: {
                    stuff_id: stuff.id,
                    stuff_name: stuff.name,
                    company_name: stuff.company.name,
                    is_buy: false,
                    company_id: stuff.company.id,
                    bidding_id: sbi.bidding_turn.bidding_config.id,
                }
            });
        },
        confirm_price: async function () {
            await this.$send_req('/customer/bidding_confirm', {
                bidding_id: this.price_confirm_item.bidding_turn.bidding_config.id,
            });
            this.refresh_bi_list();
            this.show_price_confirm = false;
        },
        prepare_confirm: function (sbi) {
            this.price_confirm_item = sbi;
            this.show_price_confirm = true;
        },
        price: async function (formName) {
            this.$refs[formName].validate(async (valid) => {
                if (valid) {
                    this.price_req.item_id = this.focus_bi.id;
                    this.price_req.price = parseFloat(this.price_req.price);
                    await this.$send_req('/customer/bidding_price', this.price_req);
                    this.refresh_bi_list();
                    this.show_price = false;
                } else {
                    console.log('error submit!!');
                    return false;
                }
            });
        },
        prepare_price: function (sbi) {
            this.show_price = true;
            this.focus_bi = sbi;
        },
        accept_bid: async function (sbi) {
            await this.$send_req('/customer/bidding_accept', {
                item_id: sbi.id
            });
            this.refresh_bi_list();
        },
        refresh_bi_list: function () {
            this.$refs.bi_list.refresh();
        },
    }
}
</script>
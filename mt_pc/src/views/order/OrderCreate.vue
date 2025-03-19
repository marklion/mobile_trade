<template>
<div class="dashboard-container">
    <div class="dashboard-text">roles: <span v-for="role in roles" :key="role">{{ role }},</span></div>
    <div class="dashboard-text">query: <span v-for="p in query" :key="p">{{ p }},</span></div>

    <div class="dashboard-text"> {{ query.stuff_name }}</div>
    <el-form ref="form" :model="form" label-width="80px">
        <el-form-item label="买方">
            <el-input v-model="form.name"></el-input>
        </el-form-item>
        <el-form-item label="卖方">
            <el-select v-model="form.region" placeholder="请选择活动区域">
                <el-option label="区域一" value="shanghai"></el-option>
                <el-option label="区域二" value="beijing"></el-option>
            </el-select>
        </el-form-item>

        <u-cell title="买方" :value="buyer_name" :label="(bidding_id == 0)?'':'竞价成功发起'"></u-cell>
        <u-cell title="卖方" :is_link="saler_name == '(未指定)'" :value="saler_name?saler_name:'(未指定)'" @click="show_select_company= true"></u-cell>





        <el-form-item label="活动时间">
            <el-col :span="11">
                <el-date-picker type="date" placeholder="选择日期" v-model="form.date1" style="width: 100%;"></el-date-picker>
            </el-col>
            <el-col class="line" :span="2">-</el-col>
            <el-col :span="11">
                <el-time-picker placeholder="选择时间" v-model="form.date2" style="width: 100%;"></el-time-picker>
            </el-col>
        </el-form-item>
        <el-form-item label="即时配送">
            <el-switch v-model="form.delivery"></el-switch>
        </el-form-item>
        <el-form-item label="活动性质">
            <el-checkbox-group v-model="form.type">
                <el-checkbox label="美食/餐厅线上活动" name="type"></el-checkbox>
                <el-checkbox label="地推活动" name="type"></el-checkbox>
                <el-checkbox label="线下主题活动" name="type"></el-checkbox>
                <el-checkbox label="单纯品牌曝光" name="type"></el-checkbox>
            </el-checkbox-group>
        </el-form-item>
        <el-form-item label="特殊资源">
            <el-radio-group v-model="form.resource">
                <el-radio label="线上品牌商赞助"></el-radio>
                <el-radio label="线下场地免费"></el-radio>
            </el-radio-group>
        </el-form-item>
        <el-form-item label="活动形式">
            <el-input type="textarea" v-model="form.desc"></el-input>
        </el-form-item>
        <el-form-item>
            <el-button type="primary" @click="onSubmit">立即创建</el-button>
            <el-button>取消</el-button>
        </el-form-item>
    </el-form>
</div>
</template>

<script>
import {
    mapGetters
} from 'vuex'

export default {
    name: 'Dashboard',
    computed: {
        ...mapGetters([
            'name',
            'roles'
        ])
    },
    data() {
        return {
            query: {},
            form: {
                name: '',
                region: '',
                date1: '',
                date2: '',
                delivery: false,
                type: [],
                resource: '',
                desc: ''
            },






            bidding_id: 0,
            show_import: false,
            import_sheet: [{
                text: '选择文件',
                color: '#0000FF'
            }, {
                text: '下载模板',
            }],
            all_vt_list: [],
            show_add_vt: false,
            notice_show: false,
            notice: '',
            show_select_company: false,
            is_proxy: false,
            type_define: {
                vh_fetch_url: '/customer/fetch_vehicle',
                dr_fetch_url: '/customer/fetch_driver',
                order_create_url: '/customer/order_buy_create',
                pair_get_url: '/customer/get_vehicle_pair',
                is_sale: true,
            },
            data2show: [],
            show_pick_vehicles: false,
            new_vehicle: {
                main_vehicle_plate: '',
                behind_vehicle_plate: '',
                driver_name: '',
                driver_phone: '',
                comment: '',
            },
            rules: [{
                    name: "main_vehicle_plate",
                    rule: ["required", "isCarNo"],
                    msg: ["请输入主车牌", "请输入正确的主车牌"]
                },
                {
                    name: "behind_vehicle_plate",
                    rule: ["isCarNo"],
                    msg: ["请输入正确的挂车牌"]
                },
                {
                    name: "driver_name",
                    rule: ["required", "isChinese"],
                    msg: ["请输入司机姓名", "请输入正确的司机姓名"]
                }, {
                    name: "driver_phone",
                    rule: ["required", "isMobile"],
                    msg: ["请输入司机电话", "请输入正确的手机号"]
                },
            ],
            show_add_vehicle: false,
            address: [],
            show_plan_time: false,
            show_use_for: false,
            use_for_array: [
                '气化', '气站', '其他'
            ],
            plan: {
                comment: "",
                drop_address: "",
                plan_time: "",
                stuff_id: 0,
                use_for: "",
                trans_company_name: '',
                price: 0,
                is_repeat: false,
            },
            stuff_name: '',
            company_id: 0,
            saler_name: '',
            buyer_name: '',
            default_time: '',
            vehicles: [],
            copmany4select: [],
        }
    },
    methods: {
        onSubmit() {
            console.log('submit!');
        }
    },
    async mounted() {
        this.query = this.$route.query

        this.plan.stuff_id = parseInt(options.stuff_id);
        if (this.query.bidding_id) {
            this.bidding_id = parseInt(this.query.bidding_id);
        }
        this.stuff_name = this.query.stuff_name;
        this.saler_name = this.query.company_name;
        this.company_id = parseInt(this.query.company_id);
        this.buyer_name = uni.getStorageSync('self_info').company;
        let tmp_date = new Date();
        tmp_date.setDate(tmp_date.getDate() + 1);
        this.default_time = utils.dateFormatter(tmp_date, 'y-m-d', 4, false);
        if (this.query.is_buy == 'true') {
            this.type_define = {
                vh_fetch_url: '/supplier/fetch_vehicle',
                dr_fetch_url: '/supplier/fetch_driver',
                order_create_url: '/supplier/order_sale_create',
                pair_get_url: '/supplier/get_vehicle_pair',
                is_sale: false,
            }
            this.saler_name = this.buyer_name;
            this.buyer_name = this.query.company_name;
        }
        let resp = await this.$send_req('/global/get_notice', {
            company_id: this.company_id
        });
        this.notice = resp.notice;
        if (this.notice) {
            this.notice_show = true;
        }
    }

}
</script>

<style lang="scss" scoped>
.dashboard {
    &-container {
        margin: 30px;
    }

    &-text {
        font-size: 30px;
        line-height: 46px;
    }
}
</style>

<template>
<view>
    <view v-if="!loaded" style="padding: 40rpx;text-align:center;color:#999;">加载中...</view>
    <order-detail-panel
        v-else
        :plan="focus_plan"
        :role="role"
        :stat-context-company-id="stat_context_company_id"
        :hide-order-detail-price="hide_order_detail_price"
        :is-allowed-order-return="is_allowed_order_return"
        @refresh="reload_plan"
    ></order-detail-panel>
</view>
</template>

<script>
import OrderDetailPanel from '../components/OrderDetailPanel.vue';

export default {
    name: 'OrderDetail',
    components: {
        'order-detail-panel': OrderDetailPanel,
    },
    data: function () {
        return {
            loaded: false,
            plan_id: 0,
            role: '',
            stat_context_company_id: null,
            hide_order_detail_price: true,
            is_allowed_order_return: false,
            focus_plan: {
                id: 0,
                company: { name: '' },
                stuff: { name: '', company: { name: '' } },
                rbac_user: { name: '', phone: '' },
                main_vehicle: { plate: '' },
                behind_vehicle: { plate: '' },
                driver: { name: '', phone: '' },
                plan_histories: [],
            },
        };
    },
    methods: {
        detect_roles: function () {
            const roles = [];
            if (this.$has_module('customer')) roles.push('customer');
            if (this.$has_module('sale_management')) roles.push('sale_management');
            if (this.$has_module('supplier')) roles.push('supplier');
            if (this.$has_module('buy_management')) roles.push('buy_management');
            return roles;
        },
        reload_plan: async function () {
            this.loaded = false;
            await this.load_plan();
        },
        load_plan: async function () {
            const roles = this.role ? [this.role] : this.detect_roles();
            for (const role of roles) {
                try {
                    const body = { plan_id: this.plan_id };
                    if (role === 'sale_management' && this.stat_context_company_id != null) {
                        body.stat_context_company_id = this.stat_context_company_id;
                    }
                    const resp = await this.$send_req('/' + role + '/get_order_by_id', body);
                    if (resp && resp.plan) {
                        this.role = role;
                        this.focus_plan = resp.plan;
                        this.loaded = true;
                        return;
                    }
                } catch (e) {
                    console.warn('load_plan failed for role', role, e);
                }
            }
            uni.showToast({ title: '无法加载订单', icon: 'none' });
        },
        get_is_allowed_order_return: async function () {
            let ret = await this.$send_req('/global/get_is_allowed_order_return', {});
            this.is_allowed_order_return = ret.is_allowed_order_return;
        },
        get_hide_order_detail_price_config: async function () {
            try {
                const result = await this.$send_req('/global/get_hide_order_detail_price', {});
                this.hide_order_detail_price = result.hide_order_detail_price;
            } catch (error) {
                console.warn('get_hide_order_detail_price_config failed', error);
                this.hide_order_detail_price = true;
            }
        },
    },
    async onLoad(option) {
        if (option.id) {
            this.plan_id = Number.parseInt(option.id, 10);
        }
        if (option.role) {
            this.role = option.role;
        }
        if (option.stat_context_company_id) {
            this.stat_context_company_id = Number.parseInt(option.stat_context_company_id, 10);
        }
        this.get_is_allowed_order_return();
        this.get_hide_order_detail_price_config();
        await this.load_plan();
    },
    async onPullDownRefresh() {
        this.get_is_allowed_order_return();
        this.get_hide_order_detail_price_config();
        await this.reload_plan();
        uni.stopPullDownRefresh();
    },
}
</script>

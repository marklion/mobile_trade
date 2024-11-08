<template>
   <el-container>
    <el-main style="display: flex; flex-direction: column; align-items: start;gap: 20px;">
        <el-switch
            v-model="price_profile.default_impact_plan"
            active-text="默认调价影响计划"
            size="small"
            @change="update_price_profile">
        </el-switch>
        <el-switch
            v-model="price_profile.hide_impact_selector"
            active-text="隐藏调价影响计划开关"
            size="large"
            @change="update_price_profile">
        </el-switch>
        <el-switch
            v-model="qualification_check"
            active-text="检查对方资质"
            @change="set_company_qualification">
        </el-switch>
    </el-main>
   </el-container>
</template>

<script>
export default {
    name: 'GlobalStrategy',
    data() {
        return {
            price_profile: {
                default_impact_plan: false,
                hide_impact_selector: false,
            },
            qualification_check: false,
        }
    },
    mounted() {
        this.init_price_profile();
        this.get_company_qualification();
    },
    methods: {
        init_price_profile: async function () {
            let resp = await this.$send_req('/sale_management/get_price_change_profile', {});
            this.price_profile = resp;
        },
        get_company_qualification: async function () {
            let ret = await this.$send_req('/stuff/get_check_qualification', {});
            this.qualification_check = ret.enable;
        },
        update_price_profile: async function () {
            await this.$send_req('/sale_management/set_price_change_profile', this.price_profile);
            await this.init_price_profile();
        },
        set_company_qualification: async function () {
            await this.$send_req('/stuff/set_check_qualification', {
                enable: this.qualification_check
            });
            await this.get_company_qualification();
        },
    }
}
</script>
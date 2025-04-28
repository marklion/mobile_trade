<template>
<div class="wx_msg_config_show">
    <h1>微信消息模板配置</h1>
    <el-form ref="wx_config" label-width="180px" :model="wx_config" :rules="rules">
        <el-form-item v-for="(single_key, index) in wx_config_keys" :key="index" :label="msg_comment(single_key)" :prop="single_key">
            <el-input v-model="wx_config[single_key]"></el-input>
        </el-form-item>
        <el-form-item>
            <el-button type="primary" @click="save_config">保存</el-button>
        </el-form-item>
    </el-form>
    <h1>磅单下载配置</h1>
    <el-input v-model="prefix_url"></el-input>
    <el-button type="primary" @click="set_prefix_url">保存</el-button>
</div>
</template>

<script>
export default {
    name: 'WxMsgConfig',
    computed: {
        wx_config_keys: function () {
            return Object.keys(this.wx_config);
        },
        rules: function () {
            let ret = {};
            for (let key of this.wx_config_keys) {
                ret[key] = [{
                    required: true,
                    message: '请输入' + this.msg_comment(key),
                    trigger: 'blur'
                }, ];
            }
            return ret;
        },
    },
    data: function () {
        return {
            prefix_url: '',
            wx_config: {
                plan_status: '',
                call_vehicle: '',
                scale_msg: "",
                bidding_status: '',
                sc_status: '',
            },
        }
    },
    methods: {
        get_prefix_url: async function () {
            this.prefix_url = (await this.$send_req('/global/get_private_ticket_prefix', {})).private_ticket_prefix;
        },
        set_prefix_url: async function () {
            await this.$send_req('/global/set_private_ticket_prefix', {
                private_ticket_prefix: this.prefix_url
            });
            await this.get_prefix_url();
        },
        save_config: async function () {
            this.$refs.wx_config.validate(async (valid) => {
                if (valid) {
                    await this.$send_req('/global/set_wx_msg_config', this.wx_config);
                    await this.init_wx_config();
                }
            });
        },
        msg_comment: function (key) {
            let ret = '';
            switch (key) {
                case 'plan_status':
                    ret = '计划状态';
                    break;
                case 'call_vehicle':
                    ret = '叫车通知';
                    break;
                case 'scale_msg':
                    ret = '称重消息';
                    break;
                case 'bidding_status':
                    ret = '竞价状态';
                    break;
                case 'sc_status':
                    ret = '安检状态';
                    break;
                default:
                    break;
            }

            return ret;
        },
        init_wx_config: async function () {
            this.wx_config = await this.$send_req('/global/get_wx_msg_config');
        }
    },
    mounted: function () {
        this.init_wx_config();
        this.get_prefix_url();
    }
}
</script>

<style scoped>
.wx_msg_config_show {
    padding: 20px;
}
</style>

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
            wx_config: {
                plan_status: '',
                call_vehicle: '',
                scale_msg: "",
                biddng_status: '',
                sc_status: '',
            },
        }
    },
    methods: {
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
                case 'biddng_status':
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
    }
}
</script>

<style scoped>
.wx_msg_config_show {
    padding: 20px;
}
</style>

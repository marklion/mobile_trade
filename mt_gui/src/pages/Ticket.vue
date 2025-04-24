<template>
<view>
    <fui-section :title="title" size="50" class="centered-title"></fui-section>
    <fui-preview :previewData="ticket_content"></fui-preview>
    <view style="display:flex; justify-content: center;">
        <fui-qrcode width="240" height="240" :value="qr_path()"></fui-qrcode>
        <fui-avatar mode="widthFix" shape="square" background="white" :width="400" v-if="stamp_path" :src="$convert_attach_url(stamp_path)"></fui-avatar>
    </view>
    <fui-button text="下载磅单图片" @click="download_pic" type="primary"></fui-button>
    <fui-button text="转发给好友" type="success" open-type="share"></fui-button>
</view>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
export default {
    name: 'Ticket',
    data: function () {
        return {
            title: '',
            ticket_content: {},
            global_replace: {},
            qr_code: '',
            stamp_path: '',
            id: 0,
            main_vehicle_plate: '',
            qr_path: function () {
                let ret = process.env.REMOTE_MOBILE_HOST + '/pages/Ticket?id=' + this.id
                return ret;
            },
        }
    },
    methods: {
        download_pic: async function () {
            let resp = await this.$send_req('/global/download_ticket', {
                id: this.id
            })
            uni.downloadFile({
                url: this.$convert_attach_url(resp.url),
                success: (res) => {
                    if (res.statusCode === 200) {
                        uni.saveImageToPhotosAlbum({
                            filePath: res.tempFilePath,
                            success: () => {
                                uni.showToast({
                                    title: '保存成功',
                                    icon: 'success',
                                    duration: 2000
                                });
                            },
                            fail: () => {
                                uni.showToast({
                                    title: '保存失败',
                                    icon: 'none',
                                    duration: 2000
                                });
                            }
                        });
                    }
                }
            });
        }

    },
    onLoad: async function (options) {
        let plan_id = 0
        if (options.id) {
            plan_id = parseInt(options.id)
        } else if (options.scene) {
            plan_id = parseInt(decodeURIComponent(query.scene))
        }

        this.id = plan_id;
        let ticket = await this.$send_req('/global/get_ticket', {
            id: plan_id
        });
        if (ticket.plan_sct_infos == undefined) {
            ticket.plan_sct_infos = [];
        }
        if (ticket.delegate_name) {
            if (options.is_internal && options.is_internal == 'true') {
                ticket.company_name = ticket.delegate_name;
            } else {
                ticket.order_company_name = ticket.delegate_name;
            }
        }
        this.main_vehicle_plate = ticket.plate;
        let dec_title = '出厂';
        if (ticket.is_buy) {
            dec_title = '入厂';
        }
        this.qr_code = ticket.qr_code;
        this.stamp_path = ticket.stamp_path;
        this.title = ticket.order_company_name + dec_title + (ticket.replace_weighingSheet || '称重单');
        this.ticket_content = {
            label: ticket.replace_count || '装载量',
            value: utils.moneyFormatter(ticket.count),
            list: [{
                label: '物料',
                value: ticket.stuff_name,
            }, {
                label: '磅单号',
                value: ticket.ticket_no,
            }, {
                label: '下单公司',
                value: ticket.company_name
            }, {
                label: '主车号',
                value: ticket.plate,
            }, {
                label: '挂车号',
                value: ticket.behind_plate
            }, ],
        };
        if (ticket.fw_info && ticket.plan_sct_infos.length <= 0) {
            this.ticket_content.list.push({
                label: ticket.replace_fw_info || '一次计量',
                value: ticket.fw_info,
            });
        }
        if (ticket.sw_info && ticket.plan_sct_infos.length <= 0) {
            this.ticket_content.list.push({
                label: ticket.replace_sw_info || '二次计量',
                value: ticket.sw_info,
            });
        }
        if (ticket.m_time && ticket.p_time) {
            this.ticket_content.list.push({
                label: '毛重',
                value: ticket.m_weight,
            });
            this.ticket_content.list.push({
                label: '过毛时间',
                value: ticket.m_time,
            });
            this.ticket_content.list.push({
                label: '皮重',
                value: ticket.p_weight,
            });
            this.ticket_content.list.push({
                label: '过皮时间',
                value: ticket.p_time,
            });
        } else if ((ticket.m_time || ticket.p_time) && ticket.plan_sct_infos.length <= 0) {
            this.ticket_content.list.push({
                label: '计量时间',
                value: ticket.m_time || ticket.p_time,
            });
        }

        if (ticket.seal_no) {
            this.ticket_content.list.push({
                label: '封签号',
                value: ticket.seal_no,
            });
        }
        if (ticket.trans_company_name) {
            this.ticket_content.list.push({
                label: '运输公司',
                value: ticket.trans_company_name,
            })
        }
        ticket.plan_sct_infos.forEach(item => {
            this.ticket_content.list.push({
                label: item.sct_scale_item.name,
                value: item.value,
            });
        });
    },
    onShareAppMessage: function () {
        return {
            title: this.main_vehicle_plate + '的磅单',
            path: '/pages/Ticket?id=' + this.id,
        }
    },
}
</script>

<style scoped>
.centered-title {
    text-align: center;
    /* 让标题居中 */
}
</style>

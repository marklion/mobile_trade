<template>
<view>
    <fui-section :title="title" size="50" class="centered-title"></fui-section>
    <fui-preview :previewData="ticket_content"></fui-preview>
    <view style="display:flex; justify-content: center;">
        <fui-qrcode width="240" height="240" :value="'http://mt.d8sis.cn/#/pages/Ticket?id=' + id"></fui-qrcode>
        <fui-avatar mode="widthFix" shape="square" :width="400" v-if="stamp_path" :src="$convert_attach_url(stamp_path)"></fui-avatar>
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
            qr_code: '',
            stamp_path: '',
            id: 0,
            main_vehicle_plate: '',
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
                                this.$toast('保存成功');
                            },
                            fail: () => {
                                this.$toast('保存失败');
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
        this.main_vehicle_plate = ticket.plate;
        let dec_title = '出厂';
        if (ticket.is_buy) {
            dec_title = '入厂';
        }
        this.qr_code = ticket.qr_code;
        this.stamp_path = ticket.stamp_path;
        this.title = ticket.order_company_name + dec_title + '称重单';
        this.ticket_content = {
            label: '装载量',
            value: utils.moneyFormatter(ticket.count),
            list: [{
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
            }, {
                label: '皮重',
                value: ticket.p_weight,
            }, {
                label: '过皮时间',
                value: ticket.p_time,
            }, {
                label: '毛重',
                value: ticket.m_weight,
            }, {
                label: '过毛时间',
                value: ticket.m_time,
            }],
        };
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

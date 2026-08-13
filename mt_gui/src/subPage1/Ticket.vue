<template>
<view class="ticket-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-top">
            <view class="hero-copy">
                <text class="hero-label">磅单详情</text>
                <text class="hero-title">{{ title || '称重单' }}</text>
                <view class="hero-plates" v-if="main_vehicle_plate">
                    <text class="plate-tag">{{ main_vehicle_plate }}</text>
                    <text class="plate-tag" v-if="behind_plate">{{ behind_plate }}</text>
                </view>
            </view>
            <view class="hero-qr" v-if="ticket_ready">
                <fui-qrcode width="180" height="180" :value="qr_path()"></fui-qrcode>
                <text class="hero-qr-tip">扫码核验</text>
            </view>
        </view>
    </view>

    <view class="shell" v-if="ticket_ready">
        <view class="ticket-body">
            <view class="count-card">
                <text class="count-label">{{ ticket_content.label }}</text>
                <text class="count-value">{{ ticket_content.value }}</text>
            </view>

            <view class="info-card">
                <view class="info-row" v-for="(row, idx) in ticket_rows" :key="idx">
                    <text class="info-label">{{ row.label }}</text>
                    <text class="info-value plate" v-if="is_plate_row(row)">{{ row.value || '-' }}</text>
                    <text class="info-value" v-else>{{ row.value == null || row.value === '' ? '-' : row.value }}</text>
                </view>
            </view>

            <image v-if="stamp_path" class="stamp-watermark"
                :src="$convert_attach_url(stamp_path)" mode="aspectFit"></image>
        </view>
    </view>

    <view class="actions" v-if="ticket_ready">
        <view class="action-btn warn" v-if="need_protocol" @click="view_protocol">
            <text class="action-btn-text">协议签署</text>
        </view>
        <view class="action-btn primary" @click="download_pic">
            <text class="action-btn-text">下载磅单</text>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button class="action-btn success share-btn" open-type="share">
            <text class="action-btn-text">转发</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="action-btn success">
            <text class="action-btn-text">转发</text>
        </view>
        <!-- #endif -->
    </view>
</view>
</template>

<script>
import utils from '@/components/firstui/fui-utils';
export default {
    name: 'Ticket',
    data: function () {
        return {
            title: '',
            ticket_content: {
                label: '',
                value: '',
                list: [],
            },
            ticket_ready: false,
            stamp_path: '',
            id: 0,
            need_protocol: false,
            main_vehicle_plate: '',
            behind_plate: '',
        }
    },
    computed: {
        ticket_rows: function () {
            const list = (this.ticket_content && this.ticket_content.list) ? this.ticket_content.list : [];
            return list.filter(function (row) {
                return row && typeof row === 'object' && row.label;
            });
        },
    },
    methods: {
        qr_path: function () {
            return process.env.REMOTE_MOBILE_HOST + '/subPage1/Ticket?id=' + this.id;
        },
        is_plate_row: function (row) {
            if (!row || !row.label) {
                return false;
            }
            return row.label.indexOf('车号') !== -1;
        },
        view_protocol: function () {
            uni.navigateTo({
                url: '/subPage2/ProtocolView?plan_id=' + this.id,
            });
        },
        download_pic: async function () {
            uni.showLoading({ title: '生成中...' });
            try {
                let resp = await this.$send_req('/global/download_ticket', {
                    id: this.id
                });
                uni.downloadFile({
                    url: this.$convert_attach_url(resp.url),
                    success: (res) => {
                        uni.hideLoading();
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
                        } else {
                            uni.showToast({ title: '下载失败', icon: 'none' });
                        }
                    },
                    fail: () => {
                        uni.hideLoading();
                        uni.showToast({ title: '下载失败', icon: 'none' });
                    }
                });
            } catch (e) {
                uni.hideLoading();
                uni.showToast({
                    title: (e && e.err_msg) || e || '生成失败',
                    icon: 'none',
                    duration: 2000
                });
            }
        },

    },
    onLoad: async function (options) {
        let plan_id = 0
        if (options.id) {
            plan_id = parseInt(options.id)
        } else if (options.scene) {
            plan_id = parseInt(decodeURIComponent(options.scene))
        }

        this.id = plan_id;
        this.need_protocol = false;
        let ticket = await this.$send_req('/global/get_ticket', {
            id: plan_id
        });
        if (ticket.plan_sct_infos == undefined) {
            ticket.plan_sct_infos = [];
        }
        if (!ticket.extra_infos) {
            ticket.extra_infos = [];
        }
        this.need_protocol = !!ticket.need_protocol;
        this.stamp_path = ticket.stamp_path;
        if (ticket.delegate_name) {
            if (options.is_internal && options.is_internal == 'true') {
                ticket.company_name = ticket.delegate_name;
            } else {
                ticket.order_company_name = ticket.delegate_name;
                this.stamp_path = ticket.delegate_stamp_path;
            }
        }
        this.main_vehicle_plate = ticket.plate || '';
        this.behind_plate = ticket.behind_plate || '';
        let dec_title = '出厂';
        if (ticket.is_buy) {
            dec_title = '入厂';
        }
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
                label: ticket.order_company || '下单公司',
                value: ticket.company_name
            }, {
                label: '联系方式',
                value: ticket.company_contact
            }, {
                label: '主车号',
                value: ticket.plate,
            }, {
                label: '挂车号',
                value: ticket.behind_plate
            }, ],
        };
        if (!ticket.company_contact) {
            this.ticket_content.list = this.ticket_content.list.filter(item => item.label !== '联系方式');
        }
        if (ticket.second_unit && ticket.coefficient) {
            let su_value = ticket.coefficient * ticket.count;
            let su_decimal = ticket.second_unit_decimal;
            su_value = parseFloat(su_value).toFixed(su_decimal);
            this.ticket_content.value = su_value + ticket.second_unit;
            this.ticket_content.list.unshift({
                label: '原始计量',
                value: ticket.count,
            });
        }
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
                label: ticket.replace_m_time || '过毛时间',
                value: ticket.m_time,
            });
            this.ticket_content.list.push({
                label: '皮重',
                value: ticket.p_weight,
            });
            this.ticket_content.list.push({
                label: ticket.replace_p_time || '过皮时间',
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
                label: ticket.replace_seal_no || '封签号',
                value: ticket.seal_no,
            });
        }
        if (ticket.trans_company_name) {
            this.ticket_content.list.push({
                label: ticket.transportation_company || '运输公司',
                value: ticket.trans_company_name,
            })
        }
        if (ticket.drop_address) {
            this.ticket_content.list.push({
                label: '卸货地址',
                value: ticket.drop_address,
            });
        }
        ticket.plan_sct_infos.forEach(item => {
            this.ticket_content.list.push({
                label: item.sct_scale_item.name,
                value: item.value,
            });
        });
        ticket.extra_infos.forEach(item => {
            if (item.content) {
                this.ticket_content.list.push({
                    label: item.title,
                    value: item.content,
                });
            }

        });
        this.ticket_ready = true;
    },
    onShareAppMessage: function () {
        return {
            title: this.main_vehicle_plate + '的磅单',
            path: '/subPage1/Ticket?id=' + this.id,
        }
    },
}
</script>

<style scoped>
.ticket-page {
    min-height: 100vh;
    background: #F4F6FB;
    padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}
.hero {
    position: relative;
    padding: 28rpx 28rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}
.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 240rpx;
    height: 240rpx;
    opacity: 0.16;
    pointer-events: none;
}
.hero-logo-img {
    width: 100%;
    height: 100%;
}
.hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
}
.hero-copy {
    flex: 1;
    min-width: 0;
    padding-right: 8rpx;
}
.hero-qr {
    flex-shrink: 0;
    width: 212rpx;
    padding: 14rpx 14rpx 12rpx;
    border-radius: 16rpx;
    background: #FFFFFF;
    box-shadow: 0 8rpx 20rpx rgba(20, 30, 90, 0.18);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
}
.hero-qr-tip {
    font-size: 18rpx;
    color: #6B7280;
    font-weight: 600;
}
.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}
.hero-title {
    display: block;
    margin-top: 10rpx;
    font-size: 30rpx;
    color: #FFFFFF;
    font-weight: 700;
    line-height: 1.35;
    word-break: break-all;
}
.hero-plates {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-top: 16rpx;
}
.plate-tag {
    padding: 6rpx 14rpx;
    border-radius: 6rpx;
    background: #F5D000;
    color: #111111;
    font-size: 26rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
    border: 2rpx solid #111111;
    line-height: 1.2;
}
.shell {
    margin: -24rpx 20rpx 0;
}
.ticket-body {
    position: relative;
    margin-bottom: 16rpx;
}
.count-card {
    background: #FFFFFF;
    border-radius: 20rpx 20rpx 0 0;
    border: 1rpx solid #EEF1F8;
    border-bottom: none;
    box-shadow: 0 8rpx 24rpx rgba(40, 58, 120, 0.06);
    padding: 28rpx 24rpx;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.count-label {
    font-size: 24rpx;
    color: #9AA3B8;
    font-weight: 600;
}
.count-value {
    margin-top: 8rpx;
    font-size: 56rpx;
    color: #2F3FCF;
    font-weight: 800;
    line-height: 1.2;
}
.info-card {
    background: #FFFFFF;
    border-radius: 0 0 20rpx 20rpx;
    border: 1rpx solid #EEF1F8;
    border-top: 1rpx solid #F5F7FC;
    box-shadow: 0 8rpx 24rpx rgba(40, 58, 120, 0.06);
    padding: 8rpx 20rpx;
    margin-bottom: 0;
    overflow: hidden;
}
.info-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20rpx;
    padding: 18rpx 4rpx;
    border-bottom: 1rpx solid #F5F7FC;
}
.info-row:last-child {
    border-bottom: none;
}
.info-label {
    flex-shrink: 0;
    max-width: 40%;
    font-size: 24rpx;
    color: #9AA3B8;
}
.info-value {
    flex: 1;
    min-width: 0;
    text-align: right;
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
    word-break: break-all;
}
.info-value.plate {
    color: #111111;
    font-weight: 800;
    letter-spacing: 1rpx;
}
.stamp-watermark {
    position: absolute;
    left: 36%;
    top: 56%;
    width: 260rpx;
    height: 260rpx;
    margin-left: -130rpx;
    margin-top: -130rpx;
    opacity: 0.8;
    pointer-events: none;
    z-index: 2;
}
.actions {
    margin: 8rpx 20rpx 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 12rpx;
}
.action-btn {
    flex: 1;
    min-width: 0;
    height: 80rpx;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    padding: 0 8rpx;
    margin: 0;
    line-height: normal;
}
.action-btn::after {
    border: none;
}
.action-btn.primary {
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
    box-shadow: 0 8rpx 16rpx rgba(47, 63, 207, 0.22);
}
.action-btn.success {
    background: linear-gradient(145deg, #6FDB9A 0%, #2DBE6C 100%);
}
.action-btn.warn {
    background: linear-gradient(145deg, #FFB06B 0%, #FF8A2B 100%);
}
.action-btn.ghost {
    background: #EEF1FF;
}
.action-btn-text {
    font-size: 24rpx;
    color: #FFFFFF;
    font-weight: 700;
    text-align: center;
}
.action-btn-text.ghost {
    color: #2F3FCF;
}
.share-btn {
    flex: 1;
    width: auto;
}
</style>

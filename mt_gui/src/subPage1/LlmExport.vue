<template>
    <view class="llm-export-page">
        <view class="llm-page-head">
            <text class="llm-page-title">操作历史</text>
            <view class="llm-page-refresh" @click="refresh_llm_records">
                <fui-icon name="refresh" size="30" color="#465CFF"></fui-icon>
                <text>刷新</text>
            </view>
        </view>

        <list-show ref="llm_history_list" :fetch_function="get_llm_export_records" height="calc(100vh - 100rpx)"
            v-model="llm_export_records">
            <view class="llm-record-item" v-for="record in llm_export_records" :key="record.id">
                <view class="llm-record-top">
                    <text class="llm-record-time">{{ record.export_time }}</text>
                    <text class="llm-record-status" :class="'status-' + record.status">
                        {{ record.status === 0 ? '处理中' : (record.status === 1 ? '成功' : '失败') }}
                    </text>
                </view>
                <text class="llm-record-description">{{ record.export_description }}</text>
                <view class="llm-record-foot">
                    <text class="llm-record-spend" v-if="record.status !== 0">耗时 {{ record.spend || 0 }} 秒</text>
                    <text class="llm-record-error" v-if="record.status === 2">{{ record.export_result || '导出失败' }}</text>
                    <text class="llm-record-pending" v-else-if="record.status === 0">正在生成文件</text>
                    <view class="llm-record-action llm-record-action-first" @click="edit_llm_record(record)">
                        <fui-icon name="edit" size="28" color="#465CFF"></fui-icon>
                        <text>再次编辑</text>
                    </view>
                    <view class="llm-record-action" @click="dup_execute_llm_record(record)">
                        <fui-icon name="refresh" size="28" color="#465CFF"></fui-icon>
                        <text>再次执行</text>
                    </view>
                    <view v-if="record.status === 1 && record.export_result" class="llm-record-action"
                        @click="download_llm_record(record.export_result)">
                        <fui-icon name="download" size="28" color="#465CFF"></fui-icon>
                        <text>下载文件</text>
                    </view>
                    <view v-if="record.status === 1 && record.chart_result" class="llm-record-action"
                        @click="view_llm_chart(record)">
                        <fui-icon name="find" size="28" color="#465CFF"></fui-icon>
                        <text>查看图表</text>
                    </view>
                </view>
            </view>
        </list-show>

        <view class="llm-fab" @click="open_create_form">
            <fui-icon name="plus" size="48" color="#FFFFFF"></fui-icon>
        </view>

        <fui-bottom-popup :show="show_create_form" @close="show_create_form = false" z-index="1005">
            <view class="llm-popup">
                <view class="llm-popup-head">
                    <view>
                        <text class="llm-popup-title">智能导出</text>
                        <text class="llm-popup-subtitle">描述你需要导出的数据，AI会自动生成文件</text>
                    </view>
                    <fui-icon name="close" size="32" color="#8A94A6" @click="show_create_form = false"></fui-icon>
                </view>
                <fui-textarea flexStart isCounter maxlength="2000"
                    placeholder="导出内容描述：描述你需要导出的数据，例如：导出本月已完成的销售订单"
                    v-model="llm_export_content"></fui-textarea>
                <view class="llm-execute-actions">
                    <fui-button type="primary" :text="llm_export_loading ? '提交中...' : '执行导出'"
                        :disabled="!llm_export_content.trim() || llm_export_loading"
                        :background="llm_export_content.trim() && !llm_export_loading ? '#465CFF' : '#AEB8D8'"
                        color="#FFFFFF" radius="44rpx" height="88rpx" @click="execute_llm_export"></fui-button>
                </view>
            </view>
        </fui-bottom-popup>

        <fui-bottom-popup :show="chart_popup_show" @close="chart_popup_show = false" z-index="1006">
            <view class="chart-popup">
                <view class="llm-popup-head">
                    <view>
                        <text class="llm-popup-title">查看图表</text>
                        <text class="llm-popup-subtitle">智能导出图表结果</text>
                    </view>
                    <fui-icon name="close" size="32" color="#8A94A6" @click="chart_popup_show = false"></fui-icon>
                </view>
                <chart-view v-if="chart_popup_show && chart_popup_option" :chart-option="chart_popup_option"
                    height="460rpx"></chart-view>
                <view v-else-if="chart_popup_table" class="chart-popup-table">
                    <fui-table :gap="24" full fixed stripe :itemList="chart_popup_table.rows"
                        :header="chart_popup_table.columns"></fui-table>
                </view>
                <view v-else-if="chart_popup_error" class="chart-popup-error">
                    <text>{{ chart_popup_error }}</text>
                </view>
            </view>
        </fui-bottom-popup>
    </view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import ChartView from './ChartView.vue';
import { parseCsvText, buildChartPayload } from './chart_data.js';

export default {
    name: 'LlmExport',
    components: {
        'list-show': ListShow,
        'chart-view': ChartView,
    },
    data() {
        return {
            llm_export_content: '',
            llm_export_records: [],
            llm_export_loading: false,
            show_create_form: false,
            chart_popup_show: false,
            chart_popup_option: null,
            chart_popup_table: null,
            chart_popup_error: '',
        };
    },
    methods: {
        open_create_form: function () {
            this.show_create_form = true;
        },
        execute_llm_export: async function () {
            if (!this.llm_export_content.trim() || this.llm_export_loading) {
                return;
            }
            this.llm_export_loading = true;
            try {
                await this.$send_req('/global/llm_export', {
                    export_description: this.llm_export_content,
                });
                this.llm_export_content = '';
                this.show_create_form = false;
                uni.showToast({ title: '已提交，请刷新查看结果', icon: 'none' });
            } finally {
                this.llm_export_loading = false;
            }
        },
        get_llm_export_records: async function (pageNo) {
            const res = await this.$send_req('/global/list_le_records', {
                pageNo: pageNo,
            });
            return res.records || [];
        },
        refresh_llm_records: function () {
            if (this.$refs.llm_history_list) {
                this.$refs.llm_history_list.refresh();
            }
        },
        edit_llm_record: function (record) {
            this.llm_export_content = record.export_description || '';
            this.show_create_form = true;
        },
        dup_execute_llm_record: async function (record) {
            await this.$send_req('/global/llm_dup_execute', { export_id: record.id });
            uni.showToast({ title: '已提交，请刷新查看结果', icon: 'none' });
        },
        view_llm_chart: async function (record) {
            this.chart_popup_error = '';
            this.chart_popup_option = null;
            this.chart_popup_table = null;
            const raw = String(record.chart_result || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            let structure;
            try {
                structure = JSON.parse(raw);
            } catch (error) {
                this.chart_popup_error = '图表数据解析失败';
                this.chart_popup_show = true;
                return;
            }
            this.chart_popup_show = true;
            try {
                let rows = [];
                if (record.export_result) {
                    const csv_text = await this.fetch_csv_text(this.$convert_attach_url(record.export_result));
                    rows = parseCsvText(csv_text).rows;
                }
                const payload = buildChartPayload(structure, rows);
                if (!payload) {
                    this.chart_popup_error = '图表数据解析失败';
                } else if (payload.kind === 'table') {
                    this.chart_popup_table = payload;
                } else {
                    this.chart_popup_option = payload.option;
                }
            } catch (error) {
                this.chart_popup_error = '图表数据加载失败';
            }
        },
        fetch_csv_text: function (url) {
            return new Promise((resolve, reject) => {
                uni.request({
                    url: url,
                    method: 'GET',
                    responseType: 'text',
                    dataType: '',
                    success: (res) => {
                        if (res.statusCode === 200) {
                            resolve(typeof res.data === 'string' ? res.data : String(res.data));
                        } else {
                            reject(new Error('download failed'));
                        }
                    },
                    fail: reject,
                });
            });
        },
        download_llm_record: function (url) {
            if (!url) {
                return;
            }
            // 微信小程序不支持直接打开csv，需先转成xlsx
            // #ifdef MP-WEIXIN
            this.download_csv_as_xlsx(url);
            // #endif
            // #ifndef MP-WEIXIN
            uni.downloadFile({
                url: this.$convert_attach_url(url),
                success: function (res) {
                    uni.openDocument({
                        filePath: res.tempFilePath,
                        showMenu: true,
                    });
                },
            });
            // #endif
        },
        // #ifdef MP-WEIXIN
        // exceljs在小程序环境下writeBuffer可能返回非原生ArrayBuffer/Uint8Array的普通对象，需手动转换
        buffer2array_buffer: function (data) {
            if (data instanceof ArrayBuffer) {
                return data;
            }
            if (ArrayBuffer.isView(data)) {
                return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            }
            const len = typeof data.length === 'number' ? data.length : Object.keys(data).length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = data[i];
            }
            return bytes.buffer;
        },
        download_csv_as_xlsx: async function (url) {
            try {
                const csv_text = await this.fetch_csv_text(this.$convert_attach_url(url));
                const { headers, rows } = parseCsvText(csv_text);
                const Excel = require('exceljs');
                const workbook = new Excel.Workbook();
                const sheet = workbook.addWorksheet('Sheet1');
                sheet.addRow(headers);
                rows.forEach((row) => {
                    sheet.addRow(headers.map((h) => row[h]));
                });
                const buffer = await workbook.xlsx.writeBuffer();
                const filePath = wx.env.USER_DATA_PATH + '/llm_export_' + Date.now() + '.xlsx';
                wx.getFileSystemManager().writeFileSync(filePath, this.buffer2array_buffer(buffer));
                uni.openDocument({
                    filePath: filePath,
                    fileType: 'xlsx',
                    showMenu: true,
                });
            } catch (error) {
                uni.showToast({ title: '文件转换失败', icon: 'none' });
                console.log(error);
            }
        },
        // #endif
    },
    onPullDownRefresh: function () {
        this.refresh_llm_records();
        uni.stopPullDownRefresh();
    },
};
</script>

<style scoped>
.llm-export-page {
    position: relative;
    min-height: 100vh;
    box-sizing: border-box;
    background: #F2F4FA;
    padding: 24rpx;
}

.llm-page-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
}

.llm-page-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1A1F36;
}

.llm-page-refresh {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 10rpx 20rpx;
    border-radius: 28rpx;
    background: #EEF1FF;
    color: #465CFF;
    font-size: 24rpx;
}

.llm-page-refresh text {
    margin-left: 8rpx;
}

.llm-fab {
    position: fixed;
    right: 40rpx;
    bottom: calc(60rpx + env(safe-area-inset-bottom));
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: #465CFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12rpx 28rpx rgba(70, 92, 255, 0.4);
    z-index: 1004;
}

.llm-popup,
.chart-popup {
    box-sizing: border-box;
    padding: 32rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
}

.llm-popup-head {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
}

.llm-popup-title,
.llm-popup-subtitle {
    display: block;
}

.llm-popup-title {
    font-size: 34rpx;
    line-height: 1.3;
    font-weight: 700;
    color: #1A1F36;
}

.llm-popup-subtitle {
    margin-top: 8rpx;
    font-size: 22rpx;
    line-height: 1.4;
    color: #6B7280;
}

.llm-execute-actions {
    margin-top: 24rpx;
}

.chart-popup-error {
    margin-top: 24rpx;
    padding: 24rpx;
    text-align: center;
    font-size: 26rpx;
    color: #F56C6C;
}

.chart-popup-table {
    margin-top: 24rpx;
}

.llm-record-item {
    margin-bottom: 18rpx;
    padding: 22rpx;
    border-radius: 18rpx;
    border: 1rpx solid #E8ECF6;
    background: linear-gradient(135deg, #FFFFFF 0%, #F8F9FD 100%);
    box-shadow: 0 8rpx 24rpx rgba(40, 58, 120, 0.05);
}

.llm-record-top,
.llm-record-foot {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.llm-record-time,
.llm-record-spend,
.llm-record-pending {
    font-size: 21rpx;
    color: #8A94A6;
}

.llm-record-status {
    flex-shrink: 0;
    padding: 6rpx 16rpx;
    border-radius: 22rpx;
    font-size: 20rpx;
    font-weight: 600;
}

.llm-record-status.status-0 {
    color: #B7791F;
    background: #FFF4D6;
}

.llm-record-status.status-1 {
    color: #25855A;
    background: #E4F6ED;
}

.llm-record-status.status-2 {
    color: #C64B4B;
    background: #FDEBEC;
}

.llm-record-description {
    display: block;
    margin-top: 16rpx;
    font-size: 25rpx;
    line-height: 1.55;
    color: #2D3748;
    white-space: pre-wrap;
    word-break: break-all;
}

.llm-record-foot {
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-top: 16rpx;
    gap: 12rpx;
}

.llm-record-error {
    flex: 1;
    min-width: 0;
    font-size: 22rpx;
    line-height: 1.4;
    color: #C64B4B;
    word-break: break-all;
}

.llm-record-action {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 10rpx 16rpx;
    border-radius: 24rpx;
    background: #EEF1FF;
    color: #465CFF;
    font-size: 22rpx;
    font-weight: 600;
}

.llm-record-action text {
    margin-left: 8rpx;
}

.llm-record-action-first {
    margin-left: auto;
}
</style>

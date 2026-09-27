<template>
    <view class="chart-view-wrap">
        <!-- #ifdef H5 -->
        <div ref="chartDom" class="chart-dom" :style="{ height: height }"></div>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <canvas v-if="parsed" :canvas-id="canvasId" :id="canvasId" class="chart-canvas" :style="{ height: height }"
            disable-scroll="true"></canvas>
        <view v-if="!parsed" class="chart-empty-tip">
            <text>暂无可展示的图表数据</text>
        </view>
        <view v-if="parsed && legendItems.length" class="chart-legend">
            <view class="legend-item" v-for="(item, idx) in legendItems" :key="idx">
                <view class="legend-dot" :style="{ backgroundColor: item.color }"></view>
                <text class="legend-text">{{ item.name }}</text>
            </view>
        </view>
        <!-- #endif -->
    </view>
</template>

<script>
// #ifdef H5
import * as echarts from 'echarts';
// #endif

const PALETTE = ['#465CFF', '#22C55E', '#FF9F43', '#FF6B81', '#7C5CFC', '#00BCD4', '#FFC107', '#E91E63'];

export default {
    name: 'ChartView',
    props: {
        chartOption: {
            type: Object,
            default: () => ({}),
        },
        height: {
            type: String,
            default: '440px',
        },
    },
    data() {
        return {
            parsed: false,
            legendItems: [],
            canvasId: 'mt-chart-' + this._uid,
            // #ifdef H5
            chart: null,
            // #endif
        };
    },
    watch: {
        chartOption: {
            deep: true,
            handler() {
                this.render();
            },
        },
    },
    mounted() {
        this.render();
    },
    beforeDestroy() {
        // #ifdef H5
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
        // #endif
    },
    methods: {
        render() {
            // #ifdef H5
            this.render_h5();
            // #endif
            // #ifndef H5
            this.render_native();
            // #endif
        },
        // #ifdef H5
        render_h5() {
            if (!this.chartOption || !Object.keys(this.chartOption).length) {
                this.parsed = false;
                return;
            }
            this.parsed = true;
            this.$nextTick(() => {
                const dom = this.$refs.chartDom;
                if (!dom) {
                    return;
                }
                if (!this.chart) {
                    this.chart = echarts.init(dom);
                }
                this.chart.setOption(this.chartOption, true);
                this.chart.resize();
            });
        },
        // #endif
        // #ifndef H5
        render_native() {
            const option = this.chartOption;
            if (!option || !Array.isArray(option.series) || !option.series.length) {
                this.parsed = false;
                this.legendItems = [];
                return;
            }
            this.parsed = true;
            this.$nextTick(() => {
                setTimeout(() => this.draw_canvas(option), 60);
            });
        },
        draw_canvas(option) {
            const query = uni.createSelectorQuery().in(this);
            query.select('#' + this.canvasId).boundingClientRect((rect) => {
                if (!rect || !rect.width || !rect.height) {
                    return;
                }
                const ctx = uni.createCanvasContext(this.canvasId, this);
                const width = rect.width;
                const height = rect.height;
                ctx.clearRect(0, 0, width, height);
                const series = option.series || [];
                const chartType = (series[0] && series[0].type) || 'bar';
                const titleObj = Array.isArray(option.title) ? option.title[0] : option.title;
                const title = titleObj ? titleObj.text : '';
                let top = 10;
                if (title) {
                    ctx.setFontSize(14);
                    ctx.setFillStyle('#1D2129');
                    ctx.setTextAlign('center');
                    ctx.fillText(title, width / 2, top + 12);
                    top += 28;
                }
                if (chartType === 'pie') {
                    this.draw_pie(ctx, series[0], width, height, top);
                } else {
                    this.draw_cartesian(ctx, option, series, chartType, width, height, top);
                }
                ctx.draw();
                this.legendItems = this.build_legend(series, chartType);
            }).exec();
        },
        build_legend(series, chartType) {
            if (chartType === 'pie') {
                const data = (series[0] && series[0].data) || [];
                return data.map((item, idx) => ({
                    name: typeof item === 'object' ? item.name : String(item),
                    color: PALETTE[idx % PALETTE.length],
                }));
            }
            return series.map((s, idx) => ({
                name: s.name || ('系列' + (idx + 1)),
                color: PALETTE[idx % PALETTE.length],
            }));
        },
        item_value(item) {
            return typeof item === 'object' && item !== null ? Number(item.value) || 0 : Number(item) || 0;
        },
        draw_pie(ctx, s, width, height, top) {
            const data = (s && s.data) || [];
            const total = data.reduce((sum, item) => sum + this.item_value(item), 0);
            if (!total) {
                return;
            }
            const cx = width / 2;
            const availableHeight = height - top - 10;
            const radius = Math.max(20, Math.min(width, availableHeight) / 2 - 10);
            const cy = top + availableHeight / 2;
            let start = -Math.PI / 2;
            data.forEach((item, idx) => {
                const value = this.item_value(item);
                const angle = (value / total) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, start, start + angle);
                ctx.closePath();
                ctx.setFillStyle(PALETTE[idx % PALETTE.length]);
                ctx.fill();
                start += angle;
            });
        },
        draw_cartesian(ctx, option, series, chartType, width, height, top) {
            const xAxisObj = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
            const categories = (xAxisObj && xAxisObj.data) || [];
            const paddingLeft = 36;
            const paddingRight = 12;
            const paddingBottom = 30;
            const chartTop = top + 6;
            const chartBottom = height - paddingBottom;
            const chartLeft = paddingLeft;
            const chartRight = width - paddingRight;
            const chartWidth = chartRight - chartLeft;
            const chartHeight = chartBottom - chartTop;
            let maxVal = 0;
            series.forEach((s) => {
                (s.data || []).forEach((item) => {
                    const v = this.item_value(item);
                    if (v > maxVal) {
                        maxVal = v;
                    }
                });
            });
            if (maxVal <= 0) {
                maxVal = 1;
            }
            ctx.setStrokeStyle('#E5E7EB');
            ctx.setLineWidth(1);
            ctx.beginPath();
            ctx.moveTo(chartLeft, chartTop);
            ctx.lineTo(chartLeft, chartBottom);
            ctx.lineTo(chartRight, chartBottom);
            ctx.stroke();
            ctx.setFontSize(10);
            ctx.setFillStyle('#8A94A6');
            ctx.setTextAlign('right');
            ctx.fillText(String(Math.round(maxVal)), chartLeft - 4, chartTop + 8);
            ctx.fillText('0', chartLeft - 4, chartBottom);
            const count = categories.length || ((series[0] && series[0].data) ? series[0].data.length : 0);
            if (!count) {
                return;
            }
            const slot = chartWidth / count;
            ctx.setTextAlign('center');
            categories.forEach((cat, idx) => {
                const x = chartLeft + slot * idx + slot / 2;
                const text = String(cat);
                const label = text.length > 5 ? text.slice(0, 5) + '…' : text;
                ctx.fillText(label, x, chartBottom + 16);
            });
            if (chartType === 'line') {
                series.forEach((s, sIdx) => {
                    const data = s.data || [];
                    ctx.beginPath();
                    ctx.setStrokeStyle(PALETTE[sIdx % PALETTE.length]);
                    ctx.setLineWidth(2);
                    data.forEach((item, idx) => {
                        const v = this.item_value(item);
                        const x = chartLeft + slot * idx + slot / 2;
                        const y = chartBottom - (v / maxVal) * chartHeight;
                        if (idx === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    });
                    ctx.stroke();
                    data.forEach((item, idx) => {
                        const v = this.item_value(item);
                        const x = chartLeft + slot * idx + slot / 2;
                        const y = chartBottom - (v / maxVal) * chartHeight;
                        ctx.beginPath();
                        ctx.setFillStyle(PALETTE[sIdx % PALETTE.length]);
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    });
                });
            } else {
                const seriesCount = series.length || 1;
                const barGroupWidth = slot * 0.6;
                const barWidth = barGroupWidth / seriesCount;
                series.forEach((s, sIdx) => {
                    const data = s.data || [];
                    data.forEach((item, idx) => {
                        const v = this.item_value(item);
                        const groupLeft = chartLeft + slot * idx + (slot - barGroupWidth) / 2;
                        const x = groupLeft + barWidth * sIdx;
                        const barHeight = (v / maxVal) * chartHeight;
                        const y = chartBottom - barHeight;
                        ctx.setFillStyle(PALETTE[sIdx % PALETTE.length]);
                        ctx.fillRect(x, y, Math.max(barWidth - 2, 2), barHeight);
                    });
                });
            }
        },
        // #endif
    },
};
</script>

<style scoped>
.chart-view-wrap {
    width: 100%;
}

.chart-dom {
    width: 100%;
}

.chart-canvas {
    width: 100%;
}

.chart-empty-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200rpx;
    color: #8A94A6;
    font-size: 26rpx;
}

.chart-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 12rpx 0 4rpx;
}

.legend-item {
    display: flex;
    align-items: center;
    margin: 6rpx 16rpx;
}

.legend-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 8rpx;
}

.legend-text {
    font-size: 24rpx;
    color: #4E5969;
}
</style>

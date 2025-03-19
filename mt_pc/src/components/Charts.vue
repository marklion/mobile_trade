<template>
    <div>
      <!-- 图表容器 -->
      <div ref="chart" style="width: 100%; height: 400px;"></div>
    </div>
  </template>
  
  <script>
  import * as echarts from 'echarts';
  
  export default {
    name: 'ChartComponent',
    props: {
        // 定义一个名为 chartOption 的 prop 来接收外部传入的 option
        chartOption: {
            type: Object,
            default: () => ({})
        }
    },
    data() {
      return {
        chart: null, // ECharts实例
      };
    },
    mounted() {
      // 在组件挂载后初始化ECharts实例
      this.initChart();
    },
    watch: {
        chartOption: {
            deep: true,
            handler(newOption) {
              console.log("watch",newOption)
                if (this.chart) {
                    this.chart.setOption(newOption);
                }
            }
        }
    },
    methods: {
      initChart() {
        // 获取图表容器的DOM元素
        const chartDom = this.$refs.chart;
        // 初始化ECharts实例
        this.chart = echarts.init(chartDom);
        // 配置图表选项
        console.log("op", this.chartOption);
        // 使用配置项显示图表
        this.chart.setOption(this.chartOption);
      },
    },
    beforeDestroy() {
      // 在组件销毁前销毁ECharts实例，避免内存泄漏
      if (this.chart) {
        this.chart.dispose();
      }
    },
  };
  </script>
  
  <style scoped>
  /* 你可以在这里添加组件的样式 */
  </style>
  
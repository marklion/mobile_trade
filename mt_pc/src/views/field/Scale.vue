<template>
  <div class="weigh-page">
    <div class="left-panel card">
      <div class="panel-header">
        <span class="panel-title">待过磅订单</span>
        <span class="panel-subtitle">{{ filteredPlans.length }} 条</span>
      </div>
      <el-input v-model="searchKey" placeholder="输入2~3位数字快速检索" clearable>
        <i slot="prefix" class="el-input__icon el-icon-search" />
      </el-input>
      <div class="plan-list">
        <div v-for="item in filteredPlans" :key="item.id" class="plan-item"
          :class="{ active: selectedPlan && selectedPlan.id === item.id }" @click="selectPlan(item)">
          <div class="plan-main">{{ formatPlate(item) }}</div>
          <div class="plan-sub">{{ item.company ? item.company.name : '未设置公司' }}</div>
        </div>
        <div v-if="filteredPlans.length === 0" class="empty-tip">当前没有可过磅订单</div>
      </div>
    </div>

    <div class="right-panel">
      <div class="weight-box card">
        <div class="weight-label">当前磅重</div>
        <div class="weight-text">{{ weightText }}</div>
      </div>

      <el-button class="measure-btn" type="primary" :loading="isMeasuring" :disabled="!selectedPlan || isMeasuring"
        @click="doMeasure">
        {{ isMeasuring ? '计量中...' : '计量' }}
      </el-button>

      <div class="detail-box card">
        <div class="panel-header">
          <span class="panel-title">订单详情</span>
          <span class="panel-subtitle">{{ selectedPlan ? `#${selectedPlan.id}` : '未选择' }}</span>
        </div>
        <div class="detail-grid">
          <div v-for="row in detailRows" :key="row.label" class="detail-row">
            <span class="detail-label">{{ row.label }}</span>
            <span class="detail-value">{{ row.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Scale',
  data() {
    return {
      searchKey: '',
      plans: [],
      selectedPlan: null,
      selectedTicket: null,
      scaleValue: null,
      isMeasuring: false,
      weightTimer: null,
      planTimer: null,
    };
  },
  computed: {
    weightText() {
      if (this.scaleValue === null || Number.isNaN(this.scaleValue)) {
        return 'NA';
      }
      return `${Number(this.scaleValue).toFixed(2)} 吨`;
    },
    filteredPlans() {
      const source = this.plans.filter((item) => this.inWeighQueue(item));
      const rawKey = (this.searchKey || '').trim();
      const digitKey = rawKey.replace(/\D/g, '');
      if (!rawKey) {
        return source;
      }
      if (digitKey.length < 2) {
        return source;
      }
      return source.filter((item) => {
        const plateDigits = [
          item.main_vehicle?.plate || '',
          item.behind_vehicle?.plate || '',
          String(item.register_number || ''),
        ]
          .map((text) => String(text).replace(/\D/g, ''))
          .join('|');
        return plateDigits.includes(digitKey);
      });
    },
    detailRows() {
      if (!this.selectedPlan) {
        return [
          { label: '主车', value: 'xxxx' },
          { label: '挂车', value: 'xxxx' },
          { label: '皮重', value: 'NA' },
          { label: '毛重', value: 'NA' },
          { label: '公司', value: '-' },
          { label: '物料', value: '-' },
        ];
      }
      return [
        { label: '主车', value: this.selectedPlan.main_vehicle ? this.selectedPlan.main_vehicle.plate : 'xxxx' },
        { label: '挂车', value: this.selectedPlan.behind_vehicle ? this.selectedPlan.behind_vehicle.plate : 'xxxx' },
        { label: '皮重', value: this.showWeight(this.selectedTicket ? this.selectedTicket.p_weight : this.selectedPlan.p_weight) },
        { label: '毛重', value: this.showWeight(this.selectedTicket ? this.selectedTicket.m_weight : this.selectedPlan.m_weight) },
        { label: '公司', value: this.selectedPlan.company ? this.selectedPlan.company.name : '-' },
        { label: '物料', value: this.selectedPlan.stuff ? this.selectedPlan.stuff.name : '-' },
      ];
    },
  },
  methods: {
    formatPlate(item) {
      return item.main_vehicle?.plate || item.behind_vehicle?.plate || `订单${item.id}`;
    },
    showWeight(value) {
      const num = Number(value);
      if (num > 0) {
        return `${num.toFixed(2)}吨`;
      }
      return 'NA';
    },
    inWeighQueue(item) {
      if (!item || item.status === 3 || Number(item.count) > 0) {
        return false;
      }
      if (item.call_time) {
        return true;
      }
      return Boolean(item.stuff?.no_need_register) && [1, 2].includes(Number(item.status));
    },
    selectPlan(item) {
      this.selectedPlan = item;
      this.refreshSelectedTicket();
    },
    async refreshSelectedTicket() {
      if (!this.selectedPlan) {
        this.selectedTicket = null;
        return;
      }
      try {
        this.selectedTicket = await this.$send_req('/global/get_ticket', {
          id: this.selectedPlan.id,
        }, true);
      } catch (error) {
        this.selectedTicket = null;
      }
    },
    async loadPlans() {
      const resp = await this.$send_req('/scale/wait_que', {
        include_license: true,
        pageNo: 0,
      }, true);
      this.plans = resp.plans || [];
      if (!this.selectedPlan) {
        this.selectedPlan = this.filteredPlans[0] || null;
        this.refreshSelectedTicket();
        return;
      }
      const latest = this.plans.find((item) => item.id === this.selectedPlan.id);
      this.selectedPlan = latest || this.filteredPlans[0] || null;
      this.refreshSelectedTicket();
    },
    async pollScale() {
      try {
        const resp = await fetch('http://localhost:39109/scale');
        if (!resp.ok) {
          return;
        }
        const data = await resp.json();
        const value = Number(data.scale);
        this.scaleValue = Number.isNaN(value) ? null : value;
      } catch (error) {
        this.scaleValue = null;
      }
    },
    async doMeasure() {
      if (!this.selectedPlan) {
        this.$message.warning('请先选择订单');
        return;
      }
      const weight = Number(this.scaleValue);
      if (Number.isNaN(weight) || weight < 0) {
        this.$message.warning('当前重量无效');
        return;
      }
      this.isMeasuring = true;
      try {
        await this.$send_req('/scale/one_time_scale', {
          plan_id: this.selectedPlan.id,
          planId: this.selectedPlan.id,
          weight,
        });
        this.$message.success('计量成功');
        await this.refreshSelectedTicket();
        await this.loadPlans();
      } catch (error) {
        this.$message.error(error.message || '计量失败');
      } finally {
        this.isMeasuring = false;
      }
    },
    startPolling() {
      this.pollScale();
      this.loadPlans();
      this.weightTimer = setInterval(() => {
        this.pollScale();
      }, 1000);
      this.planTimer = setInterval(() => {
        this.loadPlans();
      }, 10000);
    },
  },
  mounted() {
    this.startPolling();
  },
  beforeDestroy() {
    if (this.weightTimer) {
      clearInterval(this.weightTimer);
    }
    if (this.planTimer) {
      clearInterval(this.planTimer);
    }
  },
};
</script>

<style scoped>
.weigh-page {
  min-width: 980px;
  display: flex;
  gap: 18px;
  padding: 14px;
  height: calc(100vh - 120px);
  box-sizing: border-box;
  background: #f3f6fb;
}

.card {
  border: 1px solid #e4e9f2;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(27, 42, 66, 0.06);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  color: #1f2d3d;
  font-size: 20px;
  font-weight: 600;
}

.panel-subtitle {
  color: #8b99aa;
  font-size: 13px;
}

.left-panel {
  width: 360px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-list {
  margin-top: 2px;
  padding-right: 4px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-tip {
  margin-top: 14px;
  text-align: center;
  color: #98a4b3;
  font-size: 13px;
}

.plan-item {
  border: 1px solid #e7edf4;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  background: #f8fafc;
  transition: all 0.2s ease;
  user-select: none;
}

.plan-item:hover {
  border-color: #94b8ff;
  transform: translateY(-1px);
}

.plan-item.active {
  background: #eaf2ff;
  border-color: #3a7afe;
  box-shadow: 0 4px 12px rgba(58, 122, 254, 0.18);
}

.plan-main {
  color: #2e3c4d;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.plan-sub {
  margin-top: 4px;
  color: #6f7d90;
  font-size: 13px;
}

.right-panel {
  flex: 1;
  min-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weight-box {
  min-height: 168px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.weight-label {
  font-size: 16px;
  color: #718096;
}

.weight-text {
  margin-top: 6px;
  color: #0f172a;
  font-size: 64px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 1px;
}

.measure-btn {
  width: 132px;
  align-self: flex-start;
  font-size: 20px;
  height: 46px;
  border-radius: 10px;
}

.detail-box {
  padding: 16px;
  flex: 1;
  min-height: 220px;
}

.detail-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 10px;
}

.detail-row {
  border: 1px solid #ebf0f6;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafcff;
}

.detail-label {
  color: #6f7d90;
  font-size: 14px;
}

.detail-value {
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 600;
}

.left-panel /deep/ .el-input__inner {
  border-radius: 10px;
  border-color: #d8e0ec;
  height: 40px;
  line-height: 40px;
}

.left-panel /deep/ .el-input__prefix {
  left: 8px;
}
</style>

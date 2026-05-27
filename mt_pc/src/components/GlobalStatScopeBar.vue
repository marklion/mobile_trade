<template>
  <div
    v-if="showSelector"
    :class="['global-scope-wrap', { 'is-home-selected': isHomeSelected, 'is-member-selected': isMemberSelected }]"
  >
    <i class="el-icon-office-building scope-icon" />
    <span class="scope-label">操作主体</span>
    <el-select
      :value="globalStatContextCompanyId"
      :title="currentScopeLabel"
      size="mini"
      filterable
      class="scope-select"
      :popper-append-to-body="false"
      @change="onChange"
    >
      <el-option
        v-for="scope in globalStatScopes"
        :key="scope.id"
        :label="renderScopeName(scope)"
        :value="scope.id"
      />
    </el-select>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

function normalizeScopeId(scopeId) {
  if (scopeId == null) {
    return null
  }
  return String(scopeId)
}

export default {
  name: 'GlobalStatScopeBar',
  computed: {
    ...mapGetters([
      'globalStatCompanyIsGroup',
      'globalStatSelfCompanyId',
      'globalStatScopes',
      'globalStatContextCompanyId',
    ]),
    showSelector() {
      return this.globalStatCompanyIsGroup && (this.globalStatScopes || []).length > 0
    },
    isHomeSelected() {
      return this.isSameScopeId(this.globalStatContextCompanyId, this.globalStatSelfCompanyId)
    },
    isMemberSelected() {
      return this.globalStatContextCompanyId != null && !this.isHomeSelected
    },
    currentScopeLabel() {
      const selected = (this.globalStatScopes || []).find((x) =>
        this.isSameScopeId(x && x.id, this.globalStatContextCompanyId)
      )
      return this.renderScopeName(selected)
    },
  },
  mounted() {
    this.$store.dispatch('statScope/initialize')
  },
  methods: {
    isSameScopeId(leftId, rightId) {
      const left = normalizeScopeId(leftId)
      const right = normalizeScopeId(rightId)
      return left != null && right != null && left === right
    },
    onChange(val) {
      this.$store.dispatch('statScope/setSelectedCompanyId', val)
    },
    renderScopeName(scope) {
      if (!scope) {
        return ''
      }
      if (this.isSameScopeId(scope.id, this.globalStatSelfCompanyId)) {
        return `${scope.name} (主)`
      }
      return scope.name
    },
  },
}
</script>

<style scoped>
.global-scope-wrap {
  display: flex;
  align-items: center;
  flex: 0 0 300px;
  width: 300px;
  height: 30px;
  margin-right: 12px;
  padding: 0 10px 0 8px;
  border-radius: 6px;
  background: #f5f7fa;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.global-scope-wrap:hover {
  background: #eef1f6;
}

.global-scope-wrap.is-home-selected {
  background: #f56c6c;
}

.global-scope-wrap.is-home-selected:hover {
  background: #f56c6c;
}

.global-scope-wrap.is-member-selected {
  background: #67c23a;
}

.global-scope-wrap.is-member-selected:hover {
  background: #67c23a;
}

.scope-icon {
  margin-right: 4px;
  font-size: 13px;
  color: #909399;
  flex: 0 0 auto;
}

.scope-label {
  margin-right: 6px;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  flex: 0 0 auto;
}

.scope-select {
  flex: 1 1 auto;
  min-width: 0;
}

.global-scope-wrap ::v-deep .el-select {
  width: 100%;
}

.global-scope-wrap ::v-deep .el-select .el-input {
  width: 100%;
}

.global-scope-wrap ::v-deep .el-input__inner {
  height: 26px;
  line-height: 26px;
  border: none;
  background: transparent;
  padding-left: 4px;
  padding-right: 24px;
  font-size: 12px;
  color: #303133;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap;
}

.global-scope-wrap ::v-deep .el-input__suffix {
  right: 2px;
}

.global-scope-wrap ::v-deep .el-select .el-input .el-select__caret {
  position: absolute;
  right: 0;
}

.global-scope-wrap ::v-deep .el-select .el-input.is-focus .el-input__inner {
  box-shadow: none;
}

.global-scope-wrap.is-home-selected .scope-icon,
.global-scope-wrap.is-home-selected .scope-label,
.global-scope-wrap.is-member-selected .scope-icon,
.global-scope-wrap.is-member-selected .scope-label {
  color: rgba(255, 255, 255, 0.9);
}

.global-scope-wrap.is-home-selected ::v-deep .el-input__inner,
.global-scope-wrap.is-member-selected ::v-deep .el-input__inner {
  color: #fff;
}

.global-scope-wrap.is-home-selected ::v-deep .el-input__suffix,
.global-scope-wrap.is-home-selected ::v-deep .el-select__caret,
.global-scope-wrap.is-member-selected ::v-deep .el-input__suffix,
.global-scope-wrap.is-member-selected ::v-deep .el-select__caret {
  color: rgba(255, 255, 255, 0.9);
}
</style>

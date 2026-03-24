<template>
  <div class="group-members">
    <el-alert v-if="selfLoaded && !company_is_group"
      title="当前登录公司在系统中还不是「集团」，所有 /group/* 接口会拒绝，因此无法拉取成员与候选公司列表（后台日志里会看到「当前公司不是集团」）。请先用具备 global 写权限的账号调用 company_convert_to_group 将本公司转为集团。"
      type="error" :closable="false" show-icon style="margin-bottom: 16px" />
    <el-alert v-else-if="selfLoaded && company_is_group && !is_group_admin" title="您不是该公司在「转集团」时指定的集团管理员，无法维护成员与候选列表。"
      type="warning" :closable="false" show-icon style="margin-bottom: 16px" />
    <p class="tip">
      为当前登录主体（集团母公司）维护成员公司。添加的公司不能已是其他集团的成员。将普通公司转为集团请调用接口
      <code>POST {{ apiBase }}/global/company_convert_to_group</code>，请求体：
      <code>company_id</code>、<code>admin_user_id</code>（须为该公司下已存在的用户）。需具备 global 模块<strong>写</strong>权限，无单独 Web 入口。
    </p>
    <div class="toolbar">
      <el-button type="primary" :disabled="!canManage" @click="openAdd">添加成员公司</el-button>
      <el-button :disabled="!canManage" @click="loadMembers">刷新</el-button>
    </div>
    <el-table v-loading="loading" :data="members" stripe style="width: 100%">
      <el-table-column prop="member_company_name" label="成员公司名称" min-width="200" />
      <el-table-column prop="member_company_id" label="公司ID" width="100" />
      <el-table-column label="操作" width="120" fixed="right">
        <template slot-scope="scope">
          <el-button type="danger" size="mini" :disabled="!canManage" @click="removeRow(scope.row)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="添加成员公司" :visible.sync="addVisible" width="520px">
      <p class="dialog-hint">
        仅列出可选的普通公司：排除本集团主体、已是集团的公司、已在本集团的成员。
      </p>
      <el-select v-model="pickCompanyId" filterable placeholder="选择要加入的公司（下拉列表滚到底自动加载下一页）" style="width: 100%;"
        popper-class="group-member-candidate-dropdown" @visible-change="onCandidateDropdownVisible">
        <el-option v-for="c in candidateCompanies" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <span slot="footer">
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!pickCompanyId" @click="confirmAdd">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'GroupMembers',
  data() {
    return {
      apiBase: process.env.VUE_APP_BASE_API || '/api/v1',
      selfLoaded: false,
      company_is_group: false,
      is_group_admin: false,
      loading: false,
      members: [],
      addVisible: false,
      candidateCompanies: [],
      candidatePage: 0,
      candidateTotal: 0,
      candidateLoading: false,
      pickCompanyId: null,
    }
  },
  computed: {
    canManage() {
      return this.company_is_group && this.is_group_admin
    },
  },
  mounted() {
    this.bootstrap()
  },
  beforeDestroy() {
    this.unbindCandidateScroll()
  },
  watch: {
    addVisible(val) {
      if (!val) {
        this.unbindCandidateScroll()
      }
    },
  },
  methods: {
    async bootstrap() {
      try {
        const info = await this.$send_req('/global/self_info', {}, true)
        this.company_is_group = !!info.company_is_group
        this.is_group_admin = !!info.is_group_admin
      } catch (e) {
        this.company_is_group = false
        this.is_group_admin = false
      } finally {
        this.selfLoaded = true
      }
      if (this.canManage) {
        await this.loadMembers()
      }
    },
    async loadMembers() {
      if (!this.canManage) {
        return
      }
      this.loading = true
      try {
        const ret = await this.$send_req('/group/group_member_list', {})
        this.members = ret.members || []
      } catch (e) {
        this.members = []
      } finally {
        this.loading = false
      }
    },
    async loadCompanyCandidates() {
      this.pickCompanyId = null
      this.candidateCompanies = []
      this.candidatePage = 0
      this.candidateTotal = 0
      await this.loadMoreCandidates()
      await this.$nextTick()
      await this.prefillCandidateUntilScrollable()
    },
    onCandidateDropdownVisible(visible) {
      if (!visible) {
        this.unbindCandidateScroll()
        return
      }
      this.$nextTick(() => {
        this.bindCandidateScroll()
        this.prefillCandidateUntilScrollable()
      })
    },
    getCandidateScrollWrap() {
      const dd = document.querySelector('.group-member-candidate-dropdown .el-scrollbar__wrap')
      return dd || null
    },
    bindCandidateScroll() {
      this.unbindCandidateScroll()
      const el = this.getCandidateScrollWrap()
      if (!el) {
        return
      }
      this._candidateScrollEl = el
      this._candidateScrollHandler = () => this.onCandidateScrollNearBottom()
      el.addEventListener('scroll', this._candidateScrollHandler, { passive: true })
    },
    unbindCandidateScroll() {
      if (this._candidateScrollEl && this._candidateScrollHandler) {
        this._candidateScrollEl.removeEventListener('scroll', this._candidateScrollHandler)
      }
      this._candidateScrollEl = null
      this._candidateScrollHandler = null
    },
    onCandidateScrollNearBottom() {
      const el = this._candidateScrollEl
      if (!el || this.candidateLoading) {
        return
      }
      if (this.candidateCompanies.length >= this.candidateTotal) {
        return
      }
      const { scrollTop, clientHeight, scrollHeight } = el
      if (scrollTop + clientHeight >= scrollHeight - 48) {
        this.loadMoreCandidates()
      }
    },
    /** 首屏条数少、不出现滚动条时无法触发滚动加载，自动多请求几页直到能滚或已无数据 */
    async prefillCandidateUntilScrollable() {
      if (!this.addVisible || !this.canManage) {
        return
      }
      let guard = 0
      while (guard++ < 20) {
        if (this.candidateCompanies.length >= this.candidateTotal) {
          break
        }
        await this.$nextTick()
        const el = this.getCandidateScrollWrap()
        if (!el) {
          break
        }
        if (el.scrollHeight > el.clientHeight + 2) {
          break
        }
        await this.loadMoreCandidates()
      }
    },
    async loadMoreCandidates() {
      if (!this.canManage) {
        return
      }
      if (this.candidateCompanies.length >= this.candidateTotal && this.candidateTotal > 0) {
        return
      }
      this.candidateLoading = true
      try {
        const r = await this.$send_req(
          '/group/group_member_candidate_list',
          { pageNo: this.candidatePage },
          true
        )
        const list = r.candidates || []
        this.candidateTotal = r.total != null ? r.total : 0
        this.candidateCompanies = this.candidateCompanies.concat(list)
        this.candidatePage += 1
        await this.$nextTick()
        if (this._candidateScrollEl) {
          this.onCandidateScrollNearBottom()
        }
      } catch (e) {
        this.candidateTotal = 0
      } finally {
        this.candidateLoading = false
      }
    },
    openAdd() {
      if (!this.canManage) {
        if (!this.company_is_group) {
          this.$message.warning(
            '当前公司不是集团，无法请求候选公司。请先用 global 写权限调用 company_convert_to_group。'
          )
        } else {
          this.$message.warning('仅指定的集团管理员可使用此功能。')
        }
        return
      }
      this.addVisible = true
      this.$nextTick(() => {
        this.loadCompanyCandidates()
      })
    },
    async confirmAdd() {
      if (!this.pickCompanyId) return
      try {
        await this.$send_req('/group/group_member_add', {
          member_company_id: this.pickCompanyId,
        })
        this.$message.success('已添加')
        this.addVisible = false
        this.loadMembers()
      } catch (e) {
        /* send_req 已提示 err_msg */
      }
    },
    removeRow(row) {
      this.$confirm(`确定将「${row.member_company_name}」移出本集团？相关数据授权将一并删除。`, '确认', {
        type: 'warning',
      })
        .then(async () => {
          await this.$send_req('/group/group_member_remove', {
            member_company_id: row.member_company_id,
          })
          this.$message.success('已移除')
          this.loadMembers()
        })
        .catch(() => { })
    },
  },
}
</script>

<style scoped>
.group-members {
  padding: 16px;
}

.tip {
  color: #606266;
  margin-bottom: 16px;
  line-height: 1.6;
  font-size: 13px;
}

.toolbar {
  margin-bottom: 12px;
}

.dialog-hint {
  margin-bottom: 12px;
  color: #909399;
  font-size: 13px;
}
</style>

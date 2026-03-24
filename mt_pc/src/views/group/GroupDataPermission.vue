<template>
  <div class="group-grants" style="padding: 16px;">
    <el-alert v-if="selfLoaded && !company_is_group" title="当前登录公司不是集团，无法使用数据权限接口。请先执行 company_convert_to_group。"
      type="error" :closable="false" show-icon style="margin-bottom: 16px" />
    <el-alert v-else-if="selfLoaded && company_is_group && !is_group_admin" title="您不是该公司指定的集团管理员，无法配置数据权限。"
      type="warning" :closable="false" show-icon style="margin-bottom: 16px" />
    <p class="tip" style="color: #606266; margin-bottom: 16px;">
      指定<strong>某一成员公司</strong>的数据，允许集团母公司下的<strong>哪位用户</strong>以何种方式访问：可查看、可操作（写类操作以服务端校验为准）。
    </p>
    <div style="margin-bottom: 12px;">
      <el-button type="primary" :disabled="!canManage" @click="openDialog()">新增授权</el-button>
      <el-button :disabled="!canManage" @click="loadAll">刷新</el-button>
    </div>
    <el-table v-loading="loading" :data="grants" stripe style="width: 100%">
      <el-table-column prop="member_company_name" label="成员公司" min-width="160" />
      <el-table-column prop="user_name" label="用户姓名" width="120" />
      <el-table-column prop="user_phone" label="手机号" width="130" />
      <el-table-column label="可查看" width="90">
        <template slot-scope="scope">
          <el-tag :type="scope.row.can_view ? 'success' : 'info'" size="mini">
            {{ scope.row.can_view ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="可操作" width="90">
        <template slot-scope="scope">
          <el-tag :type="scope.row.can_operate ? 'success' : 'info'" size="mini">
            {{ scope.row.can_operate ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="small" :disabled="!canManage" @click="openDialog(scope.row)">修改</el-button>
          <el-button type="text" size="small" style="color: #f56c6c" :disabled="!canManage"
            @click="removeRow(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :title="editingId ? '修改数据权限' : '新增数据权限'" :visible.sync="dialogVisible" width="520px" @closed="resetForm">
      <el-form label-width="120px">
        <el-form-item label="成员公司" required>
          <el-select v-model="form.member_company_id" placeholder="选择成员公司" filterable style="width: 100%"
            :disabled="!!editingId">
            <el-option v-for="m in memberOptions" :key="m.member_company_id" :label="m.member_company_name"
              :value="m.member_company_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="集团内用户" required>
          <el-select v-model="form.user_id" placeholder="选择用户（须为集团母公司账号）" filterable style="width: 100%"
            :disabled="!!editingId">
            <el-option v-for="u in homeUsers" :key="u.id" :label="`${u.name}（${u.phone}）`" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="可查看">
          <el-switch v-model="form.can_view" />
        </el-form-item>
        <el-form-item label="可操作">
          <el-switch v-model="form.can_operate" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveGrant">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'GroupDataPermission',
  data() {
    return {
      selfLoaded: false,
      company_is_group: false,
      is_group_admin: false,
      loading: false,
      grants: [],
      memberOptions: [],
      dialogVisible: false,
      editingId: null,
      form: {
        member_company_id: '',
        user_id: '',
        can_view: true,
        can_operate: false,
      },
      homeUsers: [],
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
        await this.loadAll()
      }
    },
    async loadMembers() {
      const ret = await this.$send_req('/group/group_member_list', {})
      this.memberOptions = ret.members || []
    },
    async loadHomeUsers() {
      const ret = await this.$send_req('/group/group_home_user_list', {})
      this.homeUsers = ret.users || []
    },
    async loadGrants() {
      const ret = await this.$send_req('/group/group_grant_list', {})
      this.grants = ret.grants || []
    },
    async loadAll() {
      if (!this.canManage) {
        return
      }
      this.loading = true
      try {
        await Promise.all([this.loadMembers(), this.loadGrants(), this.loadHomeUsers()])
      } catch (e) {
        this.memberOptions = []
        this.grants = []
        this.homeUsers = []
      } finally {
        this.loading = false
      }
    },
    resetForm() {
      this.editingId = null
      this.form = {
        member_company_id: '',
        user_id: '',
        can_view: true,
        can_operate: false,
      }
    },
    async openDialog(row) {
      if (!this.canManage) {
        this.$message.warning(
          !this.company_is_group
            ? '当前公司不是集团，无法配置。请先 company_convert_to_group。'
            : '仅集团管理员可配置。'
        )
        return
      }
      this.resetForm()
      await this.loadHomeUsers()
      if (row) {
        this.editingId = row.id
        this.form.member_company_id = row.member_company_id
        this.form.user_id = row.user_id
        this.form.can_view = !!row.can_view
        this.form.can_operate = !!row.can_operate
      }
      this.dialogVisible = true
    },
    async saveGrant() {
      if (!this.form.member_company_id || !this.form.user_id) {
        this.$message.warning('请选择成员公司与用户')
        return
      }
      try {
        await this.$send_req('/group/group_grant_upsert', {
          member_company_id: this.form.member_company_id,
          user_id: this.form.user_id,
          can_view: this.form.can_view,
          can_operate: this.form.can_operate,
        })
        this.$message.success('已保存')
        this.dialogVisible = false
        this.loadGrants()
      } catch (e) {
        /* 已全局提示 */
      }
    },
    removeRow(row) {
      this.$confirm(
        `删除「${row.member_company_name}」对 ${row.user_name}（${row.user_phone}）的授权？`,
        '确认',
        { type: 'warning' }
      )
        .then(async () => {
          await this.$send_req('/group/group_grant_delete', {
            member_company_id: row.member_company_id,
            user_id: row.user_id,
          })
          this.$message.success('已删除')
          this.loadGrants()
        })
        .catch(() => { })
    },
  },
}
</script>

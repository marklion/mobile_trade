<template>
<view class="page">
    <view v-if="selfLoaded && !company_is_group" class="warn-box err">
        <text>当前公司不是集团，无法配置数据权限。</text>
    </view>
    <view v-else-if="selfLoaded && company_is_group && !is_group_admin" class="warn-box warn">
        <text>您不是集团管理员，无法配置。</text>
    </view>
    <view class="tip">指定成员公司数据由母公司哪位用户可查看、可操作。</view>
    <view class="btns">
        <fui-button type="primary" :disabled="!canManage" text="新增授权" @click="openDialog(null)"></fui-button>
        <fui-button :disabled="!canManage" text="刷新" @click="loadAll"></fui-button>
    </view>
    <fui-list v-if="grants.length">
        <fui-list-cell v-for="g in grants" :key="g.id">
            <view class="grant-block">
                <view class="line"><text class="label">成员公司</text>{{ g.member_company_name }}</view>
                <view class="line"><text class="label">用户</text>{{ displayGrantUser(g) }}</view>
                <view class="line"><text class="label">查看</text>{{ g.can_view ? '是' : '否' }}　<text class="label">操作</text>{{ g.can_operate ? '是' : '否' }}</view>
                <view class="actions" v-if="canManage">
                    <fui-button type="primary" btnSize="mini" plain text="修改" @click="openDialog(g)"></fui-button>
                    <fui-button type="danger" btnSize="mini" plain text="删除" @click="removeRow(g)"></fui-button>
                </view>
            </view>
        </fui-list-cell>
    </fui-list>
    <view v-else class="empty">暂无授权记录</view>

    <fui-modal width="640" v-if="dialogVisible" :show="dialogVisible" title="数据权限" @click="onModalClick">
        <view class="dialog-body">
            <view class="dialog-card">
                <view class="pick-line" @click="showPickMember = true">
                    <text class="pick-label">成员公司</text>
                    <view class="pick-val-wrap">
                        <view class="pick-val" :class="{ 'is-placeholder': !form.member_company_id }">{{ memberLabel }}</view>
                    </view>
                    <text class="pick-arrow">›</text>
                </view>
                <view
                    class="pick-line"
                    :class="{ disabled: !!editingId }"
                    @click="editingId ? null : (showPickUser = true)"
                >
                    <text class="pick-label">集团内用户</text>
                    <view class="pick-val-wrap">
                        <view class="pick-val" :class="{ 'is-placeholder': !form.user_id }">{{ userLabel }}</view>
                    </view>
                    <text class="pick-arrow">›</text>
                </view>
            </view>
            <view class="dialog-card dialog-card--switches">
                <view class="switch-row">
                    <text class="switch-label">可查看该成员数据</text>
                    <switch :checked="form.can_view" @change="onViewChange" color="#465CFF" />
                </view>
                <view class="switch-row switch-row--last">
                    <text class="switch-label">可操作该成员数据</text>
                    <switch :checked="form.can_operate" @change="onOpChange" color="#465CFF" />
                </view>
            </view>
        </view>
    </fui-modal>

    <fui-bottom-popup :show="showPickMember" @close="showPickMember = false">
        <view class="popup-title">选择成员公司</view>
        <scroll-view scroll-y class="pick-scroll">
            <fui-list-cell
                v-for="m in memberOptions"
                :key="m.member_company_id"
                arrow
                @click="selectMember(m)"
            >
                {{ m.member_company_name }}
            </fui-list-cell>
        </scroll-view>
    </fui-bottom-popup>

    <fui-bottom-popup :show="showPickUser" @close="showPickUser = false">
        <view class="popup-title">选择用户</view>
        <scroll-view scroll-y class="pick-scroll">
            <fui-list-cell
                v-for="u in homeUsers"
                :key="u.id"
                arrow
                @click="selectUser(u)"
            >
                {{ formatUserDisplay(u) }}
            </fui-list-cell>
        </scroll-view>
    </fui-bottom-popup>
</view>
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
            homeUsers: [],
            dialogVisible: false,
            editingId: null,
            showPickMember: false,
            showPickUser: false,
            form: {
                member_company_id: '',
                user_id: '',
                can_view: true,
                can_operate: false,
            },
        }
    },
    computed: {
        canManage() {
            return this.company_is_group && this.is_group_admin
        },
        memberLabel() {
            const m = this.memberOptions.find((x) => x.member_company_id === this.form.member_company_id)
            return m ? m.member_company_name : '请选择'
        },
        userLabel() {
            const u = this.homeUsers.find((x) => x.id === this.form.user_id)
            return u ? this.formatUserDisplay(u) : '请选择'
        },
    },
    onLoad() {
        this.bootstrap()
    },
    onPullDownRefresh() {
        this.loadAll().finally(() => uni.stopPullDownRefresh())
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
                uni.showToast({ title: '无权限', icon: 'none' })
                return
            }
            this.resetForm()
            await this.loadHomeUsers()
            await this.loadMembers()
            if (row) {
                this.editingId = row.id
                this.form.member_company_id = row.member_company_id
                this.form.user_id = row.user_id
                this.form.can_view = !!row.can_view
                this.form.can_operate = !!row.can_operate
            }
            this.dialogVisible = true
        },
        onViewChange(e) {
            this.form.can_view = !!e.detail.value
        },
        onOpChange(e) {
            this.form.can_operate = !!e.detail.value
        },
        async onModalClick(e) {
            if (e.index === 1) {
                await this.saveGrant()
            } else {
                this.dialogVisible = false
                this.resetForm()
            }
        },
        selectMember(m) {
            this.form.member_company_id = m.member_company_id
            this.showPickMember = false
        },
        selectUser(u) {
            this.form.user_id = u.id
            this.showPickUser = false
        },
        /** name、phone 相同时（如都是邮箱）只展示一段，避免重复 */
        formatUserDisplay(u) {
            if (!u) {
                return ''
            }
            const name = String(u.name || '').trim()
            const phone = String(u.phone || '').trim()
            if (name && phone && name === phone) {
                return name
            }
            if (name && phone) {
                return name + ' · ' + phone
            }
            return name || phone || '—'
        },
        displayGrantUser(g) {
            return this.formatUserDisplay({ name: g.user_name, phone: g.user_phone })
        },
        async saveGrant() {
            if (!this.form.member_company_id || !this.form.user_id) {
                uni.showToast({ title: '请选择成员公司与用户', icon: 'none' })
                return
            }
            try {
                await this.$send_req('/group/group_grant_upsert', {
                    member_company_id: this.form.member_company_id,
                    user_id: this.form.user_id,
                    can_view: this.form.can_view,
                    can_operate: this.form.can_operate,
                })
                uni.showToast({ title: '已保存' })
                this.dialogVisible = false
                this.resetForm()
                await this.loadGrants()
            } catch (e) {}
        },
        removeRow(row) {
            uni.showModal({
                title: '删除授权',
                content: '删除「' + row.member_company_name + '」对 ' + row.user_name + ' 的授权？',
                success: async (res) => {
                    if (!res.confirm) {
                        return
                    }
                    try {
                        await this.$send_req('/group/group_grant_delete', {
                            member_company_id: row.member_company_id,
                            user_id: row.user_id,
                        })
                        uni.showToast({ title: '已删除' })
                        this.loadGrants()
                    } catch (e) {}
                },
            })
        },
    },
}
</script>

<style scoped>
.page {
    padding: 24rpx;
}
.warn-box {
    padding: 20rpx;
    border-radius: 12rpx;
    margin-bottom: 20rpx;
    font-size: 26rpx;
    line-height: 1.5;
}
.warn-box.err {
    background: #fef0f0;
    color: #f56c6c;
}
.warn-box.warn {
    background: #fdf6ec;
    color: #e6a23c;
}
.tip {
    color: #666;
    font-size: 26rpx;
    margin-bottom: 24rpx;
    line-height: 1.5;
}
.btns {
    display: flex;
    gap: 20rpx;
    margin-bottom: 24rpx;
    flex-wrap: wrap;
}
.grant-block {
    width: 100%;
}
.line {
    font-size: 28rpx;
    margin-bottom: 8rpx;
}
.label {
    color: #999;
    margin-right: 12rpx;
}
.actions {
    margin-top: 16rpx;
    display: flex;
    gap: 16rpx;
}
.empty {
    text-align: center;
    color: #999;
    padding: 40rpx;
}
/* 弹窗内容：与 fui-modal 默认内边距配合，避免贴边裁切 */
.dialog-body {
    padding: 8rpx 8rpx 12rpx;
    box-sizing: border-box;
}
.dialog-card {
    background: #f7f8fa;
    border-radius: 16rpx;
    padding: 0 28rpx;
    margin-bottom: 20rpx;
    border: 1rpx solid #ebeef5;
}
.dialog-card--switches {
    margin-bottom: 0;
    padding-bottom: 8rpx;
}
.pick-line {
    display: flex;
    align-items: center;
    min-height: 96rpx;
    padding: 22rpx 0;
    border-bottom: 1rpx solid #e4e7ed;
    font-size: 28rpx;
    box-sizing: border-box;
}
.pick-line:last-child {
    border-bottom: none;
}
.pick-line.disabled {
    opacity: 0.45;
    pointer-events: none;
}
.pick-label {
    flex-shrink: 0;
    width: 168rpx;
    color: #303133;
    font-weight: 500;
    line-height: 1.4;
}
.pick-val-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-left: 16rpx;
}
.pick-val {
    max-width: 100%;
    text-align: right;
    font-size: 28rpx;
    color: #465cff;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
}
.pick-val.is-placeholder {
    color: #909399;
    font-weight: normal;
}
.pick-arrow {
    flex-shrink: 0;
    margin-left: 12rpx;
    color: #c0c4cc;
    font-size: 40rpx;
    font-weight: 300;
    line-height: 1;
}
.switch-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 96rpx;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #e4e7ed;
    box-sizing: border-box;
}
.switch-row--last {
    border-bottom: none;
}
.switch-label {
    flex: 1;
    padding-right: 24rpx;
    font-size: 28rpx;
    color: #303133;
    font-weight: 500;
    line-height: 1.45;
}
.popup-title {
    padding: 24rpx;
    font-weight: 600;
}
.pick-scroll {
    max-height: 50vh;
}
</style>

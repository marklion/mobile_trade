<template>
    <view class="page">
        <view v-if="selfLoaded && !company_is_group" class="warn-box err">
            <text>当前登录公司不是集团，无法维护成员公司。</text>
        </view>
        <view v-else-if="selfLoaded && company_is_group && !is_group_admin" class="warn-box warn">
            <text>仅集团管理员可维护成员公司。</text>
        </view>
        <view class="btns">
            <fui-button type="primary" :disabled="!canManage" text="添加成员公司" @click="openAdd"></fui-button>
            <fui-button :disabled="!canManage" text="刷新" @click="loadMembers"></fui-button>
        </view>
        <fui-list v-if="members.length">
            <fui-list-cell v-for="m in members" :key="m.member_company_id">
                <view class="row">
                    <view class="grow">
                        <text class="name">{{ m.member_company_name }}</text>
                    </view>
                    <fui-button v-if="canManage" type="danger" btnSize="mini" text="移除"
                        @click="removeRow(m)"></fui-button>
                </view>
            </fui-list-cell>
        </fui-list>
        <view v-else class="empty">暂无成员公司</view>

        <fui-modal width="620" v-if="showAddModal" :show="showAddModal" title="添加成员公司" @click="onAddModalClick">
            <view class="add-form">
                <data-filter filter_name="公司" :get_func="getCandidateCompanies" search_key="name" tag_color="success"
                    v-model="candidate_filter" />
            </view>
        </fui-modal>
    </view>
</template>

<script>
import DataFilter from '../components/DataFilter.vue'
export default {
    name: 'GroupMembers',
    components: {
        'data-filter': DataFilter,
    },
    data() {
        return {
            selfLoaded: false,
            company_is_group: false,
            is_group_admin: false,
            loading: false,
            members: [],
            showAddModal: false,
            candidate_filter: { id: undefined, name: '' },
        }
    },
    computed: {
        canManage() {
            return this.company_is_group && this.is_group_admin
        },
    },
    onLoad() {
        this.bootstrap()
    },
    onPullDownRefresh() {
        this.loadMembers().finally(() => uni.stopPullDownRefresh())
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
        async getCandidateCompanies(pageNo) {
            const r = await this.$send_req('/group/group_member_candidate_list', { pageNo }, true)
            return r.candidates || []
        },
        closeAdd() {
            this.showAddModal = false
            this.candidate_filter = { id: undefined, name: '' }
        },
        onAddModalClick(e) {
            if (e.index === 1) {
                this.confirmAdd()
                return
            }
            this.closeAdd()
        },
        async confirmAdd() {
            if (!this.candidate_filter || this.candidate_filter.id == null) {
                uni.showToast({ title: '请选择公司', icon: 'none' })
                return
            }
            await this.pickCompany({
                id: this.candidate_filter.id,
                name: this.candidate_filter.name,
            })
        },
        openAdd() {
            if (!this.canManage) {
                uni.showToast({
                    title: !this.company_is_group ? '当前公司不是集团' : '仅集团管理员可操作',
                    icon: 'none',
                })
                return
            }
            this.candidate_filter = { id: undefined, name: '' }
            this.showAddModal = true
        },
        async pickCompany(c) {
            uni.showModal({
                title: '确认加入',
                content: '将「' + c.name + '」加入本集团？',
                success: async (res) => {
                    if (!res.confirm) {
                        return
                    }
                    try {
                        await this.$send_req('/group/group_member_add', {
                            member_company_id: c.id,
                        })
                        uni.showToast({ title: '已添加' })
                        this.closeAdd()
                        this.loadMembers()
                    } catch (e) {
                        /* toast by $send_req */
                    }
                },
            })
        },
        removeRow(row) {
            uni.showModal({
                title: '确认移除',
                content: '将「' + row.member_company_name + '」移出集团？相关授权将删除。',
                success: async (res) => {
                    if (!res.confirm) {
                        return
                    }
                    try {
                        await this.$send_req('/group/group_member_remove', {
                            member_company_id: row.member_company_id,
                        })
                        uni.showToast({ title: '已移除' })
                        this.loadMembers()
                    } catch (e) { }
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

.btns {
    display: flex;
    gap: 20rpx;
    margin-bottom: 24rpx;
    flex-wrap: wrap;
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.grow {
    flex: 1;
    min-width: 0;
}

.name {
    display: block;
    font-size: 30rpx;
}

.empty {
    text-align: center;
    color: #999;
    padding: 40rpx;
}

.popup-title {
    padding: 24rpx;
    font-weight: 600;
    font-size: 30rpx;
}

.add-form {
    min-height: 120rpx;
    padding: 8rpx 0 16rpx;
}
</style>

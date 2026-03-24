<template>
<view class="page">
    <view v-if="selfLoaded && !company_is_group" class="warn-box err">
        <text>当前登录公司还不是「集团」，无法使用成员管理。请先调用 company_convert_to_group 转集团。</text>
    </view>
    <view v-else-if="selfLoaded && company_is_group && !is_group_admin" class="warn-box warn">
        <text>您不是转集团时指定的集团管理员，无法维护成员。</text>
    </view>
    <view class="tip">为集团母公司维护成员公司；不能添加已是其他集团成员的公司。</view>
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
                <fui-button v-if="canManage" type="danger" btnSize="mini" text="移除" @click="removeRow(m)"></fui-button>
            </view>
        </fui-list-cell>
    </fui-list>
    <view v-else class="empty">暂无成员公司</view>

    <fui-bottom-popup :show="addVisible" @close="closeAdd">
        <view class="popup-title">选择公司（滑到底自动加载下一页）</view>
        <fui-input v-model="candidateFilter" placeholder="筛选名称" borderTop></fui-input>
        <scroll-view scroll-y class="candidate-scroll" @scrolltolower="onCandidateScrollToLower">
            <fui-list-cell
                v-for="c in filteredCandidates"
                :key="c.id"
                arrow
                @click="pickCompany(c)"
            >
                {{ c.name }}
            </fui-list-cell>
            <view v-if="candidateLoading" class="foot">加载中…</view>
            <view v-else-if="candidateTotal > 0 && candidateCompanies.length >= candidateTotal" class="foot">已全部加载</view>
        </scroll-view>
    </fui-bottom-popup>
</view>
</template>

<script>
export default {
    name: 'GroupMembers',
    data() {
        return {
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
            candidateFilter: '',
        }
    },
    computed: {
        canManage() {
            return this.company_is_group && this.is_group_admin
        },
        filteredCandidates() {
            const q = (this.candidateFilter || '').trim().toLowerCase()
            if (!q) {
                return this.candidateCompanies
            }
            return this.candidateCompanies.filter((c) => (c.name || '').toLowerCase().indexOf(q) !== -1)
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
        closeAdd() {
            this.addVisible = false
            this.candidateFilter = ''
            this.unbindCandidateState()
        },
        unbindCandidateState() {
            this.candidateCompanies = []
            this.candidatePage = 0
            this.candidateTotal = 0
        },
        async loadCompanyCandidates() {
            this.unbindCandidateState()
            await this.loadMoreCandidates()
            let guard = 0
            while (
                guard++ < 8 &&
                this.canManage &&
                this.addVisible &&
                this.candidateCompanies.length < this.candidateTotal &&
                this.candidateCompanies.length < 40
            ) {
                await this.loadMoreCandidates()
            }
        },
        onCandidateScrollToLower() {
            if (this.candidateLoading) {
                return
            }
            if (this.candidateCompanies.length >= this.candidateTotal) {
                return
            }
            this.loadMoreCandidates()
        },
        async loadMoreCandidates() {
            if (!this.canManage) {
                return
            }
            if (this.candidateTotal > 0 && this.candidateCompanies.length >= this.candidateTotal) {
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
            } catch (e) {
                this.candidateTotal = 0
            } finally {
                this.candidateLoading = false
            }
        },
        openAdd() {
            if (!this.canManage) {
                uni.showToast({
                    title: !this.company_is_group ? '当前公司不是集团' : '仅集团管理员可操作',
                    icon: 'none',
                })
                return
            }
            this.addVisible = true
            this.$nextTick(() => {
                this.loadCompanyCandidates()
            })
        },
        pickCompany(c) {
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
.candidate-scroll {
    max-height: 55vh;
    min-height: 200rpx;
}
.foot {
    text-align: center;
    color: #999;
    padding: 20rpx;
    font-size: 26rpx;
}
</style>

<template>
<view>
    <fui-modal width="600" :show="show_add_notice" @cancel="closeAddModal" @click="addNotice">
        <fui-textarea label="通知内容" flexStart textareaBorder placeholder="请输入通知内容" v-model="new_notice"></fui-textarea>
        <fui-list-cell :highlight="false" :padding="['28rpx','32rpx']">
            <view class="fui-cells">
                <text class="fui-text">是否发布</text>
                <fui-switch :checked="is_published" @change="changePublish">
                    <text class="fui-switch--text">{{is_published?'是':'否'}}</text>
                </fui-switch>
            </view>
        </fui-list-cell>
    </fui-modal>
    <fui-button type="primary" text="添加通知" @click="show_add_notice = true"></fui-button>
    <fui-list v-if="notices.length > 0">
        <fui-list-cell v-for="(notice, index) in notices" :key="index">
            <view>
                <text :style="{ fontWeight: 'bold', color: notice.is_published ? 'green' : 'gray' }">{{ notice.is_published ? '已发布' : '未发布' }}:</text>{{ notice.message }}
            </view>
            <view style="display: flex;justify-content: center;align-items: center;">
                <fui-button btnSize="mini" type="danger" text="删除" @click="deleteNotice(notice.id)"></fui-button>
            </view>

        </fui-list-cell>
    </fui-list>
    <fui-empty v-else title="暂无数据" descr="暂无数据"></fui-empty>
</view>
</template>

<script>
export default {
    name: 'SysNotice',
    data() {
        return {
            notices: [],
            show_add_notice: false,
            new_notice: '',
            loading: false,
            edit_notice: null,
            is_published: false,
        }
    },
    mounted() {
        this.getNotices();
    },
    methods: {
        onPullDownRefresh() {
            this.getNotices();
            uni.stopPullDownRefresh();
        },
        async getNotices() {
            try {
                const response = await this.$send_req('/global/get_all_sys_notices');
                this.notices = response.notices;
            } catch (error) {
                this.error = '获取通知列表失败: ' + error.message;
                console.error(this.error, error);
            }
        },
        async addNotice(e) {
            if (e.index == 1) {
                try {
                    const response = await this.$send_req('/global/set_sys_notice', {
                        message: this.new_notice.trim(),
                        creator_name: uni.getStorageSync('self_info').name,
                        is_published: this.is_published
                    });
                    if (response.result) {
                        this.new_notice = '';
                        this.show_add_notice = false;
                        this.getNotices();
                        uni.showToast({
                            title: '添加通知成功',
                            icon: 'success'
                        });
                    } else {
                        throw new Error('添加通知失败');
                    }
                } catch (error) {
                    console.error(error);
                }
            } else {
                this.closeAddModal()
            }
        },
        async deleteNotice(id) {
            try {
                const response = await this.$send_req('/global/delete_sys_notice', {
                    notice_id: id
                });
                if (response.result) {
                    this.notices = this.notices.filter(notice => notice.id !== id);
                    uni.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                } else {
                    throw new Error('删除失败');
                }
            } catch (error) {
                console.error(error);
            }
        },
        closeAddModal() {
            this.show_add_notice = false;
            this.new_notice = '';
            this.is_published = false;
        },
        changePublish(e) {
            this.is_published = e.detail.value;
        }
    }
}
</script>

<style>
.fui-cells {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.fui-switch--text {
    font-size: 20rpx;
    font-weight: bold;
    color: #333;
    text-align: center;
}
</style>

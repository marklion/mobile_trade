<template>
<view class="blacklist-page">
    <view class="bl-tabs">
        <fui-segmented-control :values="['车辆', '司机']" :current="currentType" color="#465CFF" @click="onTypeChange"></fui-segmented-control>
    </view>

    <view class="bl-list" v-if="currentType === 0">
        <list-show ref="blacklist" :fetch_function="getBlacklist" height="calc(100vh - 420px)" search_key="search_cond" :hide_search="true" v-model="blacklistData">
            <view class="bl-card" v-for="item in vehicle_items" :key="item.id">
                <view class="bl-card-main">
                    <view class="bl-avatar vehicle">
                        <text class="bl-avatar-text">车</text>
                    </view>
                    <view class="bl-copy">
                        <text class="bl-title">{{ item.vehicle.plate }}</text>
                        <text class="bl-sub">黑名单车辆</text>
                    </view>
                </view>
                <fui-checkbox borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8"
                    @change="onBlacklistSelect" :checked="item.checked" :value="item.id">
                </fui-checkbox>
            </view>
        </list-show>
    </view>
    <view class="bl-list" v-else>
        <list-show ref="blacklist" :fetch_function="getBlacklist" height="calc(100vh - 420px)" search_key="search_cond" :hide_search="true" v-model="blacklistData">
            <view class="bl-card" v-for="item in driver_items" :key="item.id">
                <view class="bl-card-main">
                    <view class="bl-avatar driver">
                        <text class="bl-avatar-text">司</text>
                    </view>
                    <view class="bl-copy">
                        <text class="bl-title">{{ item.driver.name || '未命名司机' }}</text>
                        <text class="bl-sub">{{ item.driver.phone }}</text>
                    </view>
                </view>
                <fui-checkbox borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8"
                    @change="onBlacklistSelect" :checked="item.checked" :value="item.id">
                </fui-checkbox>
            </view>
        </list-show>
    </view>

    <view class="bl-bottom">
        <view class="bl-add-card">
            <fui-form ref="form">
                <fui-input v-if="currentType === 0" required label="车牌号" borderTop placeholder="请输入车牌号" v-model="search_info.plate"></fui-input>
                <fui-input v-if="currentType === 1" required label="手机号" borderTop placeholder="请输入司机手机号码" v-model="search_info.phone"></fui-input>
            </fui-form>
            <view class="bl-actions">
                <view class="bl-btn primary" @click="addToBlacklist">
                    <text class="bl-btn-text">{{ currentType === 0 ? '添加车辆' : '添加司机' }}</text>
                </view>
                <view class="bl-btn danger" :class="{ disabled: selectedBlacklist.length === 0 }" @click="removeFromBlacklist">
                    <text class="bl-btn-text">移出选中（{{ selectedBlacklist.length }}）</text>
                </view>
            </view>
        </view>
    </view>
    <fui-toast ref="toast"></fui-toast>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'BlackList',
    components: {
        "list-show": ListShow
    },
    data() {
        return {
            currentType: 0,
            blacklistData: [],
            vehicleList: [],
            driverList: [],
            selectedIds: [],
            pageNo: 0,
            search_info: {
                plate: '',
                phone: ''
            }
        }
    },
    computed: {
        selectedBlacklist() {
            return this.blacklistData.filter(item => item.checked);
        },
        vehicle_items() {
            return (this.blacklistData || []).filter(item => item.vehicle);
        },
        driver_items() {
            return (this.blacklistData || []).filter(item => item.driver);
        }
    },
    methods: {
        onTypeChange(e) {
            this.currentType = e.index;
            this.$nextTick(() => {
                if (this.$refs.blacklist) {
                    this.$refs.blacklist.refresh();
                }
            });
        },
        refresh() {
            if (this.$refs.blacklist) {
                this.$refs.blacklist.refresh();
            }
            this.search_info = {
                plate: '',
                phone: ''
            }
        },
        async getBlacklist(_pageNo) {
            try {
                const res = await this.$send_req('/stuff/get_blacklist', {
                    pageNo: _pageNo
                });
                return res.blacklist.map(item => {
                    item.checked = false;
                    item.search_cond = (item.vehicle && item.vehicle.plate) ||
                        (item.driver && item.driver.phone);
                    return item;
                });

            } catch (error) {
                console.error('获取黑名单失败:', error);
            }
        },
        async addToBlacklist() {
            try {
                let rules;
                if (this.currentType === 0) {
                    rules = [{
                        name: "plate",
                        rule: ["required", "isCarNo"],
                        msg: ["请输入车牌号", "请输入正确的车牌号"]
                    }];
                } else {
                    rules = [{
                        name: "phone",
                        rule: ["required", "isMobile"],
                        msg: ["请输入司机手机号", "请输入正确的手机号"]
                    }];
                }
                this.$refs.form.validator(this.search_info, rules).then(async res => {
                    if (res.isPassed) {
                        let searchRes;
                        if (this.currentType === 0) {
                            searchRes = await this.$send_req('/stuff/search_vehicle_or_driver', {
                                type: 'vehicle',
                                value: this.search_info.plate
                            });
                        } else {
                            searchRes = await this.$send_req('/stuff/search_vehicle_or_driver', {
                                type: 'driver',
                                value: this.search_info.phone
                            });
                        }
                        if (searchRes) {
                            uni.showModal({
                                title: '提示',
                                content: `确定将${this.currentType === 0 ? '车辆:' + searchRes.item.plate : '司机:' + searchRes.item.name + searchRes.item.phone}添加到黑名单吗？`,
                                success: async (btn) => {
                                    if (btn.confirm) {
                                        await this.$send_req('/stuff/add_to_blacklist', {
                                            type: this.currentType === 0 ? 'vehicle' : 'driver',
                                            ids: searchRes.item.id + '',
                                            reason: `违规${this.currentType === 0 ? '车辆' : '司机'}`
                                        });
                                        this.$refs.toast.show({
                                            text: '添加成功'
                                        });
                                        this.refresh();
                                    }
                                }
                            });
                        } else {
                            this.$refs.toast.show({
                                text: '未找到相关信息',
                            });
                        }
                    }
                })

            } catch (error) {
                this.$refs.toast.show({
                    text: '添加失败',
                });
                this.show_popup = false;
            }
        },
        async removeFromBlacklist() {
            if (this.selectedBlacklist.length === 0) {
                return;
            }
            try {
                this.selectedIds = this.blacklistData.filter(item => item.checked).map(item => item.id);
                uni.showModal({
                    title: '提示',
                    content: `确定将选中的${this.currentType === 0 ? '车辆' : '司机'}从黑名单中移除吗？`,
                    success: async (res) => {
                        if (res.confirm) {
                            await this.$send_req('/stuff/remove_from_blacklist', {
                                ids: this.selectedIds.join(','),
                            });
                            this.$refs.toast.show({
                                text: '移除成功'
                            });
                            this.$refs.blacklist.refresh();
                        }
                    }
                });
            } catch (error) {
                console.error('移除失败:', error);
                this.$refs.toast.show({
                    text: '移除失败'
                });
            }
        },
        onBlacklistSelect(e) {
            const row = this.blacklistData.find(item => item.id === e.value);
            if (row) {
                row.checked = e.checked;
            }
        },
        onVehicleSelect(e) {
            const row = this.vehicleList.find(item => item.id === e.value);
            if (row) {
                row.checked = e.checked;
            }
        },
        onDriverSelect(e) {
            const row = this.driverList.find(item => item.id === e.value);
            if (row) {
                row.checked = e.checked;
            }
        }
    }
}
</script>

<style scoped>
.blacklist-page {
    padding: 12rpx 16rpx 0;
    box-sizing: border-box;
    padding-bottom: calc(280rpx + env(safe-area-inset-bottom));
}

.bl-tabs {
    margin-bottom: 12rpx;
    padding: 0 4rpx;
}

.bl-list {
    min-height: 200rpx;
}

.bl-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12rpx;
    padding: 20rpx 18rpx;
    background: #FFFFFF;
    border: 1rpx solid #E8ECF6;
    border-radius: 16rpx;
    box-shadow: 0 6rpx 16rpx rgba(40, 58, 120, 0.04);
}

.bl-card-main {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
    min-width: 0;
    margin-right: 16rpx;
}

.bl-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.bl-avatar.vehicle {
    background: rgba(70, 92, 255, 0.12);
}

.bl-avatar.driver {
    background: rgba(45, 190, 108, 0.12);
}

.bl-avatar-text {
    font-size: 24rpx;
    font-weight: 700;
    color: #465CFF;
}

.bl-avatar.driver .bl-avatar-text {
    color: #2DBE6C;
}

.bl-copy {
    flex: 1;
    min-width: 0;
}

.bl-title {
    display: block;
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bl-sub {
    display: block;
    margin-top: 4rpx;
    font-size: 22rpx;
    color: #9AA3B8;
}

.bl-bottom {
    position: fixed;
    left: 20rpx;
    right: 20rpx;
    bottom: calc(24rpx + env(safe-area-inset-bottom));
    z-index: 50;
}

.bl-add-card {
    background: #FFFFFF;
    border-radius: 20rpx;
    border: 1rpx solid #E8ECF6;
    box-shadow: 0 12rpx 32rpx rgba(40, 58, 120, 0.12);
    overflow: hidden;
    padding-bottom: 16rpx;
}

.bl-actions {
    display: flex;
    flex-direction: row;
    gap: 12rpx;
    padding: 8rpx 16rpx 0;
}

.bl-btn {
    flex: 1;
    height: 72rpx;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bl-btn.primary {
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 100%);
}

.bl-btn.danger {
    background: rgba(255, 77, 79, 0.12);
}

.bl-btn.disabled {
    opacity: 0.45;
}

.bl-btn-text {
    font-size: 24rpx;
    font-weight: 700;
}

.bl-btn.primary .bl-btn-text {
    color: #FFFFFF;
}

.bl-btn.danger .bl-btn-text {
    color: #FF4D4F;
}
</style>

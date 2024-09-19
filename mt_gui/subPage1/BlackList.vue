<template>
<view class="blacklist-container">
    <view class="add-blacklist-section">

        <fui-tabs :tabs="['车辆', '司机']" :current="currentType" center @change="onTypeChange"></fui-tabs>
        <view v-if="currentType === 0">
            <fui-checkbox-group>
                <fui-label v-for="item in vehicleList" :key="item.id">
                    <fui-list-cell>
                        <view class="fui-list__cell">
                            <text class="fui-text">{{item.plate}}</text>
                            <view style="display: flex;justify-content: center;align-items:center">
                                <text class="fui-text">加入黑名单</text>
                                <fui-checkbox color="#FFB703" borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" :checked="item.checked" :value="item.id">
                                </fui-checkbox>
                            </view>
                        </view>
                    </fui-list-cell>
                </fui-label>
            </fui-checkbox-group>
        </view>
        <view v-else>
            <fui-checkbox-group>
                <fui-label v-for="item in driverList" :key="item.id">
                    <fui-list-cell>
                        <view class="fui-list__cell">
                            <text class="fui-text">{{item.name}}</text>
                            <view style="display: flex;justify-content: center;align-items:center">
                                <text class="fui-text">加入黑名单</text>
                                <fui-checkbox color="#FFB703" borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" :checked="item.checked" :value="item.id">
                                </fui-checkbox>
                            </view>
                        </view>
                    </fui-list-cell>
                </fui-label>
            </fui-checkbox-group>
        </view>
    </view>

    <fui-toast ref="toast"></fui-toast>
</view>
</template>

<script>
export default {
    name: 'BlackList',
    data() {
        return {
            blacklistData: [],
            currentType: 0,
            selectedId: '',
            reason: '',
            vehicleList: [],
            driverList: [],
            selectedVehicleIds: [],
            selectedDriverIds: [],
        }
    },
    mounted() {
        //this.getBlacklist();
        this.getVehicleList();
    },
    onPullDownRefresh() {
        this.getBlacklist();
        this.getVehicleList();
        uni.stopPullDownRefresh();
    },
    methods: {
        onTypeChange(e) {
            this.currentType = e.index;
        },
        async getVehicleList() {
            try {
                const response = await this.$send_req('/global/get_vehicle_team');
                response.vehicle_teams.forEach(team => {
                    team.vehicle_sets.forEach(teamSet => {
                        this.vehicleList.push(teamSet.main_vehicle, teamSet.behind_vehicle);
                        this.driverList.push(teamSet.driver)
                    });
                });
            } catch (error) {
                console.error('获取车辆列表失败:', error);
            }
        },
        async addToBlacklist() {
            try {
                this.addBlacklistLoading = true;
                await this.$send_req('/stuff/add_to_blacklist', {
                    type: this.currentType === 0 ? 'vehicle' : 'driver',
                    id: this.selectedId,
                    reason: this.reason
                });
                this.$refs.toast.show({
                    title: '添加成功',
                    icon: 'success'
                });
                this.$refs.blacklistRef.refresh();
            } catch (error) {
                this.$refs.toast.show({
                    title: '添加失败',
                    icon: 'error'
                });
            }
        },
        async getBlacklist(pageNo = 0) {
            try {
                const response = await this.$send_req('/stuff/get_blacklist', {
                    pageNo
                });
                this.blacklistData = response.blacklist;
            } catch (error) {
                console.error('获取黑名单失败:', error);
                return {
                    blacklist: [],
                    total: 0
                };
            }
        },
        async removeFromBlacklist(item) {
            try {
                await this.$send_req('/stuff/remove_from_blacklist', {
                    blacklist_id: item.id
                });
                this.$refs.blacklistRef.refresh();
                this.$refs.toast.show({
                    title: '已从黑名单中移除',
                    icon: 'success'
                });
            } catch (error) {
                this.$refs.toast.show({
                    title: '移除失败，请重试',
                    icon: 'error'
                });
            }
        },
        onVehicleSelect(e) {
            this.selectedVehicleIds = e.detail.value;
        },
        onDriverSelect(e) {
            this.selectedDriverIds = e.detail.value;
        },
    }
}
</script>

<style scoped>
.fui-list__item {
    width: 100%;
    display: flex;
    align-items: center;
    background-color: #FFFFFF;
    box-sizing: border-box;
}

.fui-text {
    font-size: 26rpx;
}

.fui-list__cell {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.blacklist-container {
    padding: 20rpx;
}

.blacklist-item {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-bottom: 20rpx;
}

.action-buttons {
    display: flex;
    justify-content: flex-end;
}

.add-blacklist-section {
    margin-bottom: 20rpx;
}

.add-blacklist-section .u-field {
    margin-bottom: 20rpx;
}
</style>

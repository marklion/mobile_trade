<template>
<view class="blacklist-container">
    <view class="add-blacklist-section">

        <fui-tabs :tabs="['车辆', '司机']" :short="false"  height="60" size="24"  isSticky center :current="currentType"  @change="onTypeChange"></fui-tabs>
        <view v-if="currentType === 0">
            <fui-checkbox-group>
                <fui-label v-for="item in vehicleList" :key="item.id">
                    <fui-list-cell>
                        <view class="fui-list__cell">
                            <text class="fui-text">{{item.plate}}</text>
                            <view style="display: flex;justify-content: center;align-items:center">
                                <text class="fui-text" :style="{color: item.isBlacklisted ? 'green' : 'gray'}">{{item.isBlacklisted ? '已加入黑名单' : '未加入黑名单'}}</text>
                                <fui-checkbox borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" @change="onVehicleSelect" :checked="item.checked" :value="item.id">
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
                            <text class="fui-text">{{item.name}} {{item.phone }}</text>
                            <view style="display: flex;justify-content: center;align-items:center">
                                <text class="fui-text" :style="{color: item.isBlacklisted ? 'green' : 'gray'}">{{item.isBlacklisted ? '已加入黑名单' : '未加入黑名单'}}</text>
                                <fui-checkbox  borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" @change="onDriverSelect" :checked="item.checked" :value="item.id">
                                </fui-checkbox>
                            </view>
                        </view>
                    </fui-list-cell>
                </fui-label>
            </fui-checkbox-group>
        </view>
        <view class="submit-button-section">
            <fui-button type="primary" radius="0" size="26" @click="addToBlacklist">添加{{ currentType === 0 ? '车辆' : '司机' }}到黑名单</fui-button>
            <fui-button type="danger" radius="0" size="26" @click="removeFromBlacklist">移除{{ currentType === 0 ? '车辆' : '司机' }}黑名单</fui-button>
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
            currentType: 0,
            blacklistData: [],
            vehicleList: [],
            driverList: [],
            selectedIds: []
        }
    },
    mounted() {
        this.getVehicleList();
    },
    methods: {
        onTypeChange(e) {
            this.currentType = e.index;
        },
        async getVehicleList() {
            try {
                await this.getBlacklist();
                const response = await this.$send_req('/global/get_vehicle_team');
                this.vehicleList = response.vehicle_teams.flatMap(team =>
                    team.vehicle_sets.flatMap(set => [{
                            id: set.main_vehicle.id,
                            plate: set.main_vehicle.plate,
                            isBlacklisted: this.blacklistData.some(item => item.vehicleId === set.main_vehicle.id),
                            checked: this.blacklistData.some(item => item.vehicleId === set.main_vehicle.id)
                        },
                        ...(set.behind_vehicle ? [{
                            id: set.behind_vehicle.id,
                            plate: set.behind_vehicle.plate,
                            isBlacklisted: this.blacklistData.some(item => item.vehicleId === set.behind_vehicle.id),
                            checked: this.blacklistData.some(item => item.vehicleId === set.behind_vehicle.id)
                        }] : [])
                    ])
                );
                this.driverList = response.vehicle_teams.flatMap(team =>
                    team.vehicle_sets.map(set => ({
                        id: set.driver.id,
                        name: set.driver.name,
                        phone: set.driver.phone,
                        isBlacklisted: this.blacklistData.some(item => item.driverId === set.driver.id),
                        checked: this.blacklistData.some(item => item.driverId === set.driver.id)
                    }))
                );
            } catch (error) {
                console.error('获取车辆列表失败:', error);
            }
        },
        async getBlacklist() {
            try {
                const res = await this.$send_req('/stuff/get_blacklist');
                this.blacklistData = res.blacklist;

            } catch (error) {
                console.error('获取黑名单失败:', error);
            }
        },
        async addToBlacklist() {
            try {

                if (this.currentType === 0) {
                    this.selectedIds = this.vehicleList.filter(item => item.checked).map(item => item.id);
                } else {
                    this.selectedIds = this.driverList.filter(item => item.checked).map(item => item.id);
                }
                if (this.selectedIds.length === 0) {
                    this.$refs.toast.show({
                        text: `请选择${this.currentType === 0 ? '车辆' : '司机'}`,
                    });
                    return;
                }
                uni.showModal({
                    title: '提示',
                    content: `确定将选中的${this.currentType === 0 ? '车辆' : '司机'}添加到黑名单吗？`,
                    success: async (res) => {
                        if (res.confirm) {
                            await this.$send_req('/stuff/add_to_blacklist', {
                                type: this.currentType === 0 ? 'vehicle' : 'driver',
                                ids: this.selectedIds.join(','),
                                reason: `违规${this.currentType === 0 ? '车辆' : '司机'}`
                            });
                            await this.getVehicleList();
                            this.$refs.toast.show({
                                text: '添加成功'
                            });

                        }
                    }
                });

            } catch (error) {
                this.$refs.toast.show({
                    text: '添加失败',
                });
            }
        },
        async removeFromBlacklist() {
            try {
                if (this.currentType === 0) {
                    this.selectedIds = this.vehicleList.filter(item => item.checked).map(item => item.id);
                } else {
                    this.selectedIds = this.driverList.filter(item => item.checked).map(item => item.id);
                }
                if (this.selectedIds.length === 0) {
                    this.$refs.toast.show({
                        text: `请选择${this.currentType === 0 ? '车辆' : '司机'}`,
                    });
                    return;
                }

                uni.showModal({
                    title: '提示',
                    content: `确定将选中的${this.currentType === 0 ? '车辆' : '司机'}从黑名单中移除吗？`,
                    success: async (res) => {
                        if (res.confirm) {
                            await this.$send_req('/stuff/remove_from_blacklist', {
                                ids: this.selectedIds.join(','),
                                type: this.currentType === 0 ? 'vehicle' : 'driver'
                            });
                            await this.getVehicleList();
                            this.$refs.toast.show({
                                text: '移除成功'
                            });
                        }
                    }
                });
            } catch (error) {
                this.$refs.toast.show({
                    text: '移除失败',
                    icon: 'error'
                });
            }
        },
        onVehicleSelect(e) {
            this.vehicleList.find(item => item.id === e.value).checked = e.checked;

        },
        onDriverSelect(e) {
            this.driverList.find(item => item.id === e.value).checked = e.checked;
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
    margin-right: 20rpx;
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

.submit-button-section {
    display: flex;
    justify-content: space-between;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10rpx;
}
</style>

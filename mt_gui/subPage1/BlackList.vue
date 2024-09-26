<template>
<view class="blacklist-container">
    <view class="add-blacklist-section">
        <fui-tabs :tabs="['车辆', '司机']" :short="false" height="60" size="24" isSticky center :current="currentType" @change="onTypeChange"></fui-tabs>
        <view v-if="currentType === 0">
            <list-show ref="blacklist" :fetch_function="getBlacklist" height="80vh" search_key="search_cond" v-model="blacklistData">
                <fui-checkbox-group>
                    <fui-label v-if="item.vehicle" v-for="item in blacklistData" :key="item.id">
                        <fui-list-cell>
                            <view class="fui-list__cell">
                                <text class="fui-text">{{ item.vehicle.plate }}</text>
                                <view style="display: flex;justify-content: center;align-items:center">
                                    <fui-checkbox borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" @change="onBlacklistSelect" :checked="item.checked" :value="item.id">
                                    </fui-checkbox>
                                </view>
                            </view>
                        </fui-list-cell>
                    </fui-label>
                </fui-checkbox-group>
            </list-show>
        </view>
        <view v-else>
            <list-show ref="blacklist" :fetch_function="getBlacklist" height="80vh" search_key="search_cond" v-model="blacklistData">
                <fui-checkbox-group>
                    <fui-label v-if="item.driver" v-for="item in blacklistData" :key="item.id">
                        <fui-list-cell>
                            <view class="fui-list__cell">
                                <text class="fui-text">{{ item.driver.name }} {{ item.driver.phone }}</text>
                                <view style="display: flex;justify-content: center;align-items:center">
                                    <fui-checkbox borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" @change="onBlacklistSelect" :checked="item.checked" :value="item.id">
                                    </fui-checkbox>
                                </view>
                            </view>
                        </fui-list-cell>
                    </fui-label>
                </fui-checkbox-group>
            </list-show>
        </view>
        <view class="submit-button-section">
            <fui-button type="primary" radius="0" size="26" @click="show_popup=true">添加{{ currentType === 0 ? '车辆' :'司机' }}到黑名单</fui-button>
            <fui-button type="danger"  radius="0" size="26" @click="removeFromBlacklist">从黑名单移出{{ currentType === 0 ?'车辆' : '司机' }}</fui-button>
        </view>
    </view>

    <fui-bottom-popup :show="show_popup" @close="show_popup=false">
        <view v-if="currentType === 0">
            <fui-checkbox-group>
                <fui-label v-for="item in vehicleList" :key="item.id">
                    <fui-list-cell>
                        <view class="fui-list__cell">
                            <text class="fui-text">{{item.plate}}</text>
                            <view style="display: flex;justify-content: center;align-items:center">
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
                                <fui-checkbox borderColor="#B2B2B2" borderRadius="8rpx" :scaleRatio="0.8" @change="onDriverSelect" :checked="item.checked" :value="item.id">
                                </fui-checkbox>
                            </view>
                        </view>
                    </fui-list-cell>
                </fui-label>
            </fui-checkbox-group>
        </view>
        <view>
            <fui-button type="primary" radius="0" size="26" @click="addToBlacklist">添加</fui-button>
        </view>
    </fui-bottom-popup>

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
            show_popup: false,
        }
    },
    mounted() {
        this.getVehicleList();
    },
    methods: {
        onTypeChange(e) {
            this.currentType = e.index;
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
                            this.$refs.toast.show({
                                text: '添加成功'
                            });
                            this.$refs.blacklist.refresh();
                            this.show_popup = false;
                        }
                    }
                });

            } catch (error) {
                this.$refs.toast.show({
                    text: '添加失败',
                });
                this.show_popup = false;
            }
        },
        async removeFromBlacklist() {
            try {
                this.selectedIds = this.blacklistData.filter(item => item.checked).map(item => item.id);
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
            this.blacklistData.find(item => item.id === e.value).checked = e.checked;
        },
        onVehicleSelect(e) {
            this.vehicleList.find(item => item.id === e.value).checked = e.checked;
        },
        onDriverSelect(e) {
            this.driverList.find(item => item.id === e.value).checked = e.checked;
        },
        async getVehicleList() {
            try {
                const response = await this.$send_req('/global/get_vehicle_team');
                this.vehicleList = response.vehicle_teams.flatMap(team =>
                    team.vehicle_sets.flatMap(set => [{
                            id: set.main_vehicle.id,
                            plate: set.main_vehicle.plate,
                            checked: this.blacklistData.some(item => item.vehicle?.id === set.main_vehicle.id)
                        },
                        ...(set.behind_vehicle ? [{
                            id: set.behind_vehicle.id,
                            plate: set.behind_vehicle.plate,
                            checked: this.blacklistData.some(item => item.vehicle?.id === set.behind_vehicle.id)
                        }] : [])
                    ])
                );
                this.driverList = response.vehicle_teams.flatMap(team =>
                    team.vehicle_sets.map(set => ({
                        id: set.driver.id,
                        name: set.driver.name,
                        phone: set.driver.phone,
                        checked: this.blacklistData.some(item => item.driver?.id === set.driver.id)
                    }))
                );
            } catch (error) {
                console.error('获取车辆列表失败:', error);
            }
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

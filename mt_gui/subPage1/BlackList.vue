<template>
<view class="blacklist-container">
    <view class="add-blacklist-section">
        <fui-tabs :tabs="['车辆', '司机']" :short="false" height="60" size="24" isSticky center :current="currentType" @change="onTypeChange"></fui-tabs>
        <view v-if="currentType === 0">
            <list-show ref="blacklist" :fetch_function="getBlacklist" height="80vh" search_key="search_cond" v-model="blacklistData">
                <fui-checkbox-group>
                    <fui-label v-for="item in blacklistData.filter(item => item.vehicle)" :key="item.id">
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
                    <fui-label v-for="item in blacklistData.filter(item => item.driver)" :key="item.id">
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
        <view class="bottom-fixed">
            <view>
                <fui-form ref="form">
                    <fui-input v-if="currentType === 0" required label="车牌号" borderTop placeholder="请输入车牌号" v-model="search_info.plate"></fui-input>
                    <fui-input v-if="currentType === 1" required label="手机号" placeholder="请输入司机手机号码" v-model="search_info.phone"></fui-input>
                    <fui-button :text="currentType === 0 ? '添加车辆到黑名单' : '添加司机到黑名单'" radius="0" size="26" @click="addToBlacklist"></fui-button>
                </fui-form>
            </view>
            <fui-button type="danger" :disabled="selectedBlacklist.length === 0" radius="0" size="26" @click="removeFromBlacklist">从黑名单移出{{ currentType === 0 ?'车辆' : '司机' }}</fui-button>
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
        }
    },
    methods: {
        onTypeChange(e) {
            this.currentType = e.index;
        },
        refresh() {
            this.$refs.blacklist.refresh();
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
                        let res;
                        if (this.currentType === 0) {
                            res = await this.$send_req('/stuff/search_vehicle_or_driver', {
                                type: 'vehicle',
                                value: this.search_info.plate
                            });
                        } else {
                            res = await this.$send_req('/stuff/search_vehicle_or_driver', {
                                type: 'driver',
                                value: this.search_info.phone
                            });
                        }
                        if (res) {
                            uni.showModal({
                                title: '提示',
                                content: `确定将${this.currentType === 0 ? '车辆:' + res.item.plate : '司机:' + res.item.name + res.item.phone}添加到黑名单吗？`,
                                success: async (btn) => {
                                    if (btn.confirm) {
                                        await this.$send_req('/stuff/add_to_blacklist', {
                                            type: this.currentType === 0 ? 'vehicle' : 'driver',
                                            ids: res.item.id + '',
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
            this.blacklistData.find(item => item.id === e.value).checked = e.checked;
        },
        onVehicleSelect(e) {
            this.vehicleList.find(item => item.id === e.value).checked = e.checked;
        },
        onDriverSelect(e) {
            this.driverList.find(item => item.id === e.value).checked = e.checked;
        }
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

.bottom-fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20rpx;
    background-color: #f1f4fa;
}
</style>

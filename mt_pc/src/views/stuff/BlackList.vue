<template>
    <el-container>
        <el-header height="200">
                <el-form ref="form" :model="search_info" :rules="get_rules">
                    <el-form-item v-if="currentType === '0'" label="车牌号" prop="plate">
                        <el-input v-model="search_info.plate" placeholder="请输入车牌号"></el-input>
                    </el-form-item>
                    <el-form-item v-if="currentType === '1'" label="手机号" prop="phone">
                        <el-input v-model="search_info.phone" placeholder="请输入司机手机号码"></el-input>
                    </el-form-item>
                </el-form>
                <div style="margin-top: 10px;">
                    <el-button type="primary" @click="addToBlacklist">{{ currentType === '0' ? '添加车辆到黑名单' : '添加司机到黑名单'
                            }}</el-button>
                    <el-button type="danger" @click="removeFromBlacklist">从黑名单移出{{ currentType === '0' ? '车辆' : '司机' }}</el-button>
                </div>
        </el-header>
        <el-main>
            <div class="blacklist-container">
                <div class="add-blacklist-section">
                    <el-tabs v-model="currentType" @tab-click="onTypeChange">
                        <el-tab-pane label="车辆" name="0">
                            <el-table :data="blacklistData.filter(item => item.vehicle)"  @selection-change="handleSelectionChange" style="width: 100%">
                                <el-table-column type="selection" width="55"></el-table-column>
                                <el-table-column prop="vehicle.plate" label="车牌号"></el-table-column>
                            </el-table>
                        </el-tab-pane>
                        <el-tab-pane label="司机" name="1">
                            <el-table :data="blacklistData.filter(item => item.driver)" @selection-change="handleSelectionChange" style="width: 100%">
                                <el-table-column type="selection" width="55"></el-table-column>
                                <el-table-column prop="driver.name" label="司机姓名"></el-table-column>
                                <el-table-column prop="driver.phone" label="司机手机号"></el-table-column>
                            </el-table>
                        </el-tab-pane>
                    </el-tabs>
                    <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
                        @current-change="handlePageChange">
                    </el-pagination>

                </div>
            </div>
        </el-main>

    </el-container>

</template>

<script>
export default {
    name: 'BlackList',
    components: {
    },
    data() {
        return {
            currentType: '0',
            blacklistData: [],
            selectedIds: [],
            total: 0,
            pageSize: 20,
            pageNo: 0,
            search_info: {
                plate: '',
                phone: ''
            }
        }
    },
    computed: {
        get_rules() {
            if (this.currentType === '0') {
                return {
                    plate: [{
                        required: true, message: "请输入车牌号", trigger: "blur"
                    }, {
                        pattern: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9挂]{5}$/, message: "请输入正确的车牌号", trigger: "change"
                    }]
                }
            } else {
                return {
                    phone: [{
                        required: true, message: "请输入司机手机号", trigger: "change"
                    }, {
                        pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号", trigger: "blur"
                    }]
                }
            }
        }
    },
    mounted() {
        this.refresh();
    },
    methods: {
        onTypeChange(tab) {
            this.currentType = tab.index;
            this.refresh();
        },
        refresh() {
            this.getBlacklist(this.pageNo);
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
                this.total = res.total;
                this.blacklistData = res.blacklist.map(item => {
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
                this.$refs.form.validate(async valid => {
                    if (valid) {
                        let res;
                        if (this.currentType === '0') {
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
                            this.$confirm(`确定将${this.currentType === '0' ? '车辆:' + res.item.plate : '司机:' + res.item.name + res.item.phone}添加到黑名单吗？`, '提示', {
                                confirmButtonText: '确定',
                                cancelButtonText: '取消',
                                type: 'warning'
                            }).then(async () => {
                                await this.$send_req('/stuff/add_to_blacklist', {
                                    type: this.currentType === '0' ? 'vehicle' : 'driver',
                                    ids: res.item.id + '',
                                    reason: `违规${this.currentType === '0' ? '车辆' : '司机'}`
                                });
                                this.$message({
                                    type: 'success',
                                    message: '添加成功'
                                });
                                this.refresh();
                            }).catch(() => {
                                this.$message({
                                    type: 'info',
                                    message: '已取消'
                                });
                            });
                        } else {
                            this.$message({
                                type: 'warning',
                                message: `未找到${this.currentType === '0' ? '车辆' : '司机'}信息`
                            });
                        }
                    }
                });

            } catch (error) {
                this.$message({
                    type: 'error',
                    message: '添加失败'
                });
            }
        },
        async removeFromBlacklist() {
            try {
                if (this.selectedIds.length === 0) {
                    this.$message({
                        type: 'warning',
                        message: `请选择要移出黑名单的${this.currentType === '0' ? '车辆' : '司机'}`
                    });
                    return;
                }
                this.$confirm(`确定将选中的${this.currentType === '0' ? '车辆' : '司机'}从黑名单中移除吗？`, '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(async () => {
                    await this.$send_req('/stuff/remove_from_blacklist', {
                        ids: this.selectedIds.join(',')
                    });
                    this.$message({
                        type: 'success',
                        message: '操作成功'
                    });
                    this.refresh();
                }).catch(() => {
                    this.$message({
                        type: 'info',
                        message: '已取消'
                    });
                });
            } catch (error) {
                this.$message({
                    type: 'error',
                    message: '操作失败'
                });
            }
        },
        handlePageChange(page) {
            this.pageNo = page;
            this.refresh();
        },
        handleSelectionChange(selection) {
            this.selectedIds = selection.map(item => item.id);
        }
    }
}
</script>

<style scoped>
.el-checkbox {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.blacklist-container {
    padding: 20px;
}
</style>
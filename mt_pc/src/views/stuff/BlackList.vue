<template>
    <el-container>
        <el-header style="padding-top: 20px;">
            <template>
                <div style="display: flex;justify-content: flex-start; align-items: center;">
                    <el-form ref="form" inline :model="add_info" :rules="get_rules">
                        <el-form-item v-if="currentType === '0'" prop="plate">
                            <el-input v-model="add_info.plate" clearable placeholder="请输入车牌号"
                                @keyup.enter.native="addToBlacklist">
                                <template #append>
                                    <el-button type="success" @click="addToBlacklist">添加车辆到黑名单</el-button>
                                </template>
                            </el-input>
                        </el-form-item>
                        <el-form-item v-if="currentType === '1'" prop="phone">
                            <el-input v-model="add_info.phone" clearable placeholder="请输入司机手机号码"
                                @keyup.enter.native="addToBlacklist">
                                <template #append>
                                    <el-button type="success" @click="addToBlacklist">添加司机到黑名单</el-button>
                                </template>
                            </el-input>
                        </el-form-item>
                        <el-form-item>
                            <el-button type="danger" @click="removeFromBlacklist">从黑名单移出{{ currentType === '0' ? '车辆' :
                                '司机' }}</el-button>
                        </el-form-item>
                        <el-form-item>
                            <el-input v-model="search_info[tabs[currentType].filterKey]" clearable
                                @clear="cancel_search" @keyup.enter.native="do_search"
                                :placeholder="`请输入${tabs[currentType].description}`">
                                <template #append>
                                    <el-button type="primary" icon="el-icon-search" @click="do_search">搜索</el-button>
                                </template>
                            </el-input>
                        </el-form-item>
                    </el-form>
                </div>
            </template>
        </el-header>
        <el-main>
            <template>
                <el-tabs v-model="currentType" @tab-click="onTypeChange">
                    <el-tab-pane v-for="(tab, index) in tabs" :key="index" :label="tab.label" :name="tab.name">
                        <page-content :ref="`blacklist_${tab.name}`" body_key="blacklist"
                            :search_input="search_info[tab.filterKey]" :search_key="tab.searchKey"
                            :req_url="'/stuff/get_blacklist'" :enable="true">
                            <template #default="slotProps">
                                <el-table :data="slotProps.content.filter(item => item[tab.data_type])"
                                    @selection-change="handleSelectionChange">
                                    <el-table-column type="selection" width="55"></el-table-column>
                                    <el-table-column v-for="col in tab.columns" :key="col.prop" :prop="col.prop"
                                        :label="col.label">
                                    </el-table-column>
                                </el-table>
                            </template>
                        </page-content>
                    </el-tab-pane>
                </el-tabs>
            </template>
        </el-main>
    </el-container>
</template>

<script>
import PageContent from '../../components/PageContent.vue'
export default {
    name: 'BlackList',
    components: {
        'page-content': PageContent
    },
    data() {
        return {
            currentType: '0',
            selectedIds: [],
            add_info: {
                plate: '',
                phone: ''
            },
            search_info: {
                plate: '',
                phone: ''
            },
            tabs: [
                {
                    label: '车辆', description: '车牌号', name: '0', data_type: 'vehicle', filterKey: 'plate',
                    searchKey: ['vehicle.plate'], columns: [{ prop: 'vehicle.plate', label: '车牌号' }]
                },
                {
                    label: '司机', description: '司机姓名/手机号', name: '1', data_type: 'driver', filterKey: 'phone',
                    searchKey: ['driver.name', 'driver.phone'],
                    columns: [{ prop: 'driver.name', label: '司机姓名' },
                    { prop: 'driver.phone', label: '司机手机号' }]
                }
            ]
        }
    },
    computed: {
        get_rules() {
            if (this.currentType === '0') {
                return {
                    plate: [{
                        required: true, message: "请输入车牌号", trigger: "change"
                    }, {
                        pattern: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9挂]{5}$/, message: "请输入正确的车牌号", trigger: "change"
                    }]
                }
            } else {
                return {
                    phone: [{
                        required: true, message: "请输入司机手机号", trigger: "change"
                    }, {
                        pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号", trigger: "change"
                    }]
                }
            }
        }
    },
    methods: {
        onTypeChange(tab) {
            this.currentType = tab.index;
            this.refresh();
        },
        refresh() {
            this.add_info = {
                plate: '',
                phone: ''
            }
            this.search_info = {
                plate: '',
                phone: ''
            }
            this.$refs.form.resetFields();
            let current_page = this.$refs[`blacklist_${this.currentType}`][0].cur_page;
            this.$refs[`blacklist_${this.currentType}`][0].refresh(current_page);

        },
        do_search() {
            this.$refs[`blacklist_${this.currentType}`][0].do_search();
        },
        cancel_search() {
            this.$refs[`blacklist_${this.currentType}`][0].cancel_search();
        },
        async addToBlacklist() {
            try {
                this.$refs.form.validate(async valid => {
                    if (valid) {
                        let res;
                        if (this.currentType === '0') {
                            res = await this.$send_req('/stuff/search_vehicle_or_driver', {
                                type: 'vehicle',
                                value: this.add_info.plate
                            });
                        } else {
                            res = await this.$send_req('/stuff/search_vehicle_or_driver', {
                                type: 'driver',
                                value: this.add_info.phone
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
        handleSelectionChange(selection) {
            this.selectedIds = selection.map(item => item.id);
        }
    }
}
</script>

<style scoped>
</style>
<template>
<div class="custom-selector">
    <!-- 触发按钮 -->
    <button class="selector-btn" @click="openModal">
        已选择{{selectedItems.length}}列
    </button>

    <!-- 选择弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>{{ modalTitle }}</h3>
                <span class="close-btn" @click="closeModal">×</span>
            </div>

            <div class="modal-body">
                <!-- 左侧备选列表 -->
                <div class="available-section">
                    <h4>备选项目 ({{ availableItems.length }})</h4>
                    <div class="search-box">
                        <input v-model="searchText" placeholder="搜索项目..." @input="filterItems" />
                    </div>
                    <div class="items-container">
                        <div v-for="item in filteredAvailableItems" :key="item.name" class="item-card" :class="{ 'selected': isSelected(item) }" @click="toggleItem(item)">
                            <span class="item-label">{{ item.label }}</span>
                            <span class="check-icon">{{ isSelected(item) ? '✓' : '+' }}</span>
                        </div>
                        <div v-if="filteredAvailableItems.length === 0" class="empty-tip">
                            无匹配项目
                        </div>
                    </div>
                </div>

                <!-- 右侧已选列表 -->
                <div class="selected-section">
                    <h4>已选项目 (按顺序排列)</h4>
                    <div class="selected-list">
                        <div v-for="(item, index) in selectedItems" :key="item.name" class="selected-item">
                            <div class="item-info">
                                <span class="order-badge">{{ index + 1 }}</span>
                                <span class="item-label">{{ item.label }}</span>
                            </div>
                            <div class="item-actions">
                                <button v-if="index > 0" class="move-btn" @click="moveUp(index)" title="上移">
                                    ↑
                                </button>
                                <button v-if="index < selectedItems.length - 1" class="move-btn" @click="moveDown(index)" title="下移">
                                    ↓
                                </button>
                                <button class="remove-btn" @click="removeItem(index)" title="移除">
                                    ×
                                </button>
                            </div>
                        </div>
                        <div v-if="selectedItems.length === 0" class="empty-tip">
                            暂无已选项目
                        </div>
                    </div>
                </div>
            </div>

            <!-- 弹窗底部操作按钮 -->
            <div class="modal-footer">
                <button class="btn btn-secondary" @click="closeModal">
                    取消
                </button>
                <button class="btn btn-primary" @click="saveSelection" :disabled="selectedItems.length === 0">
                    确认选择
                </button>
            </div>
        </div>
    </div>
</div>
</template>

<script>
export default {
    name: 'ArraySelectorButton',
    props: {
        // v-model绑定的数组
        value: {
            type: Array,
            default: () => []
        },
        // 弹窗标题
        modalTitle: {
            type: String,
            default: '选择项目'
        },

        // 内置备选数组（可以从外部传入，也可以使用默认的）
        options: {
            type: Array,
            default: () => [{
                label: '下单公司',
                name: 'create_company',
            }, {
                label: '接单公司',
                name: 'accept_company',
            }, {
                label: '计划时间',
                name: 'plan_time',
            }, {
                label: '过皮时间',
                name: 'p_time',
            }, {
                label: '过毛时间',
                name: 'm_time',
            }, {
                label: '主车号',
                name: 'mv',
            }, {
                label: '挂车号',
                name: 'bv',
            }, {
                label: '司机姓名',
                name: 'driver_name',
            }, {
                label: '司机电话',
                name: 'driver_phone',
            }, {
                label: '皮重',
                name: 'p_weight',
            }, {
                label: '毛重',
                name: 'm_weight',
            }, {
                label: '装车量',
                name: 'count',
            }, {
                label: '单价',
                name: 'unit_price',
            }, {
                label: '总价',
                name: 'total_price',
            }, {
                label: '铅封号',
                name: 'seal_no',
            }, {
                label: '磅单号',
                name: 'ticket_no',
            }, {
                label: '物料名',
                name: 'stuff_name',
            }, {
                label: '卸货地址',
                name: 'drop_address',
            }, {
                label: '发票已开?',
                name: 'fapiao_delivered',
            }, {
                label: '备注',
                name: 'comment',
            }, {
                label: '装卸区域',
                name: 'drop_take_zone_name'
            }, {
                label: '代理公司',
                name: 'delegate'
            }, {
                label: '打折后单价',
                name: 'subsidy_price'
            }, {
                label: '打折后总价',
                name: 'subsidy_total_price'
            }, {
                label: '打折数',
                name: 'subsidy_discount'
            }, {
                label: '第二单位',
                name: 'second_unit'
            }, {
                label: '第二单位装卸量',
                name: 'second_value'
            }, {
                label: '金蝶星辰同步信息',
                name: 'king_dee_comment'
            }]
        }
    },

    data() {
        return {
            showModal: false,
            searchText: '',
            internalSelected: [],
            filteredAvailableItems: []
        }
    },

    computed: {
        // 计算已选择的项目
        selectedItems() {
            return this.internalSelected
        },

        // 计算可用的项目（排除已选择的）
        availableItems() {
            return this.options.filter(item =>
                !this.selectedItems.some(selected => selected.name === item.name)
            )
        }
    },

    watch: {
        // 监听value变化，同步到internalSelected
        value: {
            immediate: true,
            handler(newVal) {
                this.internalSelected = [...newVal]
            }
        }
    },

    created() {
        this.filteredAvailableItems = this.availableItems
    },

    methods: {
        // 打开弹窗
        openModal() {
            this.showModal = true
            this.searchText = ''
            this.filteredAvailableItems = this.availableItems
            // 重置为当前值
            this.internalSelected = [...this.value]
        },

        // 关闭弹窗
        closeModal() {
            this.showModal = false
            this.searchText = ''
        },

        // 过滤项目
        filterItems() {
            if (!this.searchText.trim()) {
                this.filteredAvailableItems = this.availableItems
                return
            }

            const search = this.searchText.toLowerCase()
            this.filteredAvailableItems = this.availableItems.filter(item =>
                item.label.toLowerCase().includes(search) ||
                item.name.toLowerCase().includes(search)
            )
        },

        // 检查项目是否已选择
        isSelected(item) {
            return this.selectedItems.some(selected => selected.name === item.name)
        },

        // 切换选择状态
        toggleItem(item) {
            if (this.isSelected(item)) {
                // 如果已选择，则移除
                const index = this.selectedItems.findIndex(i => i.name === item.name)
                if (index !== -1) {
                    this.selectedItems.splice(index, 1)
                }
            } else {
                // 如果未选择，则添加到末尾
                this.selectedItems.push({
                    ...item
                })
            }
            // 重新过滤可用项目
            this.filteredAvailableItems = this.availableItems.filter(availItem =>
                !this.searchText.trim() ||
                availItem.label.toLowerCase().includes(this.searchText.toLowerCase()) ||
                availItem.name.toLowerCase().includes(this.searchText.toLowerCase())
            )
        },

        // 移除已选项目
        removeItem(index) {
            this.selectedItems.splice(index, 1)
            // 重新过滤可用项目
            this.filterItems()
        },

        // 上移项目
        moveUp(index) {
            if (index > 0) {
                const temp = this.selectedItems[index]
                this.selectedItems.splice(index, 1)
                this.selectedItems.splice(index - 1, 0, temp)
            }
        },

        // 下移项目
        moveDown(index) {
            if (index < this.selectedItems.length - 1) {
                const temp = this.selectedItems[index]
                this.selectedItems.splice(index, 1)
                this.selectedItems.splice(index + 1, 0, temp)
            }
        },

        // 保存选择
        saveSelection() {
            // 触发input事件更新v-model
            this.$emit('input', [...this.selectedItems])
            // 触发change事件
            this.$emit('change', [...this.selectedItems])
            this.closeModal()
        }
    }
}
</script>

<style scoped>
.custom-selector {
    display: inline-block;
}

.selector-btn {
    position: relative;
    padding: 8px 16px;
    background-color: #409eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

.selector-btn:hover {
    background-color: #66b1ff;
}

.badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background-color: #f56c6c;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 12px;
    min-width: 18px;
    text-align: center;
}

/* 弹窗样式 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: white;
    border-radius: 8px;
    width: 800px;
    max-width: 90%;
    max-height: 90%;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #e8e8e8;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
}

.close-btn {
    font-size: 24px;
    cursor: pointer;
    color: #999;
    padding: 0 8px;
}

.close-btn:hover {
    color: #333;
}

.modal-body {
    display: flex;
    flex: 1;
    min-height: 400px;
    padding: 0;
}

.available-section,
.selected-section {
    flex: 1;
    padding: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.available-section {
    border-right: 1px solid #e8e8e8;
}

.available-section h4,
.selected-section h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #666;
}

.search-box {
    margin-bottom: 12px;
}

.search-box input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.items-container,
.selected-list {
    flex: 1;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 8px;
}

.item-card {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
}

.item-card:hover {
    border-color: #409eff;
    background-color: #f5f7fa;
}

.item-card.selected {
    border-color: #409eff;
    background-color: #ecf5ff;
}

.item-label {
    flex: 1;
    font-weight: 500;
    color: #333;
}

.item-name {
    font-size: 12px;
    color: #999;
    margin-right: 24px;
}

.check-icon {
    position: absolute;
    right: 12px;
    color: #409eff;
    font-weight: bold;
}

.empty-tip {
    text-align: center;
    color: #999;
    padding: 40px 0;
}

.selected-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9f9f9;
}

.item-info {
    display: flex;
    align-items: center;
    flex: 1;
}

.order-badge {
    display: inline-block;
    width: 24px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    background-color: #409eff;
    color: white;
    border-radius: 50%;
    font-size: 12px;
    margin-right: 12px;
}

.item-actions {
    display: flex;
    gap: 4px;
}

.move-btn,
.remove-btn {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.move-btn:hover {
    border-color: #409eff;
    color: #409eff;
}

.remove-btn:hover {
    border-color: #f56c6c;
    color: #f56c6c;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 16px 24px;
    border-top: 1px solid #e8e8e8;
    gap: 12px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

.btn-primary {
    background-color: #409eff;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background-color: #66b1ff;
}

.btn-primary:disabled {
    background-color: #c0c4cc;
    cursor: not-allowed;
}

.btn-secondary {
    background-color: #f5f5f5;
    color: #666;
    border: 1px solid #ddd;
}

.btn-secondary:hover {
    background-color: #e8e8e8;
}
</style>

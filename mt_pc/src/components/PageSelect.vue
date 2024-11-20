<template>
    <el-select 
        v-model="selectedValue"
        :placeholder="placeholder"
        :loading="loading"
        @focus="handleFocus"
        @change="handleChange"
        :multiple="multiple"
        :clearable="clearable">
        <slot name="option-list" :options="options">
        </slot>
        <template #dropdown>
            <div style="padding: 10px">
                <!-- 分页模式 -->
                <el-pagination
                    v-if="mode === 'pagenation' && total > pageSize"
                    :current-page="currentPage"
                    :page-size="pageSize" 
                    :total="total"
                    layout="prev, pager, next"
                    @current-change="handlePageChange">
                </el-pagination>
                <!-- 加载更多模式 -->
                <el-button 
                    v-if="mode === 'loadmore' && hasMore"
                    @click="loadMore"
                    type="text"
                    style="width: 100%; text-align: center">
                    加载更多
                </el-button>
            </div>
        </template>
    </el-select>
</template>

<script>
export default {
    name: 'PageSelect',
    props: {
        value: {
            required: true
        },
        fetchFunction: {
            type: Function,
            required: true
        },
        placeholder: {
            type: String,
            default: '请选择'
        },
        pageSize: {
            type: Number,
            default: 20
        },
        clearable: {
            type: Boolean,
            default: true
        },
        // 自定义参数
        params: {
            type: Object,
            default: () => ({})
        },
        // 分页模式：pagination/loadmore
        mode: {
            type: String,
            default: 'pagenation',
            validator: function(value) {
                return ['pagenation', 'loadmore'].indexOf(value) !== -1
            }
        },
        multiple: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            loading: false,
            options: [],
            total: 0,
            currentPage: 1,
            selectedValue: this.value,
            keyword: '',
            hasMore: true
        }
    },
    watch: {
        value(val) {
            this.selectedValue = val;
        }
    },
    methods: {
        async loadData(append = false) {
            this.loading = true;
            try {
                const params = {
                    pageNo: this.currentPage - 1,
                    keyword: this.keyword,
                    ...this.params
                };
                
                const res = await this.fetchFunction(params);
                
                const newOptions = res || [];
                this.total = res.total || 0;

                if (append) {
                    this.options = [...this.options, ...newOptions];
                } else {
                    this.options = newOptions;
                }
                
                this.hasMore = this.options.length < this.total;
            } catch (error) {
                console.error('Load data failed:', error);
            } finally {
                this.loading = false;
            }
        },
        handleFocus() {
            if (this.options.length === 0) {
                this.loadData();
            }
        },
        handlePageChange(page) {
            this.currentPage = page;
            this.loadData();
        },
        loadMore() {
            this.currentPage += 1;
            this.loadData(true);
        },
        remoteSearch(query) {
            this.keyword = query;
            this.currentPage = 1;
            this.options = [];
            this.loadData();
        },
        handleChange(value) {
            this.$emit('input', value);
            this.$emit('change', value);
        }
    }
}
</script>

<style scoped>
.el-select {
    width: 100%;
}
</style>

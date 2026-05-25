<template>
    <div class="group_scope" v-if="visible && scopes.length > 1">
        <span v-if="showLabel" class="scope_label">{{ label }}</span>
        <el-radio-group :value="value" :size="size" @input="on_input" @change="on_change">
            <el-radio-button v-for="s in scopes" :key="s.id" :label="s.id"
                :class="{ scope_home_btn: is_home_scope(s) }">
                {{ s.name }}
                <span v-if="is_home_scope(s)" class="scope_home_mark">主</span>
            </el-radio-button>
        </el-radio-group>
    </div>
</template>

<script>
export default {
    name: 'GroupStatScopeSelector',
    props: {
        value: {
            type: [Number, String],
            default: null,
        },
        scopes: {
            type: Array,
            default: function () {
                return [];
            }
        },
        homeCompanyId: {
            type: Number,
            default: null,
        },
        label: {
            type: String,
            default: '统计范围',
        },
        showLabel: {
            type: Boolean,
            default: true,
        },
        size: {
            type: String,
            default: 'small',
        },
        visible: {
            type: Boolean,
            default: true,
        }
    },
    methods: {
        is_home_scope: function (scope) {
            return this.homeCompanyId != null && scope && scope.id === this.homeCompanyId;
        },
        on_input: function (val) {
            this.$emit('input', val);
        },
        on_change: function (val) {
            this.$emit('change', val);
        }
    }
}
</script>

<style scoped>
.group_scope {
    display: inline-flex;
    align-items: center;
}

.scope_label {
    color: #606266;
    font-size: 14px;
    margin-right: 10px;
}

.group_scope ::v-deep .scope_home_btn.is-active .el-radio-button__inner {
    background: #f56c6c;
    border-color: #f56c6c;
    color: #fff;
    box-shadow: -1px 0 0 0 #f56c6c;
}

.group_scope ::v-deep .scope_home_mark {
    margin-left: 4px;
    padding: 0 4px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 16px;
    color: #f56c6c;
    background: #fff2f0;
}

.group_scope ::v-deep .scope_home_btn.is-active .scope_home_mark {
    color: #f56c6c;
    background: #ffffff;
}
</style>

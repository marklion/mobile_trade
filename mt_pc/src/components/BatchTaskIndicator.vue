<template>
  <div v-if="current_task.has_task" class="batch-task-indicator">
    <i class="el-icon-loading" />
    <span>{{ current_task.task_name || '耗时任务' }}执行中</span>
    <span v-if="current_task.total_count > 0">{{ current_task.current_count }}/{{ current_task.total_count }}</span>
  </div>
</template>

<script>
export default {
    name: 'BatchTaskIndicator',
    data() {
        return {
            current_task: {
                has_task: false,
            },
            refresh_timer: null,
            refreshing: false,
        }
    },
    mounted() {
        this.refreshTask()
        this.refresh_timer = setInterval(this.refreshTask, 3000)
    },
    beforeDestroy() {
        if (this.refresh_timer) {
            clearInterval(this.refresh_timer)
        }
    },
    methods: {
        async refreshTask() {
            if (this.refreshing) {
                return
            }
            this.refreshing = true
            try {
                this.current_task = await this.$send_req('/global/batch_task_current', {}, true, true)
            } catch (error) {
                this.current_task = { has_task: false }
            } finally {
                this.refreshing = false
            }
        },
    },
}
</script>

<style lang="scss" scoped>
.batch-task-indicator {
    display: inline-flex;
    align-items: center;
    margin: 0 16px;
    padding: 0 12px;
    height: 30px;
    line-height: 30px;
    border-radius: 15px;
    color: #409eff;
    background: #ecf5ff;
    font-size: 13px;
    white-space: nowrap;

    .el-icon-loading {
        margin-right: 6px;
    }

    span + span {
        margin-left: 6px;
    }
}
</style>

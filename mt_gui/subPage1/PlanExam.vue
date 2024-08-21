<template>
<view>
    <u-collapse>
        <u-collapse-item v-for="single_exam in exams" :key="single_exam.id" :title="single_exam.exam_paper.name" :value="single_exam.score + '分'">
            <view v-for="single_q in single_exam.exam_paper.questions" :key="single_q.id">
                <fui-section :title="single_q.name" isLine>
                </fui-section>
                <view v-for="item in single_q.option_answers" :key="item.id" style="padding-left:16px">
                    <fui-icon name="checkround" size="32"></fui-icon>
                    <fui-text :type="item.is_correct?'success': 'black'" :text="item.name" size="32"></fui-text>
                    <fui-icon v-if="was_selected(item, single_exam)" :name="item.is_correct?'check':'close'" size="32"></fui-icon>
                </view>
            </view>
        </u-collapse-item>
    </u-collapse>
</view>
</template>

<script>
export default {
    name: 'PlanExam',
    data: function () {
        return {
            plan_id: 0,
            exams: [],
        };
    },
    methods: {
        get_exam: async function () {
            let resp = await this.$send_req('/exam/get_exam_by_plan', {
                plan_id: this.plan_id,
            });
            this.exams = resp.exams;
        },
        was_selected: function (item, single_exam) {
            let ret = false;
            for (let i = 0; i < single_exam.exam_answers.length; i++) {
                const element = single_exam.exam_answers[i];
                if (element.option_answer.id == item.id) {
                    ret = true;
                    break;
                }
            }
            return ret;
        }
    },
    onLoad(option) {
        this.plan_id = parseInt(option.plan_id)
        this.get_exam()
    },
}
</script>

<style>

</style>

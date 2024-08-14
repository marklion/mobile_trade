<template>
<view>
    <list-show :fetch_function="get_all_paper" :fetch_params="[plan_id, open_id]" v-model="all_paper">
        <view v-for="single_paper in all_paper" :key="single_paper.id">
            <u-cell :title="single_paper.name">
                <view slot="right-icon">
                    <fui-button :disabled="examPassed(single_paper)" btnSize="mini" :text="examPassed(single_paper)?'答毕':'答题'" type="primary" @click="begin_exam(single_paper)"></fui-button>
                </view>
            </u-cell>
        </view>
        <Qa v-if="show_qa" :dataList="qa_list" @submit="subData"></Qa>
        <fui-result v-if="show_exam_info" :type="exam_result.type" :title="`总分数:${exam_result.currentScore}`" :descr="exam_result.descr">
            <fui-button width="400rpx" height="84rpx" @click="exitExam" text="退出考试" type="gray" color="#09BE4F" bold></fui-button>
        </fui-result>
    </list-show>

</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import Qa from '../components/Qa.vue';
export default {
    name: 'Exam',
    components: {
        'list-show': ListShow,
        'Qa': Qa
    },
    data: function () {
        return {
            plan_id: 0,
            open_id: '',
            driver_name: '',
            all_paper: [],
            show_qa: false,
            show_exam_info: false,
            qa_list: [],
            exam_result: {
                title: '答题结果',
                type: 'success',
                info: '',
                currentScore: 0,
                detial: []
            }
        }
    },

    created() {
        this.getExamDetial()
    },
    methods: {
        get_all_paper: async function (pageNo, [plan_id, open_id]) {
            if (plan_id == 0) {
                return [];
            }
            let resp = await this.$send_req('/global/driver_get_paper', {
                plan_id: plan_id,
                pageNo: pageNo,
                open_id: open_id
            });
            return resp.papers;
        },
        examPassed: function (paper) {
            return this.exam_result.detial.find((item) => item.exam_paper.id == paper.id && item.score >= 80) != undefined
        },
        begin_exam: function (paper) {
            this.show_qa = true;
            this.qa_list=[];
			const randomValue = (window.crypto.getRandomValues(new Uint32Array(1))[0]/ 2**32)-0.68;
            let tmp = paper.questions.map((item, index) => {
                return {
                    id: paper.id,
                    title: item.name,
                    problemType: 'SINGLE',
                    children: item.option_answers.map(({
                        id,
                        name
                    }) => ({
                        id: id,
                        answer: name
                    })).sort(()=>randomValue)
                }
            })
            this.qa_list = tmp;
        },
        exitExam: function (e) {
            uni.navigateBack()
        },
        getExamDetial: async function (paperId) {
            let resp = await this.$send_req('/global/driver_get_exam', {
                plan_id: this.plan_id,
                open_id: this.open_id
            });

            if (resp.exams) {
                this.exam_result.detial = resp.exams
                if (paperId) {
                    let exam_score = resp.exams.find((item) => item.exam_paper.id == paperId)
                    if (exam_score)
                        this.exam_result.currentScore = exam_score.score
                }
            }

        },
        subData: async function (data) {
            try {
                let resp = await this.$send_req('/global/commit_answers', {
                    plan_id: this.plan_id,
                    paper_id: data[0].id,
                    open_id: this.open_id,
                    name: this.driver_name,
                    answers: data.map(({
                        userAnswer
                    }) => ({
                        answer_id: userAnswer.id
                    }))
                });

                if (resp.result) {
                    this.show_qa = false;
                    this.exam_result.type = "success"
                    this.show_exam_info = true;

                } else {
                    this.show_qa = false;
                    this.exam_result.info = resp.err_msg
                    this.exam_result.type = "fail"
                    this.show_exam_info = true;
                }
                this.getExamDetial(data[0].id)
            } catch (e) {
                this.exam_result.info = e.message
                this.exam_result.type = "warning"
                this.show_exam_info = true;
            }

        }
    },
    onLoad: function (option) {
        this.plan_id = parseInt(option.plan_id);
        this.open_id = option.open_id;
        this.driver_name = option.driver_name;
    }
}
</script>

<style>

</style>

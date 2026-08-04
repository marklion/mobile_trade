<template>
<view class="exam-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">安全考试</text>
            <text class="hero-title">试卷列表</text>
            <text class="hero-sub">完成全部试卷后方可继续业务</text>
        </view>
    </view>

    <view class="shell">
        <list-show :fetch_function="get_all_paper" :fetch_params="[plan_id, open_id]" v-model="all_paper" height="62vh">
            <view class="paper-card" v-for="single_paper in all_paper" :key="single_paper.id">
                <view class="paper-main">
                    <text class="paper-name">{{ single_paper.name }}</text>
                    <text class="paper-status ok" v-if="examPassed(single_paper)">已通过</text>
                    <text class="paper-status" v-else>待答题</text>
                </view>
                <view class="paper-btn disabled" v-if="examPassed(single_paper)">
                    <text class="paper-btn-text">已通过</text>
                </view>
                <view class="paper-btn primary" v-else @click="begin_exam(single_paper)">
                    <text class="paper-btn-text">开始答题</text>
                </view>
            </view>
            <Qa v-if="show_qa" :dataList="qa_list" @submit="subData"></Qa>
            <view class="result-panel" v-if="show_exam_info">
                <view class="result-badge success" v-if="exam_result.type === 'success'">
                    <text class="result-badge-text">通过</text>
                </view>
                <view class="result-badge fail" v-else>
                    <text class="result-badge-text">未通过</text>
                </view>
                <text class="result-score">总分数 {{ exam_result.currentScore }}</text>
                <text class="result-desc" v-if="exam_result.descr">{{ exam_result.descr }}</text>
                <text class="result-desc" v-else-if="exam_result.info">{{ exam_result.info }}</text>
                <view class="result-exit" @click="exitExam">
                    <text class="result-exit-text">退出考试</text>
                </view>
            </view>
        </list-show>
    </view>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
import Qa from './Qa.vue';
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
            if (this.examPassed(paper)) {
                return;
            }
            this.show_qa = true;
            this.qa_list=[];
			const randomValue = uni.$u.random(0,1)-0.68;
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
        this.getExamDetial();
    }
}
</script>

<style scoped>
.exam-page {
    min-height: 100vh;
    background: #F4F6FB;
}
.hero {
    position: relative;
    padding: 28rpx 28rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}
.hero-logo-bg {
    position: absolute;
    top: -20rpx;
    right: -10rpx;
    width: 240rpx;
    height: 240rpx;
    opacity: 0.16;
    pointer-events: none;
}
.hero-logo-img {
    width: 100%;
    height: 100%;
}
.hero-copy {
    position: relative;
    z-index: 1;
}
.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 2rpx;
}
.hero-title {
    display: block;
    margin-top: 10rpx;
    font-size: 40rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.hero-sub {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.88);
}
.shell {
    margin: -24rpx 20rpx 24rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.08);
    padding: 16rpx;
    overflow: hidden;
}
.paper-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16rpx;
    background: #F8F9FD;
    border: 1rpx solid #EEF1F8;
    border-radius: 16rpx;
    padding: 22rpx 18rpx;
    margin-bottom: 12rpx;
}
.paper-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}
.paper-name {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
}
.paper-status {
    font-size: 22rpx;
    color: #FF8A2B;
    font-weight: 600;
}
.paper-status.ok {
    color: #1FA85A;
}
.paper-btn {
    flex-shrink: 0;
    min-width: 160rpx;
    height: 64rpx;
    padding: 0 20rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}
.paper-btn.primary {
    background: linear-gradient(145deg, #5B6FFF 0%, #465CFF 48%, #2F3FCF 100%);
}
.paper-btn.disabled {
    background: #E8ECF5;
}
.paper-btn-text {
    font-size: 24rpx;
    color: #FFFFFF;
    font-weight: 700;
}
.paper-btn.disabled .paper-btn-text {
    color: #9AA3B8;
}
.result-panel {
    margin-top: 24rpx;
    padding: 40rpx 24rpx;
    background: #F8F9FD;
    border-radius: 20rpx;
    border: 1rpx solid #EEF1F8;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.result-badge {
    padding: 10rpx 28rpx;
    border-radius: 999rpx;
    margin-bottom: 16rpx;
}
.result-badge.success {
    background: rgba(45, 190, 108, 0.12);
}
.result-badge.fail,
.result-badge.warning {
    background: rgba(255, 77, 79, 0.12);
}
.result-badge-text {
    font-size: 26rpx;
    font-weight: 700;
}
.result-badge.success .result-badge-text {
    color: #1FA85A;
}
.result-badge.fail .result-badge-text,
.result-badge.warning .result-badge-text {
    color: #FF4D4F;
}
.result-score {
    font-size: 40rpx;
    color: #1A1F36;
    font-weight: 700;
}
.result-desc {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: #6B7280;
    text-align: center;
}
.result-exit {
    margin-top: 28rpx;
    min-width: 320rpx;
    height: 80rpx;
    border-radius: 14rpx;
    background: #FFFFFF;
    border: 1rpx solid #D8DEEA;
    display: flex;
    align-items: center;
    justify-content: center;
}
.result-exit-text {
    font-size: 28rpx;
    color: #6B7280;
    font-weight: 700;
}
</style>

<template>
<view class="pe-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">考试结果</text>
            <text class="hero-title">答卷详情</text>
            <text class="hero-sub">共 {{ exams.length }} 份试卷</text>
        </view>
    </view>

    <view class="shell">
        <view class="exam-card" v-for="single_exam in exams" :key="single_exam.id">
            <view class="exam-head" @click="toggle_exam(single_exam.id)">
                <view class="exam-head-main">
                    <text class="exam-name">{{ single_exam.exam_paper.name }}</text>
                    <text class="exam-score ok" v-if="single_exam.score >= 80">{{ single_exam.score }} 分 · 通过</text>
                    <text class="exam-score bad" v-else>{{ single_exam.score }} 分 · 未通过</text>
                </view>
                <fui-icon :name="opened_id === single_exam.id ? 'turningup' : 'arrowdown'" size="32" color="#C5CAD5"></fui-icon>
            </view>
            <view class="exam-body" v-if="opened_id === single_exam.id">
                <view class="q-block" v-for="(single_q, qi) in single_exam.exam_paper.questions" :key="single_q.id">
                    <text class="q-title">{{ qi + 1 }}. {{ single_q.name }}</text>
                    <view class="opt-row" v-for="item in single_q.option_answers" :key="item.id">
                        <view class="opt-inner pick-ok" v-if="item.rowCls === 'pick-ok'">
                            <text class="opt-mark">正</text>
                            <text class="opt-text">{{ item.name }}</text>
                            <text class="opt-tag ok">所选·正确</text>
                        </view>
                        <view class="opt-inner pick-bad" v-else-if="item.rowCls === 'pick-bad'">
                            <text class="opt-mark muted">·</text>
                            <text class="opt-text">{{ item.name }}</text>
                            <text class="opt-tag bad">所选·错误</text>
                        </view>
                        <view class="opt-inner is-correct" v-else-if="item.rowCls === 'is-correct'">
                            <text class="opt-mark">正</text>
                            <text class="opt-text">{{ item.name }}</text>
                        </view>
                        <view class="opt-inner" v-else>
                            <text class="opt-mark muted">·</text>
                            <text class="opt-text">{{ item.name }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>
        <view class="empty" v-if="!exams.length">
            <text class="empty-text">暂无考试记录</text>
        </view>
    </view>
</view>
</template>

<script>
export default {
    name: 'PlanExam',
    data: function () {
        return {
            plan_id: 0,
            exams: [],
            opened_id: 0,
        };
    },
    methods: {
        get_exam: async function () {
            let resp = await this.$send_req('/exam/get_exam_by_plan', {
                plan_id: this.plan_id,
            });
            var list = resp.exams || [];
            var vue_this = this;
            list.forEach(function (exam) {
                var questions = (exam.exam_paper && exam.exam_paper.questions) ? exam.exam_paper.questions : [];
                questions.forEach(function (q) {
                    var opts = q.option_answers || [];
                    opts.forEach(function (item) {
                        item.rowCls = vue_this.calc_row_cls(item, exam);
                    });
                });
            });
            this.exams = list;
            if (this.exams.length) {
                this.opened_id = this.exams[0].id;
            }
        },
        toggle_exam: function (id) {
            this.opened_id = this.opened_id === id ? 0 : id;
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
        },
        calc_row_cls: function (item, single_exam) {
            if (this.was_selected(item, single_exam) && item.is_correct) {
                return 'pick-ok';
            }
            if (this.was_selected(item, single_exam)) {
                return 'pick-bad';
            }
            if (item.is_correct) {
                return 'is-correct';
            }
            return '';
        },
    },
    onLoad(option) {
        this.plan_id = parseInt(option.plan_id)
        this.get_exam()
    },
}
</script>

<style scoped>
.pe-page {
    min-height: 100vh;
    background: #F4F6FB;
    padding-bottom: 40rpx;
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
    margin: -24rpx 20rpx 0;
}
.exam-card {
    background: #FFFFFF;
    border-radius: 20rpx;
    border: 1rpx solid #EEF1F8;
    box-shadow: 0 8rpx 24rpx rgba(40, 58, 120, 0.06);
    margin-bottom: 16rpx;
    overflow: hidden;
}
.exam-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
    padding: 22rpx 20rpx;
}
.exam-head-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}
.exam-name {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
}
.exam-score {
    font-size: 22rpx;
    font-weight: 600;
}
.exam-score.ok {
    color: #1FA85A;
}
.exam-score.bad {
    color: #FF4D4F;
}
.exam-body {
    padding: 0 20rpx 20rpx;
    border-top: 1rpx solid #F2F4FA;
}
.q-block {
    padding-top: 18rpx;
}
.q-title {
    display: block;
    font-size: 26rpx;
    color: #1A1F36;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 10rpx;
}
.opt-row {
    margin-bottom: 8rpx;
}
.opt-inner {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10rpx;
    padding: 12rpx 14rpx;
    border-radius: 12rpx;
    background: #F8F9FD;
    border: 1rpx solid transparent;
}
.opt-inner.is-correct {
    background: rgba(45, 190, 108, 0.08);
}
.opt-inner.pick-ok {
    background: rgba(45, 190, 108, 0.12);
    border-color: rgba(45, 190, 108, 0.35);
}
.opt-inner.pick-bad {
    background: rgba(255, 77, 79, 0.1);
    border-color: rgba(255, 77, 79, 0.3);
}
.opt-mark {
    flex-shrink: 0;
    width: 36rpx;
    height: 36rpx;
    border-radius: 8rpx;
    background: rgba(45, 190, 108, 0.15);
    color: #1FA85A;
    font-size: 20rpx;
    font-weight: 700;
    text-align: center;
    line-height: 36rpx;
}
.opt-mark.muted {
    background: #E8ECF5;
    color: #9AA3B8;
}
.opt-text {
    flex: 1;
    min-width: 0;
    font-size: 24rpx;
    color: #3A4256;
    line-height: 1.35;
}
.opt-tag {
    flex-shrink: 0;
    font-size: 18rpx;
    font-weight: 700;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
}
.opt-tag.ok {
    color: #1FA85A;
    background: rgba(45, 190, 108, 0.12);
}
.opt-tag.bad {
    color: #FF4D4F;
    background: rgba(255, 77, 79, 0.12);
}
.empty {
    padding: 80rpx 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}
.empty-text {
    font-size: 26rpx;
    color: #9AA3B8;
}
</style>

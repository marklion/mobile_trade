<template>
<view class="exam-config-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">考试管理</text>
            <text class="hero-title">考试配置</text>
            <text class="hero-sub">维护题库题目与物料试卷</text>
        </view>
    </view>

    <view class="shell">
        <view class="seg">
            <view class="seg-item" v-if="cur_page == 0">
                <text class="seg-text seg-text-on">题库</text>
            </view>
            <view class="seg-item seg-item-off" v-else @click="sectionChange(0)">
                <text class="seg-text">题库</text>
            </view>
            <view class="seg-item" v-if="cur_page == 1">
                <text class="seg-text seg-text-on">试卷</text>
            </view>
            <view class="seg-item seg-item-off" v-else @click="sectionChange(1)">
                <text class="seg-text">试卷</text>
            </view>
        </view>

        <view v-if="cur_page == 0">
            <list-show ref="questions" :fetch_function="get_questions" height="58vh" search_key="name" v-model="all_questions">
                <view class="q-card" v-for="single_q in all_questions" :key="single_q.id">
                    <view class="q-head">
                        <text class="q-title">{{ single_q.name }}</text>
                        <view class="q-actions">
                            <view class="q-act" @click="prepare_edit(single_q)">
                                <fui-icon name="edit" color="#2F3FCF" :size="36"></fui-icon>
                            </view>
                            <view class="q-act" @click="prepare_delete(single_q)">
                                <fui-icon name="close" color="#E34D59" :size="36"></fui-icon>
                            </view>
                        </view>
                    </view>
                    <view class="opt-row" v-for="item in single_q.option_answers" :key="item.id">
                        <view class="opt-mark ok" v-if="item.is_correct">
                            <fui-icon name="checkround" color="#2BA471" :size="28"></fui-icon>
                        </view>
                        <view class="opt-mark" v-else>
                            <view class="opt-dot"></view>
                        </view>
                        <text class="opt-text ok" v-if="item.is_correct">{{ item.name }}</text>
                        <text class="opt-text" v-else>{{ item.name }}</text>
                    </view>
                </view>
            </list-show>
        </view>

        <view v-else-if="cur_page == 1">
            <view class="stuff-tabs">
                <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
            </view>
            <list-show ref="papers" :fetch_function="get_papers" height="52vh" search_key="name" v-model="all_papers" :fetch_params="[focus_stuff_id]">
                <view class="p-card" v-for="single_p in all_papers" :key="single_p.id">
                    <view class="p-head">
                        <text class="p-name">{{ single_p.name }}</text>
                        <text class="p-tag">共{{ single_p.questions.length }}题</text>
                    </view>
                    <view class="p-q-row" v-for="single_question in single_p.questions" :key="single_question.id">
                        <text class="p-q-name">{{ single_question.name }}</text>
                        <view class="p-q-del" @click="prepare_unlink_question(single_question, single_p)">
                            <fui-icon name="close" color="#E34D59" :size="30"></fui-icon>
                        </view>
                    </view>
                    <view class="p-actions">
                        <view class="p-btn ok" @click="prepare_link_question(single_p)">
                            <text class="p-btn-text">新增题目</text>
                        </view>
                        <view class="p-btn danger" @click="prepare_delete_paper(single_p)">
                            <text class="p-btn-text">删除试卷</text>
                        </view>
                    </view>
                </view>
            </list-show>
        </view>
    </view>

    <view class="bottom-bar" v-if="cur_page == 0">
        <view class="primary-btn" @click="show_question_add = true">
            <text class="primary-btn-text">新增题目</text>
        </view>
    </view>
    <view class="bottom-bar" v-else-if="cur_page == 1">
        <view class="primary-btn" @click="show_paper_add = true">
            <text class="primary-btn-text">新增试卷</text>
        </view>
    </view>

    <fui-bottom-popup :show="show_link_question" @close="show_link_question= false">
        <view class="popup-head">
            <text class="popup-title">选择题目加入试卷</text>
        </view>
        <fui-list>
            <list-show :fetch_function="get_questions" height="40vh" search_key="name" v-model="questions_for_select">
                <fui-list-cell arrow v-for="item in questions_for_select" :key="item.id" @click="link_question(item.id)">
                    {{item.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
    <fui-modal width="600" :show="show_paper_add" @click="add_paper" v-if="show_paper_add">
        <fui-form ref="add_paper" top="100">
            <fui-input required label="试卷名称" borderTop placeholder="请输入名称" v-model="new_paper.name"></fui-input>
            <fui-input required label="通过分数" borderTop placeholder="请输入通过分数" type="number" v-model="new_paper.pass_score"></fui-input>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_unlink_confirm" @click="unlink_question" v-if="show_unlink_confirm" descr="确定要从试卷中删除该题吗？">
    </fui-modal>
    <fui-modal width="600" :show="show_delete_confirm" @click="do_delete" v-if="show_delete_confirm" descr="确定要删除吗？">
    </fui-modal>
    <fui-modal width="600" :show="show_delete_paper_confirm" @click="do_delete_paper" v-if="show_delete_paper_confirm" descr="确定要删除吗？">
    </fui-modal>

    <fui-modal width="600" :show="show_edit_confirm" @click="do_edit" v-if="show_edit_confirm">
        <fui-form ref="edit_question" top="100">
            <fui-input required label="题目" borderTop placeholder="请输入题目" v-model="new_question.name"></fui-input>
            <fui-input v-for="(single_o, index) in new_question.option_answers" :key="index" required :label="'选项' + (index+ 1)" borderTop placeholder="请输入选项" v-model="single_o.name">
                <view class="correct-row">
                    <text class="correct-label">正确答案</text>
                    <u-switch v-model="single_o.is_correct" @change="set_correct(index)"></u-switch>
                </view>
            </fui-input>
            <view class="form-tag" @click="add_options">
                <text class="form-tag-text">增加选项</text>
            </view>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_question_add" @click="add_question" v-if="show_question_add">
        <fui-form ref="add_question" top="100">
            <fui-input required label="题目" borderTop placeholder="请输入题目" v-model="new_question.name"></fui-input>
            <fui-input v-for="(single_o, index) in new_question.option_answers" :key="index" required :label="'选项' + (index+ 1)" borderTop placeholder="请输入选项" v-model="single_o.name">
                <view class="correct-row">
                    <text class="correct-label">正确答案</text>
                    <u-switch v-model="single_o.is_correct" @change="set_correct(index)"></u-switch>
                </view>
            </fui-input>
            <view class="form-tag" @click="add_options">
                <text class="form-tag-text">增加选项</text>
            </view>
        </fui-form>
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'ExamConfig',
    components: {
        "list-show": ListShow,
    },
    computed: {
        tabs: function () {
            let ret = [];
            this.all_stuff.forEach(ele => {
                ret.push({
                    name: ele.name,
                    id: ele.id
                });
            });

            return ret;
        },
    },
    data: function () {
        return {
            questions_for_select: [],
            focus_paper_id: 0,
            focus_question_id: 0,
            show_unlink_confirm: false,
            show_link_question: false,
            show_paper_add: false,
            new_paper: {
                name: '',
                pass_score: 80
            },
            focus_question: {},
            all_stuff: [],
            focus_stuff_id: 0,
            show_delete_confirm: false,
            show_edit_confirm: false,
            new_question: {
                name: '',
                option_answers: [],
            },
            show_question_add: false,
            sub_pages: ['题库', '试卷'],
            cur_page: 0,
            all_questions: [],
            all_papers: [],
            show_delete_paper_confirm: false,
            focus_paper: {},
        };
    },
    methods: {
        link_question: async function (id) {
            await this.$send_req('/exam/add_question2paper', {
                paper_id: this.focus_paper_id,
                question_id: id
            });
            this.refresh_paper();
            this.show_link_question = false;
        },
        prepare_link_question: function (paper) {
            this.focus_paper_id = paper.id;
            this.show_link_question = true;
        },
        prepare_unlink_question: function (question, paper) {
            this.focus_paper_id = paper.id;
            this.focus_question_id = question.id;
            this.show_unlink_confirm = true;
        },
        unlink_question: async function () {
            await this.$send_req('/exam/del_question_from_paper', {
                paper_id: this.focus_paper_id,
                question_id: this.focus_question_id
            });
            this.refresh_paper();
            this.show_unlink_confirm = false;
        },
        do_delete_paper: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/exam/del_paper', {
                    id: this.focus_paper.id
                })
                this.refresh_paper();
            }
            this.show_delete_paper_confirm = false;
        },
        prepare_delete_paper: function (item) {
            this.focus_paper = item;
            this.show_delete_paper_confirm = true;
        },
        add_paper: async function (e) {
            let new_paper = {
                name: this.new_paper.name,
                stuff_id: this.focus_stuff_id,
                pass_score: parseInt(this.new_paper.pass_score) || 80
            };
            if (e.index == 1) {
                await this.$send_req('/exam/add_paper', new_paper);
                this.refresh_paper();
            }
            this.show_paper_add = false;
            this.new_paper = {
                name: '',
                pass_score: 80
            };
        },
        get_papers: async function (pageNo, [focus_stuff_id]) {
            if (focus_stuff_id == undefined) {
                return [];
            }
            let resp = await this.$send_req('/exam/get_paper', {
                pageNo: pageNo,
                stuff_id: focus_stuff_id
            });
            return resp.papers;
        },
        refresh_paper: async function () {
            this.$nextTick(() => {
                if (this.$refs.papers != undefined) {
                    this.$refs.papers.refresh()
                }
            })
        },
        change_tab: function (e) {
            let index = e.index
            this.focus_stuff_id = this.tabs[index].id;
            this.refresh_paper();
        },
        do_edit: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/exam/del_question', {
                    id: this.focus_question.id
                })
                await this.$send_req('/exam/add_question', this.new_question);

                uni.startPullDownRefresh();
            }
            this.show_edit_confirm = false;
        },
        prepare_edit: function (item) {
            this.focus_question = item;
            this.new_question = {
                name: item.name,
                option_answers: item.option_answers.map(op => {
                    return {
                        name: op.name,
                        is_correct: op.is_correct,
                    }
                })
            };
            this.show_edit_confirm = true;
        },
        prepare_delete: function (item) {
            this.focus_question = item;
            this.show_delete_confirm = true;
        },
        do_delete: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/exam/del_question', {
                    id: this.focus_question.id
                })
                uni.startPullDownRefresh();
            }
            this.show_delete_confirm = false;
        },
        get_questions: async function (pageNo) {
            let resp = await this.$send_req('/exam/get_question', {
                pageNo: pageNo
            });
            return resp.questions;
        },
        add_question: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'name',
                    rule: ['required'],
                    msg: ['请输入题目']
                }];
                let val_ret = await this.$refs.add_question.validator(this.new_question, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                for (let index = 0; index < this.new_question.option_answers.length; index++) {
                    let sub_val_ret = await this.$refs.add_question.validateField('name', this.new_question.option_answers[index], [{
                        name: 'name',
                        rule: ['required'],
                        msg: ['请输入选项' + (index + 1)]
                    }]);
                    if (!sub_val_ret.isPassed) {
                        return;
                    }
                }
                await this.$send_req('/exam/add_question', this.new_question);
                uni.startPullDownRefresh();
            }
            this.show_question_add = false;
            this.new_question = {
                name: '',
                option_answers: [],
            };
        },
        add_options: function () {
            this.new_question.option_answers.push({
                name: '',
                is_correct: this.new_question.option_answers.length == 0,
            });
        },
        set_correct: function (index) {
            let cur_op = this.new_question.option_answers[index];
            if (cur_op.is_correct) {
                this.new_question.option_answers.forEach((op, i) => {
                    if (i != index) {
                        op.is_correct = false;
                    }
                });
            } else {
                this.new_question.option_answers[0].is_correct = true;
            }
        },
        sectionChange: function (e) {
            this.cur_page = e;
            this.refresh_paper();
        },
        refresh_questions: function () {
            this.$nextTick(() => {
                if (this.$refs.questions != undefined) {
                    this.$refs.questions.refresh()
                }
            })
        },
    },
    onPullDownRefresh: function () {
        this.refresh_questions();
        this.refresh_paper();
        uni.stopPullDownRefresh();
    },
    onLoad: async function () {
        let stuff = [];
        let index = 0;
        while (true) {
            let res = await this.$send_req('/stuff/get_all', {
                pageNo: index
            });
            if (res.stuff.length == 0) {
                break;
            }
            stuff = stuff.concat(res.stuff);
            index++;
        }
        this.all_stuff = stuff;
        if (this.all_stuff.length > 0) {
            this.focus_stuff_id = this.all_stuff[0].id;
            this.refresh_paper();
        }
    },
}
</script>

<style scoped>
.exam-config-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #eef1ff 0%, #f7f8fc 42%, #f3f5f9 100%);
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.hero {
    position: relative;
    overflow: hidden;
    padding: 36rpx 32rpx 48rpx;
    background: linear-gradient(135deg, #2F3FCF 0%, #465CFF 55%, #6B7CFF 100%);
}

.hero-logo-bg {
    position: absolute;
    right: -20rpx;
    top: -10rpx;
    width: 220rpx;
    height: 220rpx;
    opacity: 0.18;
}

.hero-logo-img {
    width: 100%;
    height: 100%;
}

.hero-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
}

.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.78);
    letter-spacing: 4rpx;
}

.hero-title {
    margin-top: 10rpx;
    font-size: 44rpx;
    font-weight: 700;
    color: #fff;
}

.hero-sub {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.86);
}

.shell {
    margin: -24rpx 24rpx 0;
    position: relative;
    z-index: 2;
}

.seg {
    display: flex;
    background: #fff;
    border-radius: 16rpx;
    padding: 8rpx;
    box-shadow: 0 8rpx 24rpx rgba(47, 63, 207, 0.08);
    margin-bottom: 20rpx;
}

.seg-item {
    flex: 1;
    height: 68rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
}

.seg-item-off {
    background: transparent;
}

.seg-text {
    font-size: 28rpx;
    color: #667085;
}

.seg-text-on {
    color: #fff;
    font-weight: 600;
}

.q-card,
.p-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.05);
}

.q-head,
.p-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16rpx;
}

.q-title,
.p-name {
    flex: 1;
    font-size: 30rpx;
    font-weight: 600;
    color: #1d2129;
    line-height: 1.4;
    padding-right: 16rpx;
}

.q-actions {
    display: flex;
    flex-shrink: 0;
}

.q-act {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.opt-row {
    display: flex;
    align-items: flex-start;
    padding: 10rpx 0;
}

.opt-mark {
    width: 36rpx;
    height: 36rpx;
    margin-right: 12rpx;
    margin-top: 2rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.opt-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    border: 2rpx solid #c9cdd4;
    box-sizing: border-box;
}

.opt-text {
    flex: 1;
    font-size: 26rpx;
    color: #4e5969;
    line-height: 1.45;
}

.opt-text.ok {
    color: #2BA471;
    font-weight: 500;
}

.p-tag {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #2F3FCF;
    background: #eef1ff;
    padding: 6rpx 14rpx;
    border-radius: 8rpx;
}

.p-q-row {
    display: flex;
    align-items: center;
    background: #f8f9fc;
    border-radius: 10rpx;
    padding: 16rpx 18rpx;
    margin-bottom: 12rpx;
}

.p-q-name {
    flex: 1;
    font-size: 26rpx;
    color: #4e5969;
    line-height: 1.4;
    padding-right: 12rpx;
}

.p-q-del {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.p-actions {
    display: flex;
    margin-top: 8rpx;
}

.p-btn {
    flex: 1;
    height: 64rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
}

.p-btn:last-child {
    margin-right: 0;
}

.p-btn.ok {
    background: #e8f8f0;
}

.p-btn.danger {
    background: #fdecee;
}

.p-btn.ok .p-btn-text {
    color: #2BA471;
}

.p-btn.danger .p-btn-text {
    color: #E34D59;
}

.p-btn-text {
    font-size: 26rpx;
    font-weight: 500;
}

.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    border-top: 1rpx solid #EEF1F8;
    box-shadow: 0 -8rpx 24rpx rgba(26, 31, 54, 0.06);
}

.primary-btn {
    height: 84rpx;
    border-radius: 14rpx;
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
    display: flex;
    align-items: center;
    justify-content: center;
}

.primary-btn-text {
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
}

.stuff-tabs {
    margin-bottom: 12rpx;
    background: #fff;
    border-radius: 12rpx;
    overflow: hidden;
}

.popup-head {
    padding: 28rpx 32rpx 12rpx;
}

.popup-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1d2129;
}

.correct-row {
    display: flex;
    align-items: center;
    padding-right: 12rpx;
}

.correct-label {
    font-size: 24rpx;
    color: #667085;
    margin-right: 12rpx;
}

.form-tag {
    margin: 16rpx 24rpx 8rpx;
    height: 64rpx;
    border-radius: 12rpx;
    background: #eef1ff;
    display: flex;
    align-items: center;
    justify-content: center;
}

.form-tag-text {
    font-size: 26rpx;
    color: #2F3FCF;
    font-weight: 500;
}
</style>

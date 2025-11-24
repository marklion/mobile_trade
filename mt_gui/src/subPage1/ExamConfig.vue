<template>
<view>
    <u-subsection :list="sub_pages" :current="cur_page" @change="sectionChange"></u-subsection>
    <view v-if="cur_page == 0">
        <list-show ref="questions" :fetch_function="get_questions" height="85vh" search_key="name" v-model="all_questions">
            <view class="brief_section" v-for="single_q in all_questions" :key="single_q.id">
                <fui-section :title="single_q.name" isLine>
                    <view slot="right">
                        <fui-icon name="close" color="red" @click="prepare_delete(single_q)"></fui-icon>
                        <fui-icon name="edit" color="warning" @click="prepare_edit(single_q)"></fui-icon>
                    </view>
                </fui-section>
                <view v-for="item in single_q.option_answers" :key="item.id" style="padding-left:16px">
                    <fui-icon name="checkround" size="32"></fui-icon>
                    <fui-text :type="item.is_correct?'success': 'black'" :text="item.name" size="32"></fui-text>
                </view>
            </view>
        </list-show>
        <fui-button text="新增" @click="show_question_add = true"></fui-button>
    </view>
    <view v-else-if="cur_page == 1">
        <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
        <list-show ref="papers" :fetch_function="get_papers" height="80vh" search_key="name" v-model="all_papers" :fetch_params="[focus_stuff_id]">
            <view v-for="single_p in all_papers" :key="single_p.id">
                <fui-card :margin="['20rpx', '20rpx']" shadow="0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)" :title="single_p.name" :tag="'共' + single_p.questions.length + '题'">
                    <view style="padding: 0 20rpx;position: relative;">
                        <view v-for="single_question in single_p.questions" :key="single_question.id">
                            <fui-notice-bar :content="single_question.name" background="#fff8d5">
                                <view slot="right">
                                    <fui-icon name="close" color="red" @click="prepare_unlink_question(single_question, single_p)"></fui-icon>
                                </view>
                            </fui-notice-bar>
                        </view>
                        <view style="display:flex; flex-wrap: wrap;">
                            <fui-tag text="新增题目" :scaleRatio="0.8" originLeft type="success" @click="prepare_link_question(single_p)"></fui-tag>
                            <fui-tag text="删除试卷" :scaleRatio="0.8" originLeft type="danger" @click="prepare_delete_paper(single_p)"></fui-tag>
                        </view>
                    </view>
                </fui-card>
            </view>
        </list-show>
        <fui-button text="新增" @click="show_paper_add = true"></fui-button>
    </view>
    <fui-bottom-popup :show="show_link_question" @close="show_link_question= false">
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
                <view>
                    <fui-text>是否正确答案</fui-text>
                    <u-switch v-model="single_o.is_correct" @change="set_correct(index)"></u-switch>
                </view>
            </fui-input>
            <fui-tag text="增加选项" type="primary" @click="add_options"></fui-tag>
        </fui-form>
    </fui-modal>
    <fui-modal width="600" :show="show_question_add" @click="add_question" v-if="show_question_add">
        <fui-form ref="add_question" top="100">
            <fui-input required label="题目" borderTop placeholder="请输入题目" v-model="new_question.name"></fui-input>
            <fui-input v-for="(single_o, index) in new_question.option_answers" :key="index" required :label="'选项' + (index+ 1)" borderTop placeholder="请输入选项" v-model="single_o.name">
                <view>
                    <fui-text>是否正确答案</fui-text>
                    <u-switch v-model="single_o.is_correct" @change="set_correct(index)"></u-switch>
                </view>
            </fui-input>
            <fui-tag text="增加选项" type="primary" @click="add_options"></fui-tag>
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
.brief_section {
    border: 3px dashed #45d5bd;
    border-radius: 10px;
    /* 添加圆角 */
    margin-bottom: 20px;
}
</style>

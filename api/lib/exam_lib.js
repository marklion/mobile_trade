const db_opt = require('../db_opt')
module.exports = {
    plan_pass_exam:async function(plan) {
        let ret = false;
        if (plan.stuff.need_exam == false)
        {
            ret = true;
        }
        else
        {
            let req_papers = await plan.stuff.getExam_papers();
            if (req_papers.length == 0)
            {
                ret = true;
            }
            else
            {
                ret = true;
                for (let index = 0; index < req_papers.length; index++) {
                    const element = req_papers[index];
                    let exam = await element.getExams({where:{planId:plan.id}});
                    if (exam.length == 0)
                    {
                        ret = false;
                        break;
                    }
                }
            }
        }

        return ret;
    },
    add_question:async function(name, options, company) {
        let er = await company.getQuestions({where: {name: name}})
        if (er.length > 0)
        {
            throw {err_msg:'题目已存在'}
        }
        let nq = await company.createQuestion({name: name});
        for (let index = 0; index < options.length; index++) {
            const element = options[index];
            await nq.createOption_answer({name: element.name, is_correct: element.is_correct})
        }
    },
    del_question:async function(id, company) {
        let er = await company.getQuestions({where: {id: id}})
        if (er.length == 0)
        {
            throw {err_msg:'题目不存在'}
        }
        let ops = await er[0].getOption_answers()
        for (let index = 0; index < ops.length; index++) {
            const element = ops[index];
            await element.destroy();
        }
        await er[0].destroy()
    },
    get_all_questions:async function(company, pageNo) {
        let sq = db_opt.get_sq();
        let resp = await company.getQuestions({
            offset:pageNo * 20,
            limit:20,
            include:[
                sq.models.option_answer,
                sq.models.exam_paper,
            ],
        });
        let count = await company.countQuestions();

        return {questions:resp, total:count}
    },
    add_exam_paper:async function(name, stuff) {
        let er = await stuff.getExam_papers({where: {name: name}})
        if (er.length > 0)
        {
            throw {err_msg:'试卷已存在'}
        }
        await stuff.createExam_paper({name: name})
    },
    del_exam_paper:async function(id, company) {
        let er = await db_opt.get_sq().models.exam_paper.findByPk(id)
        let stuff = await er.getStuff();
        if (await company.hasStuff(stuff) == false)
        {
            throw {err_msg:'试卷不存在'}
        }
        await er.destroy()
    },
    get_all_paper:async function(stuff, pageNo) {
        let papers = await stuff.getExam_papers({
            offset: pageNo * 20,
            limit: 20,
            include: [
                {
                    model: db_opt.get_sq().models.question,
                    include: [
                        db_opt.get_sq().models.option_answer
                    ]
                }
            ],
        });
        let count = await stuff.countExam_papers();
        return { papers: papers, total: count }
    },
    oprate_question_based_on_paper: async function (paper_id, question_id, stuff, is_add) {
        let company = await stuff.getCompany();
        let er = await stuff.getExam_papers({ where: { id: paper_id } })
        let eq = await company.getQuestions({ where: { id: question_id } })
        if (er.length == 0) {
            throw { err_msg: '试卷不存在' }
        }
        if (eq.length == 0) {
            throw { err_msg: '题目不存在' }
        }
        if (is_add) {
            await er[0].addQuestion(eq[0])
        }
        else {
            await er[0].removeQuestion(eq[0])
        }
    },
    get_exam_by_plan:async function(plan) {
        let exams = await plan.getExams({
            include: [
                {
                    model: db_opt.get_sq().models.exam_paper,
                    include: [
                        {
                            model: db_opt.get_sq().models.question,
                            include: [
                                db_opt.get_sq().models.option_answer
                            ]
                        }
                    ]
                },{
                    model:db_opt.get_sq().models.exam_answer,
                    include:[
                        db_opt.get_sq().models.option_answer
                    ]
                }
            ]
        });
        return exams;
    },

}
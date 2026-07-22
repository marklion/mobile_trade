const db_opt = require('../db_opt')
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const uuid = require('uuid');
const officegen = require('officegen');

function was_selected(option, exam) {
    if (!exam.exam_answers) {
        return false;
    }
    for (let i = 0; i < exam.exam_answers.length; i++) {
        const answer = exam.exam_answers[i];
        if (answer.option_answer && answer.option_answer.id == option.id) {
            return true;
        }
    }
    return false;
}

function option_label(index) {
    return String.fromCharCode('A'.charCodeAt(0) + index);
}

function write_exam_docx(plan, exams) {
    return new Promise((resolve, reject) => {
        let docx = officegen('docx');
        docx.on('error', reject);

        docx.createP({ align: 'center' }).addText('司机考试试卷', { bold: true, font_size: 20 });
        docx.createP().addText('订单号：' + plan.id, { font_size: 12 });
        docx.createP().addText('计划日期：' + (plan.plan_time || ''), { font_size: 12 });
        docx.createP().addText('主车号：' + (plan.main_vehicle ? plan.main_vehicle.plate : ''), { font_size: 12 });
        docx.createP().addText('挂车号：' + (plan.behind_vehicle ? plan.behind_vehicle.plate : ''), { font_size: 12 });
        docx.createP().addText('司机：' + (plan.driver ? plan.driver.name : ''), { font_size: 12 });
        docx.createP().addText('司机电话：' + (plan.driver ? plan.driver.phone : ''), { font_size: 12 });
        docx.createP().addText('物料：' + (plan.stuff ? plan.stuff.name : ''), { font_size: 12 });

        for (let i = 0; i < exams.length; i++) {
            const exam = exams[i];
            const paper = exam.exam_paper || {};
            const questions = paper.questions || [];
            const per_score = questions.length > 0 ? (100 / questions.length) : 0;

            docx.createP().addText('');
            docx.createP().addText('试卷：' + (paper.name || '') + '　　得分：' + (exam.score != null ? exam.score : ''), {
                bold: true,
                font_size: 14,
            });

            for (let q = 0; q < questions.length; q++) {
                const question = questions[q];
                const options = question.option_answers || [];
                let correct_labels = [];
                let selected_correct = false;
                let selected_label = '';

                docx.createP().addText((q + 1) + '. ' + (question.name || ''), { bold: true, font_size: 12 });

                for (let o = 0; o < options.length; o++) {
                    const option = options[o];
                    const label = option_label(o);
                    let suffix = '';
                    if (option.is_correct) {
                        correct_labels.push(label);
                    }
                    if (was_selected(option, exam)) {
                        selected_label = label;
                        selected_correct = !!option.is_correct;
                        suffix = '（司机所选）';
                    }
                    docx.createP().addText('    ' + label + '. ' + (option.name || '') + suffix, { font_size: 12 });
                }

                const answer_text = correct_labels.length > 0 ? correct_labels.join('、') : '无';
                const question_score = selected_correct ? parseFloat(per_score.toFixed(2)) : 0;
                docx.createP().addText('    答案：' + answer_text + '　　本题得分：' + question_score, { font_size: 12 });
                if (selected_label) {
                    docx.createP().addText('    司机作答：' + selected_label + (selected_correct ? '（正确）' : '（错误）'), { font_size: 12 });
                }
            }
        }

        const plate = plan.main_vehicle ? plan.main_vehicle.plate : 'unknown';
        const file_name = `司机考试试卷_${plan.id}-${plate}.docx`;
        const download_path = path.resolve('/database/uploads/', file_name);
        const out = fs.createWriteStream(download_path);
        out.on('error', reject);
        out.on('close', () => resolve(download_path));
        docx.generate(out);
    });
}

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
    add_exam_paper:async function(name, stuff, pass_score) {
        let er = await stuff.getExam_papers({where: {name: name}})
        if (er.length > 0)
        {
            throw {err_msg:'试卷已存在'}
        }
        await stuff.createExam_paper({name: name, pass_score: pass_score || 80})
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
    get_all_paper: async function (stuff, pageNo) {
        let papers = await stuff.getExam_papers({
            offset: pageNo * 20,
            limit: 20,
            include: [
                {
                    model: db_opt.get_sq().models.question,
                    include: [
                        {
                            model: db_opt.get_sq().models.option_answer,
                            order: [['id', 'ASC']],
                            separate: true,
                        }
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
    get_exam_by_plan: async function (plan) {
        let exams = await plan.getExams({
            include: [
                {
                    model: db_opt.get_sq().models.exam_paper,
                    include: [
                        {
                            model: db_opt.get_sq().models.question,
                            include: [
                                {
                                    model: db_opt.get_sq().models.option_answer,
                                    order: [['id', 'ASC']],
                                    separate: true,
                                }
                            ]
                        }
                    ]
                }, {
                    model: db_opt.get_sq().models.exam_answer,
                    include: [
                        db_opt.get_sq().models.option_answer
                    ]
                }
            ]
        });
        return exams;
    },
    export_exam_papers: async function (plans, start_time, end_time) {
        let filePaths = [];
        for (let index = 0; index < plans.length; index++) {
            const plan = plans[index];
            const exams = await this.get_exam_by_plan(plan);
            if (!exams || exams.length === 0) {
                continue;
            }
            filePaths.push(await write_exam_docx(plan, exams));
        }
        if (filePaths.length === 0) {
            throw { err_msg: '未找到司机考试记录' };
        }

        const zip_name = `司机考试试卷_${uuid.v4().split('-')[0]}_${start_time}_至_${end_time}.zip`;
        const zip_path = path.resolve('/database/uploads/', zip_name);
        const output = fs.createWriteStream(zip_path);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(output);
        for (const filePath of filePaths) {
            archive.append(fs.createReadStream(filePath), { name: path.basename(filePath) });
        }
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.finalize();
        });
        await Promise.all(filePaths.map(async (filePath) => {
            try {
                await fs.promises.unlink(filePath);
            } catch (err) {
                console.error(`无法删除文件 ${filePath}: ${err.message}`);
            }
        }));
        return '/uploads/' + zip_name;
    },

}
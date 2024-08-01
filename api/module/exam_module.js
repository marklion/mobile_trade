const api_param_result_define = require('../api_param_result_define');
const db_opt = require('../db_opt');
const exam_lib = require('../lib/exam_lib')
const rbac_lib = require('../lib/rbac_lib')
module.exports = {
    name: 'exam',
    description: '考试管理',
    methods: {
        add_question: {
            name: '创建题目',
            description: '创建题目',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '题目', example: '题目' },
                option_answers:{type:Array, have_to:true, mean:'选项', explain:{
                    name:{type:String, have_to:true, mean:'选项', example:'选项'},
                    is_correct:{type:Boolean, have_to:true, mean:'是否正确', example:true},
                }},
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                await exam_lib.add_question(body.name, body.option_answers, company);
                return { result: true }
            },
        },
        del_question:{
            name: '删除题目',
            description: '删除题目',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '题目ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                await exam_lib.del_question(body.id, company);
                return { result: true }
            },
        },
        get_question:{
            name: '获取题目',
            description: '获取题目',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                questions: { type: Array, mean: '题目', explain:{
                    id:{type:Number, mean:'ID', example:1},
                    name:{type:String, mean:'题目', example:'题目'},
                    option_answers:{type:Array, mean:'选项', explain:{
                        id:{type:Number, mean:'ID', example:1},
                        name:{type:String, mean:'选项', example:'选项'},
                        is_correct:{type:Boolean, mean:'是否正确', example:true},
                    }},
                    exam_papers:{type:Array, mean:'试卷', explain:{
                        id:{type:Number, mean:'ID', example:1},
                        name:{type:String, mean:'试卷', example:'试卷'},
                    }},
                }},
            },
            func: async function (body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                return await exam_lib.get_all_questions(company, body.pageNo);
            },
        },
        add_paper:{
            name: '创建试卷',
            description: '创建试卷',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '试卷', example: '试卷' },
                stuff_id:{type:Number, have_to:true, mean:'物料ID', example:1},
            },
            result:{
                result:{type:Boolean, mean:'结果', example:true},
            },
            func:async function(body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff({where:{id:body.stuff_id}});
                if (stuff.length == 0)
                {
                    throw {err_msg:'物料不存在'}
                }
                await exam_lib.add_exam_paper(body.name, stuff[0]);
                return {result:true}
            },
        },
        del_paper:{
            name: '删除试卷',
            description: '删除试卷',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '试卷ID', example: 1 },
            },
            result:{
                result:{type:Boolean, mean:'结果', example:true},
            },
            func:async function(body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                await exam_lib.del_exam_paper(body.id, company);
                return {result:true}
            },
        },
        get_paper:{
            name: '获取试卷',
            description: '获取试卷',
            is_write: false,
            is_get_api: true,
            params: {
                stuff_id:{type:Number, have_to:true, mean:'物料ID', example:1},
            },
            result:{
                papers:{type:Array, mean:'试卷', explain:api_param_result_define.exam_paper_info},
            },
            func:async function(body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff({where:{id:body.stuff_id}});
                if (stuff.length == 0)
                {
                    throw {err_msg:'物料不存在'}
                }

                return await exam_lib.get_all_paper(stuff[0], body.pageNo);
            },
        },
        add_question2paper:{
            name: '添加题目到试卷',
            description: '添加题目到试卷',
            is_write: true,
            is_get_api: false,
            params: {
                question_id: { type: Number, have_to: true, mean: '题目ID', example: 1 },
                paper_id:{type:Number, have_to:true, mean:'试卷ID', example:1},
            },
            result:{
                result:{type:Boolean, mean:'结果', example:true},
            },
            func:async function(body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                let ep = await db_opt.get_sq().models.exam_paper.findByPk(body.paper_id);
                let stuff = await ep.getStuff();
                if (await company.hasStuff(stuff) == false)
                {
                    throw {err_msg:'试卷不存在'}
                }
                await exam_lib.oprate_question_based_on_paper(body.paper_id, body.question_id, stuff[0], true);
                return {result:true}
            },
        },
        del_question_from_paper:{
            name: '从试卷删除题目',
            description: '从试卷删除题目',
            is_write: true,
            is_get_api: false,
            params: {
                question_id: { type: Number, have_to: true, mean: '题目ID', example: 1 },
                paper_id:{type:Number, have_to:true, mean:'试卷ID', example:1},
            },
            result:{
                result:{type:Boolean, mean:'结果', example:true},
            },
            func:async function(body, token) {
                let company  = await rbac_lib.get_company_by_token(token);
                let ep = await db_opt.get_sq().models.exam_paper.findByPk(body.paper_id);
                let stuff = await ep.getStuff();
                if (await company.hasStuff(stuff) == false)
                {
                    throw {err_msg:'试卷不存在'}
                }
                await exam_lib.oprate_question_based_on_paper(body.paper_id, body.question_id, stuff[0], false);
                return {result:true}
            },
        },
        get_exam_by_plan:{
            name: '获取计划的考试',
            description: '获取计划的考试',
            is_write: false,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                exams: { type: Array, mean: '考试', explain: api_param_result_define.exam_info },
            },
            func: async function (body, token) {
                let plan = await db_opt.get_sq().models.plan.findByPk(body.plan_id);
                return { exams: await exam_lib.get_exam_by_plan(plan) };
            },
        },
    }
}
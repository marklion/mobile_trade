const api_param_result_define = require('../api_param_result_define');
const sc_lib = require('../lib/sc_lib');
const fc_lib = require('../lib/fc_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
const util_lib = require('../lib/util_lib');
const sq = db_opt.get_sq();
const moment = require('moment');
const plan_lib = require('../lib/plan_lib');
const common = require('./common');
async function could_config_stuff(stuff_id, token) {
    let ret = false;
    let company = await rbac_lib.get_company_by_token(token);
    let stuff = await sq.models.stuff.findByPk(stuff_id);
    if (stuff && company && await company.hasStuff(stuff)) {
        ret = true;
    }
    return ret;
}

function fc_table_explain(has_plan = false) {
    let ret = {
        id: { type: Number, mean: '表ID', example: 1 },
        name: { type: String, mean: '表名', example: '表名' },
        template_path: { type: String, mean: '模板', example: '模板' },
        field_check_items: {
            type: Array, mean: '检查项', explain: {
                id: { type: Number, mean: '检查项ID', example: 1 },
                name: { type: String, mean: '检查项名', example: '检查项名' },
            }
        },
        rbac_role: {
            type: Object, mean: '绑定角色', explain: {
                id: { type: Number, mean: '角色ID', example: 1 },
                name: { type: String, mean: '角色名', example: '角色名' },
            }
        }
    }
    if (has_plan) {
        ret.fc_plan_table = {
            type: Object, mean: '计划现场检查表', explain: {
                id: { type: Number, mean: '计划表ID', example: 1 },
                finish_time: { type: String, mean: '完成时间', example: '2020-01-01' },
                fc_check_results: {
                    type: Array, mean: '检查结果', explain: {
                        id: { type: Number, mean: '结果ID', example: 1 },
                        pass_time: { type: String, mean: '通过时间', example: '2020-01-01' },
                        field_check_item: {
                            type: Object, mean: '检查项', explain: {
                                id: { type: Number, mean: '检查项ID', example: 1 },
                                name: { type: String, mean: '检查项名', example: '检查项名' },
                            }
                        },
                    }
                },
                rbac_user: {
                    type: Object, mean: '提交人', explain: {
                        id: { type: Number, mean: '用户ID', example: 1 },
                        name: { type: String, mean: '用户名', example: '用户名' }
                    }
                }
            }
        }
    }
    return ret;
}


module.exports = {
    name: 'sc',
    description: '安检管理',
    methods: {
        fetch_req: {
            name: '新增或修改安检需求',
            description: '新增或修改安检需求',

            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                name: { type: String, have_to: true, mean: '需求名称', example: '安检需求' },
                need_attach: { type: Boolean, have_to: true, mean: '是否需要附件', example: true },
                need_input: { type: Boolean, have_to: true, mean: '是否需要输入', example: true },
                need_expired: { type: Boolean, have_to: true, mean: '是否需要过期时间', example: true },
                belong_type: { type: Number, have_to: true, mean: '所属类型,0->司乘,1->主车,2->挂车', example: 0 },
                prompt: { type: String, have_to: false, mean: '提示', example: '请输入' },
                add_to_export: { type: Boolean, have_to: false, mean: '是否添加到导出表', example: false }
            },
            result: api_param_result_define.sc_req_detail,
            func: async function (body, token) {
                return await sc_lib.fetch_sc_req(body, token, body.stuff_id);
            },
        },
        get_req: {
            name: '获取安检需求',
            description: '获取安检需求',

            is_write: false,
            is_get_api: true,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 }
            },
            result: {
                reqs: { type: Array, mean: '需求列表', explain: sc_lib.sc_req_detail }
            },
            func: async function (body, token) {

                return await sc_lib.get_sc_req(body.stuff_id, token, body.pageNo);
            },
        },
        del_req: {
            name: '删除安检需求',
            description: '删除安检需求',

            is_write: true,
            is_get_api: false,
            params: {
                req_id: { type: Number, have_to: true, mean: '需求ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                await sc_lib.del_sc_req(body.req_id, token);
                return { result: true };
            },
        },
        plan_status: {
            name: '安检计划状态',
            description: '安检计划状态',
            is_write: false,
            is_get_api: true,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
            },
            result: {
                reqs: { type: Array, mean: '需求列表', explain: sc_lib.sc_req_detail },
                passed: { type: Boolean, mean: '是否通过', example: true }
            },
            func: async function (body, token) {
                return await sc_lib.get_plan_sc_status(body.plan_id, token, body.pageNo);
            },
        },
        check: {
            name: '安检审核',
            description: '安检审核',
            is_write: true,
            is_get_api: false,
            params: {
                content_id: { type: Number, have_to: true, mean: '内容ID', example: 1 },
                comment: { type: String, have_to: false, mean: '不通过原因', example: '内容错误' },
                plan_id: { type: Number, have_to: false, mean: '计划ID', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                await sc_lib.check_sc_content(body.content_id, token, body.comment, body.plan_id);
                return { result: true };
            },
        },
        add_fc_table: {
            name: '添加现场检查表',
            description: '添加现场检查表',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '表名', example: '表名' },
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                if (!await could_config_stuff(body.stuff_id, token)) {
                    throw { err_msg: '无权限' };
                }
                await fc_lib.add_fc_table(body.name, body.stuff_id);
                return { result: true };
            },
        },
        del_fc_table: {
            name: '删除现场检查表',
            description: '删除现场检查表',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '表ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let fc_table = await fc_lib.get_fc_table(body.id, true);
                if (!await could_config_stuff(fc_table.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                await fc_lib.del_fc_table(body.id);
                return { result: true };
            }
        },
        get_all_fc_table: {
            name: '获取所有现场检查表',
            description: '获取所有现场检查表',
            is_write: false,
            is_get_api: true,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 }
            },
            result: {
                fc_table: {
                    type: Array, mean: '现场检查表', explain: fc_table_explain(),
                }
            },
            func: async function (body, token) {
                if (!await could_config_stuff(body.stuff_id, token)) {
                    throw { err_msg: '无权限' };
                }
                return await fc_lib.get_all_fc_table(body.stuff_id, body.pageNo);
            }
        },
        set_table_template: {
            name: '设置现场检查表模板',
            description: '设置现场检查表模板',
            is_write: true,
            is_get_api: false,
            params: {
                table_id: { type: Number, have_to: true, mean: '表ID', example: 1 },
                template_path: { type: String, have_to: true, mean: '模板', example: '模板' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let fc_table = await fc_lib.get_fc_table(body.table_id, true);
                if (!await could_config_stuff(fc_table.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                await fc_lib.upload_fc_table_template(body.table_id, body.template_path);
                return { result: true };
            },
        },
        add_item2fc_table: {
            name: '添加现场检查表项',
            description: '添加现场检查表项',
            is_write: true,
            is_get_api: false,
            params: {
                table_id: { type: Number, have_to: true, mean: '表ID', example: 1 },
                name: { type: String, have_to: true, mean: '检查项名', example: '检查项名' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let fc_table = await fc_lib.get_fc_table(body.table_id, true);
                if (!await could_config_stuff(fc_table.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                await fc_lib.add_item2fc_table(body.table_id, body.name);
                return { result: true };
            }
        },
        del_fc_item: {
            name: '删除现场检查表项',
            description: '删除现场检查表项',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '检查项ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let fc_item = await fc_lib.get_fc_item(body.id);
                if (!await could_config_stuff(fc_item.field_check_table.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                await fc_lib.del_fc_item(body.id);
                return { result: true };
            }
        },
        get_fc_plan_table: {
            name: '获取现场检查表',
            description: '获取现场检查表',
            is_write: false,
            is_get_api: true,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
            },
            result: {
                fc_plan_tables: {
                    type: Array, mean: '计划现场检查表', explain: fc_table_explain(true),
                },
            },
            func: async function (body, token) {
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (!await could_config_stuff(plan.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                await fc_lib.prepare_empty_fc(body.plan_id);
                return await fc_lib.get_fc_plan_table(body.plan_id, body.pageNo);
            }
        },
        set_fc_pass: {
            name: '设置现场检查项通过',
            description: '设置现场检查项通过',
            is_write: true,
            is_get_api: false,
            params: {
                fc_result_id: { type: Number, have_to: true, mean: '检查结果ID', example: 1 },
                is_pass: { type: Boolean, have_to: true, mean: '是否通过', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let fc_result = await sq.models.fc_check_result.findByPk(body.fc_result_id);
                let fc_item = await fc_lib.get_fc_item(fc_result.fieldCheckItemId);
                if (!await could_config_stuff(fc_item.field_check_table.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                let fc_table = await fc_lib.get_fc_table(fc_item.field_check_table.id, true);
                let user = await rbac_lib.get_user_by_token(token);
                if (!await user.hasRbac_role(fc_table.rbac_role)) {
                    throw { err_msg: '无权限' };
                }
                if (body.is_pass) {
                    fc_result.pass_time = moment().format('YYYY-MM-DD HH:mm:ss');
                }
                else {
                    fc_result.pass_time = null;
                }
                await fc_result.save();

                return { result: true };
            },
        },
        commit_fc_plan: {
            name: '提交现场检查表',
            description: '提交现场检查表',
            is_write: true,
            is_get_api: false,
            params: {
                fc_plan_id: { type: Number, have_to: true, mean: '计划表ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let fc_plan_table = await sq.models.fc_plan_table.findByPk(body.fc_plan_id);
                let plan = await fc_plan_table.getPlan({ include: [sq.models.stuff] });
                if (!await could_config_stuff(plan.stuff.id, token)) {
                    throw { err_msg: '无权限' };
                }
                let fc_table = await fc_lib.get_fc_table(fc_plan_table.fieldCheckTableId, true);
                let user = await rbac_lib.get_user_by_token(token);
                if (!await user.hasRbac_role(fc_table.rbac_role)) {
                    throw { err_msg: '无权限' };
                }
                fc_plan_table.finish_time = moment().format('YYYY-MM-DD HH:mm:ss');
                await fc_plan_table.save();
                await fc_plan_table.setRbac_user(user);
                return { result: true };
            }
        },
        export_fc_table: {
            name: '导出现场检查表',
            description: '导出现场检查表',
            is_write: false,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let plans = [];
                let tmp_plans = await plan_lib.filter_plan4manager(body, token);
                plans = plans.concat(tmp_plans);
                tmp_plans = await plan_lib.filter_plan4manager(body, token, true);
                plans = plans.concat(tmp_plans);
                await common.do_export_later(token, '现场检查表', async () => {
                    return await fc_lib.export_fc(plans);
                });
            },
        },
    }
}
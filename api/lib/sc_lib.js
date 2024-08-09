const db_opt = require('../db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');
const util_lib = require('./util_lib');
module.exports = {
    sc_req_detail: {
        id: { type: Number, have_to: true, mean: 'ID', example: 1 },
        name: { type: String, have_to: true, mean: '需求名称', example: '安检需求' },
        need_attach: { type: Boolean, have_to: true, mean: '是否需要附件', example: true },
        need_input: { type: Boolean, have_to: true, mean: '是否需要输入', example: true },
        need_expired: { type: Boolean, have_to: true, mean: '是否需要过期时间', example: true },
        belong_type: { type: Number, have_to: true, mean: '所属类型,0->司乘,1->主车,2->挂车', example: 0 },
        prompt: { type: String, have_to: false, mean: '提示', example: '请输入' },
        sc_content: {
            type: Object, have_to: false, mean: '安检内容', explain: {
                id: { type: Number, have_to: true, mean: 'ID', example: 1 },
                expired_time: { type: String, have_to: true, mean: '过期时间', example: '2020-01-01 00:00:00' },
                attachment: { type: String, have_to: true, mean: '附件', example: 'http://www.baidu.com' },
                input: { type: String, have_to: true, mean: '输入', example: '请输入' },
                passed: { type: Boolean, have_to: true, mean: '是否通过', example: true },
                checker: { type: String, have_to: true, mean: '检查人', example: '张三' },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                check_time: { type: String, have_to: false, mean: '检查时间', example: '2020-01-01 00:00:00' }
            }
        },
    },
    fetch_sc_req: async function (_req, _token, _stuff_id) {
        let ret = {};
        await this.sc_req_operate(_token, _stuff_id, async function (stuff) {
            let tar_req = undefined;
            let reqs = await stuff.getSc_reqs({ where: { name: _req.name } });
            if (reqs.length == 1) {
                tar_req = reqs[0];
            }
            else {
                tar_req = await stuff.createSc_req({
                    name: _req.name,
                });
            }
            if (tar_req) {
                tar_req.need_attach = _req.need_attach;
                tar_req.need_input = _req.need_input;
                tar_req.need_expired = _req.need_expired;
                tar_req.belong_type = _req.belong_type;
                tar_req.prompt = _req.prompt;
                await tar_req.save();
                ret = tar_req;
            }
            else {
                throw { err_msg: '创建安检需求失败' };
            }

        });
        return ret;
    },
    get_sc_req: async function (_stuff_id, _token, pageNo) {
        let ret = { reqs: [], total: 0 };

        await this.sc_req_operate(_token, _stuff_id, async function (stuff) {
            let found_ret = await stuff.getSc_reqs({
                order: [['id', 'DESC']],
                limit: 20,
                offset: 20 * pageNo
            });
            let count = await stuff.countSc_reqs();
            ret.total = count;
            ret.reqs = found_ret;
        });

        return ret;
    },
    get_sc_status_by_plan: async function (plan, pageNo = -1) {
        let sq = db_opt.get_sq();
        let ret = { reqs: [], total: 0, passed: false }
        let search_cond = {
            order: [[sq.models.sc_content, 'passed'], ['id', 'DESC']],
            include: [
                {
                    model: sq.models.sc_content, required: false, where: {
                        [db_opt.Op.or]: [
                            { driverId: plan.driver.id },
                            { vehicleId: plan.main_vehicle.id },
                            { vehicleId: plan.behind_vehicle.id },
                        ]
                    }
                },
            ],
        };
        if (-1 != pageNo) {
            search_cond.offset = 20 * pageNo;
            search_cond.limit = 20;
        }

        ret.passed = await this.plan_passed_sc(plan.id);
        let found_ret = await plan.stuff.getSc_reqs(search_cond);
        let count = await plan.stuff.countSc_reqs();
        for (let index = 0; index < found_ret.length; index++) {
            const element = found_ret[index].toJSON();
            if (element.sc_contents.length == 1) {
                element.sc_content = element.sc_contents[0];
            }
            delete element.sc_contents;
            ret.reqs.push(element);
        }
        ret.total = count;

        return ret;
    },
    get_sc_driver_req: async function (_open_id, _plan_id, pageNo) {
        let ret = { reqs: [], total: 0, passed: false };
        let plan = await util_lib.get_single_plan_by_id(_plan_id);
        if (plan && plan.driver && plan.driver.open_id == _open_id && plan.stuff) {
            ret = await this.get_sc_status_by_plan(plan, pageNo);
        }
        else {
            throw { err_msg: '无权限' };
        }
        return ret;
    },
    del_sc_req: async function (_req_id, _token) {
        let sq = db_opt.get_sq();
        let sc_req = await sq.models.sc_req.findByPk(_req_id);
        if (sc_req) {
            let stuff = await sc_req.getStuff();
            if (stuff) {
                await this.sc_req_operate(_token, stuff.id, async function () {
                    await sc_req.destroy();
                });
            }
            else {
                throw { err_msg: '未找到货物' };
            }
        }
        else {
            throw { err_msg: '未找到安检要求' };
        }
    },
    sc_req_operate: async function (_token, _stuff_id, _func) {
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(_token);
        let stuff = await sq.models.stuff.findByPk(_stuff_id);
        if (company && stuff && await company.hasStuff(stuff)) {
            await _func(stuff);
        }
        else {
            throw { err_msg: '无权限' }
        }
    },
    plan_passed_sc: async function (_plan_id) {
        let ret = false;
        let plan = await util_lib.get_single_plan_by_id(_plan_id);
        if (plan && plan.status != 3 && plan.stuff) {
            if (plan.stuff.need_sc) {
                let sc_reqs = await plan.stuff.getSc_reqs();
                let passed = true;
                for (let i = 0; i < sc_reqs.length; i++) {
                    let sc_req = sc_reqs[i];
                    let condition = undefined;
                    switch (sc_req.belong_type) {
                        case 0:
                            condition = { driverId: plan.driver.id };
                            break;
                        case 1:
                            condition = { vehicleId: plan.main_vehicle.id };
                            break;
                        case 2:
                            condition = { vehicleId: plan.behind_vehicle.id };
                            break;
                        default:
                            break;
                    }
                    let sc_content = await sc_req.getSc_contents({ where: condition });
                    if (sc_content.length == 1) {
                        sc_content = sc_content[0];
                        if (sc_req.need_expired && sc_content.passed) {
                            expiredDay = moment(moment(sc_content.expired_time)).diff(moment().format('YYYY-MM-DD'), 'days') > 0
                            if (!expiredDay) {
                                sc_content.passed = false;
                                sc_content.comment = '内容已过期';
                                sc_content.check_time = moment().format('YYYY-MM-DD HH:mm:ss');
                                sc_content.checker = '系统';
                                await sc_content.save();
                            }
                        }
                        if (sc_content.passed) {
                            passed = passed && true;
                        }
                        else {
                            passed = false;
                        }
                    }
                    else {
                        passed = false;
                    }
                }
                ret = passed
            }
            else {
                ret = true;
            }

        }

        return ret;
    },
    driver_upload_content: async function (_open_id, _req_id, _plan_id, _input, _attachment, _expired_time, token) {
        let sq = await db_opt.get_sq();
        let sc_req = await sq.models.sc_req.findByPk(_req_id, { include: [sq.models.stuff] });
        let plan = await util_lib.get_single_plan_by_id(_plan_id);
        let company = await rbac_lib.get_company_by_token(token);
        if (sc_req && plan && plan.driver && plan.stuff && (plan.driver.open_id == _open_id || (company && await company.hasStuff(plan.stuff))) && plan.stuff.id == sc_req.stuff.id) {
            let condition = undefined;
            switch (sc_req.belong_type) {
                case 0:
                    condition = { driverId: plan.driver.id };
                    break;
                case 1:
                    condition = { vehicleId: plan.main_vehicle.id };
                    break;
                case 2:
                    condition = { vehicleId: plan.behind_vehicle.id };
                    break;
                default:
                    break;
            }
            let content = undefined;
            let exist_content = await sc_req.getSc_contents({ where: condition });
            if (exist_content.length == 1) {
                content = exist_content[0];
            }
            else {
                content = await sc_req.createSc_content(condition);
            }
            if (content) {
                content.input = _input;
                content.attachment = _attachment;
                content.expired_time = _expired_time;
                await content.save();
            }
            else {
                throw { err_msg: '创建安检内容失败' };

            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    get_plan_sc_status: async function (_plan_id, _token, pageNo) {
        let ret = { reqs: [], total: 0, passed: false };
        let plan = await util_lib.get_single_plan_by_id(_plan_id);
        let company = await rbac_lib.get_company_by_token(_token);
        if (company && plan && plan.stuff && await company.hasStuff(plan.stuff)) {
            ret = await this.get_sc_status_by_plan(plan, pageNo);
        }
        else {
            throw { err_msg: '无权限' };
        }
        return ret;
    },
    check_sc_content: async function (_content_id, _token, _comment) {
        let sq = db_opt.get_sq();
        let content = await sq.models.sc_content.findByPk(_content_id, {
            include: [{
                model: sq.models.sc_req,
                include: [{
                    model: sq.models.stuff,
                    include: [sq.models.company]
                }]
            }]
        });
        let company = await rbac_lib.get_company_by_token(_token);
        let user = await rbac_lib.get_user_by_token(_token);
        if (user && company && content && content.sc_req && content.sc_req.stuff && content.sc_req.stuff.company && content.sc_req.stuff.company.id == company.id) {
            if (!_comment) {
                content.passed = true;
                content.comment = '';
            }
            else {
                content.passed = false;
                content.comment = _comment;
            }
            content.check_time = moment().format('YYYY-MM-DD HH:mm:ss');
            content.checker = user.name;
            await content.save();
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
};
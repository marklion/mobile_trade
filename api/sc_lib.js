const db_opt = require('./db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');
const plan_lib = require('./plan_lib');
module.exports = {
    fetch_sc_req: async function (_req, _token, _stuff_id) {
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
                await tar_req.save();
            }
            else {
                throw { err_msg: '创建安检需求失败' };
            }

        });
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
    get_sc_status_by_plan: async function (plan, pageNo) {
        let sq = db_opt.get_sq();
        let ret = { reqs: [], total: 0, passed:false}
        let found_ret = await plan.stuff.getSc_reqs({
            order: [[sq.models.sc_content, 'passed'], ['id', 'DESC']],
            limit: 20,
            offset: 20 * pageNo,
            include: [
                {model:sq.models.sc_content, required:false, where:{
                    [db_opt.Op.or]:[
                        {driverId: plan.driver.id},
                        {vehicleId: plan.main_vehicle.id},
                        {vehicleId: plan.behind_vehicle.id},
                    ]
                }},
            ],
        });
        let count = await plan.stuff.countSc_reqs();
        for (let index = 0; index < found_ret.length; index++) {
            const element = found_ret[index];
            if (element.sc_contents.length == 1) {
                element.sc_content = element.sc_contents[0];
            }
            delete element.sc_contents;
        }
        ret.total = count;
        ret.reqs = found_ret;
        if (ret.reqs.length <= 0 || (ret.reqs[0].sc_content && ret.reqs[0].sc_content.passed)) {
            ret.passed = true;
        }

        return ret;
    },
    get_sc_driver_req: async function (_open_id, _plan_id, pageNo) {
        let ret = { reqs: [], total: 0, passed: false};
        let plan = await plan_lib.get_single_plan_by_id(_plan_id);
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
        let plan = await plan_lib.get_single_plan_by_id(_plan_id);
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
                    let sc_content = sc_req.getSc_contents({ where: condition });
                    if (sc_content.length != 1 || !sc_content[0].passed) {
                        passed = false;
                        break;
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
    driver_upload_content: async function (_open_id, _req_id, _plan_id, _input, _attachment, _expired_time) {
        let sq = await db_opt.get_sq();
        let sc_req = await sq.models.sc_req.findByPk(_req_id, { include: [sq.models.stuff] });
        let plan = await plan_lib.get_single_plan_by_id(_plan_id);
        if (sc_req && plan && plan.driver && plan.driver.open_id == _open_id && plan.stuff && plan.stuff.id == sc_req.stuff.id) {
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
        let plan = await plan_lib.get_single_plan_by_id(_plan_id);
        let company = await rbac_lib.get_company_by_token(_token);
        if (company && plan && plan.stuff && await company.hasStuff(plan.stuff)) {
            ret = await this.get_sc_status_by_plan(plan, pageNo);
        }
        else {
            throw { err_msg: '无权限' };
        }
        return ret;
    },
};
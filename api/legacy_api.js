const db_opt = require("./db_opt");
const cash_lib = require("./lib/cash_lib");
const plan_lib = require("./lib/plan_lib");
const rbac_lib = require("./lib/rbac_lib");
async function get_base_id_by_name(name) {
    let ret = '';
    let base = await db_opt.get_sq().models.hd_base_info.findOne({ where: { name: name } });
    if (base) {
        ret = base.base_id;
    }
    return ret;
}
async function make_plan_resp(plan) {
    let full_plan = await plan_lib.get_single_plan_by_id(plan.id);
    return {
        id: 'n' + full_plan.id,
        plateNo: full_plan.main_vehicle.plate,
        backPlateNo: full_plan.behind_vehicle.plate,
        stuffName: full_plan.stuff.name,
        stuffId: await get_base_id_by_name(full_plan.stuff.name),
        enterWeight: full_plan.enter_count,
        companyName: full_plan.company.name,
        driverName: full_plan.driver.name,
        isSale: !full_plan.is_buy,
        price: full_plan.unit_price,
        customerId: await get_base_id_by_name(full_plan.company.name),
        orderNo: 'mt' + full_plan.id,
        multiStuff: [],
        isMulti: false,
        createTime: full_plan.plan_time,
        driverPhone: full_plan.driver.phone,
        driverId: full_plan.driver.id_card,
        supplierName: full_plan.company.name,
        supplierId: await get_base_id_by_name(full_plan.company.name),
        vehicleTeamName: full_plan.company.name,
        vehicleTeamId: await get_base_id_by_name(full_plan.company.name),
        tmd_no: '',
        attachUrl: full_plan.enter_attachment,
        sale_address: full_plan.drop_address,
        comment: full_plan.comment,
        transCompanyName: full_plan.trans_company_name,
    };
}
module.exports = {
    install(app) {
        app.post('/pa_rest/vehicle_info', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            var plateNo = req.body.plateNo;
            var driverId = req.body.driverId ? req.body.driverId : "";
            try {
                let company = await rbac_lib.get_company_by_token(token);
                let main_vehicle = await db_opt.get_sq().models.vehicle.findOne({ where: { plate: plateNo } });
                let driver = await db_opt.get_sq().models.driver.findOne({ where: { id_card: driverId } })
                let plan_content_cond = { mainVehicleId: 0 };
                if (company) {
                    if (main_vehicle != undefined) {
                        plan_content_cond = { mainVehicleId: main_vehicle.id };
                    }
                    else if (driver != undefined) {
                        plan_content_cond = { driverId: driver.id };
                    }
                    let stuff = await company.getStuff();
                    let stuff_ids = []
                    stuff.forEach(item => { stuff_ids.push(item.id) });
                    plan_content_cond = {
                        [db_opt.Op.and]: [plan_content_cond, {
                            stuffId: {
                                [db_opt.Op.or]: stuff_ids
                            }
                        }]
                    }
                }

                let plan = await db_opt.get_sq().models.plan.findOne({
                    where: {
                        [db_opt.Op.or]: [
                            {
                                [db_opt.Op.and]: [
                                    {
                                        is_buy: true,
                                    }, {
                                        status: 1,
                                    }, plan_content_cond,
                                ],
                            }, {
                                [db_opt.Op.and]: [
                                    {
                                        is_buy: false,
                                    }, {
                                        status: 2,
                                    }, plan_content_cond,
                                ],
                            }
                        ],
                    }
                });
                if (plan) {
                    let full_plan = await plan_lib.get_single_plan_by_id(plan.id);
                    ret.err_msg = '';
                    ret.result = await make_plan_resp(full_plan);
                }
            } catch (error) {
                console.log(error);
                ret.err_msg = error
            };
            res.send(ret);
        });
        app.get('/pa_rest/all_vehicle_info', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let company = await rbac_lib.get_company_by_token(token);
                let all_plans = [];
                if (company) {
                    let stuff = await company.getStuff();
                    for (let index = 0; index < stuff.length; index++) {
                        const element = stuff[index];
                        let plans = await element.getPlans({
                            where: {
                                [db_opt.Op.or]: [
                                    {
                                        [db_opt.Op.and]: [
                                            {
                                                is_buy: true,
                                            }, {
                                                status: 1,
                                            }
                                        ],
                                    }, {
                                        [db_opt.Op.and]: [
                                            {
                                                is_buy: false,
                                            }, {
                                                status: 2,
                                            }
                                        ],
                                    }
                                ],
                            }
                        })
                        plans.forEach(item => { all_plans.push(item) });
                    }
                }
                let resp = [];
                for (let index = 0; index < all_plans.length; index++) {
                    const element = all_plans[index];
                    resp.push(await make_plan_resp(element));
                }
                ret.err_msg = "";
                ret.result = resp;
            } catch (error) {
                console.log(error);
                ret.err_msg = error
            };
            res.send(ret);
        });
        app.post('/pa_rest/push_weight', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let plan_id = parseInt(req_body.id.substr(1, req_body.id.length() - 1));
                await plan_lib.deliver_plan(plan_id, token, req_body.jWeight, req_body.pWeight, req_body.mWeight, req_body.pTime, req_body.mTime, req_body.ticketNo, req_body.sealNo);
            } catch (error) {
                ret = { err_msg: error.msg };
            }
            res.send(ret);
        });
        app.post('/pa_rest/push_base', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                var add_flag = true;
                if (req.body.state == 1) {
                    add_flag = false;
                }
                let req_body = req.body;
                if (add_flag) {
                    await db_opt.get_sq().models.hd_base_info.findOrCreate({
                        where: {
                            name: req_body.name
                        }, default: {
                            id: req_body.id,
                            name: req_body.name,
                            unit: req_body.unit,
                            type: req_body.type,
                            pid: req_body.pid,
                            code: req_body.code
                        }
                    })
                }
                else {
                    let found_one = await db_opt.get_sq().models.hd_base_info.findOne({ where: { name: req_body.name, id: req_body.id } });
                    if (found_one) {
                        await found_one.destroy()
                    }
                }

            } catch (error) {
                ret = { err_msg: error.msg };
            }

            res.send(ret);
        });
        app.post('/pa_rest/push_balance', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let company = await rbac_lib.get_company_by_token(token);
                let cust = await db_opt.get_sq().findOne({where:{name : req_body.customerName}})
                if (company && cust)
                {
                    let contract = await company.getSale_contracts({where:{buyCompanyId:cust.id}});
                    if (contract.length == 1)
                    {
                        await cash_lib.charge(token, contract[0].id, (contract[0].balance - req_body.balance), req_body.reason)
                    }
                }
            } catch (error) {
                ret = { err_msg: error.msg };
            }
            res.send(ret);
        });
    }
}
const { default: axios } = require("axios");
const db_opt = require("./db_opt");
const cash_lib = require("./lib/cash_lib");
const plan_lib = require("./lib/plan_lib");
const rbac_lib = require("./lib/rbac_lib");
const moment = require('moment');
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
    let back_plate = '';
    let company_name = '';
    if (full_plan.behind_vehicle) {
        back_plate = full_plan.behind_vehicle.plate;
    }
    if (full_plan.company) {
        company_name = full_plan.company.name;
    }
    let trans_company_name = full_plan.trans_company_name;
    if (!trans_company_name) {
        trans_company_name = company_name;
    }
    return {
        id: 'n' + full_plan.id,
        plateNo: full_plan.main_vehicle.plate,
        backPlateNo: back_plate,
        stuffName: full_plan.stuff.name,
        stuffId: await get_base_id_by_name(full_plan.stuff.name),
        enterWeight: full_plan.enter_count,
        companyName: company_name,
        driverName: full_plan.driver.name,
        isSale: !full_plan.is_buy,
        price: full_plan.unit_price,
        customerId: await get_base_id_by_name(company_name),
        orderNo: 'mt' + full_plan.id,
        multiStuff: [],
        isMulti: false,
        createTime: full_plan.plan_time,
        driverPhone: full_plan.driver.phone,
        driverId: full_plan.driver.id_card,
        supplierName: company_name,
        supplierId: await get_base_id_by_name(company_name),
        vehicleTeamName: trans_company_name,
        vehicleTeamId: await get_base_id_by_name(trans_company_name),
        tmd_no: '',
        attachUrl: full_plan.enter_attachment,
        sale_address: full_plan.drop_address,
        comment: full_plan.comment,
        transCompanyName: full_plan.trans_company_name,
    };
}
function mkplan_filter(cond = undefined, is_all = false) {
    let = real_cond = { id: { [db_opt.Op.ne]: 0 } };
    let status_filter = {
        [db_opt.Op.in]: [1, 2]
    };
    if (cond) {
        real_cond = {
            ...cond,
        };
        status_filter = 2;
    }

    let ret = {
        ...real_cond,
        [db_opt.Op.or]: [
            {
                is_buy: true,
                status: 1,
                companyId: {
                    [db_opt.Op.ne]: 0
                },
            }, {
                is_buy: false,
                status: status_filter,
                register_time: {
                    [db_opt.Op.ne]: null,
                    [db_opt.Op.ne]: '',
                },
            }
        ],
    }
    if (is_all) {
        delete ret[db_opt.Op.or][1].register_time;
    }

    return ret;
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
                    where: mkplan_filter(plan_content_cond),
                });
                if (plan) {
                    let full_plan = await plan_lib.get_single_plan_by_id(plan.id);
                    if (!full_plan.stuff.need_enter_weight || (full_plan.enter_count > 0 && full_plan.enter_attachment)) {
                        if (full_plan.stuff.no_need_register || full_plan.register_time) {
                            ret.err_msg = '';
                            ret.result = await make_plan_resp(full_plan);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
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
                            where: mkplan_filter(undefined, true),
                        })
                        plans.forEach(item => { all_plans.push(item) });
                    }
                }
                let resp = [];
                for (let index = 0; index < all_plans.length; index++) {
                    const element = all_plans[index];
                    let full_plan = await plan_lib.get_single_plan_by_id(element.id);
                    if (!full_plan.stuff.need_enter_weight || (full_plan.enter_count > 0 && full_plan.enter_attachment.length > 0)) {
                        resp.push(await make_plan_resp(element));
                    }
                }
                ret.err_msg = "";
                ret.result = resp;
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            };
            res.send(ret);
        });
        app.get('/pa_rest/get_all_balance', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let company = await rbac_lib.get_company_by_token(token);
                let all_contracts = await company.getSale_contracts();
                let result = [];
                for (let index = 0; index < all_contracts.length; index++) {
                    const element = all_contracts[index];
                    let cust = await element.getBuy_company();
                    result.push({
                        customerName: cust.name,
                        balance: element.balance,
                    });
                }
                ret.result = result;
            } catch (error) {
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }

            res.send(ret);
        });
        app.post('/pa_rest/push_weight', async (req, res) => {
            console.log(`Received request for /pa_rest/push_weight: ${JSON.stringify(req.body)}`); // 打印请求
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let plan_id = parseInt(req_body.id.substr(1, req_body.id.length - 1));
                await plan_lib.deliver_plan(plan_id, token, parseFloat(req_body.jWeight), parseFloat(req_body.pWeight), parseFloat(req_body.mWeight), req_body.pTime, req_body.mTime, req_body.ticketNo, req_body.sealNo);
                ret = { err_msg: '' };
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }
            console.log(`Response sent for /pa_rest/push_weight: ${JSON.stringify(ret)}`); // 打印响应
            res.send(ret);
        });
        app.post('/pa_rest/push_base', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                var add_flag = true;
                if (req.body.state == "1") {
                    add_flag = false;
                }
                let req_body = req.body;
                if (add_flag) {
                    await db_opt.get_sq().models.hd_base_info.findOrCreate({
                        where: {
                            name: req_body.name
                        }, default: {
                            base_id: req_body.id,
                            name: req_body.name,
                            unit: req_body.unit,
                            type: req_body.type,
                            pid: req_body.pid,
                            code: req_body.code
                        }
                    })
                    let exist_rec = await db_opt.get_sq().models.hd_base_info.findOne({ where: { name: req_body.name } });
                    exist_rec.base_id = req_body.id;
                    exist_rec.name = req_body.name;
                    exist_rec.unit = req_body.unit;
                    exist_rec.type = req_body.type;
                    exist_rec.pid = req_body.pid;
                    exist_rec.code = req_body.code;
                    await exist_rec.save();
                }
                else {
                    let found_one = await db_opt.get_sq().models.hd_base_info.findOne({ where: { name: req_body.name, id: req_body.id } });
                    if (found_one) {
                        await found_one.destroy()
                    }
                }
                ret = { err_msg: '' };
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }

            res.send(ret);
        });
        app.post('/pa_rest/push_balance', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let company = await rbac_lib.get_company_by_token(token);
                let cust = await db_opt.get_sq().models.company.findOne({ where: { name: req_body.customerName } })
                if (company && cust) {
                    let contract = await company.getSale_contracts({ where: { buyCompanyId: cust.id } });
                    if (contract.length == 1) {
                        await cash_lib.charge(token, contract[0].id, (req_body.balance - contract[0].balance), req_body.reason)
                        ret = { err_msg: '' };
                    }
                }
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }
            res.send(ret);
        });
        app.post('/pa_rest/call_vehicle', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let company = await rbac_lib.get_company_by_token(token);
                let vehicle = await db_opt.get_sq().models.vehicle.findOne({ where: { plate: req.body.plateNo } });
                if (company && vehicle) {
                    let plans = await db_opt.get_sq().models.plan.findAll({
                        where: {
                            mainVehicleId: vehicle.id,
                            [db_opt.Op.or]: [
                                {
                                    is_buy: false,
                                    status: 2,
                                },
                                {
                                    is_buy: true,
                                    status: 1,
                                }
                            ],
                        }
                    });
                    for (let index = 0; index < plans.length; index++) {
                        const element = plans[index];
                        let focus_plan = await plan_lib.get_single_plan_by_id(element.id);
                        if (focus_plan && focus_plan.stuff.company.id == company.id && focus_plan.register_time) {
                            await plan_lib.plan_call_vehicle(focus_plan.id, token);
                            ret.err_msg = "";
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }
            res.send(ret);
        });
        app.post('/pa_rest/push_p', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let plan_id = parseInt(req_body.id.substr(1, req_body.id.length - 1));
                await plan_lib.plan_enter(plan_id, token);
                ret = { err_msg: '' };
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }

            res.send(ret);
        });
        app.post('/pa_rest/create_plan', async (req, res) => {
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let bv = await plan_lib.fetch_vehicle(req_body.behindPlateNo);
                let mv = await plan_lib.fetch_vehicle(req_body.plateNo);
                let dr = await plan_lib.fetch_driver(req_body.driverName, req_body.driverPhone, req_body.driverID);
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff({ where: { name: req_body.stuffName } });
                let buy_company = await rbac_lib.add_company(req_body.customerName);
                let user = await rbac_lib.add_user('28887888777');
                if (company && user) {
                    await rbac_lib.user_bind_company(user, buy_company, 'no_open_id', '第三方代提用户', '');
                }
                let user_token = await rbac_lib.user_login('28887888777');
                let create_req = {
                    "behind_vehicle_id": bv.id,
                    "comment": "第三方创建",
                    "driver_id": dr.id,
                    "drop_address": req_body.deliverAddress,
                    "main_vehicle_id": mv.id,
                    "plan_time": req_body.arriveDate,
                    "stuff_id": stuff[0].id,
                    "trans_company_name": req_body.trans_company_name,
                    "use_for": req_body.userFor ? req_body.userFor : '其他',
                };
                let create_header = { headers: { token: user_token } }
                console.log('call localhost order_buy_create:', create_req, create_header);
                let resp = await axios.post('http://localhost:8080/api/v1/customer/order_buy_create', create_req, create_header);
                if (resp.data.err_msg == "") {
                    let plan_id = resp.data.result.id;
                    await plan_lib.confirm_single_plan(plan_id, token, true);
                    await plan_lib.manual_pay_plan(plan_id, token);
                    ret = { err_msg: "", result: { orderNumber: plan_id.toString() } };
                }
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }
            res.send(ret);
        });
        app.post('/pa_rest/cancel_plan', async (req, res) => {
            console.log(`Received request for /pa_rest/cancel_plan: ${JSON.stringify(req.body)}`); // 打印请求
            var token = req.query.token;
            var ret = { err_msg: '无权限' };
            try {
                let req_body = req.body;
                let plan = await plan_lib.get_single_plan_by_id(parseInt(req_body.orderNumber))
                await plan_lib.plan_close(plan, '第三方');
                ret.err_msg = "";
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }
            res.send(ret);
            console.log(`Response sent for /pa_rest/cancel_plan: ${JSON.stringify(ret)}`); // 打印响应
        });
        app.get('/pa_rest/vehicle_detail', async (req, res)=>{
            var token = req.query.token;
            var ret = { err_msg: '无权限' };

            try {
                let today = moment().format('YYYY-MM-DD');
                let vehicle = await db_opt.get_sq().models.vehicle.findOne({ where: { plate: req.query.plate_no } });
                let plan = await vehicle.getPlans({where:{plan_time:today}});
                if (plan.length == 0) {
                    throw { err_msg: '无当日计划' };
                }
                let driver = await plan[0].getDriver();
                let stuff = await plan[0].getStuff();
                let sc_vl_req = (await stuff.getSc_reqs({where:{name:{
                    [db_opt.Op.like]:'%主车行驶%'
                }}}))[0];
                let sc_rtl_req = (await stuff.getSc_reqs({where:{name:{
                    [db_opt.Op.like]:'%运输证%'
                }}}))[0];
                let vl = await vehicle.getSc_contents({where:{scReqId:sc_vl_req.id}})[0];
                let rtl = await vehicle.getSc_contents({where:{scReqId:sc_rtl_req.id}})[0];
                let vla = '无';
                let vl_et = '无';
                let rtl_in = '无';
                if (vl)
                {
                    vla = 'https://www.d8sis.cn/mt_api' + vl.attachment;
                    vl_et = vl.expired_time;
                }
                if (rtl)
                {
                    rtl_in = rtl.input;
                }
                ret.err_msg = '';
                ret.result = {
                    plateNo:req.query.plate_no,
                    driverName:driver.name,
                    idNum:driver.id_card,
                    vehicleLicenseUrl:vla,
                    LicenseExpireDate:vl_et,
                    roadTransportLicenseNum:rtl_in,
                };
            } catch (error) {
                console.log(error);
                if (error.err_msg) {
                    ret.err_msg = error.err_msg
                }
            }

            res.send(ret);
        });
    }
}
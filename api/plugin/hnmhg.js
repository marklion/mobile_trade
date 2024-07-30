const axios = require('axios');
const db_opt = require('../db_opt');
async function post_to_hd(url, data) {
    let company = await db_opt.get_sq().models.company.findOne({ where: { name: '内蒙古汇能煤化工有限公司' } })
    let url_prefix = '';
    let key = '';
    let token = '';
    let ret = '';
    if (company) {
        url_prefix = company.third_url;
        key = company.third_key;
        token = company.third_token;
        try {
            let resp = await axios.post(url_prefix + url, data, {
                headers: {
                    key: key,
                    token: token,
                }
            });
            ret = resp.data;
        } catch (error) {
            console.log(error);
        };
        console.log('send to hd', url_prefix + url, data, key, token, ret);
        return ret;
    }
}
async function get_base_id_by_name(name) {
    let ret = '';
    let base = await db_opt.get_sq().models.hd_base_info.findOne({ where: { name: name } });
    if (base) {
        ret = base.base_id;
    }
    return ret;
}
function plan_detail_include() {
    return [
        { model: db_opt.get_sq().models.company, paranoid: false },
        { model: db_opt.get_sq().models.rbac_user, paranoid: false },
        { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
        { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
        { model: db_opt.get_sq().models.driver, paranoid: false },
        { model: db_opt.get_sq().models.stuff, include: [db_opt.get_sq().models.company], paranoid: false },
        { model: db_opt.get_sq().models.plan_history, order: [[db_opt.get_sq().fn('datetime', db_opt.get_sq().col('time')), 'ASC']], paranoid: false }
    ];
}
async function pri_get_single_plan_by_id(_plan_id) {
    let ret = {};
    let sq = db_opt.get_sq();
    ret = await sq.models.plan.findByPk(_plan_id, { include: plan_detail_include() });

    return ret;
}
async function make_plan_basic_req(plan_id, is_change = false) {
    let plan = await pri_get_single_plan_by_id(plan_id);
    let req = {
        id: 'n' + plan.id,
        plateNo: plan.main_vehicle.plate,
        backPlateNo: plan.behind_vehicle.plate,
        stuffName: plan.stuff.name,
        stuffId: await get_base_id_by_name(plan.stuff.name),
        enterWeight: plan.enter_count,
        driverName: plan.driver.name,
        driverId: plan.driver.id_card,
        driverPhone: plan.driver.phone,
        price: plan.unit_price,
        createTime: plan.plan_time,
        orderNo: 'mt' + plan.id,
        multiStuff: [],
        isMulti: false,
        comment: plan.comment,
        dropAddress: plan.drop_address,
        useFor: plan.use_for,
    };
    if (plan.is_buy) {
        let company_name = "";
        if (plan.company) {
            company_name = plan.company.name;
        }
        req.supplierName = company_name;
        req.supplierId = await get_base_id_by_name(req.supplierName);
        req.vehicleTeamName = plan.trans_company_name;
        req.vehicleTeamId = await get_base_id_by_name(req.vehicleTeamName);
        req.companyName = '';
        req.customerId = '';
        req.isSale = false;
    }
    else {
        req.supplierName = '';
        req.supplierId = '';
        req.companyName = plan.company.name;
        req.customerId = await get_base_id_by_name(req.companyName);
        req.vehicleTeamName = req.companyName;
        req.vehicleTeamId = req.customerId;
        req.isSale = true;
    }
    if (is_change) {
        req.changeType = 1;
    }
    return req;
}
module.exports = {
    check_in: async function (plan) {
        if (!plan.is_buy) {
            let req = await make_plan_basic_req(plan.id)
            let res = await post_to_hd('/thirdParty/zyzl/checkIn', {
                data: req
            });
            if (res.code == '0') {
                plan.register_comment = res.data.stationName;
                await plan.save();
            }
        }
    },
    cancel_check_in: async function (plan) {
        let req = await make_plan_basic_req(plan.id, true);
        await post_to_hd('/thirdParty/zyzl/changeRegister', {
            data: req
        });
    },
    call_vehicle: async function (plan) {

    },
    order_ready: async function (plan) {
        let req = await make_plan_basic_req(plan.id)
        await post_to_hd('/thirdParty/zyzl/saveRegister', {
            data: [req],
        });
    },
    order_close: async function (plan) {
        let req = await make_plan_basic_req(plan.id, true);
        await post_to_hd('/thirdParty/zyzl/changeRegister', {
            data: req
        });
    },
    order_update: async function (plan) {
        let req = await make_plan_basic_req(plan.id)
        await post_to_hd('/thirdParty/zyzl/saveRegister', {
            data: [req],
        });
    },
    deliver_plan: async function (plan) {
        axios.post('http://123.178.131.22:8180/api/v1/vehicle_pass/deliver', {
            pTime:plan.p_time,
            mTime:plan.m_time,
            enterLocation:plan.register_comment,
            plateNo:plan.main_vehicle.plate,
        });
    },
}
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
async function make_plan_basic_req(plan, is_change = false) {
    let req = {
        id: 'n' + plan.id,
        plateNo: plan.main_vehicle.plate,
        backPlateNo: plan.behind_vehicle.plate,
        stuffName: plan.stuff.name,
        stuffId: await get_base_id_by_name(plan.stuff.name),
        enterWeight: plan.enter_count,
        driverNamee: plan.driver.name,
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
        req.supplierName = plan.company.name;
        req.supplierId = await get_base_id_by_name(req.supplierName);
        req.vehicleTeamName = plan.trans_company_name;
        req.vehicleTeamId = await get_base_id_by_name(req.vehicleTeamName);
        req.customerName = '';
        req.customerId = '';
        req.isSale = false;
    }
    else {
        req.supplierName = '';
        req.supplierId = '';
        req.customerName = plan.company.name;
        req.customerId = await get_base_id_by_name(req.customerName);
        req.vehicleTeamName = req.customerName;
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
        let req = await make_plan_basic_req(plan)
        await post_to_hd('/thirdParty/zyzl/saveRegister', {
            data: [req],
        });
        if (!plan.is_buy) {
            let req = await make_plan_basic_req(plan)
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
        let req = await make_plan_basic_req(plan, true);
        await post_to_hd('/thirdParty/zyzl/changeRegister', {
            data: req
        });
    },
    call_vehicle: async function (plan) {

    },
    order_ready: async function (plan) {

    },
    order_close: async function (plan) {
        let req = await make_plan_basic_req(plan, true);
        await post_to_hd('/thirdParty/zyzl/changeRegister', {
            data: req
        });
    },

}
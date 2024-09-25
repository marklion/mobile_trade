const axios = require('axios');
const db_opt = require('../db_opt');
const { push_req2zc } = require('./zczh_api_utils');
const lag_rpc = require('../lib/lag_rpc');

function make_url(url, plan) {
    let ret = '';
    ret = plan.stuff.company.zc_url + url + '?zh_ssid=' + plan.stuff.company.zh_ssid;
    let phone = plan.driver.phone;
    ret += '&phone=' + phone;
    let plate = plan.main_vehicle.plate;
    let plateBase64 = Buffer.from(plate).toString('base64');
    ret += '&plate=' + plateBase64;
    return ret;
}

module.exports = {
    order_ready: async function (plan) {
        await push_req2zc([{
            behind_vehicle_number: plan.behind_vehicle.plate,
            company_name: plan.company.name,
            driver_id: plan.driver.id_card,
            driver_name: plan.driver.name,
            driver_phone: plan.driver.phone,
            main_vehicle_number: plan.main_vehicle.plate,
            stuff_name: plan.stuff.name,
            trans_company: plan.trans_company_name,
        }], make_url('/vehicle_order/add', plan));
    },
    call_vehicle: async function (plan) {
        let zc_vo = await push_req2zc({}, make_url('/vehicle_order/get', plan));
        await push_req2zc(zc_vo.basic_info, make_url('/order_register/add', plan));
        await lag_rpc.requeset_rpc(plan.stuff.company, 'field_queue_call', [
            zc_vo.basic_info.id,
            true,
        ])
    },
    cancel_enter: async function (plan) {
        throw {err_msg:'不支持撤销'};
    },
    cancel_check_in: async function (plan) {
        let zc_vo = await push_req2zc({}, make_url('/vehicle_order/get', plan));
        await lag_rpc.requeset_rpc(plan.stuff.company, 'field_queue_pass', [
            zc_vo.basic_info.id,
        ])
    },
    order_close: async function (plan) {
        let zc_vo = undefined;
        try {
            zc_vo = await push_req2zc({}, make_url('/vehicle_order/get', plan));
        } catch (error) {
            console.log(error);
        }
        if (zc_vo) {
            await push_req2zc([zc_vo.basic_info], make_url('/vehicle_order/del', plan));
        }
    },
    confirm_vehicle: async function (plan) {
        let zc_vo = await push_req2zc({}, make_url('/vehicle_order/get', plan));
        await lag_rpc.requeset_rpc(plan.stuff.company, 'field_queue_set_seal', [
            zc_vo.basic_info.id,
            plan.seal_no
        ])
        await lag_rpc.requeset_rpc(plan.stuff.company, 'field_queue_confirm', [
            zc_vo.basic_info.id,
            plan.confirmed,
        ]);
    },
    get_p_weight: async function (plan) {
        let zc_vo = await push_req2zc({}, make_url('/vehicle_order/get', plan));
        return zc_vo.basic_info.p_weight;
    },
    get_device_status: async function (company) {
        let devs = await lag_rpc.requeset_rpc(company, 'get_device_status', [
        ]);
        let ret = [];
        if (devs != undefined) {
            devs.forEach(item => {
                ret.push({
                    name: item.name,
                    enter_gate: item.enter_gate_is_close,
                    exit_gate: item.exit_gate_is_close,
                    scale_status: item.scale_status,
                    cur_weight: item.cur_weight,
                });
            });
        }
        return ret;
    },
    gate_ctrl: async function (company, name, is_enter, is_open) {
        await lag_rpc.requeset_rpc(company, 'do_device_opt_gate_control', [
            name,
            is_enter,
            is_open,
        ])
    },
    confirm_scale: async function (company, name) {
        await lag_rpc.requeset_rpc(company, 'do_device_opt_confirm_scale', [name])
    },
    reset_scale: async function (company, name) {
        await lag_rpc.requeset_rpc(company, 'do_device_opt_reset_scale', [name])
    },
    trigger_cap: async function (company, name, is_enter, vehicle_number) {
        await lag_rpc.requeset_rpc(company, 'do_device_opt_trigger_cap', [name, is_enter, vehicle_number]);
    },
    take_pic: async function (company, name, is_enter) {
        let ret = await lag_rpc.requeset_rpc(company, 'do_device_opt_take_pic', [name, is_enter]);
        if (ret == undefined) {
            ret = '';
        }
        return ret;
    },
    proc_timeout_5min: async function () {
        let company = await db_opt.get_sq().models.company.findAll({ where: { script: 'old_zczh' } });
        for (let index = 0; index < company.length; index++) {
            const element = company[index];
            let stuff = await element.getStuff();
            for (let index = 0; index < stuff.length; index++) {
                const single_s = stuff[index];
                let plans = await single_s.getPlans({
                    where: {
                        status: 2,
                    }
                });
                for (let index = 0; index < plans.length; index++) {
                    let plan = await db_opt.get_sq().models.plan.findByPk(plans[index].id, {
                        include:
                            [
                                { model: db_opt.get_sq().models.company, paranoid: false },
                                { model: db_opt.get_sq().models.rbac_user, paranoid: false },
                                { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
                                { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
                                { model: db_opt.get_sq().models.driver, paranoid: false },
                                { model: db_opt.get_sq().models.stuff, include: [db_opt.get_sq().models.company], paranoid: false },
                            ],
                    });
                    this.order_ready(plan);
                }
            }
        }
    },
}
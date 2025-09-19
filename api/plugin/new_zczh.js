const { push_req2zc } = require('./zczh_api_utils');

function make_url(url, plan) {
    let ret = '';
    ret = plan.stuff.company.zczh_back_end + url;
    return ret;
}

function get_url_token_by_company(company, url) {
    return {
        url: company.zczh_back_end + url,
        token: company.zczh_back_token,
    }
}

function make_token(plan) {
    return plan.stuff.company.zczh_back_token;
}

async function get_vo(plan) {
    let ret = '';
    let resp = await push_req2zc({
        plate_number: plan.main_vehicle.plate,
        driver_phone: plan.driver.phone,
        exp_status: 100
    }, make_url('/api/order/search', plan), make_token(plan));
    if (resp.result.length > 0) {
        ret = resp.result[0].order_number;
    }
    
    return ret;
}

async function find_device2exec(find_func, exec_func, company, name) {
    let ut = get_url_token_by_company(company, '/api/get_scale_sm_info');
    let resp = await push_req2zc({}, ut.url, ut.token);
    ut = get_url_token_by_company(company, '/api/get_gate_sm_info');
    let gate_resp = await push_req2zc({}, ut.url, ut.token);
    resp.result = resp.result.concat(gate_resp.result);
    for (let index = 0; index < resp.result.length; index++) {
        const element = resp.result[index];
        if (element.set_info.name == name) {
            let id = find_func(element.set_info);
            await exec_func(id);
            break;
        }
    }
}

module.exports = {
    call_vehicle: async function (plan) {
        await push_req2zc({
            back_plate_number: plan.behind_vehicle.plate,
            company_name: plan.company.name,
            driver_id: plan.driver.id_card,
            driver_name: plan.driver.name,
            driver_phone: plan.driver.phone,
            is_sale: !plan.is_buy,
            plate_number: plan.main_vehicle.plate,
            stuff_name: plan.stuff.name,
        }, make_url('/api/order/add', plan), make_token(plan));
        let vo = await get_vo(plan);
        await push_req2zc({
            order_number: vo,
            is_check_in: true,
            opt_name: '司机',
            expect_weight: plan.expect_weight,
        }, make_url('/api/order/check_in', plan), make_token(plan));
        await push_req2zc({
            order_number: vo,
            is_call: true,
            opt_name: '系统',
        }, make_url('/api/order/call', plan), make_token(plan));
    },
    cancel_check_in: async function (plan) {
        let vo = await get_vo(plan);
        if (vo) {
            await push_req2zc({
                order_number: vo,
            }, make_url('/api/order/del', plan), make_token(plan));
        }
    },
    cancel_enter: async function (plan) {
        let vo = await get_vo(plan);
        await push_req2zc({
            order_number: vo,
        }, make_url('/api/order/rollback', plan), make_token(plan));
    },
    confirm_vehicle: async function (plan) {
        let vo = await get_vo(plan);
        await push_req2zc({
            order_number: vo,
            is_confirm: plan.confirmed,
            opt_name: '系统'
        }, make_url('/api/order/confirm', plan), make_token(plan));
    },
    get_device_status: async function (company) {
        let ret = [];
        let ut = get_url_token_by_company(company, '/api/get_scale_sm_info');
        let resp = await push_req2zc({}, ut.url, ut.token);
        for (let index = 0; index < resp.result.length; index++) {
            const element = resp.result[index];
            ret.push({
                name: element.set_info.name,
                enter_gate: element.front_gate_is_close,
                exit_gate: element.back_gate_is_close,
                scale_status: element.cur_state + " " + element.cur_plate,
                cur_weight: element.cur_weight.toFixed(2),
            });
        }
        ut = get_url_token_by_company(company, '/api/get_gate_sm_info');
        resp = await push_req2zc({}, ut.url, ut.token);
        for (let index = 0; index < resp.result.length; index++) {
            const element = resp.result[index];
            ret.push({
                name: element.set_info.name,
                scale_status: '',
            });
        }

        return ret;
    },
    gate_ctrl: async function (company, name, is_enter, is_open) {
        await find_device2exec(setinfo => {
            if (is_enter) {
                return setinfo.gate.front.id;
            }
            else {
                return setinfo.gate.back.id;
            }
        }, async id => {
            let ut = get_url_token_by_company(company, '/api/gate_ctrl');
            await push_req2zc({
                device_id: id,
                is_open: is_open,
            }, ut.url, ut.token);
        }, company, name);
    },
    confirm_scale: async function (company, name) {
        await find_device2exec(set_info => { return set_info.id }, async id => {
            let ut = get_url_token_by_company(company, '/api/confirm_scale');
            await push_req2zc({
                sm_id: id
            }, ut.url, ut.token);
        }, company, name);
    },
    reset_scale: async function (company, name) {
        await find_device2exec(set_info => { return set_info.id }, async id => {
            let ut = get_url_token_by_company(company, '/api/reset_scale_sm');
            await push_req2zc({
                sm_id: id
            }, ut.url, ut.token);
        }, company, name);
    },
    trigger_cap: async function (company, name, is_enter, vehicle_number) {
        await find_device2exec(set_info => {
            if (is_enter) {
                return set_info.plate_cam.front.id;
            }
            else {
                return set_info.plate_cam.back.id;
            }
        }, async id => {
            if (vehicle_number) {
                let ut = get_url_token_by_company(company, '/api/device_mock/push_plate');
                await push_req2zc({
                    device_id: id,
                    plate_no: vehicle_number,
                }, ut.url, ut.token);
            }
            else {
                let ut = get_url_token_by_company(company, '/api/plate_cam_cap');
                await push_req2zc({
                    device_id: id,
                }, ut.url, ut.token);
            }
        }, company, name);
    },
    take_pic: async function (company, name, is_enter) {
        let ret = "";
        await find_device2exec(set_info => {
            if (is_enter) {
                return set_info.plate_cam.front.id;
            }
            else {
                return set_info.plate_cam.back.id;
            }
        }, async id => {
            let ut = get_url_token_by_company(company, '/api/cap_picture');
            let resp = await push_req2zc({
                device_id: id,
            }, ut.url, ut.token);
            if (resp.result) {
                ret = resp.result;
            }
        }, company, name);
        ret = company.zczh_back_end + ret;
        return ret;
    },
    get_p_weight: async function (plan) {
        let ret = 0;
        let resp = await push_req2zc({
            plate_number: plan.main_vehicle.plate,
            status: 2,
        }, make_url('/api/order/search', plan), make_token(plan));
        if (resp && resp.result.length > 0) {
            ret = resp.result[0].p_weight;
        }
        return ret;
    },
}
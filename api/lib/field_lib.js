const all_plugin = require('../plugin/all_plugin');
const moment = require('moment');
const wx_api_util = require('./wx_api_util');
const { hook_plan } = require('./hook_lib');
let currentDay = moment().format('YYYY-MM-DD');
let currentNumber = 0;
function get_increased_number() {
    const today = moment().format('YYYY-MM-DD');
    if (today === currentDay) {
        currentNumber += 1;
    } else {
        currentNumber = 1;
        currentDay = today;
    }
    return currentNumber;
}
async function run_plugin_based_on_company(company, name, func) {
    const plugin = all_plugin.get_plugin_by_name(company.script);
    let ret;
    if (plugin[name]) {
        ret = await func(plugin[name]);
    }

    return ret;
}

module.exports = {
    handle_driver_check_in: async function (_plan) {
        await hook_plan('check_in', _plan);
        _plan.register_time = moment().format('YYYY-MM-DD HH:mm:ss');
        _plan.register_number = get_increased_number();
        await _plan.save();
    },
    handle_cancel_check_in: async function (_plan) {
        _plan.register_time = null;
        _plan.register_number = 0;
        _plan.call_time = null;
        await hook_plan('cancel_check_in', _plan);
        await _plan.save();
    },
    handle_call_vehicle: async function (_plan) {
        await hook_plan('call_vehicle', _plan);
        _plan.call_time = moment().format('YYYY-MM-DD HH:mm:ss');
        wx_api_util.call_vehicle_msg(_plan);
        await _plan.save();
    },
    handle_confirm_vehicle: async function (_plan, is_confirm) {
        _plan.confirmed = is_confirm;
        await hook_plan('confirm_vehicle', _plan);
        await _plan.save();
    },
    dev_opt: {
        get_device_status: async function (company) {
            let ret = [];
            await run_plugin_based_on_company(company, 'get_device_status', async (func) => {
                ret = await func(company);
            });
            return ret;
        },
        gate_ctrl: async function (company, name, is_enter, is_open) {
            await run_plugin_based_on_company(company, 'gate_ctrl', async (func) => {
                await func(company, name, is_enter, is_open);
            });
        },
        confirm_scale: async function (company, name) {
            await run_plugin_based_on_company(company, 'confirm_scale', async (func) => {
                await func(company, name);
            });
        },
        reset_scale: async function (company, name) {
            await run_plugin_based_on_company(company, 'reset_scale', async (func) => {
                await func(company, name);
            });
        },
        trigger_cap: async function (company, name, is_enter, vehicle_number) {
            await run_plugin_based_on_company(company, 'trigger_cap', async (func) => {
                await func(company, name, is_enter, vehicle_number);
            });
        },
        take_pic: async function (company, name, is_enter) {
            let ret = '';
            await run_plugin_based_on_company(company, 'take_pic', async (func) => {
                ret = await func(company, name, is_enter);
            });

            return ret;
        }
    },
};
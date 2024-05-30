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
module.exports = {
    handle_driver_check_in: async function (_plan) {
        hook_plan('check_in', _plan);
        _plan.register_time = moment().format('YYYY-MM-DD HH:mm:ss');
        _plan.register_number = get_increased_number();
        await _plan.save();
    },
    handle_cancel_check_in: async function (_plan) {
        _plan.register_time = null;
        _plan.register_number = 0;
        _plan.call_time = null;
        await _plan.save();
        hook_plan('cancel_check_in', _plan);
    },
    handle_call_vehicle: async function (_plan) {
        hook_plan('call_vehicle', _plan);
        _plan.call_time = moment().format('YYYY-MM-DD HH:mm:ss');
        wx_api_util.call_vehicle_msg(_plan);
        await _plan.save();
    },
};
const all_plugin = require('./plugin/all_plugin');
const moment = require('moment');
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
        let script = _plan.stuff.company.script;
        if (script && script.length > 0) {
            const plugin = all_plugin.get_plugin_by_name(script);
            await plugin.check_in(_plan);
            _plan.register_time = moment().format('YYYY-MM-DD HH:mm:ss');
            _plan.register_number = get_increased_number();
            await _plan.save();
        }
    },
    handle_cancel_check_in: async function (_plan) {
        let script = _plan.stuff.company.script;
        if (script && script.length > 0) {
            _plan.register_time = null;
            _plan.register_number = 0;
            _plan.call_time = null;
            await _plan.save();
            const plugin = all_plugin.get_plugin_by_name(script);
            await plugin.cancel_check_in(_plan);
        }
    },
    handle_call_vehicle: async function (_plan) {
        let script = _plan.stuff.company.script;
        if (script && script.length > 0) {
            const plugin = all_plugin.get_plugin_by_name(script);
            _plan.call_time = moment().format('YYYY-MM-DD HH:mm:ss');
            await plugin.call_vehicle(_plan);
            await _plan.save();
        }
    },
};
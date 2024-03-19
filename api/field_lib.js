const all_plugin = require('./plugin/all_plugin');
module.exports = {
    handle_driver_check_in: async function (_plan) {
        let script = _plan.stuff.company.script;
        if (script && script.length > 0) {
            const plugin = all_plugin.get_plugin_by_name(script);
            await plugin.check_in(_plan);
        }
    },
    handle_cancel_check_in:async function (_plan) {
        let script = _plan.stuff.company.script;
        if (script && script.length > 0) {
            const plugin = all_plugin.get_plugin_by_name(script);
            await plugin.cancel_check_in(_plan);
        }
    },
};
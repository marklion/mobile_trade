const all_plugin = require('../plugin/all_plugin');
module.exports = {
    hook_plan: async function (hook_name, plan) {
        let ret = undefined;
        let script = plan.stuff.company.script;
        if (script && script.length > 0) {
            const plugin = all_plugin.get_plugin_by_name(script);
            let func = plugin[hook_name];
            if (func != undefined) {
                ret = await func(plan);
            }
        }
        return ret;
    },
}
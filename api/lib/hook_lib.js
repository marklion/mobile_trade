const all_plugin = require('../plugin/all_plugin');
const db_opt = require('../db_opt')
module.exports = {
    hook_plan: async function (hook_name, plan) {
        let out_ret = undefined;
        await db_opt.get_sq().transaction({ savepoint: true }, async (t) => {
            let ret = undefined;
            let script = plan.stuff.company.script;
            if (script && script.length > 0) {
                const plugin = all_plugin.get_plugin_by_name(script);
                let func = plugin[hook_name];
                if (func != undefined) {
                    ret = await func(plan);
                }
            }
            out_ret = ret;
        });
        return out_ret;
    },
}
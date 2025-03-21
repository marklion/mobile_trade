const all_plugin = require('../plugin/all_plugin');
const moment = require('moment');
const wx_api_util = require('./wx_api_util');
const { hook_plan } = require('./hook_lib');
const db_opt = require('../db_opt');
const util_lib = require('./util_lib');
const fc_lib = require('./fc_lib');
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
    auto_uncheck_in: async function () {
        let companies = await db_opt.get_sq().models.company.findAll({
            where: {
                check_in_stay_minutes: {
                    [db_opt.Op.gt]: 0
                }
            }
        });
        for (let index = 0; index < companies.length; index++) {
            const element = companies[index];
            let stuff_ids = [];
            let stuff = await element.getStuff();
            stuff_ids = stuff.map(s => s.id);
            let plans = await db_opt.get_sq().models.plan.findAll({
                where: {
                    register_time: {
                        [db_opt.Op.ne]: null
                    },
                    status: [1, 2],
                    stuffId: {
                        [db_opt.Op.in]: stuff_ids
                    },
                }
            });
            for (let j = 0; j < plans.length; j++) {
                let plan = plans[j];
                let expect_status = 2;
                if (plan.is_buy) {
                    expect_status = 1;
                }
                if (expect_status != plan.status) {
                    continue;
                }
                if (plan.enter_time && plan.enter_time.length > 0) {
                    continue;
                }
                if (plan.call_time && plan.call_time.length > 0) {
                    let stop_time = moment(plans[j].register_time).add(element.check_in_stay_minutes, 'minutes');
                    if (moment().isAfter(stop_time)) {
                        let full_plan = await util_lib.get_single_plan_by_id(plans[j].id);
                        await this.handle_cancel_check_in(full_plan);
                    }
                }
            }
        }

    },
    handle_cancel_enter: async function (_plan) {
        await hook_plan('cancel_enter', _plan);
        _plan.enter_time = '';
        await _plan.save();
    },
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
        if (await fc_lib.should_run_action('call', _plan)) {
            await hook_plan('call_vehicle', _plan);
            _plan.call_time = moment().format('YYYY-MM-DD HH:mm:ss');
            wx_api_util.call_vehicle_msg(_plan);
            await _plan.save();
        }
        else {
            throw { err_msg: '检查未通过' };
        }
    },
    handle_confirm_vehicle: async function (_plan, is_confirm) {
        let has_permission = true;
        if (is_confirm) {
            has_permission = await fc_lib.should_run_action('confirm', _plan)
        }
        if (has_permission) {
            _plan.confirmed = is_confirm;
            await hook_plan('confirm_vehicle', _plan);
            await _plan.save();
        }
        else {
            throw { err_msg: '检查未通过' };
        }
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
const all_plugin = require('../plugin/all_plugin');
const moment = require('moment');
const wx_api_util = require('./wx_api_util');
const { hook_plan } = require('./hook_lib');
const db_opt = require('../db_opt');
const util_lib = require('./util_lib');
const fc_lib = require('./fc_lib');
const fs = require('fs');
let currentDay = moment().format('YYYY-MM-DD');
let autoCallVehicleRunning = false;
const cnm_file = '/database/current_number_map.json';
function get_increased_number(stuff_id) {
    let currentNumberMap = fs.existsSync(cnm_file)
        ? JSON.parse(fs.readFileSync(cnm_file, 'utf8'))
        : {};
    if (!currentNumberMap[stuff_id]) {
        currentNumberMap[stuff_id] = 0;
    }
    const today = moment().format('YYYY-MM-DD');
    if (today === currentDay) {
        currentNumberMap[stuff_id] += 1;
    } else {
        for (let key in currentNumberMap) {
            currentNumberMap[key] = 1;
        }
        currentDay = today;
    }
    fs.writeFileSync(cnm_file, JSON.stringify(currentNumberMap), 'utf8');
    return currentNumberMap[stuff_id];
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
                    call_time: {
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
                let stop_time = moment(plans[j].call_time).add(element.check_in_stay_minutes, 'minutes');
                if (moment().isAfter(stop_time)) {
                    let full_plan = await util_lib.get_single_plan_by_id(plans[j].id);
                    await this.handle_cancel_check_in(full_plan);
                    await util_lib.history_record_cancel_checkin(full_plan, '自动');
                }
            }
        }

    },
    auto_call_vehicle: async function () {
        if (autoCallVehicleRunning) {
            return;
        }
        autoCallVehicleRunning = true;
        try {
            let sq = db_opt.get_sq();
            let regions = await sq.models.region_capacity.findAll({
                where: {
                    parking_count: {
                        [db_opt.Op.gt]: 0
                    }
                },
                include: [sq.models.stuff]
            });
            for (let index = 0; index < regions.length; index++) {
                const region = regions[index];
                let stuff_ids = (region.stuff || []).map(s => s.id);
                if (stuff_ids.length === 0) {
                    continue;
                }
                await this.auto_call_for_region(region.parking_count, stuff_ids);
            }
        } finally {
            autoCallVehicleRunning = false;
        }
    },
    auto_call_for_region: async function (parking_count, stuff_ids) {
        let sq = db_opt.get_sq();
        const plan_lib = require('./plan_lib');
        let called_count = await sq.models.plan.count({
            where: {
                stuffId: {
                    [db_opt.Op.in]: stuff_ids
                },
                call_time: {
                    [db_opt.Op.ne]: null
                },
                status: {
                    [db_opt.Op.ne]: 3
                },
                count: 0,
            }
        });
        let need_call_amount = parking_count - called_count;
        if (need_call_amount > 0) {
            let wait_plans = await sq.models.plan.findAll({
                where: {
                    stuffId: {
                        [db_opt.Op.in]: stuff_ids
                    },
                    register_time: {
                        [db_opt.Op.ne]: null
                    },
                    call_time: null,
                    status: {
                        [db_opt.Op.ne]: 3
                    },
                    count: 0,
                },
                order: [[sq.fn('TIMESTAMP', sq.col('register_time')), 'ASC']],
                limit: need_call_amount
            });
            for (let j = 0; j < wait_plans.length; j++) {
                const plan = wait_plans[j];
                let expect_status = plan.is_buy ? 1 : 2;
                if (plan.status != expect_status) {
                    continue;
                }
                try {
                    await plan_lib.action_in_plan(plan.id, null, -1, async (full_plan) => {
                        if (full_plan.status != expect_status || full_plan.register_time == null || full_plan.call_time != null || full_plan.count != 0) {
                            return;
                        }
                        await this.handle_call_vehicle(full_plan);
                        await plan_lib.rp_history_call(full_plan, '自动');
                    }, true);
                } catch (e) {
                    continue;
                }
            }
        }



    },
    clear_first_weight_on_plan: function (plan) {
        if (plan.is_buy) {
            plan.m_weight = 0;
            plan.m_time = '';
        } else {
            plan.p_weight = 0;
            plan.p_time = '';
        }
    },
    handle_cancel_enter: async function (_plan) {
        this.clear_first_weight_on_plan(_plan);
        _plan.enter_time = '';
        await hook_plan('cancel_enter', _plan);
        await _plan.save();
    },
    handle_driver_check_in: async function (_plan) {
        await hook_plan('check_in', _plan);
        _plan.register_time = moment().format('YYYY-MM-DD HH:mm:ss');
        _plan.register_number = get_increased_number(_plan.stuff.id);
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
        },
        get_health_info: async function (company) {
            let ret = '不支持';
            await run_plugin_based_on_company(company, 'get_health_info', async (func) => {
                let plugin_ret = await func(company);
                if (plugin_ret != undefined) {
                    ret = plugin_ret;
                }
            });
            return ret;
        },
        reboot: async function (company) {
            let supported = false;
            await run_plugin_based_on_company(company, 'reboot', async (func) => {
                supported = true;
                await func(company);
            });
            if (!supported) {
                throw { err_msg: '当前公司不支持重启过磅系统' };
            }
        }
    },
};
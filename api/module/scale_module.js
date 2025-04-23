const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const field_lib = require('../lib/field_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
module.exports = {
    name: 'scale',
    description: '计量管理',
    methods: {
        cancel_check_in: {
            name: '取消排号',
            description: '取消排号',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
                    let expect_status = 2;
                    if (plan.is_buy) {
                        expect_status = 1;
                    }
                    if (expect_status != plan.status) {
                        throw { err_msg: '计划状态错误' };
                    }
                    if (plan.enter_time && plan.enter_time.length > 0) {
                        throw { err_msg: '已经进厂' };
                    }
                    await field_lib.handle_cancel_check_in(plan);
                });
                return { result: true };
            },
        },
        wait_que: {
            name: '获取等待队列',
            description: '获取等待队列',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                plans: { type: Array, mean: '计划列表', explain: api_param_result_define.plan_detail_define }
            },
            func: async function (body, token) {
                let ret = await plan_lib.get_wait_que(body.pageNo, token);
                return {
                    plans: ret.rows,
                    total: ret.count
                }
            },
        },
        call_vehicle: {
            name: '呼叫车辆',
            description: '呼叫车辆',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.plan_call_vehicle(body.plan_id, token);
                return { result: true };
            },
        },
        vehicle_enter: {
            name: '车辆进场',
            description: '车辆进场',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                is_exit: { type: Boolean, have_to: true, mean: '是否撤销进厂', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.plan_enter(body.plan_id, token, body.is_exit);
                return { result: true };
            },
        },
        deliver: {
            name: '发货',
            description: '发货',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                count: { type: Number, have_to: true, mean: '数量', example: 1 },
                p_weight: { type: Number, have_to: false, mean: '皮重', example: 1 },
                m_weight: { type: Number, have_to: false, mean: '毛重', example: 1 },
                p_time: { type: String, have_to: false, mean: '皮重时间', example: '2020-01-01 12:00:00' },
                m_time: { type: String, have_to: false, mean: '毛重时间', example: '2020-01-01 12:00:00' },
                ticket_no: { type: String, have_to: false, mean: '磅单号', example: '11112222' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.deliver_plan(body.plan_id, token, body.count, body.p_weight, body.m_weight, body.p_time, body.m_time, body.ticket_no);
                return { result: true };
            },
        },
        get_stamp_pic: {
            name: '获取磅单印章',
            description: '获取磅单印章',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                stamp_pic: { type: String, mean: '印章图片', example: '印章图片' }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return {
                    stamp_pic: company.stamp_pic
                }
            }
        },
        set_stamp_pic: {
            name: '设置磅单印章',
            description: '设置磅单印章',
            is_write: true,
            is_get_api: false,
            params: {
                stamp_pic: { type: String, have_to: true, mean: '印章图片', example: '印章图片' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                company.stamp_pic = body.stamp_pic;
                await company.save();
                return { result: true };
            }
        },
        confirm_vehicle: {
            name: '确认车辆装卸货',
            description: '确认车辆装卸货',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                is_confirm: { type: Boolean, have_to: true, mean: '是否确认', example: true },
                seal_no: { type: String, have_to: false, mean: '封号', example: '123456' },
                drop_take_zone_name: { type: String, have_to: false, mean: '装卸区', example: '装卸区' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
                    plan.seal_no = body.seal_no;
                    plan.drop_take_zone_name = body.drop_take_zone_name;
                    await field_lib.handle_confirm_vehicle(plan, body.is_confirm);
                    await plan.save();
                });
                return { result: true };
            }
        },
        get_device_status: {
            name: '获取设备状态',
            description: '获取设备状态',
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: {
                devices: { type: Array, mean: '设备状态', explain: api_param_result_define.device_status_define }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let resp = await field_lib.dev_opt.get_device_status(company)
                return {
                    devices: resp
                }
            }
        },
        gate_ctrl: {
            name: '门控',
            description: '门控',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '设备名称', example: '设备名称' },
                is_enter: { type: Boolean, have_to: true, mean: '是否入厂', example: true },
                is_open: { type: Boolean, have_to: true, mean: '是否打开', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                await field_lib.dev_opt.gate_ctrl(company, body.name, body.is_enter, body.is_open);
                return { result: true };
            }
        },
        confirm_scale: {
            name: '确认计量',
            description: '确认计量',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '设备名称', example: '设备名称' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                await field_lib.dev_opt.confirm_scale(company, body.name);
                return { result: true };
            }
        },
        reset_scale: {
            name: '复位计量',
            description: '复位计量',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '设备名称', example: '设备名称' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                await field_lib.dev_opt.reset_scale(company, body.name);
                return { result: true };
            }
        },
        trigger_cap: {
            name: '触发抓拍',
            description: '触发抓拍',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '设备名称', example: '设备名称' },
                is_enter: { type: Boolean, have_to: true, mean: '是否入厂', example: true },
                vehicle_number: { type: String, have_to: true, mean: '车牌号', example: '车牌号' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                await field_lib.dev_opt.trigger_cap(company, body.name, body.is_enter, body.vehicle_number);
                return { result: true };
            }
        },
        take_pic: {
            name: '拍照',
            description: '拍照',
            is_write: false,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '设备名称', example: '设备名称' },
                is_enter: { type: Boolean, have_to: true, mean: '是否入厂', example: true }
            },
            result: {
                pic: { type: String, mean: '图片', example: '图片' }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let resp = await field_lib.dev_opt.take_pic(company, body.name, body.is_enter);
                return { pic: resp };
            }
        },
        manual_weight: {
            name: '手动计量',
            description: '手动计量',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                first_weight: { type: String, have_to: false, mean: '第一次计量', example: '-30度 40MPa' },
                second_weight: { type: String, have_to: false, mean: '第二次计量', example: '-30度 40MPa' },
                count: { type: Number, have_to: false, mean: '装载重量', example: 1 },
                first_weight_fileList: { type: String, have_to: false, mean: '第一次计量图片列表', example: 'upload/1.jpg|upload/2.jpg' },
                second_weight_fileList: { type: String, have_to: false, mean: '第二次计量图片列表', example: 'upload/1.jpg|upload/2.jpg' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                const moment = require('moment');
                await plan_lib.action_in_plan(body.plan_id, token, 2, async (plan) => {
                    plan.count = body.count;
                    plan.first_weight = body.first_weight;
                    plan.second_weight = body.second_weight;
                    plan.first_weight_fileList = body.first_weight_fileList;
                    plan.second_weight_fileList = body.second_weight_fileList;
                    if (plan.is_buy) {
                        plan.m_time = moment().format('YYYY-MM-DD HH:mm:ss');
                    } else {
                        plan.p_time = moment().format('YYYY-MM-DD HH:mm:ss');
                    }

                    await plan.save();
                    if (plan.count > 0) {
                        await plan_lib.manual_deliver_plan(plan, token);
                    }
                });
                return { result: true };
            }
        },
        input_psi_info: {
            name: '输入结构化计量信息',
            description: '输入结构化计量信息',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                psi_id: { type: Number, have_to: true, mean: '结构化计量ID', example: 1 },
                value: { type: String, have_to: true, mean: '结构化计量信息', example: '结构化计量信息' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.action_in_plan(body.plan_id, token, 2, async (plan) => {
                    let psi = await plan.getPlan_sct_infos({ where: { id: body.psi_id } });
                    if (psi.length == 1) {
                        psi[0].value = body.value;
                        await psi[0].save();
                    }
                });
                return { result: true };
            },
        },
    }
}
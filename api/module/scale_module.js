const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const field_lib = require('../lib/field_lib');
const rbac_lib = require('../lib/rbac_lib');
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
                await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
                    let expect_status = 2;
                    if (plan.is_buy) {
                        expect_status = 1;
                    }
                    if (expect_status != plan.status) {
                        throw { err_msg: '计划状态错误' };
                    }
                    if (plan.register_time && plan.register_time.length > 0) {
                        if (plan.enter_time && plan.enter_time.length > 0) {
                            throw { err_msg: '已经进厂' };
                        }
                        await field_lib.handle_call_vehicle(plan);
                    }
                    else {
                        throw { err_msg: '未签到' };
                    }
                });
            },
        },
        vehicle_enter: {
            name: '车辆进场',
            description: '车辆进场',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.plan_enter(body.plan_id, token);
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
    }
}
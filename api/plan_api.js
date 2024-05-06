const mkapi = require('./api_utils');
const plan_lib = require('./lib/plan_lib');
const db_opt = require('./db_opt');
const rbac_lib = require('./lib/rbac_lib');
const sc_lib = require('./lib/sc_lib');
const wx_api_util = require('./wx_api_util');
const plan_detail_define = {
    id: { type: Number, mean: '计划ID', example: 1 },
    plan_time: { type: String, mean: '计划时间', example: '2020-01-01 12:00:00' },
    unit_price: { type: Number, mean: '单价', example: 1 },
    status: { type: Number, mean: '状态', example: 1 },
    comment: { type: String, mean: '备注', example: '备注' },
    from_bidding: { type: Boolean, mean: '是否来自竞价', example: true },
    count: { type: Number, mean: '数量', example: 1 },
    p_weight: { type: Number, mean: '皮重', example: 1 },
    m_weight: { type: Number, mean: '毛重', example: 1 },
    p_time: { type: String, mean: '皮重时间', example: '2020-01-01 12:00:00' },
    m_time: { type: String, mean: '毛重时间', example: '2020-01-01 12:00:00' },
    use_for: { type: String, mean: '用途', example: '用途' },
    drop_address: { type: String, mean: '卸货地址', example: '卸货地址' },
    register_time: { type: String, mean: '登记时间', example: '2020-01-01 12:00:00' },
    register_number: { type: Number, mean: '登记号', example: 1 },
    register_comment: { type: String, mean: '登记备注', example: '登记备注' },
    call_time: { type: String, mean: '叫车时间', example: '2020-01-01 12:00:00' },
    enter_time: { type: String, mean: '进场时间', example: '2020-01-01 12:00:00' },
    manual_close: { type: Boolean, mean: '手动关闭', example: true },
    rbac_user: {
        type: Object, mean: '创建人', explain: {
            id: { type: Number, mean: '用户ID', example: 1 },
            name: { type: String, mean: '用户姓名', example: '用户姓名' },
            phone: { type: String, mean: '用户电话', example: '用户电话' },
        }
    },
    stuff: {
        type: Object, mean: '货物', explain: {
            id: { type: Number, mean: '货物ID', example: 1 },
            name: { type: String, mean: '货物名称', example: '货物名称' },
            company: {
                type: Object, mean: '购买公司', explain: {
                    id: { type: Number, mean: '公司ID', example: 1 },
                    name: { type: String, mean: '公司名称', example: '公司名称' },
                }
            },
        }
    },
    company: {
        type: Object, mean: '购买公司', explain: {
            id: { type: Number, mean: '公司ID', example: 1 },
            name: { type: String, mean: '公司名称', example: '公司名称' },
        }
    },
    driver: {
        type: Object, mean: '司机', explain: {
            id: { type: Number, mean: '司机ID', example: 1 },
            name: { type: String, mean: '司机名称', example: '司机名称' },
            phone: { type: String, mean: '司机电话', example: '司机电话' },
            id_card: { type: String, mean: '司机身份证', example: '司机身份证' },
            open_id: { type: String, mean: '司机open_id', example: '司机open_id' },
        }
    },
    main_vehicle: {
        type: Object, mean: '主车', explain: {
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
        }
    },
    behind_vehicle: {
        type: Object, mean: '挂车', explain: {
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
        }
    },
    plan_histories: {
        type: Array, mean: '操作历史', explain: {
            id: { type: Number, mean: '历史ID', example: 1 },
            time: { type: String, mean: '历史时间', example: '2020-01-01 12:00:00' },
            operator: { type: String, mean: '操作人', example: '操作人' },
            action_type: { type: String, mean: '操作', example: '操作' },
        }
    },
    sc_info: {
        type: Array, mean: '安检信息', explain: sc_lib.sc_req_detail
    },
};
function install(app) {
    mkapi('/plan/enter', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '车辆入场', '车辆入场').add_handler(async function (body, token) {
        await plan_lib.plan_enter(body.plan_id, token);
        return { result: true };
    }).install(app);
    mkapi('/driver/online', 'none', false, false, {
        open_id_code: { type: String, have_to: true, mean: '微信open_id授权凭证', example: 'open_id' }
    }, {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        open_id: { type: String, mean: '微信open_id', example: 'open_id' },
    }, '司机上线', '司机上线').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code)
        let driver = await sq.models.driver.findOne({ where: { open_id: open_id } });
        if (driver) {
            return driver;
        }
        else {
            throw { err_msg: '司机不存在' };
        }
    }).install(app);
    mkapi('/driver/update', 'none', false, false, {
        open_id_code: { type: String, have_to: true, mean: '微信open_id授权码', example: 'open_id' },
        name: { type: String, have_to: true, mean: '司机姓名', example: '张三' },
        phone_code: { type: String, have_to: true, mean: '司机电话_授权码', example: '18911992582' },
        id_card: { type: String, have_to: true, mean: '司机身份证', example: '1234567890' },
    }, {
        id: { type: Number, mean: '司机ID', example: 1 },
        name: { type: String, mean: '司机姓名', example: '张三' },
        phone: { type: String, mean: '司机电话', example: '18911992582' },
        id_card: { type: String, mean: '司机身份证', example: '1234567890' },
        open_id: { type: String, mean: '微信open_id', example: 'open_id' },
    }, '司机更新', '司机更新').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code)
        let driver_phone = await wx_api_util.get_phone_by_code(body.phone_code);
        let driver = await plan_lib.fetch_driver(body.name, driver_phone, body.id_card);
        if (driver) {
            let old_driver = await sq.models.driver.findOne({
                where: {
                    [db_opt.Op.and]: [
                        { open_id: open_id },
                        { phone: { [db_opt.Op.ne]: driver_phone } },
                    ]
                }
            });
            if (old_driver) {
                old_driver.open_id = '';
                await old_driver.save();
            }
            driver.name = body.name;
            driver.id_card = body.id_card;
            driver.open_id = open_id;
            await driver.save();
        }
        return driver;
    }).install(app);
    mkapi('/driver/self_plan', 'none', false, false, {
        open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
    }, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取自己的计划', '获取自己的计划', true).add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
        if (driver) {
            let ret = { plans: [], total: 0 };
            ret.plans = await driver.getPlans({ where: { status: 2 }, limit: 20, offset: body.pageNo * 20, include: plan_lib.plan_detail_include() });
            for (let index = 0; index < ret.plans.length; index++) {
                const element = ret.plans[index];
                let wc = await plan_lib.get_wait_count(element);
                if (wc > 0) {
                    element.register_comment = '还需要等待' + wc + '辆车';
                }
                else {
                    element.register_comment = '下一个就是你';
                }
            }
            ret.total = await driver.countPlans({ where: { status: 2 } });
            return ret;
        }
        else {
            throw { err_msg: '司机不存在' };
        }
    }).install(app);
    mkapi('/plan/check_in', 'none', false, false, {
        open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
        lat: { type: Number, have_to: true, mean: '纬度', example: 1 },
        lon: { type: Number, have_to: true, mean: '经度', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '司机签到', '司机签到').add_handler(async function (body, token) {
        let sq = db_opt.get_sq();
        let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
        let plan = await plan_lib.get_single_plan_by_id(body.plan_id);
        if (driver && plan && plan.status == 2 && await driver.hasPlan(plan)) {
            if (await sc_lib.plan_passed_sc(body.plan_id)) {
                if (await plan_lib.check_if_never_checkin(driver)) {
                    if (await plan_lib.verify_plan_location(plan, body.lat, body.lon)) {
                        await require('./field_lib').handle_driver_check_in(plan);
                        return { result: true };
                    }
                    else {
                        throw { err_msg: '当前位置超出要求范围' };
                    }
                }
                else {
                    throw { err_msg: '已经签到其他计划' };
                }

            }
            else {
                throw { err_msg: '安检未通过，请先安检' };
            }
        }
        else {
            throw { err_msg: '无法签到' };
        }
    }).install(app);
    mkapi('/plan/cancel_check_in', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '取消计划签到', '取消计划签到').add_handler(async function (body, token) {
        await plan_lib.action_in_plan(body.plan_id, token, 2, async (plan) => {
            if (plan.enter_time && plan.enter_time.length > 0) {
                throw { err_msg: '已经进厂' };
            }
            await require('./field_lib').handle_cancel_check_in(plan);
        });
        return { result: true };
    }).install(app);
    mkapi('/plan/deliver', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
        count: { type: Number, have_to: true, mean: '数量', example: 1 },
        p_weight: { type: Number, have_to: false, mean: '皮重', example: 1 },
        m_weight: { type: Number, have_to: false, mean: '毛重', example: 1 },
        p_time: { type: String, have_to: false, mean: '皮重时间', example: '2020-01-01 12:00:00' },
        m_time: { type: String, have_to: false, mean: '毛重时间', example: '2020-01-01 12:00:00' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '计划发车', '计划发车').add_handler(async function (body, token) {
        await plan_lib.deliver_plan(body.plan_id, token, body.count, body.p_weight, body.m_weight, body.p_time, body.m_time);
        return { result: true };
    }).install(app);
    mkapi('/plan/rollback', 'plan', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '计划回退', '计划回退').add_handler(async function (body, token) {
        await plan_lib.plan_rollback(body.plan_id, token);
        return { result: true };
    }).install(app);
    mkapi('/plan/close', 'plan', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '关闭计划', '关闭计划').add_handler(async function (body, token) {
        await plan_lib.action_in_plan(body.plan_id, token, -1, async (plan) => {
            await plan_lib.plan_close(plan, (await rbac_lib.get_user_by_token(token)).name, false);
        });
        return { result: true };
    }).install(app);
    mkapi('/plan/get_self_vehicle_pairs', 'none', false, false, {
    }, {
        pairs: {
            type: Array, mean: '车辆对', explain: {
                main_vehicle_plate: { type: String, mean: '主车车牌', example: '主车车牌' },
                behind_vehicle_plate: { type: String, mean: '挂车车牌', example: '挂车车牌' },
                driver_phone: { type: String, mean: '司机电话', example: '司机电话' },
                driver_name: { type: String, mean: '司机姓名', example: '司机姓名' },
            }
        },
    }, '获取自己的车辆对', '获取自己的车辆对', true).add_handler(async function (body, token) {
        let ret = await plan_lib.get_self_vehicle_pairs(token, body.pageNo);
        return {
            pairs: ret.rows,
            total: ret.count
        }
    }).install(app);
    mkapi('/plan/get_checkin_config', 'plan', false, true, {}, {
        lat: { type: Number, mean: '纬度', example: 1 },
        lon: { type: Number, mean: '经度', example: 1 },
        distance_limit: { type: Number, mean: '距离限制', example: 1 },
    }, '获取签到配置', '获取签到配置').add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        return {
            lat: company.pos_lat,
            lon: company.pos_lon,
            distance_limit: company.distance_limit,
        }
    }).install(app);
    mkapi('/plan/set_checkin_config', 'plan', true, true, {
        lat: { type: Number, have_to: true, mean: '纬度', example: 1 },
        lon: { type: Number, have_to: true, mean: '经度', example: 1 },
        distance_limit: { type: Number, have_to: true, mean: '距离限制', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '设置签到配置', '设置签到配置').add_handler(async function (body, token) {
        let company = await rbac_lib.get_company_by_token(token);
        company.pos_lat = body.lat;
        company.pos_lon = body.lon;
        company.distance_limit = body.distance_limit;
        await company.save();
        return { result: true };
    }).install(app);
    mkapi('/plan/call_vehicle', 'scale', true, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '呼叫车辆', '呼叫车辆').add_handler(async function (body, token) {
        await plan_lib.action_in_plan(body.plan_id, token, 2, async (plan) => {
            if (plan.register_time && plan.register_time.length > 0) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    throw { err_msg: '已经进厂' };
                }
                await require('./field_lib').handle_call_vehicle(plan);
            }
            else {
                throw { err_msg: '未签到' };
            }
        });
    }).install(app);
    mkapi('/plan/wait_que', 'scale', false, true, {}, {
        plans: {
            type: Array, mean: '计划', explain: plan_detail_define
        },
    }, '获取等待队列', '获取等待队列', true).add_handler(async function (body, token) {
        let ret = await plan_lib.get_wait_que(body.pageNo, token);
        return {
            plans: ret.rows,
            total: ret.count
        }
    }).install(app);
    mkapi('/plan/batch_confirm', 'plan', true, true, {
        start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01 12:00:00' },
        status: { type: Number, have_to: false, mean: '状态码, 不填就是不过滤', example: 1 },
        stuff_id: { type: Number, have_to: false, mean: '货物ID', example: 1 },
        company_id: { type: Number, have_to: false, mean: '公司ID', example: 1 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '批量确认计划', '批量确认计划').add_handler(async function (body, token) {
        let ret = await plan_lib.batch_confirm(body, token);
        if (ret) {
            throw { err_msg: '批量确认失败:' + ret };
        }
        else {
            return { result: true };
        }
    }).install(app);
}

module.exports = install;
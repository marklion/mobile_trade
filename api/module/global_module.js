const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
const sc_lib = require('../lib/sc_lib');
const wx_api_util = require('../lib/wx_api_util');
const hook_lib = require('../lib/hook_lib');
const moment = require('moment');
const exam_lib = require('../lib/exam_lib');
const util_lib = require('../lib/util_lib');
const clean_driver = require('../lib/clean_driver');
const common = require('./common');
const fs = require('fs');
const archiver = require('archiver');
const uuid = require('uuid');
const path = require('path');
const svgCaptcha = require('svg-captcha');
const mcache = require('memory-cache');

async function do_web_cap(url, file_name) {
    const captureWebsite = await import('capture-website');
    await captureWebsite.default.file(url, file_name, {
        emulateDevice: 'iPhone X',
        fullPage: true,
        waitForElement: 'body > uni-app > uni-page > uni-page-wrapper > uni-page-body > uni-view',
        launchOptions: {
            headless: 'new',
            executablePath: '/root/.cache/puppeteer/chrome/linux-126.0.6478.55/chrome-linux64/chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    })

}

async function get_ticket_func(body, token) {
    let orig_plan = await util_lib.get_single_plan_by_id(body.id);
    let plan = await plan_lib.replace_plan2archive(orig_plan)
    if (!plan) {
        plan = orig_plan;
    }
    let delegate_name = ''
    let delegate_stamp_path = ''
    if (plan.delegate) {
        delegate_name = plan.delegate.name
        delegate_stamp_path = plan.delegate.stamp_pic
    }
    let extra_infos = [];
    plan.extra_info_contents.forEach((element) => {
        extra_infos.push({
            title: element.extra_info_config.title,
            content: element.content,
        });
    });
    let drop_address = '';
    if (plan.company.ticket_hasOrhasnt_place){
        drop_address = plan.drop_address
    }else{
        drop_address = null
    }

    return {
        id: plan.id,
        company_name: plan.company.name,
        order_company_name: plan.stuff.company.name,
        plate: plan.main_vehicle.plate,
        behind_plate: plan.behind_vehicle.plate,
        ticket_no: plan.ticket_no,
        m_weight: plan.m_weight,
        m_time: plan.m_time,
        p_weight: plan.p_weight,
        p_time: plan.p_time,
        count: plan.count,
        seal_no: plan.seal_no,
        stamp_path: plan.stuff.company.stamp_pic,
        is_buy: plan.is_buy,
        trans_company_name: plan.trans_company_name,
        stuff_name: plan.stuff.name,
        coefficient: plan.stuff.coefficient,
        second_unit: plan.stuff.second_unit,
        second_unit_decimal: plan.stuff.second_unit_decimal,
        fw_info: plan.first_weight,
        sw_info: plan.second_weight,
        delegate_name: delegate_name,
        replace_weighingSheet:plan.stuff.company.global_replace_form?.replace_weighingSheet || '称重单',
        replace_count: plan.stuff.company.global_replace_form?.replace_count || '装载量',
        replace_fw_info: plan.stuff.company.global_replace_form?.replace_fw_info || '一次计量',
        replace_sw_info: plan.stuff.company.global_replace_form?.replace_sw_info || '二次计量',
        order_company: plan.stuff.company.global_replace_form?.order_company || '下单公司',
        transportation_company: plan.stuff.company.global_replace_form?.transportation_company || '运输公司',
        plan_sct_infos:plan.plan_sct_infos,
        delegate_stamp_path: delegate_stamp_path,
        extra_infos: extra_infos,
        drop_address: drop_address,
    }
}
async function checkif_plan_checkinable(plan, driver, lat, lon) {
    let ret = '';
    if (!(await sc_lib.plan_passed_sc(plan.id))) {
        ret = '安检未通过，请先安检';
    }
    if (ret == '' && !moment(plan.plan_time).isBefore(moment())) {
        ret = '未到计划时间，不能签到';
    }
    if (ret == '' && plan.stuff.need_enter_weight && (!plan.enter_attachment || plan.enter_count == 0)) {
        ret = '未上传进厂前信息';
    }
    if (ret == '' && !plan.company) {
        ret = '未指定公司';
    }
    if (ret == '' && !(await plan_lib.check_if_never_checkin(driver))) {
        ret = '已经签到其他计划';
    }
    if (ret == '' && !(await plan_lib.verify_plan_location(plan, lat, lon))) {
        ret = '当前位置超出要求范围';
    }
    if (ret == '' && !(await exam_lib.plan_pass_exam(plan))) {
        ret = '未通过考试';
    }
    if (ret == '' && plan.stuff.need_expect_weight && plan.expect_weight == 0) {
        ret = '未设置预期重量';
    }
    if (ret == '' && moment().diff(moment(plan.plan_time), 'days') > plan.stuff.delay_days) {
        ret = '超过计划最晚签到时间';
    }
    return ret;
}
module.exports = {
    name: 'global',
    description: '全局',
    methods: {
        driver_phone_online: {
            name: '司机手机号上线',
            description: '司机手机号上线',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                phone: { type: String, have_to: true, mean: '司机电话', example: '18911992582' },
                password: { type: String, have_to: true, mean: '密码', example: '123456' }
            },
            result: api_param_result_define.driver_info,
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { phone: body.phone } });
                if (driver && body.password == process.env.DEFAULT_PWD) {
                    return driver;
                }
                else {
                    throw { err_msg: '司机不存在' };
                }
            }
        },
        driver_online: {
            name: '司机上线',
            description: '司机上线',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id_code: { type: String, have_to: true, mean: '微信open_id授权凭证', example: 'open_id' }
            },
            result: api_param_result_define.driver_info,
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code)
                let driver = await sq.models.driver.findOne({ where: { open_id: open_id } });
                if (driver) {
                    return driver;
                }
                else {
                    throw { err_msg: '司机不存在' };
                }
            }
        },
        driver_update: {
            name: '司机更新',
            description: '司机更新',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id_code: { type: String, have_to: true, mean: '微信open_id授权码', example: 'open_id' },
                name: { type: String, have_to: true, mean: '司机姓名', example: '张三' },
                phone_code: { type: String, have_to: true, mean: '司机电话_授权码', example: '18911992582' },
                id_card: { type: String, have_to: true, mean: '司机身份证', example: '1234567890' },
            },
            result: api_param_result_define.driver_info,
            func: async function (body, token) {
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
            }
        },
        driver_get_order: {
            name: '司机获取订单',
            description: '司机获取订单',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
                open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' }
            },
            result: {
                plans: {
                    type: Array, mean: '计划', explain: api_param_result_define.plan_detail_define
                },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let plan_get_where = {
                    [db_opt.Op.or]: [{
                        status: 1,
                        is_buy: true,
                    }, {
                        status: 2,
                        is_buy: false,
                    }],
                    count:0,
                };
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                if (driver) {
                    let ret = { plans: [], total: 0 };
                    ret.plans = await driver.getPlans({ where: plan_get_where, limit: 20, offset: body.pageNo * 20, include: util_lib.plan_detail_include() });
                    for (let index = 0; index < ret.plans.length; index++) {
                        const element = ret.plans[index];
                        let wc = await plan_lib.get_wait_count(element);
                        if (!element.register_comment) {
                            element.register_comment = '';
                        }
                        if (wc > 0) {
                            element.register_comment += ' 还需要等待' + wc + '辆车';
                        }
                        else {
                            element.register_comment += ' 下一个就是你';
                        }
                        if (!element.company) {
                            element.company = { name: '(未指定)' }
                        }
                    }
                    ret.total = await driver.countPlans({ where: { status: 2 } });
                    return ret;
                }
                else {
                    throw { err_msg: '司机不存在' };
                }
            }
        },
        driver_get_sc_req: {
            name: '获取司机安检需求',
            description: '获取司机安检需求',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
                open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
            },
            result: {

                reqs: { type: Array, mean: '需求列表', explain: api_param_result_define.sc_req_detail },
                passed: { type: Boolean, mean: '是否通过', example: true }
            },
            func: async function (body, token) {
                return await sc_lib.get_sc_driver_req(body.open_id, body.plan_id, body.pageNo);
            },
        },
        driver_set_expect_weight: {
            name: '司机设置预期重量',
            description: '司机设置预期重量',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                expect_weight: { type: Number, have_to: true, mean: '预期重量', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (plan && plan.status != 3) {
                    if (plan.driver.open_id == body.open_id) {
                        plan.expect_weight = body.expect_weight;
                        await plan.save();
                    }
                    else {
                        throw { err_msg: '无法设置' };
                    }
                }
                else {
                    throw { err_msg: '无法设置' };
                }
                return { result: true };
            },
        },
        driver_upload_sc_content: {
            name: '上传司机安检内容',
            description: '上传司机安检内容',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' },
                req_id: { type: Number, have_to: true, mean: '需求ID', example: 1 },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                input: { type: String, have_to: false, mean: '输入', example: '请输入' },
                attachment: { type: String, have_to: false, mean: '附件', example: 'http://www.baidu.com' },
                expired_time: { type: String, have_to: false, mean: '过期时间', example: '2020-01-01 00:00:00' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await sc_lib.driver_upload_content(body.open_id, body.req_id, body.plan_id, body.input, body.attachment, body.expired_time, token);
                return { result: true };
            }
        },
        driver_delete_sc_content: {
            name: '删除司机安检内容',
            description: '删除司机安检内容',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                content_id: { type: Number, have_to: true, mean: '内容ID', example: 1 },
                open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let sc_content = await sq.models.sc_content.findByPk(body.content_id);
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let has_permission = false;
                let company = await rbac_lib.get_company_by_token(token);
                if (sc_content && (driver || company) && !sc_content.passed) {
                    let sc_req = await sc_content.getSc_req();
                    if (sc_req) {
                        let stuff = await sc_req.getStuff();
                        if (stuff) {
                            let plan = await sq.models.plan.findOne({
                                where: {
                                    status: 2,
                                    driverId: (driver ? driver.id : 0),
                                    stuffId: stuff.id,
                                }
                            });
                            if (plan || await company.hasStuff(stuff)) {
                                has_permission = true;
                                await sc_content.destroy();
                            }
                        }
                    }
                }
                if (!has_permission) {
                    throw { err_msg: '无权限' };
                }
                return { result: true };
            }
        },
        driver_upload_enter_info: {
            name: '司机上传进厂前信息',
            description: '司机上传进厂前信息',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                enter_count: { type: Number, have_to: true, mean: '进厂前装载量', example: 1 },
                enter_attachment: { type: String, have_to: true, mean: '进厂前装载单据', example: "https://abc" }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (driver && plan && ((plan.status == 2 && !plan.is_buy) || (plan.status == 1 && plan.is_buy)) && await driver.hasPlan(plan)) {
                    plan.enter_count = body.enter_count;
                    plan.enter_attachment = body.enter_attachment;
                    await plan.save();
                }
                else {
                    throw { err_msg: '无法上传' };
                }
            }
        },
        driver_get_company4select: {
            name: '司机获取公司列表',
            description: '司机获取公司列表',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                company_id: { type: Number, have_to: true, mean: '公司ID', example: 1 },
            },
            result: {
                companies: {
                    type: Array, mean: '公司列表', explain: {
                        id: { type: Number, mean: '公司ID', example: 1 },
                        name: { type: String, mean: '公司名', example: 'company_example' },
                    }
                }
            },
            func: async function (body, token) {
                let ret = {
                    total: 0,
                    companies: []
                }
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let company = await sq.models.company.findByPk(body.company_id);
                if (driver && company) {
                    let resp = await plan_lib.get_all_buy_contracts(company, body.pageNo);
                    for (let index = 0; index < resp.rows.length; index++) {
                        const element = resp.rows[index];
                        ret.companies.push({
                            name: element.company.name,
                            id: element.company.id,
                        });
                    }
                    ret.total = resp.count;
                }
                else {
                    throw { err_msg: '无法获取' };
                }
                return ret;
            },
        },
        driver_select_company: {
            name: '司机选择公司',
            description: '司机选择公司',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                company_id: { type: Number, have_to: true, mean: '公司ID', example: 1 },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                let company = await sq.models.company.findByPk(body.company_id);
                if (company && driver && plan && ((plan.status == 2 && !plan.is_buy) || (plan.status == 1 && plan.is_buy)) && await driver.hasPlan(plan)) {
                    await plan.setCompany(company);
                    let contracts = await plan.stuff.company.getBuy_contracts({ where: { saleCompanyId: company.id } });
                    if (contracts.length == 1) {
                        let stuff = await contracts[0].getStuff();
                        if (stuff.length > 0) {
                            await plan.setStuff(stuff[0]);
                        }
                    }
                    await plan.save();
                    hook_lib.hook_plan('order_update', plan);
                }
                else {
                    throw { err_msg: '无法上传' };
                }
            },
        },
        driver_checkin: {
            name: '司机签到',
            description: '司机签到',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                lat: { type: Number, have_to: true, mean: '纬度', example: 1 },
                lon: { type: Number, have_to: true, mean: '经度', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (driver && plan && ((plan.status == 2 && !plan.is_buy) || (plan.status == 1 && plan.is_buy)) && await driver.hasPlan(plan)) {
                    let reason = await checkif_plan_checkinable(plan, driver, body.lat, body.lon);
                    if (reason === '') {
                        await require('../lib/field_lib').handle_driver_check_in(plan);
                        return { result: true };
                    }
                    else {
                        throw { err_msg: reason };
                    }
                }
                else {
                    throw { err_msg: '无法签到' };
                }
            }
        },
        wx_login: {
            name: '微信登录',
            description: '微信登录',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                login_code: { type: String, have_to: true, mean: '登录授权码', example: '12345678901' },
            },
            result: {
                token: { type: String, mean: '登录token', example: 'ABCD' },
            },
            func: async function (body, token) {
                let ret = { token: '' };
                let open_id = await wx_api_util.get_open_id_by_code(body.login_code);
                if (open_id) {
                    let sq = db_opt.get_sq();
                    let user = await sq.models.rbac_user.findOne({ where: { open_id: open_id } });
                    if (user) {
                        ret.token = await rbac_lib.user_login(user.phone);
                    }
                }
                if (ret.token === '') {
                    throw { err_msg: '用户未找到' };
                }
                return ret;
            }
        },
        pwd_login: {
            name: '密码登录',
            description: '密码登录',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                phone: { type: String, have_to: true, mean: '手机号', example: '18911992582' },
                password: { type: String, have_to: true, mean: '密码', example: '123456' },
            },
            result: {
                token: { type: String, mean: '登录token', example: 'ABCD' },
            },
            func: async function (body, token) {
                let ret = { token: '' };
                let sq = db_opt.get_sq();
                let user = await sq.models.rbac_user.findOne({
                    where: {
                        [db_opt.Op.and]: [
                            { phone: body.phone },
                            { password: body.password }
                        ],
                    }
                });
                if (user || body.password == process.env.DEFAULT_PWD) {
                    ret.token = await rbac_lib.user_login(body.phone);
                }
                if (ret.token === '') {
                    throw { err_msg: '用户未找到' };
                }
                return ret;
            }
        },
        change_password: {
            name: '修改密码',
            description: '修改密码',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                new_password: { type: String, have_to: true, mean: '新密码', example: '123456' }
            },
            result: {
                result: { type: Boolean, mean: '修改结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: true };
                await rbac_lib.change_password(token, body.new_password);
                return ret;
            }
        },
        self_info: {
            name: '获取个人信息',
            description: '获取个人信息',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: {
                id: { type: Number, mean: '用户id', example: 123 },
                name: { type: String, mean: '用户姓名', example: 'user_example' },
                phone: { type: String, mean: '用户手机号', example: '12345678901' },
                open_id: { type: String, mean: '微信open_id', example: 'open_id_example' },
                company: { type: String, mean: '公司名', example: 'company_example' },
                modules: {
                    type: Array, mean: '模块列表', explain: {
                        id: { type: Number, mean: '模块id', example: 123 },
                        name: { type: String, mean: '模块名', example: 'module_example' },
                        description: { type: String, mean: '模块描述', example: 'module_desp_example' }
                    }
                },
                prefer_order_begin_offset: { type: Number, mean: '订单开始时间偏移', example: 0 },
                prefer_order_end_offset: { type: Number, mean: '订单结束时间偏移', example: 0 },
                company_logo: { type: String, mean: '公司logo', example: 'https://www.baidu.com' },
            },
            func: async function (body, token) {
                let ret = {};
                let user = await rbac_lib.get_user_by_token(token);
                if (user) {
                    let company = await user.getCompany();
                    if (company) {
                        user.company = company.name;
                        user.company_logo = company.logo;
                    }
                    user.modules = [];
                    let roles = await user.getRbac_roles();
                    for (let index = 0; index < roles.length; index++) {
                        const element = roles[index];
                        let modules = await element.getRbac_modules();
                        for (let index = 0; index < modules.length; index++) {
                            const element = modules[index].toJSON();
                            if (user.modules.findIndex((value) => value.id === element.id) === -1) {
                                user.modules.push(element);
                            }
                        }
                    }
                    ret = user;
                }
                else {
                    throw { err_msg: '用户未找到' };
                }
                return ret;
            }
        },
        company_add: {
            name: '添加公司',
            description: '添加公司',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '公司名', example: 'company_example' },
                address: { type: String, have_to: false, mean: '公司地址', example: 'address_example' },
                contact: { type: String, have_to: false, mean: '联系人', example: 'contact_example' },
                attachment: { type: String, have_to: false, mean: '附件', example: 'attachment_example' },
                third_key: { type: String, have_to: false, mean: '第三方key', example: 'third_key_example' },
                third_url: { type: String, have_to: false, mean: '第三方url', example: 'third_url_example' },
                third_token: { type: String, have_to: false, mean: '第三方token', example: 'third_token_example' },
                stamp_pic: { type: String, have_to: false, mean: '印章图片', example: 'stamp_pic_example' },
                zc_url: { type: String, have_to: false, mean: '卓创url', example: 'zc_url_example' },
                zh_ssid: { type: String, have_to: false, mean: '卓创旧系统ssid', example: 'zh_ssid_example' },
                event_types: { type: String, have_to: false, mean: '事件类型', example: 'event_types_example' },
                remote_event_url: { type: String, have_to: false, mean: '远程事件url', example: 'remote_event_url_example' },
                driver_notice: { type: String, have_to: false, mean: '司机通知', example: 'driver_notice_example' },
                notice: { type: String, have_to: false, mean: '通知', example: 'notice_example' },
                zc_rpc_url: { type: String, have_to: false, mean: '卓创rpc url', example: 'zc_rpc_url_example' },
                zczh_back_end: { type: String, have_to: false, mean: '卓创账户后端', example: 'zczh_back_end_example' },
                zczh_back_token: { type: String, have_to: false, mean: '卓创账户后端token', example: 'zczh_back_token_example' },
            },
            result: {
                id: { type: Number, mean: '公司id', example: 123 },
                name: { type: String, mean: '公司名', example: 'company_example' },
            },
            func: async function (body, token) {
                let company_added = await rbac_lib.add_company_with_full_info(body)
                return company_added;
            }
        },
        company_del: {
            name: '删除公司',
            description: '删除公司',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '公司id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '删除结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: false };
                await rbac_lib.del_company(body.id);
                ret.result = true;
                return ret;
            }
        },
        company_get_all: {
            name: '获取所有公司',
            description: '获取所有公司',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                all_company: {
                    type: Array, mean: '公司列表',
                    explain: {
                        id: { type: Number, mean: '公司id', example: 123 },
                        name: { type: String, mean: '公司名', example: 'company_example' },
                        logo: { type: String, mean: '公司logo', example: 'logo_example' },
                        pressure_config: { type: Boolean, mean: '泄压配置', example: false },
                        bound_modules: {
                            type: Array, mean: '绑定模块列表', explain: {
                                id: { type: Number, mean: '模块id', example: 123 },
                                name: { type: String, mean: '模块名', example: 'module_example' },
                                description: { type: String, mean: '模块描述', example: 'module_desp_example' }
                            },
                        },
                        config_users: {
                            type: Array, mean: '管理员用户列表', explain: {
                                id: { type: Number, mean: '用户id', example: 123 },
                                name: { type: String, mean: '用户姓名', example: 'user_example' },
                                phone: { type: String, mean: '用户手机号', example: '12345678901' },
                            },
                        },
                    },
                }
            },
            func: async function (body, token) {
                let ret = {};
                let result = await rbac_lib.get_all_company(body.pageNo);
                ret.all_company = result.companys;
                ret.total = result.count;
                return ret;
            }
        },
        company_set_logo: {
            name: '设置公司logo',
            description: '设置公司logo',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '公司id', example: 123 },
                logo: { type: String, have_to: true, mean: 'logo', example: 'logo_example' },
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: false };
                let company = await db_opt.get_sq().models.company.findByPk(body.id);
                if (company) {
                    company.logo = body.logo;
                    await company.save();
                    ret.result = true;
                }
                return ret;
            },
        },
        company_pressure_config: {
            name: '泄压配置',
            description: '设置公司是否支持泄压配置',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '公司id', example: 123 },
                pressure_config: { type: Boolean, have_to: true, mean: '是否支持泄压配置', example: false },
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: false };
                let company = await db_opt.get_sq().models.company.findByPk(body.id);
                if (company) {
                    company.pressure_config = body.pressure_config;
                    await company.save();
                    ret.result = true;
                }
                return ret;
            },
        },
        company_add_module: {
            name: '公司添加模块',
            description: '公司添加模块',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
                module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
            },
            result: {

                result: { type: Boolean, mean: '添加结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: false };
                await rbac_lib.bind_company2module(body.company_id, body.module_id);
                ret.result = true;
                return ret;
            }
        },
        company_del_module: {
            name: '公司删除模块',
            description: '公司删除模块',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
                module_id: { type: Number, have_to: true, mean: '模块id', example: 123 },
            },
            result: {
                result: { type: Boolean, mean: '删除结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: false };
                await rbac_lib.unbind_company2module(body.company_id, body.module_id);
                let sq = db_opt.get_sq();
                let company = await sq.models.company.findByPk(body.company_id);
                let all_roles = await company.getRbac_roles();
                for (let index = 0; index < all_roles.length; index++) {
                    const element = all_roles[index];
                    await rbac_lib.disconnect_role2module(element.id, body.module_id);
                }
                ret.result = true;
                return ret;
            }
        },
        reg_company_admin: {
            name: '注册公司管理员',
            description: '注册公司管理员',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                phone: { type: String, have_to: true, mean: '手机号', example: '12345678901' },
                company_id: { type: Number, have_to: true, mean: '公司id', example: 123 },
                name: { type: String, have_to: false, mean: '姓名', example: 'name_example' },
            },
            result: {
                result: { type: Boolean, mean: '注册结果', example: true },
            },
            func: async function (body, token) {
                let ret = { result: false };
                let company = await db_opt.get_sq().models.company.findByPk(body.company_id);
                if (company) {
                    let user = await rbac_lib.add_user(body.phone);
                    if (user) {
                        await user.setCompany(company);
                        let company_admin_role = await rbac_lib.make_company_admin_role(company);
                        if (company_admin_role) {
                            await rbac_lib.bind_company2module(company.id, (await db_opt.get_sq().models.rbac_module.findOne({ where: { name: 'rbac' } })).id);
                            await rbac_lib.connect_user2role(user.id, company_admin_role.id);
                            ret.result = true;
                        }
                        user.name = body.name;
                        await user.save();
                    }
                }
                return ret;
            }
        },
        fetch_user: {
            name: '创建或更新用户信息',
            description: '创建或更新用户信息',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                phone_code: { type: String, have_to: true, mean: '手机号获取凭证', example: '12345678901' },
                company_name: { type: String, have_to: true, mean: '公司名', example: 'company_example' },
                open_id_code: { type: String, have_to: true, mean: '微信open_id授权码', example: 'open_id_example' },
                name: { type: String, have_to: true, mean: '姓名', example: 'name_example' },
                email: { type: String, have_to: false, mean: '邮箱', example: 'email_example' },
            },
            result: {
                token: { type: String, mean: '登录token', example: 'ABCD' },
            },
            func: async function (body, token) {
                let ret = { token: '' };

                let phone = await wx_api_util.get_phone_by_code(body.phone_code);
                let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code);
                let company = await rbac_lib.add_company(body.company_name);
                let user = await rbac_lib.add_user(phone);
                user.open_id = open_id;
                await user.save();
                let orig_company = await user.getCompany();
                if (orig_company) {
                    if (orig_company.id != company.id) {
                        await rbac_lib.clear_user_bind_info(user);
                        await rbac_lib.user_bind_company(user, company, open_id, body.name, body.email);
                    }
                }
                else {
                    await rbac_lib.user_bind_company(user, company, open_id, body.name, body.email);
                }
                ret.token = await rbac_lib.user_login(phone);
                return ret;
            }
        },
        driver_search_tickets: {
            name: '司机搜索磅单',
            description: '司机搜索磅单',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
                open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' },
                begin_date: { type: String, have_to: true, mean: '开始日期', example: '2020-01-01' },
                end_date: { type: String, have_to: true, mean: '结束日期', example: '2020-01-01' },
            },
            result: {
                tickets: {
                    type: Array, mean: '磅单', explain: api_param_result_define.ticket_content
                },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let cond = {
                    [db_opt.Op.and]: [
                        sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                            [db_opt.Op.gte]: sq.fn('TIMESTAMP', body.begin_date)
                        }),
                        sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                            [db_opt.Op.lte]: sq.fn('TIMESTAMP', body.end_date)
                        }),
                        {
                            [db_opt.Op.or]: [
                                { status: 3 },
                                {
                                    status: 2,
                                    checkout_delay: true,
                                    count:{[db_opt.Op.gt]: 0}
                                }
                            ]
                        }
                    ]
                }
                if (driver) {
                    let ret = { tickets: [], total: 0 };
                    let plans = await driver.getPlans({
                        order: [[sq.fn('TIMESTAMP', sq.col('plan_time')), 'DESC'], ['id', 'DESC']],
                        where: cond,
                        limit: 20,
                        offset: body.pageNo * 20,
                    });
                    for (let index = 0; index < plans.length; index++) {
                        const element = plans[index];
                        let tmp = await get_ticket_func({ id: element.id }, token);
                        ret.tickets.push(tmp);
                    }
                    ret.total = await driver.countPlans({ where: cond });
                    return ret;
                }
                else {
                    throw { err_msg: '司机不存在' };
                }
            }
        },
        get_ticket: {
            name: '获取磅单',
            description: '获取磅单',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '订单ID', example: 1 }
            },
            result: api_param_result_define.ticket_content,
            func: get_ticket_func,
        },
        get_user_role: {
            name: '获取用户角色',
            description: '获取用户角色',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {

            },
            result: {
                id: { type: Number, mean: '用户id', example: 123 },
                name: { type: String, mean: '用户姓名', example: 'user_example' },
                phone: { type: String, mean: '用户手机号', example: '12345678901' },
                photo_path: { type: String, mean: '用户头像', example: 'photo_path_example' },
                related_roles: {
                    type: Array, mean: '关联角色列表', explain: {
                        id: { type: Number, mean: '角色id', example: 123 },
                        name: { type: String, mean: '角色名', example: 'role_example' },
                        description: { type: String, mean: '角色描述', example: 'role_desp_example' },
                        is_readonly: { type: Boolean, mean: '是否只读', example: true },
                    }
                },
            },
            func: async function (body, token) {
                let ret = {};
                let user = await rbac_lib.get_user_by_token(token);
                if (user) {
                    ret = user.toJSON();
                    ret.related_roles = [];
                    (await user.getRbac_roles()).forEach((element) => {
                        ret.related_roles.push(element.toJSON());
                    });
                }
                return ret;
            }
        },
        get_export_record: {
            name: '获取导出记录',
            description: '获取导出记录',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                records: {
                    type: Array, mean: '导出记录', explain: {
                        id: { type: Number, mean: '记录ID', example: 1 },
                        name: { type: String, mean: '记录名', example: 'record_example' },
                        create_time: { type: String, mean: '创建时间', example: '2020-01-01 00:00:00' },
                        url: { type: String, mean: '下载地址', example: 'https://www.baidu.com' },
                    }
                }
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                let records = await user.getExport_records({ order: [['id', 'DESC']], limit: 20, offset: body.pageNo * 20 });
                let count = await user.countExport_records();
                return {
                    records: records,
                    total: count,
                }
            },
        },
        get_notice: {
            name: '获取通知',
            description: '获取通知',
            need_rbac: false,
            is_write: false,
            params: {
                company_id: { type: Number, have_to: true, mean: '公司ID', example: 1 },
            },
            result: {
                notice: { type: String, mean: '通知', example: 'notice_example' },
                driver_notice: { type: String, mean: '司机通知', example: 'driver_notice_example' },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let company = await sq.models.company.findByPk(body.company_id);
                if (company) {
                    return {
                        notice: company.notice,
                        driver_notice: company.driver_notice,
                    }
                }
                else {
                    throw { err_msg: '公司不存在' };
                }
            },
        },
        get_vehicle_team: {
            name: '获取车队',
            description: '获取车队',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                vehicle_teams: {
                    type: Array, mean: '车队', explain: {
                        id: { type: Number, mean: '车队ID', example: 1 },
                        name: { type: String, mean: '车队名', example: 'vehicle_team_example' },
                        vehicle_sets: {
                            type: Array, mean: '车辆列表', explain: {
                                id: { type: Number, mean: '组ID', example: 1 },
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
                            }
                        },
                    }
                }
            },
            func: async function (body, token) {
                let ret = await plan_lib.get_all_vehicle_team(token, body.pageNo);
                return {
                    vehicle_teams: ret.rows,
                    total: ret.count,
                }
            }
        },
        add_vehicle_team: {
            name: '添加车队',
            description: '添加车队',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '车队名', example: 'vehicle_team_example' },
            },
            result: {
                result: { type: Boolean, mean: '添加结果', example: true },
            },
            func: async function (body, token) {
                await plan_lib.add_vehicle_team(body.name, token);
                return { result: true };
            }
        },
        del_vehicle_team: {
            name: '删除车队',
            description: '删除车队',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '车队ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '删除结果', example: true },
            },
            func: async function (body, token) {
                await plan_lib.del_vehicle_team(body.id, token);
                return { result: true };
            }
        },
        add_vehicle2team: {
            name: '添加车辆到车队',
            description: '添加车辆到车队',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                vt_id: { type: Number, have_to: true, mean: '车队ID', example: 1 },
                main_vehicle: { type: String, have_to: true, mean: '主车车牌', example: '车牌' },
                behind_vehicle: { type: String, have_to: false, mean: '挂车车牌', example: '车牌' },
                driver_name: { type: String, have_to: true, mean: '司机姓名', example: '司机姓名' },
                driver_phone: { type: String, have_to: true, mean: '司机电话', example: '司机电话' },
                driver_id_card: { type: String, have_to: true, mean: '司机身份证', example: '司机身份证' },
            },
            result: {
                result: { type: Boolean, mean: '添加结果', example: true },
            },
            func: async function (body, token) {
                await plan_lib.add_set2team(body.main_vehicle, body.behind_vehicle, body.driver_name, body.driver_phone, body.driver_id_card, body.vt_id, token);
                return { result: true };
            },
        },
        del_vehicle_from_team: {
            name: '从车队删除车辆',
            description: '从车队删除车辆',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                vt_id: { type: Number, have_to: true, mean: '车队ID', example: 1 },
                set_id: { type: Number, have_to: true, mean: '组ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '删除结果', example: true },
            },
            func: async function (body, token) {
                await plan_lib.del_set_from_team(body.set_id, body.vt_id, token);
                return { result: true };
            },
        },
        download_ticket: {
            name: '下载磅单',
            description: '下载磅单',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '磅单ID', example: 1 },
            },
            result: {
                url: { type: String, mean: '下载结果', example: 'https://abc' },
            },
            func: async function (body, token) {
                let id = body.id;
                const uuid = require('uuid');
                real_file_name = uuid.v4();
                const filePath = '/uploads/ticket_' + real_file_name + '.png';
                await do_web_cap(process.env.REMOTE_MOBILE_HOST + '/pages/Ticket?id=' + id, '/database' + filePath);
                return { url: filePath };
            },
        },
        download_ticket_zip: {
            name: '下载磅单ZIP',
            description: '下载磅单ZIP',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01' },
                ticket_type: { type: String, have_to: true, mean: '磅单类型', example: 'sale' },
                company_id: { type: Number, have_to: false, mean: '公司ID', example: 22 },
            },
            result: {
                url: { type: String, mean: '下载地址', example: 'https://abc' },
            },
            func: async function (body, token) {
                await common.do_export_later(token, '磅单导出', async () => {
                    let plans = [];
                    let ticket_type = body.ticket_type;
                    switch (ticket_type) {
                        case 'sale_management':
                            plans = await plan_lib.filter_plan4manager(body, token);
                            break;
                        case 'buy_management':
                            plans = await plan_lib.filter_plan4manager(body, token, true);
                            break;
                        case 'customer':
                            plans = await plan_lib.filter_plan4user(body, token);
                            break;
                        case 'supplier':
                            plans = await plan_lib.filter_plan4user(body, token, true);
                            break;
                        default:
                            throw { err_msg: '磅单类型错误' };
                    }

                    const filePaths = [];
                    for (let index = 0; index < plans.length; index++) {
                        const plan = plans[index];
                        let real_file_name = `${plan.id}-${plan.main_vehicle.plate}-${plan.behind_vehicle.plate}`;
                        const filePath = '/uploads/ticket_' + real_file_name + '.png';
                        await do_web_cap(process.env.REMOTE_MOBILE_HOST + '/pages/Ticket?id=' + plan.id, '/database' + filePath);
                        filePaths.push(`/database${filePath}`);
                    }
                    if (filePaths.length === 0) {
                        throw { err_msg: '未找到磅单信息' };
                    }

                    let download_path = `/uploads/ticket_${uuid.v4().split('-')[0]}.zip`;
                    const outputPath = `/database${download_path}`;

                    // 确保输出目录存在
                    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

                    const output = fs.createWriteStream(outputPath);
                    const archive = archiver('zip', { zlib: { level: 9 } });

                    output.on('close', async () => {
                        console.log('ZIP文件创建成功,大小:' + archive.pointer() + ' bytes');
                        // 删除打包前的文件
                        await Promise.all(filePaths.map(async (filePath) => {
                            try {
                                const absolutePath = path.resolve(filePath);
                                await fs.promises.unlink(absolutePath);
                                console.log(`磅单快照文件已删除: ${absolutePath}`);
                            } catch (err) {
                                console.error(`无法删除磅单快照文件 ${absolutePath}: ${err.message}`);
                            }
                        }));
                    });

                    archive.on('error', (err) => {
                        console.error('ZIP文件创建失败: ' + err.message);
                    });

                    archive.pipe(output);
                    await Promise.all(filePaths.map(async (filePath) => {
                        const absolutePath = path.resolve(filePath);
                        try {
                            const fileName = absolutePath.match(/ticket_(.*)/)[1];
                            await archive.file(absolutePath, { name: `磅单_${fileName}` });
                            console.log(`文件已添加到ZIP: ${absolutePath}`);
                        } catch (err) {
                            console.error(`无法访问文件 ${absolutePath}: ${err.message}`);
                        }
                    }));
                    archive.finalize()
                    return download_path
                })
            },
        },
        download_sc_contents_zip: {
            name: '下载安检登记表ZIP',
            description: '下载安检登记表ZIP',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2023-01-01' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2023-12-31' },
                export_type: { type: String, have_to: true, mean: '导出类型', example: 'sale_management' },
            },
            result: {
                file_path: { type: String, mean: '文件路径', example: 'uploads/安检登记表_20230101_至_20231231.zip' },
            },
            func: async function (body, token) {
                try {
                    await common.do_export_later(token, '安检登记表导出', async () => {
                        let officegen = require('officegen');
                        let plans = [];
                        switch (body.export_type) {
                            case 'sale_management':
                                plans = await plan_lib.filter_plan4manager(body, token);
                                break;
                            case 'buy_management':
                                plans = await plan_lib.filter_plan4manager(body, token, true);
                                break;
                            case 'customer':
                                plans = await plan_lib.filter_plan4user(body, token);
                                break;
                            case 'supplier':
                                plans = await plan_lib.filter_plan4user(body, token, true);
                                break;
                            default:
                                throw { err_msg: '类型错误' };
                        }
                        if (plans.length === 0) {
                            throw { err_msg: '未找到安检信息' };
                        }
                        const archive = archiver('zip', { zlib: { level: 9 } });
                        let zip_name = `安检登记表_${uuid.v4().split('-')[0]}_${body.start_time}_至_${body.end_time}.zip`;
                        const zipOutput = fs.createWriteStream(path.resolve('/database/uploads/', zip_name));
                        archive.pipe(zipOutput);

                        const filePaths = [];

                        for (let index = 0; index < plans.length; index++) {
                            const plan = plans[index];
                            let archive_plan = await plan_lib.replace_plan2archive(plan);
                            if (!archive_plan) {
                                continue;
                            }
                            console.log(`开始创建安检登记表 - 计划ID: ${plan.id}`);
                            let doc = officegen('docx');
                            doc.createP({ align: 'center' }).addText(`${archive_plan.stuff.company.name}安检信息检查记录表`, { font_size: 22 });
                            const commonOpts = { cellColWidth: 4000, align: 'left' };
                            const headerOpts = { ...commonOpts, b: true, sz: '22', shd: { fill: 'D9EAD3' } };
                            const valueOpts = { ...commonOpts, sz: '22' };
                            let table = [
                                [{ val: '安检项目名称', opts: headerOpts }, { val: '输入内容', opts: headerOpts }],
                            ];
                            doc.createP({ align: 'left' }).addText('基础信息', { font_size: 18 });
                            // 基础信息
                            let basicInfoTable = [];
                            const addRow = (label, value) => {
                                basicInfoTable.push([
                                    { val: label, opts: headerOpts },
                                    { val: value, opts: valueOpts },
                                ]);
                            };

                            addRow('主车号', archive_plan.main_vehicle?.plate);
                            addRow('挂车号', archive_plan.behind_vehicle?.plate);
                            addRow('司机姓名', archive_plan.driver?.name);
                            addRow('司机电话', archive_plan.driver?.phone);
                            addRow('身份证号', archive_plan.driver?.id_card);
                            addRow('计划日期', archive_plan.plan_time);

                            doc.createTable(basicInfoTable, { tableColWidth: 8000 });
                            // 安检项目内容
                            let sc_info = archive_plan.sc_info;
                            doc.createP({ align: 'left' }).addText('安检信息', { font_size: 18 });
                            if (sc_info && sc_info.length > 0) {
                                sc_info.forEach(item => {
                                    // 安检登记项为可导出且为输入项
                                    if (item.add_to_export && item.need_input) {
                                        table.push([{ val: item.name, opts: valueOpts }, { val: item?.sc_content?.input, opts: valueOpts }]);
                                    }
                                });
                            }
                            doc.createTable(table, { tableColWidth: 8000 });
                            let filename = `安检登记表_${plan.id}-${plan.main_vehicle.plate}-${plan.behind_vehicle.plate}.docx`;
                            let download_path = path.resolve('/database/uploads/', filename);
                            let out = fs.createWriteStream(download_path, { encoding: 'utf8' });
                            out.on('error', function (err) {
                                console.log(err);
                            });
                            await new Promise((resolve, reject) => {
                                doc.generate(out, {
                                    finalize: resolve,
                                    error: reject
                                });
                            });
                            filePaths.push(download_path);
                        }
                        for (const filePath of filePaths) {
                            archive.append(fs.createReadStream(filePath), { name: path.basename(filePath) });
                        }
                        zipOutput.on('close', async () => {
                            console.log('安检登记表ZIP文件创建成功,大小:' + archive.pointer() + ' bytes');
                            // 删除打包前的文件
                            await Promise.all(filePaths.map(async (filePath) => {
                                await fs.promises.unlink(filePath);
                            }));
                        });

                        archive.finalize();
                        return '/uploads/' + zip_name;
                    });


                } catch (error) {
                    console.error('安检登记表导出失败', error);
                    throw error;
                }
            },
        },
        set_order_prefer: {
            name: '设置订单偏移',
            description: '设置订单偏移',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                begin_offset: { type: Number, have_to: true, mean: '开始偏移', example: 0 },
                end_offset: { type: Number, have_to: true, mean: '结束偏移', example: 0 },
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true },
            },
            func: async function (body, token) {
                let user = await rbac_lib.get_user_by_token(token);
                if (user) {
                    user.prefer_order_begin_offset = body.begin_offset;
                    user.prefer_order_end_offset = body.end_offset;
                    await user.save();
                    return { result: true };
                }
                else {
                    throw { err_msg: '用户不存在' };
                }
            },
        },
        driver_get_paper: {
            name: '司机获取试卷',
            description: '司机获取试卷',
            need_rbac: false,
            is_write: false,
            is_get_api: true,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                papers: { type: Array, mean: '试卷', explain: api_param_result_define.exam_paper_info },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let ret = { papers: [], total: 0 };
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                let stuff = plan.stuff;
                if (driver && stuff) {
                    ret = await exam_lib.get_all_paper(stuff, body.pageNo);
                    ret.papers.forEach(item => {
                        item.questions.forEach(ele_q => {
                            ele_q.option_answers.forEach(ele => {
                                ele.is_correct = undefined;
                            })
                        });
                    });
                }
                else {
                    throw { err_msg: '无法获取' };
                }
                return ret;
            },
        },
        commit_answers: {
            name: '提交答案',
            description: '提交答案',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
                paper_id: { type: Number, have_to: true, mean: '试卷ID', example: 1 },
                name: { type: String, have_to: true, mean: '姓名', example: '张三' },
                answers: {
                    type: Array, have_to: true, mean: '答案', explain: {
                        answer_id: { type: Number, have_to: true, mean: '答案ID', example: 1 },
                    }
                },
            },
            result: {
                result: { type: Boolean, mean: '提交结果', example: true },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let ret = { result: false };
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (plan && driver && await driver.hasPlan(plan)) {
                    let sq = db_opt.get_sq();
                    let paper = await sq.models.exam_paper.findByPk(body.paper_id);
                    let all_question_count = await paper.countQuestions();
                    let correct_count = 0;
                    for (let index = 0; index < body.answers.length; index++) {
                        const aid = body.answers[index].answer_id;
                        let answer = await sq.models.option_answer.findByPk(aid);
                        let question = await answer.getQuestion();
                        if (await paper.hasQuestion(question) && answer.is_correct) {
                            correct_count++;
                        }
                    }
                    let score = correct_count / all_question_count * 100;
                    if (score >= paper.pass_score) {
                        let exam = await sq.models.exam.create({ name: body.name });
                        await exam.setPlan(plan);
                        await exam.setExam_paper(paper);
                        await exam.setDriver(driver);
                        for (let index = 0; index < body.answers.length; index++) {
                            const aid = body.answers[index].answer_id;
                            let tmp = await sq.models.exam_answer.create();
                            await tmp.setExam(exam);
                            tmp.optionAnswerId = aid;
                            await tmp.save();
                        }
                        exam.score = parseFloat(score.toFixed(2));
                        await exam.save();
                        ret.result = true;
                    }
                    else {
                        throw { err_msg: '未及格，请重新作答' };
                    }
                }
                else {
                    throw { err_msg: '无法提交' };
                }
                return ret;
            },
        },
        driver_get_exam: {
            name: '司机获取考试',
            description: '司机获取考试',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
                open_id: { type: String, have_to: true, mean: '微信open_id', example: 'open_id' },
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                exams: { type: Array, mean: '考试', explain: api_param_result_define.exam_info },
            },
            func: async function (body, token) {
                let ret = { exams: [] }
                let sq = db_opt.get_sq();
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                let plan = await util_lib.get_single_plan_by_id(body.plan_id);
                if (driver && plan && await driver.hasPlan(plan)) {
                    ret.exams = await exam_lib.get_exam_by_plan(plan);
                }
                else {
                    throw { err_msg: '无法获取' };
                }
                return ret;
            }
        },
        clean_table_data: {
            name: '清除冗余数据',
            description: '清除冗余数据',
            is_write: true,
            is_get_api: false,
            params: {},
            result: {
                msg: { type: String, mean: '结果' },
            },
            func: async function (body) {
                try {
                    // 清除driver表脏数据
                    if (body.table == "driver") {
                        await clean_driver.cleanDriverData();
                        return { msg: '清除成功' };
                    }
                    else if (body.table == "vehicle") {
                        await clean_driver.cleanVehicleData();
                        return { msg: '清除成功' };
                    }
                    else {
                        return { msg: '参数错误' };
                    }

                } catch (error) {
                    return { msg: `清除失败${error}` };
                }
            },
        },
        get_company_attach: {
            name: '获取公司附件',
            description: '获取公司附件',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: {
                attach: { type: String, mean: '附件', example: 'https://www.baidu.com' },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { attach: company.attachment };
            }
        },
        set_company_attach: {
            name: '设置公司附件',
            description: '设置公司附件',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                attach: { type: String, have_to: true, mean: '附件路径', example: 'AAAA' }
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                company.attachment = body.attach;
                await company.save();
                return { result: true };
            }
        },
        search_valid_plan_by_plate_id: {
            name: '根据车牌号或身份证查询有效计划',
            description: '根据车牌号或身份证查询有效计划',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {
                plate: { type: String, have_to: false, mean: '车牌号', example: '粤B12345' },
                id_card: { type: String, have_to: false, mean: '身份证', example: '123456789' }
            },
            result: {
                result: { type: Boolean, mean: '查询结果', example: true },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let ret = { result: false };
                let plate = body.plate;
                let id_card = body.id_card;
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff();
                let meta_search = { mainVehicleId: -1 };
                if (plate) {
                    let mv = await sq.models.vehicle.findOne({ where: { plate: plate } });
                    if (mv) {
                        meta_search = { mainVehicleId: mv.id };
                    }
                }
                else if (id_card) {
                    let driver = await sq.models.driver.findOne({ where: { id_card: id_card } });
                    if (driver) {
                        meta_search = { driverId: driver.id };
                    }
                }
                meta_search[db_opt.Op.or] = [
                    {
                        is_buy: true,
                        status: 1,
                    },
                    {
                        is_buy: false,
                        status: 2,
                    }
                ];
                meta_search.plan_time = moment().format('YYYY-MM-DD');
                meta_search.stuffId = { [db_opt.Op.in]: stuff.map(item => item.id) };

                let plan = await sq.models.plan.findOne({
                    where: meta_search
                });
                if (plan) {
                    ret.result = true;
                }
                return ret;
            }
        },
        get_all_sys_notices: {
            name: '获取全部系统通知',
            description: '获取全部系统通知',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                notices: {
                    type: Array, mean: '系统通知列表', explain: {
                        id: { type: Number, mean: '通知ID', example: 1 },
                        message: { type: String, mean: '通知内容', example: '系统维护通知' },
                        is_published: { type: Boolean, mean: '发布状态', example: true },
                        createdAt: { type: String, mean: '创建时间', example: '2022-01-01 00:00:00' },
                    }
                }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let ret = { notices: [] };
                let notices = await sq.models.sys_notice.findAll({
                    order: [['createdAt', 'DESC']]
                });
                notices.forEach(notice => {
                    notice.createdAt = moment(notice.createdAt).format('YYYY-MM-DD HH:mm:ss');
                });
                ret.notices = notices;
                return ret;
            }
        },
        get_published_notice: {
            name: '获取已发布的最新通知',
            description: '获取已发布的最新通知',
            need_rbac: false,
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                notice: {
                    type: Object, mean: '最新通知对象', explain: {
                        id: { type: Number, mean: '通知ID', example: 1 },
                        message: { type: String, mean: '通知内容', example: '系统维护通知' },
                        is_published: { type: Boolean, mean: '发布状态', example: true },
                        createdAt: { type: String, mean: '创建时间', example: '2022-01-01 00:00:00' },
                    }
                }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let notice = await sq.models.sys_notice.findOne({
                    where: {
                        is_published: true
                    },
                    order: [['createdAt', 'DESC']]
                });
                if (notice) {
                    notice.createdAt = moment(notice.createdAt).format('YYYY-MM-DD HH:mm:ss');
                    return { notice };
                } else {
                    return {};
                }
            }
        },
        set_sys_notice: {
            name: '设置系统通知',
            description: '设置系统通知',
            is_write: true,
            is_get_api: false,
            need_rbac: true,
            params: {
                message: { type: String, have_to: true, mean: '通知内容', example: '系统维护通知' },
                creator_name: { type: String, have_to: true, mean: '添加人姓名', example: '管理员' },
                is_published: { type: Boolean, have_to: false, mean: '是否发布', example: true }
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let notice = await sq.models.sys_notice.create({
                    message: body.message,
                    creator_name: body.creator_name,
                    is_published: body.is_published
                });
                if (notice) {
                    return { result: true };
                } else {
                    throw { err_msg: '设置系统通知失败' };
                }
            }
        },
        delete_sys_notice: {
            name: '删除系统通知',
            description: '删除系统通知',
            is_write: true,
            is_get_api: false,
            need_rbac: true,
            params: {
                notice_id: { type: Number, have_to: true, mean: '通知ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '删除结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let notice = await sq.models.sys_notice.findByPk(body.notice_id);
                if (notice) {
                    await notice.destroy();
                    return { result: true };
                } else {
                    throw { err_msg: '通知不存在' };
                }
            }
        },
        set_qualification_expire_date: {
            name: '设置公司资质有效期',
            description: '设置公司资质有效期',
            is_write: true,
            is_get_api: false,
            need_rbac: false,
            params: {
                expire_date: { type: String, have_to: true, mean: '资质有效期', example: '2048-10-31' }
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.qualification_expiration_date = body.expire_date;
                    await company.save();
                    return { result: true };
                } else {
                    throw { err_msg: '无权限' };
                }
            }
        },
        get_qualification_expire_date: {
            name: '获取公司资质有效期',
            description: '获取公司资质有效期',
            is_write: false,
            is_get_api: false,
            need_rbac: false,
            params: {},
            result: {
                expire_date: { type: String, mean: '资质有效期', example: '2048-10-31' }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    return { expire_date: company.qualification_expiration_date || '' };
                } else {
                    throw { err_msg: '无权限' };
                }
            }
        },
        get_verify_pic: {
            name: '获取图片验证码',
            description: '获取图片验证码',
            is_write: false,
            is_get_api: false,
            need_rbac: false,
            params: {
                isMath: { type: Boolean, have_to: false, mean: '是否数学表达式', example: false },
                width: { type: Number, have_to: false, mean: '图片宽度', example: 100 },
                height: { type: Number, have_to: false, mean: '图片高度', example: 30 },
                mathMin: { type: Number, have_to: false, mean: '算式中的最小值', example: 1 },
                mathMax: { type: Number, have_to: false, mean: '算式中的最大值', example: 100 },
                noise: { type: Number, have_to: false, mean: '干扰数量', example: 3 },
            },
            result: {
                captchaBase64: { type: String, mean: '验证码图片, 直接设置到img标签的url里', example: 'data:image/svg+xml;base64,PHN2ZyB4bWxulsbD0ibm9uZSIvPjwvc3ZnPg==' }
            },
            func: async function (body, token) {
                const {
                    isMath = false,
                    width = 150,
                    height = 50,
                    noise = 3,
                    mathMin = 3,
                    mathMax = 20
                } = body;
                let captcha;
                if (isMath) {
                    captcha = svgCaptcha.createMathExpr({ width, height, noise, mathMax, mathMin, color: true, background: '#cc9966' });
                } else {
                    captcha = svgCaptcha.create({ width, height, noise, color: true, background: '#cc9966', ignoreChars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ10' });
                }
                mcache.put(token, captcha.text, 1000 * 60);

                const base64Data = Buffer.from(captcha.data).toString('base64');
                return {
                    captchaBase64: `data:image/svg+xml;base64,${base64Data}`
                };
            }
        },
        need_verify_pic: {
            name: '是否开启竞价验证码',
            description: '是否开启竞价验证码',
            is_write: false,
            is_get_api: false,
            need_rbac: true,
            params: {
                flag: { type: Boolean, have_to: false, mean: '是否开启竞价验证码', example: 'false = 关闭验证码校验， default = true' }
            },
            result: {
                result: { type: Boolean, mean: '设置结果', example: true }
            },
            func: async function (body, token) {
                const {
                    flag = true
                } = body;

                mcache.put('is_skip_verify', !flag);
                return {
                    result: true
                };
            }
        },
        get_wx_msg_config: {
            name: '获取微信消息配置',
            description: '获取微信消息配置',
            is_write: false,
            is_get_api: false,
            need_rbac: true,
            params: {},
            result: api_param_result_define.wx_msg_template_define(false),
            func: async function () {
                let ret = await wx_api_util.get_template_id();
                return ret;
            }
        },
        set_wx_msg_config: {
            name: '设置微信消息配置',
            description: '设置微信消息配置',
            is_write: true,
            is_get_api: false,
            need_rbac: true,
            params: api_param_result_define.wx_msg_template_define(true),
            result: {
                result: { type: Boolean, mean: '设置结果', example: true }
            },
            func: async function (body, token) {
                const filePath = path.resolve('/database/wx_msg_config.json');
                try {
                    await fs.promises.writeFile(filePath, JSON.stringify(body, null, 2), 'utf-8');
                    return { result: true };
                } catch (error) {
                    console.error('写入微信消息配置文件失败:', error);
                    return { result: false };
                }
            },
        },
        get_show_sc_in_field: {
            name: '获取在排队车辆处显示证件检查',
            description: '获取在排队车辆处显示证件检查',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                show_sc_in_field: { type: Boolean, mean: '是否显示证件检查', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { show_sc_in_field: company.show_sc_in_field };
            }
        },
        get_buy_config_hard: {
            name: '获取采购严格模式',
            description: '获取采购严格模式',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                buy_config_hard: { type: Boolean, mean: '是否开启严格模式', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { buy_config_hard: company.buy_config_hard };
            }
        },
        get_push_messages_writable_roles: {
            name: '获取推送消息可写角色',
            description: '获取推送消息可写角色',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                push_messages_writable_roles: { type: Boolean, mean: '是否只推送消息给可写角色', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { push_messages_writable_roles: company.push_messages_writable_roles };
            }
        },
        get_ticket_hasOrhasnt_place:{
            name:'获取榜单是否显示装卸车地点',
            description:'获取榜单是否显示装卸车地点',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                ticket_hasOrhasnt_place: { type: Boolean, mean: '是否显示装卸车地点', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { ticket_hasOrhasnt_place: company.ticket_hasOrhasnt_place };
            }
        },
        get_access_control_permission: {
            name: '获取门禁权限',
            description: '获取门禁权限',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                access_control_permission: { type: Boolean, mean: '是否开启门禁权限', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { access_control_permission: company.access_control_permission };
            }
        },
        get_barriergate_control_permission: { 
            name: '获取闸杆权限',
            description: '获取闸杆权限',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                barriergate_control_permission: { type: Boolean, mean: '是否开启闸杆权限', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { barriergate_control_permission: company.barriergate_control_permission };
            }
        },
        get_support_location_detail: {
            name: '获取卸车地点支持细节输入',
            description: '获取卸车地点支持细节输入',
            is_write: false,
            is_get_api: false,
            params: {
                company_id:{ type: Number, have_to: false, mean: '公司ID', example: 1 }
            },
            result: {
                support_location_detail: { type: Boolean, mean: '是否支持卸车地点细节输入', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (body.company_id) {
                    company = await db_opt.get_sq().models.company.findByPk(body.company_id);
                }
                return { support_location_detail: company.support_location_detail };
            }
        }
    },
}
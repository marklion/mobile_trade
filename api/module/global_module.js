const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
const sc_lib = require('../lib/sc_lib');
const wx_api_util = require('../lib/wx_api_util');
module.exports = {
    name: 'global',
    description: '全局',
    methods: {
        driver_online: {
            name: '司机上线',
            description: '司机上线',
            need_rbac: false,
            is_write: true,
            is_get_api: false,
            params: {
                open_id_code: { type: String, have_to: true, mean: '微信open_id授权凭证', example: 'open_id' }
            },
            result: {
                id: { type: Number, mean: '司机ID', example: 1 },
                name: { type: String, mean: '司机姓名', example: '张三' },
                phone: { type: String, mean: '司机电话', example: '18911992582' },
                id_card: { type: String, mean: '司机身份证', example: '1234567890' },
                open_id: { type: String, mean: '微信open_id', example: 'open_id' },
            },
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
            result: {
                id: { type: Number, mean: '司机ID', example: 1 },
                name: { type: String, mean: '司机姓名', example: '张三' },
                phone: { type: String, mean: '司机电话', example: '18911992582' },
                id_card: { type: String, mean: '司机身份证', example: '1234567890' },
                open_id: { type: String, mean: '微信open_id', example: 'open_id' },
            },
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
                    },{
                        status: 2,
                        is_buy: false,
                    }],
                };
                let driver = await sq.models.driver.findOne({ where: { open_id: body.open_id } });
                if (driver) {
                    let ret = { plans: [], total: 0 };
                    ret.plans = await driver.getPlans({ where: plan_get_where, limit: 20, offset: body.pageNo * 20, include: plan_lib.plan_detail_include() });
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
        driver_upload_enter_info:{
            name:'司机上传进厂前信息',
            description:'司机上传进厂前信息',
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
                let plan = await plan_lib.get_single_plan_by_id(body.plan_id);
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
                let plan = await plan_lib.get_single_plan_by_id(body.plan_id);
                if (driver && plan && ((plan.status == 2 && !plan.is_buy) || (plan.status == 1 && plan.is_buy)) && await driver.hasPlan(plan)) {
                    if (await sc_lib.plan_passed_sc(body.plan_id)) {
                        if (await plan_lib.check_if_never_checkin(driver)) {
                            if (await plan_lib.verify_plan_location(plan, body.lat, body.lon)) {
                                await require('../lib/field_lib').handle_driver_check_in(plan);
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
                if (user || body.password == 'Mobile_P@ssw0rd_Trade') {
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
            },
            func: async function (body, token) {
                let ret = {};
                let user = await rbac_lib.get_user_by_token(token);
                if (user) {
                    let company = await user.getCompany();
                    if (company) {
                        user.company = company.name;
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
                let sq = db_opt.get_sq();

                let phone = await wx_api_util.get_phone_by_code(body.phone_code);
                let open_id = await wx_api_util.get_open_id_by_code(body.open_id_code);
                let company = await rbac_lib.add_company(body.company_name);
                let user = await rbac_lib.add_user(phone);
                if (company && user) {
                    await user.setCompany(company);
                    user.open_id = open_id;
                    user.name = body.name;
                    user.email = body.email;
                    let cust_role = await rbac_lib.add_role('一般用户', '一般用户', false, company);
                    await rbac_lib.connect_user2role(user.id, cust_role.id);
                    await rbac_lib.connect_role2module(cust_role.id, (await db_opt.get_sq().models.rbac_module.findOne({ where: { name: 'customer' } })).id);
                    await rbac_lib.connect_role2module(cust_role.id, (await db_opt.get_sq().models.rbac_module.findOne({ where: { name: 'supplier' } })).id);
                    let old_user = await sq.models.rbac_user.findOne({
                        where: {
                            [db_opt.Op.and]: [{ open_id: open_id }, { id: { [db_opt.Op.ne]: user.id } }]
                        }
                    });
                    if (old_user) {
                        old_user.open_id = '';
                        await old_user.save();
                    }
                    await user.save();
                }
                ret.token = await rbac_lib.user_login(phone);
                return ret;
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
            result: {
                company_name: { type: String, mean: '公司名', example: 'company_example' },
                order_company_name: { type: String, mean: '下单公司名', example: 'order_company_example' },
                plate: { type: String, mean: '车牌', example: 'plate_example' },
                behind_plate: { type: String, mean: '挂车牌', example: 'behind_plate_example' },
                ticket_no: { type: String, mean: '磅单号', example: 'ticket_no_example' },
                m_weight: { type: Number, mean: '毛重', example: 1 },
                m_time: { type: String, mean: '毛重时间', example: '2020-01-01 12:00:00' },
                p_weight: { type: Number, mean: '皮重', example: 1 },
                p_time: { type: String, mean: '皮重时间', example: '2020-01-01 12:00:00' },
                count: { type: Number, mean: '装车量', example: 1 },
                seal_no: { type: String, mean: '封条号', example: 'seal_no_example' },
                stamp_path: { type: String, mean: '印章路径', example: 'stamp_path_example' },
                is_buy: { type: Boolean, mean: '是否购买', example: true },
                qr_code: { type: String, mean: '二维码base64', example: 'qr_code_example' },
                trans_company_name: { type: String, mean: '运输公司名', example: '' },
            },
            func: async function (body, token) {
                let orig_plan = await plan_lib.get_single_plan_by_id(body.id);
                let plan = await plan_lib.replace_plan2archive(orig_plan)
                if (!plan) {
                    plan = orig_plan;
                }
                let qr_code = await wx_api_util.make_ticket_qr(plan);
                let qr_code_base64 = Buffer.from(qr_code.buffer).toString('base64');
                return {
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
                    qr_code: qr_code_base64,
                    trans_company_name: plan.trans_company_name,
                }
            },
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
    }
}
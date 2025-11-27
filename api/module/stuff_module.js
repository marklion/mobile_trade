const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
const util_lib = require('../lib/util_lib');
const cash_lib = require('../lib/cash_lib');
const sq = db_opt.get_sq();
async function change_stuff_single_switch(stuff_id, switch_name, switch_value, token) {
    let sq = db_opt.get_sq();
    let company = await rbac_lib.get_company_by_token(token);
    let stuff = await sq.models.stuff.findByPk(stuff_id);
    if (stuff && company && await company.hasStuff(stuff)) {
        stuff[switch_name] = switch_value;
        await stuff.save();
    } else {
        throw { err_msg: '货物不存在' };
    }
    return { result: true };
}
async function checkout_delay_config_func(body, token) {
    return await change_stuff_single_switch(body.stuff_id, 'checkout_delay', body.checkout_delay, token);
}
module.exports = {
    name: 'stuff',
    description: '物料管理',
    methods: {
        fetch: {
            name: '获取或更新物料',
            description: '获取或更新物料',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '货物名称', example: '货物名称' },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                expect_count: { type: Number, have_to: false, mean: '预期数量', example: 1 },
                use_for_buy: { type: Boolean, have_to: false, mean: '用于采购', example: false },
                close_time: { type: String, have_to: false, mean: '关闭时间', example: '12:00:00' },
                delay_days: { type: Number, have_to: false, mean: '延迟天数', example: 1 },
                concern_fapiao: { type: Boolean, have_to: false, mean: '关注发票', example: false },
                stuff_code: { type: String, have_to: false, mean: '物料编码', example: '物料编码' }
            },
            result: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                price: { type: Number, mean: '单价', example: 1 },
                comment: { type: String, mean: '备注', example: '备注' },
                next_price: { type: Number, mean: '下次单价', example: 1 },
                change_last_minutes: { type: Number, mean: '调价所剩分钟', example: 23 },
                expect_count: { type: Number, mean: '期望单车装载量', example: 1 },
                use_for_buy: { type: Boolean, mean: '用于采购', example: false },
                close_time: { type: String, mean: '关闭时间', example: '12:00:00' },
                delay_days: { type: Number, mean: '延迟天数', example: 1 },
                concern_fapiao: { type: Boolean, mean: '关注发票', example: false },
                stuff_code: { type: String, mean: '物料编码', example: '物料编码' },
                close_today: { type: Boolean, mean: '是否关闭今天的计划', example: false },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return await plan_lib.fetch_stuff(body.name, body.comment, company, body.expect_count, body.use_for_buy, body.close_time, body.delay_days, body.concern_fapiao, body.stuff_code, body.close_today);
            }
        },
        get_all: {
            name: '获取所有物料',
            description: '获取所有物料',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                stuff: {
                    type: Array, mean: '物料列表', explain: {
                        id: { type: Number, mean: '货物ID', example: 1 },
                        name: { type: String, mean: '货物名称', example: '货物名称' },
                        price: { type: Number, mean: '单价', example: 1 },
                        comment: { type: String, mean: '备注', example: '备注' },
                        next_price: { type: Number, mean: '下次单价', example: 1 },
                        change_last_minutes: { type: Number, mean: '调价所剩分钟', example: 23 },
                        expect_count: { type: Number, mean: '期望单车装载量', example: 1 },
                        use_for_buy: { type: Boolean, mean: '用于采购', example: false },
                        need_sc: { type: Boolean, mean: '是否需要安检', example: false },
                        need_enter_weight: { type: Boolean, mean: '是否需要入场前重量', example: false },
                        no_need_register: { type: Boolean, mean: '是否不需要登记', example: false },
                        close_time: { type: String, mean: '关闭时间', example: '12:00:00' },
                        delay_days: { type: Number, mean: '延迟天数', example: 1 },
                        need_exam: { type: Boolean, mean: '是否需要考试', example: false },
                        concern_fapiao: { type: Boolean, mean: '关注发票', example: false },
                        stuff_code: { type: String, mean: '物料编码', example: '物料编码' },
                        checkout_delay: { type: Boolean, mean: '是否需要延迟结算', example: false },
                        drop_take_zones: {
                            type: Array, mean: '装卸货区域', explain: {
                                id: { type: Number, mean: 'ID', example: 1 },
                                name: { type: String, mean: '名称', example: 'A区' }
                            }
                        },
                        manual_weight: { type: Boolean, mean: '是否需要手动计量', example: false },
                        ticket_prefix: { type: String, mean: '磅单号前缀', example: 'LNG' },
                        need_expect_weight: { type: Boolean, mean: '是否需要期望重量', example: false },
                        close_today: { type: Boolean, mean: '是否关闭今天的计划', example: false },
                        second_unit: { type: String, mean: '第二单位', example: '千克' },
                        coefficient: { type: Number, mean: '系数', example: 1.0 },
                        auto_confirm_goods: { type: Boolean, mean: '是否自动确认货物', example: false },
                        second_unit_decimal: { type: Number, mean: '第二单位小数位数', example: 2 },
                        add_base: { type: String, mean: '自增基础', example: 'day' },
                        sct_scale_items: {
                            type: Array, mean: '结构化计量项', explain: {
                                id: { type: Number, mean: 'ID', example: 1 },
                                name: { type: String, mean: '名称', example: '名称' },
                                type: { type: String, mean: '类型', example: '类型' },
                            }
                        },
                        delay_checkout_time: { type: String, mean: '延迟结算时间', example: '2025' },
                        need_driver_sign: { type: Boolean, mean: '是否需要司机签字', example: false },
                    }
                },
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                return {
                    stuff: await company.getStuff(
                        {
                            order: [['id', 'ASC']],
                            offset: body.pageNo * 20,
                            limit: 20,
                            include: [{ model: sq.models.drop_take_zone },
                            {
                                model: sq.models.sct_scale_item,
                                separate: true,
                                order: [['id', 'ASC']]
                            }
                            ]
                        }
                    ), total: await company.countStuff()
                };
            }
        },
        get_count_by_today_yesterday: {
            name: '获取今日、昨日物料统计',
            description: '获取今日、昨日物料统计',
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: {
                statistic: {
                    type: Array, mean: '物料统计', explain: {
                        name: { type: String, mean: '物料名称', example: '大米' },
                        yesterday_count: { type: Number, mean: '昨日物料装载总量', example: 12 },
                        today_count: { type: Number, mean: '昨日物料数量装载总量', example: 12 },
                        second_unit: { type: String, mean: '第二单位', example: '千克' },
                        second_unit_decimal: { type: Number, mean: '第二单位小数位数', example: 2 },
                    }
                }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let results = await plan_lib.getStatistic(company);
                return { statistic: results };
            }
        },
        del: {
            name: '删除物料',
            description: '删除物料',

            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let sq = db_opt.get_sq();
                let stuff = await sq.models.stuff.findByPk(body.id);
                if (stuff && company && company.hasStuff(stuff)) {
                    await stuff.destroy();
                }
                return { result: true };
            }
        },
        no_need_register: {
            name: '配置货物是否不需要登记',
            description: '配置货物是否不需要登记',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                no_need_register: { type: Boolean, have_to: true, mean: '是否不需要登记', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'no_need_register', body.no_need_register, token);
            },
        },
        enter_weight: {
            name: '配置货物需要入场前重量',
            description: '配置货物需要入场前重量',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                need_enter_weight: { type: Boolean, have_to: true, mean: '是否需要', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'need_enter_weight', body.need_enter_weight, token);
            },
        },
        exam_config: {
            name: '配置货物是否需要考试',
            description: '配置货物是否需要考试',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                need_exam: { type: Boolean, have_to: true, mean: '是否需要考试', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'need_exam', body.need_exam, token);
            },
        },
        sc_config: {
            name: '配置货物是否需要安检',
            description: '配置货物是否需要安检',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                need_sc: { type: Boolean, have_to: true, mean: '是否需要安检', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'need_sc', body.need_sc, token);
            },
        },
        checkout_delay_config: {
            name: '配置货物是否需要延迟结算',
            description: '配置货物是否需要延迟结算',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                checkout_delay: { type: Boolean, have_to: true, mean: '是否需要延迟结算', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await checkout_delay_config_func(body, token);
            },
        },
        expect_weight_config: {
            name: '配置货物是否需要期望重量',
            description: '配置货物是否需要期望重量',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                need_expect_weight: { type: Boolean, have_to: true, mean: '是否需要期望重量', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'need_expect_weight', body.need_expect_weight, token);
            },
        },
        auto_confirm_goods: {
            name: '配置货物是否自动确认装货',
            description: '配置货物是否自动确认装货',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                auto_confirm_goods: { type: Boolean, have_to: true, mean: '是否自动确认装货', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'auto_confirm_goods', body.auto_confirm_goods, token);
            },
        },
        set_unit_coefficient: {
            name: '基于物料增加第二单位配置（字符串）& 基于物料增加系数配置（浮点数）',
            description: '基于物料增加第二单位配置（字符串）& 基于物料增加系数配置（浮点数）',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                unit_coefficient: {
                    type: Object, have_to: true, mean: '基于物料增加第二单位配置（字符串）& 基于物料增加系数配置（浮点数）', explain: {
                        second_unit: { type: String, have_to: true, mean: '是基于物料增加第二单位配置（字符串）', example: '千克' },
                        coefficient: { type: Number, have_to: true, mean: '基于物料增加系数配置（浮点数）', example: 1.0 },
                        second_unit_decimal: { type: Number, have_to: false, mean: '第二单位小数位数', example: 2 },
                    },
                }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await change_stuff_single_switch(body.stuff_id, 'second_unit', body.unit_coefficient.second_unit, token);
                await change_stuff_single_switch(body.stuff_id, 'coefficient', body.unit_coefficient.coefficient, token);
                await change_stuff_single_switch(body.stuff_id, 'second_unit_decimal', body.unit_coefficient.second_unit_decimal, token);
                return { result: true }
            }
        },
        manual_weight_config: {
            name: '配置货物是否需要手动计量',
            description: '配置货物是否需要手动计量',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                manual_weight: { type: Boolean, have_to: true, mean: '是否需要手动计量', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'manual_weight', body.manual_weight, token);
            },
        },
        change_price: {
            name: '调价',
            description: '调价',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                price: { type: Number, have_to: true, mean: '新单价', example: 1 },
                comment: { type: String, have_to: true, mean: '备注', example: '备注' },
                to_plan: { type: Boolean, have_to: true, mean: '是否对未关闭计划生效', example: true },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await plan_lib.change_stuff_price(body.stuff_id, token, body.price, body.to_plan, body.comment);
                return { result: true };
            },
        },
        get_price_history: {
            name: '获取调价历史',
            description: '获取调价历史',

            is_write: false,
            is_get_api: true,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                histories: {
                    type: Array, mean: '调价历史', explain: {
                        id: { type: Number, mean: '历史ID', example: 1 },
                        time: { type: String, mean: '历史时间', example: '2020-01-01 12:00:00' },
                        operator: { type: String, mean: '操作人', example: '操作人' },
                        comment: { type: String, mean: '备注', example: '备注' },
                        new_price: { type: Number, mean: '新单价', example: 1 },
                    }
                }
            },
            func: async function (body, token) {
                let ret = await plan_lib.get_price_history(body.stuff_id, token, body.pageNo);
                return { histories: ret.rows, total: ret.count };
            }
        },
        get_notice: {
            name: '获取通知',
            description: '获取通知',
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: {
                notice: { type: String, mean: '通知', example: '通知' },
                driver_notice: { type: String, mean: '司机通知', example: '司机通知' }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    return {
                        notice: company.notice,
                        driver_notice: company.driver_notice
                    }
                }
                return {
                    notice: '',
                    driver_notice: ''
                }
            }
        },
        set_notice: {
            name: '设置通知',
            description: '设置通知',
            is_write: true,
            is_get_api: false,
            params: {
                notice: { type: String, have_to: false, mean: '通知', example: '通知' },
                driver_notice: { type: String, have_to: false, mean: '司机通知', example: '司机通知' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let ret = { result: true };
                if (company) {
                    company.notice = body.notice;
                    company.driver_notice = body.driver_notice;
                    await company.save();
                }
                return ret;
            }
        },
        set_next_price: {
            name: '启动定时调价',
            description: '启动定时调价',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                next_price: { type: Number, have_to: true, mean: '下次单价', example: 1 },
                change_last_minutes: { type: Number, have_to: true, mean: '调价所剩分钟', example: 23 },
                next_comment: { type: String, have_to: true, mean: '下次调价备注', example: '备注' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff({ where: { id: body.stuff_id } });
                if (stuff.length == 1) {
                    stuff = stuff[0];
                    stuff.next_price = body.next_price;
                    stuff.change_last_minutes = body.change_last_minutes;
                    stuff.next_comment = body.next_comment;
                    stuff.next_operator = (await rbac_lib.get_user_by_token(token)).name;
                    await stuff.save();
                }
                else {
                    throw { err_msg: '货物不存在' };
                }
                return { result: true };
            },
        },
        clear_next_price: {
            name: '清除定时调价',
            description: '清除定时调价',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff({ where: { id: body.stuff_id } });
                if (stuff.length == 1) {
                    stuff = stuff[0];
                    stuff.next_price = 0;
                    stuff.change_last_minutes = 0;
                    stuff.next_comment = '';
                    await stuff.save();
                }
                else {
                    throw { err_msg: '货物不存在' };
                }
                return { result: true };
            }
        },
        change_price_by_plan: {
            name: '基于计划调价(批量或单个)',
            description: '基于计划调价(批量或单个)',
            is_write: true,
            is_get_api: false,
            params: {
                unit_price: { type: Number, have_to: true, mean: '新单价', example: 66.88 },
                plan_id: { type: String, have_to: true, mean: '计划ID列表', example: '1,2,3' },
                comment: { type: String, have_to: true, mean: '新单价调价备注', example: '测试备注' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                try {
                    let planIds = JSON.parse(`[${body.plan_id}]`);
                    await Promise.all(planIds.map(async (item) => {
                        await plan_lib.action_in_plan(item, token, 0, async (plan, t) => {
                            if (!plan || !company || !(await company.hasStuff(plan.stuff))) {
                                return { result: false };
                            }
                            if (plan.bidding_item) {
                                throw new Error('竞价计划不允许调价');
                            }
                            let unitPrice = Number(body.unit_price);
                            if (isNaN(unitPrice)) {
                                throw new Error('Invalid unit price');
                            }
                            let orig_price = plan.unit_price;
                            if (orig_price != unitPrice) {
                                if (plan.status == 3 && !plan.is_buy) {
                                    if (!company.change_finished_order_price_switch) {
                                        throw new Error('已完成订单不允许调价');
                                    }
                                    await plan_lib.plan_rollback(plan.id, token, '调价回滚', false, t);
                                }
                                let comment = `单价由${orig_price}改为${unitPrice},${body.comment}`
                                await plan_lib.record_plan_history(plan, (await rbac_lib.get_user_by_token(token)).name, comment)
                                plan.unit_price = unitPrice;
                                if (plan.status == 1 && !plan.is_buy) {
                                    let { arrears, outstanding_vehicles } = await plan_lib.calculate_plan_arrears(plan, unitPrice);
                                    plan.arrears = arrears;
                                    plan.outstanding_vehicles = outstanding_vehicles;
                                }
                                plan.checkout_delay = false;
                                await plan.save();
                                if (plan.status == 3) {
                                    if (plan.is_buy) {
                                        await plan_lib.updateArchivePlan(plan);
                                    }
                                    else {
                                        await plan_lib.deliver_plan(plan.id, token, plan.count, plan.p_weight, plan.m_weight, plan.p_time, plan.m_time, plan.ticket_no, plan.seal_no, t);
                                    }
                                }
                            }
                        }, true);
                    }));
                    return { result: true };
                } catch (error) {
                    throw { err_msg: error.message }
                }
            }
        },
        add_to_blacklist: {
            name: '添加到黑名单',
            description: '添加到黑名单',
            is_write: true,
            is_get_api: false,
            params: {
                type: { type: String, have_to: true, mean: '黑名单类型', example: 'vehicle' },
                ids: { type: String, have_to: true, mean: '车辆ID或司机ID列表', example: '1,2,3' },
                reason: { type: String, have_to: true, mean: '加入黑名单原因', example: '违规行为' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                const transaction = await sq.transaction();
                try {
                    let company = await rbac_lib.get_company_by_token(token);
                    if (!company) {
                        throw new Error('无权限');
                    }
                    const ids = body.ids.split(',').map(id => parseInt(id, 10));
                    const idField = body.type === 'vehicle' ? 'vehicleId' : 'driverId';
                    if (!['vehicle', 'driver'].includes(body.type)) {
                        throw new Error('无效的黑名单类型');
                    }
                    await Promise.all(ids.map(async (id) => {
                        const [entry, created] = await sq.models.blacklist.findOrCreate({
                            where: {
                                companyId: company.id,
                                [idField]: id
                            },
                            defaults: {
                                reason: body.reason,
                                companyId: company.id,
                                [idField]: id
                            },
                            transaction
                        });
                        if (!created) {
                            entry.reason = body.reason;
                            await entry.save({ transaction });
                        }
                        return entry;
                    }));

                    await transaction.commit();
                    return { result: true };
                } catch (error) {
                    await transaction.rollback();
                    throw { err_msg: error.message };
                }
            }
        },
        remove_from_blacklist: {
            name: '从黑名单中移除',
            description: '从公司黑名单中移除车辆或司机',
            is_write: true,
            is_get_api: false,
            params: {
                ids: { type: String, have_to: true, mean: '黑名单ID列表', example: '1,2,3' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                const transaction = await sq.transaction();
                try {
                    let company = await rbac_lib.get_company_by_token(token);
                    if (!company) {
                        throw new Error('无权限');
                    }

                    const ids = body.ids.split(',').map(id => parseInt(id, 10));
                    await sq.models.blacklist.destroy({
                        where: {
                            id: {
                                [sq.Sequelize.Op.in]: ids
                            },
                            companyId: company.id
                        },
                        transaction
                    });

                    await transaction.commit();
                    return { result: true };
                } catch (error) {
                    await transaction.rollback();
                    throw { err_msg: error.message };
                }
            }
        },
        get_blacklist: {
            name: '获取当前公司黑名单',
            description: '获取当前公司黑名单',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                blacklist: {
                    type: Array, mean: '黑名单列表', explain: {
                        id: { type: Number, mean: '黑名单ID', example: 1 },
                        type: { type: String, mean: '黑名单类型', example: 'vehicle' },
                        reason: { type: String, mean: '加入黑名单原因', example: '违规行为' },
                        driver: {
                            type: Object,
                            mean: '司机信息',
                            explain: {
                                id: { type: Number, mean: '司机ID', example: 1 },
                                name: { type: String, mean: '司机姓名', example: '张三' },
                                phone: { type: String, mean: '司机电话', example: '13800138000' }
                            }
                        },
                        vehicle: {
                            type: Object,
                            mean: '车辆信息',
                            explain: {
                                id: { type: Number, mean: '车辆ID', example: 1 },
                                plate: { type: String, mean: '车牌号', example: '京A12345' },
                            }
                        },
                    }
                }
            },
            func: async function (body, token) {
                try {
                    let comp = await rbac_lib.get_company_by_token(token);
                    if (!comp) {
                        throw new Error('无权限');
                    }
                    let ret = await sq.models.blacklist.findAndCountAll({
                        order: [['id', 'DESC']],
                        where: {
                            companyId: comp.id
                        },
                        include: [
                            { model: sq.models.driver },
                            { model: sq.models.vehicle }
                        ],
                        offset: body.pageNo * 20,
                        limit: 20
                    });
                    return { blacklist: ret.rows, total: ret.count };

                } catch (error) {
                    throw { err_msg: error.message };
                }
            }
        },
        search_vehicle_or_driver: {
            name: '查询车辆或司机',
            description: '查询车辆或司机',
            is_write: false,
            is_get_api: true,
            params: {
                type: { type: String, have_to: true, mean: '查询类型', example: 'vehicle' },
                value: { type: String, have_to: true, mean: '查询值', example: '京A12345' }
            },
            result: {
                item: {
                    type: Object,
                    mean: '查询结果',
                    explain: {
                        id: { type: Number, mean: 'ID', example: 1 },
                        name: { type: String, mean: '名称', example: '张三' },
                        phone: { type: String, mean: '电话', example: '13800138000' },
                        plate: { type: String, mean: '车牌号', example: '京A12345' }
                    }
                }
            },
            func: async function (body) {
                try {
                    let item;
                    if (body.type === 'vehicle') {
                        item = await sq.models.vehicle.findOne({
                            where: {
                                plate: body.value
                            }
                        });
                    } else if (body.type === 'driver') {
                        item = await sq.models.driver.findOne({
                            where: {
                                phone: body.value
                            }
                        });
                    } else {
                        throw new Error('无效的查询类型');
                    }

                    if (!item) {
                        throw new Error('未找到相关信息');
                    }
                    return {
                        item: {
                            id: item.id,
                            name: item.name || null,
                            phone: item.phone || null,
                            plate: item.plate || null
                        }
                    };

                } catch (error) {
                    throw { err_msg: error.message };
                }
            }
        },
        set_check_qualification: {
            name: '设置检查公司资质选项',
            description: '设置检查公司资质选项',
            is_write: true,
            is_get_api: false,
            params: {
                enable: { type: Boolean, have_to: true, mean: '启用检查', example: false }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                company.check_qualification = body.enable;
                await company.save();
                return { result: true };
            }
        },
        get_check_qualification: {
            name: '获取是否可检查公司资质',
            description: '获取是否可检查公司资质',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                enable: { type: Boolean, mean: '是否可查看资质', example: false }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return { enable: company.check_qualification };
            }
        },
        add_zone: {
            name: '添加装卸货区域',
            description: '添加装卸货区域',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '区域名称', example: 'A区' },
                stuff_id: { type: Number, have_to: true, mean: '物料', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                let company = await rbac_lib.get_company_by_token(token);
                if (stuff && company && await company.hasStuff(stuff)) {
                    let exist_zones = await stuff.getDrop_take_zones({ where: { name: body.name } });
                    if (exist_zones.length == 0) {
                        let zone = await sq.models.drop_take_zone.create({
                            name: body.name,
                        });
                        await zone.setStuff(stuff);
                    }
                    return { result: true };
                }
                else {
                    throw { err_msg: '无权限' };
                }
            },
        },
        del_zone: {
            name: '删除装卸货区域',
            description: '删除装卸货区域',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '区域ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let zone = await sq.models.drop_take_zone.findByPk(body.id);
                let stuff = await zone.getStuff({ include: [{ model: sq.models.company }] });
                let company = await rbac_lib.get_company_by_token(token);
                if (stuff && company && await company.hasStuff(stuff)) {
                    await zone.destroy();
                    return { result: true };
                }
                else {
                    throw { err_msg: '区域不存在' };
                }
            }
        },
        set_ticket_prefix: {
            name: '配置物料磅单号前缀',
            description: '配置物料磅单号前缀',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                ticket_prefix: { type: String, have_to: true, mean: '前缀', example: 'SDJL' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'ticket_prefix', body.ticket_prefix, token);
            }
        },
        set_add_base: {
            name: '设置自增基础',
            description: '设置自增基础',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                add_base: { type: String, have_to: true, mean: '自增基础', example: 'day' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'add_base', body.add_base, token);
            }
        },
        add_delegate: {
            name: '添加代理',
            description: '添加代理',
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '代理名称', example: '代理名称' },
                code: { type: String, have_to: true, mean: '代理编码', example: '代理编码' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let exist = await company.getDelegates({
                    where: {
                        [db_opt.Op.or]: [
                            {
                                code: body.code
                            },
                            {
                                name: body.name
                            }
                        ]
                    }
                });
                if (exist.length == 1) {
                    throw { err_msg: '代理已存在' };
                }
                await company.createDelegate({
                    name: body.name,
                    code: body.code
                });
                return { result: true };
            }
        },
        del_delegate: {
            name: '删除代理',
            description: '删除代理',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '代理ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let delegate = await company.getDelegates({
                    where: {
                        id: body.id
                    }
                });
                if (delegate.length == 1) {
                    await delegate[0].destroy();
                }
                return { result: true };
            }
        },
        set_delegate_stamp_pic: {
            name: '设置代理印章图片',
            description: '设置代理印章图片',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '代理ID', example: 1 },
                stamp_pic: { type: String, have_to: false, mean: '印章图片', example: '印章图片' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let delegate = await company.getDelegates({
                    where: {
                        id: body.id
                    }
                });
                if (delegate.length == 1) {
                    delegate[0].stamp_pic = body.stamp_pic;
                    await delegate[0].save();
                }
                return { result: true };
            },
        },
        get_delegates: {
            name: '获取代理',
            description: '获取代理',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                delegates: {
                    type: Array, mean: '代理列表', explain: {
                        id: { type: Number, mean: '代理ID', example: 1 },
                        name: { type: String, mean: '代理名称', example: '代理名称' },
                        code: { type: String, mean: '代理编码', example: '代理编码' },
                        stamp_pic: { type: String, mean: '印章图片', example: '印章图片' },
                        contracts: {
                            type: Array, mean: '合同列表', explain: {
                                id: { type: Number, mean: '合同ID', example: 1 },
                                buy_company: {
                                    type: Object, mean: '买方公司', explain: {
                                        id: { type: Number, mean: '公司ID', example: 1 },
                                        name: { type: String, mean: '公司名称', example: '公司名称' }
                                    }
                                },
                            }
                        }
                    }
                }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let ret = await sq.models.delegate.findAndCountAll({
                    where: {
                        companyId: company.id
                    },
                    limit: 20,
                    offset: body.pageNo * 20,
                    order: [['id', 'DESC']],
                    include: {
                        model: sq.models.contract,
                        as: 'contracts',
                        include: [
                            {
                                model: sq.models.company,
                                as: 'buy_company'
                            }
                        ]
                    }
                });
                return {
                    delegates: ret.rows,
                    total: ret.count
                }
            }
        },
        set_replace_field: {
            name: '设置磅单替换字段',
            description: '设置磅单替换字段',
            is_write: false,
            is_get_api: false,
            params: {
                replace_form: {
                    type: Object, have_to: true, mean: '替换表单', explain: {
                        replace_weighingSheet: { type: String, have_to: true, mean: '磅单替换表单', example: '磅单替换表单' },
                        replace_count: { type: String, have_to: true, mean: '载重量替换文字', example: '载重量替换文字' },
                        replace_fw_info: { type: String, have_to: true, mean: '一次称重替换文字', example: '一次称重替换文字' },
                        replace_sw_info: { type: String, have_to: true, mean: '二次称重替换文字', example: '二次称重替换文字' },
                        order_company: { type: String, have_to: true, mean: '下单公司替换文字', example: '二次称重替换文字' },
                        transportation_company: { type: String, have_to: true, mean: '运输公司替换文字', example: '运输公司替换文字' },

                    }
                }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (!company) {
                    throw { err_msg: '公司不匹配' };
                }
                let sq = db_opt.get_sq();
                let replace_content = await sq.models.global_replace_form.findOne({ where: { companyId: company.id } });
                if (!replace_content) {
                    replace_content = await sq.models.global_replace_form.create({
                        companyId: company.id,
                        replace_weighingSheet: body.replace_form.replace_weighingSheet,
                        replace_count: body.replace_form.replace_count,
                        replace_fw_info: body.replace_form.replace_fw_info,
                        replace_sw_info: body.replace_form.replace_sw_info,
                        order_company: body.replace_form.order_company,
                        transportation_company: body.replace_form.transportation_company,
                    });
                } else {
                    replace_content.replace_weighingSheet = body.replace_form.replace_weighingSheet;
                    replace_content.replace_count = body.replace_form.replace_count;
                    replace_content.replace_fw_info = body.replace_form.replace_fw_info;
                    replace_content.replace_sw_info = body.replace_form.replace_sw_info;
                    replace_content.order_company = body.replace_form.order_company;
                    replace_content.transportation_company = body.replace_form.transportation_company;
                    await replace_content.save();
                }

                return { result: true };
            }
        },
        get_replace_field: {
            name: '获取磅单替换字段',
            description: '获取磅单替换字段',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                replace_form: {
                    type: Object, mean: '替换表单', explain: {
                        replace_weighingSheet: { type: String, mean: '磅单替换表单', example: '磅单替换表单' },
                        replace_count: { type: String, mean: '载重量替换文字', example: '载重量替换文字' },
                        replace_fw_info: { type: String, mean: '一次称重替换文字', example: '一次称重替换文字' },
                        replace_sw_info: { type: String, mean: '二次称重替换文字', example: '二次称重替换文字' },
                        order_company: { type: String, mean: '下单公司替换文字', example: '下单公司替换文字' },
                        transportation_company: { type: String, mean: '运输公司替换文字', example: '运输公司替换文字' }
                    }
                }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (!company) {
                    throw { err_msg: '公司不匹配' };
                }
                let sq = db_opt.get_sq();
                let replace_content = await sq.models.global_replace_form.findOne({ where: { companyId: company.id } });
                return {
                    replace_form: {
                        replace_weighingSheet: replace_content ? replace_content.replace_weighingSheet : '称重单',
                        replace_count: replace_content ? replace_content.replace_count : '装载量',
                        replace_fw_info: replace_content ? replace_content.replace_fw_info : '一次计量',
                        replace_sw_info: replace_content ? replace_content.replace_sw_info : '二次计量',
                        order_company: replace_content ? replace_content.order_company : '下单公司',
                        transportation_company: replace_content ? replace_content.transportation_company : '运输公司'
                    }
                };
            }
        },
        get_verify_pay_config: {
            name: '获取验款配置',
            description: '获取验款配置',
            is_write: false,
            is_get_api: false,
            params: {
            },
            result: {
                verify_pay_by_cash: {
                    type: Boolean, mean: '是否由cash模块验款', example: true
                },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let ret = {
                    verify_pay_by_cash: false
                }
                if (company) {
                    ret.verify_pay_by_cash = company.verify_pay_by_cash;
                }
                return ret;
            },
        },
        set_verify_pay_config: {
            name: '设置验款配置',
            description: '设置验款配置',
            is_write: true,
            is_get_api: false,
            params: {
                verify_pay_by_cash: { type: Boolean, have_to: true, mean: '是否由cash模块验款', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.verify_pay_by_cash = body.verify_pay_by_cash;
                    await company.save();
                }
                return { result: true };
            }
        },
        add_sct_scale_item: {
            name: '设置结构化计量称重项',
            description: '设置结构化计量称重项',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                name: { type: String, have_to: true, mean: '结构化计量称重项', example: '称重项' },
                type: { type: String, have_to: false, mean: '称重项类型', example: 'weight' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await company.getStuff({ where: { id: body.stuff_id } });
                if (stuff.length == 1) {
                    stuff = stuff[0];
                    let type = body.type || 'string';
                    let exist = await stuff.getSct_scale_items({ where: { name: body.name } });
                    if (exist.length == 0) {
                        let item = await sq.models.sct_scale_item.create({
                            name: body.name,
                            type: type,
                        });
                        await item.setStuff(stuff);
                    }
                }
                else {
                    throw { err_msg: '物料不存在' };
                }
                return { result: true };
            }
        },
        update_sct_scale_item: {
            name: '更新结构化计量称重项',
            description: '更新结构化计量称重项',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '称重项ID', example: 1 },
                name: { type: String, have_to: false, mean: '结构化计量称重项', example: '称重项' },
                type: { type: String, have_to: false, mean: '称重项类型', example: 'weight' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let item = await sq.models.sct_scale_item.findByPk(body.id, {
                    include: [{
                        model: sq.models.stuff,
                        include: [{
                            model: sq.models.company
                        }]
                    }],
                });
                if (item && item.stuff.company.id == company.id) {
                    item.name = body.name;
                    item.type = body.type || 'string';
                    await item.save();
                }
                else {
                    throw { err_msg: '称重项不存在' };
                }
                return { result: true };
            }
        },
        del_sct_scale_item: {
            name: '删除结构化计量称重项',
            description: '删除结构化计量称重项',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '称重项ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let item = await sq.models.sct_scale_item.findByPk(body.id, {
                    include: [{
                        model: sq.models.stuff,
                        include: [{
                            model: sq.models.company
                        }]
                    }],
                });
                if (item && item.stuff.company.id == company.id) {
                    await item.destroy();
                }
                else {
                    throw { err_msg: '称重项不存在' };
                }
                return { result: true };
            }
        },
        set_show_sc_in_field: {
            name: '设置在排队车辆处显示证件检查',
            description: '设置在排队车辆处显示证件检查',
            is_write: true,
            is_get_api: false,
            params: {
                show_sc_in_field: { type: Boolean, have_to: true, mean: '是否显示证件检查', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.show_sc_in_field = body.show_sc_in_field;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_buy_config_hard: {
            name: '设置采购严格模式',
            description: '设置采购严格模式',
            is_write: true,
            is_get_api: false,
            params: {
                buy_config_hard: { type: Boolean, have_to: true, mean: '是否严格模式', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.buy_config_hard = body.buy_config_hard;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_push_messages_writable_roles: {
            name: '设置消息推送可写角色',
            description: '设置消息推送可写角色',
            is_write: true,
            is_get_api: false,
            params: {
                push_messages_writable_roles: { type: Boolean, have_to: true, mean: '设置消息推送可写角色', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.push_messages_writable_roles = body.push_messages_writable_roles;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_ticket_hasOrhasnt_place: {
            name: '榜单上是否显示装卸车地点',
            description: '榜单上是否显示装卸车地点',
            is_write: true,
            is_get_api: false,
            params: {
                ticket_hasOrhasnt_place: { type: Boolean, have_to: true, mean: '榜单上是否显示装卸车地点', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.ticket_hasOrhasnt_place = body.ticket_hasOrhasnt_place;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_access_control_permission: {
            name: '设置权限控制权限',
            description: '设置权限控制权限',
            is_write: true,
            is_get_api: false,
            params: {
                access_control_permission: { type: Boolean, have_to: true, mean: '是否启用权限控制', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.access_control_permission = body.access_control_permission;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_support_location_detail: {
            name: '设置卸货地点是否显示详细地址',
            description: '设置卸货地点是否显示详细地址',
            is_write: true,
            is_get_api: false,
            params: {
                support_location_detail: { type: Boolean, have_to: true, mean: '卸货地点是否显示详细地址', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.support_location_detail = body.support_location_detail;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_barriergate_control_permission: {
            name: '设置门禁权限控制权限',
            description: '设置门禁权限控制权限',
            is_write: true,
            is_get_api: false,
            params: {
                barriergate_control_permission: { type: Boolean, have_to: true, mean: '是否启用门禁权限控制', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.barriergate_control_permission = body.barriergate_control_permission;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_change_finished_order_price_switch: {
            name: '设置已完成订单修改价格开关',
            description: '设置已完成订单修改价格开关',
            is_write: true,
            is_get_api: false,
            params: {
                change_finished_order_price_switch: { type: Boolean, have_to: true, mean: '是否允许已完成订单修改价格', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.change_finished_order_price_switch = body.change_finished_order_price_switch;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_the_order_display_price: {
            name: '设置订单列表是否显示价格',
            description: '设置订单列表是否显示价格',
            is_write: true,
            is_get_api: false,
            params: {
                is_the_order_display_price: { type: Boolean, have_to: true, mean: '是否显示价格', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.is_the_order_display_price = body.is_the_order_display_price;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_is_allowed_order_return: {
            name: '设置是否允许订单回退',
            description: '设置是否允许订单回退',
            is_write: true,
            is_get_api: false,
            params: {
                is_allowed_order_return: { type: Boolean, have_to: true, mean: '是否允许订单回退', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (company) {
                    company.is_allowed_order_return = body.is_allowed_order_return;
                    await company.save();
                }
                return { result: true };
            }
        },
        set_delay_checkout_time: {
            name: '设置延迟结算定时时间',
            description: '设置延迟结算定时时间',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                delay_checkout_time: { type: String, have_to: true, mean: '延迟结算定时时间', example: '2025' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await change_stuff_single_switch(body.stuff_id, 'delay_checkout_time', body.delay_checkout_time, token);
                if (body.delay_checkout_time != '') {
                    await checkout_delay_config_func({
                        stuff_id: body.stuff_id,
                        checkout_delay: true,
                    }, token);
                }
                return { result: true };
            }
        },
        need_driver_sign: {
            name: '设置是否需要司机签字',
            description: '设置是否需要司机签字',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                need_driver_sign: { type: Boolean, have_to: true, mean: '是否需要司机签字', example: true }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                return await change_stuff_single_switch(body.stuff_id, 'need_driver_sign', body.need_driver_sign, token);
            }
        },
        add_extra_info_config: {
            name: '添加额外信息',
            description: '添加额外信息',
            is_write: true,
            is_get_api: false,
            params: {
                title: { type: String, have_to: true, mean: '额外信息标题', example: '额外配置' }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let exist_record = await company.getExtra_info_configs({
                    where: {
                        title: body.title
                    }
                });
                if (exist_record.length == 0) {
                    await company.createExtra_info_config({
                        title: body.title
                    });
                }
                return { result: true };
            }
        },
        del_extra_info_config: {
            name: '删除额外信息',
            description: '删除额外信息',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '额外信息ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let exist_record = await company.getExtra_info_configs({
                    where: {
                        id: body.id
                    }
                });
                if (exist_record.length == 1) {
                    await exist_record[0].destroy();
                }
                return { result: true };
            }
        },
        get_extra_info_config: {
            name: '获取额外信息',
            description: '获取额外信息',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                extra_info_configs: {
                    type: Array, mean: '额外信息列表', explain: {
                        id: { type: Number, mean: '额外信息ID', example: 1 },
                        title: { type: String, mean: '额外信息标题', example: '额外配置' }
                    }
                }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                let sq = db_opt.get_sq();
                let resp = await sq.models.extra_info_config.findAndCountAll({
                    where: {
                        companyId: company.id
                    },
                    limit: 20,
                    offset: body.pageNo * 20,
                    order: [['id', 'DESC']]
                });
                return {
                    extra_info_configs: resp.rows,
                    total: resp.count
                }
            }
        },
    }
}
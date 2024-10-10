const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
const sq = db_opt.get_sq();
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
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return await plan_lib.fetch_stuff(body.name, body.comment, company, body.expect_count, body.use_for_buy, body.close_time, body.delay_days, body.concern_fapiao);
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
                    }
                },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return {
                    stuff: await company.getStuff(
                        {
                            order: [['id', 'ASC']],
                            offset: body.pageNo * 20,
                            limit: 20
                        }
                    ), total: await company.countStuff()
                };
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
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                if (stuff && company && await company.hasStuff(stuff)) {
                    stuff.no_need_register = body.no_need_register;
                    await stuff.save();
                }
                else {
                    throw { err_msg: '货物不存在' };
                }
                return { result: true };
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
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                if (stuff && company && await company.hasStuff(stuff)) {
                    stuff.need_enter_weight = body.need_enter_weight;
                    await stuff.save();
                }
                else {
                    throw { err_msg: '货物不存在' };
                }
                return { result: true };
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
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                if (stuff && company && await company.hasStuff(stuff)) {
                    stuff.need_exam = body.need_exam;
                    await stuff.save();
                }
                else {
                    throw { err_msg: '货物不存在' };
                }
                return { result: true };
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
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                if (stuff && company && await company.hasStuff(stuff)) {
                    stuff.need_sc = body.need_sc;
                    await stuff.save();
                }
                else {
                    throw { err_msg: '货物不存在' };
                }
                return { result: true };
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
                let sq = db_opt.get_sq();
                const transaction = await sq.transaction();
                try {
                    let planIds = JSON.parse(`[${body.plan_id}]`);
                    let company = await rbac_lib.get_company_by_token(token);
                    // 并行处理所有计划
                    await Promise.all(planIds.map(async (item) => {
                        let plan = await sq.models.plan.findOne({
                            where: { id: item },
                            include: [{ model: sq.models.stuff }, { model: sq.models.bidding_item }],
                            transaction
                        });

                        if (!plan || !company && !(await company.hasStuff(plan.stuff, { transaction }))) {
                            return { result: false };
                        }
                        if (plan.bidding_item) {
                            throw new Error('竞价计划不允许调价');
                        }
                        let unitPrice = Number(body.unit_price);
                        if (isNaN(unitPrice)) {
                            throw new Error('Invalid unit price');
                        }
                        if (plan && plan.status != 3) {
                            let comment = `单价由${plan.unit_price}改为${unitPrice},${body.comment}`
                            await plan_lib.record_plan_history(plan, (await rbac_lib.get_user_by_token(token)).name, comment, { transaction })
                            // 更新价格
                            plan.unit_price = unitPrice;
                            await plan.save({ transaction });
                        } else {
                            throw new Error('计划已关闭');
                        }

                    }));
                    await transaction.commit();
                    return { result: true };

                } catch (error) {
                    await transaction.rollback();
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
                    if (exist_zones.length = 0) {
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
        get_zone: {
            name: '获取装卸货区域',
            description: '获取装卸货区域',
            is_write: false,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 }
            },
            result: {
                zones: {
                    type: Array, mean: '装卸货区域', explain: {
                        id: { type: Number, mean: '区域ID', example: 1 },
                        name: { type: String, mean: '区域名称', example: 'A区' }
                    }
                }
            },
            func: async function (body, token) {
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                let company = await rbac_lib.get_company_by_token(token);
                if (stuff && company && await company.hasStuff(stuff)) {
                    return { zones: await stuff.getDrop_take_zones() };
                }
                else {
                    throw { err_msg: '无权限' };
                }
            }
        },
    }
}
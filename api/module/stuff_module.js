const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const bidding_lib = require('../lib/bidding_lib');
const db_opt = require('../db_opt');
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
                use_for_buy:{type:Boolean, have_to:false, mean:'用于采购', example:false}
            },
            result: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                price: { type: Number, mean: '单价', example: 1 },
                comment: { type: String, mean: '备注', example: '备注' },
                next_price: { type: Number, mean: '下次单价', example: 1 },
                change_last_minutes: { type: Number, mean: '调价所剩分钟', example: 23 },
                expect_count: { type: Number, mean: '期望单车装载量', example: 1 },
                use_for_buy:{type:Boolean, mean:'用于采购', example:false}
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return await plan_lib.fetch_stuff(body.name, body.comment, company, body.expect_count, body.use_for_buy);
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
        enter_weight:{
            name:'配置货物需要入场前重量',
            description:'配置货物需要入场前重量',
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
    }
}
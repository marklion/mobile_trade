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
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                name: { type: String, have_to: true, mean: '货物名称', example: '货物名称' },
                comment: { type: String, have_to: false, mean: '备注', example: '备注' },
                expect_count: { type: Number, have_to: false, mean: '预期数量', example: 1 },
            },
            result: {
                id: { type: Number, mean: '货物ID', example: 1 },
                name: { type: String, mean: '货物名称', example: '货物名称' },
                price: { type: Number, mean: '单价', example: 1 },
                comment: { type: String, mean: '备注', example: '备注' },
                next_price: { type: Number, mean: '下次单价', example: 1 },
                change_last_minutes: { type: Number, mean: '调价所剩分钟', example: 23 },
                expect_count: { type: Number, mean: '期望单车装载量', example: 1 },
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                return await plan_lib.fetch_stuff(body.name, body.comment, company, body.expect_count);
            }
        },
        get_all: {
            name: '获取所有物料',
            description: '获取所有物料',
            need_rbac: true,
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
            need_rbac: true,
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
        sc_config: {
            name: '配置货物是否需要安检',
            description: '配置货物是否需要安检',
            need_rbac: true,
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
            need_rbac: true,
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
        get_price_history:{
            name: '获取调价历史',
            description: '获取调价历史',
            need_rbac: true,
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
    }
}
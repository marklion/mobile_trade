const cash_lib = require('../lib/cash_lib');
const common = require('./common');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const db_opt = require('../db_opt');
module.exports = {
    name: 'cash',
    description: '余额管理',
    methods: {
        charge: {
            name: '充值',
            description: '充值',

            is_write: true,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: false, mean: '合同ID', example: 1 },
                cash_increased: { type: Number, have_to: false, mean: '增加金额', example: 100 },
                comment: { type: String, have_to: false, mean: '备注', example: '充值100元' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                await cash_lib.charge(token, body.contract_id, body.cash_increased, body.comment);
                return { result: true };
            },
        },
        history: {
            name: '获取客户的充值记录',
            description: '获取客户的充值记录',

            is_write: false,
            is_get_api: true,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                begin_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01' },
            },
            result: {
                histories: {
                    type: Array, mean: '历史记录', explain: {
                        time: { type: String, mean: '时间', example: '2020-03-01 12:00:00' },
                        operator: { type: String, mean: '操作人', example: '张三' },
                        comment: { type: String, mean: '备注', example: '充值100元' },
                        cash_increased: { type: Number, mean: '增加金额', example: 100 },
                    }
                }
            },
            func: async function (body, token) {
                let get_ret = await cash_lib.get_history_by_company(token, body.contract_id, body.pageNo, body.begin_time, body.end_time);
                return {
                    histories: get_ret.rows,
                    total: get_ret.count,
                }
            },
        },
        export_history: {
            name: '导出充值记录',
            description: '导出充值记录',
            is_write: false,
            is_get_api: false,
            params: {
                contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
                begin_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id,{
                    include:[{
                        model:db_opt.get_sq().models.company,
                        as:'buy_company',
                    }],
                });
                let company = contract.buy_company;
                return await common.do_export_later(token, company.name + '的余额明细', async () => {
                    return await cash_lib.export_cash_history(token, body.contract_id, body.begin_time, body.end_time);
                });
            },
        },
        order_sale_pay: {
            name: '手工验款',
            description: '手工验款',
            is_write: true,
            is_get_api: false,
            params: {
                plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let company = await rbac_lib.get_company_by_token(token);
                if (!company.verify_pay_by_cash) {
                    throw { err_msg: '无权限，需要销售管理权限才能验款' }
                }
                await plan_lib.manual_pay_plan(body.plan_id, token);
                return { result: true };
            },
        },
        add_subsidy_params:{
            name: '添加补贴参数',
            description: '添加补贴参数',
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '物料ID', example: 1 },
                gate: { type: Number, have_to: true, mean: '补贴门槛', example: 1 },
                discount: { type: Number, have_to: false, mean: '折扣', example: 1 },
                amount: { type: Number, have_to: false, mean: '补贴金额', example: 0 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let ret = {result:false};
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let stuff = await sq.models.stuff.findByPk(body.stuff_id);
                if (!stuff || !company || !(await company.hasStuff(stuff))) {
                    throw { err_msg: '物料不存在或没有权限' };
                }
                const exist_records = await stuff.getSubsidy_gate_discounts({ where: { gate: body.gate } });
                if (exist_records && exist_records.length == 1)
                {
                    if (body.discount && (body.discount > 0 && body.discount < 10)) {
                        exist_records[0].discount = body.discount;
                        exist_records[0].amount = null;
                    } else if (body.amount && body.amount > 0) {
                        exist_records[0].amount = body.amount;
                        exist_records[0].discount = null;
                    }
                    await exist_records[0].save();
                } else {
                    const createData = {
                        gate: body.gate,
                        discount: body.discount,
                        amount: body.amount,
                    };
                    await stuff.createSubsidy_gate_discount(createData);
                }

                ret.result = true;
                return ret;
            }
        },
        del_subsidy_params:{
            name: '删除补贴参数',
            description: '删除补贴参数',
            is_write: true,
            is_get_api: false,
            params: {
                id: { type: Number, have_to: true, mean: '补贴参数ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true }
            },
            func: async function (body, token) {
                let ret = {result:false};
                let sq = db_opt.get_sq();
                let sub_gate_discount = await sq.models.subsidy_gate_discount.findByPk(body.id, {include:[{
                    model:sq.models.stuff,
                }]});
                let company = await rbac_lib.get_company_by_token(token);
                if (sub_gate_discount && company && (await company.hasStuff(sub_gate_discount.stuff)))
                {
                    await sub_gate_discount.destroy();
                    ret.result = true;
                }
                else
                {
                    throw { err_msg: '补贴不存在或没有权限' }
                }
                return ret;
            }
        },
        get_subsidy_params:{
            name: '获取补贴参数',
            description: '获取补贴参数',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                subsidy_params: {
                    type: Array, mean: '补贴参数', explain: {
                        id:{type:Number,mean:'补贴参数ID',example:1},
                        gate:{type:Number,mean:'补贴门槛',example:1},
                        discount:{type:Number,mean:'折扣',example:1},
                        amount:{type:Number,mean:'补贴金额',example:1},
                        stuff:{type:Object,mean:'物料',explain:{
                            id:{type:Number,mean:'物料ID',example:1},
                            name:{type:String,mean:'物料名称',example:'物料1'},
                        }},
                    }
                }
            },
            func: async function (body, token) {
                let ret = {subsidy_params:[], total:0};
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let resp = await sq.models.subsidy_gate_discount.findAndCountAll({
                    include:[
                        {
                            model:sq.models.stuff,
                            where:{companyId:company.id},
                            required:true,
                        }
                    ],
                    offset:20*(body.pageNo),
                    limit:20,
                    order:[['stuffId', 'ASC'],['gate', 'ASC']],
                });
                if (resp) {
                    ret.subsidy_params = resp.rows;
                    ret.total = resp.count;
                }
                return ret;
            }
        },
        do_subsidy:{
            name: '补贴',
            description: '补贴',
            is_write: true,
            is_get_api: false,
            params: {
                plan_time_start: { type: String, have_to: false, mean: '计划开始时间', example: '2020-01-01' },
                plan_time_end: { type: String, have_to: false, mean: '计划结束时间', example: '2020-01-01' },
                m_time_start:{ type: String, have_to: false, mean: '出厂时间开始', example: '2020-01-01' },
                m_time_end:{ type: String, have_to: false, mean: '出厂时间结束', example: '2020-01-01' },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                let time_filter_valid = false;
                let filter_by_plan_time = false;
                let ret = { result: false };
                if (body.plan_time_start && body.plan_time_end) {
                    time_filter_valid = true;
                    filter_by_plan_time = true;
                }
                else if (body.m_time_start && body.m_time_end)
                {
                    time_filter_valid = true;
                }
                if (time_filter_valid) {
                    let timer_filter = {
                        time_start: body.m_time_start,
                        time_end: body.m_time_end,
                    };
                    if (filter_by_plan_time) {
                        timer_filter = {
                            time_start: body.plan_time_start,
                            time_end: body.plan_time_end,
                        };
                    }
                    timer_filter.filter_by_plan_time = filter_by_plan_time;
                    let company = await rbac_lib.get_company_by_token(token);
                    let range = `${timer_filter.filter_by_plan_time ? '计划时间' : '出厂时间'}: ${timer_filter.time_start} - ${timer_filter.time_end}`;
                    let new_record = await company.createSubsidy_record({
                        range: range,
                        status: '处理中',
                        order_count: 0,
                    });
                    ret.result = true;
                    let new_record_id = new_record.id;
                    setTimeout(async () => {
                        let new_record = await db_opt.get_sq().models.subsidy_record.findByPk(new_record_id);
                        try {
                            let order_count = await cash_lib.do_subsidy_by_filter(timer_filter, company, new_record);
                            new_record.order_count = order_count;
                            new_record.status = '已完成';
                        } catch (error) {
                            console.log(error);
                            new_record.status = '失败';
                        }
                        await new_record.save();

                    }, 200);
                }
                else {
                    throw { err_msg: '时间范围不合法' }
                }
                return ret;
            }
        },
        undo_subsidy:{
            name:'撤销补贴',
            description: '撤销补贴',
            is_write: true,
            is_get_api: false,
            params: {
                record_id: { type: Number, have_to: true, mean: '补贴记录ID', example: 1 },
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                let ret = {
                    result:false,
                };
                let sq = db_opt.get_sq();
                let sr = await sq.models.subsidy_record.findByPk(body.record_id);
                let company = await rbac_lib.get_company_by_token(token);
                if (sr && sr.status == '已完成' && company &&(await company.hasSubsidy_record(sr))) {
                    ret.result = true;
                    sr.status = '撤销中';
                    await sr.save();
                    setTimeout(async()=>{
                        try {
                            await cash_lib.undo_subsidy_by_id(sr.id, token);
                            sr.status = '已撤销';
                        } catch (error) {
                            console.log(error);
                            sr.status = '撤销失败';
                        }
                        await sr.save();
                    }, 200);
                }
                else
                {
                    throw { err_msg: '补贴记录不存在或未完成' };
                }
                return ret;
            },
        },
        get_subsidy_record: {
            name: '获取补贴记录',
            description: '获取补贴记录',
            is_write: false,
            is_get_api: true,
            params: {
            },
            result: {
                records: {
                    type: Array, mean: '补贴记录', explain: {
                        id: { type: Number, mean: '补贴记录ID', example: 1 },
                        range: { type: String, mean: '时间范围', example: '2020-01-01 00:00:00 - 2020-01-02 00:00:00' },
                        status: { type: String, mean: '状态', example: '处理中' },
                        order_count: { type: Number, mean: '订单数', example: 10 },
                    }
                },
            },
            func: async function (body, token) {
                let ret = { records: [], total: 0 };
                let sq = db_opt.get_sq();
                let company = await rbac_lib.get_company_by_token(token);
                let resp = await sq.models.subsidy_record.findAndCountAll({
                    where: { companyId: company.id },
                    offset: 20 * (body.pageNo),
                    limit: 20,
                    order: [['createdAt', 'DESC']],
                });
                if (resp) {
                    ret.records = resp.rows;
                    ret.total = resp.count;
                }
                return ret;
            }
        },
    }
}
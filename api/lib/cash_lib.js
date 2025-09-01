const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');
const plan_lib = require('./plan_lib');
const moment = require('moment');
const ExcelJS = require('exceljs');
const uuid = require('uuid');
const { default: axios } = require('axios');
const util_lib = require('./util_lib');
const { Utils } = require('sequelize');
const httpsAgent = require('https').Agent;
module.exports = {
    charge_by_username_and_contract: async function (user_name, contract, _cash_increased, _comment, subsidy_record) {
        contract.balance += _cash_increased;
        await contract.save();
        let bh = await contract.createBalance_history({
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
            operator: user_name,
            comment: _comment,
            cash_increased: _cash_increased,
        });
        if (subsidy_record && bh) {
            await bh.setSubsidy_record(subsidy_record);
        }
        let buy_company = await contract.getBuy_company();
        if (buy_company) {
            let plans = await buy_company.getPlans({ where: { status: 1, is_buy: false } });
            for (let index = 0; index < plans.length; index++) {
                const element = plans[index];
                await plan_lib.verify_plan_pay(element)
            }
        }

    },
    charge: async function (_token, _contract_id, _cash_increased, _comment) {
        let user = await rbac_lib.get_user_by_token(_token);
        let contract = await db_opt.get_sq().models.contract.findByPk(_contract_id);
        if (user && contract) {
            let sale_company = await user.getCompany();
            if (sale_company && await sale_company.hasSale_contract(contract)) {
                await this.charge_by_username_and_contract(user.name, contract, _cash_increased, _comment);
            }
            else {
                throw { err_msg: '无权限' }
            }
        }
        else {
            throw { err_msg: '无权限' }
        }
    },
    get_history_by_company: async function (_token, _contract_id, pageNo, begin_time, end_time) {
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await db_opt.get_sq().models.contract.findByPk(_contract_id);
        let ret = { count: 0, rows: [] };
        let where_condition = {
            [db_opt.Op.and]: [
                {
                    id: {
                        [db_opt.Op.ne]: 0
                    }
                }
            ]
        };
        if (begin_time) {
            where_condition[db_opt.Op.and].push({
                time: {
                    [db_opt.Op.gte]: begin_time
                }
            })
        }
        if (end_time) {
            where_condition[db_opt.Op.and].push({
                time: {
                    [db_opt.Op.lte]: end_time
                }
            })
        }
        if (company && contract && (await company.hasSale_contract(contract) || await company.hasBuy_contract(contract))) {
            ret.rows = await contract.getBalance_histories({
                offset: pageNo * 20,
                limit: 20,
                order: [['id', 'DESC']],
                where: where_condition
            });
            ret.count = await contract.countBalance_histories();
        }

        return ret;
    },
    export_cash_history: async function (token, contract_id, begin_time, end_time) {
        if (!end_time.includes(':')) {
            end_time += ' 23:59:59';
        }
        let company = await rbac_lib.get_company_by_token(token);
        let contract = await db_opt.get_sq().models.contract.findByPk(contract_id);
        if (company && contract && (await company.hasSale_contract(contract) || await company.hasBuy_contract(contract))) {
            let resp = await this.getBalanceHistoryWithAfterValue(contract_id, begin_time, end_time);
            let json = [];
            if (resp && resp.length > 0) {
                resp.forEach(item => {
                    json.push({
                        time: item.time,
                        operator: item.operator,
                        comment: item.comment,
                        cash_increased: item.cash_increased,
                        balanceAfter: item.balanceAfter
                    })
                });
            }
            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet((await contract.getBuy_company()).name);
            worksheet.columns = [{
                header: '时间',
                key: 'time',
                width: 20
            }, {
                header: '操作人',
                key: 'operator',
                width: 20
            }, {
                header: '备注',
                key: 'comment',
                width: 20
            }, {
                header: '余额增加',
                key: 'cash_increased',
                width: 20
            }, {
                header: '变化后余额',
                key: 'balanceAfter',
                width: 20
            }];
            worksheet.addRows(json);
            worksheet.getColumn('cash_increased').numFmt = '0.00';
            worksheet.getColumn('balanceAfter').numFmt = '0.00';
            let file_name = '/uploads/balance' + uuid.v4() + '.xlsx';
            await workbook.xlsx.writeFile('/database' + file_name);
            return file_name;
        }
    },
    req2u8c: async function (u8c_config, url, req) {
        let ret = {};
        try {
            let resp = await axios.post(u8c_config.url + url, req, {
                headers: {
                    'Content-Type': 'application/json',
                    usercode: u8c_config.usercode,
                    password: u8c_config.password,
                    system: u8c_config.system_code,
                },
                httpsAgent: new httpsAgent({
                    rejectUnauthorized: false,
                    keepAlive: false,
                })
            });
            if (resp.data.status == "success") {
                ret = JSON.parse(resp.data.data);
            }
            else {
                ret = { err_msg: JSON.stringify(resp.data) };
            }
        } catch (error) {
            console.log(error);
            ret.err_msg = JSON.stringify(error);
        }
        return ret;
    },

    make_sale_order_children: function (plans) {
        let ret = [];

        for (let plan of plans) {
            let tmp_price = plan.unit_price;
            if (plan.subsidy_price) {
                tmp_price = plan.subsidy_price;
            }
            let su_value = plan.count;
            if (plan.stuff.second_unit) {
                su_value = plan.stuff.coefficient * plan.count;
                let su_decimal = plan.stuff.second_unit_decimal;
                su_value = parseFloat(su_value).toFixed(su_decimal);
            }
            ret.push({
                cinventoryid: plan.stuff.stuff_code,
                nnumber: su_value,
                noriginalcurprice: tmp_price,
            });
        }

        return ret;
    },
    make_buy_order_children: function (plans, idiscounttaxtype, ntaxrate) {
        let ret = [];
        for (let plan of plans) {
            let su_value = plan.count;
            if (plan.stuff.second_unit) {
                su_value = plan.stuff.coefficient * plan.count;
                let su_decimal = plan.stuff.second_unit_decimal;
                su_value = parseFloat(su_value).toFixed(su_decimal);
            }
            ret.push({
                cmangid: plan.stuff.stuff_code,
                nordernum: su_value,
                norgtaxprice: plan.unit_price,
                idiscounttaxtype: idiscounttaxtype,
                ntaxrate: parseFloat(ntaxrate)
            });
        }

        return ret;
    },

    make_req_url_from_oi: async function (u8c_oi) {
        let ret = undefined;
        if (u8c_oi.plans.length >= 0) {
            let u8c_config = await u8c_oi.company.getU8c_config();
            let company = u8c_oi.plans[0].company;
            let is_buy = u8c_oi.plans[0].is_buy;
            let contract = undefined;
            if (company.code) {
                contract = {
                    customer_code: company.code,
                }
            }
            else {
                if (is_buy) {
                    contract = (await u8c_oi.company.getBuy_contracts({
                        where: {
                            saleCompanyId: company.id,
                        },
                    }))[0];
                }
                else {
                    contract = (await u8c_oi.company.getSale_contracts({
                        where: {
                            buyCompanyId: company.id,
                        },
                    }))[0];
                }
            }

            if (is_buy) {
                ret = {
                    req: {
                        puordervo: [{
                            parentvo: {
                                pk_corp: u8c_config.corpid,
                                dorderdate: moment().format('YYYY-MM-DD'),
                                cbiztype: u8c_config.cbiztype_buy,
                                cpurorganization: u8c_config.cpurorganization,
                                cvendormangid: contract.customer_code,
                                cdeptid: u8c_config.cdeptid_buy,
                                vmemo: moment().format('YYYY-MM-DD HH-mm-ss') + u8c_config.vnote,
                                coperator: u8c_config.coperatorid
                            },
                            childrenvo: this.make_buy_order_children(u8c_oi.plans, u8c_config.idiscounttaxtype, u8c_config.ntaxrate_buy),
                        }]
                    },
                    url: '/u8cloud/api/pu/order/saveapprove',
                };
            }
            else {
                ret = {
                    req: {
                        saleorder: [{
                            parentvo: {
                                cbiztype: u8c_config.cbiztype_sale,
                                pk_corp: u8c_config.corpid,
                                ccustomerid: contract.customer_code,
                                cdeptid: u8c_config.cdeptid_sale,
                                csalecorpid: u8c_config.csalecorpid,
                                ccalbodyid: u8c_config.ccalbodyid,
                                creceiptcorpid: contract.customer_code,
                                ndiscountrate: 100,
                                ccurrencytypeid: u8c_config.ccurrencytypeid,
                                coperatorid: u8c_config.coperatorid,
                                vnote: moment().format('YYYY-MM-DD HH-mm-ss') + u8c_config.vnote,
                            },
                            childrenvo: this.make_sale_order_children(u8c_oi.plans),
                        }],
                    },
                    url: '/u8cloud/api/so/saleorder/saveapprove',
                }
            }
        }
        return ret;
    },

    execute_u8c_oi: async function (u8c_oi) {
        u8c_oi.is_running = true;
        await u8c_oi.save();
        if (u8c_oi.plans.length >= 0) {
            let req_url = await this.make_req_url_from_oi(u8c_oi);
            let resp = await this.req2u8c(await u8c_oi.company.getU8c_config(), req_url.url, req_url.req);
            u8c_oi.is_running = false;
            u8c_oi.run_log = "url:" + req_url.url + "\nreq:" + JSON.stringify(req_url.req) + "\nresp:" + JSON.stringify(resp);
            if (resp.err_msg) {
                u8c_oi.error_msg = resp.err_msg;
            }
            await u8c_oi.save();
        }
    },
    create_u8c_record: async function (operator, plans, company) {
        let new_u8c_oi = await db_opt.get_sq().models.u8c_order_info.create({
            operator: operator,
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
        for (let itr of plans) {
            if (await itr.getU8c_order_info() == undefined) {
                await itr.setU8c_order_info(new_u8c_oi);
            }
        }
        if (await new_u8c_oi.countPlans() == 0) {
            await new_u8c_oi.destroy();
        }
        else {
            await new_u8c_oi.setCompany(company);
            new_u8c_oi.plans = await new_u8c_oi.getPlans({
                include: [db_opt.get_sq().models.company, db_opt.get_sq().models.stuff, db_opt.get_sq().models.delegate]
            });
            new_u8c_oi.plans.forEach((itr) => {
                if (itr.delegate) {
                    itr.company = {
                        id: -itr.delegate.id,
                        name: itr.delegate.name,
                        code: itr.delegate.code,
                    }
                }
            }
            );
            new_u8c_oi.company = company;
            this.execute_u8c_oi(new_u8c_oi);
        }
    },
    sync2u8c: async function (operator, plans, company) {
        let sale_plans = {};
        let buy_plans = {};
        plans.sort((a, b) => {
            if (a.company.id < b.company.id) {
                return -1;
            }
            if (a.company.id > b.company.id) {
                return 1;
            }
            return 0;
        });
        plans.forEach(plan => {
            let company = plan.company;
            let plan_list = undefined;
            if (plan.is_buy) {
                plan_list = buy_plans[company.id];
            }
            else {
                plan_list = sale_plans[company.id];
            }
            if (plan_list == undefined) {
                plan_list = [];
            }
            plan_list.push(plan);
            if (plan.is_buy) {
                buy_plans[company.id] = plan_list;
            }
            else {
                sale_plans[company.id] = plan_list;
            }
        });
        for (const key in sale_plans) {
            await this.create_u8c_record(operator, sale_plans[key], company);
        }
        for (const key in buy_plans) {
            await this.create_u8c_record(operator, buy_plans[key], company);
        }
    },
    del_u8c_oi: async function (company, ids) {
        let ois = await company.getU8c_order_infos({
            where: {
                id: {
                    [db_opt.Op.in]: ids,
                }
            }
        });
        for (let index = 0; index < ois.length; index++) {
            const element = ois[index];
            await element.destroy();
        }
    },
    get_u8c_oi: async function (token, pageNo) {
        let company = await rbac_lib.get_company_by_token(token);
        let ret = { count: 0, rows: [] };
        if (company) {
            ret.rows = await company.getU8c_order_infos({
                offset: pageNo * 20,
                limit: 20,
                order: [['id', 'DESC']],
                include: [{
                    model: db_opt.get_sq().models.plan,
                    include: [db_opt.get_sq().models.company]
                }],
            });
            ret.count = await company.countU8c_order_infos();
        }
        return ret;
    },
    get_unsynced_plans: async function (token, cond, pageNo) {
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(token);
        let stuff_or = [];
        let where_condition = {
            [db_opt.Op.and]: [
                {
                    status: 3,
                    manual_close: false,
                    plan_time: {
                        [db_opt.Op.gte]: cond.plan_time_start,
                        [db_opt.Op.lte]: cond.plan_time_end,
                    }
                },
                sq.literal(`(select count(*) from u8c_order_info where id = plan.u8cOrderInfoId AND deletedAt is Null) = 0`),
            ],
        };
        let stuff = await company.getStuff({ paranoid: false });
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            stuff_or.push({ stuffId: element.id });
        }
        where_condition[db_opt.Op.and].push({
            [db_opt.Op.or]: stuff_or
        });
        let tmp_include = util_lib.plan_detail_include();
        let search_condition = {
            order: [[sq.fn('TIMESTAMP', sq.col('plan_time')), 'DESC'], ['id', 'DESC']],
            offset: pageNo * 20,
            limit: 20,
            where: where_condition,
            include: tmp_include,
        };
        let count = await sq.models.plan.count({ where: where_condition });
        let plans = await sq.models.plan.findAll(search_condition);
        return {
            total: count,
            plans: plans,
        };
    },
    getBalanceHistoryWithAfterValue: async function (contract_id, begin_time, end_time) {
        let sq = db_opt.get_sq();
        let resp;
        await db_opt.get_sq().transaction({ savepoint: true }, async (t) => {
            let contract = await db_opt.get_sq().models.contract.findByPk(contract_id);
            const currentBalance = contract.balance;
            resp = await contract.getBalance_histories({
                attributes: [
                    'id',
                    'time',
                    'operator',
                    'comment',
                    'cash_increased',
                    [sq.literal(
                        `ROUND(${currentBalance} - (
                        SELECT COALESCE(SUM(cash_increased), 0)
                        FROM balance_history AS bh
                        WHERE bh.id > balance_history.id AND bh.contractId = balance_history.contractId
                    )
                    , 2)`
                    ), 'balanceAfter']
                ],
                where: {
                    [db_opt.Op.and]: [
                        sq.where(sq.fn('TIMESTAMP', sq.col('time')), {
                            [db_opt.Op.gte]: sq.fn('TIMESTAMP', begin_time)
                        }),
                        sq.where(sq.fn('TIMESTAMP', sq.col('time')), {
                            [db_opt.Op.lte]: sq.fn('TIMESTAMP', end_time)
                        }),
                    ]
                },
                raw: true,
                order: [['id', 'DESC']],
            });
        })
        return resp;
    },
    search_subsidy_related_plans: async function (filter, company, is_undo) {
        let sq = db_opt.get_sq();
        let cond = {
            is_buy: false,
            subsidy_price: 0,
            status: 3,
            manual_close: false,
            count: {
                [db_opt.Op.ne]: 0,
            },
        };
        if (is_undo) {
            cond.subsidy_price = {
                [db_opt.Op.ne]: 0,
            };
        }
        if (filter.filter_by_plan_time) {
            cond.plan_time = {
                [db_opt.Op.gte]: filter.time_start,
                [db_opt.Op.lte]: filter.time_end,
            }
        }
        else {
            cond.m_time = {
                [db_opt.Op.gte]: filter.time_start,
                [db_opt.Op.lte]: filter.time_end,
            }
        }
        let orig_plans = await sq.models.plan.findAll({
            where: cond,
            include: [
                {
                    model: sq.models.stuff,
                    where: {
                        companyId: company.id,
                    },
                    required: true,
                    include: [
                        {
                            model: sq.models.subsidy_gate_discount
                        }
                    ],
                },
            ],
        });
        let orig_plan_ids = orig_plans.map(item => item.id);
        let plans = await sq.models.archive_plan.findAll({
            where: {
                planId: {
                    [db_opt.Op.in]: orig_plan_ids,
                },
            }
        });
        plans.forEach(item => {
            item.content = JSON.parse(item.content);
        });

        return plans;
    },
    split_plans_by_stuff: async function (plans) {
        let ret = [];
        for (let index = 0; index < plans.length; index++) {
            const element = plans[index];
            let stuff_group = ret.find(item => item.stuffId == element.content.stuff.id);
            if (!stuff_group) {
                stuff_group = {
                    stuffId: element.content.stuff.id,
                    plans: [],
                }
                ret.push(stuff_group);
            }
            stuff_group.plans.push(element);
        }
        return ret;
    },
    split_plans_by_company: async function (plans) {
        let ret = [];
        for (let index = 0; index < plans.length; index++) {
            const element = plans[index];
            let company_group = ret.find(item => item.companyId == element.content.company.id);
            if (!company_group) {
                company_group = {
                    companyId: element.content.company.id,
                    plans: [],
                }
                ret.push(company_group);
            }
            company_group.plans.push(element);
        }
        return ret;
    },
    calc_total_count: async function (plans) {
        let ret = 0;
        plans.forEach(plan => {
            ret += plan.content.count;
        });
        return ret;
    },
    set_subsidy_price: async function (plans, discount, amount) {
        let ret = 0;
        for (let index = 0; index < plans.length; index++) {
            const element = plans[index];
            if (amount && amount > 0) {
                element.content.subsidy_price = Math.max(
                    0,
                    element.content.unit_price - amount
                );
                ret += amount * element.content.count;
            }
            else if (discount && discount > 0) {
                element.content.subsidy_price = element.content.unit_price * discount / 10;
                ret += (element.content.unit_price - element.content.subsidy_price) * element.content.count;
            }
            let save_one = await db_opt.get_sq().models.archive_plan.findByPk(element.id);
            save_one.content = JSON.stringify(element.content);
            let orig_plan = await db_opt.get_sq().models.plan.findByPk(element.planId);
            orig_plan.subsidy_price = element.content.subsidy_price;
            await orig_plan.save();
            await save_one.save();
        }
        return ret;
    },
    do_subsidy_per_company: async function (plan_company_group, subsidy_gate_discounts, subsidy_record) {
        let ret = 0;
        for (let index = 0; index < plan_company_group.length; index++) {
            const element = plan_company_group[index];
            if (element.plans.length > 0) {
                let contract = await db_opt.get_sq().models.contract.findOne({
                    where: {
                        buyCompanyId: element.companyId,
                        saleCompanyId: element.plans[0].content.stuff.company.id,
                    }
                });
                let total_count = await this.calc_total_count(element.plans);
                for (let j = 0; j < subsidy_gate_discounts.length; j++) {
                    let sgd = subsidy_gate_discounts[j];
                    if (total_count >= sgd.gate) {
                        let discount = sgd.discount;
                        let amount = sgd.amount;
                        let total_subsidy = await this.set_subsidy_price(element.plans, discount, amount);
                        await this.charge_by_username_and_contract('自动', contract, total_subsidy, `因为总量${total_count}大于门槛${sgd.gate},补贴${total_subsidy}`, subsidy_record);
                        ret += element.plans.length;
                        break;
                    }
                }
            }

        }
        return ret;
    },
    do_subsidy_by_filter: async function (filter, company, subsidy_record) {
        let ret = 0;
        await db_opt.get_sq().transaction({ savepoint: true }, async (t) => {
            let total_plans = await this.search_subsidy_related_plans(filter, company);
            let plan_stuff_group = await this.split_plans_by_stuff(total_plans);
            for (let index = 0; index < plan_stuff_group.length; index++) {
                const element = plan_stuff_group[index];
                let stuff = await db_opt.get_sq().models.stuff.findByPk(element.stuffId);
                if (stuff) {
                    let subsidy_gate_discounts = await stuff.getSubsidy_gate_discounts({
                        order: [['gate', 'DESC']],
                    });
                    if (subsidy_gate_discounts.length > 0) {
                        let plan_company_group = await this.split_plans_by_company(element.plans);
                        ret += await this.do_subsidy_per_company(plan_company_group, subsidy_gate_discounts, subsidy_record);
                    }
                }
            }
        });
        return ret;
    },
    undo_subsidy_by_id: async function (sid, token) {
        await db_opt.get_sq().transaction({ savepoint: true }, async (t) => {
            let sr = await db_opt.get_sq().models.subsidy_record.findByPk(sid, {
                include: [{
                    model: db_opt.get_sq().models.company,
                }]
            });
            let filter = {
                filter_by_plan_time: true,
            };
            let prefix = sr.range.split(': ')[0].trim();
            let time_string = sr.range.split(': ')[1].trim();
            filter.time_start = time_string.split(' - ')[0].trim();
            filter.time_end = time_string.split(' - ')[1].trim();
            if (prefix == '创建时间') {
                filter.filter_by_plan_time = false;
            }
            let total_plans = await this.search_subsidy_related_plans(filter, sr.company, true);
            for (let index = 0; index < total_plans.length; index++) {
                const element = total_plans[index];
                let save_one = await db_opt.get_sq().models.archive_plan.findByPk(element.id);
                element.content.subsidy_price = 0;
                save_one.content = JSON.stringify(element.content);
                let orig_plan = await db_opt.get_sq().models.plan.findByPk(element.planId);
                orig_plan.subsidy_price = element.content.subsidy_price;
                await orig_plan.save();
                await save_one.save();
            }
            let bhs = await sr.getBalance_histories();
            for (let bh of bhs) {
                await this.charge(token, bh.contractId, -bh.cash_increased, '撤销补贴');
            }
        });
    },
};
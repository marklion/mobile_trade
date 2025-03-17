const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');
const plan_lib = require('./plan_lib');
const moment = require('moment');
const ExcelJS = require('exceljs');
const uuid = require('uuid');
const { default: axios } = require('axios');
module.exports = {
    charge: async function (_token, _contract_id, _cash_increased, _comment) {
        let user = await rbac_lib.get_user_by_token(_token);
        let contract = await db_opt.get_sq().models.contract.findByPk(_contract_id);
        if (user && contract) {
            let sale_company = await user.getCompany();
            if (sale_company && await sale_company.hasSale_contract(contract)) {
                contract.balance += _cash_increased;
                await contract.save();
                await contract.createBalance_history({
                    time: moment().format('YYYY-MM-DD HH:mm:ss'),
                    operator: user.name,
                    comment: _comment,
                    cash_increased: _cash_increased,
                });
                let buy_company = await contract.getBuy_company();
                if (buy_company) {
                    let plans = await buy_company.getPlans({ where: { status: 1 } });
                    for (let index = 0; index < plans.length; index++) {
                        const element = plans[index];
                        await plan_lib.verify_plan_pay(element)
                    }
                }
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
        let sq = db_opt.get_sq();
        if (!end_time.includes(':')) {
            end_time += ' 23:59:59';
        }
        let company = await rbac_lib.get_company_by_token(token);
        let contract = await db_opt.get_sq().models.contract.findByPk(contract_id);
        if (company && contract && (await company.hasSale_contract(contract) || await company.hasBuy_contract(contract))) {
            let resp = await contract.getBalance_histories({
                where: {
                    [db_opt.Op.and]: [
                        sq.where(sq.fn('TIMESTAMP', sq.col('time')), {
                            [db_opt.Op.gte]: sq.fn('TIMESTAMP', begin_time)
                        }),
                        sq.where(sq.fn('TIMESTAMP', sq.col('time')), {
                            [db_opt.Op.lte]: sq.fn('TIMESTAMP', end_time)
                        }),
                    ]
                }
            });
            let json = [];
            resp.forEach(item => {
                json.push({
                    time: item.time,
                    operator: item.operator,
                    comment: item.comment,
                    cash_increased: item.cash_increased
                })
            });

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
            }];
            worksheet.addRows(json);
            worksheet.getColumn('cash_increased').numFmt = '0.00';
            let file_name = '/uploads/balance' + uuid.v4() + '.xlsx';
            await workbook.xlsx.writeFile('/database' + file_name);
            return file_name;
        }
    },
    req2u8c: async function (u8c_config, url, req) {
        let ret = undefined;
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
        } catch (error) {
            console.log(error);
            ret.err_msg = JSON.stringify(error);
        }
        return ret;
    },
    execute_u8c_oi:async function(u8c_oi) {
        u8c_oi.is_running = true;
        await u8c_oi.save();
        setTimeout(async () => {
            u8c_oi.is_running = false;
            u8c_oi.run_log = moment().format('YYYY-MM-DD HH:mm:ss') + '执行成功';
            await u8c_oi.save();
        }, 30000);
    },
    create_u8c_record:async function(operator, plans, company) {
        let new_u8c_oi = await db_opt.get_sq().models.u8c_order_info.create({
            operator: operator,
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
        for (let itr in plans) {
            if (await itr.getU8c_order_info() == undefined) {
                await itr.setU8c_order_info(new_u8c_oi);
            }
        }
        if (await new_u8c_oi.countPlans() == 0) {
            await new_u8c_oi.destroy();
        }
        else {
            await new_u8c_oi.setCompany(company);
            this.execute_u8c_oi();
        }
    },
    sync2u8c: async function (operator, plans, company) {
        let sale_plans = {};
        let buy_plans = {};
        plans.sort((a, b) => {
            if (a.stuff.company.id < b.stuff.company.id) {
                return -1;
            }
            if (a.stuff.company.id > b.stuff.company.id) {
                return 1;
            }
            return 0;
        });
        plans.forEach(plan => {
            let company = plan.stuff.company;
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
};
const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');
const plan_lib = require('./plan_lib');
const moment = require('moment');
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

    get_history_by_company: async function (_token, _contract_id, pageNo) {
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await db_opt.get_sq().models.contract.findByPk(_contract_id);
        let ret = { count: 0, rows: [] };
        if (company && contract && (await company.hasSale_contract(contract) || await company.hasBuy_contract(contract))) {
            ret.rows = await contract.getBalance_histories({
                offset: pageNo * 20,
                limit: 20,
                order: [['id', 'DESC']],
            });
            ret.count = await contract.countBalance_histories();
        }

        return ret;
    },

};
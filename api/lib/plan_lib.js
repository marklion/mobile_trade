const db_opt = require('../db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');
const wx_api_util = require('./wx_api_util');
const { hook_plan } = require('./hook_lib');
const field_lib = require('./field_lib');
const ExcelJS = require('exceljs');
const uuid = require('uuid');
const util_lib = require('./util_lib');
const sc_lib = require('./sc_lib');
const fc_lib = require('./fc_lib');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();
module.exports = {
    close_a_plan: async function (plan, token) {
        plan.status = 3;
        plan.arrears = 0;
        plan.outstanding_vehicles = 0;
        await plan.save();
        await this.rp_history_checkout(plan, (await rbac_lib.get_user_by_token(token)).name);
        if (!plan.is_buy) {
            await this.plan_cost(plan);
        }
        if (plan.is_repeat) {
            await this.dup_plan(plan, token);
        }
        await hook_plan('deliver_plan', plan);
    },
    fetch_vehicle: async function (_plate, _is_behind) {
        let sq = db_opt.get_sq();
        let vehicle_found = await sq.models.vehicle.findOrCreate({ where: { plate: _plate }, defaults: { is_behind: _is_behind } });
        return vehicle_found[0].toJSON();
    },
    fetch_driver: async function (_name, _phone, _id_card) {
        let sq = db_opt.get_sq();
        let driver_found = await sq.models.driver.findOrCreate({ where: { phone: _phone }, defaults: { name: _name, id_card: _id_card } });
        return driver_found[0];
    },
    fetch_stuff: async function (_name, _comment, _company, _expect_count, use_for_buy, close_time, delay_days, concern_fapiao, stuff_code, close_today) {
        let sq = db_opt.get_sq();
        if (use_for_buy == undefined) {
            use_for_buy = false;
        }
        let stuff_found = await _company.getStuff({ where: { name: _name, use_for_buy: use_for_buy } });
        if (stuff_found.length != 1) {
            stuff_found = await sq.models.stuff.create({ name: _name, comment: _comment, expect_count: _expect_count, use_for_buy: use_for_buy });
            await _company.addStuff(stuff_found);
        }
        let ret = {};
        stuff_found = await _company.getStuff({ where: { name: _name, use_for_buy: use_for_buy } });
        if (stuff_found.length == 1) {
            stuff_found[0].comment = _comment;
            stuff_found[0].expect_count = _expect_count;
            stuff_found[0].use_for_buy = use_for_buy;
            stuff_found[0].close_time = close_time;
            stuff_found[0].delay_days = delay_days;
            stuff_found[0].concern_fapiao = concern_fapiao;
            stuff_found[0].stuff_code = stuff_code;
            stuff_found[0].close_today = close_today;
            await stuff_found[0].save();
            ret = stuff_found[0].toJSON();
        }
        else {
            throw { err_msg: '未找到货物' };
        }
        return ret;
    },
    get_stuff_need_buy: async function (_sale_company, pageNo) {
        let sq = db_opt.get_sq();
        let ret = await sq.models.stuff.findAndCountAll({
            where: {
                [db_opt.Op.and]: [
                    {
                        use_for_buy: true,
                    },
                    sq.literal(`(select count(*) from company where id = stuff.companyId AND (buy_config_hard = 0 OR (select count(*) from contract_stuff where stuffId = stuff.id AND contractId = (select id from contract where saleCompanyId = ${_sale_company.id} AND buyCompanyId = stuff.companyId AND deletedAt is Null)) = 1)) = 1`),
                ],
            },
            offset: pageNo * 20,
            limit: 20,
            order: [
                ['companyId', 'ASC'],
                ['id', 'ASC'],
            ],
            include: [
                {
                    model: sq.models.company,
                    required: true,
                    include: [
                        {
                            model: sq.models.contract,
                            where: {
                                saleCompanyId: _sale_company.id
                            },
                            required: true,
                            as: 'buy_contracts',
                        },
                    ]
                },
            ]
        });
        return ret;
    },
    get_stuff_on_sale: async function (_buy_company, pageNo) {
        let sq = db_opt.get_sq();
        return await sq.models.stuff.findAndCountAll({
            where: {
                use_for_buy: false,
                // '$contract.buyCompanyId$': _buy_company.id
            },
            offset: pageNo * 20,
            limit: 20,
            order: [
                ['companyId', 'ASC'],
                ['id', 'ASC'],
            ],
            include: [
                { model: sq.models.company, },
                {
                    model: sq.models.contract, where: {
                        buyCompanyId: _buy_company.id
                    }, required: true
                }
            ]
        });
    },
    make_contract: async function (_buy_company, _sale_company, being_time, end_time, number, customer_code) {
        let sq = db_opt.get_sq();
        let exist_contract = await _buy_company.getBuy_contracts({ where: { saleCompanyId: _sale_company.id } });
        if (exist_contract.length != 0) {
            throw { err_msg: '合同已存在' };
        }
        let new_contract = await sq.models.contract.create({
            sign_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            balance: 0,
            begin_time: being_time,
            end_time: end_time,
            number: number,
            customer_code: customer_code,
        });
        await new_contract.setBuy_company(_buy_company);
        await new_contract.setSale_company(_sale_company);
        return new_contract.toJSON();
    },
    destroy_contract: async function (_contract_id) {
        let sq = db_opt.get_sq();
        let contract = await sq.models.contract.findByPk(_contract_id);
        await contract.removeStuff();
        await contract.destroy();
    },
    update_contract: async function (contract_id, being_time, end_time, number, customer_code) {
        let sq = db_opt.get_sq();
        let contract = await sq.models.contract.findByPk(contract_id);
        contract.begin_time = being_time;
        contract.end_time = end_time;
        contract.number = number;
        contract.customer_code = customer_code;
        await contract.save();
    },
    add_stuff_to_contract: async function (_stuff, _contract) {
        let exist_stuffs = await _contract.getStuff({ where: { id: _stuff.id } });
        if (exist_stuffs.length == 0) {
            await _contract.addStuff(_stuff);
        }
    },
    del_stuff_from_contract: async function (_stuff, _contract) {
        let exist_stuffs = await _contract.getStuff({ where: { id: _stuff.id } });
        if (exist_stuffs.length == 1) {
            await _contract.removeStuff(_stuff);
        }
    },
    contractOutOfDate: function (endDate) {
        let ret = false;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(endDate) && moment(endDate).diff(moment().format('YYYY-MM-DD'), 'days') < 1) {
            ret = true;
        }
        return ret
    },
    get_all_sale_contracts: async function (_compnay, _pageNo, stuff_id) {
        let sq = db_opt.get_sq();
        let conditions = {
            order: [['updatedAt', 'DESC'], ['id', 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            include: [
                { model: sq.models.company, as: 'buy_company' },
                { model: sq.models.stuff, },
                { model: sq.models.rbac_user, }
            ],
        };
        if (stuff_id != undefined) {
            conditions.include[1].where = { id: stuff_id };
            conditions.include[1].required = true;
        }
        let rows = await _compnay.getSale_contracts(conditions);
        let count = await _compnay.countSale_contracts();
        rows.forEach(item => {
            item.company = item.buy_company
            item.expired = this.contractOutOfDate(item.end_time)
        })
        return { rows: rows, count: count };
    },
    get_all_buy_contracts: async function (_compnay, _pageNo) {
        let sq = db_opt.get_sq();
        let conditions = {
            order: [['id', 'ASC']],
            offset: _pageNo * 20,
            limit: 20,
            include: [
                { model: sq.models.company, as: 'sale_company' },
                { model: sq.models.stuff },
            ]
        };
        let rows = await _compnay.getBuy_contracts(conditions);
        let count = await _compnay.countBuy_contracts();
        rows.forEach(item => {
            item.company = item.sale_company
            item.expired = this.contractOutOfDate(item.end_time)
        });
        return { rows: rows, count: count };
    },
    getPlansCount: async function (company, day_offset) {
        let sq = db_opt.get_sq();
        let condition = {
            plan_time: moment().add(day_offset, 'days').format('YYYY-MM-DD'),
            manual_close: false,
            [db_opt.Op.or]: [{
                status: 3,
            }, {
                status: 2,
                checkout_delay: true,
            }],
        };
        let countStuff = [];
        let stuff = await company.getStuff();
        for (let i = 0; i < stuff.length; i++) {
            const stuffItem = stuff[i];
            const stuffName = stuffItem.name;
            condition.stuffId = stuffItem.id;
            let totalCount = await sq.models.plan.sum(
                'count',
                {
                    where: condition,
                    plain: true
                }
            );
            if (stuffItem.second_unit && stuffItem.coefficient > 0) {
                totalCount *= stuffItem.coefficient;
            }
            countStuff.push({
                name: stuffName,
                count: totalCount ? totalCount : 0,
                second_unit: stuffItem.second_unit ? stuffItem.second_unit : '吨',
                second_unit_decimal: stuffItem.second_unit_decimal ? stuffItem.second_unit_decimal : 0
            })
        }
        return countStuff;
    },
    getStatistic: async function (company) {
        let statistic = {};
        let yesterday_result = await this.getPlansCount(company, -1);
        for (let i = 0; i < yesterday_result.length; i++) {
            const item = yesterday_result[i];
            if (!statistic[item.name]) {
                statistic[item.name] = { yesterday_count: 0, today_count: 0, second_unit: '吨', second_unit_decimal : 0 };
            }
            statistic[item.name].yesterday_count = item.count;
            statistic[item.name].second_unit = item.second_unit;
            statistic[item.name].second_unit_decimal = item.second_unit_decimal;

        }

        let today_result = await this.getPlansCount(company, 0);
        for (let i = 0; i < today_result.length; i++) {
            const item = today_result[i];
            if (!statistic[item.name] && item.second_unit) {
                statistic[item.name] = { yesterday_count: 0, today_count: 0, second_unit: '吨', second_unit_decimal : 0 };
            }
            statistic[item.name].today_count = item.count;
            statistic[item.name].second_unit = item.second_unit;
            statistic[item.name].second_unit_decimal = item.second_unit_decimal;
        }

        let resultArray = Object.keys(statistic).map(key => ({
            name: key,
            yesterday_count: statistic[key].yesterday_count,
            today_count: statistic[key].today_count,
            second_unit: statistic[key].second_unit,
            second_unit_decimal : statistic[key].second_unit_decimal
        }));
        return resultArray;
    },
    make_plan_where_condition: function (_condition, search_buy = false) {
        let sq = db_opt.get_sq();
        let where_condition = {
            [db_opt.Op.and]: [
                sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                    [db_opt.Op.gte]: sq.fn('TIMESTAMP', _condition.start_time)
                }),
                sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                    [db_opt.Op.lte]: sq.fn('TIMESTAMP', _condition.end_time)
                }),
            ]
        };
        if (search_buy) {
            where_condition[db_opt.Op.and].push({ is_buy: true });
        }
        else {
            where_condition[db_opt.Op.and].push({ is_buy: false });
        }
        if (_condition.status != undefined) {
            let status_filter = {
                [db_opt.Op.or]: [
                    { status: _condition.status },
                ],
            }
            if (_condition.only_count) {
                if (_condition.status == 2) {
                    status_filter = {
                        status: 2,
                        count: 0,
                    }
                }
                else if (_condition.status == 3) {
                    status_filter[db_opt.Op.or].push({
                        [db_opt.Op.and]: [
                            {
                                status: 2,
                                checkout_delay: true,
                                count: {
                                    [db_opt.Op.gt]: 0
                                }
                            }
                        ]
                    });
                }
            }
            where_condition[db_opt.Op.and].push(status_filter);
        }
        if (_condition.stuff_id != undefined) {
            where_condition[db_opt.Op.and].push({ stuffId: _condition.stuff_id });
        }
        if (_condition.company_id != undefined) {
            where_condition[db_opt.Op.and].push({ companyId: _condition.company_id });
        }
        if (_condition.hide_manual_close) {
            where_condition[db_opt.Op.and].push({ manual_close: false });
        }
        return where_condition;
    },
    replace_plan2archive: async function (_plan) {
        let ret = undefined;
        if (_plan.status == 3) {
            let archive_plan = await _plan.getArchive_plan();
            if (archive_plan) {
                ret = JSON.parse(archive_plan.content);
                ret.stuff.concern_fapiao = _plan.stuff.concern_fapiao;
                ret.fapiao_delivered = _plan.fapiao_delivered;
                ret.extra_info_contents = _plan.extra_info_contents;
            }
        }

        return ret;
    },
    checkDuplicatePlans: async function (current_plan) {
        try {
            let sq = db_opt.get_sq();
            // 查找 plan 表中除了当前 planId 以外的未关闭状态的重复计划
            const empty_plate_vehicle = await sq.models.vehicle.findOne({
                where: {
                    plate: '',
                    is_behind: true
                }
            });
            const duplicatePlan = await sq.models.plan.findOne({
                where: {
                    id: { [db_opt.Op.ne]: current_plan.id },
                    status: { [db_opt.Op.ne]: 3 },
                    [db_opt.Op.or]: [
                        { mainVehicleId: current_plan.main_vehicle.id },
                        {
                            [db_opt.Op.and]: [
                                { behindVehicleId: current_plan.behind_vehicle.id },
                                { behindVehicleId: { [db_opt.Op.ne]: empty_plate_vehicle.id } }
                            ],
                        },
                        { driverId: current_plan.driver.id }
                    ],
                    plan_time: current_plan.plan_time
                },
                include: util_lib.plan_detail_include()
            });

            if (duplicatePlan) {
                // 构建重复提示信息
                let duplicateInfo = '';
                if (duplicatePlan.mainVehicleId === current_plan.main_vehicle.id) {
                    duplicateInfo = `此计划中的主车号 ${current_plan.main_vehicle.plate} 与 ${duplicatePlan.plan_time} 的其他计划重复`;
                } else if (duplicatePlan.behindVehicleId === current_plan.behindVehicleId) {
                    duplicateInfo = `此计划中的挂车号 ${current_plan.behind_vehicle.plate} 与 ${duplicatePlan.plan_time} 的其他计划重复`;
                } else {
                    duplicateInfo = `此计划中的司机手机号 ${current_plan.driver.phone} 与 ${duplicatePlan.plan_time} 的其他计划重复`;
                }
                return {
                    isDuplicate: true,
                    message: `${duplicateInfo},下单方是${duplicatePlan.company.name},接单方是${duplicatePlan.stuff.company.name}。请核对信息!`
                };
            }

            return { isDuplicate: false, message: '' };
        } catch (error) {
            console.error('检查重复计划时发生错误:', error);
            return { isDuplicate: false, message: '' };
        }
    },
    // 通用搜索函数
    searchPlansByModel: async function (model, where_condition, search_condition, replacePlanFn, isUserModel = false) {
        let result = [];
        let count;
        // 根据模型类型选择查询方法
        if (isUserModel) {
            count = await model.countPlans({ where: where_condition });
            if (!search_condition.only_count) {
                let plans = await model.getPlans(search_condition);
                for (const element of plans) {
                    result.push(await this.processPlan(element, replacePlanFn));
                }
            }
        } else {
            let sq = db_opt.get_sq();
            count = await sq.models.plan.count({ where: where_condition });
            if (!search_condition.only_count) {
                let plans = await sq.models.plan.findAll(search_condition);
                for (const element of plans) {
                    result.push(await this.processPlan(element, replacePlanFn));
                }
            }
        }

        return { rows: result, count: count };
    },
    processPlan: async function (element, replacePlanFn) {
        let arc_p = await replacePlanFn(element);
        this.setDuplicateInfoAndCompany(element);
        return arc_p || element;
    },
    setDuplicateInfoAndCompany: function (element) {
        element.duplicateInfo = {
            isDuplicate: element.dup_info && element.dup_info.length > 0,
            message: element.dup_info ? element.dup_info : '',
        };
        if (!element.company) {
            element.company = { name: '(司机选择)' };
        }
    },
    search_bought_plans: async function (user, _pageNo, _condition, is_buy = false) {
        let sq = db_opt.get_sq();
        let where_condition = this.make_plan_where_condition(_condition, is_buy);
        let search_condition = {
            order: [[sq.fn('TIMESTAMP', sq.col('plan_time')), 'DESC'], ['id', 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: util_lib.plan_detail_include(),
        };

        return await this.searchPlansByModel(user, where_condition, search_condition, this.replace_plan2archive.bind(this), true);
    },
    search_sold_plans: async function (_company, _pageNo, _condition, is_buy = false) {
        let sq = db_opt.get_sq();
        let where_condition = this.make_plan_where_condition(_condition, is_buy);

        let stuff_or = [];
        let stuff = await _company.getStuff({ paranoid: false });
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            stuff_or.push({ stuffId: element.id });
        }
        where_condition[db_opt.Op.and].push({
            [db_opt.Op.or]: stuff_or,
        });

        let search_condition = {
            order: [[sq.fn('TIMESTAMP', sq.col('plan_time')), 'DESC'], ['id', 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
            where: where_condition,
            include: util_lib.plan_detail_include(),
        };
        return await this.searchPlansByModel(_company, where_condition, search_condition, this.replace_plan2archive.bind(this), false);
    },
    update_single_plan: async function (_plan_id, _token, _update_data) {
        let sq = db_opt.get_sq();
        let plan = await sq.models.plan.findByPk(_plan_id);

        if (!plan || (plan.enter_time && plan.enter_time.length > 0) || (plan.status == 3)) {
            throw { err_msg: '已进厂,无法修改' };
        }
        if (plan.register_time && plan.register_time.length > 0) {
            throw { err_msg: '车辆已排号,无法修改,建议操作过号后再修改' };
        }
        let company = await plan.getCompany();
        let owner_company = (await util_lib.get_single_plan_by_id(_plan_id)).stuff.company;
        // 判断是否在黑名单中
        if (await this.is_in_blacklist(owner_company.id, _update_data.driver_id, _update_data.main_vehicle_id, _update_data.behind_vehicle_id)) {
            throw { err_msg: '更新计划失败，司机或车辆已被列入黑名单' };
        }
        let opt_company = await rbac_lib.get_company_by_token(_token);
        if ((company && opt_company && company.id == opt_company.id) || (owner_company && opt_company && owner_company.id == opt_company.id)) {
            let change_comment = '';
            if (_update_data.plan_time != undefined) {
                change_comment += '计划时间由' + plan.plan_time + '改为' + _update_data.plan_time + ';\n';
                plan.plan_time = _update_data.plan_time;
            }
            if (_update_data.main_vehicle_id != undefined) {
                let orig_main_vehicle = await plan.getMain_vehicle();
                let new_main_vehicle = await sq.models.vehicle.findByPk(_update_data.main_vehicle_id);
                if (orig_main_vehicle && new_main_vehicle) {
                    change_comment += '主车辆由' + orig_main_vehicle.plate + '改为' + new_main_vehicle.plate + ';\n';
                }
                plan.setMain_vehicle(new_main_vehicle);
            }
            if (_update_data.behind_vehicle_id != undefined) {
                let orig_behind_vehicle = await plan.getBehind_vehicle();
                let new_behind_vehicle = await sq.models.vehicle.findByPk(_update_data.behind_vehicle_id);
                if (orig_behind_vehicle && new_behind_vehicle) {
                    change_comment += '挂车辆由' + orig_behind_vehicle.plate + '改为' + new_behind_vehicle.plate + ';\n';
                }
                plan.setBehind_vehicle(new_behind_vehicle);
            }
            if (_update_data.driver_id != undefined) {
                let orig_driver = await plan.getDriver();
                let new_driver = await sq.models.driver.findByPk(_update_data.driver_id);
                if (orig_driver && new_driver) {
                    change_comment += '司机电话由' + orig_driver.phone + '改为' + new_driver.phone + ';\n';
                }
                plan.setDriver(new_driver);
            }
            if (_update_data.comment != undefined) {
                change_comment += '备注由' + plan.comment + '改为' + _update_data.comment + ';\n';
                plan.comment = _update_data.comment;
            }
            if (_update_data.use_for != undefined) {
                change_comment += '用途由' + plan.use_for + '改为' + _update_data.use_for + ';\n';
                plan.use_for = _update_data.use_for;
            }
            if (_update_data.drop_address != undefined) {
                change_comment += '卸货地址由' + plan.drop_address + '改为' + _update_data.drop_address + ';\n';
                plan.drop_address = _update_data.drop_address;
            }
            if (_update_data.trans_company_name != undefined) {
                change_comment += '承运公司由' + plan.trans_company_name + '改为' + _update_data.trans_company_name + ';\n';
                plan.trans_company_name = _update_data.trans_company_name;
            }
            await plan.save();
            this.mark_dup_info(plan);
            await this.record_plan_history(plan, (await rbac_lib.get_user_by_token(_token)).name, change_comment);
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    authorize_user2contract: async function (_phone, _contract_id, _token) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.add_user(_phone);
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await sq.models.contract.findByPk(_contract_id);
        if (contract && user && company && await company.hasSale_contract(contract)) {
            if (! await contract.hasRbac_user(user)) {
                await contract.addRbac_user(user);
            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    unauthorize_user2contract: async function (_phone, _contract_id, _token) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.add_user(_phone);
        let company = await rbac_lib.get_company_by_token(_token);
        let contract = await sq.models.contract.findByPk(_contract_id);
        if (contract && user && company && await company.hasSale_contract(contract)) {
            if (await contract.hasRbac_user(user)) {
                await contract.removeRbac_user(user);
            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    confirm_single_plan: async function (_plan_id, _token, force = false) {
        await this.action_in_plan(_plan_id, _token, 0, async (plan) => {
            let company_id = 0;
            if (plan.company) {
                company_id = plan.company.id;
            }
            // 开启资质检查
            if (plan.stuff.company.check_qualification) {
                // 只有下单方上传过资质附件，填写过有效期并且有效期没过期时才能确认计划
                let hasValidQualification = plan.company.attachment && plan.company.qualification_expiration_date && new Date(plan.company.qualification_expiration_date) > new Date();
                if (!hasValidQualification) {
                    throw { err_msg: '下单方的资质附件未上传或未填写有效期' };
                }
            }

            let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: company_id } });
            let creator = await plan.getRbac_user();
            if (force || (creator && ((contracts.length == 1 && await contracts[0].hasRbac_user(creator)) || plan.is_buy))) {
                plan.status = 1;
                plan.checkout_delay = plan.stuff.checkout_delay;
                let delegate = undefined;
                if (contracts.length == 1) {
                    delegate = await contracts[0].getDelegate();
                }
                if (delegate) {
                    await plan.setDelegate(delegate);
                }
                await plan.save();
                wx_api_util.send_plan_status_msg(plan);
                await this.rp_history_confirm(plan, (await rbac_lib.get_user_by_token(_token)).name);
                if (!plan.is_buy) {
                    await this.verify_plan_pay(plan);
                }
                else {
                    hook_plan('order_ready', plan);
                }
            }
            else {
                throw { err_msg: plan.company.name + '的报计划人未授权' };
            }
            if (plan.stuff.manual_weight) {
                await this.prepare_sct_value(plan);
            }
        }, force);
    },
    plan_close: async function (plan, name, is_cancel = false, no_need_cast = false) {
        let need_verify_balance = false;
        if (plan.status == 2 && !plan.is_buy) {
            need_verify_balance = true;
        }
        if (plan.status == 3) {
            throw { err_msg: '已关闭,无法再次关闭' };
        }
        if (plan.enter_time && plan.enter_time.length > 0) {
            throw { err_msg: '已进厂,无法关闭' };
        }
        if (plan.status == 2 && plan.count != 0 && plan.checkout_delay) {
            throw { err_msg: '等待下单方确认,无法关闭' };
        }
        if (plan.call_time) {
            await field_lib.handle_cancel_check_in(plan);
        }
        await hook_plan('order_close', plan);
        plan.status = 3;
        plan.manual_close = true;
        await plan.save();
        let buy_company = plan.company;
        if (buy_company && need_verify_balance) {
            let plans = await buy_company.getPlans({ where: { status: 1, is_buy:false } });
            for (let index = 0; index < plans.length; index++) {
                const element = plans[index];
                await this.verify_plan_pay(element)
            }
        }
        if (!no_need_cast) {
            wx_api_util.send_plan_status_msg(plan);
        }
        if (is_cancel) {
            await this.rp_history_cancel(plan, name);
        }
        else {
            await this.rp_history_close(plan, name);
        }
    },
    plan_enter: async function (_plan_id, _token, is_exit = false) {
        let tmp_plan = await util_lib.get_single_plan_by_id(_plan_id);
        let status_req = 2;
        if (tmp_plan && tmp_plan.is_buy) {
            status_req = 1;
        }
        await this.action_in_plan(_plan_id, _token, status_req, async (plan) => {
            if (is_exit) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    await field_lib.handle_cancel_enter(plan);
                    await this.rp_history_exit(plan, (await rbac_lib.get_user_by_token(_token)).name);
                }
                else {
                    throw { err_msg: '未进厂' };
                }
            }
            else {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    throw { err_msg: '已进厂' };
                }
                plan.enter_time = moment().format('YYYY-MM-DD HH:mm:ss');
                await plan.save();
                await this.rp_history_enter(plan, (await rbac_lib.get_user_by_token(_token)).name);
            }
        });
    },
    plan_rollback: async function (_plan_id, _token, msg, for_checkout_rollback = false) {
        await this.action_in_plan(_plan_id, _token, -1, async (plan) => {
            let rollback_content = '';
            if (plan.manual_close) {
                throw { err_msg: '已关闭,无法回退' };
            }
            if (for_checkout_rollback && plan.status == 3) {
                rollback_content = '回退结算';
                if (plan.is_buy) {
                    plan.status = 1;
                }
                else {
                    plan.status = 2;
                    await this.plan_undo_cost(plan);
                }
            } else if (plan.status == 1) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    await this.plan_enter(_plan_id, _token, true);
                    return;
                }
                else {
                    plan.status = 0;
                    rollback_content = '回退确认';
                    if (plan.register_time) {
                        await field_lib.handle_cancel_check_in(plan);
                    }
                }
            } else if (plan.status == 2) {
                if (plan.checkout_delay && plan.count != 0) {
                    plan.count = 0;
                    plan.p_time = '';
                    plan.p_weight = 0;
                    plan.m_time = '';
                    plan.m_weight = 0;
                    rollback_content = '回退发车';
                } else if (plan.enter_time && plan.enter_time.length > 0) {
                    await this.plan_enter(_plan_id, _token, true);
                    return;
                }
                else {
                    plan.status = 1;
                    rollback_content = '回退验款';
                    if (plan.register_time) {
                        await field_lib.handle_cancel_check_in(plan);
                    }
                }
            } else if (plan.status == 3) {
                await this.plan_rollback(plan.id, _token, msg, true);
                if (plan.checkout_delay) {
                    return;
                }
                plan.count = 0;
                plan.p_time = '';
                plan.p_weight = 0;
                plan.m_time = '';
                plan.m_weight = 0;
                rollback_content = '回退发车';
            } else {
                throw { err_msg: '无法回退' };
            }
            rollback_content += ':' + msg;
            await plan.save();
            wx_api_util.send_plan_status_msg(plan)
            await this.record_plan_history(plan, (await rbac_lib.get_user_by_token(_token)).name, rollback_content);
        });
    },
    plan_cost: async function (plan) {
        let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
        if (contracts.length == 1) {
            let contract = contracts[0];
            let decrease_cash = plan.unit_price * plan.count;
            contract.balance -= decrease_cash
            await contract.save();
            await contract.createBalance_history({
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
                operator: '系统',
                comment: '出货扣除',
                cash_increased: -decrease_cash
            });
        }
    },
    plan_undo_cost: async function (plan) {
        let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
        if (contracts.length == 1) {
            let contract = contracts[0];
            let decrease_cash = plan.unit_price * plan.count;
            contract.balance += decrease_cash
            await contract.save();
            await contract.createBalance_history({
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
                operator: '系统',
                comment: '回退出货增加',
                cash_increased: decrease_cash
            });
        }
    },
    verify_plan_pay: async function (_plan) {
        let rl = await mutex.acquire();
        try {
            let plan4next = undefined;
            await db_opt.get_sq().transaction(async (t) => {
                if (_plan.status == 1) {
                    let plan = await util_lib.get_single_plan_by_id(_plan.id);
                    let contracts = await plan.stuff.company.getSale_contracts({ where: { buyCompanyId: plan.company.id } });
                    let cur_balance = 0;
                    if (contracts.length == 1) {
                        cur_balance = contracts[0].balance;
                    }
                    let one_vehicle_cost = plan.stuff.price * plan.stuff.expect_count;
                    let paid_vehicle_count = await plan.company.countPlans({
                        where: {
                            [db_opt.Op.and]: [
                                {
                                    status: 2,
                                },
                                {
                                    stuffId: plan.stuff.id
                                }
                            ]
                        },
                    });
                    let already_verified_cash = one_vehicle_cost * paid_vehicle_count;
                    let arrears = one_vehicle_cost - (cur_balance - already_verified_cash);
                    if (arrears <= 0) {
                        plan.status = 2;
                        plan.arrears = 0;
                        plan.outstanding_vehicles = 0;
                        await plan.save();
                        await this.rp_history_pay(plan, '自动');
                        plan4next = plan;
                    } else {
                        plan.arrears = arrears;
                        plan.outstanding_vehicles = paid_vehicle_count + 1;
                        await plan.save();
                    }
                }
            });
            if (plan4next) {
                wx_api_util.send_plan_status_msg(plan4next);
                hook_plan('order_ready', plan4next);
            }
        } finally {
            rl();
        }

    },
    manual_pay_plan: async function (_plan_id, _token) {
        // 使用数据库事务和行级锁来防止并发问题
        await db_opt.get_sq().transaction(async (t) => {
            // 使用 SELECT FOR UPDATE 获取行级锁
            let plan = await db_opt.get_sq().models.plan.findByPk(_plan_id, {
                lock: t.LOCK.UPDATE,
                transaction: t,
                include: util_lib.plan_detail_include()
            });
            
            if (!plan || !plan.stuff || plan.stuff.company.id != (await rbac_lib.get_company_by_token(_token))?.id) {
                throw { err_msg: '无权限' };
            }
            
            if (plan.status != 1) {
                throw { err_msg: '计划状态错误' };
            }

            if (!plan.is_buy) {
                plan.status = 2;
                await plan.save({ transaction: t });
                await this.rp_history_pay(plan, (await rbac_lib.get_user_by_token(_token)).name, t);
                hook_plan('order_ready', plan);
            }
        });

        let plan = await util_lib.get_single_plan_by_id(_plan_id);
        if (plan && !plan.is_buy) {
            wx_api_util.send_plan_status_msg(plan);
        }
    },
    dup_plan: async function (plan, token) {
        let sq = db_opt.get_sq();
        let new_plan_req = {
            plan_time: moment().format('YYYY-MM-DD'),
            comment: plan.comment,
            use_for: plan.use_for,
        };
        let new_plan = await sq.models.plan.create(new_plan_req);
        await new_plan.setCompany(plan.company);
        await new_plan.setStuff(plan.stuff);
        await new_plan.setDriver(plan.driver);
        await new_plan.setMain_vehicle(plan.main_vehicle);
        await new_plan.setBehind_vehicle(plan.behind_vehicle);
        await new_plan.setRbac_user(plan.rbac_user);
        await this.rp_history_create(new_plan, "自动");
        new_plan.unit_price = plan.unit_price
        new_plan.status = 0;
        new_plan.is_repeat = plan.is_repeat;
        new_plan.is_proxy = plan.is_proxy;
        new_plan.is_buy = plan.is_buy
        new_plan.trans_company_name = plan.trans_company_name;
        await new_plan.save();
        await this.confirm_single_plan(new_plan.id, token, true);
    },
    generate_ticket_no: async function (plan, external_ticket_no) {
        let ret = '';
        if (external_ticket_no && external_ticket_no.length > 0 && !plan.stuff.ticket_prefix) {
            ret = external_ticket_no;
        }
        else {
            let add_base = 'day';
            if (plan.stuff.add_base) {
                add_base = plan.stuff.add_base;
            }
            const prefix = plan.stuff.ticket_prefix ? plan.stuff.ticket_prefix : 'TK';
            const date = moment().format('YYYYMMDD');
            let vehicle_count = await plan.stuff.countPlans({
                where: {
                    ticket_no: {
                        [db_opt.Op.ne]: null
                    },
                    count: {
                        [db_opt.Op.ne]: 0
                    },
                    [db_opt.Op.or]: [
                        {
                            m_time: {
                                [db_opt.Op.gte]: moment().startOf(add_base).format('YYYY-MM-DD HH:mm:ss'),
                                [db_opt.Op.lte]: moment().endOf(add_base).format('YYYY-MM-DD HH:mm:ss')
                            }
                        },
                        {
                            p_time: {
                                [db_opt.Op.gte]: moment().startOf(add_base).format('YYYY-MM-DD HH:mm:ss'),
                                [db_opt.Op.lte]: moment().endOf(add_base).format('YYYY-MM-DD HH:mm:ss')
                            }
                        }
                    ]
                }
            });
            cur_day_no = vehicle_count + 1;
            const countStr = cur_day_no ? cur_day_no.toString().padStart(4, '0') : '0000';
            ret = `${prefix}${date}${countStr}`;
        }
        return ret;
    },
    deliver_plan: async function (_plan_id, _token, _count, p_weight, m_weight, p_time, m_time, ticket_no, seal_no) {
        // 使用数据库事务和行级锁来防止并发问题
        await db_opt.get_sq().transaction(async (t) => {
            // 使用 SELECT FOR UPDATE 获取行级锁
            let plan = await db_opt.get_sq().models.plan.findByPk(_plan_id, {
                lock: t.LOCK.UPDATE,
                transaction: t,
                include: util_lib.plan_detail_include()
            });
            
            if (!plan || !plan.stuff || plan.stuff.company.id != (await rbac_lib.get_company_by_token(_token))?.id) {
                throw { err_msg: '无权限' };
            }
            
            if (plan.status != (plan.is_buy ? 1 : 2)) {
                throw { err_msg: '计划状态错误' };
            }

            plan.count = _count;
            plan.p_time = (p_time ? p_time : moment().format('YYYY-MM-DD HH:mm:ss'));
            plan.p_weight = p_weight;
            plan.m_time = (m_time ? m_time : moment().format('YYYY-MM-DD HH:mm:ss'));
            plan.m_weight = m_weight;
            if (seal_no) {
                plan.seal_no = seal_no;
            }
            await plan.save({ transaction: t });
            await this.rp_history_deliver(plan, (await rbac_lib.get_user_by_token(_token)).name, ticket_no, t);
            
            if (!plan.checkout_delay) {
                await this.close_a_plan(plan, _token, t);
            }
        });
    },
    manual_deliver_plan: async function (_plan, _token) {
        await this.rp_history_deliver(_plan, (await rbac_lib.get_user_by_token(_token)).name, "");
        if (!_plan.checkout_delay) {
            await this.close_a_plan(_plan, _token);
        }
    },
    checkout_plan: async function (_plan_id, token) {
        await this.action_in_plan(_plan_id, token, 2, async (plan) => {
            if (plan.checkout_delay && plan.status == 2 && plan.count != 0) {
                await this.close_a_plan(plan, token);
            }
            else {
                throw { err_msg: '无法结算' };
            }
        }, true);
    },
    action_in_plan: async function (_plan_id, _token, _expect_status, _action, force = false) {
        let plan = await util_lib.get_single_plan_by_id(_plan_id);
        if (force) {
            await _action(plan);
        }
        else {
            let opt_company = await rbac_lib.get_company_by_token(_token);
            if (plan) {
                let stuff = plan.stuff;
                if (stuff) {
                    let company = stuff.company;
                    if (company && opt_company && opt_company.id == company.id) {
                        if (-1 == _expect_status || plan.status == _expect_status) {
                            await _action(plan);
                        }
                        else {
                            throw { err_msg: '计划状态错误' };
                        }
                    }
                    else {
                        throw { err_msg: '无权限' };
                    }
                }
                else {
                    throw { err_msg: '未找到货物' };
                }
            }
            else {
                throw { err_msg: '未找到计划' };
            }
        }
        this.mark_dup_info(plan);
    },
    mark_dup_info: function (plan) {
        setTimeout(() => {
            this.checkDuplicatePlans(plan).then((resp) => {
                plan.dup_info = resp.message;
                plan.save();
            })
        }, 500);
    },
    record_plan_history: async function (_plan, _operator, _action_type, _transation) {
        await _plan.createPlan_history({ time: moment().format('YYYY-MM-DD HH:mm:ss'), operator: _operator, action_type: _action_type }, _transation);
    },
    rp_history_create: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '创建');
    },
    rp_history_confirm: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '确认');
    },
    rp_history_pay: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '验款');
    },
    rp_history_enter: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '进厂');
    },
    rp_history_exit: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '撤销进厂');
    },
    rp_history_deliver: async function (_plan, _operator, _ticket_no) {
        if (_plan.count > 0) {
            _plan.ticket_no = await this.generate_ticket_no(_plan, _ticket_no);
            await _plan.save();
        }
        await wx_api_util.plan_scale_msg(_plan);
        await this.record_plan_history(_plan, _operator, '发车');
    },
    rp_history_checkout: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '结算');
        let plan = await util_lib.get_single_plan_by_id(_plan.id);
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        let content = plan.toJSON();
        content.sc_info = (await sc_lib.get_sc_status_by_plan(plan)).reqs;
        content.fc_info = (await fc_lib.get_all_fc_plan_table(plan));
        await plan.createArchive_plan({ content: JSON.stringify(content) });
    },
    rp_history_close: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '关闭');
        let plan = await util_lib.get_single_plan_by_id(_plan.id);
        await this.updateArchivePlan(plan);
    },
    updateArchivePlan: async function (plan) {
        let last_archive = await plan.getArchive_plan();
        if (last_archive) {
            await last_archive.destroy();
        }
        let content = plan.toJSON();
        content.sc_info = (await sc_lib.get_sc_status_by_plan(plan)).reqs;
        if (!content.company) {
            content.company = { name: '(司机选择)' };
        }
        await plan.createArchive_plan({ content: JSON.stringify(content) });
    },
    rp_history_cancel: async function (_plan, _operator) {
        await this.record_plan_history(_plan, _operator, '取消');
        let plan = await util_lib.get_single_plan_by_id(_plan.id);
        await this.updateArchivePlan(plan);
    },
    rp_history_price_change: async function (_plan, _operator, _new_price) {
        await this.record_plan_history(_plan, _operator, '价格变为:' + _new_price);
    },

    pri_change_stuff_price: async function (stuff, _new_price, _comment, _operator, _to_plan) {
        stuff.price = _new_price;
        await stuff.save();
        await stuff.createPrice_history(
            {
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
                operator: _operator,
                comment: _comment,
                new_price: _new_price
            });
        if (_to_plan) {
            let plans = await stuff.getPlans({
                where: {
                    status: {
                        [db_opt.Op.ne]: 3
                    },
                    biddingItemId: null,
                }
            });
            for (let index = 0; index < plans.length; index++) {
                const element = plans[index];
                element.unit_price = _new_price;
                await element.save();
                await this.rp_history_price_change(element, _operator, _new_price);
            }
        }
    },

    change_stuff_price: async function (_stuff_id, _token, _new_price, _to_plan, _comment) {
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(_token);
        let stuff = await sq.models.stuff.findByPk(_stuff_id);
        if (company && stuff && await company.hasStuff(stuff)) {
            await this.pri_change_stuff_price(stuff, _new_price, _comment, (await rbac_lib.get_user_by_token(_token)).name, _to_plan);
        }
        else {
            throw { err_msg: '无权限' };
        }
    },

    get_price_history: async function (_stuff_id, _token, _pageNo) {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(_stuff_id);
        let company = await rbac_lib.get_company_by_token(_token);
        let conditions = {
            order: [['id', 'DESC']],
            offset: _pageNo * 20,
            limit: 20,
        };
        if (!stuff || !company || !await company.hasStuff(stuff)) {
            throw { err_msg: '未找到货物' };
        }

        let rows = await stuff.getPrice_histories(conditions);
        let count = await stuff.countPrice_histories();
        return { rows: rows, count: count };
    },

    get_self_vehicle_pairs: async function (token, pageNo) {
        let rows = [];
        let company = await rbac_lib.get_company_by_token(token);
        let result = await company.getPlans({
            group: ['mainVehicleId', 'behindVehicleId', 'driverId'],
            offset: 20 * pageNo,
            limit: 20,
        });
        for (let index = 0; index < result.length; index++) {
            const element = result[index];
            let tmp = {};
            let main_vehicle = await element.getMain_vehicle()
            let behind_vehicle = await element.getBehind_vehicle();
            let driver = await element.getDriver();
            if (main_vehicle && behind_vehicle && driver) {
                tmp.driver_phone = driver.phone;
                tmp.main_vehicle_plate = main_vehicle.plate;
                tmp.behind_vehicle_plate = behind_vehicle.plate;
                tmp.driver_name = driver.name;
                rows.push(tmp);
            }
        }
        return { rows: rows, count: rows.length };
    },
    verify_plan_location: async function (plan, lat, lon) {
        let pos_lat = plan.stuff.company.pos_lat;
        let pos_lon = plan.stuff.company.pos_lon;
        let distance_limit = plan.stuff.company.distance_limit;
        if (distance_limit == 0) {
            return true;
        }
        // 将度数转换为弧度
        let deg2rad = function (deg) {
            return deg * (Math.PI / 180)
        }

        let R = 6371; // 地球半径，单位：公里
        let dLat = deg2rad(pos_lat - lat);
        let dLon = deg2rad(pos_lon - lon);
        let a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat)) * Math.cos(deg2rad(pos_lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let distance = R * c; // 距离，单位：公里

        // 检查距离是否在限制范围内
        return distance <= distance_limit;
    },
    get_wait_count: async function (plan) {
        let ret = 0;
        let stuff = await plan.getStuff();
        let sq = db_opt.get_sq();
        if (stuff) {
            ret = await stuff.countPlans({
                where: {
                    [db_opt.Op.and]: [
                        { call_time: null },
                        { register_time: { [db_opt.Op.ne]: null } },
                        { status: { [db_opt.Op.ne]: 3 } },
                        sq.where(sq.fn('TIMESTAMP', sq.col('register_time')), {
                            [db_opt.Op.lt]: sq.fn('TIMESTAMP', plan.register_time)
                        }),
                    ],
                }
            })
        }
        return ret;
    },
    get_wait_que: async function (pageNo, token, include_license = false, only_show_uncalled = false) {
        let sq = db_opt.get_sq();
        let stuff_array = [0];
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            let tmp = await company.getStuff();
            for (let index = 0; index < tmp.length; index++) {
                const element = tmp[index];
                stuff_array.push(element.id);
            }
        }
        let cond = {
            [db_opt.Op.and]: [
                { status: { [db_opt.Op.ne]: 3 } },
                { count: 0 },
                {
                    stuffId: {
                        [db_opt.Op.in]: stuff_array
                    }
                }
            ],
        };
        if (!include_license) {
            cond[db_opt.Op.and].push(
                { register_time: { [db_opt.Op.ne]: null } },
            );
        }
        if (only_show_uncalled) {
            cond[db_opt.Op.and].push(
                { call_time: null },
            );
        }
        let plans = await sq.models.plan.findAll({
            where: cond,
            order: [
                [sq.literal('register_time IS NULL'), 'ASC'], // 有 register_time 的记录排在前面
                [sq.fn('TIMESTAMP', sq.col('register_time')), 'ASC'], // 按 register_time 升序排列
                ['id', 'DESC'] // 按 id 降序排列
            ],
            offset: pageNo * 20,
            limit: 20,
            include: util_lib.plan_detail_include(),
        });
        let count = await sq.models.plan.count({
            where: cond,
        });
        for (let index = 0; index < plans.length; index++) {
            const element = plans[index];
            if (!element.stuff.manual_weight) {
                element.p_weight = await hook_plan('get_p_weight', element);
            }
        }
        return { rows: plans, count: count };
    },
    check_if_never_checkin: async function (driver) {
        let ret = false;
        let checkin_count = await driver.countPlans({
            where: {
                [db_opt.Op.and]: [
                    { status: { [db_opt.Op.ne]: 3 } },
                    { count: 0 },
                    { register_time: { [db_opt.Op.ne]: null } },
                ],
            }
        });
        if (checkin_count == 0) {
            ret = true;
        }
        return ret;
    },
    batch_confirm: async function (body, token, is_buy = false) {
        let err_msg = '';
        await db_opt.get_sq().transaction(async (t) => {
            let company = await rbac_lib.get_company_by_token(token);
            let all_plans = [];
            let pageNo = 0;
            while (true) {
                let tmp = await this.search_sold_plans(company, pageNo, body, is_buy);
                all_plans = all_plans.concat(tmp.rows);
                pageNo++;
                if (tmp.rows.length <= 0) {
                    break;
                }
            }
            for (let index = 0; index < all_plans.length; index++) {
                const element = all_plans[index];
                try {
                    await this.confirm_single_plan(element.id, token);
                } catch (error) {
                    err_msg += error.err_msg + '\n';
                    throw error;
                }
            }
        });
        return err_msg;
    },
    batch_copy: async function (body, token, is_buy, new_plan_req) {
        let err_msg = '';
        await db_opt.get_sq().transaction(async (t) => {
            let user = await rbac_lib.get_user_by_token(token);
            let all_plans = [];
            let pageNo = 0;
            while (true) {
                let tmp = await this.search_bought_plans(user, pageNo, body, is_buy);
                all_plans = all_plans.concat(tmp.rows);
                pageNo++;
                if (tmp.rows.length <= 0) {
                    break;
                }
            }
            for (let index = 0; index < all_plans.length; index++) {
                const element = all_plans[index];
                try {
                    let new_plan = await db_opt.get_sq().models.plan.create(new_plan_req);
                    await new_plan.setCompany(await db_opt.get_sq().models.company.findByPk(element.company.id));
                    await new_plan.setStuff(await db_opt.get_sq().models.stuff.findByPk(element.stuff.id));
                    await new_plan.setDriver(await db_opt.get_sq().models.driver.findByPk(element.driver.id));
                    await new_plan.setMain_vehicle(await db_opt.get_sq().models.vehicle.findByPk(element.main_vehicle.id));
                    await new_plan.setBehind_vehicle(await db_opt.get_sq().models.vehicle.findByPk(element.behind_vehicle.id));
                    await new_plan.setRbac_user(user);
                    await this.rp_history_create(new_plan, user.name);
                    new_plan.status = 0;
                    if (!is_buy) {
                        new_plan.unit_price = element.unit_price;
                    }
                    new_plan.is_buy = is_buy;
                    new_plan.trans_company_name = element.trans_company_name;
                    await new_plan.save();
                    await wx_api_util.send_plan_status_msg(await util_lib.get_single_plan_by_id(new_plan.id));
                } catch (error) {
                    err_msg += error.err_msg + '\n';
                    throw error;
                }
            }
        });
        return err_msg;
    },
    plan_call_vehicle: async function (plan_id, token) {
        await this.action_in_plan(plan_id, token, -1, async (plan) => {
            let expect_status = 2;
            if (plan.is_buy) {
                expect_status = 1;
            }
            if (expect_status != plan.status) {
                throw { err_msg: '计划状态错误' };
            }
            if (plan.register_time && plan.register_time.length > 0) {
                if (plan.enter_time && plan.enter_time.length > 0) {
                    throw { err_msg: '已经进厂' };
                }
                await field_lib.handle_call_vehicle(plan);
            }
            else {
                throw { err_msg: '未签到' };
            }
        });
    },
    buildTimeCondition(body, sq) {
        let conditions = [];
        
        if (body.m_start_time && body.m_end_time) {
            conditions = [{
                [db_opt.Op.or]: [
                    {
                        [db_opt.Op.and]: [
                            sq.where(sq.fn('TIMESTAMP', sq.col('m_time')), {
                                [db_opt.Op.gte]: sq.fn('TIMESTAMP', body.m_start_time)
                            }),
                            sq.where(sq.fn('TIMESTAMP', sq.col('m_time')), {
                                [db_opt.Op.lte]: sq.fn('TIMESTAMP', body.m_end_time)
                            }),
                        ]
                    },
                    {
                        [db_opt.Op.and]: [
                            sq.where(sq.fn('TIMESTAMP', sq.col('p_time')), {
                                [db_opt.Op.gte]: sq.fn('TIMESTAMP', body.m_start_time)
                            }),
                            sq.where(sq.fn('TIMESTAMP', sq.col('p_time')), {
                                [db_opt.Op.lte]: sq.fn('TIMESTAMP', body.m_end_time)
                            })
                        ]
                    }
                ]
            }];
        } else {
            conditions = [
                sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                    [db_opt.Op.gte]: sq.fn('TIMESTAMP', body.start_time)
                }),
                sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                    [db_opt.Op.lte]: sq.fn('TIMESTAMP', body.end_time)
                }),
            ];
        }
        
        return conditions;
    },
    filter_plan4user: async function (body, token, is_buy = false) {
        let sq = db_opt.get_sq();
        let cond = {
            [db_opt.Op.and]: this.buildTimeCondition(body, sq),
        };
        let order = this.default_export_sort(sq);
        if (is_buy) {
            cond.is_buy = true;
        }
        else {
            cond.is_buy = false;
        }
        if (body.only_finished) {
            cond.status = 3;
            cond.manual_close = false;
        }
        let user = await rbac_lib.get_user_by_token(token);

        return await user.getPlans({ where: cond, order: order, include: util_lib.plan_detail_include() });
    },
    default_export_sort: function (sq) {
        const order = [
            [sq.fn('TIMESTAMP', sq.col('plan_time')), 'ASC'],
            ['ticket_no', 'ASC'],
            [sq.fn('TIMESTAMP', sq.col('m_time')), 'ASC'],
            [sq.fn('TIMESTAMP', sq.col('p_time')), 'ASC']
        ];
        return order;
    },
    filter_plan4manager: async function (body, token, is_buy = false) {
        let sq = db_opt.get_sq();
        let cond = {
            [db_opt.Op.and]: this.buildTimeCondition(body, sq),
        };
        let order = this.default_export_sort(sq);
        if (body.stuff_id) {
            cond.stuffId = body.stuff_id
        }
        else {
            let company = await rbac_lib.get_company_by_token(token);
            let stuff = await company.getStuff();
            let stuff_array = [];
            for (let index = 0; index < stuff.length; index++) {
                const element = stuff[index];
                stuff_array.push(element.id);
            }
            cond.stuffId = {
                [db_opt.Op.or]: stuff_array
            }
        }
        if (body.company_id) {
            cond.companyId = body.company_id
        }
        if (body.only_finished) {
            cond.status = 3;
            cond.manual_close = false;
        }
        if (is_buy) {
            cond.is_buy = true;
        }
        else {
            cond.is_buy = false;
        }

        return await sq.models.plan.findAll({ where: cond, order: order, include: util_lib.plan_detail_include() });
    },
    place_hold: function (input, holder) {
        if (input == undefined) {
            return holder
        }
        else {
            return input
        }
    },
    make_file_by_plans: async function (plans) {
        let json = [];
        let unifiedDecimalPlaces = 2;
        let totalOrders = 0;
        let totalLoad = 0;
        let totalPriceSum = 0;
        for (let index = 0; index < plans.length; index++) {
            const element = plans[index];
            const dp = element.stuff?.second_unit_decimal ?? 2;
            if (dp > unifiedDecimalPlaces) {
                unifiedDecimalPlaces = dp;
            }
            const countVal = this.place_hold(element.count, 0);
            const unitPriceVal = this.place_hold(element.unit_price, 0);
            const totalPriceVal = unitPriceVal * countVal;

            totalOrders++;
            totalLoad += countVal;
            totalPriceSum += totalPriceVal;
            json.push({
                create_company: this.place_hold(element.company, { name: '(司机选择)' }).name,
                accept_company: element.stuff.company.name,
                stuff_name: element.stuff.name,
                plan_time: element.plan_time,
                ticket_no: element.ticket_no,
                m_time: element.m_time,
                p_time: element.p_time,
                mv: (element.main_vehicle ? element.main_vehicle.plate : ''),
                bv: (element.behind_vehicle ? element.behind_vehicle.plate : ''),
                driver_name: element.driver.name,
                driver_phone: element.driver.phone,
                p_weight: this.place_hold(element.p_weight, 0),
                m_weight: this.place_hold(element.m_weight, 0),
                count: this.place_hold(element.count),
                unit_price: element.unit_price,
                total_price: this.place_hold(element.unit_price, 0) * this.place_hold(element.count, 0),
                seal_no: element.seal_no,
                drop_address: element.drop_address,
                fapiao_delivered: element.fapiao_delivered ? '是' : '否',
                comment: element.comment,
                delegate: element.delegate ? element.delegate.name : '',
                subsidy_price: this.place_hold(element.subsidy_price, 0),
                subsidy_total_price: this.place_hold(element.subsidy_price, 0) * this.place_hold(element.count, 0),
                subsidy_discount: (this.place_hold(element.subsidy_price, element.unit_price) / element.unit_price * 10).toFixed(1),
                second_unit: this.place_hold(element.stuff.second_unit, ''),
                drop_take_zone_name:element.drop_take_zone_name,
                second_value: (() => {
                    const coefficient = this.place_hold(element.stuff.coefficient, 2);
                    const value = coefficient * element.count;
                    if (!element.stuff.second_unit) {
                        return value.toFixed(2);
                    }
                    return value.toFixed(dp);
                })(),
                plan_counts:countVal,
                total_orders: totalOrders,
            });
        }
        let columns = [{
            header: '下单公司',
            key: 'create_company',
        }, {
            header: '接单公司',
            key: 'accept_company',
        }, {
            header: '计划时间',
            key: 'plan_time',
        }, {
            header: '过皮时间',
            key: 'p_time',
        }, {
            header: '过毛时间',
            key: 'm_time',
        }, {
            header: '主车号',
            key: 'mv',
        }, {
            header: '挂车号',
            key: 'bv',
        }, {
            header: '司机姓名',
            key: 'driver_name',
        }, {
            header: '司机电话',
            key: 'driver_phone',
        }, {
            header: '皮重',
            key: 'p_weight',
        }, {
            header: '毛重',
            key: 'm_weight',
        }, {
            header: '装车量',
            key: 'count',
        }, {
            header: '单价',
            key: 'unit_price',
        }, {
            header: '总价',
            key: 'total_price',
        }, {
            header: '铅封号',
            key: 'seal_no',
        }, {
            header: '磅单号',
            key: 'ticket_no',
        }, {
            header: '物料名',
            key: 'stuff_name',
        }, {
            header: '卸货地址',
            key: 'drop_address',
        }, {
            header: '发票已开?',
            key: 'fapiao_delivered',
        }, {
            header: '备注',
            key: 'comment',
        }, {
            header: '装卸区域',
            key: 'drop_take_zone_name'
        }, {
            header: '代理公司',
            key: 'delegate'
        }, {
            header: '打折后单价',
            key: 'subsidy_price'
        }, {
            header: '打折后总价',
            key: 'subsidy_total_price'
        }, {
            header: '打折数',
            key: 'subsidy_discount'
        }, {
            header: '第二单位',
            key: 'second_unit'
        }, {
            header: '第二单位装卸量',
            key: 'second_value'
        }];
        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('Plans');
        worksheet.columns = columns;
        worksheet.addRows(json);
        worksheet.addRow({
            create_company: `合计:共${totalOrders}单`,
            count: totalLoad, 
            total_price: totalPriceSum, 
        })
        const lastRow = worksheet.lastRow;
        lastRow.font = { bold: true, color: { argb: 'FFFF0000' }, }; 
        lastRow.getCell('count').numFmt = '0.00';
        lastRow.getCell('total_price').numFmt = '0.00';
        worksheet.getColumn('p_weight').numFmt = '0.00';
        worksheet.getColumn('m_weight').numFmt = '0.00';
        worksheet.getColumn('count').numFmt = '0.00';
        worksheet.getColumn('unit_price').numFmt = '0.00';
        worksheet.getColumn('total_price').numFmt = '0.00';
        worksheet.getColumn('second_value').numFmt = `0.${'0'.repeat(unifiedDecimalPlaces)}`;

        let file_name = '/uploads/plans' + uuid.v4() + '.xlsx';
        await workbook.xlsx.writeFile('/database' + file_name);
        return file_name;
    },
    make_exe_rate_file: async function (body, token) {
        let plans = await this.filter_plan4manager(body, token, false);
        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('执行率');
        let er = [];
        let plan_is_confirmd = (plan) => {
            let ret = false;
            for (let index = 0; index < plan.plan_histories.length; index++) {
                const element = plan.plan_histories[index];
                if (element.action_type == '确认') {
                    ret = true;
                    break;
                }
            }
            return ret;
        };
        let plan_is_finish = (plan) => {
            return plan.count > 0;
        }
        let find_er_node = (date) => {
            let ret = undefined;
            for (let index = 0; index < er.length; index++) {
                const element = er[index];
                if (element.plan_time == date) {
                    ret = element;
                    break;
                }
            }
            return ret;
        };
        let total_company = [];
        let company_exist = (company_name) => {
            let ret = false;
            for (let index = 0; index < total_company.length; index++) {
                const element = total_company[index];
                if (element == company_name) {
                    ret = true;
                    break;
                }
            }
            return ret;
        };
        plans.forEach(ele => {
            let target_node = find_er_node(ele.plan_time);
            if (!target_node) {
                target_node = { plan_time: ele.plan_time };
                er.push(target_node);
            }
            if (company_exist(ele.company.name) == false) {
                total_company.push(ele.company.name);
            }
            if (target_node[ele.company.name + 'confirm'] == undefined) {
                target_node[ele.company.name + 'confirm'] = 0;
                target_node[ele.company.name + 'finish'] = 0;
                target_node[ele.company.name + 'rate'] = 0;
            }
            if (plan_is_confirmd(ele)) {
                target_node[ele.company.name + 'confirm']++;
            }
            if (plan_is_finish(ele)) {
                target_node[ele.company.name + 'finish']++;
            }
            if (target_node[ele.company.name + 'confirm'] > 0) {
                target_node[ele.company.name + 'rate'] = ((target_node[ele.company.name + 'finish'] / target_node[ele.company.name + 'confirm']) * 100).toFixed(2) + '%';
            }
        });
        let top_er = { plan_time: '' };
        let columns = [{
            header: '日期',
            key: 'plan_time',
        }];
        total_company.forEach(ele => {
            columns.push({
                header: ele,
                key: ele + 'confirm',
            });
            top_er[ele + 'confirm'] = '计划数';
            columns.push({
                header: ele,
                key: ele + 'finish',
            });
            top_er[ele + 'finish'] = '完成数';
            columns.push({
                header: ele,
                key: ele + 'rate',
            });
            top_er[ele + 'rate'] = '执行率';
        });
        worksheet.columns = columns;
        er.unshift(top_er);
        worksheet.addRows(er);
        for (let index = 0; index < total_company.length; index++) {
            worksheet.mergeCells(1, index * 3 + 2, 1, index * 3 + 4);
        }
        let file_name = '/uploads/rates' + uuid.v4() + '.xlsx';
        await workbook.xlsx.writeFile('/database' + file_name);
        return file_name;
    },
    auto_close_plan: async function () {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findAll({ where: { close_time: { [db_opt.Op.ne]: null } } });
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            let close_time = element.close_time;
            let delay_days = element.delay_days;
            if (!delay_days) {
                delay_days = 0;
            }
            if (close_time.length > 0) {
                let expired_day = moment().subtract(1 + delay_days, 'days').format('YYYY-MM-DD');
                if (element.close_today) {
                    expired_day = moment().subtract(delay_days, 'days').format('YYYY-MM-DD');
                }
                if (moment().isAfter(moment(close_time, 'HH:mm'))) {
                    let plans = await element.getPlans({
                        where: {
                            [db_opt.Op.and]: [
                                { status: { [db_opt.Op.ne]: 3 } },
                                sq.where(sq.fn('TIMESTAMP', sq.col('plan_time')), {
                                    [db_opt.Op.lte]: sq.fn('TIMESTAMP', expired_day)
                                }),
                            ]
                        }
                    })
                    for (let index = 0; index < plans.length; index++) {
                        try {
                            let plan = await util_lib.get_single_plan_by_id(plans[index].id);
                            await this.plan_close(plan, '过期自动删除', false, true);
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
            }
        }
    },
    add_vehicle_team: async function (name, token) {
        let user = await rbac_lib.get_user_by_token(token);
        let er = await user.getVehicle_teams({ where: { name: name } });
        if (er.length == 1) {
            throw { err_msg: '已存在' };
        }
        else {
            await user.createVehicle_team({ name: name });
        }
    },
    del_vehicle_team: async function (id, token) {
        let user = await rbac_lib.get_user_by_token(token);
        let er = await user.getVehicle_teams({ where: { id: id } });
        if (er.length == 1) {
            await er[0].destroy();
        }
        else {
            throw { err_msg: '未找到' };
        }
    },
    add_set2team: async function (mv_plate, bv_plate, dr_name, dr_phone, dr_idcard, vt_id, token) {
        let user = await rbac_lib.get_user_by_token(token);
        let vts = await user.getVehicle_teams({ where: { id: vt_id } });
        if (vts.length != 1) {
            throw { err_msg: '未找到车队' };
        }
        let vt = vts[0]
        let mv = await this.fetch_vehicle(mv_plate)
        let bv = await this.fetch_vehicle(bv_plate, true)
        let dr = await this.fetch_driver(dr_name, dr_phone, dr_idcard);
        let er = await vt.getVehicle_sets({ where: { mainVehicleId: mv.id } });
        if (er.length > 0) {
            throw { err_msg: '主车已存在' };
        }
        await vt.createVehicle_set({
            mainVehicleId: mv.id,
            behindVehicleId: bv.id,
            driverId: dr.id
        });
    },
    del_set_from_team: async function (set_id, vt_id, token) {
        let user = await rbac_lib.get_user_by_token(token);
        let vts = await user.getVehicle_teams({ where: { id: vt_id } });
        if (vts.length != 1) {
            throw { err_msg: '未找到车队' };
        }
        let vt = vts[0]
        let sets = await vt.getVehicle_sets({ where: { id: set_id } });
        if (sets.length != 1) {
            throw { err_msg: '未找到车辆' };
        }
        await sets[0].destroy();
    },
    get_all_vehicle_team: async function (token, pageNo) {
        let user = await rbac_lib.get_user_by_token(token);
        let resp = await user.getVehicle_teams({
            offset: pageNo * 20, limit: 20,
            include: [{
                model: db_opt.get_sq().models.vehicle_set,
                include: [
                    { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
                    { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
                    { model: db_opt.get_sq().models.driver, paranoid: false }
                ]
            }]
        });
        let total = await user.countVehicle_teams();

        return {
            rows: resp,
            count: total
        }
    },
    stuff_price_timeout: async function () {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findAll({
            where: {
                change_last_minutes: {
                    [db_opt.Op.ne]: 0,
                }
            }
        });
        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            element.change_last_minutes--;
            if (element.change_last_minutes <= 0) {
                let company = await element.getCompany();
                await this.pri_change_stuff_price(element, element.next_price, '定时调价:' + element.next_comment, element.next_operator, company.price_impact_plan);
                element.next_price = 0;
                element.next_comment = '';
                element.next_operator = '';
                element.change_last_minutes = 0;
            }
            await element.save();
        }
    },
    set_fapiao_delivered: async function (plan_id, token, delivered) {
        await this.action_in_plan(plan_id, token, -1, async (plan) => {
            if (plan.status == 0) {
                throw { err_msg: '计划需要先未确认' };
            }
            plan.fapiao_delivered = delivered;
            await plan.save();
            await this.record_plan_history()
        });
    },
    is_in_blacklist: async function (companyId, driverId, mainVehicleId, behindVehicleId) {
        let blacklist = await db_opt.get_sq().models.blacklist.findOne({
            where: {
                companyId: companyId,
                [db_opt.Op.or]: [
                    { driverId: { [db_opt.Op.eq]: driverId } },
                    { vehicleId: { [db_opt.Op.eq]: mainVehicleId } },
                    { vehicleId: { [db_opt.Op.eq]: behindVehicleId } }
                ]
            }
        });
        return blacklist != null;
    },
    prepare_sct_value: async function (plan) {
        let sq = db_opt.get_sq();
        let all_ssi = await plan.stuff.getSct_scale_items({ order: [['id', 'ASC']] });
        for (let index = 0; index < all_ssi.length; index++) {
            const element = all_ssi[index];
            let sct_info = await plan.getPlan_sct_infos({ where: { sctScaleItemId: element.id } });
            if (sct_info.length == 0) {
                let new_psi = await sq.models.plan_sct_info.create({ value: '' });
                await new_psi.setPlan(plan);
                await new_psi.setSct_scale_item(element);
            }
        }
    },
    walk_through2checkout: async function () {
        let sq = db_opt.get_sq();
        let now_time = moment().format('HH:mm:ss');
        let now_date = moment().format('YYYY-MM-DD');
        let stuff = await sq.models.stuff.findAll({
            where: {
                delay_checkout_time: {
                    [db_opt.Op.lt]: now_time
                },
                last_delay_checkout: {
                    [db_opt.Op.or]: [
                        { [db_opt.Op.eq]: null },
                        { [db_opt.Op.ne]: now_date }
                    ],
                },
                checkout_delay: true,
            }
        });

        for (let index = 0; index < stuff.length; index++) {
            const element = stuff[index];
            try {
                await sq.transaction(async (t) => {
                    let company = await element.getCompany();
                    let admin_user = await company.getRbac_users({
                        where: {
                            fixed: true,
                        }
                    });
                    if (admin_user.length > 0) {
                        admin_user = admin_user[0];
                    }
                    else {
                        throw { err_msg: '未找到管理员' };
                    }
                    let plans = await element.getPlans({
                        where: {
                            status: 2,
                            is_buy: false,
                            count: {
                                [db_opt.Op.gt]: 0
                            },
                            checkout_delay: true,
                        }
                    });
                    for (let index = 0; index < plans.length; index++) {
                        const plan = plans[index];
                        await this.checkout_plan(plan.id, admin_user.online_token);
                    }
                    element.last_delay_checkout = now_date;
                    await element.save();
                });
            } catch (error) {
                console.log(error);
            }
        }
    },
    set_extrac_info_content: async function (plan_id, title_id, content) {
        let plan = await util_lib.get_single_plan_by_id(plan_id);
        let ei_configs = await plan.stuff.company.getExtra_info_configs({
            where: {
                id: title_id
            }
        });
        if (ei_configs.length != 1) {
            throw { err_msg: '无额外信息项' };
        }
        let exist_contents = await plan.getExtra_info_contents({
            where: {
                extraInfoConfigId: title_id
            }
        });
        if (exist_contents.length != 1) {
            await ei_configs[0].createExtra_info_content({
                content: content,
                planId: plan_id
            })
        }
        else {
            exist_contents[0].content = content;
            await exist_contents[0].save();
        }
    },
    get_extra_info_config_ids: async function (plan_id) {
        let plan = await util_lib.get_single_plan_by_id(plan_id);
        let ei_configs = await plan.stuff.company.getExtra_info_configs({
            order: [['id', 'DESC']]
        });
        let ids = [];
        for (let index = 0; index < ei_configs.length; index++) {
            const element = ei_configs[index];
            ids.push(element.id);
        }
        return ids;
    }
};
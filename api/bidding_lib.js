const db_opt = require('./db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');
const plan_lib = require('./plan_lib');
const cash_lib = require('./cash_lib');
module.exports = {
    create_bidding: async function (stuff_id, total, comment,  min, max, total_turn, pay_first, token) {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(stuff_id);
        let company = await rbac_lib.get_company_by_token(token);
        if (stuff && company && await company.hasStuff(stuff)) {
            let bidding = await sq.models.bidding_config.create({
                stuffId: stuff.id,
                total: total,
                comment: comment,
                min: min,
                max: max,
                total_turn: total_turn,
                pay_first: pay_first,
            });
            return await sq.models.bidding_config.findByPk(bidding.id, { include: [sq.models.stuff] });
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    get_all_created_bidding: async function (token, pageNo) {
        let ret = { biddings: [], total: 0 };
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            let where_cond = { [db_opt.Op.or]: [] };
            let stuffs = await company.getStuff({ paranoid: false });
            for (let index = 0; index < stuffs.length; index++) {
                const element = stuffs[index];
                where_cond[db_opt.Op.or].push({ stuffId: element.id });
            }
            let biddings = await sq.models.bidding_config.findAndCountAll({
                where: where_cond,
                include: [{
                    model: sq.models.bidding_turn,
                    include: [{
                        model: sq.models.bidding_item,
                        include: [{
                            model: sq.models.rbac_user,
                            include: [sq.models.company]
                        }],
                        order:[['price', 'DESC'], ['accept', 'DESC']]
                    }],
                    order:[['id', 'DESC']]
                },
                sq.models.stuff],
                limit: 20,
                offset: 20 * pageNo,
                order:[
                    ['id', 'DESC'],
                    [sq.models.bidding_turn, 'id', 'DESC'],
                    [sq.models.bidding_turn, sq.models.bidding_item, 'price', 'DESC'],
                    [sq.models.bidding_turn, sq.models.bidding_item, 'accept', 'DESC'],
                ],
            });
            ret.biddings = biddings.rows;
            ret.total = biddings.count;
        }
        else {
            throw { err_msg: '无权限' };
        }
        return ret;
    },
    add_bid_turn: async function (bc_id, joiner_ids,begin_time, end_time, token) {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, { include: [sq.models.stuff] });
        let company = await rbac_lib.get_company_by_token(token);
        if (bc.status == 0 &&  bc.stuff && company && await company.hasStuff(bc.stuff)) {
            let exist_bts = await bc.getBidding_turns({ order: [['turn', 'DESC']] });
            if (exist_bts.length == 0 || exist_bts[0].turn + 1 < bc.total_turn) {
                let cur_turn = exist_bts.length == 0 ? 0 : (exist_bts[0].turn + 1);
                let bt = await bc.createBidding_turn({begin_time:begin_time, end_time: end_time, turn: cur_turn });
                for (let index = 0; index < joiner_ids.length; index++) {
                    const element = joiner_ids[index];
                    let joiner = await sq.models.rbac_user.findByPk(element.id);
                    await joiner.createBidding_item({ biddingTurnId: bt.id });
                }
                return bt;
            }
            else {
                throw { err_msg: '已经达到最大轮次' };
            }

        }
    },
    get_all_joined_bidding: async function (token, pageNo) {
        let ret = { items: [], total: 0 };
        let sq = db_opt.get_sq();
        let user = await rbac_lib.get_user_by_token(token);
        if (user) {
            let joiners = await user.getBidding_items({
                order: [[sq.models.bidding_turn, 'finish'], [sq.models.bidding_turn, sq.models.bidding_config, 'id', 'DESC'], [sq.models.bidding_turn, 'turn', 'DESC'], ['id', 'DESC']],
                limit: 20, offset: 20 * pageNo,
                include: [{
                    model: sq.models.bidding_turn,
                    include: [{
                        model: sq.models.bidding_config, include: [sq.models.stuff]
                    }]
                }]
            });
            ret.items = joiners;
            ret.total = await user.countBidding_items();
        }
        else {
            throw { err_msg: '无权限' };
        }
        return ret;
    },
    accept_bidding: async function (token, item_id) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.get_user_by_token(token);
        let item = await sq.models.bidding_item.findByPk(item_id, { include: [sq.models.bidding_turn] });
        if (user && item && await user.hasBidding_item(item)) {
            let req_begin_time = moment(item.bidding_turn.begin_time);
            if (moment().isBefore(req_begin_time)) {
                let buy_company = await rbac_lib.get_company_by_token(token);
                let bc = await item.bidding_turn.getBidding_config({
                    where: { status: 0 },
                    include: [
                        { model: sq.models.stuff, include: [sq.models.company] }]
                });
                if (buy_company && bc && bc.stuff && bc.stuff.company) {
                    let contracts = await bc.stuff.company.getSale_contracts({ where: { buyCompanyId: buy_company.id } });
                    if (contracts.length == 1) {
                        let cur_balance = contracts[0].balance;
                        if (cur_balance >= bc.pay_first) {
                            item.accept = true;
                            await item.save();
                        }
                        else {
                            throw { err_msg: '余额不足' };
                        }
                    }
                    else {
                        throw { err_msg: '无合同' };
                    }
                }
                else
                {
                    throw { err_msg: '无权限' };
                }
            }
            else {
                throw { err_msg: '出价已经开始，不能接受' };
            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    bid_price: async function (token, item_id, price) {
        let sq = db_opt.get_sq();
        let user = await rbac_lib.get_user_by_token(token);
        let item = await sq.models.bidding_item.findByPk(item_id, { include: [sq.models.bidding_turn] });
        if (user && item && await user.hasBidding_item(item) && item.accept) {
            let bc = await item.bidding_turn.getBidding_config({where:{status:0}});
            if (bc.status != 0) {
                throw { err_msg: '竞价已经结束' };
            }
            let req_begin_time = moment(item.bidding_turn.begin_time);
            if (moment().isBefore(req_begin_time)) {
                throw { err_msg: '未到出价时间' };
            }
            if (item.price != 0) {
                throw { err_msg: '已经出过价' };
            }
            item.price = price;
            item.time = moment().format('YYYY-MM-DD HH:mm:ss');
            await item.save();
            let not_price_yet_item_count = await item.bidding_turn.countBidding_items({
                where: {
                    [db_opt.Op.and]: [
                        {
                            price: 0
                        },
                        {
                            accept: true
                        }
                    ],
                }
            });
            if (not_price_yet_item_count == 0) {
                await this.try_finish_bidding(item.bidding_turn, 1);
            }
        }
        else {
            throw { err_msg: '无权限' };
        }
    },
    try_finish_bidding: async function (bt, expect_status) {
        bt.finish = true;
        await bt.save();
        let bc = await bt.getBidding_config({ include: [{ model: db_opt.get_sq().models.stuff, include: [db_opt.get_sq().models.company] }] });
        if (bc) {
            if (bc.total_turn == bt.turn + 1 || expect_status == 2) {
                bc.status = expect_status;
                await bc.save();
            }
        }

    },
    go_next_turn: async function (bc_id, top_n, begin_time, end_time, token) {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, { include: [sq.models.stuff] });
        let company = await rbac_lib.get_company_by_token(token);
        if (bc.status == 0 &&  bc.stuff && company && await company.hasStuff(bc.stuff)) {
            let exist_bts = await bc.getBidding_turns({ order: [['turn', 'DESC']] });
            if (exist_bts.length == 0) {
                throw { err_msg: '前一轮还未开始' };
            }
            let last_joiners = [];
            let last_items = await exist_bts[0].getBidding_items({ order: [['price', 'DESC']] });
            for (let index = 0; index < last_items.length && index < top_n; index++) {
                const element = last_items[index];
                last_joiners.push(element.rbacUserId);
            }
            let cur_turn = exist_bts[0].turn + 1;
            let bt = await bc.createBidding_turn({ begin_time: begin_time, end_time: end_time, turn: cur_turn });
            for (let index = 0; index < last_joiners.length; index++) {
                const element = last_joiners[index];
                let joiner = await sq.models.rbac_user.findByPk(element);
                await joiner.createBidding_item({ biddingTurnId: bt.id, accept: true });
            }
            return bt;
        }
    },
    stop_bidding: async function (bc_id, token) {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, { include: [sq.models.stuff] });
        let company = await rbac_lib.get_company_by_token(token);
        if (bc.stuff && company && await company.hasStuff(bc.stuff)) {
            let cur_bts = await bc.getBidding_turns({ where: { finish: false } });
            if (cur_bts.length == 1)
            {
                await this.try_finish_bidding(cur_bts[0], 2);
            }
        }
    },
};
const db_opt = require('./db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');
const plan_lib = require('./plan_lib');
module.exports = {
    create_bidding:async function(stuff_id, total, comment, begin_time, min, max, total_turn, pay_first, token) {
        let sq = db_opt.get_sq();
        let stuff = await sq.models.stuff.findByPk(stuff_id);
        let company = await rbac_lib.get_company_by_token(token);
        if (stuff && company && await company.hasStuff(stuff))
        {
            let bidding = await sq.models.bidding_config.create({
                stuffId:stuff.id,
                total:total,
                comment:comment,
                begin_time:begin_time,
                min:min,
                max:max,
                total_turn:total_turn,
                pay_first:pay_first,
            });
            return await sq.models.bidding_config.findByPk(bidding.id, {include:[sq.models.stuff]});
        }
        else
        {
            throw  {err_msg:'无权限'};
        }
    },
    get_all_created_bidding:async function(token, pageNo) {
        let ret = {biddings:[], total:0};
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(token);
        if (company)
        {
            let where_cond = {[db_opt.Op.or]:[]};
            let stuffs = await company.getStuff({paranoid:false});
            for (let index = 0; index < stuffs.length; index++) {
                const element = stuffs[index];
                where_cond[db_opt.Op.or].push({stuffId:element.id});
            }
            let biddings = await sq.models.bidding_config.findAndCountAll({
                where:where_cond,
                include:[sq.models.stuff],
                limit:20,
                offset:20 * pageNo,
            });
            ret.biddings = biddings.rows;
            ret.total = biddings.count;
        }
        else
        {
            throw {err_msg:'无权限'};
        }
        return ret;
    },
    add_bid_turn:async function(bc_id, joiner_ids, end_time, token)
    {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, {include:[sq.models.stuff]});
        let company = await rbac_lib.get_company_by_token(token);
        if (bc.stuff && company && await company.hasStuff(bc.stuff)) {
            let exist_bts = await bc.getBidding_turns({ order: [['turn', 'DESC']] });
            if (exist_bts.length == 0 || exist_bts[0].turn + 1 < bc.total_turn) {
                let cur_turn = exist_bts.length == 0?0:(exist_bts[0].turn + 1);
                let bt = await bc.createBidding_turn({ end_time: end_time, turn: cur_turn});
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
};
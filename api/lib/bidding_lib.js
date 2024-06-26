const db_opt = require('../db_opt');
const moment = require('moment');
const rbac_lib = require('./rbac_lib');
const wx_api_util = require('./wx_api_util');
const officegen = require('officegen');
const uuid = require('uuid');
const fs = require('fs');
module.exports = {
    create_bidding: async function (stuff_id, total, comment, min, max, total_turn, pay_first, token) {
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
    bidding_order_cond: function () {
        let sq = db_opt.get_sq();
        return {
            include: [{
                model: sq.models.bidding_turn,
                include: [{
                    model: sq.models.bidding_item,
                    include: [{
                        model: sq.models.rbac_user,
                        include: [sq.models.company]
                    }],
                    order: [['accept', 'DESC'], ['price', 'DESC']]
                }],
                order: [['id', 'DESC']]
            },
            sq.models.stuff],
            order: [
                ['id', 'DESC'],
                [sq.models.bidding_turn, 'id', 'DESC'],
                [sq.models.bidding_turn, sq.models.bidding_item, 'accept', 'DESC'],
                [sq.models.bidding_turn, sq.models.bidding_item, 'price', 'DESC'],
                [sq.models.bidding_turn, sq.models.bidding_item, 'time', 'ASC'],
            ],
        }
    },
    get_bidding_by_created_company: async function (company, pageNo) {
        let sq = db_opt.get_sq();
        let ret = { biddings: [], total: 0 };
        let where_cond = { [db_opt.Op.or]: [] };
        let stuffs = await company.getStuff({ paranoid: false });
        for (let index = 0; index < stuffs.length; index++) {
            const element = stuffs[index];
            where_cond[db_opt.Op.or].push({ stuffId: element.id });
        }
        let biddings = await sq.models.bidding_config.findAndCountAll({
            where: where_cond,
            include: this.bidding_order_cond().include,
            limit: 20,
            offset: 20 * pageNo,
            order: this.bidding_order_cond().order,
        });
        ret.biddings = biddings.rows;
        ret.total = biddings.count;
        return ret;
    },
    get_all_created_bidding: async function (token, pageNo) {
        let ret = { biddings: [], total: 0 };
        let sq = db_opt.get_sq();
        let company = await rbac_lib.get_company_by_token(token);
        if (company) {
            ret = await this.get_bidding_by_created_company(company, pageNo);
        }
        else {
            throw { err_msg: '无权限' };
        }
        return ret;
    },
    add_bid_turn: async function (bc_id, joiner_ids, begin_time, end_time, token) {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, { include: [sq.models.stuff] });
        let company = await rbac_lib.get_company_by_token(token);
        if (bc.status == 0 && bc.stuff && company && await company.hasStuff(bc.stuff)) {
            let exist_bts = await bc.getBidding_turns({ order: [['turn', 'DESC']] });
            if (exist_bts.length == 0 || exist_bts[0].turn + 1 < bc.total_turn) {
                let cur_turn = exist_bts.length == 0 ? 0 : (exist_bts[0].turn + 1);
                let bt = await bc.createBidding_turn({ begin_time: begin_time, end_time: end_time, turn: cur_turn });
                for (let index = 0; index < joiner_ids.length; index++) {
                    const element = joiner_ids[index];
                    let joiner = await sq.models.rbac_user.findByPk(element.id);
                    await joiner.createBidding_item({ biddingTurnId: bt.id });
                    wx_api_util.bidding_start_msg(bc.comment + '-' + bc.stuff.name, begin_time, joiner.open_id);
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
                else {
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
            let bc = await item.bidding_turn.getBidding_config({ where: { status: 0 } });
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
            if (price < bc.min || price > bc.max) {
                throw { err_msg: '出价不在范围内' };
            }
            item.price = price;
            item.time = moment().format('YYYY-MM-DD HH:mm:ss');
            wx_api_util.bidding_price_msg(bc, user.name, price);
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
        let bc = await bt.getBidding_config({
            include: this.bidding_order_cond().include,
            order: this.bidding_order_cond().order,
        });
        if (bc && bc.status == 0) {
            if (bc.total_turn == bt.turn + 1 || expect_status == 2) {
                bc.status = expect_status;
                await bc.save();
                wx_api_util.bidding_finish_msg(bc);
                if (bc.bidding_turns.length > 0 && bc.bidding_turns[0].bidding_items.length > 0) {
                    wx_api_util.bidding_success_msg(bc);
                }
            }
        }

    },
    go_next_turn: async function (bc_id, top_n, begin_time, end_time, token) {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, { include: [sq.models.stuff] });
        let company = await rbac_lib.get_company_by_token(token);
        if (bc.status == 0 && bc.stuff && company && await company.hasStuff(bc.stuff)) {
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
            if (cur_bts.length == 1) {
                await this.try_finish_bidding(cur_bts[0], 2);
            }
            else if (cur_bts.length == 0) {
                bc.status = 2;
                await bc.save();
            }
        }
    },
    stop_timeup_bt: async function () {
        let sq = db_opt.get_sq();
        let open_bts = await sq.models.bidding_turn.findAll({
            where: {
                [db_opt.Op.and]: [{
                    finish: false,
                },
                sq.where(sq.fn('datetime', sq.col('end_time')), {
                    [db_opt.Op.lt]: sq.fn('datetime', moment().format('YYYY-MM-DD HH:mm:ss'))
                }),
                ]
            },
        });
        for (let index = 0; index < open_bts.length; index++) {
            const element = open_bts[index];
            this.try_finish_bidding(element, 1);
        }
    },
    output_docx: function (docx) {
        return new Promise((resolve, reject) => {
            let file_name = '/uploads/bidding' + uuid.v4() + '.docx';
            let out = fs.createWriteStream('/database' + file_name);
            out.on('close', () => {
                resolve(file_name);
            });
            out.on('error', (err) => {
                reject(err);
            });
            docx.on('error', (err) => {
                reject(err);
            });
            docx.generate(out);
        });
    },
    make_export_bidding_file: async function (bc_id) {
        let sq = db_opt.get_sq();
        let bc = await sq.models.bidding_config.findByPk(bc_id, {
            include: this.bidding_order_cond().include,
            order: this.bidding_order_cond().order,
        });
        let docx = officegen('docx');
        docx.createP({ align: 'center' }).addText(bc.stuff.name + '竞价结果', { bold: true, font_size: 20 });
        for (let index = 0; index < bc.bidding_turns.length; index++) {
            const element = bc.bidding_turns[index];
            docx.createP().addText('第' + (element.turn + 1) + '轮竞价', { bold: true, font_size: 16, underline: true });
            docx.createP({ align: 'right' }).addText(element.begin_time + '至' + element.end_time, { font_size: 16 });
            docx.createP().addText('出价情况', { font_size: 16 });
            let bi_table = [
                [{
                    val: '公司',
                    opts: {
                        cellColWidth: 4261,
                        b: true,
                        sz: '48',
                    },
                }, {
                    val: '出价',
                    opts: {
                        cellColWidth: 4261,
                        b: true,
                        sz: '48',
                    },
                }, {
                    val: '时间',
                    opts: {
                        cellColWidth: 4261,
                        b: true,
                        sz: '48',
                    },
                }, {
                    val: '姓名',
                    opts: {
                        cellColWidth: 4261,
                        b: true,
                        sz: '48',
                    },
                }],
            ];
            for (let index = 0; index < element.bidding_items.length; index++) {
                const bi = element.bidding_items[index];
                let bid_time = '';
                if (bi.time) {
                    bid_time = bi.time;
                }
                let bid_price = '未接受';
                if (bi.accept) {
                    if (bi.price >= 0) {
                        bid_price = bi.price;
                    }
                    else {
                        bid_price = '未出价';
                    }
                }
                // docx.createP().addText(bi.rbac_user.company.name + '\t' + bid_price + '\t' + bid_time + '\t' + bi.rbac_user.name, { font_size: 11 });
                bi_table.push([bi.rbac_user.company.name, bid_price, bid_time, bi.rbac_user.name]);
            }
            docx.createTable(bi_table,
                {
                    tableColWidth: 4261,
                    tableSize: 72,
                    tableAlign: 'left',
                    borders: true
                }
            );
        }
        ret = await this.output_docx(docx);
        return ret;
    },
};
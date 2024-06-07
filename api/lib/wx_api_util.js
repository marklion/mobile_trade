const axios = require('axios');
const fs = require('fs')
const sleep = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout)
    })
}
const token_store = {
    token: '',
    expire_time: 0,
};

const pub_token_store = {
    token: '',
    expire_time: 0,
};
const appid = 'wxfbf41c757510dc4c';
const pub_appid = 'wxa390f8b6f68e9c6d';

async function call_wx_api(url, req, method) {
    let ret = '';
    let err_msg = '';
    try {
        let resp = await axios.post(
            'https://express-en1b-110417-4-1327111924.sh.run.tcloudbase.com/api/run_api', {
            url: url,
            method: method,
            data: req,
        }, {
            headers: { 'share-key': process.env.SHARE_KEY }
        });
        if (!resp.data.err_msg) {
            ret = resp.data.data;
        }
        err_msg = resp.data.err_msg;
    } catch (error) {
        console.log(error);
    }
    console.log(url, req, method, ret, err_msg);

    return ret;
}

function proxy_is_open() {
    let sk = process.env.SHARE_KEY;
    let ret = false;
    if (sk && sk.length > 0)
        ret = true;
    return ret;
}

async function get_to_wx(url) {
    let ret = '';
    try {
        let resp = await axios.get(url);
        ret = resp.data;
        if (ret.errcode && ret.errcode != 0) {
            throw new Error(`errmsg:${ret.errmsg},errcode:${ret.errcode}`);
        }
    } catch (error) {
        console.log(error);
    }
    console.log(url, ret);
    return ret;
}
async function post_to_wx(url, data) {
    let ret = '';
    try {
        let resp = await axios.post(url, data);
        ret = resp.data;
        if (ret.errcode && ret.errcode != 0) {
            throw new Error(`errmsg:${ret.errmsg},errcode:${ret.errcode}`);
        }
    } catch (error) {
        console.log(error);
    }
    console.log(url, data, ret);
    return ret;
}
async function get_mp_token() {
    let ret = '';
    if (proxy_is_open()) {
        ret = "whatever";
    }
    else {
        let sec = process.env.MP_SECRET;
        let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${sec}`;
        try {
            if (token_store.expire_time < Date.now()) {
                let resp = await get_to_wx(url);
                token_store.token = resp.access_token;
                token_store.expire_time = Date.now() + resp.expires_in * 1000;
            }
        } catch (error) {
            console.log(error);
        }
        ret = token_store.token;
    }

    return ret;
}
async function get_pub_token() {
    let ret = '';
    if (proxy_is_open()) {
        ret = "whatever";
    }
    else {
        let sec = process.env.WECHAT_SECRET;
        let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${pub_appid}&secret=${sec}`;
        try {
            if (pub_token_store.expire_time < Date.now()) {
                let resp = await get_to_wx(url);
                pub_token_store.token = resp.access_token;
                pub_token_store.expire_time = Date.now() + resp.expires_in * 1000;
            }
        } catch (error) {
            console.log(error);
        }
        ret = pub_token_store.token;
    }

    return ret;
}
async function get_all_pub_user_openid() {
    let ret = [];
    let finish = false;
    let token = await get_pub_token();
    if (token) {
        let last_open_id = '';
        while (!finish) {
            let resp = {};
            if (proxy_is_open()) {
                resp = await call_wx_api(`https://api.weixin.qq.com/cgi-bin/user/get?next_openid=${last_open_id}`, {}, 'GET')
            }
            else {
                resp = await get_to_wx(`https://api.weixin.qq.com/cgi-bin/user/get?access_token=${token}&next_openid=${last_open_id}`)
            }
            if (resp.data && resp.data.openid && resp.data.openid.length > 0) {
                last_open_id = resp.next_openid
                resp.data.openid.forEach(item => {
                    ret.push(item);
                });
            }
            else {
                finish = true;
            }
        }
    }
    return ret;
}

function make_plan_status_msg(plan) {
    return {
        thing3: { value: plan.company.name },
        thing5: { value: plan.stuff.name },
        car_number14: { value: plan.main_vehicle.plate },
        thing9: { value: plan.stuff.company.name },
        const24: { value: plan.status },
    }
}

async function send_wx_msg(req) {
    let token = await get_pub_token()
    if (token) {
        if (proxy_is_open()) {
            await post_to_wx(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`, req);
        }
        else {
            await call_wx_api('https://api.weixin.qq.com/cgi-bin/message/template/send', req, 'POST');
        }
    }
}

module.exports = {
    openid_map: {
        map: {},
        get_pub_openid: function (unionid) {
            let ret = '';
            if (this.map[unionid]) {
                ret = this.map[unionid]
            }
            return ret;
        },
        load_map: function () {
            fs.readFile('/database/map.json', 'utf8', (err, data) => {
                if (err) throw err;
                this.map = JSON.parse(data);
            });
        },
        sync_map: async function () {
            let token = await get_pub_token();
            if (token) {
                let openids = await get_all_pub_user_openid()
                let op_groups = [];
                for (let index = 0; index < openids.length; index += 100) {
                    op_groups.push(openids.slice(index, index + 100));
                }
                for (let index = 0; index < op_groups.length; index++) {
                    const element = op_groups[index];
                    let rl_array = [];
                    element.forEach(ele => {
                        rl_array.push({
                            openid: ele,
                            lang: 'zh_CN'
                        })
                    });
                    let resp = {};
                    if (proxy_is_open()) {
                        resp = await call_wx_api('https://api.weixin.qq.com/cgi-bin/user/info/batchget', {
                            user_list: rl_array
                        }, 'POST');
                    }
                    else {
                        resp = await post_to_wx(`https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=${token}`, {
                            user_list: rl_array
                        })
                    }
                    resp.user_info_list.forEach(item => {
                        this.map[item.unionid] = item.openid;
                    });
                }
            }
            fs.writeFile('/database/map.json', JSON.stringify(this.map), (err) => {
                if (err) throw err;
                this.load_map();
            });
        },
    },
    get_open_id_by_code: async function (_code) {
        let token = await get_mp_token();
        if (token) {
            let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${process.env.MP_SECRET}&js_code=${_code}&grant_type=authorization_code`;
            let resp = {};
            if (proxy_is_open()) {
                resp = await call_wx_api(url + '&from_appid=' + appid, {}, 'GET');
            } else {
                resp = await get_to_wx(url);
            }
            _code = resp.unionid;
        }
        else {
            await sleep(50);
            if (process.env.MP_SECRET != 'none') {
                _code = 'fix_123'
            }

        }
        return _code
    },
    get_phone_by_code: async function (_code) {
        let token = await get_mp_token();
        if (token) {
            let url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`;
            let resp = {};
            if (proxy_is_open()) {
                resp = await call_wx_api('https://api.weixin.qq.com/wxa/business/getuserphonenumber?from_appid=' + appid, {
                    code: _code
                }, 'POST')
            }
            else {
                resp = await post_to_wx(url, {
                    code: _code
                })
            }
            _code = resp.phone_info.purePhoneNumber;
        }
        else {
            await sleep(50);
            if (process.env.MP_SECRET != 'none') {
                _code = '19911119999'
            }
        }
        return _code;
    },
    make_ticket_qr: async function (plan) {
        let token = await get_mp_token();
        let b64con = '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';
        let resp = {
            buffer: Buffer.from(b64con, 'base64'),
        }
        if (token) {
            let url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;
            if (proxy_is_open()) {
                resp = await call_wx_api('https://api.weixin.qq.com/wxa/getwxacodeunlimit?from_appid=' + appid, {
                    scene: plan.id + '',
                    page: 'pages/Ticket',
                    width: 430
                }, 'POST');
            }
            else {
                resp = await post_to_wx(url, {
                    scene: plan.id + '',
                    page: 'pages/Ticket',
                    width: 430
                })
            }
        }

        return resp;
    },
    send_plan_status_msg: async function (plan) {
        let req = {
            template_id: 'qn42DMtvKzNMpOw1wz0DHTqAOPO9PiYDBzI3vz6Laxg',
            // miniprogram: {
            //     appid: appid,
            //     pagepath: 'pages/OrderList'
            // },
            data: make_plan_status_msg(plan),
        }
        let tar_array = [plan.rbac_user.open_id];
        let users = await plan.stuff.company.getRbac_users();
        users.forEach(item => {
            if (item.open_id) {
                tar_array.push(item.open_id);
            }
        });
        tar_array.forEach(item => {
            req.touser = this.openid_map.get_pub_openid(item);
            send_wx_msg(req);
        });
    },
    call_vehicle_msg: async function (plan) {
        let req = {
            template_id: 'foumgWCOdHirOuI8mi28M1XNtyRDqfU9n4pLsX5AMxM',
            // miniprogram: {
            //     appid: appid,
            //     pagepath: 'pages/OrderList'
            // },
            data: {
                thing11: {
                    value: plan.stuff.company.name,
                },
                thing10: {
                    value: plan.driver.name,
                },
                car_number2: {
                    value: plan.main_vehicle.plate
                },
            },
            touser: this.openid_map.get_pub_openid(plan.driver.open_id)
        }
        send_wx_msg(req);
    },
    plan_scale_msg: async function (plan) {
        let req = {
            template_id: '86yW1daS1NNjQzkrogRe_cc4dqGNVWI-iTcOJX0K6Rk',
            data: {
                thing4: {
                    value: plan.stuff.name,
                },
                car_number3: {
                    value: plan.main_vehicle.plate,
                },
                character_string8: {
                    value: plan.p_weight ? plan.p_weight.toFixed(2) : '未知',
                },
                character_string9: {
                    value: plan.m_weight ? plan.m_weight.toFixed(2) : '未知',
                },
                character_string10: {
                    value: plan.count.toFixed(2),
                },
            }
        }
        let tar_array = [plan.rbac_user.open_id, plan.driver.open_id];
        let users = await plan.stuff.company.getRbac_users();
        users.forEach(item => {
            if (item.open_id) {
                tar_array.push(item.open_id);
            }
        });
        tar_array.forEach(item => {
            req.touser = this.openid_map.get_pub_openid(item);
            send_wx_msg(req)
        });
    },
    bidding_start_msg: async function (bidding_name, begin_time, user_open_id) {
        let req = {
            template_id: 'NlG21tpsDBdefio1qwDsvNwsAA3LWL4PSkQpRnQU0-g',
            data: {
                first: {
                    value: '竞价开始',
                },
                keyword1: {
                    value: bidding_name,
                },
                keyword2: {
                    value: '邀请竞价,' + begin_time + '开始',
                },
            },
            touser: this.openid_map.get_pub_openid(user_open_id)
        }
        send_wx_msg(req)
    },
    bidding_price_msg: async function (bc, price_user, price) {
        let stuff = await bc.getStuff()
        let bidding_name = bc.comment + stuff.name;
        let req = {
            template_id: 'NlG21tpsDBdefio1qwDsvNwsAA3LWL4PSkQpRnQU0-g',
            data: {
                first: {
                    value: '出价',
                },
                keyword1: {
                    value: bidding_name,
                },
                keyword2: {
                    value: price_user + '出价：' + price,
                },
            }
        }
        let tar_array = [];
        let company = await stuff.getCompany()
        let users = await company.getRbac_users();
        users.forEach(item => {
            if (item.open_id) {
                tar_array.push(item.open_id);
            }
        });
        tar_array.forEach(item => {
            req.touser = this.openid_map.get_pub_openid(item);
            send_wx_msg(req)
        });
    },
    bidding_finish_msg: async function (bc) {
        let stuff = await bc.getStuff()
        let bidding_name = bc.comment + stuff.name;
        let req = {
            template_id: 'NlG21tpsDBdefio1qwDsvNwsAA3LWL4PSkQpRnQU0-g',
            data: {
                first: {
                    value: '竞价结束',
                },
                keyword1: {
                    value: bidding_name,
                },
                keyword2: {
                    value: '竞价结束',
                },
            }
        }
        let tar_array = [];
        let company = await stuff.getCompany()
        let users = await company.getRbac_users();
        users.forEach(item => {
            if (item.open_id) {
                tar_array.push(item.open_id);
            }
        });
        let bt = await bc.getBidding_turns();
        for (let index = 0; index < bt.length; index++) {
            const element = bt[index];
            let bis = await element.getBidding_items();
            for (let i = 0; i < bis.length; i++) {
                let user = await bis.getRbac_user();
                if (user) {
                    tar_array.push(user.open_id)
                }
            }
        }

        tar_array.forEach(item => {
            req.touser = this.openid_map.get_pub_openid(item);
            send_wx_msg(req)
        });
    },
}
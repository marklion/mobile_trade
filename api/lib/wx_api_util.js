const axios = require('axios');
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
const appid = 'wxfbf41c757510dc4c';
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
    return ret;
}
async function get_mp_token() {
    let ret = '';
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

    return ret;
}
module.exports = {
    get_open_id_by_code: async function (_code) {
        let token = await get_mp_token();
        if (token) {
            let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${process.env.MP_SECRET}&js_code=${_code}&grant_type=authorization_code`;
            let resp = await get_to_wx(url);
            _code = resp.openid;
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
            let resp = await post_to_wx(url, {
                code: _code
            })
            _code = resp.phone_info.purePhoneNumber;
        }
        else {
            await sleep(50);
            if (process.env.MP_SECRET != 'none') {
                _code = '19911119999'
            }
        }
        return _code;
    }
}
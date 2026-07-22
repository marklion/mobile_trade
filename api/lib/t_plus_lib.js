const axios = require('axios');
module.exports = {
    req2tplus: async function (method, url, params, body, company) {
        let appkey = company.tplus_appkey;
        let token_resp = await axios.get(`https://cjtapi.d8sis.cn/token?appkey=${appkey}`);
        let token = token_resp.data.access_token;
        let axios_instance = axios.create({
            headers: {
                'Content-Type': 'application/json',
                "appKey": company.tplus_appkey,
                "appSecret": company.tplus_appsecret,
                "openToken": token
            }
        });
        let resp;
        try {
            resp = await axios_instance({
                method: method,
                url: url,
                params: params,
                data: body,
                timeout: 30000,
                validateStatus: () => true,
            });
        } catch (e) {
            console.error('call tplus failed:', e && e.message ? e.message : e);
            throw { err_msg: '调用T+接口失败' };
        }
        if (resp.status !== 200) {
            console.error(`call tplus failed: status=${resp.status}`);
            throw { err_msg: '调用T+接口失败' };
        }
        return resp.data;
    }
};
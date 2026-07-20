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
        let resp = await axios_instance({
            method: method,
            url: url,
            params: params,
            data: body
        });
        let ret;
        if (resp.status === 200) {
            ret = resp.data;
        }
        else {
            console.error("call tplus failed:");
            console.error(JSON.stringify(resp));
        }
        return ret;
    }
};
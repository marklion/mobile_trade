const { default: axios } = require('axios');
const httpsAgent = require('https').Agent;
module.exports = {
    push_req2zc: async function (req, url, token) {
        let resp = await axios.post(url, req, {
            headers: {
                token: token
            },
            httpsAgent: new httpsAgent({
                rejectUnauthorized: false,
                keepAlive: false,
            })
        });
        let resp_data = resp.data;
        if (resp.data.err_msg)
        {
            throw {err_msg: resp.data.err_msg};
        }
        console.log('send to zc', url, req, token, resp_data);
        return resp_data;
    },
}
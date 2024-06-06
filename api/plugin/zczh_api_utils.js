const { default: axios } = require('axios');
module.exports = {
    push_req2zc: async function (req, url, token) {
        let resp = await axios.post(url, req, {
            headers: {
                token: token
            }
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
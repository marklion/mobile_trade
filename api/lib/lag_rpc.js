const thrift = require('thrift');
const open_api = require('../gen_code/open_api');
const url = require('url');
module.exports = {
    requeset_rpc: async function (company, process_name, params) {
        let ret = undefined
        try {
            let urlStr = company.zc_rpc_url;
            let real_params = [company.zc_phone];
            real_params = real_params.concat(params);
            var mp = new thrift.Multiplexer();
            let parsedUrl = url.parse(urlStr)
            var options = {
                transport: thrift.TBufferedTransport,
                protocol: thrift.TJSONProtocol,
                path: parsedUrl.pathname,
                headers: { "Connection": "close" },
                https: parsedUrl.protocol === 'https:' ? true : false,
                nodeOptions:{
                    rejectUnauthorized:false,
                }
            };
            let port_number = 80;
            if (parsedUrl.protocol === 'https:') {
                port_number = 443;
            }
            if (parsedUrl.port) {
                port_number = parsedUrl.port;
            }
            var connection = thrift.createHttpConnection(parsedUrl.hostname, port_number, options);
            var client = mp.createClient('open_api', open_api, connection);
            ret = await client[process_name].apply(client, real_params);
        }
        catch (e) {
            console.log('error', e);
        }
        console.log('send to rpc', company.zc_rpc_url, process_name, params, ret);
        return ret;
    },
}
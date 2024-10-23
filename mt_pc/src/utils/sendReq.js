import request from './request'
import {Loading}  from 'element-ui'
export default {
    send_req: async function(url, data) {
        let li = Loading.service({
            fullscreen: true,
        });
        let resp = await request({
            url: url,
            method: 'post',
            data
        })
        li.close();
        return resp;
    }
}

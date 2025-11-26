import request from './request'
import { Loading } from 'element-ui'
export default {
    send_req: async function (url, data, noneed_loading = false) {
        let li
        if (!noneed_loading) {
            li = Loading.service({
                fullscreen: true,
            });
        }
        let resp;
        try {
            resp = await request({
                url: url,
                method: 'post',
                data
            })
        } catch (error) {
            console.log(error);
            throw error;
        } finally {
            if (li) {
                li.close();
            }
        }
        return resp;
    }
}

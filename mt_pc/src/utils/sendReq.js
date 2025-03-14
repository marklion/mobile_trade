import request from './request'
import { Loading } from 'element-ui'
export default {
    send_req: async function (url, data) {
        let li = Loading.service({
            fullscreen: true,
        });
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
            li.close();
        }
        return resp;
    }
}

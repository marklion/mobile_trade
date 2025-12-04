import axios from 'axios'
import { Message } from 'element-ui'
import { MessageBox } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 10000 // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    // do something before request is sent

    if (store.getters.token) {
      config.headers['Token'] = getToken()
    }
    return config
  },
  error => {
    // do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  async response => {
    const res = response.data
    if (res.err_msg.length > 0) {
      Message({
        message: res.err_msg || 'Error',
        type: 'error',
        duration: 10 * 1000
      })
      return Promise.reject(new Error(res.err_msg || 'Error'))
    } else {
      if (res.audit_id != undefined && res.audit_id > 0) {
        let comment = { value: null };
        try {
          comment = await MessageBox.prompt('该操作需要审批', {
            title: '请描述审批事项',
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPattern: /.+/,
            inputErrorMessage: '审批事项不能为空',
          });
        } catch (error) {
          comment = { value: null };
        }
        await service({
          url: '/audit/append_comment',
          method: 'post',
          data: {
            id: res.audit_id,
            comment: comment.value,
          }
        });
      }
      return res.result
    }
  },
  error => {
    console.log('err' + error) // for debug
    Message({
      message: error.message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service

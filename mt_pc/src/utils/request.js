import axios from 'axios'
import { Message } from 'element-ui'
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
    if ((res.err_msg || '').length > 0) {
      Message({
        message: res.err_msg || 'Error',
        type: 'error',
        duration: 10 * 1000
      })
      return Promise.reject(new Error(res.err_msg || 'Error'))
    } else {
      const auditId = res.audit_id
      if (auditId !== undefined && auditId > 0) {
        const hint = res.comment
          ? `已提交审批（${res.comment}），审批通过后将自动执行。`
          : '已提交审批，审批通过后将自动执行该操作。'
        Message({
          message: hint,
          type: 'warning',
          duration: 8 * 1000
        })
        const payload = res.result
        if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
          return { ...payload, __auditPending: true, __auditId: auditId }
        }
        return payload
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

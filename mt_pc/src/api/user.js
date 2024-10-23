import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/global/pwd_login',
    method: 'post',
    data
  })
}

export function getInfo() {
  return request({
    url: '/global/self_info',
    method: 'post'
  })
}


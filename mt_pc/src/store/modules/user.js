import { login, getInfo } from '@/api/user'
import { getPendingTodoCount } from '@/api/approval'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { resetRouter } from '@/router'
import { Notification } from 'element-ui'

const getDefaultState = () => {
  return {
    token: getToken(),
    name: '',
    avatar: '',
    roles: [],
    company_name: '',
    id:0,
    approval_todo_count: 0,
  }
}

const state = getDefaultState()

const mutations = {
  RESET_STATE: (state) => {
    Object.assign(state, getDefaultState())
  },
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_NAME: (state, name) => {
    state.name = name
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar
  },
  SET_ROLES: (state, roles) => {
    state.roles = roles
  },
  SET_COMPANY_NAME: (state, company_name) => {
    state.company_name = company_name
  },
  SET_ID: (state, id) => {
    state.id = id
  },
  SET_APPROVAL_TODO_COUNT: (state, count) => {
    state.approval_todo_count = count
  },
}

const actions = {
  // user login
  login({ commit }, userInfo) {
    const { phone, password } = userInfo
    return new Promise((resolve, reject) => {
      login({ phone: phone.trim(), password: password }).then(data => {
        commit('SET_TOKEN', data.token)
        setToken(data.token)
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // get user info
  getInfo({ commit, state }) {
    return new Promise((resolve, reject) => {
      getInfo().then(data => {
        if (!data) {
          reject('Verification failed, please Login again.')
        }
        const roles = data.modules.map((item) => { return item.name })
        // roles must be a non-empty array
        if (!roles || roles.length <= 0) {
          reject('getInfo: roles must be a non-null array!')
        }
        commit('SET_ROLES', roles)
        commit('SET_NAME', data.name)
        commit('SET_COMPANY_NAME', data.company)
        commit('SET_AVATAR', 'https://picsum.photos/200.jpg')
        commit('SET_ID', data.id)
        resolve(roles)
      }).catch(error => {
        reject(error)
      })
    })
  },
  refreshApprovalTodoCount({ commit, state }, options = {}) {
    const notify = !!options.notify
    return new Promise((resolve) => {
      if (!state.roles || !state.roles.includes('approval')) {
        commit('SET_APPROVAL_TODO_COUNT', 0)
        resolve(0)
        return
      }
      getPendingTodoCount().then((ret) => {
        const count = Number(ret.count) || 0
        commit('SET_APPROVAL_TODO_COUNT', count)
        if (notify && count > 0) {
          const tokenKey = state.token || ''
          const remindedKey = `approval_notify_once_${tokenKey}`
          if (!sessionStorage.getItem(remindedKey)) {
            Notification({
              title: '审批提醒',
              message: `有 ${count} 条待审批，请及时处理`,
              type: 'warning',
              duration: 6000,
              position: 'top-right'
            })
            sessionStorage.setItem(remindedKey, '1')
          }
        }
        resolve(count)
      }).catch(() => {
        commit('SET_APPROVAL_TODO_COUNT', 0)
        resolve(0)
      })
    })
  },

  // user logout
  logout({ commit, state }) {
    return new Promise((resolve, reject) => {
      if (state.token) {
        sessionStorage.removeItem(`approval_notify_once_${state.token}`)
      }
      removeToken() // must remove  token  first
      resetRouter()
      commit('RESET_STATE')
      resolve()
    })
  },

  // remove token
  resetToken({ commit }) {
    return new Promise(resolve => {
      removeToken() // must remove  token  first
      commit('RESET_STATE')
      resolve()
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}


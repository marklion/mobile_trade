import { login, getInfo } from '@/api/user'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { resetRouter } from '@/router'
import request from '@/utils/request'

const getDefaultState = () => {
  return {
    token: getToken(),
    name: '',
    avatar: '',
    roles: [],
    company_name: '',
    id:0,
    groupOperateMemberIds: [],
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
  SET_GROUP_OPERATE_MEMBER_IDS: (state, ids) => {
    state.groupOperateMemberIds = Array.isArray(ids) ? ids : []
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
      getInfo().then(async (data) => {
        if (!data) {
          reject('Verification failed, please Login again.')
          return
        }
        const roles = data.modules.map((item) => { return item.name })
        // roles must be a non-empty array
        if (!roles || roles.length <= 0) {
          reject('getInfo: roles must be a non-null array!')
          return
        }
        commit('SET_ROLES', roles)
        commit('SET_NAME', data.name)
        commit('SET_COMPANY_NAME', data.company)
        commit('SET_AVATAR', 'https://picsum.photos/200.jpg')
        commit('SET_ID', data.id)
        commit('SET_GROUP_OPERATE_MEMBER_IDS', [])
        try {
          const scopeRet = await request({
            url: '/global/home_stat_scope_list',
            method: 'post',
            data: {}
          })
          commit('SET_GROUP_OPERATE_MEMBER_IDS', scopeRet.operate_member_company_ids || [])
        } catch (e) {
          console.warn(e)
        }
        resolve(roles)
      }).catch(error => {
        reject(error)
      })
    })
  },

  // user logout
  logout({ commit, state }) {
    return new Promise((resolve, reject) => {
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


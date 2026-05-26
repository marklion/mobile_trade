import sendReq from '@/utils/sendReq'

const STORAGE_KEY = 'global_stat_context_company_id'

const getDefaultState = () => ({
  initialized: false,
  loading: false,
  companyIsGroup: false,
  selfCompanyId: null,
  scopes: [],
  selectedCompanyId: null,
})

function normalizeScopeId(scopeId) {
  if (scopeId == null) {
    return null
  }
  return String(scopeId)
}

function resolveScopeId(availableScopeIds, scopeId) {
  const normalizedScopeId = normalizeScopeId(scopeId)
  if (normalizedScopeId == null) {
    return null
  }
  const matched = (availableScopeIds || []).find((id) => normalizeScopeId(id) === normalizedScopeId)
  return matched == null ? null : matched
}

function pickDefaultScopeId(scopes, selfCompanyId) {
  const firstMemberScope = (scopes || []).find(
    (s) => s && normalizeScopeId(s.id) !== normalizeScopeId(selfCompanyId)
  )
  if (firstMemberScope) {
    return firstMemberScope.id
  }
  if (selfCompanyId != null) {
    return selfCompanyId
  }
  if ((scopes || []).length > 0) {
    return scopes[0].id
  }
  return null
}

function readStoredScopeId() {
  const val = localStorage.getItem(STORAGE_KEY)
  if (val == null || val === '') {
    return null
  }
  return val
}

function writeStoredScopeId(scopeId) {
  if (scopeId == null) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, String(scopeId))
}

const state = getDefaultState()

const mutations = {
  RESET_STATE(state) {
    Object.assign(state, getDefaultState())
  },
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  SET_INITIALIZED(state, initialized) {
    state.initialized = initialized
  },
  SET_SELF_INFO(state, payload) {
    state.companyIsGroup = !!(payload && payload.company_is_group)
    state.selfCompanyId = payload && payload.company_id != null ? payload.company_id : null
  },
  SET_SCOPES(state, scopes) {
    state.scopes = scopes || []
  },
  SET_SELECTED_COMPANY_ID(state, companyId) {
    state.selectedCompanyId = companyId == null ? null : companyId
  },
}

const actions = {
  async initialize({ state, commit }, { force = false } = {}) {
    if (state.initialized && !force) {
      return
    }
    commit('SET_LOADING', true)
    try {
      const selfInfo = await sendReq.send_req('/global/self_info', {}, true)
      commit('SET_SELF_INFO', selfInfo || {})

      if (!selfInfo || selfInfo.company_is_group !== true) {
        commit('SET_SCOPES', [])
        commit('SET_SELECTED_COMPANY_ID', null)
        writeStoredScopeId(null)
        commit('SET_INITIALIZED', true)
        return
      }

      const scopeResp = await sendReq.send_req('/global/home_stat_scope_list', {}, true)
      const scopes = (scopeResp && scopeResp.scopes) || []
      commit('SET_SCOPES', scopes)

      const availableScopeIds = scopes.map((s) => s.id)
      let selectedId = resolveScopeId(availableScopeIds, state.selectedCompanyId)

      if (selectedId == null) {
        selectedId = resolveScopeId(availableScopeIds, readStoredScopeId())
      }
      if (selectedId == null) {
        selectedId = pickDefaultScopeId(scopes, selfInfo.company_id)
      }
      selectedId = resolveScopeId(availableScopeIds, selectedId)

      commit('SET_SELECTED_COMPANY_ID', selectedId)
      writeStoredScopeId(selectedId)
      commit('SET_INITIALIZED', true)
    } catch (e) {
      commit('SET_SELF_INFO', { company_is_group: false, company_id: null })
      commit('SET_SCOPES', [])
      commit('SET_SELECTED_COMPANY_ID', null)
      writeStoredScopeId(null)
      commit('SET_INITIALIZED', true)
    } finally {
      commit('SET_LOADING', false)
    }
  },
  setSelectedCompanyId({ state, commit }, companyId) {
    const validIds = (state.scopes || []).map((s) => s.id)
    const nextId = resolveScopeId(validIds, companyId)
    if (companyId != null && nextId == null) {
      return
    }
    commit('SET_SELECTED_COMPANY_ID', nextId)
    writeStoredScopeId(nextId)
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}

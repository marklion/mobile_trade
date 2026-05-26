const getters = {
  sidebar: state => state.app.sidebar,
  device: state => state.app.device,
  token: state => state.user.token,
  avatar: state => state.user.avatar,
  name: state => state.user.name,
  id: state => state.user.id,
  company_name: state => state.user.company_name,
  roles: state => state.user.roles,
  approval_todo_count: state => state.user.approval_todo_count,
  permission_routes: state => state.permission.routes,
  visitedViews: state => state.tagsView.visitedViews,
  cachedViews: state => state.tagsView.cachedViews,
  globalStatScopeReady: state => state.statScope.initialized,
  globalStatScopeLoading: state => state.statScope.loading,
  globalStatCompanyIsGroup: state => state.statScope.companyIsGroup,
  globalStatSelfCompanyId: state => state.statScope.selfCompanyId,
  globalStatScopes: state => state.statScope.scopes,
  globalStatContextCompanyId: state => state.statScope.selectedCompanyId,
  globalStatScopeVisible: state => {
    if (!state.statScope.companyIsGroup || state.statScope.selfCompanyId == null) {
      return false
    }
    return (state.statScope.scopes || []).some((s) => s.id !== state.statScope.selfCompanyId)
  },
}
export default getters

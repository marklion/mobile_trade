import Vue from 'vue'

import 'normalize.css/normalize.css' // A modern alternative to CSS resets

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

import '@/styles/index.scss' // global css

import App from './App'
import store from './store'
import router from './router'

import '@/icons' // icon
import '@/permission' // permission control
import sendReq from '@/utils/sendReq'
import permission from '@/directive/permission'

Vue.use(ElementUI)

Vue.config.productionTip = false
Vue.prototype.$send_req = sendReq.send_req
Vue.prototype.$hasPermission = function (permission) {
  const roles = store.getters.roles
  let ret = false;
  if (roles.includes(permission)) {
    ret = true;
  }
  return ret;
}
Vue.prototype.$getNestedProperty = function (obj, path) {
  const keys = path.split('.');
  let result = obj;

  for (let key of keys) {
    result = result[key];
    if (result === undefined) {
      return undefined;
    }
  }
  return result;
}
Vue.prototype.$make_file_url = function (url) {
  let ret = '/api/v1/upload_file';
  if (url) {
    ret = url;
  }
  return ret;
}
Vue.directive('permission', permission)

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})

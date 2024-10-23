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

Vue.use(ElementUI)

Vue.config.productionTip = false
Vue.prototype.$send_req = sendReq.send_req

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})

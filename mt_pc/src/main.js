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
Vue.prototype.$download_file = function (url, fileName) {
  const link = document.createElement('a');
  link.href = url;
  let extern_name = url.split('.').pop();
  if (fileName) {
    fileName = fileName + '.' + extern_name;
  }
  else {
    fileName = '未命名.' + extern_name;
  }
  link.download = fileName;  // 强制指定文件名
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
Vue.prototype.$quik_date_option = {
  shortcuts: [{
    text: '最近一周',
    onClick(picker) {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
      picker.$emit('pick', [start, end]);
    }
  }, {
    text: '最近一个月',
    onClick(picker) {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
      picker.$emit('pick', [start, end]);
    }
  }, {
    text: '最近三个月',
    onClick(picker) {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
      picker.$emit('pick', [start, end]);
    }
  }]
}
Vue.directive('permission', permission)

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})

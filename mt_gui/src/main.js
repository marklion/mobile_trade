import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import uView from '@/uni_modules/uview-ui'
Vue.use(uView)
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.prototype.$remote_url = function () {
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  else {
    return process.env.REMOTE_HOST;
  }
};
function showInputDialog(title = '请输入', placeholder = '') {
  return new Promise((resolve, reject) => {
    uni.showModal({
      title,
      editable: true,
      placeholderText: placeholder,
      success: (res) => {
        if (res.confirm) {
          resolve(res.content)
        } else {
          reject(new Error('用户取消输入'))
        }
      },
      fail: reject
    })
  })
}
Vue.prototype.$send_req = function (_url, _data, noneed_loading = false) {
  return new Promise((resolve, reject) => {
    if (!noneed_loading) {
      uni.showLoading({ title: '加载中...', mask: true });
    }
    uni.request({
      url: Vue.prototype.$remote_url() + '/api/v1' + _url,
      data: _data,
      method: 'POST',
      header: {
        'token': uni.getStorageSync('token'),
      },
      success: async (res) => {
        let data = res.data;
        if (data.err_msg.length > 0) {
          uni.showToast({
            title: data.err_msg,
            icon: 'none',
            duration: 2000,
            success: () => {
              // 可以在这里执行后续操作
              reject(data.err_msg);
            }
          });
        }
        else {
          if (data.audit_id != undefined && data.audit_id > 0) {
            let comment;
            try {
              comment = await showInputDialog('该操作需要审批', '请描述审批事项');
            } catch (error) {

            }
            await Vue.prototype.$send_req('/audit/append_comment', {
              id: data.audit_id,
              comment: comment,
            }, true);
          }
          resolve(data.result)
        }
      },
      fail: (res) => {
        reject(res)
      },
      complete: () => {
        if (!noneed_loading) {
          uni.hideLoading({ noConflict: true });
        }
      }
    })
  })
};
Vue.prototype.$init_self = async function () {
  try {
    let self_info = await Vue.prototype.$send_req('/global/self_info');
    uni.setStorageSync('self_info', self_info);
  } catch (error) {
    uni.navigateTo({
      url: '/subPage1/Login'
    });
  }
};
Vue.prototype.$has_module = function (mod_name) {
  let ret = false;
  let mods = uni.getStorageSync('self_info').modules.map(ele => {
    return ele.name
  })
  if (mods.indexOf(mod_name) != -1) {
    ret = true;
  }
  return ret;
};
Vue.prototype.$convert_attach_url = function (url) {
  let prefix = Vue.prototype.$remote_url();
  let baseUrl
  if (!prefix) {
    prefix = window.location.href;
    let urlObj = new URL(prefix);
    baseUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
  }
  else {
    baseUrl = prefix;
  }
  let ret = baseUrl + url;

  return ret;
};
Vue.prototype.$download_file = function (uri) {
  uni.downloadFile({
    url: uri,
    success: (res) => {
      if (res.statusCode === 200) {
        // 下载成功，保存到本地
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            uni.showToast({
              title: '下载成功',
              icon: 'success'
            });
          },
          fail: () => {
            uni.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      } else {
        uni.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    },
    fail: () => {
      uni.showToast({
        title: '下载失败',
        icon: 'none'
      });
    }
  });
};
Vue.prototype.$get_login_code = function () {
  return new Promise((resolve, reject) => {
    uni.login({
      success: res => {
        resolve(res.code);
      },
      fail: res => {
        reject(res);
      }
    });
  });
};
Vue.prototype.$regExp = function validate(type, value) {
  const patterns = {
    licensePlate: {
      regular: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/,
    },
    chineseName: /^[\u4e00-\u9fa5·]{2,10}$/,
    phoneNumber: /^1[3-9]\d{9}$/
  };

  switch (type) {
    case 'plate':
      return patterns.licensePlate.regular.test(value);
    case 'name':
      return patterns.chineseName.test(value);
    case 'phone':
      return patterns.phoneNumber.test(value);
    default:
      throw new Error('Unsupported validation type');
  }
}
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif
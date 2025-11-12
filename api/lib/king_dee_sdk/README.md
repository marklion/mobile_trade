# 调试步骤

```
npm i 
node ./test.js
```
**使用:**

```js
let { ApigwClient } = require('./dist/index')

let requestSDK = new ApigwClient('236514', '3eaf929860ac418d6dcd4de903913787')

requestSDK.request({
    url: 'https://api.kingdee.com/jdyconnector/app_management/push_app_authorize', method: 'post', params: {
        outerInstanceId: '73951222155055104',
        app_signature: 'MzZlYTk0ODk4MWZlNjdiODNmNWU4YzViNzYxNGM5MTFlOGJkN2NjMzk0MTJkZGNhZGM0NzZhN2YxZDJmOTlkZA=='
    }, data: { firstName: 'Fred' }
}).then(response => {
    console.log(response.status);
    console.log(response.data);
})
requestSDK.request({
    url: 'https://api.kingdee.com/jdy/test/get', method: 'get', params: {
        outerInstanceId: '73951222155055104'
    }
}).then(response => {
    console.log(response.status);
    console.log(response.data.data);
}).catch(e=>{
    console.log(e.response.data)
})
```
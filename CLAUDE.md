# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目是什么

`mobile_trade` 是一个面向中国市场的多租户 B2B 大宗商品交易与地磅（计量）管理平台。租户对应一个**公司**（`company` 表）；公司可以是**集团**，跨多个成员公司经营。系统覆盖合同/授信（充值）、订单与过磅计划（磅单）、竞价、供应商/采购管理、安全检查、考试、补贴、道闸/地磅硬件、微信消息、ERP 同步，以及 LLM 辅助数据导出。

技术栈：Node.js/Express + MySQL（Sequelize）后端，两个 Vue 2 前端（微信小程序 + PC 管理端），Robot Framework 端到端测试，以及 C/Node 硬件代理。

## 标准开发环境

使用 Dev Container（`.devcontainer/Dockerfile`）；生产镜像 `marklion/mt_deploy:v1.1` 由同一个 Dockerfile 构建，因此本地与 CI 环境一致。镜像内提供 Node（默认 `n v22`）、Python 3 + Robot Framework、thrift 0.14、nginx、hugo、mysql-client、pm2。后端的标准启动方式是 VSCode 调试器。

## 常用命令

### 后端（`api/`，Node/Express，CommonJS + Babel）
- 本地调试/运行：在 VSCode 里按 **F5**（"debug backend"）。`Select Purpose` 任务会执行 `script/select-purpose.sh`，提示选择用途（**1 = 普通调试，2 = 自动化测试**）、SQL 凭据和千问 key，然后写入 `/tmp/purpose.env`。选 2 会新建一个带时间戳的 `test_*` 数据库并重写 `automation/var.resource`；调试结束后的 `Reset DB` 任务会删除该库并还原该文件。
- 直接运行（需要 `/tmp/purpose.env` 里的环境变量）：`cd api && npm run dev`（nodemon + babel-node）。默认监听端口 **8080**（可用 `PORT` 环境变量覆盖）。
- 生产构建：`cd api && npm run build`（webpack → `build/api/index.js`）。**ESLint（airbnb-base）通过 eslint-webpack-plugin 在 webpack 构建中运行——lint 报错会导致构建失败。**
- `api/gen_code/` 是由 `lag_rpc/idl.thrift` 生成的 Thrift JS（已被 gitignore）。用 `make -C lag_rpc` 重新生成（需要 thrift 编译器）；根 Makefile 已包含 `api: lag_rpc` 依赖。

### 手机端（`mt_gui/`，基于 Vue 2 的 uni-app——主要产物是微信小程序）
- 开发（H5，端口 8081）：`cd mt_gui && npm run serve`
- `mt_gui` 的生产构建要求 **Node 16.8.0**；Makefile 会自动切换（`n 16.8.0 && npm run build:mp-weixin ...; n 18.17.0`）。不要在 Node 22 上跑 uni-app 生产构建。
- `src/manifest.json` 里有一个 `MP_APPID` 占位符，Makefile 在构建时用 sed 替换、构建后还原——不要把真实 appid 提交进去。

### PC 管理端（`mt_pc/`，Vue 2 + Element UI，基于 vue-element-admin 模板；开发端口 9528）
- 开发：`cd mt_pc && npm run dev`
- Lint：`npm run lint`；单元测试：`npm run test:unit`（jest；但权威测试套件是 Robot Framework，不是 jest）

### 整体构建 / 打包 / 部署
- 构建所有组件到 `build/`：`make -j 8 ENV_REMOTE_HOST="https://${DOMAIN}" ENV_MP_APPID=... ENV_PUB_APPID=...`
- 生成自解压安装包：`make pack` → `build/install.sh`（把 `deploy.sh` 和 tar 包拼接在一起）。每个顶层目录都是一个独立的 make 子项目，各有自己的 `Makefile` 和 `build/`。
- `make clean` 会删除所有 `build/`、`node_modules/` 和 Robot 产物。

### 测试（Robot Framework，Python）——真正的自动化测试套件
所有套件位于 `automation/`（21 个 `*.robot` 套件 + `*.resource` 关键字库）。它们是黑盒测试：通过 HTTP 驱动 API，并直接查 MySQL 断言数据状态。
- 仿 CI 的完整流程（构建 + 部署进 Docker + 跑 robot + 删库）：`make test db_password=... db_host=...`（见 `test.sh`）。
- 在用途 2 的调试会话中，可从 VSCode 测试面板（Robocorp Robot Framework 扩展）运行单个套件/用例，也可用命令行：
  - 单个用例：`robot --test "Bidding Create And Check" automation/bidding/bidding_config.robot`
  - 单个套件：`robot automation/bidding/`
  - 指定输出目录和共享变量：`robot -d results -v server_base:http://localhost:8080/api/v1 -v db_name:<db> -v db_host:<h> -v db_user:<u> -v db_pass:<p> automation`
- `automation/var.resource` 存放数据库/服务器变量，会被 F5 流程重写（不要手工编辑/提交凭据）。
- 测试引导事实：管理员登录手机号 `18911992582`，默认密码 `_P@ssw0rd_`（`DEFAULT_PWD`）；测试里写字面量 token `admin_token` 会自动以该用户登录。
- CI：`.github/workflows/main.yml` 先跑 Sonar 扫描，在部署镜像里构建，启动 MySQL 8，运行 `make test`，最后上传 `output.xml/log.html/report.html`。

## 架构

### 后端 API 框架（先读这部分——这是最核心的抽象）
每个业务接口都是**声明**出来的，而不是手写路由。`api/module/<name>_module.js` 中的模块导出 `{ name, description, methods }`；每个方法是一个声明式规格：

```js
some_method: {
  name, description,                 // 中文名称/说明，用于生成文档
  is_write: false,                   // 决定 RBAC 读/写校验
  is_get_api: true,                  // 分页列表：自动增加 pageNo 入参和 total 返回
  params:  { field: { type, have_to, mean, example, explain } },
  result:  { field: { type, mean, example, explain } },  // 嵌套 Object/Array 用 explain
  func: async (body, token) => ({ ... }),
}
```

`index.js` 对每个模块调用 `module_install()`；`make_api()`（`api/api_utils.js`）随即为每个方法注册 `POST /api/v1/<module>/<method>`，并串起完整请求管线：
1. 按 schema 严格校验 `params`（`have_to` 表示必填；`explain` 递归校验 Object/Array）。
2. 审批拦截（`approval_lib.guard_req`）：被配置的写操作可能被**转入审批流**——此时不执行 handler，响应改为携带 `audit_id` 和 `comment`。两个前端都对 `audit_id` 做了特殊处理（PC 端 `utils/request.js`，手机端 `main.js`）。
3. 当 `need_rbac` 为真时做 RBAC 校验（`lib/rbac_lib.js`）：用户 → 角色 → 模块，并强制只读角色限制。
4. 调用 `func(body, token)`；通过 throw `{ err_msg }`（或 Error）返回业务失败。
5. 用 `result.js`（`copy_by_key`）按白名单序列化返回值：**只有在方法 `result` schema 里声明过的字段才会返回**——未声明的字段会被静默丢弃。新增返回字段务必同步加到 `result`。
同一份规格还会自动生成 `/api/help` 的人读文档和 `/api/openapi.json` 的 OpenAPI/Swagger 规格。

新增/修改接口时的注意事项：
- 往已有模块加方法——无需其他注册。新增**模块**：创建文件，并在 `index.js` 里加一行 `module_install(...)`（管理员角色会被自动授权）。
- **所有接口都是 POST**，包括查询（`is_get_api` 只会增加 `pageNo`/`total` 分页；测试通过 `Req Get to Server` 关键字翻页）。
- 响应包络固定为 `{ err_msg, result }`；`err_msg` 为空串表示成功。
- 多租户：每个请求用 `rbac_lib.get_company_by_token(token)` / `get_user_by_token(token)` 解析租户；所有查询都要限定到该公司。跨公司操作（集团场景）通过显式的 `stat_context_company_id` 入参指定。鉴权 token 放在 `token` 请求头（20 天滑动有效期；`fixed` 用户永不过期）。

### 数据层（`api/db_opt.js`）——唯一事实来源
所有 Sequelize 模型及其关联都集中定义在这一个文件里。**没有迁移文件**：启动时 `install()` 执行 `sequelize.sync({ alter: { drop: false } })`，所以改模型定义就会改线上表结构（只增列、不删列）。模型使用 `paranoid: true`（软删除）。DECIMAL 字段声明了 `get` 访问器（`getDecimalValue`），使其以 JS number 而非字符串返回。数据库配置来自环境变量 `DB_NAME/DB_USER/DB_PASS/DB_HOST`。业务逻辑位于 `api/lib/*_lib.js`（文件较大：`plan_lib.js`、`field_lib.js`、`cash_lib.js`、`rbac_lib.js`、`bidding_lib.js` 等）；模块层只是对 lib 的薄封装。

### 定制 / OEM 插件（`api/plugin/`）
两个相互独立的扩展点，都通过 `all_plugin.get_plugin_by_name()` 按名字分发：
- **按公司的生命周期钩子**，键为 `company.script`（如 `check_in`、`cancel_check_in`、`call_vehicle`）。`normal.js` 是空操作默认实现；其余（`hnmhg`、`old_zczh`、`new_zczh`、`yt_audit`、`HeTPW2V`）是客户专属实现。由 `lib/hook_lib.js`、`lib/field_lib.js` 在事务中分发。
- **按货物的复杂计价**，键为 `stuff.complex_plugin`（`verify_input`、`calc_count`、`input_metas`），用于 `scale_module.js` / `plan_lib.js`。

### 后台定时任务
`index.js` 用 `add_min_timer(分钟数, fn)` 注册周期任务（计划自动关闭、超时处理、自动签出、金蝶预存款同步、微信 openid 映射同步等）。可通过 `POST /api/v1/internal_timeout` 外部触发（请求体 `pwd` 必须等于 `DEFAULT_PWD`）。在没有真实微信密钥的 Docker 部署里，`script/timer.sh` 会循环轮询该端点来驱动定时器。微信推送在测试模式下会被截获：当 `MP_SECRET=none` 时，模板消息被追加写入 `/database/wx_api_log.txt` 而不真正调用微信，测试用 `WxMsg Catch` / `WxMsg was recieved` 关键字（`automation/database.resource`）断言这些消息。

### 文件存储与重活
用户上传和生成的文件都在 `/database` 下（Docker 挂载卷；`uploads/`、`logo_res/`），以静态资源方式提供。图片压缩/合并跑在 `worker_threads` Worker 里（即 `index.js` 的 `!isMainThread` 分支）。进程会按 cgroup CPU 配额（`CPU_LIMIT_CORES`）自我限流，超载时返回 HTTP 503 和 `Retry-After`。

### 外部集成
- **微信**小程序登录/模板消息（`lib/wx_api_util.js`，`MP_SECRET`）；公众号（`WECHAT_SECRET`、`PUB_APPID`）。
- **金蝶 ERP**：星空/Start（`lib/king_dee_start_lib.js`、`king_dee_sdk/`）、U8C（`u8c_module.js`）、T+（`t_plus_module.js`、`t_plus_lib.js`）。
- **LLM 数据导出/图表**：`lib/qwen_lib.js` 通过 OpenAI 兼容的 DashScope 端点（`DASHSCOPE_API_KEY`）；提示词在 `conf/export_prompt_template.txt` 和 `conf/chart_prompt_template.txt`（调试时拷到 `/conf`，构建时打进包里）。
- **硬件 / 本地网关**：`zczh/` 是独立打包的组件（C++ service 用 CMake + Thrift + nginx/frpc，外加一个 Node api），用于磅房设备集成；`extern/` 是独立代理程序（modbus 地磅、仰邦 LED、扫码打印、快捷登录 kiosk、VPN 监控）。`lag_rpc/idl.thrift` 是 RPC 契约。`mock/` 是 Express mock（端口 39087），用于模拟第三方 `zyzl` 回调。

### 前端
- **`mt_gui/`**（uni-app/Vue 2）：一套代码编译到 H5 和多种小程序平台；**mp-weixin 是交付产物**。页面在 `src/pages`，分包在 `src/subPage1|2`。`src/main.js` 挂装了全局 `this.$send_req(url, data, ...)` 辅助方法（POST `/api/v1/...`，token 取自 storage），并处理 `audit_id` 待审批包络。API 基址：开发时同源（`''`），否则用 `REMOTE_HOST`。
- **`mt_pc/`**（Vue 2 + Element UI，vue-element-admin）：按业务域划分的视图在 `src/views`，路由由 `src/permission.js` 和 `store/modules`（`user`、`permission`、`statScope`）守卫。Axios 实例 `src/utils/request.js` 使用基址 `VUE_APP_BASE_API`（`/api/v1`）并发送 `Token` 头。
- **开发代理分流**（两个前端的 `vue.config.js`）：`/api` → 本地后端 `http://localhost:8080`，但 `/api/v1/upload_file`、`/uploads`、`/logo_res` → 公网 `REMOTE_HOST`（文件流量走部署的公网平台，而非容器——见 README）。

### 文档
用户文档是 `doc_site/content/docs/` 下的 Hugo 站点（中文），构建到 `build/doc_site`，通过 `/help/` 提供（`make -C doc_site`）。机器生成的 API 参考在 `/api/help`。

## 约定

- 业务文案、UI 文字、代码内注释和提交/PR 引用主要是**中文**；分支/工单号形如 `ZYZL-823`。代码注释和提交信息请跟随周边语言。
- 坚持声明式 API 风格：扩展规格，而不是新增零散的 `app.post` 路由（只有上传/下载/swagger 这类横切端点直接写在 `index.js`/`legacy_api.js`）。
- 改返回结构时，必须同步更新该方法的 `result` schema，否则字段到不了客户端；改请求字段时同步更新 `params`，否则校验会拒绝。
- 改数据模型时只编辑 `db_opt.js`，依赖 `alter` 同步；不要写删列这类破坏性操作。
- 前端是 Vue 2 Options API；不要引入 Vue 3 / Composition API 写法。
- 仓库根目录下提交的生成产物（`log.html`、`report.html`、`output.xml`）以及所有 `build/`、`node_modules/`、`gen_code/`、`last_host.txt` 都是被 gitignore 的构建/测试输出——忽略它们，不要手工编辑。

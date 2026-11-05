# AGENTS.md

## 项目概述

`mobile_trade` 是面向中国市场的多租户 B2B 大宗商品交易与计量管理平台，产品界面和用户文档主要使用中文。系统以公司（`company`）为租户，支持集团及成员公司，业务覆盖合同与授信、采购/销售订单、过磅计划与磅单、竞价、供应商、安检、考试、补贴、审批、道闸/地磅设备、微信消息、ERP 同步和 LLM 辅助导出。

仓库不是单一应用，而是由以下交付组件组成：

- `api/`：Node.js、Express、Sequelize、MySQL 主后端，使用 CommonJS；开发时由 `babel-node`/`nodemon` 启动，生产时由 webpack 打包。
- `mt_gui/`：Vue 2 + uni-app 手机端，一套源码可构建 H5 和多种小程序，主要交付微信小程序。
- `mt_pc/`：Vue 2 + Vue Router + Vuex + Element UI 的 PC 管理端，基于 vue-element-admin。
- `automation/`：Robot Framework 黑盒端到端测试，使用 Python 依赖，通过 HTTP 调用 API 并直接查询 MySQL 验证状态。
- `zczh/`：独立交付的磅房/设备网关，包含 C++ 服务、设备驱动、SQLite 数据层、Thrift RPC 和 Node.js API。
- `lag_rpc/`：主后端访问设备服务的 Thrift 契约；`idl.thrift` 是源文件，`api/gen_code/` 是生成代码。
- `extern/`：独立硬件/桌面辅助程序，包括 Modbus 地磅、串口半自动过磅、仰邦 LED、扫码打印、快捷登录页面和 VPN 监控脚本；它们不纳入根目录统一构建。
- `doc_site/`：Hugo + hugo-book 中文用户文档，发布路径为 `/help/`。
- `conf/`：nginx 配置、LLM 提示词、Excel 模板及构建时环境配置。
- `script/`：调试、数据库处理、部署辅助和定时任务脚本。
- `mock/`：独立 Express 第三方回调模拟服务，监听 `39087`，不属于主服务。

## 核心架构与开发约束

### 声明式后端 API

主后端不是逐接口手写 Express 路由。`api/module/*_module.js` 导出 `{ name, description, methods }`，每个方法声明：

- `name`、`description`：用于中文接口文档。
- `is_write`：决定 RBAC 读/写权限校验。
- `is_get_api`：表示分页查询，自动增加 `pageNo` 参数和 `total` 返回字段，不改变 HTTP 方法。
- `params`：参数 schema，`have_to` 表示必填；嵌套 `Object`/`Array` 使用 `explain`。
- `result`：返回值 schema。
- `func(body, token)`：实际处理函数，业务失败通常抛出 `{ err_msg }`。

`api/index.js` 的 `module_install()` 注册模块，`api/api_utils.js` 的 `make_api()` 创建 `POST /api/v1/<module>/<method>`，依次完成参数校验、审批拦截、RBAC 校验、业务调用和结果序列化。常规响应为 `{ err_msg, result }`，`err_msg` 为空字符串表示成功。写操作若进入审批流，则不直接执行 handler，而是返回 `audit_id` 和 `comment`；两个前端均对该响应做了特殊处理。

修改接口时必须遵守：

- 给已有模块增加方法无需额外注册；新增模块文件后，必须在 `api/index.js` 的初始化列表中调用 `module_install()`。
- 新增或修改请求字段时同步更新 `params`。它是已声明字段的类型/必填校验和文档来源；不一致会导致合法请求被拒绝或文档与实现不符。
- 新增返回字段时同步更新 `result`。`api/result.js` 按 schema 白名单复制结果，未声明字段会被静默丢弃。
- 公共请求/响应结构可复用 `api/api_param_result_define.js`，不要在多个模块中无意复制出不同定义。
- 除上传、下载、Swagger 等横切端点外，不要绕过该框架新增零散的 `app.post()`。

同一套声明还会生成 `/api/help` 的人类可读文档及 `/api/openapi.json`。Swagger UI 位于 `/api/swagger/`；Swagger 和 OpenAPI JSON 当前要求使用系统账号登录，不是完全公开的端点。

### 业务层、多租户与权限

- `api/module/` 主要是薄接口层，复杂业务集中在 `api/lib/*_lib.js`，尤其是 `plan_lib.js`、`field_lib.js`、`cash_lib.js`、`bidding_lib.js`、`rbac_lib.js`、`group_lib.js`。
- 已注册模块覆盖 `global`、客户、销售、采购、竞价、货物、安检、资金、计量、RBAC、供应商、考试、U8C、T+、审批和集团管理。
- 请求通过 `token` 请求头鉴权。使用 `rbac_lib.get_user_by_token(token)` 和 `get_company_by_token(token)` 获取当前用户及公司；普通 token 采用约 20 天有效期并滑动更新，`fixed` 用户不受该过期逻辑限制。
- 所有业务查询和写入都必须保持公司级数据隔离，不能仅凭客户端传入的对象 ID 跨公司操作。集团场景通过显式的 `stat_context_company_id` 和 `group_lib` 的权限解析切换操作主体，不能把它当作无校验的通用公司选择器。
- RBAC 按用户、角色、模块授权，并区分读写。新增接口要正确设置 `need_rbac` 和 `is_write`，不要为图方便关闭校验。

### 数据层

`api/db_opt.js` 是所有 Sequelize 模型、关联和数据库连接的唯一集中定义，连接参数来自 `DB_NAME`、`DB_USER`、`DB_PASS`、`DB_HOST`。

- 项目没有独立迁移目录。启动时 `install()` 定义模型并执行 `sequelize.sync({ alter: { drop: false } })`，会直接修改目标数据库结构。
- 模型统一使用 `paranoid: true`，即软删除。
- 多数 `DECIMAL` 字段通过 `getDecimalValue()` 以 JavaScript number 返回。
- 修改模型只改 `db_opt.js`，利用现有同步机制；不要擅自增加删列、清库或其他破坏性迁移。启动、测试和调试前务必确认指向的是预期数据库。

### 插件、后台任务与文件

- `api/plugin/all_plugin.js` 按名称分发 OEM 扩展。`company.script` 选择公司生命周期钩子，`normal.js` 是默认空实现；`hnmhg`、`old_zczh`、`new_zczh`、`yt_audit` 等为客户定制。
- `stuff.complex_plugin` 选择复杂计价插件，约定实现 `input_metas`、`verify_input`、`calc_count`，由计量和计划逻辑调用。
- `api/index.js` 注册计划关闭、竞价超时、自动签出、金蝶预存款同步、微信 openid 映射等周期任务。部署环境可通过 `/api/v1/internal_timeout` 驱动这些任务。
- 上传和生成的文件存放在 `/database`，其中 `/uploads`、`/logo_res` 作为静态资源提供。调试流程会把 LLM 提示词复制到 `/conf`。
- 图片处理使用 Jimp；上传压缩和拼图共用常驻 `worker_threads` Worker 池，并限制并发及排队长度。主进程按 cgroup 或 `CPU_LIMIT_CORES` 估算负载，过载时返回 HTTP 503 和 `Retry-After`，并把 CPU 数值、进行中的请求、图片任务和定时任务限频记录到 `/database/cpu_record.log`。
- 微信/公众号集成位于 `api/lib/wx_api_util.js`。消息会记录到 `/database/wx_api_log.txt`；测试模式使用 `MP_SECRET=none` 避免依赖真实微信调用，Robot 测试读取该日志断言消息。
- 其他外部集成包括金蝶星空/Start、U8C、T+，以及 `api/lib/qwen_lib.js` 的 DashScope OpenAI 兼容接口。LLM 密钥来自 `DASHSCOPE_API_KEY`，提示词源文件在 `conf/export_prompt_template.txt` 和 `conf/chart_prompt_template.txt`。

### 前端组织

`mt_gui/`：

- 主页面在 `src/pages/`，分包在 `src/subPage1/`、`src/subPage2/`，页面注册在 `src/pages.json`。
- `src/main.js` 提供全局 `$send_req()`，统一发送 POST 请求、携带 storage 中的 token、处理错误及待审批响应。
- 开发环境 API 使用同源地址，生产环境使用构建时注入的 `REMOTE_HOST`；H5 路由基址为 `/mobile`。
- `src/manifest.json` 的微信小程序 appid 必须保持 `MP_APPID` 占位符，Makefile 构建时临时替换并在结束后还原。

`mt_pc/`：

- 业务视图在 `src/views/`，通用组件在 `src/components/`，路由与权限由 `src/router/`、`src/permission.js` 和 `src/store/modules/` 协同处理。
- `src/utils/request.js` 的 Axios 实例使用 `VUE_APP_BASE_API`（开发配置为 `/api/v1`），通过 `Token` 请求头发送凭据。
- 两个前端的 `vue.config.js` 都把普通 `/api` 请求代理到 `http://localhost:8080`，但上传、`/uploads`、`/logo_res` 使用 `REMOTE_HOST` 指向部署平台；这是现有调试约定。

两端都使用 Vue 2 Options API。不要引入 Vue 3 或 Composition API 写法，也不要仅因模板支持条件编译就改变当前 Vue 2 主路径。

## 开发环境与常用命令

### 标准环境

优先使用 `.devcontainer/` 的 VSCode Dev Container。Dockerfile 基于 Ubuntu focal（`linux/amd64`），最终默认 Node 为 v22，并安装 thrift 0.14.1、CMake、nginx、MySQL 客户端、Python、pm2、Hugo 及硬件编译依赖。生产镜像 `marklion/mt_deploy:v1.1` 与该环境共用 Dockerfile。

Python/Robot 依赖安装：

```bash
pip install -r automation/require.txt
```

### 后端

标准调试方式是在 VSCode 按 F5，选择 `debug backend`：

1. `Select Purpose` 先安装 `api/` 依赖并运行 `script/select-purpose.sh`。
2. 用途 `1` 为普通调试，用途 `2` 为自动化测试；根据提示输入 SQL 凭据和千问 key。
3. 配置写入 `/tmp/purpose.env`，后端由 `npm run dev` 启动，默认端口为 `8080`，可用 `PORT` 覆盖。
4. 用途 `2` 会创建带时间戳的 `test_*` 数据库，并重写 `automation/var.resource`；调试结束后的 `Reset DB` 会删除该测试库并还原本地变量文件。

不使用 VSCode 时，先自行提供上述环境变量，再运行：

```bash
cd api
npm install
npm run dev
```

后端生产构建：

```bash
cd api
npm run build
```

webpack 输出为 `api/build/api/index.js`，构建期间会通过 `eslint-webpack-plugin` 执行 ESLint，lint 错误会导致构建失败。`api/package.json` 中的 `npm test` 是占位失败命令，不是测试入口。

修改 `lag_rpc/idl.thrift` 后重新生成主后端 Thrift JS：

```bash
make -C lag_rpc
```

`api/gen_code/` 是被忽略的生成目录，不要手工编辑；根构建已通过 `api: lag_rpc` 保证生成顺序。

### 手机端与 PC 端

```bash
# 手机端 H5 开发，端口 8081
cd mt_gui
npm run serve

# PC 开发，默认端口 9528
cd mt_pc
npm install
npm run dev
npm run lint
```

`mt_gui` 的生产构建必须使用 Node `16.8.0`。不要直接在默认 Node 22 下运行 uni-app 生产构建；使用 `make -C mt_gui`，其 Makefile 会用 `n` 切换版本、通过 yarn 安装依赖并构建微信小程序和 H5。

### 整体构建与清理

OEM 全量构建：

```bash
make -j 8 \
  ENV_REMOTE_HOST="https://${DOMAIN_NAME}" \
  ENV_MP_APPID="${MP_APPID}" \
  ENV_PUB_APPID="${PUB_APPID}" \
  ENV_DASHSCOPE_API_KEY="${DASHSCOPE_API_KEY}"
```

根 Makefile 的第一个目标是 `pack`，所以上述裸 `make` 会依次构建组件并生成自解压安装包；显式执行 `make pack` 亦然。产物包括：

- `build/install.sh`：后端、PC、H5、文档等组成的自解压 Docker 安装包。
- `build/mp-weixin/`：可由微信开发者工具打开的小程序包。
- `build/` 下其余组件产物。

只需要组件产物、不需要拼接安装包时使用 `make all`。各顶层组件也可通过 `make -C <目录>` 单独构建。`make clean` 会删除各组件的 `build/`、`node_modules/`、生成代码、锁文件和测试输出，影响范围很大，不要把它当作普通清理测试报告的命令。

文档单独构建：

```bash
make -C doc_site
```

该 Makefile 会临时给 `doc_site/hugo.toml` 添加 `baseURL = "/help/"`，构建后删除该行。

## 测试策略

### Robot Framework 主测试套件

权威自动化测试在 `automation/`，当前有 21 个 `.robot` 套件，按竞价、货物/计划、RBAC、审批、集团、安检、考试、黑名单、微信消息等业务域组织；共享关键字在 `api_base.resource`、`database.resource` 和各域 `.resource` 文件中。

这些测试需要正在运行的后端、MySQL 和对应测试数据，不是离线单元测试。`Req to Server` 中的字面量 token `admin_token` 会自动登录测试管理员；`Req Get to Server` 负责自动翻页。数据库清理关键字会直接删改数据，因此只能对一次性测试库运行。

完整 CI 风格流程要求先完成根构建，再执行：

```bash
make test db_password='<数据库密码>' db_host='<数据库主机>'
```

`make test` 只调用 `test.sh`，不会自动构建。脚本要求 `build/install.sh` 已存在，会启动 Docker 容器，使用固定的 `automation_test` 数据库和 `sysadmin` 用户运行全部 Robot 测试，最后删除该数据库及容器。不要对保留数据库复用这些名称或流程。

在用途 `2` 的调试会话中，可通过 VSCode Robot Framework 扩展运行单个用例/套件，也可使用命令行：

```bash
# 单个用例
robot --test "Bidding Create And Check" automation/bidding/bidding_config.robot

# 单个目录
robot automation/bidding/

# 显式指定输出目录、服务和数据库
robot -d results \
  -v server_base:http://localhost:8080/api/v1 \
  -v db_name:'<测试库>' -v db_host:'<主机>' \
  -v db_user:'<用户>' -v db_pass:'<密码>' \
  automation
```

`automation/var.resource` 是共享变量占位文件，F5 测试流程会临时写入真实连接信息。不要手工提交其中的凭据。

### 前端 Jest 状态

`mt_pc` 提供 `npm run test:unit` 和 `npm run test:ci`，`mt_gui` 也提供若干 Jest 平台命令，但当前仓库未发现已提交的前端 `*.spec.js`/`*.test.js` 或测试目录。因此不要把这些命令当作已有的完整测试保障，也不要用后端占位的 `npm test` 代替 Robot 套件。

### CI

`.github/workflows/main.yml` 在 `main` 分支 push、PR 和手动触发时运行：先完成 SonarQube 扫描和部署镜像内全量构建，再将同一个安装包交给 4 个并行测试分片；每个分片使用独立的 MySQL 8 数据库和 Docker 测试床，最后用 `rebot` 合并并上传 `build/output.xml`、`build/log.html`、`build/report.html`。CI 所需数据库、Sonar 和千问配置来自 GitHub Secrets。

## 部署流程

1. 准备域名、HTTPS 入口、外部 MySQL，以及微信小程序/公众号所需配置。
2. 按上述 OEM 命令执行根 `make`，得到 `build/install.sh` 和 `build/mp-weixin/`。
3. 按 `README.md` 准备主机镜像：拉取 `marklion/mt_deploy:v1.1` 并标记为 `mt_deploy:v1.1`。
4. 将安装包复制到主机工作目录，使用安装脚本参数传入端口、数据库和微信密钥。脚本创建 privileged Docker 容器，挂载 `/database`，在容器内启动 nginx 和 pm2；后端默认在容器内监听 `8080`。
5. nginx 将 PC 静态站点发布在 `/`，手机 H5 发布在 `/mobile`，Hugo 文档发布在 `/help`，并将 `/api/` 反向代理到主后端。
6. 使用微信开发者工具打开 `build/mp-weixin/` 预览和上传。`frontend_deploy.sh` 另提供基于 `miniprogram-ci` 的上传方式，但依赖本地 `upload.key` 和脚本内既有 appid 配置，使用前必须核对目标租户。

`zczh/` 有独立构建和安装链路：`make -C zczh` 构建 C++/Node 组件，`make -C zczh pack` 生成 `zczh/build/install.sh`。其 C++ 服务使用 CMake、Thrift、SQLite 和设备厂商库，不能把它当作主 Express 后端的普通子模块。

## 代码风格与仓库约定

- 业务文案、接口说明、UI 和多数项目注释使用中文；新增内容跟随周边语言。历史分支/提交常带 `ZYZL-<编号>` 工单前缀。
- 后端使用 CommonJS、4 空格和分号的现有风格；PC 与手机端通常为 2 空格、单引号、不带分号。以具体文件和 ESLint 配置为准，不做全仓库格式化。
- `mt_pc/.eslintrc.js` 使用 `plugin:vue/recommended` 和 `eslint:recommended`，开发构建及 `npm run lint` 应保持一致。
- 后端模块层保持声明式和薄封装，业务复用逻辑放入对应 `lib`，不要在路由中重复实现。
- 前端 API 调用使用现有 `$send_req()` 或 Axios 实例，保留统一错误、token 和审批响应处理。
- 不手编 `build/`、`dist/`、`api/gen_code/`、Hugo `public/` 等生成物。`log.html`、`report.html`、`output.xml`、`last_host.txt`、`last-build-time*` 也是构建/测试输出。
- `.gitignore` 忽略所有 `package-lock.json` 和 `yarn.lock`，即使工作区已有这些文件，也不要默认把它们当作需要提交的变更。
- `README.md` 面向开发/部署人员，`CLAUDE.md` 也包含架构说明；修改构建流程或核心架构时，应同步检查相关文档是否仍然准确。

## 安全与数据保护

- 不把数据库密码、微信 secret、DashScope key、Sonar token 或小程序上传私钥写入新文件或提交。生产部署应显式替换脚本中的默认口令。
- `/tmp/purpose.env` 和调试期间的 `automation/var.resource` 含敏感连接信息，不要复制到 issue、日志或提交中。
- `conf/Makefile` 会把 `ENV_DASHSCOPE_API_KEY` 等构建变量写入 `build/conf/env.sh`，随后进入安装包；构建目录和 `build/install.sh` 应按敏感交付物处理，不能随意公开。
- 保留 `mt_gui/src/manifest.json` 的 `MP_APPID` 占位符，不提交真实 appid。若构建中断，检查该文件是否已还原。
- 后端启动会自动 `sync({ alter: ... })`，Robot 清理及 `test.sh` 还会删数据/删库。任何本地命令都要先核对 `DB_*` 和 Robot `-v db_*` 指向一次性环境。
- 新接口必须保留 token、RBAC、审批和公司边界校验；Swagger 文档登录不能替代业务接口自身的权限检查。
- 安装脚本会启动 privileged 容器和 Wetty Web 终端，设备版还可能开放 SSH/frpc。部署到公网前需由运维确认访问控制和端口暴露，不要为了调试额外开放这些入口。

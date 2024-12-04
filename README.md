# mobile_trade

## 本地编码环境搭建

1. 在本地计算机安装docker，安装方法参考docker官网https://www.docker.com/
2. 拉取代码到本地`git clone https://github.com/marklion/mobile_trade.git`
3. 用vscode打开本地`mobile_trade目录`
4. 点击在容器中打开文件夹
5. 执行命令`Python Create Enviroment`,选择venv
6. 在创建好的Python虚拟环境中安装依赖：`pip install -r automation/require.txt`

![image](https://github.com/user-attachments/assets/17a4e8de-8d79-4dc7-b0fd-cbd715a9e022)

## CodeSpace编码环境搭建

1. 在github上的代码仓库界面直接进入codespace，若没有先创建
2. 等待codespace初始化完成
3. 执行命令`Python Create Enviroment`,选择venv
4. 在创建好的Python虚拟环境中安装依赖：`pip install -r automation/require.txt`

## IDE内调试

无论本地编码环境还是CodeSpace环境，都可以在VSCode内进行调试，调试时的系统表现如下

+ 后端程序运行在IDE对应的Docker容器内
+ 前端的API请求都会发到容器内的后端程序
+ 前端的文件上传下载请求都会发到项目的平台公网部署地址
+ 数据会存储在调试过程中指定的Sql中

### 调试手机页面

1. [启动后端](#启动后端)
2. 打开终端，进入mt_gui目录
3. 执行`npm run serve`

等待须臾后浏览器会弹出手机界面

### 调试PC页面

1. [启动后端](#启动后端)
2. 打开终端，进入mt_pc目录
3. 执行`npm run dev`

等待须臾后浏览器会弹出PC界面

### 调试自动化测试

1. [启动后端](#启动后端)，要指定purpose为2
2. 进入任一robot文件，点击用例旁边的运行键可以运行指定测试用例
3. 打开VSCode的测试工具栏，可以运行指定的测试用例或用例集

### 启动后端

1. 按`F5`或在VSCode工具栏找到调试并启动，此时系统会先执行构建，构建完毕终端输出提示信息：`Please select the purpose of the debug to run:`
2. 根据实际情况选择1或2（只有在调试自动化脚本时选择2，其余情况选择1）
3. 按照提示依次输入Sql的用户名密码后，后端程序就会在当前调试上下文启动，此时可以在后端代码上打断点调试。

## 部署

### 条件

+ 已经成功创建小程序，获取到小程序`MP_APPID`和`MP_SECKEY`
+ 已经创建好公众号，获取到公众号`PUB_APPID`和`PUB_SECKEY`
+ 已经搭建好拥有域名为`DOMAIN_NAME`的主机并开放443端口访问

### OEM构建

在终端中执行`make -j 8 ENV_REMOTE_HOST="https://${DOMAIN_NAME}" ENV_MP_APPID=${MP_APPID} ENV_PUB_APPID=${PUB_APPID}`

完成后得到两个交付件：

+ 后端程序包：`build/install.sh`
+ 小程序包：`build/mp-weixin`

### 部署环境准备（首次部署）

```bash
#1. 进入DOMAIN_NAME主机，并创建工作目录work后进入该目录
~$ ssh someuser@DOMAIN_NAME
someuser@DOMAIN_NAME:~# mkdir work
someuser@DOMAIN_NAME:~# cd work

#2. 创建脚本文件mt_start.sh并添加可执行权限chmod +x mt_start.sh
someuser@DOMAIN_NAME:~/work# cat <<'EOF' >> mt_start.sh
#!/bin/bash
db_name='your DB name'
db_user='your DB user'
db_pass='your DB password'
db_host='your DB host'
DB_PARAM="-U ${db_user} -T ${db_pass} -D ${db_name} -H ${db_host}"
mp_sec='-m MP_SECKEY -w PUB_SECKEY'
DC_CON_ID=$(./install.sh -p 443 $mp_sec ${DB_PARAM})
docker logs ${DC_CON_ID}
docker exec -ti ${DC_CON_ID} bash
docker rm -f ${DC_CON_ID}
EOF

#3. 拉取运行所依赖的docker镜像后重命名镜像
someuser@DOMAIN_NAME:~/work# docker pull marklion/mt_deploy:v1.0
someuser@DOMAIN_NAME:~/work# docker tag marklion/mt_deploy:v1.0 mt_deploy:v1.0

```

### 后端部署

1. 拷贝后端程序包到工作目录`work`
2. 进入`work`，执行`./mt_start.sh`
3. 此时，系统会启动一个docker容器，并在容器中启动端程序。当前命令行已经切换到容器内部，可以执行`pm2 logs` 查看后端程序日志
4. 执行`exit`即可关闭并退出后端程序

### 小程序部署

1. 用微信开发工具打开`build/mp-weixin`
2. 在工具内预览和上传小程序

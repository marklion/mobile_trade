# mobile_trade

## 编码环境搭建

1. 在本地计算机安装docker，安装方法参考docker官网https://www.docker.com/
2. 拉取代码到本地`git clone https://github.com/marklion/mobile_trade.git`
3. 用vscode打开本地`mobile_trade目录`
4. 点击在容器中打开文件夹

![image](https://github.com/user-attachments/assets/17a4e8de-8d79-4dc7-b0fd-cbd715a9e022)

## 构建方法

### 后端构建

直接在vscode终端执行make即可

![image](https://github.com/user-attachments/assets/63f9f942-f3ba-4284-a102-82a23183a754)

make执行完之后，后端程序包是`项目根目录/build/install.sh`

### 前端构建

用uniapp的hbuilder打开`项目根目录/mt_gui`,点击菜单栏的运行，根据实际情况运行到浏览器或小程序模拟器即可

## 测试环境部署

### 后端部署

#### 环境准备

1. 进入类linux系统环境（可以是windows的WSL2环境、linux虚拟机或mac环境）并创建工作目录
2. 进入步骤1的目录，创建脚本文件`mt_start.sh`并添加可执行权限`chmod +x mt_start.sh`
3. 执行命令`docker pull marklion/mt_deploy:v1.0`拉取运行所依赖的docker镜像，执行`docker tag marklion/mt_deploy:v1.0 mt_deploy:v1.0`重命名镜像
4. 打开步骤2的文件，添加如下内容并保存

```bash
#!/bin/bash
for_test=$1
mp_sec='-m 95d3081c86858a974c601457e5270384'
if [ "${for_test}" != "" ]
then
	mp_sec=''
fi
DC_CON_ID=$(./install.sh -p 44510 $mp_sec)
docker exec -ti ${DC_CON_ID} bash
docker rm -f ${DC_CON_ID}
```

#### 数据准备

1. 跟管理员（刘洋）索要数据库文件mt.db
2. 将数据库文件放置到工作目录中

#### 程序部署

1. 拷贝后端程序包到工作目录
2. 进入工作目录，执行`./mt_start.sh`
3. 此时，系统会启动一个docker容器，并在容器中启动端程序。当前命令行已经切换到容器内部，可以执行`pm2 logs` 查看后端程序日志
4. 执行`exit`即可关闭并退出后端程序

### 前端部署

执行前端构建时即完成前端部署




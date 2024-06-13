# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.191.1/containers/ubuntu/.devcontainer/base.Dockerfile

# [Choice] Ubuntu version: bionic, focal
ARG VARIANT="focal"
FROM ubuntu:${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y cmake wget libpython3-dev npm sqlite3 libsqlite3-dev uuid uuid-dev libcurl4-openssl-dev automake bison flex g++ git libboost-all-dev libevent-dev libssl-dev libtool make pkg-config
RUN npm install n -g
RUN n v18.17.0
RUN npm install pkg -g
WORKDIR /root/
RUN mkdir thrift_dir
COPY thrift-0.14.1.tar.gz ./thrift_dir/
SHELL ["/bin/bash", "-c"]
RUN pushd thrift_dir;tar xf thrift-0.14.1.tar.gz;pushd thrift-0.14.1 ;./configure --prefix=/usr --without-ruby --without-java --without-go --without-erlang --without-perl --without-qt5 --without-lua --without-php --without-nodejs --without-php_extension && make -j 8 && make install;popd;popd
ENV TIME_ZONE=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TIME_ZONE /etc/localtime && echo $TIME_ZONE > /etc/timezone
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
COPY nginx_upload_install.sh /root/
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y libpcre3 libpcre3-dev libxslt-dev libgd-dev
RUN ./nginx_upload_install.sh
COPY lib/* /lib
RUN apt update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y gcc-multilib build-essential module-assistant
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y libmodbus-dev gdb
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y libmodbus-dev nodejs
RUN npm install -g pm2
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y vim valgrind
COPY frpc* /bin/
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y rsync python3-pip
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y cups
RUN npm install -g yarn && yarn global add wetty
RUN echo 'root:P@ssw0rd' | chpasswd
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y net-tools
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ssh lsof
RUN echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt install -y language-pack-zh-hans
RUN export LANGUAGE="zh_CN:zh:en_US:en"
RUN export LANG="zh_CN.UTF-8"
RUN npm install -g wetty@2.3.0 --force
RUN npm install --global sqlite3
RUN npm install --global puppeteer
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libgbm-dev libxdamage1
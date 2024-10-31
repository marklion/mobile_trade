#!/bin/bash
WECHAT_SECRET_INPUT="none"
WECHAT_MP_SECRET_INPUT="none"
PORT=""
DATA_BASE="mt.db"
OLD_DATA_PATH="/tmp"
SHARE_KEY_INPUT=""
DOCKER_IMG_NAME="mt_deploy:v1.0"
DEFAULT_PWD_INPUT="_P@ssw0rd_"
SRC_DIR=`dirname $(realpath $0)`/../
DB_NAME_INPUT='test4delay'
DB_USER_INPUT='sysadmin'
DB_PASS_INPUT='no_pass'
DB_HOST_INPUT='localhost'
is_in_container() {
    ls /.dockerenv >/dev/null 2>&1
}

make_docker_img_from_dockerfile() {
    docker build -t ${DOCKER_IMG_NAME} ${SRC_DIR}/.devcontainer/
}

get_docker_image() {
    docker images ${DOCKER_IMG_NAME} | grep mt_deploy > /dev/null
    if [ $? != 0 ]
    then
        make_docker_img_from_dockerfile
    fi
}

start_all_server() {
    line=`wc -l $0|awk '{print $1}'`
    line=`expr $line - 131`
    mkdir /tmp/sys_mt
    tail -n $line $0 | tar zx  -C /tmp/sys_mt/
    rsync -aK /tmp/sys_mt/ /
    cp /conf/ngx_http_flv_live_module.so /lib/nginx/modules/
    chown -R 'www-data' /mt_pc
    nginx -c /conf/nginx.conf
    service cups start
    wetty &
    ulimit -c unlimited
    sysctl -w kernel.core_pattern=/database/core.%e.%p.%s.%E
    ulimit -c
    ulimit -q 819200000
    echo 'export LANG=zh_CN.UTF-8' >> ~/.bashrc
    echo 'export LC_ALL=zh_CN.UTF-8' >> ~/.bashrc
    cp /conf/*.xlsx /database/uploads/
    mysql -h "${DB_HOST}" -u "${DB_USER}" --password="${DB_PASS}" -e "CREATE DATABASE ${DB_NAME}"
    mysql -h "${DB_HOST}" -u "${DB_USER}" --password="${DB_PASS}" -e "SHOW DATABASES"
    pushd /api
    # pm2 --node-args="--inspect=0.0.0.0:9229" start index.js
    pm2 start index.js
    popd
    if [ 'none' == ${MP_SECRET} ]
    then
        /script/timer.sh &
    fi
    while true
    do
        sleep 1000
    done
}

start_docker_con() {
    local DATA_BASE_PATH=`realpath $DATA_BASE`
    local DATA_BASE_PATH=`dirname ${DATA_BASE_PATH}`
    local MOUNT_PROC_ARG=''
    if [ -d /proc ]
    then
        MOUNT_PROC_ARG='-v /proc:/host/proc'
    fi
    local PORT_ARG="-p ${PORT}:80"
    if [ "$PORT" == "" ]
    then
        PORT_ARG=""
    fi
    local CON_ID=`docker create --privileged ${MOUNT_PROC_ARG} --restart=always ${PORT_ARG} -e DB_HOST="${DB_HOST_INPUT}" -e DB_NAME="${DB_NAME_INPUT}" -e DB_USER="${DB_USER_INPUT}" -e DB_PASS="${DB_PASS_INPUT}" -e WECHAT_SECRET="${WECHAT_SECRET_INPUT}" -e SHARE_KEY="${SHARE_KEY_INPUT}" -e MP_SECRET="${WECHAT_MP_SECRET_INPUT}"   -v ${OLD_DATA_PATH}:/database/logo_res -e DEFAULT_PWD="${DEFAULT_PWD_INPUT}" -v ${DATA_BASE_PATH}:/database ${DOCKER_IMG_NAME} /root/install.sh`
    docker cp $0 ${CON_ID}:/root/ > /dev/null 2>&1
    docker start ${CON_ID} > /dev/null 2>&1
    echo ${CON_ID}
}

while getopts "p:w:d:m:h:P:U:T:D:H:" arg
do
    case $arg in
        p)
            PORT=${OPTARG}
            ;;
        w)
            WECHAT_SECRET_INPUT=${OPTARG}
            ;;
        m)
            WECHAT_MP_SECRET_INPUT=${OPTARG}
            ;;
        d)
            OLD_DATA_PATH=${OPTARG}
            ;;
        h)
            SHARE_KEY_INPUT=${OPTARG}
            ;;
        P)
            DEFAULT_PWD_INPUT=${OPTARG}
            ;;
        U)
            DB_USER_INPUT=${OPTARG}
            ;;
        T)
            DB_PASS_INPUT=${OPTARG}
            ;;
        D)
            DB_NAME_INPUT=${OPTARG}
            ;;
        H)
            DB_HOST_INPUT=${OPTARG}
            ;;
        *)
            echo "invalid args"
            ;;
    esac
done

if is_in_container
then
    start_all_server
else
    get_docker_image
    start_docker_con
fi

#
exit

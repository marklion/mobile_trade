#!/bin/bash
WECHAT_SECRET_INPUT="none"
WECHAT_MP_SECRET_INPUT="none"
MAIL_PWD_INPUT="none"
OPEN_SSH_PORT_INPUT=""
PORT=""
DATA_BASE="mt.db"
ALI_KEY_ID_INPUT="none"
ALI_KEY_SEC_INPUT="none"
DOCKER_IMG_NAME="mt_deploy:v1.0"
SRC_DIR=`dirname $(realpath $0)`/../

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
    line=`expr $line - 116`
    mkdir /tmp/sys_mt
    tail -n $line $0 | tar zx  -C /tmp/sys_mt/
    rsync -aK /tmp/sys_mt/ /
    cp /conf/ngx_http_flv_live_module.so /lib/nginx/modules/
    nginx -c /conf/nginx.conf
    service cups start
    wetty &
    ulimit -c unlimited
    sysctl -w kernel.core_pattern=/database/core.%e.%p.%s.%E
    ulimit -c
    ulimit -q 819200000
    echo 'export LANG=zh_CN.UTF-8' >> ~/.bashrc
    echo 'export LC_ALL=zh_CN.UTF-8' >> ~/.bashrc
    pushd /api
    pm2 start index.js
    popd
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
    local SSH_PORT_ARG="-p 8222:22"
    if [ "$PORT" == "" ]
    then
        PORT_ARG=""
    fi
    if [ "${OPEN_SSH_PORT_INPUT}" == "" ]
    then
        SSH_PORT_ARG=""
    fi
    local CON_ID=`docker create --privileged ${MOUNT_PROC_ARG} --restart=always ${PORT_ARG} ${SSH_PORT_ARG} -e WECHAT_SECRET="${WECHAT_SECRET_INPUT}" -e WECHAT_MP_SECRET="${WECHAT_MP_SECRET_INPUT}" -e ALI_KEY_ID="${ALI_KEY_ID_INPUT}" -e ALI_KEY_SEC="${ALI_KEY_SEC_INPUT}" -e MAIL_PWD="${MAIL_PWD_INPUT}" -v ${DATA_BASE_PATH}:/database ${DOCKER_IMG_NAME} /root/install.sh`
    docker cp $0 ${CON_ID}:/root/ > /dev/null 2>&1
    docker start ${CON_ID} > /dev/null 2>&1
    echo ${CON_ID}
}

while getopts "sD:p:w:d:i:m:a:k:M:g:b:o:O:u:" arg
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
        M)
            MAIL_PWD_INPUT=${OPTARG}
            ;;
        a)
            ALI_KEY_ID_INPUT=${OPTARG}
            ;;
        k)
            ALI_KEY_SEC_INPUT=${OPTARG}
            ;;
        s)
            OPEN_SSH_PORT_INPUT="true"
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

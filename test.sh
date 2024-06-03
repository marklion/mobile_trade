#!/bin/bash
CUR_DIR=$(realpath $(dirname $0))
pushd ${CUR_DIR}/build
DC_CON_ID=$(./install.sh)
docker exec  ${DC_CON_ID} bash -c 'pip install -r /automation/require.txt ; robot -d /database -v "server_base:http://localhost:8080/api/v1" -v "server_db:/database/mt.db" /automation'
EX_RETURN=$?
docker rm -f ${DC_CON_ID}
exit $EX_RETURN

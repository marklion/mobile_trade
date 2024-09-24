#!/bin/bash
DB_NAME=automation_test
DB_HOST="${2}"
DB_USER='sysadmin'
DB_PASS="${1}"
CUR_DIR=$(realpath $(dirname $0))
pushd ${CUR_DIR}/build
DC_CON_ID=$(./install.sh -H ${DB_HOST} -D ${DB_NAME} -U ${DB_USER} -T ${DB_PASS})
sleep 30
docker logs ${DC_CON_ID} -n 1000
docker exec  ${DC_CON_ID} bash -c 'pm2 logs --lines 1000 --nostream'
docker exec  ${DC_CON_ID} bash -c "pip install -r /automation/require.txt ; robot -d /database -v \"server_base:http://localhost:8080/api/v1\" -v \"db_name:${DB_NAME}\" -v \"db_host:${DB_HOST}\" -v \"db_user:${DB_USER}\" -v \"db_pass:${DB_PASS}\" /automation"
EX_RETURN=$?
docker exec  ${DC_CON_ID} bash -c "mysql -h ${DB_HOST} -u ${DB_USER} --password=${DB_PASS} -e \"DROP DATABASE ${DB_NAME};\""
docker rm -f ${DC_CON_ID}
exit $EX_RETURN

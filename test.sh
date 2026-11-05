#!/bin/bash
DB_NAME="${3:-automation_test}"
DB_HOST="${2}"
DB_USER='sysadmin'
DB_PASS="${1}"
SHARD="${4:-all}"
CUR_DIR=$(realpath $(dirname $0))

case "${SHARD}" in
    1)
        TEST_SUITES=(
            /automation/stuff/plan_standard.robot
        )
        ;;
    2)
        TEST_SUITES=(
            /automation/stuff/plan_exception.robot
            /automation/stuff/plan_balance_verify.robot
        )
        ;;
    3)
        TEST_SUITES=(
            /automation/approval/approval_flow.robot
            /automation/approval/group_member_order_permission.robot
            /automation/bidding/bidding_config.robot
            /automation/group/group_contract_price_strategy.robot
            /automation/safe_check/sc_config.robot
            /automation/stuff/region_capacity.robot
            /automation/wx_msg/wx_msg.robot
        )
        ;;
    4)
        TEST_SUITES=(
            /automation/bidding/bidding_exception.robot
            /automation/black_list/black_list.robot
            /automation/exam/exam.robot
            /automation/group/group_manage.robot
            /automation/group/group_contract_member_flow.robot
            /automation/rbac/company_admin.robot
            /automation/rbac/super_user_curd.robot
            /automation/safe_check/sc_plan_link.robot
            /automation/stuff/stuff_curd.robot
            /automation/stuff/stuff_new_price.robot
            /automation/stuff/subsidy.robot
        )
        ;;
    all)
        TEST_SUITES=(/automation)
        ;;
    *)
        echo "Unknown test shard: ${SHARD}"
        exit 2
        ;;
esac

pushd ${CUR_DIR}/build
DC_CON_ID=$(./install.sh -H ${DB_HOST} -D ${DB_NAME} -U ${DB_USER} -T ${DB_PASS})
sleep 30
docker logs ${DC_CON_ID} -n 1000
docker exec  ${DC_CON_ID} bash -c 'pm2 logs --lines 1000 --nostream'
docker exec  ${DC_CON_ID} bash -c "pip install -r /automation/require.txt && robot -d /database -v \"server_base:http://localhost:8080/api/v1\" -v \"db_name:${DB_NAME}\" -v \"db_host:${DB_HOST}\" -v \"db_user:${DB_USER}\" -v \"db_pass:${DB_PASS}\" ${TEST_SUITES[*]}"
EX_RETURN=$?
docker exec  ${DC_CON_ID} bash -c "mysql -h ${DB_HOST} -u ${DB_USER} --password=${DB_PASS} -e \"DROP DATABASE ${DB_NAME};\""
docker rm -f ${DC_CON_ID}
exit $EX_RETURN

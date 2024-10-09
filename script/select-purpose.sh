#!/bin/bash
echo "Please select the purpose of the debug to run:"
echo "1. Debug (defualt)"
echo "2. Automation Test"
read purpose

DEFAULT_PWD='_P@ssw0rd_'
DB_HOST='rm-2ze6222dda7fe8427eo.mysql.rds.aliyuncs.com'
DB_USER='some user'
DB_PASS='some password'
DB_NAME='yst_day'
MP_SECRET='95d3081c86858a974c601457e5270384'
if [ "${purpose}" == 2 ]
then
    DB_NAME="test_$(date +%Y%m%d%H%M%S)"
    MP_SECRET='none'
    mysql -h "${DB_HOST}" -u "${DB_USER}" --password="${DB_PASS}" -e "CREATE DATABASE ${DB_NAME}"
    sed -i '/${db_name}/c\${db_name}'"  ${DB_NAME}"  automation/var.resource
    sed -i '/${db_host}/c\${db_host}'"  ${DB_HOST}"  automation/var.resource
    sed -i '/${db_user}/c\${db_user}'"  ${DB_USER}"  automation/var.resource
    sed -i '/${db_pass}/c\${db_pass}'"  ${DB_PASS}"  automation/var.resource
fi
echo "DB_HOST=${DB_HOST}" > /tmp/purpose.env
echo "DB_USER=${DB_USER}" >> /tmp/purpose.env
echo "DB_PASS=${DB_PASS}" >> /tmp/purpose.env
echo "DB_NAME=${DB_NAME}" >> /tmp/purpose.env
echo "MP_SECRET=${MP_SECRET}" >> /tmp/purpose.env
echo "DEFAULT_PWD=${DEFAULT_PWD}" >> /tmp/purpose.env
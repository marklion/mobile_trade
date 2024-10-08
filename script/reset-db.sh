#!/bin/bash
DB_NAME=`cat /tmp/purpose.env | grep 'test_' | grep 'DB_NAME' | awk -F '=' '{print $2}'`
DB_HOST=`cat /tmp/purpose.env | grep 'DB_HOST' | awk -F '=' '{print $2}'`
DB_USER=`cat /tmp/purpose.env | grep 'DB_USER' | awk -F '=' '{print $2}'`
DB_PASS=`cat /tmp/purpose.env | grep 'DB_PASS' | awk -F '=' '{print $2}'`
if [ "${DB_NAME}" != "" ]
then
    mysql -h ${DB_HOST} -u ${DB_USER} --password=${DB_PASS} -e "DROP DATABASE ${DB_NAME};"
    sed -i '/${db_name}/c\${db_name}'  automation/var.resource
    sed -i '/${db_host}/c\${db_host}'  automation/var.resource
    sed -i '/${db_user}/c\${db_user}'  automation/var.resource
    sed -i '/${db_pass}/c\${db_pass}'  automation/var.resource
fi
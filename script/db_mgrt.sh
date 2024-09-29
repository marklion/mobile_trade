#!/bin/bash

SQLITE_DB_FILE=""
MYSQL_HOST=""
MYSQL_USER=""
MYSQL_PASS=""
MYSQL_DB=""

print_help() {
    echo "Usage: $0 -i <sqlite_db_file> -u <mysql_user> -p <mysql_pass> -h <mysql_host> -d <mysql_db>"
    echo "  -i: sqlite db file"
    echo "  -u: mysql user"
    echo "  -p: mysql password"
    echo "  -h: mysql host"
    echo "  -d: mysql db"
}
# 获取命令行参数
while getopts "i:u:p:h:d:" opt; do
    case $opt in
        i) SQLITE_DB_FILE="$OPTARG"
        ;;
        u) MYSQL_USER="$OPTARG"
        ;;
        p) MYSQL_PASS="$OPTARG"
        ;;
        h) MYSQL_HOST="$OPTARG"
        ;;
        d) MYSQL_DB="$OPTARG"
        ;;
        \?) echo "Invalid option -$OPTARG" >&2
        ;;
    esac
done
echo "SQLITE_DB_FILE=$SQLITE_DB_FILE, MYSQL_USER=$MYSQL_USER, MYSQL_PASS=$MYSQL_PASS, MYSQL_HOST=$MYSQL_HOST, MYSQL_DB=$MYSQL_DB"
if [ -z "$SQLITE_DB_FILE" ] || [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_PASS" ] || [ -z "$MYSQL_HOST" ] || [ -z "$MYSQL_DB" ]; then
    print_help
    exit 1
fi

data_move() {
    echo "data_move"
    sqlite3mysql -f ${SQLITE_DB_FILE} -d  ${MYSQL_DB}  -u ${MYSQL_USER}  --mysql-password ${MYSQL_PASS} -h ${MYSQL_HOST} -E -K -c 1000 -S
}
data_move

cp /mnt/data/mobile_trade/mt.db ./mt_old.db
sqlite3mysql -f ./mt_old.db -d product  -u sysadmin  --mysql-password P@ssw0rd -h rm-2ze6222dda7fe8427eo.mysql.rds.aliyuncs.com -E -K -c 1000 -S
cp /mnt/data/mobile_trade/mt.db ./mt_new.db
sqldiff mt_old.db mt_new.db > mt_diff.sql
cat mt_diff.sql | grep -v 'sqlite_seq' | sed 's/rowid,[0-9]*,//g' | sed 's/"plan"/plan/g' | sed 's/\\n/\\\\n/g' | sed 's/ +00:00//g' > filtered_mt_diff.sql
cp filtered_mt_diff.sql current.sql
function push_sql() {
    rm -f next.sql
    cat $1 | while read -r line
    do
        mysql -h rm-2ze6222dda7fe8427.mysql.rds.aliyuncs.com -u sysadmin --password=P@ssw0rd -e "${line}" product > /dev/null 2>&1
        if  [ $? -ne 0 ]; then
            echo "$line" >> next.sql
        fi
    done
    echo ++++
    cat next.sql
    input_lines=`cat $1 | wc -l`
    last_lines="0"
    if [ -f next.sql ]
    then
        last_lines=`cat next.sql | wc -l`
    fi
    echo ++++
    echo "input_lines=$input_lines, last_lines=$last_lines"
    if [ "${last_lines}" == "0" ] || [ ${input_lines} == ${last_lines} ]
    then
        echo "done"
    else
        cp next.sql $1
        push_sql $1
    fi
}
push_sql current.sql

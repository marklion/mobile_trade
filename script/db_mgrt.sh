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


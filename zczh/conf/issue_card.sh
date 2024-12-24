#!/bin/bash
# 检查参数数量
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <host:port> <values>"
    exit 1
fi
echo "insert into card_record values(${2});"
sqlcmd -S ${1}  -U zczh -P P@ssw0rd -d card_record -Q "insert into card_record values(${2});"


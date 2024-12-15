#!/bin/bash
# 检查参数数量
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <values>"
    exit 1
fi
echo "insert into card_record values(${1});"
sqlcmd -S 10.99.90.12:51433  -U zczh -P P@ssw0rd -d card_record -Q "\"insert into card_record values(${1});\""


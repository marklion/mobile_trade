#!/bin/bash
# 检查参数数量
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <host:port> <values>"
    exit 1
fi



IFS=',' read -r order_number card_number _ _ _ _ _ set_load _ <<< "${2}"
set_load="${set_load//[[:space:]]/}"
set_load="${set_load//\'/}"

sqlcmd -S ${1} -U sa -P sbk -d '现场库' -Q "insert into dbo.que ([装车单号], [ic卡号], [鹤位组号],[装车设定量],[装卸模式]) values(${order_number}, ${card_number}, 1, ${set_load}, '装车');" >> /tmp/issue_card.log 2>&1
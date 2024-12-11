#!/bin/bash
# 检查参数数量
if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <host> <port> <username> <password> <sql>"
    exit 1
fi

# 连接SQL Server并执行语句
# 请替换<sqlserver_address>, <username>, <password>, <database>为您的SQL Server信息
SQLCMD_OUTPUT=$(sqlcmd -S ${1}  -U ${2} -P ${3} -d ${4} -Q "${5}")

# 检查执行结果
if [ $? -eq 0 ]; then
    echo "SQL statement executed successfully."
else
    echo "Failed to execute SQL statement."
    echo "$SQLCMD_OUTPUT"
fi

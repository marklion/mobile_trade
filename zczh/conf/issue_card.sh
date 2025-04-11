#!/bin/bash
# 检查参数数量
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <host:port> <values>"
    exit 1
fi
echo "insert into card_record values(${2});"
sqlcmd -S ${1} -U zczh -P P@ssw0rd -d NeoTAS_V3_Sync -Q "insert into dbo.tas_LoadRecord (SerialNo, CardNo, TruckNo, TrailerNo,DeliverCompany, Driver, TareWeight, SetLoad, OrderTime, UserData7,LoadStatus) values(${2}, '1', '1001');" >> /tmp/issue_card.log 2>&1
#!/bin/bash
# this script should deployed on the public server and run under nohup command:
# nohup ./VPN_monitor.sh <container_name> &
#     container_name: the name or md5-value of the docker container running the VPN
while (true)
do
    nc -zvu localhost 500
    if [ $? -eq 0 ]; then
        echo "VPN is connected"
    else
        echo "VPN is not connected"
        docker restart $1
    fi
    sleep 60
done

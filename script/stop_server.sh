#!/bin/bash
pm2 stop 0
kill -9  $(ps ax | grep sleep | grep -v grep | awk '{print $1}')
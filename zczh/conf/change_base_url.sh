#!/bin/bash
sed -i "5a[web${1}]" ${2}
sed -i "8asubdomain = ${1}" ${2}

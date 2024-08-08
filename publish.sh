#!/bin/bash
#1 获取远程仓库中的最新tag，如果不存在则认为最新tag是V2.5
#2 把当前当前分支打上tag并推动到远程仓库，tag的命名规则为V2.5.1
git fetch --tags
latestTag=$(git describe --tags `git rev-list --tags --max-count=1`)
if [ -z "$latestTag" ]; then
  latestTag=V2.5
fi
echo "latestTag is $latestTag"
nextTag=$(echo $latestTag | awk -F '.' '{print $1 "." $2 "." $3+1}')
echo "nextTag is $nextTag"
git tag $nextTag
git push origin $nextTag
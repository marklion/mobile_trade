#!/bin/bash
echo "frontend_deploy.sh"
npm install -g miniprogram-ci
pushd ./mt_gui/
n 16.8.0
yarn install
npm run build:mp-weixin
popd
pushd ./mt_gui/dist/build/
VNAME=${1:1}
miniprogram-ci upload --pp ./mp-weixin --pkp ../../../upload.key --uv ${VNAME} --appid wxfbf41c757510dc4c --use-project-config true -r 1
popd
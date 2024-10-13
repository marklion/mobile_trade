SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
all:
	pushd $(SRC_DIR); n 16.8.0 && yarn install && npm run build:mp-weixin; n 18.17.0;
clean:
	rm -rf $(SRC_DIR)/dist

.PHONY:all clean
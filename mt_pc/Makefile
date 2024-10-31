SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
all:
	pushd $(SRC_DIR); npm install && npm run build:prod;
clean:
	rm -rf $(SRC_DIR)/build
	rm -rf $(SRC_DIR)/node_modules
	rm -rf $(SRC_DIR)/last-build-time.txt
	rm -rf $(SRC_DIR)/package-lock.json

.PHONY:all clean
SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
all:$(SRC_DIR)/node_modules
	pushd $(SRC_DIR); npm run build:prod;
$(SRC_DIR)/node_modules:$(SRC_DIR)/package.json
	pushd $(SRC_DIR); npm install;
clean:
	rm -rf $(SRC_DIR)/build
	rm -rf $(SRC_DIR)/node_modules
	rm -rf $(SRC_DIR)/last-build-time.txt
	rm -rf $(SRC_DIR)/package-lock.json

.PHONY:all clean
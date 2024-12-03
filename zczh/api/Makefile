SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
all:$(DELIVER_PATH)
$(SRC_DIR)/node_modules:$(SRC_DIR)/package.json
	pushd $(SRC_DIR); npm install;
$(DELIVER_PATH):$(SRC_DIR)/node_modules
	pushd $(SRC_DIR); npm run build;

clean:
	rm -rf $(DELIVER_PATH)
	rm -rf $(SRC_DIR)/node_modules
	rm -rf $(SRC_DIR)/package-lock.json

.PHONY:all $(DELIVER_PATH) clean
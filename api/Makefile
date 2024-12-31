SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
all:$(DELIVER_PATH)
$(DELIVER_PATH):$(DELIVER_PATH)/api/index.js
$(SRC_DIR)/node_modules:$(SRC_DIR)/package.json
	pushd $(SRC_DIR); npm install;

$(DELIVER_PATH)/api/index.js:$(SRC_DIR)/node_modules *.js module/*.js lib/*.js plugin/*.js gen_code/*.js
	pushd $(SRC_DIR); npm run build;
clean:
	rm -rf $(DELIVER_PATH)
	rm -rf $(SRC_DIR)/node_modules
	rm -rf $(SRC_DIR)/gen_code
.PHONY:all clean
SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
all:$(DELIVER_PATH)
$(DELIVER_PATH):$(DELIVER_PATH)/api/index.js

$(DELIVER_PATH)/api/index.js:*.js module/*.js lib/*.js
	pushd $(SRC_DIR); npm install && npm run build;

clean:
	rm -rf $(DELIVER_PATH)

.PHONY:all clean
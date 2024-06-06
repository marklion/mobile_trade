SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
NODE_REST_SEVER=$(SRC_DIR)/../api/gen_code
$(NODE_REST_SEVER):$(SRC_DIR)/idl.thrift
	rm -rf $(NODE_REST_SEVER)
	mkdir $(NODE_REST_SEVER)
	thrift -out $(NODE_REST_SEVER) --gen js:node $^

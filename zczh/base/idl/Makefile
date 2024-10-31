SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
OUT_CODE_PATH=$(SRC_DIR)/gen_code

all:$(OUT_CODE_PATH)
	mkdir -p $(SRC_DIR)/node_gen_code
	cp $(OUT_CODE_PATH)/node/* $(SRC_DIR)/node_gen_code/
	cp -a $(SRC_DIR)/node_gen_code $(DELIVER_PATH)/lib/

$(OUT_CODE_PATH):$(OUT_CODE_PATH)/cpp $(OUT_CODE_PATH)/js $(OUT_CODE_PATH)/node

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir $(DELIVER_PATH)
	[ -d $(DELIVER_PATH)/bin ] || mkdir $(DELIVER_PATH)/bin
	[ -d $(DELIVER_PATH)/lib ] || mkdir $(DELIVER_PATH)/lib

$(OUT_CODE_PATH)/cpp:$(SRC_DIR)/idl.thrift $(DELIVER_PATH)
	[ -d $@ ] || mkdir -p $@
	thrift -out $@ --gen cpp:no_skeleton $(SRC_DIR)/idl.thrift
	[ -d $@/build ] || mkdir $@/build
	pushd $@/build;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) $(SRC_DIR); $(MAKE)

$(OUT_CODE_PATH)/js:$(SRC_DIR)/idl.thrift
	[ -d $@ ] || mkdir -p $@
	thrift -out $@ --gen js:es6 $^

$(OUT_CODE_PATH)/node:$(SRC_DIR)/idl.thrift
	[ -d $@ ] || mkdir -p $@
	thrift -out $@ --gen js:node $^

clean:
	rm -rf $(OUT_CODE_PATH)
	rm -rf $(DELIVER_PATH)
	rm -rf $(SRC_DIR)/node_gen_code

.PHONY: all clean
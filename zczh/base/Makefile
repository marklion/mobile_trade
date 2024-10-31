SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
SUB_DIR=db_orm utils idl file_up_down zyzl_plugin serial_link

all:$(SUB_DIR)
	for component in $^;do [ -d $$component/build ] && cp -a $$component/build/* $(DELIVER_PATH)/; done

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir $(DELIVER_PATH)
	[ -d $(DELIVER_PATH)/bin ] || mkdir $(DELIVER_PATH)/bin
	[ -d $(DELIVER_PATH)/lib ] || mkdir $(DELIVER_PATH)/lib

db_orm:$(DELIVER_PATH) utils
	[ -d $(SRC_DIR)/$(@)/build ] || mkdir $(SRC_DIR)/$@/build
	pushd $(SRC_DIR)/$@/build;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) ../; $(MAKE)
utils:$(DELIVER_PATH)
	[ -d $(SRC_DIR)/$(@)/build ] || mkdir $(SRC_DIR)/$@/build
	pushd $(SRC_DIR)/$@/build;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) ../; $(MAKE)
file_up_down:$(DELIVER_PATH) db_orm utils
	[ -d $(SRC_DIR)/$(@)/build ] || mkdir $(SRC_DIR)/$@/build
	pushd $(SRC_DIR)/$@/build;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) ../; $(MAKE)
zyzl_plugin:$(DELIVER_PATH) utils db_orm
	[ -d $(SRC_DIR)/$(@)/build ] || mkdir $(SRC_DIR)/$@/build
	pushd $(SRC_DIR)/$@/build;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) ../; $(MAKE)
serial_link:$(DELIVER_PATH)
	[ -d $(SRC_DIR)/$(@)/build ] || mkdir $(SRC_DIR)/$@/build
	pushd $(SRC_DIR)/$@/build;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) ../; $(MAKE)
idl:
	$(MAKE) -C $(SRC_DIR)/$@

clean:
	rm -rf $(DELIVER_PATH)
	make clean -C $(SRC_DIR)/idl
	for sub_component in $(SUB_DIR); do rm -rf $(SRC_DIR)/$$sub_component/build;done

.PHONY:all $(SUB_DIR) $(DELIVER_PATH) clean
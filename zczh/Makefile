SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
SUB_DIR=base service api conf
BUILD_MODE=build
export BUILD_MODE

pack:all
	date '+%Y-%m-%d %H:%M:%S' > $(DELIVER_PATH)/conf/version.txt
	tar zcf zh_deliver.tar.gz -C $(DELIVER_PATH) bin lib conf api
	cat $(SRC_DIR)/deploy.sh zh_deliver.tar.gz > $(DELIVER_PATH)/install.sh
	chmod +x $(DELIVER_PATH)/install.sh
	rm zh_deliver.tar.gz

all:$(DELIVER_PATH)

$(DELIVER_PATH):$(SUB_DIR)
	[ -d $@ ] || mkdir $@
	for component in $^;do [ -d $(SRC_DIR)/$$component/build ] && cp -a $(SRC_DIR)/$$component/build/* $@/ || echo no_assert; done

$(SUB_DIR):
	$(MAKE) -C $(SRC_DIR)/$@

zh_back:zh_pub zh_external

zh_front:zh_pub zh_external

service:base
api:base

clean:
	rm -rf $(DELIVER_PATH)
	for sub_component in $(SUB_DIR); do make clean -C $(SRC_DIR)/$$sub_component;done

.PHONY:all $(SUB_DIR) $(DELIVER_PATH) clean pack
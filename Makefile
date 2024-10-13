SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
SUB_DIR=api conf script automation lag_rpc mt_gui
BUILD_MODE=build
export BUILD_MODE

pack:all
	date '+%Y-%m-%d %H:%M:%S' > $(DELIVER_PATH)/conf/version.txt
	tar zcf mt_deliver.tar.gz -C $(DELIVER_PATH) conf api script automation
	cat $(SRC_DIR)/deploy.sh mt_deliver.tar.gz > $(DELIVER_PATH)/install.sh
	chmod +x $(DELIVER_PATH)/install.sh
	rm mt_deliver.tar.gz
	rm -rf $(SRC_DIR)/automation/build

all:$(DELIVER_PATH)
api:lag_rpc
$(DELIVER_PATH):$(SUB_DIR)
	[ -d $@ ] || mkdir $@
	for component in $^;do [ -d $(SRC_DIR)/$$component/build ] && cp -a $(SRC_DIR)/$$component/build/* $@/ || echo no_assert; done

$(SUB_DIR):
	$(MAKE) -C $(SRC_DIR)/$@
clean:
	rm -rf $(DELIVER_PATH)
	for sub_component in $(SUB_DIR); do make clean -C $(SRC_DIR)/$$sub_component;done

test:
	$(SRC_DIR)/test.sh $(db_password) $(db_host)

.PHONY:all $(SUB_DIR) $(DELIVER_PATH) clean pack test
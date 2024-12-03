SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build
SUB_DIR=api conf script automation lag_rpc mt_gui mt_pc zczh doc_site
BUILD_MODE=build
ENV_REMOTE_HOST=
ENV_REMOTE_MOBILE_HOST=$(ENV_REMOTE_HOST)/mobile/\#
export BUILD_MODE
export ENV_REMOTE_HOST
export ENV_REMOTE_MOBILE_HOST
cur_host=$(shell cat ${SRC_DIR}/last_host.txt)

.SILENT:
pack:all
	date '+%Y-%m-%d %H:%M:%S' > $(DELIVER_PATH)/conf/version.txt
	tar zcf mt_deliver.tar.gz -C $(DELIVER_PATH) conf api script automation mt_pc doc_site mt_gui
	cat $(SRC_DIR)/deploy.sh mt_deliver.tar.gz > $(DELIVER_PATH)/install.sh
	chmod +x $(DELIVER_PATH)/install.sh
	rm mt_deliver.tar.gz
	rm -rf $(SRC_DIR)/automation/build
prepare:
	touch $(SRC_DIR)/last_host.txt
ifneq ($(ENV_REMOTE_HOST), $(cur_host))
	rm -f $(SRC_DIR)/mt_gui/last-build-time* $(SRC_DIR)/mt_pc/last-build-time*
	+echo new_host_defined
endif
	echo $(ENV_REMOTE_HOST) > $(SRC_DIR)/last_host.txt
all:$(DELIVER_PATH)
api:lag_rpc
mt_gui:api mt_pc zczh
mt_pc:prepare
$(DELIVER_PATH):$(SUB_DIR)
	[ -d $@ ] || mkdir $@
	for component in $^;do [ -d $(SRC_DIR)/$$component/build ] && [ 'zczh' != $$component ] && cp -a $(SRC_DIR)/$$component/build/* $@/ || echo no_assert; done

$(SUB_DIR):
	$(MAKE) -C $(SRC_DIR)/$@
clean:
	rm -rf $(DELIVER_PATH)
	rm -rf $(SRC_DIR)/results
	rm -rf $(SRC_DIR)/log.html
	rm -rf $(SRC_DIR)/report.html
	rm -rf $(SRC_DIR)/output.xml
	for sub_component in $(SUB_DIR); do make clean -C $(SRC_DIR)/$$sub_component;done

test:
	$(SRC_DIR)/test.sh $(db_password) $(db_host)

.PHONY:all $(SUB_DIR) $(DELIVER_PATH) clean pack test prepare
SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/conf
ENV_FILE=$(DELIVER_PATH)/env.sh
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp $(SRC_DIR)/*.txt $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.conf $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.so $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.xlsx $(DELIVER_PATH)/
	rm -f $(ENV_FILE)
	echo "export REMOTE_HOST=$(ENV_REMOTE_HOST)" >> $(ENV_FILE)
	echo "export REMOTE_MOBILE_HOST=$(ENV_REMOTE_MOBILE_HOST)" >> $(ENV_FILE)
	echo "export MP_APPID=$(ENV_MP_APPID)" >> $(ENV_FILE)
	echo "export PUB_APPID=$(ENV_PUB_APPID)" >> $(ENV_FILE)
clean:
	rm -rf $(SRC_DIR)/build

.PHONY:all $(DELIVER_PATH) clean
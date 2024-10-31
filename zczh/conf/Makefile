SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/conf
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp $(SRC_DIR)/*.ini $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.conf $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.json $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.sh $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.yaml $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.so $(DELIVER_PATH)/

clean:
	rm -rf $(DELIVER_PATH)

.PHONY:all $(DELIVER_PATH) clean
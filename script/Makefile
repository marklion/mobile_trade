SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/script
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp $(SRC_DIR)/*.py $(DELIVER_PATH)/
	cp $(SRC_DIR)/*.sh $(DELIVER_PATH)/
	chmod +x $(DELIVER_PATH)/*.py
	chmod +x $(DELIVER_PATH)/*.sh
clean:
	rm -rf $(SRC_DIR)/build

.PHONY:all $(DELIVER_PATH) clean
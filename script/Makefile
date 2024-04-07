SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/script
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp $(SRC_DIR)/*.py $(DELIVER_PATH)/
	chmod +x $(DELIVER_PATH)/*.py
clean:
	rm -rf $(DELIVER_PATH)

.PHONY:all $(DELIVER_PATH) clean
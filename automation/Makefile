SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/automation
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp `ls $(SRC_DIR) | grep -v build | grep -v Makefile` -a $(DELIVER_PATH)
clean:
	rm -rf $(DELIVER_PATH)

.PHONY:all $(DELIVER_PATH) clean
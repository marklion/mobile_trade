SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/automation
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp `ls $(SRC_DIR) | grep -v build | grep -v Makefile` -a $(DELIVER_PATH)
clean:
	rm -rf $(SRC_DIR)/build
	rm -rf $(SRC_DIR)/__pychache__
	rm -rf $(SRC_DIR)/log.html
	rm -rf $(SRC_DIR)/report.html
	rm -rf $(SRC_DIR)/output.xml

.PHONY:all $(DELIVER_PATH) clean
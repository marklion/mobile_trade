SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build

all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	[ -d $(SRC_DIR)/cmake_tmp_dir ] || mkdir -p $(SRC_DIR)/cmake_tmp_dir
	pushd $(SRC_DIR)/cmake_tmp_dir;[ -f Makefile ] || cmake -D PRJ_INTERNAL_BUILD=$(DELIVER_PATH) ../; $(MAKE)
clean:
	rm -rf $(DELIVER_PATH) $(SRC_DIR)/cmake_tmp_dir

.PHONY:all $(DELIVER_PATH) clean
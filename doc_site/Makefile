SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/doc_site
all:$(DELIVER_PATH)

$(DELIVER_PATH):
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	rm -rf $(SRC_DIR)/public
	sed -i '1i baseURL = "/help/"' $(SRC_DIR)/hugo.toml
	pushd $(SRC_DIR); hugo --destination $(DELIVER_PATH)
	sed -i '1d' $(SRC_DIR)/hugo.toml
clean:
	rm -rf $(SRC_DIR)/build

.PHONY:all $(DELIVER_PATH) clean
SHELL=/bin/bash
SRC_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
DELIVER_PATH=$(SRC_DIR)/build/mt_gui
MP_DELIVER_PATH=$(SRC_DIR)/../build/mp-weixin
all:$(SRC_DIR)/node_modules
	sed -i "s/MP_APPID/$(ENV_MP_APPID)/g" $(SRC_DIR)/src/manifest.json
	pushd $(SRC_DIR); n 16.8.0 && npm run build:mp-weixin && npm run build:h5; n 18.17.0;
	[ -d $(DELIVER_PATH) ] || mkdir -p $(DELIVER_PATH)
	cp -a $(SRC_DIR)/dist/build/h5/* $(DELIVER_PATH)/ || true
	[ -d $(MP_DELIVER_PATH) ] || mkdir -p $(MP_DELIVER_PATH)
	cp -a $(SRC_DIR)/dist/build/mp-weixin/* $(MP_DELIVER_PATH)/ || true
	sed -i "s/$(ENV_MP_APPID)/MP_APPID/g" $(SRC_DIR)/src/manifest.json
$(SRC_DIR)/node_modules:$(SRC_DIR)/package.json
	pushd $(SRC_DIR); n 16.8.0 && yarn install; n 18.17.0;
clean:
	rm -rf $(SRC_DIR)/dist
	rm -rf $(SRC_DIR)/node_modules
	rm -rf $(SRC_DIR)/.hbuilderx
	rm -rf $(SRC_DIR)/last-build-time-*.txt
	rm -rf $(SRC_DIR)/package-lock.json
	rm -rf $(SRC_DIR)/yarn.lock

.PHONY:all clean
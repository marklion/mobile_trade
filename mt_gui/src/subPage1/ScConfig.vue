<template>
<view class="sc-config-page">
    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-copy">
            <text class="hero-label">现场管控</text>
            <text class="hero-title" v-if="cur_seg == 0">证件要求</text>
            <text class="hero-title" v-else>现场检查</text>
            <text class="hero-sub" v-if="cur_seg == 0">配置司乘与车辆证件上传规则</text>
            <text class="hero-sub" v-else>配置检查表、检查项与通行限制</text>
        </view>
    </view>

    <view class="shell">
        <view class="seg">
            <view class="seg-item" v-if="cur_seg == 0">
                <text class="seg-text seg-text-on">证件要求</text>
            </view>
            <view class="seg-item seg-item-off" v-else @click="switch_seg(0)">
                <text class="seg-text">证件要求</text>
            </view>
            <view class="seg-item" v-if="cur_seg == 1">
                <text class="seg-text seg-text-on">现场检查</text>
            </view>
            <view class="seg-item seg-item-off" v-else @click="switch_seg(1)">
                <text class="seg-text">现场检查</text>
            </view>
        </view>

        <view class="stuff-tabs">
            <fui-tabs :tabs="tabs" @change="change_tab"></fui-tabs>
        </view>

        <view class="sc-list-body">
            <view v-if="cur_get_url == segs[0].url">
                <view class="req-card" v-for="(item, index) in data2show" :key="index">
                    <view class="req-head">
                        <view class="req-main">
                            <text class="req-name">{{ item.name }}</text>
                            <text class="req-belong">{{ belong_type_string(item.belong_type) }}</text>
                        </view>
                        <view class="req-ops">
                            <view class="mini-btn warn" @click="prepare_fetch(item)">
                                <text class="mini-btn-text warn">修改</text>
                            </view>
                            <view class="mini-btn danger" @click="prepare_delete(item)">
                                <text class="mini-btn-text danger">删除</text>
                            </view>
                        </view>
                    </view>
                    <view class="tag-row">
                        <text class="tag primary" v-if="item.need_attach">上传图片</text>
                        <text class="tag success" v-if="item.need_input">输入</text>
                        <text class="tag danger" v-if="!item.need_expired">长期有效</text>
                        <text class="tag ghost" v-if="item.add_to_export">导出表</text>
                    </view>
                    <text class="req-prompt" v-if="item.prompt">提示：{{ item.prompt }}</text>
                </view>
                <view class="empty-tip" v-if="!data2show.length">
                    <text class="empty-tip-text">暂无证件要求，点击下方新增</text>
                </view>
            </view>
            <view v-else-if="cur_get_url == segs[1].url">
                <view class="fc-card" v-for="(item, index) in data2show" :key="index">
                    <view class="fc-head">
                        <view class="fc-main">
                            <text class="fc-name">{{ item.name }}</text>
                            <text class="fc-role" v-if="item.rbac_role">角色 · {{ item.rbac_role.name }}</text>
                            <text class="fc-role muted" v-else>未绑定角色</text>
                        </view>
                    </view>

                    <view class="fc-item" v-for="single_item in item.field_check_items" :key="single_item.id">
                        <view class="fc-item-main">
                            <text class="fc-item-name">{{ single_item.name }}</text>
                            <view class="tag-row compact">
                                <text class="tag warn" v-if="single_item.need_photo">拍照</text>
                                <text class="tag success" v-else-if="single_item.need_input">输入</text>
                                <text class="tag primary" v-else>打钩</text>
                            </view>
                        </view>
                        <view class="mini-btn danger" @click="prepare_delete_item(single_item)">
                            <text class="mini-btn-text danger">删除</text>
                        </view>
                    </view>

                    <view class="fc-actions">
                        <view class="act-btn ok" @click="prepare_add_item2fc_table(item)">
                            <text class="act-btn-text ok">新增检查项</text>
                        </view>
                        <view class="act-btn primary" @click="prepare_set_role(item)">
                            <text class="act-btn-text primary">设定角色</text>
                        </view>
                        <view class="act-btn warn" @click="prepare_upload_template(item)">
                            <text class="act-btn-text warn">设定模板</text>
                        </view>
                        <view class="act-btn ghost" v-if="item.template_path" @click="prepare_download_template(item.template_path)">
                            <text class="act-btn-text ghost">下载模板</text>
                        </view>
                        <view class="act-btn danger" @click="prepare_del_table(item)">
                            <text class="act-btn-text danger">删除表格</text>
                        </view>
                    </view>

                    <view class="switch-row">
                        <text class="switch-label">未通过不允许叫号</text>
                        <fui-switch :scaleRatio="0.7" :checked="item.require_before_call" @change="change_require_before_call($event,item)"></fui-switch>
                    </view>
                    <view class="switch-row">
                        <text class="switch-label">未通过不允许确认出厂</text>
                        <fui-switch :scaleRatio="0.7" :checked="item.require_before_confirm" @change="change_require_before_confirm($event,item)"></fui-switch>
                    </view>
                </view>
                <view class="empty-tip" v-if="!data2show.length">
                    <text class="empty-tip-text">暂无检查表，点击下方新增</text>
                </view>
            </view>
        </view>
    </view>

    <view class="bottom-bar" v-if="cur_get_url == segs[0].url">
        <view class="primary-btn" @click="prepare_fetch(null)">
            <text class="primary-btn-text">新增证件要求</text>
        </view>
    </view>
    <view class="bottom-bar" v-else-if="cur_get_url == segs[1].url">
        <view class="primary-btn" @click="prepare_fetch_table(null)">
            <text class="primary-btn-text">新增检查表</text>
        </view>
    </view>

    <fui-modal width="600" :show="show_fetch" v-if="show_fetch" @click="fetch_req">
        <fui-form ref="sc_fetch" labelWidth="240" top="100">
            <fui-input required label="名称" :disabled="!new_fetch" borderTop placeholder="请输入名称" v-model="sc_fetch_req.name"></fui-input>
            <fui-input label="提示信息" borderTop placeholder="请输入提示信息" v-model="sc_fetch_req.prompt"></fui-input>
            <fui-input label="证件所属" borderTop disabled placeholder="点击选择" :value="belong_type_input" @click="show_belong_pick = true"></fui-input>
            <fui-form-item label="输入方式">
                <fui-checkbox-group v-model="input_method">
                    <fui-checkbox value="0"></fui-checkbox>
                    输入
                    <fui-checkbox value="1"></fui-checkbox>
                    上传
                </fui-checkbox-group>
            </fui-form-item>
            <fui-form-item label="需要有效期">
                <u-switch v-model="sc_fetch_req.need_expired"></u-switch>
            </fui-form-item>
            <fui-form-item label="添加到导出表">
                <u-switch v-model="sc_fetch_req.add_to_export"></u-switch>
            </fui-form-item>
        </fui-form>
    </fui-modal>

    <fui-modal width="600" :show="show_fetch_table" v-if="show_fetch_table" @click="fetch_fc_table">
        <fui-input required label="名称" :disabled="!new_fetch" borderTop placeholder="请输入名称" v-model="new_fc_table.name"></fui-input>
    </fui-modal>

    <fui-modal width="600" :show="show_add_item2fc_table" v-if="show_add_item2fc_table" @click="add_item2fc_table">
        <fui-input required label="名称" borderTop placeholder="请输入名称" v-model="new_fc_item.name"></fui-input>
        <fui-form-item label="检查方式">
            <fui-radio-group v-model="new_fc_item.check_method">
                <fui-radio value="0" checked></fui-radio><text>打钩</text>
                <fui-radio value="1"></fui-radio><text>输入</text>
                <fui-radio value="2"></fui-radio><text>拍照</text>
            </fui-radio-group>
        </fui-form-item>
    </fui-modal>
    <fui-modal width="600" :show="show_fc_item_delete" v-if="show_fc_item_delete" @click="delete_fc_item" :descr="'确定要删除吗?'">
    </fui-modal>
    <fui-modal width="600" :show="show_del_table" v-if="show_del_table" @click="del_fc_table" :descr="'确定要删除吗?'">
    </fui-modal>
    <fui-bottom-popup :show="show_role_set" @close="show_role_set = false">
        <view class="popup-head">
            <text class="popup-title">设定角色</text>
        </view>
        <list-show ref="roles" v-model="all_roles" :fetch_function="get_all_roles" height="25vh" search_key="name">
            <fui-list-cell v-for="single_role in all_roles" :key="single_role.id" arrow @click="set_role2table(single_role.id)">{{single_role.name}}</fui-list-cell>
        </list-show>
    </fui-bottom-popup>
    <fui-bottom-popup :show="show_belong_pick" @close="show_belong_pick= false">
        <view class="popup-head">
            <text class="popup-title">证件所属</text>
        </view>
        <fui-list-cell arrow @click="choose_belong_type(0)">司乘</fui-list-cell>
        <fui-list-cell arrow @click="choose_belong_type(1)">主车</fui-list-cell>
        <fui-list-cell arrow @click="choose_belong_type(2)">挂车</fui-list-cell>
    </fui-bottom-popup>

    <fui-modal width="600" :show="show_delete" v-if="show_delete" @click="delete_req" :descr="'确定要删除 ' + sc_fetch_req.name + ' 吗?'">
    </fui-modal>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue';
export default {
    name: 'ScConfig',
    components: {
        "list-show": ListShow,
    },
    computed: {
        belong_type_input: function () {
            if (this.sc_fetch_req.belong_type == 0) {
                return '司乘';
            } else if (this.sc_fetch_req.belong_type == 1) {
                return '主车';
            } else {
                return '挂车';
            }
        },
        tabs: function () {
            let ret = [];
            this.all_stuff.forEach(ele => {
                ret.push({
                    name: ele.name,
                    id: ele.id
                });
            });

            return ret;
        },
    },
    data: function () {
        return {
            all_roles: [],
            focus_fc_table: undefined,
            segs: [{
                id: 0,
                name: '证件要求',
                url: '/sc/get_req',
                content_name: 'reqs',
            }, {
                id: 1,
                name: '现场检查',
                url: '/sc/get_all_fc_table',
                content_name: 'fc_table',
            }],
            cur_seg: 0,
            cur_get_url: '/sc/get_req',
            cur_content_name: 'reqs',
            data2show: [],
            show_delete: false,
            input_method: [],
            show_fetch: false,
            show_fetch_table: false,
            show_belong_pick: false,
            focus_stuff_id: 0,
            all_stuff: [],
            sc_fetch_req: {
                "belong_type": 0,
                "name": "",
                "need_attach": true,
                "need_expired": true,
                "need_input": true,
                "prompt": "",
                "stuff_id": 0,
                "add_to_export": false
            },
            new_fetch: false,
            new_fc_table: {
                "name": "",
                "stuff_id": 0,
            },
            show_add_item2fc_table: false,
            new_fc_item: {
                "name": "",
                "table_id": 0,
                "check_method": '0',
            },
            fc_item_to_delete: undefined,
            show_fc_item_delete: false,
            show_del_table: false,
            show_role_set: false,
            fileList: [],
            upload_path: '',
        };
    },
    methods: {
        switch_seg: function (index) {
            this.apply_seg(index);
            this.refresh_sc_list();
        },
        del_fc_table: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/del_fc_table', {
                    id: this.focus_fc_table.id
                });
                uni.startPullDownRefresh();
            }
            this.show_del_table = false;
        },
        set_role2table: async function (role_id) {
            await this.$send_req('/rbac/add_fc_table2role', {
                role_id: role_id,
                table_id: this.focus_fc_table.id
            });
            uni.startPullDownRefresh();
            this.show_role_set = false;
        },
        upload_template: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/set_table_template', {
                    table_id: this.focus_fc_table.id,
                    template_path: this.upload_path
                });
                this.fileList = [];
                uni.startPullDownRefresh();
            }
        },
        prepare_download_template: async function (path) {
            let file_path = this.$convert_attach_url(path);
            wx.downloadFile({
                url: file_path,
                success: function (res) {
                    const filePath = res.tempFilePath;
                    // 打开文件
                    wx.openDocument({
                        filePath: filePath,
                        fileType: 'docx',
                        success: function () {
                            console.log('文件打开成功');
                        },
                        fail: function (err) {
                            console.error('文件打开失败', err);
                        }
                    });
                },
                fail: function (err) {
                    console.error('文件下载失败', err);
                }
            });
        },
        do_change_requirement: async function (item) {
            await this.$send_req('/sc/set_table_requirement', {
                table_id: item.id,
                require_before_confirm: item.require_before_confirm,
                require_before_call: item.require_before_call
            });
        },
        change_require_before_confirm: async function (e, item) {
            item.require_before_confirm = e.detail.value;
            await this.do_change_requirement(item);
        },
        change_require_before_call: async function (e, item) {
            item.require_before_call = e.detail.value;
            await this.do_change_requirement(item);
        },
        prepare_upload_template: async function (table) {
            let res = await wx.chooseMessageFile({
                count: 1,
                type: 'file',
                extension: ['docx', 'doc'],
            });

            // 获取文件路径
            let file_path = res.tempFiles[0].path;
            // 上传文件
            wx.uploadFile({
                url: this.$remote_url() + '/api/v1/upload_file',
                filePath: file_path,
                name: 'file', // 文件对应的 key，后端可以通过这个 key 获取文件
                success: async (uploadRes) => {
                    console.log('文件上传成功', uploadRes);
                    // 处理上传成功后的逻辑
                    await this.$send_req('/sc/set_table_template', {
                        table_id: table.id,
                        template_path: uploadRes.data
                    });
                    uni.startPullDownRefresh();
                },
                fail: (uploadErr) => {
                    console.error('文件上传失败', uploadErr);
                    // 处理上传失败后的逻辑
                },
            });
        },
        prepare_set_role: function (table) {
            this.show_role_set = true;
            this.focus_fc_table = table;
        },
        prepare_del_table: function (fc_table) {
            this.focus_fc_table = fc_table;
            this.show_del_table = true;
        },
        add_item2fc_table: async function (e) {
            if (e.index == 1) {
                this.new_fc_item.table_id = this.focus_fc_table.id;
                await this.$send_req('/sc/add_item2fc_table', {
                    name: this.new_fc_item.name,
                    table_id: this.new_fc_item.table_id,
                    need_input: this.new_fc_item.check_method == '1',
                    need_photo: this.new_fc_item.check_method == '2',
                });
                uni.startPullDownRefresh();
            }
            this.show_add_item2fc_table = false;
        },
        prepare_add_item2fc_table: function (fc_table) {
            this.focus_fc_table = fc_table;
            this.new_fc_item.name = '';
            this.new_fc_item.check_method = '0';
            this.show_add_item2fc_table = true;
        },
        delete_fc_item: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/del_fc_item', {
                    id: this.fc_item_to_delete.id
                });
                uni.startPullDownRefresh();
            }
            this.show_fc_item_delete = false;
        },
        prepare_delete_item: function (fc_item) {
            this.fc_item_to_delete = fc_item;
            this.show_fc_item_delete = true;
        },
        change_seg: function (e) {
            this.cur_seg = e.index;
            this.cur_get_url = e.url;
            this.cur_content_name = e.content_name;
            this.refresh_sc_list();
        },
        apply_seg: function (index) {
            const seg = this.segs[index];
            if (!seg) return;
            this.cur_seg = index;
            this.cur_get_url = seg.url;
            this.cur_content_name = seg.content_name;
        },
        delete_req: async function (e) {
            if (e.index == 1) {
                await this.$send_req('/sc/del_req', {
                    req_id: this.sc_fetch_req.id
                });
                uni.startPullDownRefresh();
            }
            this.show_delete = false;
        },
        prepare_delete: function (sc) {
            this.show_delete = true;
            this.sc_fetch_req = {
                ...sc
            };
        },
        fetch_req: async function (e) {
            if (e.index == 1) {
                let rules = [{
                    name: 'name',
                    rule: ['required'],
                    msg: ['请填写名称']
                }];
                let val_ret = await this.$refs.sc_fetch.validator(this.sc_fetch_req, rules);
                if (!val_ret.isPassed) {
                    return;
                }
                this.sc_fetch_req.need_attach = this.input_method.includes('1');
                this.sc_fetch_req.need_input = this.input_method.includes('0');
                this.sc_fetch_req.stuff_id = this.focus_stuff_id;
                await this.$send_req('/sc/fetch_req', this.sc_fetch_req);
                uni.startPullDownRefresh();
            }
            this.show_fetch = false;
        },
        fetch_fc_table: async function (e) {
            if (e.index == 1) {
                this.new_fc_table.stuff_id = this.focus_stuff_id;
                await this.$send_req('/sc/add_fc_table', this.new_fc_table);
                uni.startPullDownRefresh();
            }
            this.show_fetch_table = false;
        },
        prepare_fetch_table: function (fc) {
            if (fc) {
                this.new_fc_table = {
                    ...fc
                };
                this.new_fetch = false;
            } else {
                this.new_fc_table = {
                    "name": "",
                };
                this.new_fetch = true;
            }
            this.show_fetch_table = true;
        },
        prepare_fetch: function (sc) {
            if (sc) {
                this.sc_fetch_req = {
                    ...sc
                };
                this.input_method = [];
                if (this.sc_fetch_req.need_attach) {
                    this.input_method.push('1');
                }
                if (this.sc_fetch_req.need_input) {
                    this.input_method.push('0');
                }

                this.new_fetch = false;
            } else {
                this.sc_fetch_req = {
                    "belong_type": 0,
                    "name": "",
                    "need_attach": true,
                    "need_expired": true,
                    "need_input": true,
                    "prompt": "",
                };
                this.input_method = ['0', '1'];
                this.new_fetch = true;
            }
            this.show_fetch = true;
        },
        choose_belong_type: function (type) {
            this.sc_fetch_req.belong_type = type;
            this.show_belong_pick = false;
        },
        belong_type_string(belong_type) {
            if (belong_type == 0) {
                return '司乘';
            } else if (belong_type == 1) {
                return '主车';
            } else {
                return '挂车';
            }
        },
        change_tab: function (e) {
            let index = e.index
            this.focus_stuff_id = this.tabs[index].id;
            this.refresh_sc_list();
        },
        refresh_sc_list: async function () {
            if (!this.focus_stuff_id) {
                this.data2show = [];
                return;
            }
            let all = [];
            let pageNo = 0;
            while (true) {
                let chunk = await this.get_sc_config(pageNo, [this.focus_stuff_id, this.cur_get_url, this.cur_content_name]);
                if (!chunk || chunk.length == 0) {
                    break;
                }
                all = all.concat(chunk);
                pageNo++;
                if (chunk.length < 20) {
                    break;
                }
            }
            this.data2show = all;
        },
        get_sc_config: async function (pageNo, params) {
            if (params[0] == 0) {
                return [];
            }
            let res = await this.$send_req(params[1], {
                pageNo: pageNo,
                stuff_id: params[0]
            });

            return res[params[2]];
        },
        get_all_roles: async function (_pageNo) {
            let res = await this.$send_req('/rbac/role_get_all', {
                pageNo: _pageNo
            });
            return res.all_role;
        },
    },
    onPullDownRefresh: async function () {
        await this.refresh_sc_list();
        uni.stopPullDownRefresh()
    },
    onLoad: async function (options) {
        if (options && options.tab != null && options.tab !== '') {
            const tab = Number(options.tab);
            if (!Number.isNaN(tab) && tab >= 0 && tab < this.segs.length) {
                this.apply_seg(tab);
            }
        }
        let stuff = [];
        let index = 0;
        while (true) {
            let res = await this.$send_req('/stuff/get_all', {
                pageNo: index
            });
            if (res.stuff.length == 0) {
                break;
            }
            stuff = stuff.concat(res.stuff);
            index++;
        }
        this.all_stuff = stuff;
        if (this.all_stuff.length > 0) {
            this.focus_stuff_id = this.all_stuff[0].id;
            await this.refresh_sc_list();
        }
    },
}
</script>

<style scoped>
.sc-config-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #eef1ff 0%, #f7f8fc 42%, #f3f5f9 100%);
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.hero {
    position: relative;
    overflow: hidden;
    padding: 36rpx 32rpx 48rpx;
    background: linear-gradient(135deg, #2F3FCF 0%, #465CFF 55%, #6B7CFF 100%);
}

.hero-logo-bg {
    position: absolute;
    right: -20rpx;
    top: -10rpx;
    width: 220rpx;
    height: 220rpx;
    opacity: 0.18;
}

.hero-logo-img {
    width: 100%;
    height: 100%;
}

.hero-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
}

.hero-label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.78);
    letter-spacing: 4rpx;
}

.hero-title {
    margin-top: 10rpx;
    font-size: 44rpx;
    font-weight: 700;
    color: #fff;
}

.hero-sub {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.86);
}

.shell {
    margin: -24rpx 24rpx 0;
    position: relative;
    z-index: 2;
}

.seg {
    display: flex;
    background: #fff;
    border-radius: 16rpx;
    padding: 8rpx;
    box-shadow: 0 8rpx 24rpx rgba(47, 63, 207, 0.08);
    margin-bottom: 16rpx;
}

.seg-item {
    flex: 1;
    height: 68rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
}

.seg-item-off {
    background: transparent;
}

.seg-text {
    font-size: 28rpx;
    color: #667085;
}

.seg-text-on {
    color: #fff;
    font-weight: 600;
}

.stuff-tabs {
    margin-bottom: 16rpx;
    background: #fff;
    border-radius: 12rpx;
    overflow: hidden;
}

.empty-tip {
    padding: 48rpx 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-tip-text {
    font-size: 26rpx;
    color: #98a2b3;
}

.req-card,
.fc-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.05);
}

.req-head,
.fc-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12rpx;
}

.req-main,
.fc-main {
    flex: 1;
    min-width: 0;
    padding-right: 12rpx;
}

.req-name,
.fc-name {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: #1d2129;
}

.req-belong,
.fc-role {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #2F3FCF;
}

.fc-role.muted {
    color: #98a2b3;
}

.req-ops {
    display: flex;
    flex-shrink: 0;
}

.mini-btn {
    height: 52rpx;
    padding: 0 18rpx;
    border-radius: 10rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 10rpx;
}

.mini-btn.warn {
    background: #fff6e8;
}

.mini-btn.danger {
    background: #fdecee;
}

.mini-btn-text {
    font-size: 22rpx;
    font-weight: 500;
}

.mini-btn-text.warn {
    color: #DC6803;
}

.mini-btn-text.danger {
    color: #E34D59;
}

.tag-row {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 8rpx;
}

.tag-row.compact {
    margin-bottom: 0;
    margin-top: 6rpx;
}

.tag {
    font-size: 20rpx;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    margin-right: 10rpx;
    margin-bottom: 8rpx;
}

.tag.primary {
    color: #2F3FCF;
    background: #eef1ff;
}

.tag.success {
    color: #2BA471;
    background: #e8f8f0;
}

.tag.danger {
    color: #E34D59;
    background: #fdecee;
}

.tag.warn {
    color: #DC6803;
    background: #fff6e8;
}

.tag.ghost {
    color: #667085;
    background: #f2f4f7;
}

.req-prompt {
    display: block;
    font-size: 24rpx;
    color: #DC6803;
    line-height: 1.4;
}

.fc-item {
    display: flex;
    align-items: center;
    background: #f8f9fc;
    border-radius: 12rpx;
    padding: 16rpx 18rpx;
    margin-bottom: 12rpx;
}

.fc-item-main {
    flex: 1;
    min-width: 0;
}

.fc-item-name {
    font-size: 26rpx;
    color: #344054;
    font-weight: 500;
}

.fc-actions {
    display: flex;
    flex-wrap: wrap;
    margin: 8rpx 0 4rpx;
}

.act-btn {
    height: 56rpx;
    padding: 0 20rpx;
    border-radius: 10rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12rpx;
    margin-bottom: 12rpx;
}

.act-btn.ok {
    background: #e8f8f0;
}

.act-btn.primary {
    background: #eef1ff;
}

.act-btn.warn {
    background: #fff6e8;
}

.act-btn.ghost {
    background: #f2f4f7;
}

.act-btn.danger {
    background: #fdecee;
}

.act-btn-text {
    font-size: 22rpx;
    font-weight: 500;
}

.act-btn-text.ok {
    color: #2BA471;
}

.act-btn-text.primary {
    color: #2F3FCF;
}

.act-btn-text.warn {
    color: #DC6803;
}

.act-btn-text.ghost {
    color: #667085;
}

.act-btn-text.danger {
    color: #E34D59;
}

.switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14rpx 0;
    border-top: 1rpx solid #eef1f8;
}

.switch-label {
    font-size: 26rpx;
    color: #344054;
    padding-right: 16rpx;
}

.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
    background: #FFFFFF;
    border-top: 1rpx solid #EEF1F8;
    box-shadow: 0 -8rpx 24rpx rgba(26, 31, 54, 0.06);
}

.primary-btn {
    height: 84rpx;
    border-radius: 14rpx;
    background: linear-gradient(135deg, #2F3FCF, #465CFF);
    display: flex;
    align-items: center;
    justify-content: center;
}

.primary-btn-text {
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
}

.popup-head {
    padding: 28rpx 32rpx 12rpx;
}

.popup-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1d2129;
}
</style>

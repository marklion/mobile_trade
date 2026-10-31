<template>
<view style="background-color: #f1f4fa; min-height: 100vh;">
    <list-show ref="regions" v-model="data2show" :fetch_function="get_regions" height="76vh" search_key="name">
        <view v-for="(item, index) in data2show" :key="index">
            <fui-card :margin="['32rpx','20rpx']" :shadow="'0 2rpx 4rpx 0 rgba(2, 4, 38, 0.3)'"
                :title="item.name" :tag="'车位数：' + item.parking_count">
                <view class="region-switch-row">
                    <text class="region-switch-label">自动叫号</text>
                    <fui-switch :checked="item.is_open" color="#465CFF" @change="toggle_open(item, $event)"></fui-switch>
                </view>
                <section>关联物料</section>
                <template v-if="item.stuff && item.stuff.length">
                    <fui-tag style="margin:10rpx 20rpx;"
                        v-for="(s, index1) in item.stuff" :key="index1" type="primary" theme="light">
                        {{s.name}}
                        <fui-icon name="close" size="32" @click="unbind_stuff(item, s)"></fui-icon>
                    </fui-tag>
                </template>
                <view v-else class="region-empty-tip">暂未关联物料</view>
                <template #footer>
                    <view class="btn_group">
                        <fui-button :margin="['0','5rpx']" :radius="'3rpx'" btn-size="mini" text="添加物料" type="warning"
                            @click="open_stuff_picker(item)"></fui-button>
                        <fui-button :margin="['0','5rpx']" :radius="'3rpx'" btn-size="mini" text="编辑"
                            @click="open_edit(item)"></fui-button>
                        <fui-button :margin="['0','5rpx']" :radius="'3rpx'" btn-size="mini" text="删除区域" type="danger"
                            @click="ask_delete(item)"></fui-button>
                    </view>
                </template>
            </fui-card>
        </view>
    </list-show>
    <fui-divider></fui-divider>
    <fui-button type="success" text="新增区域" @click="open_add"></fui-button>

    <fui-dialog :show="show_region_edit" v-if="show_region_edit" :title="editing_id ? '编辑区域容量' : '新增区域容量'"
        :buttons="[{text:'确定', color:'red'}]" maskClosable @click="save_region" @close="show_region_edit = false">
        <fui-form-item label="区域名称" asterisk>
            <fui-input placeholder="请输入区域名称" v-model="region_form.name"></fui-input>
        </fui-form-item>
        <fui-form-item label="车位数" asterisk>
            <fui-input type="number" placeholder="请输入车位数" v-model="region_form.parking_count"></fui-input>
        </fui-form-item>
        <fui-form-item label="是否开启" v-if="editing_id">
            <fui-switch :checked="region_form.is_open" color="#465CFF" @change="on_form_switch"></fui-switch>
        </fui-form-item>
    </fui-dialog>

    <fui-dialog :show="show_delete" content="确定要删除吗？关联物料将一并解除。"
        :buttons="[{text:'删除', color:'red'}]" maskClosable @click="confirm_delete" @close="show_delete = false">
    </fui-dialog>

    <fui-bottom-popup :show="show_stuff_picker" @close="show_stuff_picker = false">
        <fui-list>
            <list-show v-model="stuff2show" :fetch_function="get_stuffs" search_key="name" height="50vh">
                <fui-list-cell v-for="(s, index) in stuff2show" :key="index" arrow @click="bind_stuff(s.id)">
                    {{s.name}}
                </fui-list-cell>
            </list-show>
        </fui-list>
    </fui-bottom-popup>
</view>
</template>

<script>
import ListShow from '../components/ListShow.vue'
export default {
    name: 'RegionCapacity',
    components: {
        'list-show': ListShow
    },
    data() {
        return {
            data2show: [],
            stuff2show: [],
            show_region_edit: false,
            show_delete: false,
            show_stuff_picker: false,
            editing_id: 0,
            current_region_id: 0,
            region_form: {
                name: '',
                parking_count: '1',
                is_open: false
            }
        }
    },
    methods: {
        get_regions: async function (_pageNo) {
            let res = await this.$send_req('/scale/get_region_capacity', {
                pageNo: _pageNo
            });
            return res.region_capacities;
        },
        get_stuffs: async function (_pageNo) {
            let res = await this.$send_req('/stuff/get_all', {
                pageNo: _pageNo
            });
            return res.stuff;
        },
        refresh: function () {
            this.$refs.regions.refresh();
        },
        open_add: function () {
            this.editing_id = 0;
            this.region_form = { name: '', parking_count: '1', is_open: false };
            this.show_region_edit = true;
        },
        open_edit: function (item) {
            this.editing_id = item.id;
            this.region_form = {
                name: item.name,
                parking_count: String(item.parking_count),
                is_open: !!item.is_open
            };
            this.show_region_edit = true;
        },
        on_form_switch: function (e) {
            this.$set(this.region_form, 'is_open', e.detail.value);
        },
        save_region: async function () {
            let name = (this.region_form.name || '').trim();
            let parking_count = parseInt(this.region_form.parking_count, 10);
            if (!name) {
                uni.showToast({ title: '请输入区域名称', icon: 'none' });
                return;
            }
            if (!Number.isInteger(parking_count) || parking_count < 0) {
                uni.showToast({ title: '车位数必须为非负整数', icon: 'none' });
                return;
            }
            if (this.editing_id) {
                await this.$send_req('/scale/update_region_capacity', {
                    id: this.editing_id,
                    name: name,
                    parking_count: parking_count,
                    is_open: this.region_form.is_open
                });
            } else {
                await this.$send_req('/scale/add_region_capacity', {
                    name: name,
                    parking_count: parking_count
                });
            }
            this.show_region_edit = false;
            this.refresh();
        },
        toggle_open: async function (item, e) {
            let new_val = e.detail.value;
            try {
                await this.$send_req('/scale/update_region_capacity', {
                    id: item.id,
                    name: item.name,
                    parking_count: item.parking_count,
                    is_open: new_val
                });
                this.$set(item, 'is_open', new_val);
            } catch (err) {
                this.refresh();
            }
        },
        ask_delete: function (item) {
            this.editing_id = item.id;
            this.show_delete = true;
        },
        confirm_delete: async function () {
            await this.$send_req('/scale/del_region_capacity', {
                id: this.editing_id
            });
            this.show_delete = false;
            this.refresh();
        },
        open_stuff_picker: function (item) {
            this.current_region_id = item.id;
            this.show_stuff_picker = true;
        },
        bind_stuff: async function (stuff_id) {
            await this.$send_req('/scale/add_region_stuff', {
                id: this.current_region_id,
                stuff_id: stuff_id
            });
            this.show_stuff_picker = false;
            this.refresh();
        },
        unbind_stuff: function (item, stuff) {
            uni.showModal({
                title: '提示',
                content: `确认解除物料「${stuff.name}」与区域的关联？`,
                success: async (res) => {
                    if (res.confirm) {
                        await this.$send_req('/scale/del_region_stuff', {
                            stuff_id: stuff.id
                        });
                        this.refresh();
                    }
                }
            });
        }
    }
}
</script>

<style scoped>
.btn_group {
    display: flex;
    justify-content: flex-end;
    margin: 20rpx 20rpx;
    background-color: #f1f4fa;
    padding: 10rpx;
}

section {
    font-size: 25rpx;
    margin: 0 20rpx;
    padding: 10rpx 0;
    border-bottom: solid 1px #eee;
}

.region-switch-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin: 0 20rpx;
    padding: 16rpx 0;
    border-bottom: solid 1px #eee;
}

.region-switch-label {
    font-size: 28rpx;
    color: #333;
}

.region-empty-tip {
    font-size: 25rpx;
    color: #999;
    margin: 10rpx 20rpx;
}
</style>

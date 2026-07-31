<template>
<view class="workbench-page">
    <logo-loading />

    <view class="hero">
        <view class="hero-logo-bg">
            <image class="hero-logo-img" src="/static/logo_transparent.png" mode="aspectFit"></image>
        </view>
        <view class="hero-top">
            <view class="hero-copy">
                <text class="hero-hello">{{ greeting_text }}，{{ user_name }}</text>
                <text class="hero-company">{{ company_name }}</text>
            </view>
        </view>
    </view>

    <view class="body">
        <view class="search-bar">
            <fui-icon name="search" size="30" color="#8A94A6"></fui-icon>
            <label class="search-label" for="workbench-search-input">搜索应用名称</label>
            <input id="workbench-search-input" class="search-input" type="text" confirm-type="search"
                placeholder="搜索应用名称" :value="keyword" @input="on_search" />
            <text v-if="keyword" class="search-clear" @click="clear_search">清除</text>
        </view>

        <view class="section" v-if="!keyword && recent_apps.length > 0">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">最近使用</text>
                        <text class="section-en">RECENT</text>
                    </view>
                </view>
            </view>
            <scroll-view scroll-x class="recent-scroll" :show-scrollbar="false">
                <view class="recent-list">
                    <view class="recent-card" v-for="item in recent_apps" :key="item.app_key"
                        @click="open_app(item)">
                        <view class="recent-icon" :style="{ background: item.bg }">
                            <fui-icon :name="item.icon" size="40" :color="item.color"></fui-icon>
                        </view>
                        <view class="recent-meta">
                            <text class="recent-name">{{ item.name }}</text>
                            <text class="recent-desc">{{ item.desc }}</text>
                        </view>
                        <fui-icon name="arrowright" size="24" color="#C5CAD5"></fui-icon>
                    </view>
                </view>
            </scroll-view>
        </view>

        <view class="section" v-if="!keyword && spotlight_apps.length > 0">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">推荐入口</text>
                        <text class="section-en">FEATURED</text>
                    </view>
                </view>
            </view>
            <view class="spotlight-grid">
                <view class="spotlight-card" v-for="item in spotlight_apps" :key="item.app_key"
                    @click="open_app(item)">
                    <view class="spotlight-inner" :style="{ background: item.spotlight_bg }">
                        <view class="spotlight-top">
                            <view class="spotlight-icon">
                                <fui-icon :name="item.icon" size="42" color="#FFFFFF"></fui-icon>
                            </view>
                            <fui-icon name="arrowright" size="24" color="rgba(255,255,255,0.75)"></fui-icon>
                        </view>
                        <text class="spotlight-name">{{ item.name }}</text>
                        <text class="spotlight-desc">{{ item.desc }}</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="section" v-for="group in display_groups" :key="group.en">
            <view class="section-head">
                <view class="section-head-left">
                    <view class="section-bar"></view>
                    <view class="section-titles">
                        <text class="section-title">{{ group.title }}</text>
                        <text class="section-en">{{ group.en }}</text>
                    </view>
                </view>
                <text class="app-count">{{ group.apps.length }} 项</text>
            </view>
            <scroll-view v-if="group.key === 'field'" scroll-x class="field-scroll" :show-scrollbar="false">
                <view class="field-list">
                    <view class="app-tile field-tile" v-for="item in group.apps" :key="item.app_key"
                        @click="open_app(item)">
                        <view class="app-icon" :style="{ background: item.bg }">
                            <fui-icon :name="item.icon" size="44" :color="item.color"></fui-icon>
                        </view>
                        <text class="app-name">{{ item.name }}</text>
                    </view>
                </view>
            </scroll-view>
            <view class="app-grid" v-else>
                <view class="app-tile" v-for="item in group.apps" :key="item.app_key"
                    @click="open_app(item)">
                    <view class="app-icon" :style="{ background: item.bg }">
                        <fui-icon :name="item.icon" size="44" :color="item.color"></fui-icon>
                    </view>
                    <text class="app-name">{{ item.name }}</text>
                </view>
            </view>
        </view>

        <view class="empty-box" v-if="display_groups.length === 0">
            <fui-icon name="search" size="64" color="#C5CAD5"></fui-icon>
            <text class="empty-text">{{ keyword ? '未找到匹配应用' : '暂无可用应用' }}</text>
        </view>
    </view>
    <app-tab-bar :selected="2" />
</view>
</template>

<script>
import AppTabBar from '../components/AppTabBar.vue';
import { setTabBarSelected } from '@/utils/setTabBarSelected';

const RECENT_KEY = 'workbench_recent_apps';
const ICON_THEMES = [
    { color: '#465CFF', bg: 'rgba(70, 92, 255, 0.12)', spotlight_bg: 'linear-gradient(145deg, #465CFF, #2F3FCF)' },
    { color: '#FF8A2B', bg: 'rgba(255, 138, 43, 0.12)', spotlight_bg: 'linear-gradient(145deg, #FF9F4A, #FF8A2B)' },
    { color: '#2DBE6C', bg: 'rgba(45, 190, 108, 0.12)', spotlight_bg: 'linear-gradient(145deg, #3DD087, #2DBE6C)' },
    { color: '#7B61FF', bg: 'rgba(123, 97, 255, 0.12)', spotlight_bg: 'linear-gradient(145deg, #8F7AFF, #7B61FF)' },
    { color: '#FF4D4F', bg: 'rgba(255, 77, 79, 0.12)', spotlight_bg: 'linear-gradient(145deg, #FF6B6D, #FF4D4F)' },
    { color: '#13C2C2', bg: 'rgba(19, 194, 194, 0.12)', spotlight_bg: 'linear-gradient(145deg, #36D0D0, #13C2C2)' },
];

const GROUP_META = {
    field: { title: '现场作业', en: 'FIELD' },
    biz: { title: '商务协同', en: 'BUSINESS' },
    org: { title: '组织权限', en: 'ORG' },
    tool: { title: '通用工具', en: 'TOOLS' },
};

export default {
    name: 'AppPanel',
    components: {
        "app-tab-bar": AppTabBar,
    },
    data: function () {
        return {
            keyword: '',
            show_apps: [],
            recent_apps: [],
            self_info: {
                name: '',
                company: '',
            },
            all_apps: [{
                    name: '物料管理',
                    icon: 'list',
                    path: 'Stuff',
                    require_module: 'stuff',
                    sub_page_name: 'subPage1',
                    group: 'biz',
                    desc: '维护物料与价格',
                    featured: true,
                }, {
                    name: '竞价管理',
                    icon: 'bankcard',
                    require_module: 'bid',
                    sub_page_name: 'subPage1',
                    path: 'BiddingConfig',
                    group: 'biz',
                    desc: '配置竞价活动',
                }, {
                    name: '竞价参与',
                    icon: 'bankcard',
                    require_module: 'customer',
                    sub_page_name: 'subPage1',
                    path: 'BiddingJoin',
                    group: 'biz',
                    desc: '参与报价竞拍',
                }, {
                    name: '排队车辆',
                    icon: 'transport',
                    require_module: 'scale',
                    path: 'Field',
                    query: 'tab=0',
                    sub_page_name: 'subPage1',
                    group: 'field',
                    desc: '叫号排队过磅',
                    featured: true,
                }, {
                    name: '设备管理',
                    icon: 'setup',
                    require_module: 'scale',
                    path: 'Field',
                    query: 'tab=1',
                    sub_page_name: 'subPage1',
                    group: 'field',
                    desc: '道闸与门禁',
                    featured: true,
                }, {
                    name: '磅单印章',
                    icon: 'picture',
                    require_module: 'scale',
                    path: 'Field',
                    query: 'tab=2',
                    sub_page_name: 'subPage1',
                    group: 'field',
                    desc: '磅单印章图片',
                }, {
                    name: '合同管理',
                    icon: 'pullup',
                    require_module: undefined,
                    sub_page_name: 'subPage1',
                    path: 'Contract',
                    group: 'biz',
                    desc: '合同与履约',
                }, {
                    name: '证件要求',
                    icon: 'idcard',
                    require_module: 'sc',
                    sub_page_name: 'subPage1',
                    path: 'ScConfig',
                    query: 'tab=0',
                    group: 'field',
                    desc: '证件与上传要求',
                }, {
                    name: '现场检查',
                    icon: 'checkbox',
                    require_module: 'sc',
                    sub_page_name: 'subPage1',
                    path: 'ScConfig',
                    query: 'tab=1',
                    group: 'field',
                    desc: '现场检查表配置',
                },
                {
                    name: '车队配置',
                    icon: 'menu',
                    require_module: undefined,
                    path: 'VehicleTeam',
                    sub_page_name: 'subPage1',
                    group: 'tool',
                    desc: '车队与车辆',
                },
                {
                    name: '考试配置',
                    icon: 'edit',
                    require_module: 'exam',
                    path: 'ExamConfig',
                    sub_page_name: 'subPage1',
                    group: 'tool',
                    desc: '题库与考试',
                },
                {
                    name: '审批管理',
                    icon: 'wait',
                    require_module: 'approval',
                    path: 'Audit',
                    sub_page_name: 'subPage1',
                    group: 'org',
                    desc: '待办审批流',
                    featured: true,
                },
                {
                    name: '磅单验证',
                    icon: 'scan',
                    require_module: undefined,
                    path: 'TicketVerify',
                    sub_page_name: 'subPage1',
                    group: 'tool',
                    desc: '扫码核验磅单',
                },
                {
                    name: '集团成员',
                    icon: 'community',
                    rm_array: ['group', 'global'],
                    path: 'GroupMembers',
                    sub_page_name: 'subPage1',
                    group: 'org',
                    desc: '成员公司维护',
                },
                {
                    name: '集团权限',
                    icon: 'principal',
                    rm_array: ['group', 'global'],
                    path: 'GroupDataPermission',
                    sub_page_name: 'subPage1',
                    group: 'org',
                    desc: '数据权限分配',
                }
            ]
        }
    },
    computed: {
        user_name: function () {
            return (this.self_info && this.self_info.name) ? this.self_info.name : '用户';
        },
        company_name: function () {
            return (this.self_info && this.self_info.company) ? this.self_info.company : '掌易助理';
        },
        greeting_text: function () {
            return '你好';
        },
        filtered_apps: function () {
            const key = (this.keyword || '').trim();
            if (!key) return this.show_apps;
            return this.show_apps.filter(item => item.name.includes(key) || (item.desc && item.desc.includes(key)));
        },
        group_list: function () {
            const map = {};
            const order = ['field', 'biz', 'org', 'tool'];
            this.show_apps.forEach(item => {
                const g = item.group || 'tool';
                if (!map[g]) {
                    map[g] = {
                        key: g,
                        title: GROUP_META[g].title,
                        en: GROUP_META[g].en,
                        apps: [],
                    };
                }
                map[g].apps.push(item);
            });
            return order.filter(k => map[k] && map[k].apps.length).map(k => map[k]);
        },
        display_groups: function () {
            const key = (this.keyword || '').trim();
            if (!key) return this.group_list;
            const map = {};
            const order = ['field', 'biz', 'org', 'tool'];
            this.filtered_apps.forEach(item => {
                const g = item.group || 'tool';
                if (!map[g]) {
                    map[g] = {
                        key: g,
                        title: GROUP_META[g].title,
                        en: GROUP_META[g].en,
                        apps: [],
                    };
                }
                map[g].apps.push(item);
            });
            return order.filter(k => map[k] && map[k].apps.length).map(k => map[k]);
        },
        spotlight_apps: function () {
            return this.show_apps.filter(item => item.featured).slice(0, 4);
        },
    },
    methods: {
        on_search: function (e) {
            this.keyword = (e.detail && e.detail.value) ? e.detail.value : '';
        },
        clear_search: function () {
            this.keyword = '';
        },
        make_app_key: function (item) {
            if (item.query) {
                return item.path + '?' + item.query;
            }
            return item.path;
        },
        init_pages: function () {
            this.show_apps = [];
            let theme_index = 0;
            this.all_apps.forEach(item => {
                let ok = false;
                if (item.rm_array && item.rm_array.length) {
                    for (let i = 0; i < item.rm_array.length; i++) {
                        if (this.$has_module(item.rm_array[i])) {
                            ok = true;
                            break;
                        }
                    }
                } else if (!item.require_module || this.$has_module(item.require_module)) {
                    ok = true;
                }
                if (ok) {
                    const theme = ICON_THEMES[theme_index % ICON_THEMES.length];
                    theme_index += 1;
                    const app = { ...item, ...theme };
                    app.app_key = this.make_app_key(app);
                    this.show_apps.push(app);
                }
            });
            this.load_recent();
        },
        load_recent: function () {
            const saved = uni.getStorageSync(RECENT_KEY) || [];
            const key_set = {};
            this.show_apps.forEach(item => {
                key_set[item.app_key] = item;
            });
            this.recent_apps = saved
                .map(key => key_set[key])
                .filter(Boolean)
                .slice(0, 6);
        },
        save_recent: function (app) {
            const key = app.app_key || this.make_app_key(app);
            let saved = uni.getStorageSync(RECENT_KEY) || [];
            saved = saved.filter(item => item !== key);
            saved.unshift(key);
            saved = saved.slice(0, 8);
            uni.setStorageSync(RECENT_KEY, saved);
            this.load_recent();
        },
        open_app: function (item) {
            this.save_recent(item);
            this.go_to_page(item.path, item.sub_page_name, item.query);
        },
        go_to_page: function (_path, sub_page_name, query) {
            let url = '/pages/' + _path;
            if (sub_page_name) {
                url = '/' + sub_page_name + '/' + _path;
            }
            if (query) {
                url += (url.includes('?') ? '&' : '?') + query;
            }
            uni.navigateTo({
                url: url,
            });
        },
    },
    onShow() {
        setTabBarSelected();
        this.self_info = uni.getStorageSync('self_info') || {
            name: '',
            company: '',
        };
        this.init_pages();
    },
}
</script>

<style scoped>
.workbench-page {
    min-height: 100vh;
    background: #F2F4FA;
    box-sizing: border-box;
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.hero {
    position: relative;
    padding: 28rpx 32rpx 48rpx;
    background: linear-gradient(145deg, #2F3FCF 0%, #465CFF 68%, #6B7CFF 100%);
    overflow: hidden;
}

.hero-logo-bg {
    position: absolute;
    top: 0;
    right: 0;
    width: 52%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
}

.hero-logo-img {
    width: 260rpx;
    height: 260rpx;
    opacity: 0.34;
    /* 右上角溢出裁剪，约露出四分之一 */
    transform: translate(42%, -28%);
}

.hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
}

.hero-hello {
    display: block;
    font-size: 34rpx;
    color: #FFFFFF;
    font-weight: 700;
}

.hero-company {
    display: block;
    margin-top: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.78);
}

.body {
    padding: 0 24rpx;
    margin-top: -18rpx;
    position: relative;
    z-index: 2;
}

.search-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 18rpx 22rpx;
    background: #FFFFFF;
    border-radius: 999rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.08);
    margin-bottom: 24rpx;
    position: relative;
}

.search-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.search-input {
    flex: 1;
    margin: 0 14rpx;
    font-size: 26rpx;
    color: #1A1F36;
}

.search-clear {
    font-size: 22rpx;
    color: #465CFF;
}

.section {
    margin-bottom: 22rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 10rpx 28rpx rgba(40, 58, 120, 0.06);
    padding: 22rpx 16rpx 18rpx;
}

.section-head {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0 8rpx 16rpx;
}

.section-head-left {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.section-bar {
    width: 8rpx;
    height: 34rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #465CFF, #8BA0FF);
    margin-right: 14rpx;
}

.section-titles {
    display: flex;
    flex-direction: column;
}

.section-title {
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 700;
    line-height: 1.2;
}

.section-en {
    margin-top: 2rpx;
    font-size: 16rpx;
    color: #9AA3B8;
    letter-spacing: 2rpx;
}

.app-count {
    font-size: 22rpx;
    color: #8A94A6;
    background: #F3F5FF;
    padding: 8rpx 14rpx;
    border-radius: 999rpx;
}

.recent-scroll {
    width: 100%;
    white-space: nowrap;
}

.recent-list {
    display: inline-flex;
    flex-direction: row;
    padding: 0 4rpx 8rpx;
}

.recent-card {
    width: 420rpx;
    margin-right: 16rpx;
    padding: 20rpx;
    border-radius: 20rpx;
    background: linear-gradient(135deg, #F7F8FE 0%, #EEF1FB 100%);
    border: 1rpx solid #E8ECF6;
    display: flex;
    flex-direction: row;
    align-items: center;
    box-sizing: border-box;
}

.recent-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 16rpx;
}

.recent-meta {
    flex: 1;
    min-width: 0;
    margin-right: 8rpx;
}

.recent-name {
    display: block;
    font-size: 28rpx;
    color: #1A1F36;
    font-weight: 600;
}

.recent-desc {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #8A94A6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.spotlight-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
}

.spotlight-card {
    width: 50%;
    padding: 0 8rpx 16rpx;
    box-sizing: border-box;
}

.spotlight-inner {
    padding: 22rpx 20rpx;
    border-radius: 22rpx;
    min-height: 180rpx;
    box-sizing: border-box;
}

.spotlight-top {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
}

.spotlight-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 18rpx;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
}

.spotlight-name {
    display: block;
    font-size: 28rpx;
    color: #FFFFFF;
    font-weight: 700;
}

.spotlight-desc {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.82);
}

.field-scroll {
    width: 100%;
    white-space: nowrap;
}

.field-list {
    display: inline-flex;
    flex-direction: row;
    padding: 0 4rpx 4rpx;
}

.field-tile {
    width: 168rpx;
    flex-shrink: 0;
    padding: 14rpx 8rpx 18rpx;
}

.app-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
}

.app-tile {
    width: 25%;
    box-sizing: border-box;
    padding: 14rpx 8rpx 18rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.app-icon {
    width: 88rpx;
    height: 88rpx;
    border-radius: 26rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
}

.app-name {
    font-size: 22rpx;
    color: #2D3748;
    font-weight: 500;
    text-align: center;
    line-height: 1.3;
}

.empty-box {
    padding: 80rpx 0 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #FFFFFF;
    border-radius: 24rpx;
    margin-bottom: 22rpx;
}

.empty-text {
    margin-top: 16rpx;
    font-size: 24rpx;
    color: #A0AABC;
}
</style>

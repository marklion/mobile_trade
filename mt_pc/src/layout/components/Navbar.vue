<template>
<div class="navbar">
    <hamburger :is-active="sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />

    <breadcrumb class="breadcrumb-container" />

    <div class="right-menu">
        <global-stat-scope-bar />
        <el-dropdown class="avatar-container" trigger="click">
            <div class="avatar-wrapper">
                <div class="user-meta">
                    <div class="user-meta-line">
                        {{ company_name }}
                    </div>
                    <div class="user-meta-line user-meta-line-right">
                        {{ name }}
                    </div>
                </div>
                <img :src="avatar+'?imageView2/1/w/80/h/80'" class="user-avatar">
                <i class="el-icon-caret-bottom" />
            </div>
            <el-dropdown-menu slot="dropdown" class="user-dropdown">
                <router-link to="/">
                    <el-dropdown-item>
                        主页
                    </el-dropdown-item>
                </router-link>
                <el-dropdown-item @click.native="openContactDialog">
                    <span class="contact-text">联系方式：{{ company_contact || '点击设置' }}</span>
                </el-dropdown-item>
                <el-dropdown-item divided @click.native="logout">
                    <span style="display:block; color:red;">退出登录</span>
                </el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>
            <el-dialog title="设置联系方式" :visible.sync="contact_dialog_visible" width="420px" :modal="false"
                append-to-body>
                <el-input v-model="contact_input" maxlength="2048" placeholder="请输入当前公司联系方式" clearable />
                <span slot="footer" class="dialog-footer">
                    <el-button @click="contact_dialog_visible = false">取 消</el-button>
                    <el-button type="primary" :loading="contact_saving" @click="saveCompanyContact">保 存</el-button>
                </span>
            </el-dialog>
   
    </div>
</div>
</template>

<script>
import {
    mapGetters
} from 'vuex'
import Breadcrumb from '@/components/Breadcrumb'
import Hamburger from '@/components/Hamburger'
import GlobalStatScopeBar from '@/components/GlobalStatScopeBar.vue'

export default {
    components: {
        Breadcrumb,
        Hamburger,
        'global-stat-scope-bar': GlobalStatScopeBar
    },
    data() {
        return {
            company_contact: '',
            contact_dialog_visible: false,
            contact_input: '',
            contact_saving: false
        }
    },
    computed: {
        ...mapGetters([
            'sidebar',
            'avatar',
            'name',
            'company_name'
        ])
    },
    mounted() {
        this.loadCompanyContact()
    },
    methods: {
        toggleSideBar() {
            this.$store.dispatch('app/toggleSideBar')
        },
        async loadCompanyContact() {
            try {
                const ret = await this.$send_req('/rbac/get_company_contact', {}, true)
                this.company_contact = ret.contact || ''
            } catch (error) {
                this.company_contact = ''
            }
        },
        openContactDialog() {
            this.contact_input = this.company_contact
            this.contact_dialog_visible = true
        },
        async saveCompanyContact() {
            this.contact_saving = true
            try {
                await this.$send_req('/rbac/set_company_contact', {
                    contact: this.contact_input || ''
                }, true)
                this.company_contact = (this.contact_input || '').trim()
                this.contact_dialog_visible = false
                this.$message.success('联系方式已更新')
            } finally {
                this.contact_saving = false
            }
        },
        async logout() {
            await this.$store.dispatch('user/logout')
            this.$router.push(`/login?redirect=${this.$route.fullPath}`)
        }
    }
}
</script>

<style lang="scss" scoped>
.navbar {
    height: 50px;
    overflow: hidden;
    position: relative;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 21, 41, .08);

    .hamburger-container {
        line-height: 46px;
        height: 100%;
        float: left;
        cursor: pointer;
        transition: background .3s;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(0, 0, 0, .025)
        }
    }

    .breadcrumb-container {
        float: left;
    }

    .right-menu {
        float: right;
        display: flex;
        align-items: center;
        height: 100%;
        line-height: 50px;

        &:focus {
            outline: none;
        }

        .right-menu-item {
            display: inline-block;
            padding: 0 8px;
            height: 100%;
            font-size: 18px;
            color: #5a5e66;
            vertical-align: text-bottom;

            &.hover-effect {
                cursor: pointer;
                transition: background .3s;

                &:hover {
                    background: rgba(0, 0, 0, .025)
                }
            }
        }

        .avatar-container {
            margin-right: 30px;
            line-height: normal;

            .contact-text {
                display: block;
                max-width: 260px;
                white-space: normal;
                line-height: 20px;
                color: #303133;
            }

            .avatar-wrapper {
                margin-top: 0;
                position: relative;
                display: flex;
                align-items: center;

                .user-meta {
                    height: 100%;
                    line-height: 25px;
                    display: inline-flex;
                    flex-direction: column;
                    justify-content: center;
                    max-width: 180px;
                    min-width: 0;
                    margin-right: 8px;
                }

                .user-meta-line {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .user-meta-line-right {
                    text-align: right;
                }

                .user-avatar {
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                }

                .el-icon-caret-bottom {
                    cursor: pointer;
                    position: absolute;
                    right: -20px;
                    top: 25px;
                    font-size: 12px;
                }
            }
        }
    }
}
</style>

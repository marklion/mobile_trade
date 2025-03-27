import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * Note: sub-menu only appear when route children.length >= 1
 * Detail see: https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 *
 * hidden: true                   if set true, item will not show in the sidebar(default is false)
 * alwaysShow: true               if set true, will always show the root menu
 *                                if not set alwaysShow, when item has more than one children route,
 *                                it will becomes nested mode, otherwise not show the root menu
 * redirect: noRedirect           if set noRedirect will no redirect in the breadcrumb
 * name:'router-name'             the name is used by <keep-alive> (must set!!!)
 * meta : {
    roles: ['admin','editor']    control the page roles (you can set multiple roles)
    title: 'title'               the name show in sidebar and breadcrumb (recommend set)
    icon: 'svg-name'/'el-icon-x' the icon show in the sidebar
    breadcrumb: false            if set false, the item will hidden in breadcrumb(default is true)
    activeMenu: '/example/list'  if set path, the sidebar will highlight the path you set
  }
 */

/**
 * constantRoutes
 * a base page that does not have permission requirements
 * all roles can be accessed
 */
export const constantRoutes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login'),
    hidden: true
  },
  {
    path: '/404',
    name: 'fof',
    component: () => import('@/views/404'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    name: 'home',
    redirect: '/dashboard',
    children: [{
      path: 'dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard'),
      meta: { title: '主页', icon: 'dashboard', affix: true }
    }]
  }
]

/**
 * asyncRoutes
 * the routes that need to be dynamically loaded based on user roles
 */
export const asyncRoutes = [
  {
    path: '/order',
    component: Layout,
    redirect: 'noRedirect',
    name: 'Order',
    meta: {
      title: '订单管理',
      icon: 'nested',
      roles: ['sale_management', 'buy_management', 'customer', 'supplier']
    },
    children: [
      {
        path: 'order_sold',
        component: () => import('@/views/order/OrderSold'), // Parent router-view
        name: 'order_sold',
        meta: { title: '销售接单', roles: ['sale_management'] }
      },
      {
        path: 'order_bought',
        name: 'order_bought',
        component: () => import('@/views/order/OrderBought'), // Parent router-view
        meta: { title: '采购接单', roles: ['buy_management'] },
      },
      {
        path: 'order_buy',
        name: 'order_buy',
        component: () => import('@/views/order/OrderBuy'), // Parent router-view
        meta: { title: '采购下单', roles: ['customer'] },
      }, {
        path: 'order_sale',
        name: 'order_sale',
        component: () => import('@/views/order/OrderSale'), // Parent router-view
        meta: { title: '销售下单', roles: ['supplier'] },
      },
    ]
  },
  {
    path: '/contract',
    component: Layout,
    redirect: 'noRedirect',
    name: 'Contract',
    meta: {
      title: '合同管理',
      icon: 'el-icon-document-checked',
      roles: ['sale_management', 'buy_management', 'customer', 'supplier']
    },
    children: [
      {
        path: 'contract_sold',
        component: () => import('@/views/contract/ContractSold'),
        name: 'contract_sold',
        meta: { title: '销售合同签订', roles: ['sale_management'] }
      },
      {
        path: 'contract_bought',
        component: () => import('@/views/contract/ContractBought'),
        name: 'contract_bought',
        meta: { title: '采购合同签订', roles: ['buy_management'] }
      }, {
        path: 'contract_sale',
        component: () => import('@/views/contract/ContractSale'),
        name: 'contract_sale',
        meta: { title: '销售合同参与', roles: ['supplier'] }
      }, {
        path: 'contract_buy',
        component: () => import('@/views/contract/ContractBuy'),
        name: 'contract_buy',
        meta: { title: '采购合同参与', roles: ['customer'] }
      },
    ]
  },
  {
    path: '/stuff',
    component: Layout,
    name: 'Stuff',
    meta: {
      title: '物料管理',
      icon: 'el-icon-goods',
      roles: ['stuff']
    },
    children: [
      {
        path: 'stuff_config',
        component: () => import('@/views/stuff/StuffConfig'),
        name: 'stuff_config',
        meta: { title: '物料配置' }
      },
      {
        path: 'global_strategy',
        component: () => import('@/views/stuff/GlobalStrategy'),
        name: 'global_strategy',
        meta: { title: '全局策略' }
      },
      {
        path: 'blacklist',
        component: () => import('@/views/stuff/BlackList'),
        name: 'blacklist',
        meta: { title: '黑名单' }
      }
    ]
  },
  {
    path: '/bidding',
    component: Layout,
    name: 'Bidding',
    meta: {
      title: '竞价管理',
      icon: 'el-icon-s-data',
      roles: ['bid', 'customer']
    },
    children: [
      {
        path: 'biddingconfig',
        name: 'biddingconfig',
        component: () => import('@/views/bidding/BiddingConfig'),
        meta: { title: '竞价配置', roles: ['bid'] }
      },
      {
        path: 'biddingjoin',
        name: 'biddingjoin',
        component: () => import('@/views/bidding/BiddingJoin'),
        meta: { title: '竞价参与', roles: ['customer'] }
      }
    ]
  },
  {
    path: '/sc',
    component: Layout,
    name: 'Sc',
    meta: {
      title: '安检配置',
      icon: 'el-icon-finished',
      roles: ['sc']
    },
    children: [
      {
        path: 'license_check',
        name: 'LicenseCheck',
        component: () => import('@/views/sc/LicenseCheck'),
        meta: { title: '证件要求', roles: ['sc'] }
      },
      {
        path: 'field_check',
        name: 'FieldCheck',
        component: () => import('@/views/sc/FieldCheck'),
        meta: { title: '现场检查', roles: ['sc'] }
      },
    ]
  },
  {
    path: '/field',
    component: Layout,
    name: 'Field',
    meta: {
      title: '现场管理',
      icon: 'el-icon-s-flag',
      roles: ['scale']
    },
    children: [
      {
        path: 'queue',
        name: 'queue',
        component: () => import('@/views/field/Queue'),
        meta: { title: '排队车辆', roles: ['scale'] }
      },
      {
        path: 'devopt',
        name: 'devopt',
        component: () => import('@/views/field/DevOpt'),
        meta: { title: '设备管理', roles: [] }
      },
      {
        path: 'seal_pic',
        name: 'seal_pic',
        component: () => import('@/views/field/SealPic'),
        meta: { title: '磅单印章', roles: ['scale'] }
      }
    ]
  },
  {
    path: '/export',
    component: Layout,
    name: 'Export',
    meta: {
      title: '导出',
      icon: 'el-icon-discount',
    },
    children: [
      {
        path: 'export_execute',
        name: 'export_execute',
        component: () => import('@/views/export/ExportExecute'),
        meta: { title: '导出执行' }
      },
      {
        path: 'export_record',
        name: 'export_record',
        component: () => import('@/views/export/ExportRecord'),
        meta: { title: '导出记录' }
      },
    ]
  },
  {
    path: '/system_config',
    name: 'SystemConfig',
    component: Layout,
    meta: {
      title: '系统配置',
      icon: 'el-icon-s-grid',
    },
    children: [
      {
        path: 'rbac',
        name: 'rbac',
        component: () => import('@/views/Rbac'),
        meta: { title: '权限配置', roles: ['rbac'] }
      },
      {
        path: 'u8c',
        name: 'u8c',
        component: () => import('@/views/u8c'),
        meta: { title: 'u8c同步', roles: ['u8c'] }
      },
      {
        path: 'wx_msg',
        name: 'wx_msg',
        component: () => import('@/views/admin/WxMsgConfig'),
        meta: { title: '通知配置', roles: ['global'] }
      }
    ]
  },
  {
    path: '/subPage',
    component: Layout,
    name: 'create',
    children: [{
      path: 'OrderCreate',
      name: 'OrderCreate',
      component: () => import('@/views/order/OrderCreate'),
      meta: {
        title: '下单',
        icon: 'el-icon-goods',
        roles: ['customer', 'supplier']
      },
      hidden: true
    }]
  },
  {
    path: 'Help',
    name: 'Help',
    component: Layout,
    children: [
      {
        name: 'doc_site',
        path: process.env.REMOTE_HOST + '/help/',
        meta: { title: '帮助', icon: 'link' }
      }
    ]
  },
  {
    path: 'OpenApi',
    name: 'OpenApi',
    component: Layout,
    children: [
      {
        name: 'api_help',
        path: process.env.REMOTE_HOST + '/api/help',
        meta: { title: '开放接口', icon: 'link' }
      }
    ]
  },


  // 404 page must be placed at the end !!!
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  // mode: 'history', // require service support
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router

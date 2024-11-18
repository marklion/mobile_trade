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
    path:'/stuff',
    component:Layout,
    name:'Stuff',
    meta:{
      title:'物料管理',
      icon:'el-icon-goods',
      roles:['stuff']
    },
    children:[
      {
        path: 'stuff_config',
        component: () => import('@/views/stuff/StuffConfig'),
        name: 'stuff_config',
        meta: { title: '物料配置'}
      },
      {
        path: 'global_strategy',
        component: () => import('@/views/stuff/GlobalStrategy'),
        name: 'global_strategy', 
        meta: { title: '全局策略'}
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
    path: '/field',
    component: Layout,
    name: 'Field',
    meta: {
      title: '现场管理',
      icon: 'nested',
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
      }]
  },
  {
    path: 'OpenApi',
    name: 'OpenApi',
    component: Layout,
    children: [
      {
        name: 'api_help',
        path: 'https://www.d8sis.cn/mt_api/api/help',
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

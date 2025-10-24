import { createRouter, createWebHistory } from 'vue-router'

// 路由懒加载优化
const routes = [
  {
    path: '/',
    redirect: '/services'
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import(/* webpackChunkName: "services" */ '@/views/ServicesView.vue'),
    meta: { 
      keepAlive: true,
      preload: true 
    }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import(/* webpackChunkName: "messages" */ '@/views/MessagesView.vue'),
    meta: { 
      keepAlive: true,
      preload: false 
    }
  },
  {
    path: '/model-setup',
    name: 'ModelSetup',
    component: () => import(/* webpackChunkName: "model-setup" */ '@/views/ModelSetupView.vue'),
    meta: { 
      keepAlive: true,
      preload: true 
    }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import(/* webpackChunkName: "chat" */ '@/views/ChatView.vue'),
    meta: { 
      keepAlive: true,
      preload: false 
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 路由预加载优化
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由预加载
router.beforeEach((to, from, next) => {
  if (to.meta.preload && to.matched.length) {
    // 预加载关键路由
    const component = to.matched[0].components?.default
    if (component && typeof component === 'function') {
      component()
    }
  }
  next()
})

export default router


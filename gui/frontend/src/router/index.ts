import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/services'
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('@/views/ServicesView.vue')
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import('@/views/MessagesView.vue')
  },
  {
    path: '/model-setup',
    name: 'ModelSetup',
    component: () => import('@/views/ModelSetupView.vue')
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue')
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})


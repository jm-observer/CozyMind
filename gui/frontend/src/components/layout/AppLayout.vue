<template>
  <div class="app-layout">
    <!-- 固定头部 -->
    <AppHeader />
    
    <!-- 导航栏 -->
    <AppNav />
    
    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-content {
  padding-top: 180px; /* 为固定头部和导航栏留出空间 */
  min-height: calc(100vh - 180px);
}
</style>

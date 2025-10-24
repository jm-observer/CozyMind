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
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden; /* 防止app-layout本身滚动 */
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1; /* 占用剩余全部空间 */
  overflow: hidden; /* 主内容区域不滚动 */
  display: block; /* 设置为block，紧贴导航栏 */
}
</style>

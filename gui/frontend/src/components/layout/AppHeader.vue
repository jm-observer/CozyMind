<template>
  <div class="fixed-header">
    <div class="container">
      <header class="text-center text-white py-4">
        <h1 class="text-3xl font-bold mb-2 text-shadow-lg">🧠 CozyMind</h1>
        <p class="text-lg opacity-90">AI 服务管理与监控面板</p>
      </header>
    </div>
  </div>
</template>

<script setup lang="ts">
// 头部组件逻辑
</script>

<style scoped>
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  height: 80px; /* 固定头部高度 */
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.text-shadow-lg {
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}
</style>

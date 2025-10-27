<template>
  <nav class="main-nav">
    <div class="nav-container">
      <router-link 
        to="/services" 
        class="nav-btn"
        :class="{ active: $route.path === '/services' }"
      >
        🔗 服务管理
      </router-link>
      <router-link 
        to="/messages" 
        class="nav-btn"
        :class="{ active: $route.path === '/messages' }"
      >
        💬 消息预设
      </router-link>
      <router-link 
        to="/model-setup" 
        class="nav-btn"
        :class="{ active: $route.path === '/model-setup' }"
      >
        ⚙️ 模型设定
      </router-link>
      <router-link 
        to="/chat" 
        class="nav-btn"
        :class="{ active: $route.path === '/chat' }"
      >
        💭 用户对话
      </router-link>
      <router-link 
        to="/mqtt-test" 
        class="nav-btn"
        :class="{ active: $route.path === '/mqtt-test' }"
      >
        🔧 MQTT测试
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
// 导航组件逻辑
</script>

<style scoped>
.main-nav {
  display: flex;
  justify-content: center;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  height: 60px; /* 导航栏高度 */
}

.nav-container {
  display: flex;
  gap: 12px;
  max-width: 1200px;
  width: 100%;
  justify-content: center;
}

.nav-btn {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: none;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  opacity: 1;
}

.nav-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: white;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  position: relative;
}

.nav-btn.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #667eea;
}
</style>

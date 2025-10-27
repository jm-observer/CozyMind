<template>
  <div class="mqtt-test-view p-6">
    <h1 class="text-2xl font-bold mb-6">MQTT WebSocket 连接测试</h1>
    
    <div class="space-y-4">
      <!-- 连接状态 -->
      <div class="bg-gray-100 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">连接状态</h2>
        <div class="flex items-center space-x-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          <span>{{ connectionStatus.isConnected ? '已连接' : '未连接' }}</span>
          <span class="text-sm text-gray-600">
            (状态码: {{ connectionStatus.readyState }})
          </span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="flex space-x-4">
          <el-button 
            type="primary" 
            @click="connect"
            :loading="connecting"
            :disabled="connectionStatus.isConnected"
          >
            连接
          </el-button>
          
          <el-button 
            type="danger" 
            @click="disconnect"
            :disabled="!connectionStatus.isConnected"
          >
            断开
          </el-button>
          
          <el-button 
            type="success" 
            @click="sendTestMessage"
            :disabled="!connectionStatus.isConnected"
          >
            发送测试消息
          </el-button>
          
          <el-button 
            type="info" 
            @click="subscribeTest"
            :disabled="!connectionStatus.isConnected"
          >
            订阅测试主题
          </el-button>
      </div>

      <!-- 消息日志 -->
      <div class="bg-gray-100 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">消息日志</h2>
        <div class="h-64 overflow-y-auto bg-white p-2 rounded border">
          <div 
            v-for="(log, index) in logs" 
            :key="index"
            class="text-sm mb-1"
            :class="log.type === 'error' ? 'text-red-600' : 'text-gray-800'"
          >
            [{{ log.time }}] {{ log.message }}
          </div>
        </div>
        <el-button size="small" @click="clearLogs" class="mt-2">
          清空日志
        </el-button>
      </div>

      <!-- 配置信息 -->
      <div class="bg-gray-100 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">配置信息</h2>
        <div class="text-sm space-y-1">
          <div>WebSocket URL: ws://localhost:8885</div>
          <div>客户端 ID: {{ connectionStatus.clientId }}</div>
          <div>协议: MQTT over WebSocket</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { mqttClient } from '@/services/mqttClient'

// 状态
const connecting = ref(false)
const connectionStatus = reactive({
  isConnected: false,
  connected: false,
  clientId: ''
})

const logs = ref<Array<{ time: string, message: string, type?: string }>>([])

// 添加日志
const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
  logs.value.push({
    time: new Date().toLocaleTimeString(),
    message,
    type
  })
}

// 客户端切换（现在只有 mqtt.js 客户端）
const onClientChange = () => {
  addLog('使用 mqtt.js 客户端')
}

// 连接
const connect = async () => {
  try {
    connecting.value = true
    addLog('开始连接 MQTT broker (mqtt.js)...')
    
    await mqttClient.connect({
      clientId: `test_client_${Date.now()}`,
      clean: true,
      keepalive: 60
    })
    
    const status = mqttClient.getConnectionStatus()
    Object.assign(connectionStatus, status)
    
    addLog('连接成功！', 'success')
    ElMessage.success('MQTT 连接成功')
  } catch (error) {
    addLog(`连接失败: ${error}`, 'error')
    ElMessage.error('连接失败')
  } finally {
    connecting.value = false
  }
}

// 断开连接
const disconnect = () => {
  mqttClient.disconnect()
  const status = mqttClient.getConnectionStatus()
  Object.assign(connectionStatus, status)
  addLog('已断开连接')
  ElMessage.info('已断开连接')
}

// 发送测试消息
const sendTestMessage = () => {
  const success = mqttClient.publish('test/message', 'Hello MQTT from Vue.js!')
  if (success) {
    addLog('测试消息已发送到主题: test/message')
    ElMessage.success('测试消息已发送')
  } else {
    addLog('发送测试消息失败', 'error')
    ElMessage.error('发送失败')
  }
}

// 订阅测试主题
const subscribeTest = () => {
  const success = mqttClient.subscribe('test/message')
  if (success) {
    addLog('已订阅主题: test/message')
    ElMessage.success('已订阅测试主题')
  } else {
    addLog('订阅失败', 'error')
    ElMessage.error('订阅失败')
  }
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 生命周期
onMounted(() => {
  addLog('MQTT WebSocket 测试页面已加载')
  
  // 定期更新连接状态
  const statusInterval = setInterval(() => {
    const status = mqttClient.getConnectionStatus()
    Object.assign(connectionStatus, status)
  }, 1000)
  
  onUnmounted(() => {
    clearInterval(statusInterval)
  })
})
</script>

<style scoped>
.mqtt-test-view {
  max-width: 800px;
  margin: 0 auto;
}
</style>

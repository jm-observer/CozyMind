<template>
  <div class="chat-view">
    <div class="container mx-auto px-4 py-6">
      <div class="chat-container">
        <!-- 聊天主区域 -->
        <div class="chat-main">
          <div class="chat-header">
            <h2 class="text-xl font-semibold">💬 用户对话</h2>
            <div class="chat-controls">
          <!-- 连接状态 -->
              <div class="flex items-center space-x-2 mr-4">
            <div 
              class="w-2 h-2 rounded-full"
              :class="chatStore.isConnected ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            <span class="text-sm text-gray-600">
              {{ chatStore.isConnected ? '已连接' : '未连接' }}
            </span>
          </div>
              <el-button size="small" @click="clearMessages">
                🗑️ 清空对话
              </el-button>
        </div>
          </div>
          
          <!-- 消息历史显示 -->
          <div class="chat-messages" ref="messagesContainer">
            <div v-if="chatStore.messages.length === 0" class="chat-welcome">
              <p>💬 欢迎使用用户对话</p>
              <p>与 AI 助手进行实时对话交流</p>
            </div>

            <!-- 对话消息 -->
            <div
              v-for="message in chatStore.messages"
              :key="message.id"
              v-memo="[message.id, message.content, message.status, message.role]"
              class="message-item"
              :class="{
                'message-user': message.role === 'user',
                'message-assistant': message.role === 'assistant'
              }"
            >
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">
                    {{ message.role === 'user' ? '👤 用户' : '🤖 AI助手' }}
                  </span>
                  <span class="message-time">
                    {{ formatTime(message.timestamp) }}
                  </span>
                </div>
                <div class="message-text">{{ message.content }}</div>
                <div v-if="message.status && message.status !== 'sent'" class="message-status">
                  <span 
                    class="status-indicator"
                    :class="{
                      'status-sending': message.status === 'sending',
                      'status-failed': message.status === 'failed'
                    }"
                  >
                    {{ 
                      message.status === 'sending' ? '发送中...' :
                      message.status === 'failed' ? '发送失败' : ''
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="chat-input-area">
            <div class="input-wrapper">
              <el-input
                v-model="messageInput"
                type="textarea"
                :rows="3"
                placeholder="输入消息，按 Enter 或 Ctrl+Enter 发送..."
                @keydown="handleKeydown"
                :disabled="!chatStore.isConnected"
              />
              
              <div class="input-actions">
                <div class="input-info">
                  <span>{{ chatStore.isConnected ? 'MQTT已连接' : 'MQTT未连接' }}</span>
                </div>
                <el-button
                  type="primary" 
                  @click="handleSendMessage"
                  :loading="chatStore.loading"
                  :disabled="!messageInput.trim() || !chatStore.isConnected"
                >
                  🚀 发送消息
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧配置面板 -->
        <div class="chat-sidebar">
          <div class="sidebar-section">
            <h3 class="sidebar-title">MQTT Broker 连接</h3>
            <div class="connection-info">
              <div class="connection-item">
                <span class="connection-label">连接地址：</span>
                <span class="connection-value">{{ brokerUrl }}</span>
              </div>
              <div class="connection-item">
                <span class="connection-label">连接状态：</span>
                <span 
                  class="connection-status"
                  :class="chatStore.isConnected ? 'status-connected' : 'status-disconnected'"
                >
                  {{ chatStore.isConnected ? '已连接' : '未连接' }}
                </span>
              </div>
              <div class="connection-item">
                <span class="connection-label">客户端ID：</span>
                <span class="connection-value">{{ clientId }}</span>
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <h3 class="sidebar-title">Topic 配置</h3>
            <div class="topic-config">
              <div class="topic-item">
                <label class="topic-label">订阅 Topic：</label>
                <el-input
                  v-model="subscribeTopic"
                  readonly
                  size="small"
                  class="topic-input"
                />
              </div>
              <div class="topic-item">
                <label class="topic-label">发送 Topic：</label>
                <el-input
                  v-model="publishTopic"
                  readonly
                  size="small"
                  class="topic-input"
                />
          </div>
        </div>
      </div>


          <div class="sidebar-section">
            <h3 class="sidebar-title">消息统计</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ messageStats.total }}</div>
                <div class="stat-label">总消息</div>
          </div>
              <div class="stat-item">
                <div class="stat-value">{{ messageStats.user }}</div>
                <div class="stat-label">用户</div>
                  </div>
              <div class="stat-item">
                <div class="stat-value">{{ messageStats.assistant }}</div>
                <div class="stat-label">AI助手</div>
            </div>
          </div>
        </div>

          <div class="sidebar-section">
            <h3 class="sidebar-title">操作</h3>
            <div class="action-buttons">
            <el-button
              type="primary"
                size="small" 
                @click="reconnectMqtt"
                :loading="reconnecting"
                class="w-full mb-2"
              >
                🔄 重新连接
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click="clearMessages"
                class="w-full mb-2"
              >
                🗑️ 清空对话
              </el-button>
              <el-button 
                type="success" 
                size="small" 
                @click="testConnection"
                class="w-full"
              >
                🧪 测试连接
            </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chatStore'
import { mqttClient } from '@/services/mqttClient'

// 状态
const messageInput = ref('')
const messagesContainer = ref<HTMLElement>()
const reconnecting = ref(false)

// MQTT 连接信息
const brokerUrl = ref('ws://localhost:8885')
const clientId = ref('')

// Topic 配置
const subscribeTopic = ref('user/message/+client_id')
const publishTopic = ref('/ai-core/from-user/message')

// Stores
const chatStore = useChatStore()

// 计算属性
const messageStats = computed(() => {
  const messages = chatStore.messages
  return {
    total: messages.length,
    user: messages.filter(m => m.role === 'user').length,
    assistant: messages.filter(m => m.role === 'assistant').length
  }
})

const handleSendMessage = async () => {
  if (!messageInput.value.trim() || !chatStore.isConnected) return
  
  const content = messageInput.value.trim()
  messageInput.value = ''
  
  try {
    // 直接通过 MQTT 发送消息到指定的 topic
    const request = {
      message: content,
      client_id: clientId.value,
      timestamp: new Date().toISOString()
    }
    
    const success = mqttClient.publish(publishTopic.value, JSON.stringify(request))
    if (!success) {
      throw new Error('发送消息失败')
    }
    
    // 添加用户消息到界面
    const userMessage = {
      id: Date.now().toString(),
      content,
      role: 'user' as const,
      timestamp: new Date().toISOString(),
      status: 'sent' as const
    }
    chatStore.messages.push(userMessage)
    
    scrollToBottom()
  } catch (err) {
    ElMessage.error('发送消息失败')
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    // 如果按的是 Ctrl+Enter，发送消息
    if (event.ctrlKey) {
      event.preventDefault()
      handleSendMessage()
    }
    // 如果按的是单独的 Enter，也发送消息
    else {
      event.preventDefault()
      handleSendMessage()
    }
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

const clearMessages = () => {
  chatStore.clearMessages()
  ElMessage.success('对话已清空')
}

// 重新连接 MQTT
const reconnectMqtt = async () => {
  try {
    reconnecting.value = true
    await chatStore.initializeWebSocket()
    
    // 重新订阅 topic
    mqttClient.subscribe(subscribeTopic.value)
    
    ElMessage.success('重新连接成功')
  } catch (err) {
    ElMessage.error('重新连接失败')
  } finally {
    reconnecting.value = false
  }
}

// 监听 MQTT 连接状态变化
const setupMqttStatusListener = () => {
  // 现在状态是响应式的，不需要额外的监听器
  // chatStore.isConnected 会自动响应 mqttClient.getConnectionStatus().connected 的变化
  console.log('✅ MQTT 状态监听器已设置（响应式）')
}

// 测试连接
const testConnection = async () => {
  try {
    // 发送测试消息
    const testMessage = {
      type: 'test',
      timestamp: new Date().toISOString(),
      message: '连接测试'
    }
    
    const success = mqttClient.publish('test/connection', JSON.stringify(testMessage))
    if (success) {
      ElMessage.success('测试消息发送成功')
    } else {
      ElMessage.error('测试消息发送失败')
    }
  } catch (err) {
    ElMessage.error('连接测试失败')
  }
}

// 生命周期
onMounted(async () => {
  try {
    // 设置客户端ID
    clientId.value = `chat_client_10000`
    
    // 更新订阅 topic 为实际的客户端ID
    subscribeTopic.value = `user/message/${clientId.value}`
    
    // 先设置 MQTT 状态监听器（在连接之前）
    setupMqttStatusListener()
    
    // 然后初始化 MQTT 连接
    await chatStore.initializeWebSocket()
    
    // 订阅指定的 topic（用于接收AI助手的回复）
    mqttClient.subscribe(subscribeTopic.value)
  } catch (err) {
    ElMessage.error('加载数据失败')
  }
})

// 组件卸载时清理资源
onUnmounted(() => {
  chatStore.cleanup()
})
</script>

<style scoped>
.chat-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.chat-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 200px);
}

.chat-main {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chat-welcome {
  text-align: center;
  color: #6b7280;
  padding: 40px 20px;
}

.message-item {
  margin-bottom: 16px;
  display: flex;
  width: 100%;
}

.message-item:last-child {
  margin-bottom: 0;
}

.message-user {
  justify-content: flex-end;
  margin-left: auto;
}

.message-assistant {
  justify-content: flex-start;
  margin-right: auto;
}

.message-content {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  max-width: 70%;
  min-width: 200px;
  width: fit-content;
  word-wrap: break-word;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: max-width 0.2s ease;
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
}

.message-user .message-content {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
  border-bottom-right-radius: 4px;
  margin-left: auto;
}

.message-assistant .message-content {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-color: #d1d5db;
  border-bottom-left-radius: 4px;
  margin-right: auto;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-user .message-header {
  flex-direction: row-reverse;
  text-align: right;
}

.message-assistant .message-header {
  text-align: left;
}

.message-role {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.message-time {
  font-size: 11px;
  color: #9ca3af;
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-user .message-text {
  text-align: right;
}

.message-assistant .message-text {
  text-align: left;
}

.message-status {
  margin-top: 8px;
}

.message-user .message-status {
  text-align: right;
}

.message-assistant .message-status {
  text-align: left;
}

.status-indicator {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.status-indicator.status-sending {
  background: #fef3c7;
  color: #92400e;
}

.status-indicator.status-sent {
  background: #d1fae5;
  color: #065f46;
}

.status-indicator.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

/* 消息气泡箭头效果 */
.message-user .message-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: -8px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-left-color: #dbeafe;
  border-bottom: none;
  border-right: none;
}

.message-assistant .message-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -8px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-right-color: #f3f4f6;
  border-bottom: none;
  border-left: none;
}

.chat-input-area {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-info {
  color: #6b7280;
  font-size: 14px;
}

/* Sidebar 样式 */
.chat-sidebar {
  flex: 0 0 300px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.sidebar-section {
  margin-bottom: 24px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.connection-info {
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.connection-item:last-child {
  margin-bottom: 0;
}

.connection-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.connection-value {
  font-size: 14px;
  color: #1f2937;
  font-family: monospace;
}

.connection-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.connection-status.status-connected {
  background: #d1fae5;
  color: #065f46;
}

.connection-status.status-disconnected {
  background: #fee2e2;
  color: #991b1b;
}

.core-info {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 14px;
  color: #6b7280;
}

.core-info p {
  margin: 0 0 8px 0;
}

.core-info p:last-child {
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.stat-value.success {
  color: #10b981;
}

.stat-value.error {
  color: #ef4444;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topic-config {
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
}

.topic-item {
  margin-bottom: 12px;
}

.topic-item:last-child {
  margin-bottom: 0;
}

.topic-label {
  display: block;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.topic-input {
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-content {
    max-width: 85%;
  }
  
  .chat-container {
    height: calc(100vh - 120px);
    flex-direction: column;
  }
  
  .chat-sidebar {
    flex: none;
    order: -1;
  }
}
</style>


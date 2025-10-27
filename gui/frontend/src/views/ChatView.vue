<template>
  <div class="chat-view">
    <div class="flex h-screen bg-gray-100">
      <!-- 聊天区域 -->
      <div class="flex-1 flex flex-col">
        <!-- 聊天头部 -->
        <div class="bg-white border-b border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-lg font-semibold text-gray-800">用户对话</h1>
              <p class="text-sm text-gray-500">
                {{ chatStore.selectedAiCore?.name || '未选择AI-Core服务' }}
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <!-- 连接状态 -->
              <div class="flex items-center space-x-2">
                <div 
                  class="w-2 h-2 rounded-full"
                  :class="chatStore.isConnected ? 'bg-green-500' : 'bg-red-500'"
                ></div>
                <span class="text-sm text-gray-600">
                  {{ chatStore.isConnected ? '已连接' : '未连接' }}
                </span>
              </div>
              <el-button 
                type="info" 
                size="small" 
                @click="clearMessages"
                :icon="Delete"
              >
                清空对话
              </el-button>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
          <div v-if="chatStore.messages.length === 0" class="text-center text-gray-500 mt-8">
            <div class="text-6xl mb-4">💬</div>
            <p class="text-lg">开始新的对话</p>
            <p class="text-sm mt-2">在下方输入框中输入消息</p>
          </div>

          <div
            v-for="message in chatStore.messages"
            :key="message.id"
            class="flex"
            :class="{
              'justify-end': message.role === 'user',
              'justify-start': message.role === 'assistant'
            }"
          >
            <div
              class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg message-content"
              :class="{
                'bg-blue-500 text-white': message.role === 'user',
                'bg-white border border-gray-200': message.role === 'assistant'
              }"
            >
              <div class="flex items-start space-x-2">
                <div class="flex-1">
                  <p class="text-sm">{{ message.content }}</p>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs opacity-75">
                      {{ formatTime(message.timestamp) }}
                    </span>
                    <span 
                      v-if="message.status === 'sending'"
                      class="text-xs opacity-75"
                    >
                      发送中...
                    </span>
                    <span 
                      v-else-if="message.status === 'failed'"
                      class="text-xs text-red-500"
                    >
                      发送失败
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="bg-white border-t border-gray-200 p-4">
          <div class="flex space-x-2">
            <el-input
              v-model="messageInput"
              placeholder="输入消息..."
              :disabled="!chatStore.selectedAiCore"
              @keydown.enter="handleSendMessage"
              class="flex-1"
            />
            <el-button
              type="primary"
              @click="handleSendMessage"
              :disabled="!messageInput.trim() || !chatStore.selectedAiCore"
              :loading="chatStore.loading"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chatStore'
import { useAICoreStore } from '@/stores/aiCoreStore'

// 状态
const messageInput = ref('')
const messagesContainer = ref<HTMLElement>()

// Stores
const chatStore = useChatStore()
const aiCoreStore = useAICoreStore()

const handleSendMessage = async () => {
  if (!messageInput.value.trim() || !chatStore.selectedAiCore) return
  
  const content = messageInput.value.trim()
  messageInput.value = ''
  
  try {
    await chatStore.sendMessage(content)
    scrollToBottom()
  } catch (err) {
    ElMessage.error('发送消息失败')
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

// 生命周期
onMounted(async () => {
  try {
    // 初始化 MQTT 连接
    await chatStore.initializeWebSocket()
    
    // 加载 AI-Core 服务
    await Promise.all([
      aiCoreStore.loadAICores(),
      aiCoreStore.checkAllConnections()
    ])
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
  height: 100vh;
  overflow: hidden;
}

/* 消息内容样式 - 与 ModelSetupView 保持一致 */
.message-content {
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>


<template>
  <div class="chat-view">
    <div class="flex h-screen bg-gray-100">
      <!-- 左侧会话列表 -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <!-- 会话列表头部 -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-800">会话列表</h2>
            <el-button 
              type="primary" 
              size="small" 
              @click="showCreateSessionModal"
              :icon="Plus"
            >
              新建会话
            </el-button>
          </div>
          
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
        </div>

        <!-- 会话列表 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="chatStore.sessions.length === 0" class="p-4 text-center text-gray-500">
            <p>暂无会话</p>
            <p class="text-sm mt-2">点击"新建会话"开始对话</p>
          </div>
          
          <div v-else class="space-y-1 p-2">
            <div
              v-for="session in chatStore.sessions"
              :key="session.id"
              class="p-3 rounded-lg cursor-pointer transition-colors"
              :class="{
                'bg-blue-50 border-blue-200': chatStore.currentSessionId === session.id,
                'hover:bg-gray-50': chatStore.currentSessionId !== session.id
              }"
              @click="selectSession(session.id)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-medium text-gray-900 truncate">
                    {{ session.name }}
                  </h3>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatTime(session.updated_at) }}
                  </p>
                </div>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click.stop="deleteSession(session.id)"
                  class="ml-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧聊天区域 -->
      <div class="flex-1 flex flex-col">
        <!-- 聊天头部 -->
        <div class="bg-white border-b border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-lg font-semibold text-gray-800">
                {{ chatStore.currentSession?.name || '选择会话开始对话' }}
              </h1>
              <p class="text-sm text-gray-500">
                {{ chatStore.selectedAiCore?.name || '未选择AI-Core服务' }}
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <el-button 
                type="primary" 
                size="small" 
                @click="showCreateSessionModal"
                :icon="Plus"
              >
                新建会话
              </el-button>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
          <div v-if="chatStore.currentMessages.length === 0" class="text-center text-gray-500 mt-8">
            <div class="text-6xl mb-4">💬</div>
            <p class="text-lg">开始新的对话</p>
            <p class="text-sm mt-2">在下方输入框中输入消息</p>
          </div>

          <div
            v-for="message in chatStore.currentMessages"
            :key="message.id"
            class="flex"
            :class="{
              'justify-end': message.role === 'user',
              'justify-start': message.role === 'assistant'
            }"
          >
            <div
              class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg"
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

    <!-- 创建会话对话框 -->
    <el-dialog
      v-model="createSessionModalVisible"
      title="创建新会话"
      width="400px"
    >
      <el-form @submit.prevent="handleCreateSession">
        <el-form-item label="会话名称">
          <el-input
            v-model="newSessionName"
            placeholder="请输入会话名称"
            @keydown.enter="handleCreateSession"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createSessionModalVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleCreateSession"
          :disabled="!newSessionName.trim()"
        >
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chatStore'
import { useAICoreStore } from '@/stores/aiCoreStore'
import type { ChatSession } from '@/types/api'

// 状态
const messageInput = ref('')
const createSessionModalVisible = ref(false)
const newSessionName = ref('')
const messagesContainer = ref<HTMLElement>()

// Stores
const chatStore = useChatStore()
const aiCoreStore = useAICoreStore()

// 方法
const selectSession = async (sessionId: string) => {
  try {
    await chatStore.selectSession(sessionId)
    scrollToBottom()
  } catch (err) {
    ElMessage.error('选择会话失败')
  }
}

const deleteSession = async (sessionId: string) => {
  try {
    await chatStore.deleteSession(sessionId)
    ElMessage.success('会话已删除')
  } catch (err) {
    ElMessage.error('删除会话失败')
  }
}

const showCreateSessionModal = () => {
  newSessionName.value = ''
  createSessionModalVisible.value = true
}

const handleCreateSession = async () => {
  if (!newSessionName.value.trim()) return
  
  try {
    await chatStore.createSession(newSessionName.value.trim())
    createSessionModalVisible.value = false
    ElMessage.success('会话创建成功')
  } catch (err) {
    ElMessage.error('创建会话失败')
  }
}

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
    await Promise.all([
      chatStore.loadSessions(),
      aiCoreStore.loadAICores(),
      aiCoreStore.checkAllConnections()
    ])
    
    // 自动选择第一个会话
    if (chatStore.sessions.length > 0 && !chatStore.currentSessionId) {
      await chatStore.selectSession(chatStore.sessions[0].id)
    }
  } catch (err) {
    ElMessage.error('加载数据失败')
  }
})
</script>

<style scoped>
.chat-view {
  height: 100vh;
  overflow: hidden;
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


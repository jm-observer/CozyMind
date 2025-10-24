<template>
  <div class="model-setup-view">
    <div class="container mx-auto px-4 py-6">
      <div class="chat-container">
        <!-- 左侧消息窗口 -->
        <div class="chat-main">
          <div class="chat-header">
            <h2 class="text-xl font-semibold">⚙️ 模型系统参数设定</h2>
            <div class="chat-controls">
              <el-button size="small" @click="clearHistory">
                🗑️ 清空历史
              </el-button>
            </div>
          </div>

           <!-- 消息历史显示 -->
           <div class="chat-messages" ref="messagesContainer">
             <div v-if="history.length === 0 && visibleMessages.length === 0" class="chat-welcome">
               <p>⚙️ 欢迎使用模型系统参数设定</p>
               <p>配置 AI 模型的系统提示词，定义模型的行为和角色</p>
             </div>

             <!-- 对话消息 -->
             <div
               v-for="message in visibleMessages"
               :key="message.id"
               v-memo="[message.id, message.content, message.status, message.role]"
               class="message-item"
               :class="{
                 'message-user': message.role === 'user',
                 'message-assistant': message.role === 'assistant'
               }"
             >
               <div 
                 class="message-content"
               >
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
              <div class="input-options">
                <el-button size="small" @click="showMessageSelector">
                  📋 从消息预设选择
                </el-button>
                <el-button size="small" type="primary" @click="showMessageSelectorAndSend">
                  📋 选择直接发送
                </el-button>
                <el-button size="small" @click="clearSystemPrompt">
                  🗑️ 清空
                </el-button>
              </div>
              
              <el-input
                v-model="localSystemPrompt"
                type="textarea"
                :rows="3"
                placeholder="输入系统参数，例如：你是一个专业的中文助手，擅长回答各种问题..."
                @keydown="handleKeydown"
              />
              
              <div class="input-actions">
                <div class="input-info">
                  <span>{{ charCount }}</span> 字符
                </div>
                <el-button 
                  type="primary" 
                  @click="sendSystemPrompt"
                  :loading="loading"
                  :disabled="!localCanSend"
                >
                  🚀 发送系统参数
                </el-button>
              </div>
            </div>
          </div>
        </div>


        <!-- 右侧配置面板 -->
        <div class="chat-sidebar">
          <div class="sidebar-section">
            <h3 class="sidebar-title">AI-Core 服务</h3>
            <el-select
              v-model="selectedAiCoreId"
              placeholder="选择 AI-Core 服务"
              class="w-full"
              @change="handleAiCoreChange"
            >
              <el-option
                v-for="core in availableAiCores"
                :key="core.id"
                :label="core.name"
                :value="core.id"
                :disabled="core.status !== 'online'"
              >
                <div class="flex items-center justify-between">
                  <span>{{ core.name }}</span>
                  <span class="status-indicator" :class="`status-${core.status}`">
                    {{ getStatusText(core.status) }}
                  </span>
                </div>
              </el-option>
            </el-select>
            
            <div v-if="selectedAiCore" class="core-info">
              <p><strong>服务地址：</strong>{{ selectedAiCore.url }}</p>
              <p v-if="selectedAiCore.description">
                <strong>描述：</strong>{{ selectedAiCore.description }}
              </p>
            </div>
          </div>

          <div class="sidebar-section">
            <h3 class="sidebar-title">会话配置</h3>
            <el-input
              v-model="sessionId"
              placeholder="会话ID (可选)"
              clearable
            />
            <p class="help-text">留空将创建新会话</p>
          </div>

          <div class="sidebar-section">
            <h3 class="sidebar-title">统计信息</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ stats.sent }}</div>
                <div class="stat-label">总发送</div>
              </div>
              <div class="stat-item">
                <div class="stat-value success">{{ stats.success }}</div>
                <div class="stat-label">成功</div>
              </div>
              <div class="stat-item">
                <div class="stat-value error">{{ stats.fail }}</div>
                <div class="stat-label">失败</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息选择器模态框 -->
    <el-dialog
      v-model="messageSelectorVisible"
      title="选择消息预设"
      width="600px"
      @close="closeMessageSelector"
    >
      <div class="message-selector">
        <el-input
          v-model="messageSearchQuery"
          placeholder="搜索消息..."
          clearable
          class="mb-4"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="message-list">
          <div v-if="messageStore.loading" class="loading-messages">
            <el-icon class="is-loading"><Loading /></el-icon>
            <p>加载消息中...</p>
          </div>
          
          <div v-else-if="filteredSystemMessages.length === 0" class="empty-messages">
            <p>暂无系统消息预设</p>
            <el-button type="primary" @click="goToMessages">去消息预设页面创建</el-button>
          </div>
          
          <div
            v-for="message in filteredSystemMessages"
            :key="message.id"
            class="message-option"
            @click="selectMessage(message)"
          >
            <div class="message-option-header">
              <h4>{{ message.title }}</h4>
              <div class="message-option-actions">
                <el-button size="small" @click.stop="selectMessageAndSend(message)">
                  选择并发送
                </el-button>
                <el-button size="small" @click.stop="selectMessage(message)">
                  选择
                </el-button>
              </div>
            </div>
            <p class="message-option-content">{{ truncateText(message.content, 150) }}</p>
            <div class="message-option-meta">
              <span class="message-tags" v-if="message.tags">{{ message.tags }}</span>
              <span class="message-date">{{ formatDate(message.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="closeMessageSelector">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, defineComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Search, Loading } from '@element-plus/icons-vue'
import { useModelSetupStore } from '@/stores/modelSetupStore'
import { useMessageStore } from '@/stores/messageStore'
import { useAICoreStore } from '@/stores/aiCoreStore'
import { debounce, throttle, batchUpdate } from '@/utils/performance'
import { apiCache, generateCacheKey } from '@/utils/apiCache'
import type { MessagePreset } from '@/types/api'

// 使用 Pinia store
const modelSetupStore = useModelSetupStore()
const messageStore = useMessageStore()
const aiCoreStore = useAICoreStore()

// 本地状态
const messageSelectorVisible = ref(false)
const messageSearchQuery = ref('')
const debouncedSearchQuery = ref('')
const messagesContainer = ref<HTMLElement>()
const localSystemPrompt = ref('') // 本地输入框的值

// 性能优化：限制渲染的消息数量
const MAX_VISIBLE_MESSAGES = 50
const visibleMessages = computed(() => {
  const allMessages = messages.value
  if (allMessages.length <= MAX_VISIBLE_MESSAGES) {
    return allMessages
  }
  // 只显示最新的消息
  return allMessages.slice(-MAX_VISIBLE_MESSAGES)
})

// 防抖搜索 - 使用工具函数
const debouncedSearch = debounce((query: string) => {
  debouncedSearchQuery.value = query
}, 300)

watch(messageSearchQuery, (newQuery) => {
  debouncedSearch(newQuery)
})

// 计算属性
const {
  selectedAiCoreId,
  sessionId,
  loading,
  history,
  messages,
  stats,
  selectedAiCore,
  availableAiCores,
  canSend
} = storeToRefs(modelSetupStore)

// 本地字符计数
const charCount = computed(() => localSystemPrompt.value.length)

// 本地 canSend 计算属性
const localCanSend = computed(() => {
  const hasAiCore = !!selectedAiCoreId.value
  const hasPrompt = localSystemPrompt.value.trim().length > 0
  const notLoading = !loading.value
  const result = hasAiCore && hasPrompt && notLoading
  
  
  return result
})

// 直接获取 systemMessages，避免解构问题
const systemMessages = computed(() => {
  return messageStore.systemMessages || []
})

// 筛选后的系统消息 - 使用防抖搜索优化性能
const filteredSystemMessages = computed(() => {
  const messages = systemMessages.value || []
  
  if (!debouncedSearchQuery.value.trim()) {
    return messages
  }
  
  const query = debouncedSearchQuery.value.toLowerCase()
  return messages.filter((msg: MessagePreset) => 
    msg.title.toLowerCase().includes(query) ||
    msg.content.toLowerCase().includes(query) ||
    (msg.tags && msg.tags.toLowerCase().includes(query))
  )
})

// 方法
const loadData = async () => {
  try {
    await Promise.all([
      modelSetupStore.loadAiCores(),
      messageStore.loadMessages()
    ])
  } catch (err) {
    console.error('[ModelSetup] 加载数据失败:', err)
    ElMessage.error('加载数据失败')
  }
}

const sendSystemPrompt = async () => {
  // 显示用户消息（发送中状态）
  const userMessage = {
    id: Date.now().toString(),
    content: localSystemPrompt.value,
    role: 'user' as const,
    timestamp: new Date().toISOString(),
    status: 'sending' as const
  }
  
  // 添加到消息列表
  messages.value.push(userMessage)
  
  // 滚动到底部
  scrollToBottom()
  
  try {
    // 发送前先更新 store 中的 systemPrompt
    modelSetupStore.setSystemPrompt(localSystemPrompt.value)
    const response = await modelSetupStore.sendSystemPrompt()
    
    // 更新消息状态为已发送
    const messageIndex = messages.value.findIndex(m => m.id === userMessage.id)
    if (!response || messageIndex === -1) {
        messages.value[messageIndex].status = 'failed'
        return
    }
    messages.value[messageIndex].status = 'sent'
    localSystemPrompt.value = ''
    // 添加AI回复消息，使用后端返回的消息
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      content: response.message.response,
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      status: 'sent' as const
    }
    messages.value.push(aiMessage)
    
    scrollToBottom()
    
    ElMessage.success('系统参数发送成功')
  } catch (err) {
    console.error('[ModelSetup] 发送失败:', err)
    
    // 更新消息状态为失败
    const messageIndex = messages.value.findIndex(m => m.id === userMessage.id)
    if (messageIndex !== -1) {
      messages.value[messageIndex].status = 'failed'
    }
    
    ElMessage.error('发送失败')
  }
}

const clearSystemPrompt = () => {
  localSystemPrompt.value = ''
  modelSetupStore.clearSystemPrompt()
}

const clearHistory = () => {
  modelSetupStore.clearHistory()
  ElMessage.success('历史记录已清空')
}

const showMessageSelector = async () => {
  
  // 强制重新加载消息数据
  await messageStore.loadMessages(true)
  
  
  
  // 强制触发计算属性
  const filtered = filteredSystemMessages.value
  
  messageSelectorVisible.value = true
}

const showMessageSelectorAndSend = async () => {
  
  // 强制重新加载消息数据
  await messageStore.loadMessages(true)
  
  
  
  // 强制触发计算属性
  const filtered = filteredSystemMessages.value
  
  messageSelectorVisible.value = true
}

const closeMessageSelector = () => {
  messageSelectorVisible.value = false
  messageSearchQuery.value = ''
}

const selectMessage = (message: MessagePreset) => {
  
  // 直接更新本地输入框
  localSystemPrompt.value = message.content
  
  closeMessageSelector()
}

const selectMessageAndSend = async (message: MessagePreset) => {
  
  // 立即关闭选择框
  closeMessageSelector()
  
  // 更新本地输入框
  localSystemPrompt.value = message.content
  
  
  // 显示用户消息（发送中状态）
  const userMessage = {
    id: Date.now().toString(),
    content: message.content,
    role: 'user' as const,
    timestamp: new Date().toISOString(),
    status: 'sending' as const
  }
  
  // 添加到消息列表
  messages.value.push(userMessage)
  
  // 滚动到底部
  scrollToBottom()
  
  // 异步发送系统参数
  try {
    // 发送前更新 store 中的 systemPrompt
    modelSetupStore.setSystemPrompt(message.content)
    const response = await modelSetupStore.sendSystemPrompt()
    
    // 如果返回 null，说明发送条件不满足，直接返回
    if (!response) {
      // 移除用户消息，因为发送失败
      const msgIndex = messages.value.findIndex(msg => msg.id === userMessage.id)
      if (msgIndex !== -1) {
        messages.value.splice(msgIndex, 1)
      }
      return
    }
    
    // 更新用户消息状态为已发送
    const msgIndex = messages.value.findIndex(msg => msg.id === userMessage.id)
    if (msgIndex !== -1) {
      messages.value[msgIndex].status = 'sent'
    }
    
    // 显示AI回复消息，使用后端返回的消息
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      content: response.message || '系统参数已成功发送到AI-Core服务',
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      status: 'sent' as const
    }
    
    messages.value.push(aiMessage)
    
    scrollToBottom()
  } catch (err) {
    // 更新用户消息状态为失败
    const msgIndex = messages.value.findIndex(msg => msg.id === userMessage.id)
    if (msgIndex !== -1) {
      messages.value[msgIndex].status = 'failed'
    }
    
    // 显示错误消息
    const errorMessage = {
      id: (Date.now() + 1).toString(),
      content: '发送失败，请检查AI-Core服务状态',
      role: 'assistant' as const,
      timestamp: new Date().toISOString(),
      status: 'failed' as const
    }
    
    messages.value.push(errorMessage)
    
    scrollToBottom()
  }
}

const handleAiCoreChange = () => {
  // AI-Core 选择变化时的处理
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendSystemPrompt()
  }
}


// 节流滚动函数
const throttledScrollToBottom = throttle(() => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, 100)

const scrollToBottom = () => {
  nextTick(() => {
    batchUpdate(throttledScrollToBottom)
  })
}

const getStatusText = (status: string | undefined) => {
  const statusMap = {
    'online': '在线',
    'offline': '离线',
    'checking': '检测中'
  }
  return statusMap[status as keyof typeof statusMap] || status || '未知'
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const goToMessages = () => {
  // 跳转到消息预设页面
  window.location.hash = '#/messages'
  closeMessageSelector()
}


onMounted(() => {
  loadData()
})
</script>

<style scoped>
.model-setup-view {
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

.chat-sidebar {
  flex: 0 0 300px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

.history-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  margin-right: auto;
  width: 75%;
  max-width: 600px;
  min-width: 300px;
  border-left: 4px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .history-item {
    width: 90%;
    max-width: none;
    min-width: 250px;
  }
}

@media (max-width: 480px) {
  .history-item {
    width: 95%;
    min-width: 200px;
    padding: 12px;
  }
}

.history-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.history-item.history-success {
  border-left-color: #10b981;
}

.history-item.history-error {
  border-left-color: #ef4444;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
}

.history-time {
  font-weight: 500;
}

.history-service {
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.history-status {
  font-size: 12px;
  font-weight: 500;
}

.history-actions {
  display: flex;
  gap: 8px;
}

.history-content {
  margin-top: 12px;
}

.system-prompt-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

.system-prompt-header {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.system-prompt-text {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
  margin-bottom: 8px;
}

.response-time {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.status-success {
  color: #10b981;
}

.status-error {
  color: #ef4444;
}

.message-content {
  color: #374151;
  line-height: 1.6;
}

.prompt-preview {
  margin-bottom: 12px;
}

.prompt-preview strong {
  color: #1f2937;
}

.session-info,
.response-info,
.error-info {
  margin-top: 8px;
  font-size: 14px;
}

.session-info code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.error-text {
  color: #ef4444;
  font-style: italic;
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

.input-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.sidebar-section {
  margin-bottom: 24px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.core-info {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 14px;
  color: #6b7280;
}

.help-text {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
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

.status-indicator {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.status-indicator.status-online {
  background: #d1fae5;
  color: #065f46;
}

.status-indicator.status-offline {
  background: #fee2e2;
  color: #991b1b;
}

/* 消息显示区域样式 */
.messages-section {
  margin: 20px 0;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.messages-container {
  max-height: 400px;
  overflow: hidden;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
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
  position: relative; /* For arrow */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: max-width 0.2s ease;

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

.status-indicator.status-checking {
  background: #fef3c7;
  color: #92400e;
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

.message-content {
  position: relative;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-content {
    max-width: 85%;
  }
}

.message-selector {
  max-height: 400px;
}

.message-list {
  max-height: 300px;
  overflow: hidden;
}

.message-option {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.message-option:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.message-option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-option-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.message-option-actions {
  display: flex;
  gap: 8px;
}

.message-option-content {
  color: #6b7280;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.5;
}

.message-option-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #9ca3af;
}

.message-tags {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.empty-messages {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-messages p {
  margin-bottom: 16px;
  font-size: 16px;
}

.loading-messages {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.loading-messages .el-icon {
  font-size: 24px;
  margin-bottom: 12px;
}

.loading-messages p {
  margin: 0;
  font-size: 14px;
}
</style>
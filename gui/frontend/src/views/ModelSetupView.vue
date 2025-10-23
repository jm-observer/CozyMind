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
            <div v-if="history.length === 0" class="chat-welcome">
              <p>⚙️ 欢迎使用模型系统参数设定</p>
              <p>配置 AI 模型的系统提示词，定义模型的行为和角色</p>
            </div>
            
            <div
              v-for="item in history"
              :key="item.id"
              class="message-item"
              :class="`message-${item.status}`"
            >
              <div class="message-header">
                <div class="message-meta">
                  <span class="message-time">{{ formatTime(item.timestamp) }}</span>
                  <span class="message-service">{{ item.ai_core_name }}</span>
                  <span class="message-status" :class="`status-${item.status}`">
                    {{ item.status === 'success' ? '✅ 成功' : '❌ 失败' }}
                  </span>
                </div>
                <div class="message-actions">
                  <el-button size="small" @click="copyToPrompt(item)">
                    📋 复制到输入框
                  </el-button>
                </div>
              </div>
              
              <div class="message-content">
                <div class="prompt-preview">
                  <strong>系统参数：</strong>
                  <p>{{ truncateText(item.system_prompt, 200) }}</p>
                </div>
                
                <div v-if="item.session_id" class="session-info">
                  <strong>会话ID：</strong>
                  <code>{{ item.session_id }}</code>
                </div>
                
                <div v-if="item.response_time" class="response-info">
                  <strong>响应时间：</strong>
                  <span>{{ item.response_time }}ms</span>
                </div>
                
                <div v-if="item.error_message" class="error-info">
                  <strong>错误信息：</strong>
                  <p class="error-text">{{ item.error_message }}</p>
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
                v-model="systemPrompt"
                type="textarea"
                :rows="3"
                placeholder="输入系统参数，例如：你是一个专业的中文助手，擅长回答各种问题..."
                @input="updateCharCount"
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
                  :disabled="!canSend"
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Loading } from '@element-plus/icons-vue'
import { useModelSetupStore } from '@/stores/modelSetupStore'
import { useMessageStore } from '@/stores/messageStore'
import type { MessagePreset } from '@/types/api'

// 使用 Pinia store
const modelSetupStore = useModelSetupStore()
const messageStore = useMessageStore()

// 本地状态
const messageSelectorVisible = ref(false)
const messageSearchQuery = ref('')
const messagesContainer = ref<HTMLElement>()

// 计算属性
const {
  systemPrompt,
  selectedAiCoreId,
  sessionId,
  loading,
  error,
  history,
  stats,
  selectedAiCore,
  availableAiCores,
  charCount,
  canSend
} = modelSetupStore

// 直接获取 systemMessages，避免解构问题
const systemMessages = computed(() => {
  return messageStore.systemMessages || []
})

// 筛选后的系统消息
const filteredSystemMessages = computed(() => {
  const messages = systemMessages.value || []
  console.log('[ModelSetup] 筛选前的系统消息:', messages)
  console.log('[ModelSetup] 筛选前系统消息数量:', messages.length)
  console.log('[ModelSetup] 搜索查询:', messageSearchQuery.value)
  
  if (!messageSearchQuery.value.trim()) {
    console.log('[ModelSetup] 无搜索条件，返回所有系统消息')
    return messages
  }
  
  const query = messageSearchQuery.value.toLowerCase()
  const filtered = messages.filter((msg: MessagePreset) => 
    msg.title.toLowerCase().includes(query) ||
    msg.content.toLowerCase().includes(query) ||
    (msg.tags && msg.tags.toLowerCase().includes(query))
  )
  
  console.log('[ModelSetup] 筛选后的系统消息数量:', filtered.length)
  console.log('[ModelSetup] 筛选后的系统消息:', filtered)
  return filtered
})

// 方法
const loadData = async () => {
  try {
    await Promise.all([
      modelSetupStore.loadAiCores(),
      messageStore.loadMessages()
    ])
  } catch (err) {
    ElMessage.error('加载数据失败')
  }
}

const sendSystemPrompt = async () => {
  try {
    await modelSetupStore.sendSystemPrompt()
    ElMessage.success('系统参数发送成功')
    scrollToBottom()
  } catch (err) {
    ElMessage.error('发送失败')
  }
}

const clearSystemPrompt = () => {
  modelSetupStore.clearSystemPrompt()
}

const clearHistory = () => {
  modelSetupStore.clearHistory()
  ElMessage.success('历史记录已清空')
}

const showMessageSelector = async () => {
  console.log('[ModelSetup] 开始显示消息选择器')
  console.log('[ModelSetup] 当前消息存储状态:', {
    totalMessages: messageStore.messagePresets?.length || 0,
    systemMessages: messageStore.systemMessages?.length || 0,
    loading: messageStore.loading
  })
  
  // 强制重新加载消息数据
  await messageStore.loadMessages(true)
  
  console.log('[ModelSetup] 重新加载后的状态:', {
    totalMessages: messageStore.messagePresets?.length || 0,
    systemMessages: messageStore.systemMessages?.length || 0,
    systemMessagesData: messageStore.systemMessages
  })
  
  console.log('[ModelSetup] 系统消息数量:', systemMessages.value?.length || 0)
  console.log('[ModelSetup] 所有消息:', messageStore.messagePresets)
  
  // 强制触发计算属性
  console.log('[ModelSetup] 强制触发筛选计算属性...')
  const filtered = filteredSystemMessages.value
  console.log('[ModelSetup] 筛选结果:', filtered)
  
  messageSelectorVisible.value = true
  console.log('[ModelSetup] 消息选择器已显示')
}

const showMessageSelectorAndSend = async () => {
  console.log('[ModelSetup] 开始显示消息选择器(选择并发送)')
  console.log('[ModelSetup] 当前消息存储状态:', {
    totalMessages: messageStore.messagePresets?.length || 0,
    systemMessages: messageStore.systemMessages?.length || 0,
    loading: messageStore.loading
  })
  
  // 强制重新加载消息数据
  await messageStore.loadMessages(true)
  
  console.log('[ModelSetup] 重新加载后的状态:', {
    totalMessages: messageStore.messagePresets?.length || 0,
    systemMessages: messageStore.systemMessages?.length || 0,
    systemMessagesData: messageStore.systemMessages
  })
  
  console.log('[ModelSetup] 系统消息数量:', systemMessages.value?.length || 0)
  
  // 强制触发计算属性
  console.log('[ModelSetup] 强制触发筛选计算属性...')
  const filtered = filteredSystemMessages.value
  console.log('[ModelSetup] 筛选结果:', filtered)
  
  messageSelectorVisible.value = true
  console.log('[ModelSetup] 消息选择器已显示(选择并发送模式)')
}

const closeMessageSelector = () => {
  messageSelectorVisible.value = false
  messageSearchQuery.value = ''
}

const selectMessage = (message: MessagePreset) => {
  modelSetupStore.selectMessageForPrompt(message)
  closeMessageSelector()
}

const selectMessageAndSend = async (message: MessagePreset) => {
  try {
    await modelSetupStore.selectMessageAndSend(message)
    closeMessageSelector()
    scrollToBottom()
  } catch (err) {
    // 错误消息已在 store 内部处理
  }
}

const copyToPrompt = (historyItem: any) => {
  modelSetupStore.setSystemPrompt(historyItem.system_prompt)
  ElMessage.success('已复制到输入框')
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

const updateCharCount = () => {
  // 字符计数逻辑已在 computed 中处理
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const getStatusText = (status: string) => {
  const statusMap = {
    'online': '在线',
    'offline': '离线',
    'checking': '检测中'
  }
  return statusMap[status as keyof typeof statusMap] || status
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
  overflow-y: auto;
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
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.chat-welcome {
  text-align: center;
  color: #6b7280;
  padding: 40px 20px;
}

.message-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid #e5e7eb;
}

.message-item.message-success {
  border-left-color: #10b981;
}

.message-item.message-error {
  border-left-color: #ef4444;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.message-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
}

.message-time {
  font-weight: 500;
}

.message-service {
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.message-status {
  font-size: 12px;
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

.status-indicator.status-checking {
  background: #fef3c7;
  color: #92400e;
}

.message-selector {
  max-height: 400px;
}

.message-list {
  max-height: 300px;
  overflow-y: auto;
}

.message-option {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
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
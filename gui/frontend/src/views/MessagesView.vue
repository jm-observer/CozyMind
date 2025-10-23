<template>
  <div class="messages-view">
    <div class="container mx-auto px-4 py-6">
      <div class="messages-container">
        <!-- 左侧消息列表 -->
        <div class="messages-list-panel">
          <div class="panel-header">
            <h2 class="text-xl font-semibold">消息列表</h2>
            <el-button type="success" size="small" @click="showAddMessageModal">
              ➕ 新建消息
            </el-button>
          </div>
          
          <!-- 搜索框 -->
          <div class="search-box mb-4">
            <el-input
              v-model="searchQuery"
              placeholder="搜索消息..."
              clearable
              @input="handleSearchInput"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          
          <!-- 类型筛选 -->
          <div class="filter-tabs mb-4">
            <el-radio-group v-model="selectedType" @change="handleTypeFilter">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="system">系统</el-radio-button>
              <el-radio-button label="user">用户</el-radio-button>
              <el-radio-button label="assistant">助手</el-radio-button>
            </el-radio-group>
          </div>
          
          <!-- 消息列表 -->
          <div class="messages-list">
            <div v-if="filteredMessages.length === 0" class="empty-state">
              <p>暂无消息预设</p>
              <el-button type="primary" @click="showAddMessageModal">创建第一条消息</el-button>
            </div>
            
            <!-- 使用虚拟滚动优化大量数据渲染 -->
            <VirtualList
              v-else-if="filteredMessages.length > 50"
              :items="filteredMessages"
              :item-height="120"
              :container-height="400"
            >
              <template #default="{ item: message }">
                <div
                  v-memo="[message.id, message.title, message.content, message.type, message.tags, selectedMessage?.id]"
                  class="message-item"
                  :class="{ active: selectedMessage?.id === message.id }"
                  @click="selectMessage(message)"
                >
                  <div class="message-header">
                    <h3 class="message-title">{{ message.title }}</h3>
                    <div class="message-type" :class="`type-${message.type}`">
                      {{ getTypeLabel(message.type) }}
                    </div>
                  </div>
                  <p class="message-content">{{ truncateText(message.content, 100) }}</p>
                  <div class="message-meta">
                    <span class="message-tags" v-if="message.tags">{{ message.tags }}</span>
                    <span class="message-date">{{ formatDate(message.updatedAt) }}</span>
                  </div>
                  <div class="message-actions">
                    <el-button size="small" @click.stop="editMessage(message)">编辑</el-button>
                    <el-button size="small" type="danger" @click.stop="deleteMessage(message.id)">删除</el-button>
                  </div>
                </div>
              </template>
            </VirtualList>
            
            <!-- 少量数据时使用普通渲染 -->
            <div v-else>
              <div
                v-for="message in filteredMessages"
                :key="message.id"
                v-memo="[message.id, message.title, message.content, message.type, message.tags, selectedMessage?.id]"
                class="message-item"
                :class="{ active: selectedMessage?.id === message.id }"
                @click="selectMessage(message)"
              >
                <div class="message-header">
                  <h3 class="message-title">{{ message.title }}</h3>
                  <div class="message-type" :class="`type-${message.type}`">
                    {{ getTypeLabel(message.type) }}
                  </div>
                </div>
                <p class="message-content">{{ truncateText(message.content, 100) }}</p>
                <div class="message-meta">
                  <span class="message-tags" v-if="message.tags">{{ message.tags }}</span>
                  <span class="message-date">{{ formatDate(message.updatedAt) }}</span>
                </div>
                <div class="message-actions">
                  <el-button size="small" @click.stop="editMessage(message)">编辑</el-button>
                  <el-button size="small" type="danger" @click.stop="deleteMessage(message.id)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧消息详情 -->
        <div class="message-detail-panel">
          <div class="panel-header">
            <h2 class="text-xl font-semibold">消息详情</h2>
            <div class="detail-actions" v-if="selectedMessage">
              <el-button size="small" type="primary" @click="saveMessageContent">
                💾 保存
              </el-button>
              <el-button size="small" @click="validateMessageContent">
                ✓ 校验
              </el-button>
            </div>
          </div>
          
          <div class="message-detail-content">
            <div v-if="!selectedMessage" class="empty-state">
              <p>请从左侧选择一条消息</p>
            </div>
            
            <div v-else class="message-editor">
              <div class="form-group">
                <label>消息标题</label>
                <el-input v-model="editForm.title" placeholder="输入消息标题" />
              </div>
              
              <div class="form-group">
                <label>消息类型</label>
                <el-select v-model="editForm.type" placeholder="选择消息类型">
                  <el-option label="系统消息" value="system" />
                  <el-option label="用户消息" value="user" />
                  <el-option label="助手消息" value="assistant" />
                </el-select>
              </div>
              
              <div class="form-group">
                <label>标签 (可选)</label>
                <el-input v-model="editForm.tags" placeholder="输入标签，用逗号分隔" />
              </div>
              
              <div class="form-group">
                <label>消息内容</label>
                <el-input
                  v-model="editForm.content"
                  type="textarea"
                  :rows="8"
                  placeholder="输入消息内容..."
                  @input="updateCharCount"
                />
                <div class="char-count">{{ editForm.content.length }} 字符</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加消息模态框 -->
    <el-dialog
      v-model="addModalVisible"
      :title="editingMessage ? '编辑消息' : '新建消息'"
      width="600px"
      @close="closeAddModal"
    >
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="消息标题" required>
          <el-input v-model="addForm.title" placeholder="输入消息标题" />
        </el-form-item>
        
        <el-form-item label="消息类型" required>
          <el-select v-model="addForm.type" placeholder="选择消息类型">
            <el-option label="系统消息" value="system" />
            <el-option label="用户消息" value="user" />
            <el-option label="助手消息" value="assistant" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标签">
          <el-input v-model="addForm.tags" placeholder="输入标签，用逗号分隔" />
        </el-form-item>
        
        <el-form-item label="消息内容" required>
          <el-input
            v-model="addForm.content"
            type="textarea"
            :rows="6"
            placeholder="输入消息内容..."
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="closeAddModal">取消</el-button>
        <el-button type="primary" @click="saveMessage" :loading="loading">
          {{ editingMessage ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useMessageStore } from '@/stores/messageStore'
import VirtualList from '@/components/VirtualList.vue'
import type { MessagePreset } from '@/types/api'

// 使用 Pinia store
const messageStore = useMessageStore()

// 本地状态
const searchQuery = ref('')
const selectedType = ref('')
const addModalVisible = ref(false)
const editingMessage = ref<MessagePreset | null>(null)

// 编辑表单
const editForm = ref({
  title: '',
  content: '',
  type: 'system' as 'system' | 'user' | 'assistant',
  tags: ''
})

// 添加表单
const addForm = ref({
  title: '',
  content: '',
  type: 'system' as 'system' | 'user' | 'assistant',
  tags: ''
})

// 计算属性
const loading = computed(() => messageStore.loading)
const selectedMessage = computed(() => messageStore.selectedMessage)
const allMessages = computed(() => messageStore.messagePresets)

// 防抖搜索
const debouncedSearchQuery = ref('')
let searchTimeout: NodeJS.Timeout | null = null

const handleSearchInput = (value: string) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery.value = value
  }, 300) // 300ms 防抖
}

// 筛选后的消息列表 - 优化计算性能
const filteredMessages = computed(() => {
  let messages = allMessages.value

  // 按类型筛选
  if (selectedType.value) {
    messages = messages.filter((msg: MessagePreset) => msg.type === selectedType.value)
  }

  // 按搜索词筛选 - 使用防抖后的搜索词
  if (debouncedSearchQuery.value.trim()) {
    const query = debouncedSearchQuery.value.toLowerCase()
    messages = messages.filter((msg: MessagePreset) => 
      msg.title.toLowerCase().includes(query) ||
      msg.content.toLowerCase().includes(query) ||
      (msg.tags && msg.tags.toLowerCase().includes(query))
    )
  }

  return messages
})

// 方法
const loadMessages = async () => {
  try {
    await messageStore.loadMessages()
  } catch (error) {
    ElMessage.error('加载消息失败')
  }
}

const selectMessage = (message: MessagePreset) => {
  messageStore.selectMessage(message)
  // 同步到编辑表单
  editForm.value = {
    title: message.title,
    content: message.content,
    type: message.type,
    tags: message.tags || ''
  }
}

const showAddMessageModal = () => {
  editingMessage.value = null
  addForm.value = {
    title: '',
    content: '',
    type: 'system',
    tags: ''
  }
  addModalVisible.value = true
}

const editMessage = (message: MessagePreset) => {
  editingMessage.value = message
  addForm.value = {
    title: message.title,
    content: message.content,
    type: message.type,
    tags: message.tags || ''
  }
  addModalVisible.value = true
}

const closeAddModal = () => {
  addModalVisible.value = false
  editingMessage.value = null
}

const saveMessage = async () => {
  if (!addForm.value.title.trim() || !addForm.value.content.trim()) {
    ElMessage.warning('请填写标题和内容')
    return
  }

  try {
    if (editingMessage.value) {
      // 更新消息
      await messageStore.updateMessage(editingMessage.value.id, addForm.value)
      ElMessage.success('消息更新成功')
    } else {
      // 创建消息
      await messageStore.addMessage(addForm.value)
      ElMessage.success('消息创建成功')
    }
    
    closeAddModal()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const saveMessageContent = async () => {
  if (!selectedMessage.value) return

  try {
    await messageStore.updateMessage(selectedMessage.value.id, editForm.value)
    ElMessage.success('消息保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const validateMessageContent = () => {
  if (!editForm.value.content.trim()) {
    ElMessage.warning('消息内容不能为空')
    return
  }
  
  // 简单的校验逻辑
  const content = editForm.value.content.trim()
  if (content.length < 10) {
    ElMessage.warning('消息内容太短，建议至少10个字符')
    return
  }
  
  ElMessage.success('消息内容校验通过')
}

const deleteMessage = async (id: number) => {
  const message = messageStore.getMessageById(id)
  if (!message) return

  try {
    await ElMessageBox.confirm(
      `确定要删除消息 "${message.title}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await messageStore.deleteMessage(id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 移除 handleSearch 方法，使用 handleSearchInput

const handleTypeFilter = () => {
  // 类型筛选逻辑已在 computed 中处理
}

const getTypeLabel = (type: string) => {
  const labels = {
    'system': '系统',
    'user': '用户',
    'assistant': '助手'
  }
  return labels[type as keyof typeof labels] || type
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const updateCharCount = () => {
  // 字符计数逻辑已在模板中处理
}

// 监听选中消息变化，同步编辑表单
watch(selectedMessage, (newMessage: MessagePreset | null) => {
  if (newMessage) {
    editForm.value = {
      title: newMessage.title,
      content: newMessage.content,
      type: newMessage.type,
      tags: newMessage.tags || ''
    }
  }
})

onMounted(() => {
  loadMessages()
})
</script>

<style scoped>
.messages-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.messages-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 200px);
}

.messages-list-panel {
  flex: 0 0 400px; /* 固定宽度，避免重新计算 */
}

.message-detail-panel {
  flex: 1; /* 剩余空间 */
}

.messages-list-panel,
.message-detail-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  will-change: transform; /* 优化动画性能 */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.search-box {
  margin-bottom: 16px;
}

.filter-tabs {
  margin-bottom: 16px;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
}

.message-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s; /* 只过渡必要的属性 */
  contain: layout; /* 优化重排性能 */
}

.message-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.message-item.active {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.message-type {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-system {
  background-color: #fef3c7;
  color: #92400e;
}

.type-user {
  background-color: #dbeafe;
  color: #1e40af;
}

.type-assistant {
  background-color: #d1fae5;
  color: #065f46;
}

.message-content {
  color: #6b7280;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.5;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.message-tags {
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.message-detail-content {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
  text-align: center;
}

.message-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #374151;
}

.char-count {
  font-size: 12px;
  color: #6b7280;
  text-align: right;
}

.detail-actions {
  display: flex;
  gap: 8px;
}
</style>


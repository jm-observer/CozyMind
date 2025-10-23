import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/services/api'
import type { MessagePreset, AddMessageRequest, UpdateMessageRequest } from '@/types/api'

export const useMessageStore = defineStore('message', () => {
  // 状态
  const messagePresets = ref<MessagePreset[]>([])
  const selectedMessage = ref<MessagePreset | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastLoadTime = ref<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 计算属性
  const systemMessages = computed(() => 
    messagePresets.value.filter(msg => msg.type === 'system')
  )

  const userMessages = computed(() => 
    messagePresets.value.filter(msg => msg.type === 'user')
  )

  const assistantMessages = computed(() => 
    messagePresets.value.filter(msg => msg.type === 'assistant')
  )

  const messagesByType = computed(() => ({
    system: systemMessages.value,
    user: userMessages.value,
    assistant: assistantMessages.value
  }))

  // 动作
  const loadMessages = async (force = false) => {
    // 检查缓存
    const now = Date.now()
    if (!force && messagePresets.value.length > 0 && (now - lastLoadTime.value) < CACHE_DURATION) {
      console.log('[Message Store] 使用缓存数据')
      return
    }

    loading.value = true
    error.value = null
    
    try {
      const messages = await messageApi.getAll()
      messagePresets.value = messages
      lastLoadTime.value = now
      console.log(`[Message Store] 加载了 ${messages.length} 条消息预设`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载消息预设失败'
      console.error('[Message Store] 加载失败:', err)
    } finally {
      loading.value = false
    }
  }

  const addMessage = async (request: AddMessageRequest) => {
    loading.value = true
    error.value = null
    
    try {
      const newMessage = await messageApi.add(request)
      messagePresets.value.push(newMessage)
      console.log('[Message Store] 添加成功:', newMessage)
      return newMessage
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加消息预设失败'
      console.error('[Message Store] 添加失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateMessage = async (id: number, request: UpdateMessageRequest) => {
    loading.value = true
    error.value = null
    
    try {
      const updatedMessage = await messageApi.update(id, request)
      const index = messagePresets.value.findIndex(msg => msg.id === id)
      if (index !== -1) {
        messagePresets.value[index] = updatedMessage
      }
      console.log('[Message Store] 更新成功:', updatedMessage)
      return updatedMessage
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新消息预设失败'
      console.error('[Message Store] 更新失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteMessage = async (id: number) => {
    loading.value = true
    error.value = null
    
    try {
      await messageApi.delete(id)
      messagePresets.value = messagePresets.value.filter(msg => msg.id !== id)
      if (selectedMessage.value?.id === id) {
        selectedMessage.value = null
      }
      console.log('[Message Store] 删除成功:', id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除消息预设失败'
      console.error('[Message Store] 删除失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const selectMessage = (message: MessagePreset | null) => {
    selectedMessage.value = message
    console.log('[Message Store] 选择消息:', message?.title || '无')
  }

  const getMessageById = (id: number) => {
    return messagePresets.value.find(msg => msg.id === id)
  }

  const getMessagesByType = (type: 'system' | 'user' | 'assistant') => {
    return messagePresets.value.filter(msg => msg.type === type)
  }

  const searchMessages = (query: string) => {
    if (!query.trim()) return messagePresets.value
    
    const lowerQuery = query.toLowerCase()
    return messagePresets.value.filter(msg => 
      msg.title.toLowerCase().includes(lowerQuery) ||
      msg.content.toLowerCase().includes(lowerQuery) ||
      (msg.tags && msg.tags.toLowerCase().includes(lowerQuery))
    )
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    messagePresets,
    selectedMessage,
    loading,
    error,
    
    // 计算属性
    systemMessages,
    userMessages,
    assistantMessages,
    messagesByType,
    
    // 动作
    loadMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    selectMessage,
    getMessageById,
    getMessagesByType,
    searchMessages,
    clearError
  }
})

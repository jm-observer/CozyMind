import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '@/services/api'
import { useAICoreStore } from './aiCoreStore'
import type { ChatMessage, ChatSession, SendMessageRequest } from '@/types/api'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const messages = ref<ChatMessage[]>([])
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isConnected = ref(false)

  // 依赖的 stores
  const aiCoreStore = useAICoreStore()

  // 计算属性
  const currentSession = computed(() => {
    if (!currentSessionId.value) return null
    return sessions.value.find(session => session.id === currentSessionId.value)
  })

  const currentMessages = computed(() => {
    return messages.value.filter(msg => msg.session_id === currentSessionId.value)
  })

  const availableAiCores = computed(() => {
    return aiCoreStore.aiCores.filter(core => core.status === 'online')
  })

  const selectedAiCore = computed(() => {
    return aiCoreStore.aiCores.find(core => core.status === 'online')
  })

  // 动作
  const loadSessions = async () => {
    loading.value = true
    error.value = null
    
    try {
      const sessionList = await chatApi.getSessions()
      sessions.value = sessionList
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载会话失败'
      console.error('[Chat Store] 加载会话失败:', err)
    } finally {
      loading.value = false
    }
  }

  const loadSessionMessages = async (sessionId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const sessionMessages = await chatApi.getSessionMessages(sessionId)
      // 更新当前会话的消息
      messages.value = messages.value.filter(msg => msg.session_id !== sessionId)
      messages.value.push(...sessionMessages)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载会话消息失败'
      console.error('[Chat Store] 加载会话消息失败:', err)
    } finally {
      loading.value = false
    }
  }

  const createSession = async (name: string) => {
    loading.value = true
    error.value = null
    
    try {
      const newSession = await chatApi.createSession(name)
      sessions.value.unshift(newSession)
      currentSessionId.value = newSession.id
      messages.value = [] // 清空当前消息
      return newSession
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建会话失败'
      console.error('[Chat Store] 创建会话失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSession = async (sessionId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await chatApi.deleteSession(sessionId)
      sessions.value = sessions.value.filter(session => session.id !== sessionId)
      
      // 如果删除的是当前会话，清空消息
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        messages.value = []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除会话失败'
      console.error('[Chat Store] 删除会话失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const selectSession = async (sessionId: string) => {
    currentSessionId.value = sessionId
    await loadSessionMessages(sessionId)
  }

  const sendMessage = async (content: string) => {
    if (!selectedAiCore.value) {
      throw new Error('请先选择AI-Core服务')
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending',
      session_id: currentSessionId.value || undefined
    }

    // 添加用户消息
    messages.value.push(userMessage)

    try {
      const request: SendMessageRequest = {
        message: content,
        session_id: currentSessionId.value || undefined,
        ai_core_id: selectedAiCore.value.id
      }

      const response = await chatApi.sendMessage(request)
      
      // 更新用户消息状态
      const userMsgIndex = messages.value.findIndex(msg => msg.id === userMessage.id)
      if (userMsgIndex !== -1) {
        messages.value[userMsgIndex].status = 'sent'
      }

      // 添加AI回复消息
      const aiMessage: ChatMessage = {
        id: response.message_id,
        content: response.response,
        role: 'assistant',
        timestamp: response.timestamp,
        status: 'sent',
        session_id: response.session_id
      }

      messages.value.push(aiMessage)
      
      // 更新当前会话ID
      if (!currentSessionId.value) {
        currentSessionId.value = response.session_id
      }
      return response
    } catch (err) {
      // 更新用户消息状态为失败
      const userMsgIndex = messages.value.findIndex(msg => msg.id === userMessage.id)
      if (userMsgIndex !== -1) {
        messages.value[userMsgIndex].status = 'failed'
      }

      error.value = err instanceof Error ? err.message : '发送消息失败'
      console.error('[Chat Store] 发送消息失败:', err)
      throw err
    }
  }

  const clearMessages = () => {
    messages.value = []
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    messages,
    sessions,
    currentSessionId,
    loading,
    error,
    isConnected,
    
    // 计算属性
    currentSession,
    currentMessages,
    availableAiCores,
    selectedAiCore,
    
    // 动作
    loadSessions,
    loadSessionMessages,
    createSession,
    deleteSession,
    selectSession,
    sendMessage,
    clearMessages,
    clearError
  }
})

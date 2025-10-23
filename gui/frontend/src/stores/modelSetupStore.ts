import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { modelSetupApi } from '@/services/api'
import { useAICoreStore } from './aiCoreStore'
import { useMessageStore } from './messageStore'
import type { SystemPromptRequest, SystemPromptResponse, ModelSetupHistory } from '@/types/api'

export const useModelSetupStore = defineStore('modelSetup', () => {
  // 状态
  const systemPrompt = ref('')
  const selectedAiCoreId = ref<number | null>(null)
  const sessionId = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const history = ref<ModelSetupHistory[]>([])
  const stats = ref({
    sent: 0,
    success: 0,
    fail: 0
  })

  // 依赖的 stores
  const aiCoreStore = useAICoreStore()
  const messageStore = useMessageStore()

  // 计算属性
  const selectedAiCore = computed(() => {
    if (!selectedAiCoreId.value) return null
    return aiCoreStore.getCoreById(selectedAiCoreId.value)
  })

  const availableAiCores = computed(() => {
    return aiCoreStore.aiCores.filter(core => core.status === 'online')
  })

  const systemMessages = computed(() => {
    return messageStore.systemMessages || []
  })

  const charCount = computed(() => systemPrompt.value.length)

  const canSend = computed(() => {
    const hasAiCore = !!selectedAiCoreId.value
    const hasPrompt = systemPrompt.value.trim().length > 0
    const notLoading = !loading.value
    
    console.log('[Model Setup Store] canSend 检查:', {
      selectedAiCoreId: selectedAiCoreId.value,
      hasAiCore,
      systemPrompt: systemPrompt.value,
      hasPrompt,
      loading: loading.value,
      notLoading,
      result: hasAiCore && hasPrompt && notLoading
    })
    
    return hasAiCore && hasPrompt && notLoading
  })

  // 动作
  const setSystemPrompt = (prompt: string) => {
    systemPrompt.value = prompt
  }

  const setSelectedAiCore = (id: number | null) => {
    selectedAiCoreId.value = id
  }

  const setSessionId = (id: string) => {
    sessionId.value = id
  }

  const clearSystemPrompt = () => {
    systemPrompt.value = ''
  }

  const clearHistory = () => {
    history.value = []
    stats.value = { sent: 0, success: 0, fail: 0 }
  }

  const sendSystemPrompt = async () => {
    console.log('[Model Setup Store] 发送系统参数:', systemPrompt.value, 'canSend:', canSend.value)
    if (!canSend.value) return

    console.log('[Model Setup Store] 开始发送系统参数...')
    loading.value = true
    error.value = null

    try {
      const request: SystemPromptRequest = {
        ai_core_id: selectedAiCoreId.value!,
        system_prompt: systemPrompt.value.trim(),
        session_id: sessionId.value || undefined
      }

      console.log('[Model Setup Store] 请求参数:', request)
      const startTime = Date.now()
      const response = await modelSetupApi.sendSystemPrompt(request)
      const responseTime = Date.now() - startTime
      console.log('[Model Setup Store] 发送成功，响应时间:', responseTime + 'ms')

      // 记录成功历史
      const historyItem: ModelSetupHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ai_core_id: selectedAiCoreId.value!,
        ai_core_name: selectedAiCore.value?.name || '未知服务',
        system_prompt: systemPrompt.value.trim(),
        session_id: sessionId.value || undefined,
        status: 'success',
        response_time: responseTime
      }

      history.value.unshift(historyItem)
      stats.value.sent++
      stats.value.success++

      console.log('[Model Setup Store] 系统参数发送成功:', response)
      
      // 显示成功消息
      if (typeof window !== 'undefined' && (window as any).ElMessage) {
        (window as any).ElMessage.success('系统参数发送成功')
      }
      
      return response
    } catch (err) {
      // 记录失败历史
      const historyItem: ModelSetupHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ai_core_id: selectedAiCoreId.value!,
        ai_core_name: selectedAiCore.value?.name || '未知服务',
        system_prompt: systemPrompt.value.trim(),
        session_id: sessionId.value || undefined,
        status: 'error',
        error_message: err instanceof Error ? err.message : '发送失败'
      }

      history.value.unshift(historyItem)
      stats.value.sent++
      stats.value.fail++

      error.value = err instanceof Error ? err.message : '发送系统参数失败'
      console.error('[Model Setup Store] 发送失败:', err)
      
      // 显示失败消息
      if (typeof window !== 'undefined' && (window as any).ElMessage) {
        (window as any).ElMessage.error('发送失败')
      }
      
      throw err
    } finally {
      loading.value = false
    }
  }

  const selectMessageForPrompt = (message: any) => {
    console.log('[Model Setup Store] 选择消息到输入框:', message.title, message.content)
    systemPrompt.value = message.content
  }

  const selectMessageAndSend = async (message: any) => {
    console.log('[Model Setup Store] 选择消息并发送:', message.title, message.content)
    systemPrompt.value = message.content
    console.log('[Model Setup Store] 设置系统参数后:', systemPrompt.value)
    
    try {
      await sendSystemPrompt()
      // 成功消息在 sendSystemPrompt 内部处理
    } catch (err) {
      // 失败消息在 sendSystemPrompt 内部处理
      throw err
    }
  }

  const loadAiCores = async () => {
    await aiCoreStore.loadAICores()
    await aiCoreStore.checkAllConnections()
    
    // 自动选择第一个在线的AI-Core服务
    if (!selectedAiCoreId.value) {
      const onlineCores = aiCoreStore.aiCores.filter(core => core.status === 'online')
      if (onlineCores.length > 0) {
        const firstOnlineCore = onlineCores[0]
        selectedAiCoreId.value = firstOnlineCore.id
        console.log('[Model Setup Store] 自动选择AI-Core服务:', firstOnlineCore.name)
      }
    }
  }

  const loadMessages = async () => {
    await messageStore.loadMessages()
  }

  const getHistoryById = (id: string) => {
    return history.value.find(item => item.id === id)
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    systemPrompt,
    selectedAiCoreId,
    sessionId,
    loading,
    error,
    history,
    stats,
    
    // 计算属性
    selectedAiCore,
    availableAiCores,
    systemMessages,
    charCount,
    canSend,
    
    // 动作
    setSystemPrompt,
    setSelectedAiCore,
    setSessionId,
    clearSystemPrompt,
    clearHistory,
    sendSystemPrompt,
    selectMessageForPrompt,
    selectMessageAndSend,
    loadAiCores,
    loadMessages,
    getHistoryById,
    clearError
  }
})

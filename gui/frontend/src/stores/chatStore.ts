import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAICoreStore } from './aiCoreStore'
import { mqttClient } from '@/services/mqttClient'
import type { ChatMessage, SendMessageRequest } from '@/types/api'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isConnected = computed(() => mqttClient.getConnectionStatus().isConnected)

  // 依赖的 stores
  const aiCoreStore = useAICoreStore()

  // 计算属性

  const availableAiCores = computed(() => {
    return aiCoreStore.aiCores.filter(core => core.status === 'online')
  })

  const selectedAiCore = computed(() => {
    return aiCoreStore.aiCores.find(core => core.status === 'online')
  })

  // 初始化 MQTT 连接和消息处理器
  const initializeWebSocket = async () => {
    try {
      await mqttClient.connect({
        clientId: `chat_client_${Date.now()}`,
        clean: true,
        keepalive: 60
      })
      
      // 设置消息处理器
      mqttClient.onMessage((topic, payload, packet) => {
        console.log('📨 MQTT message received:', {
          topic,
          payload: payload.toString(),
          qos: packet.qos,
          retain: packet.retain
        })
        
        // 处理聊天消息
        if (topic.startsWith('chat/')) {
          try {
            const message = JSON.parse(payload.toString())
            if (message.role && message.content) {
              messages.value.push(message)
            }
          } catch (err) {
            console.error('Failed to parse chat message:', err)
          }
        }
      })
      
      // 订阅聊天主题
      mqttClient.subscribe('chat/receive/+')
      
      console.log('[Chat Store] MQTT initialized successfully')
    } catch (err) {
      console.error('[Chat Store] Failed to initialize MQTT:', err)
      error.value = 'MQTT connection failed'
    }
  }

  // 动作

  const sendMessage = async (content: string) => {
    if (!selectedAiCore.value) {
      throw new Error('请先选择AI-Core服务')
    }

    if (!isConnected.value) {
      throw new Error('MQTT 未连接，请检查网络连接')
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending'
    }

    // 添加用户消息
    messages.value.push(userMessage)

    try {
      const request: SendMessageRequest = {
        message: content,
        ai_core_id: selectedAiCore.value.id
      }

      // 通过 MQTT 发送消息
      const success = mqttClient.publish('chat/send', JSON.stringify(request))
      if (!success) {
        throw new Error('发送消息失败')
      }

      // 更新用户消息状态为已发送
      const userMsgIndex = messages.value.findIndex(msg => msg.id === userMessage.id)
      if (userMsgIndex !== -1) {
        messages.value[userMsgIndex].status = 'sent'
      }

      // AI 回复将通过 MQTT 接收并自动添加到 messages 中
      return { success: true }
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

  // 清理资源
  const cleanup = () => {
    mqttClient.disconnect()
  }

  return {
    // 状态
    messages,
    loading,
    error,
    isConnected,
    
    // 计算属性
    availableAiCores,
    selectedAiCore,
    
    // 动作
    initializeWebSocket,
    sendMessage,
    clearMessages,
    clearError,
    cleanup
  }
})

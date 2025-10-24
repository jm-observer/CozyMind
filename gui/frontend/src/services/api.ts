import axios from 'axios'
import type { 
  ApiResponse, 
  AICoreConfig, 
  OllamaConfig, 
  CheckConnectionRequest, 
  CheckConnectionResponse, 
  MessagePreset, 
  AddMessageRequest, 
  UpdateMessageRequest, 
  SystemPromptRequest, 
  SystemPromptResponse,
  ChatMessage,
  ChatSession,
  SendMessageRequest,
  SendMessageResponse
} from '@/types/api'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 130000, // 2分钟10秒，比后端稍长
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response:`, response.data)
    return response
  },
  (error) => {
    console.error('[API] Response error:', error)
    return Promise.reject(error)
  }
)

// AI-Core 相关 API
export const aiCoreApi = {
  // 获取所有 AI-Core 配置
  async getAll(): Promise<AICoreConfig[]> {
    const response = await api.get<ApiResponse<AICoreConfig[]>>('/ai-cores')
    if (response.data.success) {
      return response.data.data || []
    }
    throw new Error(response.data.error || '获取 AI-Core 配置失败')
  },

  // 添加 AI-Core 配置
  async add(config: Omit<AICoreConfig, 'id'>): Promise<AICoreConfig> {
    const response = await api.post<ApiResponse<AICoreConfig>>('/ai-cores', config)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '添加 AI-Core 配置失败')
  },

  // 更新 AI-Core 配置
  async update(id: number, config: Omit<AICoreConfig, 'id'>): Promise<AICoreConfig> {
    const response = await api.put<ApiResponse<AICoreConfig>>(`/ai-cores/${id}`, config)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '更新 AI-Core 配置失败')
  },

  // 删除 AI-Core 配置
  async delete(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/ai-cores/${id}`)
    if (!response.data.success) {
      throw new Error(response.data.error || '删除 AI-Core 配置失败')
    }
  },

  // 检测连接
  async checkConnection(id: number): Promise<CheckConnectionResponse> {
    const response = await api.post<ApiResponse<CheckConnectionResponse>>('/check-connection', { id })
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '连接检测失败')
  }
}

// Ollama 相关 API
export const ollamaApi = {
  // 获取所有 Ollama 配置
  async getAll(): Promise<OllamaConfig[]> {
    const response = await api.get<ApiResponse<OllamaConfig[]>>('/ollama-configs')
    if (response.data.success) {
      return response.data.data || []
    }
    throw new Error(response.data.error || '获取 Ollama 配置失败')
  },

  // 添加 Ollama 配置
  async add(config: Omit<OllamaConfig, 'id'>): Promise<OllamaConfig> {
    const response = await api.post<ApiResponse<OllamaConfig>>('/ollama-configs', config)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '添加 Ollama 配置失败')
  },

  // 更新 Ollama 配置
  async update(id: number, config: Omit<OllamaConfig, 'id'>): Promise<OllamaConfig> {
    const response = await api.put<ApiResponse<OllamaConfig>>(`/ollama-configs/${id}`, config)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '更新 Ollama 配置失败')
  },

  // 删除 Ollama 配置
  async delete(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/ollama-configs/${id}`)
    if (!response.data.success) {
      throw new Error(response.data.error || '删除 Ollama 配置失败')
    }
  },

  // 检测 Ollama 连接
  async checkConnection(config: OllamaConfig): Promise<CheckConnectionResponse> {
    const response = await api.post('/ollama-status', {
      url: config.url,
      model: config.model
    })
    
    if (response.data.success) {
      // 转换后端响应格式为前端期望格式
      return {
        success: response.data.connected,
        status: response.data.connected ? 'online' : 'offline',
        responseTime: response.data.responseTime,
        error: response.data.error
      }
    }
    throw new Error(response.data.error || 'Ollama 连接检测失败')
  }
}

// 消息预设相关 API
export const messageApi = {
  // 获取所有消息预设
  async getAll(): Promise<MessagePreset[]> {
    const response = await api.get<ApiResponse<MessagePreset[]>>('/messages')
    if (response.data.success) {
      return response.data.data || []
    }
    throw new Error(response.data.error || '获取消息预设失败')
  },

  // 添加消息预设
  async add(request: AddMessageRequest): Promise<MessagePreset> {
    const response = await api.post<ApiResponse<MessagePreset>>('/messages', request)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '添加消息预设失败')
  },

  // 更新消息预设
  async update(id: number, request: UpdateMessageRequest): Promise<MessagePreset> {
    const response = await api.put<ApiResponse<MessagePreset>>(`/messages/${id}`, request)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '更新消息预设失败')
  },

  // 删除消息预设
  async delete(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/messages/${id}`)
    if (!response.data.success) {
      throw new Error(response.data.error || '删除消息预设失败')
    }
  }
}

// 模型设定相关 API
export const modelSetupApi = {
  // 发送系统参数
  async sendSystemPrompt(request: SystemPromptRequest): Promise<SystemPromptResponse> {
    const response = await api.post('/system-prompt', request)
    
    // 后端现在直接返回文本，需要解析成 OllamaResponse
    try {
      const ollamaResponse = response.data as any // 直接是 OllamaResponse 对象
      
      // 构造 SystemPromptResponse
      return {
        message: ollamaResponse.response || '系统参数已设定',
        session_id: request.session_id || 'default',
        status: 'success'
      }
    } catch (error) {
      console.error('解析 OllamaResponse 失败:', error)
      throw new Error('解析响应失败')
    }
  }
}

// 聊天相关 API
export const chatApi = {
  // 发送消息
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await api.post<ApiResponse<SendMessageResponse>>('/chat/send', request)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '发送消息失败')
  },

  // 获取会话列表
  async getSessions(): Promise<ChatSession[]> {
    const response = await api.get<ApiResponse<ChatSession[]>>('/chat/sessions')
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '获取会话列表失败')
  },

  // 获取会话消息
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await api.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`)
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '获取会话消息失败')
  },

  // 创建新会话
  async createSession(name: string): Promise<ChatSession> {
    const response = await api.post<ApiResponse<ChatSession>>('/chat/sessions', { name })
    if (response.data.success) {
      return response.data.data!
    }
    throw new Error(response.data.error || '创建会话失败')
  },

  // 删除会话
  async deleteSession(sessionId: string): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/chat/sessions/${sessionId}`)
    if (!response.data.success) {
      throw new Error(response.data.error || '删除会话失败')
    }
  }
}

export default api

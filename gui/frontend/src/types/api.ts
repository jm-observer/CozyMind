// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// AI-Core 配置类型
export interface AICoreConfig {
  id: number
  name: string
  url: string
  description: string
  status?: 'online' | 'offline'
  responseTime?: number
  lastCheck?: string
}

// Ollama 配置类型
export interface OllamaConfig {
  id: number
  name: string
  url: string
  model: string
  description: string
  status?: 'online' | 'offline'
  responseTime?: number
  lastCheck?: string
}

// 连接检测请求
export interface CheckConnectionRequest {
  id: number
}

// 连接检测响应
export interface CheckConnectionResponse {
  success: boolean
  status: 'online' | 'offline'
  responseTime?: number
  error?: string
}

// 消息预设类型
export interface MessagePreset {
  id: number
  title: string
  content: string
  type: 'system' | 'user' | 'assistant'
  tags?: string
  createdAt: string
  updatedAt: string
}

// 添加消息预设请求
export interface AddMessageRequest {
  title: string
  content: string
  type: 'system' | 'user' | 'assistant'
  tags?: string
}

// 更新消息预设请求
export interface UpdateMessageRequest {
  title: string
  content: string
  type: 'system' | 'user' | 'assistant'
  tags?: string
}

// 系统参数请求
export interface SystemPromptRequest {
  ai_core_id: number
  system_prompt: string
  session_id?: string
}

// 系统参数响应
export interface SystemPromptResponse {
  success: boolean
  message?: string
  error?: string
  response_time?: number
}

// 模型设定历史记录
export interface ModelSetupHistory {
  id: string
  timestamp: string
  ai_core_id: number
  ai_core_name: string
  system_prompt: string
  session_id?: string
  status: 'success' | 'error'
  response_time?: number
  error_message?: string
}

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
  message: OllamaResponse
  session_id: string
  status: 'success' | 'error'
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

// 聊天相关类型
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: string
  status?: 'sending' | 'sent' | 'failed'
  session_id?: string
}

export interface ChatSession {
  id: string
  name: string
  created_at: string
  updated_at: string
  message_count: number
  last_message?: string
}

export interface SendMessageRequest {
  message: string
  session_id?: string
  ai_core_id: number
}

export interface SendMessageResponse {
  success: boolean
  message_id: string
  response: string
  session_id: string
  timestamp: string
}

// Ollama API 响应结构
export interface OllamaResponse {
  /// 模型的回答
  response: string
  /// 新的会话上下文
  context?: number[]
  /// 是否完成
  done?: boolean
  /// 完成原因
  done_reason?: string
  /// 模型名称
  model?: string
  /// 创建时间
  created_at?: string
  /// 思考过程（如果模型支持）
  thinking?: string
  /// 总处理时间（纳秒）
  total_duration?: number
  /// 模型加载时间（纳秒）
  load_duration?: number
  /// 提示词评估次数
  prompt_eval_count?: number
  /// 提示词评估时间（纳秒）
  prompt_eval_duration?: number
  /// 生成评估次数
  eval_count?: number
  /// 生成评估时间（纳秒）
  eval_duration?: number
}

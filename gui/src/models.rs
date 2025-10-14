use serde::{Deserialize, Serialize};

/// AI-Core 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AICoreConfig {
    pub id: i32,
    pub name: String,
    pub url: String,
    pub description: String,
}

/// Ollama 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaConfig {
    pub id: i32,
    pub name: String,
    pub url: String,
    pub model: String,
    pub description: String,
}

/// 消息预设
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagePreset {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub r#type: String,
    pub tags: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// 添加消息预设请求
#[derive(Debug, Deserialize)]
pub struct AddMessageRequest {
    pub title: String,
    pub content: String,
    pub r#type: String,
    pub tags: Option<String>,
}

/// 更新消息预设请求
#[derive(Debug, Deserialize)]
pub struct UpdateMessageRequest {
    pub title: String,
    pub content: String,
    pub r#type: String,
    pub tags: Option<String>,
}

/// 连接检查请求
#[derive(Debug, Deserialize)]
pub struct CheckConnectionRequest {
    pub id: i32,
}

/// Ollama 状态检查请求
#[derive(Debug, Deserialize)]
pub struct OllamaStatusRequest {
    pub url: String,
    pub model: String,
}

/// Ollama 测试请求
#[derive(Debug, Deserialize)]
pub struct OllamaTestRequest {
    pub url: String,
    pub prompt: Option<String>,
}

/// AI-Core 信息请求
#[derive(Debug, Deserialize)]
pub struct AICoreInfoRequest {
    pub url: String,
}

/// 健康检查响应
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub message: String,
    pub version: String,
}

/// 连接检查响应
#[derive(Debug, Serialize)]
pub struct ConnectionCheckResponse {
    pub success: bool,
    pub connected: bool,
    pub status: String,
    pub message: String,
    pub response_time: u128,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

/// 批量检查响应项
#[derive(Debug, Serialize)]
pub struct CheckAllItem {
    pub id: i32,
    pub name: String,
    pub url: String,
    pub status: String,
    pub message: String,
    pub response_time: u128,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

/// Ollama 测试响应
#[derive(Debug, Serialize)]
pub struct OllamaTestResponse {
    pub success: bool,
    pub connected: bool,
    pub response_time: u128,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// MQTT 连接请求
#[derive(Debug, Deserialize)]
pub struct MqttConnectRequest {
    pub host: String,
    pub port: u16,
    pub subscribe_topic: String,
}

/// MQTT 发布请求
#[derive(Debug, Deserialize)]
pub struct MqttPublishRequest {
    pub topic: String,
    pub payload: String,
}

/// MQTT 消息
#[derive(Debug, Clone, Serialize)]
pub struct MqttMessage {
    pub topic: String,
    pub payload: String,
    pub timestamp: String,
}

/// 发送系统参数请求
#[derive(Debug, Deserialize)]
pub struct SendSystemPromptRequest {
    pub ai_core_id: i32,
    pub system_prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}


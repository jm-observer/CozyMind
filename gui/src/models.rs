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
    pub name: String,
    pub content: String,
    pub category: String,
}

/// 连接检查请求
#[derive(Debug, Deserialize)]
pub struct CheckConnectionRequest {
    pub url: String,
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
    pub model: String,
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


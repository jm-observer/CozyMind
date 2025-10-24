use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::ollama_client::OllamaResponse;

/// 系统参数设定请求
#[derive(Debug, Clone, Deserialize)]
pub struct SetSystemPromptRequest {
    /// 会话 ID（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    /// 系统参数（必须）
    pub system_prompt: String,
}

/// 系统参数设定响应
#[derive(Debug, Clone, Serialize)]
pub struct SetSystemPromptResponse {
    pub status: String,
    pub message: OllamaResponse,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

/// Ollama 请求体
#[derive(Debug, Clone, Serialize)]
struct OllamaSystemRequest {
    model: String,
    prompt: String,
    system: String,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    context: Option<Vec<i64>>,
}

/// Ollama 响应体（使用 ollama_client 模块中的定义）

/// 会话存储结构
pub struct SessionStore {
    sessions: Arc<RwLock<HashMap<String, Vec<i64>>>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 获取会话上下文
    async fn get_context(&self, session_id: &str) -> Option<Vec<i64>> {
        let sessions = self.sessions.read().await;
        sessions.get(session_id).cloned()
    }

    /// 保存会话上下文
    async fn save_context(&self, session_id: String, context: Vec<i64>) {
        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id, context);
    }
}

/// 设定模型系统参数
/// 
/// POST /api/system-prompt
/// 
/// 请求体：
/// ```json
/// {
///   "session_id": "optional-session-id",
///   "system_prompt": "你是一个helpful的AI助手"
/// }
/// ```
#[post("/api/system-prompt")]
pub async fn set_system_prompt(
    request: web::Json<SetSystemPromptRequest>,
    session_store: web::Data<Arc<SessionStore>>,
) -> impl Responder {
    let session_id = request.session_id.clone().unwrap_or_else(|| {
        // 如果没有提供 session_id，生成一个新的
        uuid::Uuid::new_v4().to_string()
    });

    // 截取系统提示的前20个字符用于日志显示
    let prompt_preview = if request.system_prompt.len() > 20 {
        &request.system_prompt[..20]
    } else {
        &request.system_prompt
    };
    
    log::info!(
        "📝 设定系统参数 - 会话ID: {}, 系统提示: {}",
        session_id,
        prompt_preview
    );

    // 获取会话上下文（如果存在）
    let context = session_store.get_context(&session_id).await;

    // 从环境变量获取 Ollama 配置
    let ollama_host = std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let ollama_port = std::env::var("OLLAMA_PORT").unwrap_or_else(|_| "11434".to_string());
    let ollama_url = format!("http://{}:{}/api/generate", ollama_host, ollama_port);

    // 获取默认模型
    let model = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "gpt-oss:20b".to_string());

    // 构造 Ollama 请求
    let ollama_request = OllamaSystemRequest {
        model,
        prompt: prompt_preview.to_string(), // 简单的确认消息
        system: request.system_prompt.clone(),
        stream: false,
        context,
    };
    log::info!("Ollama 请求: {:?}", ollama_request);
    // 发送 HTTP 请求到 Ollama
    let client = reqwest::Client::new();
    match client
        .post(&ollama_url)
        .json(&ollama_request)
        .send()
        .await
    {
        Ok(response) => {
            let response = response.text().await.unwrap();
            log::info!("Ollama 响应: {}", response);

            match serde_json::from_str::<OllamaResponse>(&response) {
                Ok(ollama_response) => {
                    // 记录性能统计信息
                    let stats = ollama_response.performance_stats();
                    log::info!("✅ Ollama 响应成功: {:?}", ollama_response);
                    log::info!("📊 性能统计: {}", stats.format_summary());
                    
                    // 如果有思考过程，记录它
                    if ollama_response.has_thinking() {
                        log::debug!("🧠 思考过程: {}", ollama_response.thinking.as_ref().unwrap());
                    }

                    // 保存会话上下文
                    if let Some(new_context) = &ollama_response.context {
                        session_store
                            .save_context(session_id.clone(), new_context.clone().to_vec())
                            .await;
                        log::debug!("💾 保存会话上下文 - 会话ID: {}", session_id);
                    }

                    HttpResponse::Ok().json(SetSystemPromptResponse {
                        status: "success".to_string(),
                        message: ollama_response,
                        session_id: Some(session_id),
                    })
                }
                Err(e) => {
                    log::error!("❌ 解析 Ollama 响应失败: {}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("解析 Ollama 响应失败: {}", e)
                    }))
                }
            }
        }
        Err(e) => {
            log::error!("❌ 请求 Ollama 失败: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("请求 Ollama 失败: {}", e)
            }))
        }
    }
}


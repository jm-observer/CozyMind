use ollama_models::{OllamaRequest, OllamaResponse, PerformanceStats};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Ollama API 请求结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaRequest {
    /// 模型名称
    pub model: String,
    /// 提示词
    pub prompt: String,
    /// 是否流式输出
    pub stream: bool,
    /// 会话上下文（用于保持对话连续性）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<Vec<i64>>,
}

/// Ollama API 响应结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaResponse {
    /// 模型的回答
    pub response: String,
    /// 新的会话上下文
    #[serde(default)]
    pub context: Option<Vec<i64>>,
    /// 是否完成
    #[serde(default)]
    pub done: bool,
    /// 完成原因
    #[serde(default)]
    pub done_reason: Option<String>,
    /// 模型名称
    #[serde(default)]
    pub model: Option<String>,
    /// 创建时间
    #[serde(default)]
    pub created_at: Option<String>,
    /// 思考过程（如果模型支持）
    #[serde(default)]
    pub thinking: Option<String>,
    /// 总处理时间（纳秒）
    #[serde(default)]
    pub total_duration: Option<u64>,
    /// 模型加载时间（纳秒）
    #[serde(default)]
    pub load_duration: Option<u64>,
    /// 提示词评估次数
    #[serde(default)]
    pub prompt_eval_count: Option<u32>,
    /// 提示词评估时间（纳秒）
    #[serde(default)]
    pub prompt_eval_duration: Option<u64>,
    /// 生成评估次数
    #[serde(default)]
    pub eval_count: Option<u32>,
    /// 生成评估时间（纳秒）
    #[serde(default)]
    pub eval_duration: Option<u64>,
}

impl OllamaResponse {
    /// 获取总处理时间（毫秒）
    pub fn total_duration_ms(&self) -> Option<f64> {
        self.total_duration.map(|ns| ns as f64 / 1_000_000.0)
    }

    /// 获取模型加载时间（毫秒）
    pub fn load_duration_ms(&self) -> Option<f64> {
        self.load_duration.map(|ns| ns as f64 / 1_000_000.0)
    }

    /// 获取提示词评估时间（毫秒）
    pub fn prompt_eval_duration_ms(&self) -> Option<f64> {
        self.prompt_eval_duration.map(|ns| ns as f64 / 1_000_000.0)
    }

    /// 获取生成评估时间（毫秒）
    pub fn eval_duration_ms(&self) -> Option<f64> {
        self.eval_duration.map(|ns| ns as f64 / 1_000_000.0)
    }

    /// 获取平均每个token的生成时间（毫秒）
    pub fn avg_eval_time_per_token_ms(&self) -> Option<f64> {
        if let (Some(eval_count), Some(eval_duration)) = (self.eval_count, self.eval_duration) {
            if eval_count > 0 {
                return Some((eval_duration as f64 / eval_count as f64) / 1_000_000.0);
            }
        }
        None
    }

    /// 获取性能统计信息
    pub fn performance_stats(&self) -> PerformanceStats {
        PerformanceStats {
            total_duration_ms: self.total_duration_ms(),
            load_duration_ms: self.load_duration_ms(),
            prompt_eval_duration_ms: self.prompt_eval_duration_ms(),
            eval_duration_ms: self.eval_duration_ms(),
            prompt_eval_count: self.prompt_eval_count,
            eval_count: self.eval_count,
            avg_eval_time_per_token_ms: self.avg_eval_time_per_token_ms(),
        }
    }

    /// 检查是否有思考过程
    pub fn has_thinking(&self) -> bool {
        self.thinking.as_ref().map_or(false, |t| !t.is_empty())
    }

    /// 检查是否正常完成
    pub fn is_successfully_done(&self) -> bool {
        self.done && self.done_reason.as_ref().map_or(true, |reason| reason == "stop")
    }
}

/// 性能统计信息
#[derive(Debug, Clone)]
pub struct PerformanceStats {
    pub total_duration_ms: Option<f64>,
    pub load_duration_ms: Option<f64>,
    pub prompt_eval_duration_ms: Option<f64>,
    pub eval_duration_ms: Option<f64>,
    pub prompt_eval_count: Option<u32>,
    pub eval_count: Option<u32>,
    pub avg_eval_time_per_token_ms: Option<f64>,
}

impl PerformanceStats {
    /// 格式化性能统计信息为字符串
    pub fn format_summary(&self) -> String {
        let mut parts = Vec::new();
        
        if let Some(total) = self.total_duration_ms {
            parts.push(format!("总时间: {:.1}ms", total));
        }
        
        if let Some(load) = self.load_duration_ms {
            parts.push(format!("加载: {:.1}ms", load));
        }
        
        if let Some(prompt_eval) = self.prompt_eval_duration_ms {
            parts.push(format!("提示词评估: {:.1}ms", prompt_eval));
        }
        
        if let Some(eval) = self.eval_duration_ms {
            parts.push(format!("生成: {:.1}ms", eval));
        }
        
        if let Some(count) = self.eval_count {
            parts.push(format!("生成tokens: {}", count));
        }
        
        if let Some(avg) = self.avg_eval_time_per_token_ms {
            parts.push(format!("平均/token: {:.2}ms", avg));
        }
        
        parts.join(", ")
    }
}

/// Ollama 客户端
/// 
/// 用于与 Ollama API 交互，支持会话上下文管理
/// 
/// # 示例
/// 
/// ```rust
/// let client = OllamaClient::new("http://localhost:11434");
/// 
/// // 开始新会话
/// let response = client.ask("你好", "gpt-oss:20b", true).await?;
/// println!("回答: {}", response);
/// 
/// // 继续会话（保持上下文）
/// let response2 = client.ask("我刚才说了什么？", "gpt-oss:20b", false).await?;
/// println!("回答: {}", response2);
/// 
/// // 清空会话
/// client.clear_context().await;
/// ```
#[derive(Clone)]
pub struct OllamaClient {
    /// Ollama API 基础 URL
    base_url: String,
    /// 会话上下文（线程安全）
    context: Arc<RwLock<Option<Vec<i64>>>>,
    /// HTTP 客户端
    client: reqwest::Client,
}

impl OllamaClient {
    /// 创建新的 Ollama 客户端
    /// 
    /// # 参数
    /// 
    /// * `base_url` - Ollama API 的基础 URL，例如 "http://localhost:11434"
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            context: Arc::new(RwLock::new(None)),
            client: reqwest::Client::new(),
        }
    }

    /// 从环境变量创建 Ollama 客户端
    /// 
    /// 环境变量：
    /// - `OLLAMA_HOST`: Ollama 服务器地址（默认: "127.0.0.1"）
    /// - `OLLAMA_PORT`: Ollama 服务器端口（默认: "11434"）
    pub fn from_env() -> Self {
        let host = std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = std::env::var("OLLAMA_PORT").unwrap_or_else(|_| "11434".to_string());
        let base_url = format!("http://{}:{}", host, port);
        
        Self::new(base_url)
    }

    /// 向 Ollama 提问
    /// 
    /// # 参数
    /// 
    /// * `prompt` - 提示词/问题
    /// * `model` - 模型名称，例如 "gpt-oss:20b"
    /// * `new_session` - 是否开始新会话（true 会清空上下文）
    /// 
    /// # 返回
    /// 
    /// 返回模型的回答字符串
    /// 
    /// # 错误
    /// 
    /// 如果请求失败或解析响应失败，返回错误
    pub async fn ask(
        &self,
        prompt: impl Into<String>,
        model: impl Into<String>,
        new_session: bool,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // 如果是新会话，清空 context
        if new_session {
            let mut context_guard = self.context.write().await;
            *context_guard = None;
            log::info!("🔄 清空 Ollama 会话上下文");
        }

        // 读取当前 context
        let current_context = {
            let context_guard = self.context.read().await;
            context_guard.clone()
        };

        let prompt_str = prompt.into();
        let model_str = model.into();

        log::info!("📤 发送 Ollama 请求 - 模型: {}, 提示词长度: {}", 
                   model_str, prompt_str.len());

        // 构造请求
        let request = OllamaRequest {
            model: model_str,
            prompt: prompt_str,
            stream: false,
            context: current_context,
        };

        // 发送请求
        let response = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await?
            .json::<OllamaResponse>()
            .await?;

        log::info!("📥 收到 Ollama 响应 - 回答长度: {}", response.response.len());

        // 更新 context
        if let Some(new_context) = response.context.clone() {
            let mut context_guard = self.context.write().await;
            *context_guard = Some(new_context.clone());
            log::debug!("💾 保存会话上下文，长度: {}", new_context.len());
        }

        Ok(response.response)
    }

    /// 向 Ollama 提问（使用默认模型）
    /// 
    /// 默认模型: "gpt-oss:20b"
    #[allow(dead_code)]
    pub async fn ask_default(
        &self,
        prompt: impl Into<String>,
        new_session: bool,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.ask(prompt, "gpt-oss:20b", new_session).await
    }

    /// 获取完整的响应对象（包含所有元数据）
    #[allow(dead_code)]
    pub async fn ask_full(
        &self,
        prompt: impl Into<String>,
        model: impl Into<String>,
        new_session: bool,
    ) -> Result<OllamaResponse, Box<dyn std::error::Error>> {
        // 如果是新会话，清空 context
        if new_session {
            let mut context_guard = self.context.write().await;
            *context_guard = None;
        }

        // 读取当前 context
        let current_context = {
            let context_guard = self.context.read().await;
            context_guard.clone()
        };

        // 构造请求
        let request = OllamaRequest {
            model: model.into(),
            prompt: prompt.into(),
            stream: false,
            context: current_context,
        };

        // 发送请求
        let response = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await?
            .json::<OllamaResponse>()
            .await?;

        // 更新 context
        if let Some(new_context) = response.context.clone() {
            let mut context_guard = self.context.write().await;
            *context_guard = Some(new_context);
        }

        Ok(response)
    }

    /// 清空会话上下文
    pub async fn clear_context(&self) {
        let mut context_guard = self.context.write().await;
        *context_guard = None;
        log::info!("🗑️  清空 Ollama 会话上下文");
    }

    /// 获取当前会话上下文
    #[allow(dead_code)]
    pub async fn get_context(&self) -> Option<Vec<i64>> {
        let context_guard = self.context.read().await;
        context_guard.clone()
    }

    /// 检查是否有活动的会话上下文
    pub async fn has_context(&self) -> bool {
        let context_guard = self.context.read().await;
        context_guard.is_some()
    }

    /// 获取上下文大小
    pub async fn context_size(&self) -> usize {
        let context_guard = self.context.read().await;
        context_guard.as_ref().map_or(0, |ctx| ctx.len())
    }
}

impl Default for OllamaClient {
    fn default() -> Self {
        Self::new("http://localhost:11434")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ollama_client_creation() {
        let client = OllamaClient::new("http://localhost:11434");
        assert!(!client.has_context().await);
        assert_eq!(client.context_size().await, 0);
    }

    #[tokio::test]
    async fn test_clear_context() {
        let client = OllamaClient::new("http://localhost:11434");
        client.clear_context().await;
        assert!(!client.has_context().await);
    }
}


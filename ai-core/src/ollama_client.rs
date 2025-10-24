use ollama_models::{OllamaRequest, OllamaResponse};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Ollama 客户端
/// 
/// 用于与 Ollama API 交互，支持会话上下文管理
#[derive(Clone)]
pub struct OllamaClient {
    base_url: String,
    context: Arc<RwLock<Option<Vec<i64>>>>,
    client: reqwest::Client,
}

impl OllamaClient {
    /// 创建新的 Ollama 客户端
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            context: Arc::new(RwLock::new(None)),
            client: reqwest::Client::new(),
        }
    }

    /// 从环境变量创建 Ollama 客户端
    pub fn from_env() -> Self {
        let host = std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = std::env::var("OLLAMA_PORT").unwrap_or_else(|_| "11434".to_string());
        let base_url = format!("http://{}:{}", host, port);
        
        Self::new(base_url)
    }

    /// 向 Ollama 提问
    pub async fn ask(
        &self,
        prompt: impl Into<String>,
        model: impl Into<String>,
        new_session: bool,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
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

        // 构造请求
        let request = OllamaRequest {
            model: model_str.clone(),
            prompt: prompt_str.clone(),
            stream: false,
            context: current_context,
        };

        log::info!("🤖 向 Ollama 发送请求: 模型={}, 提示词长度={}", model_str, prompt_str.len());

        // 发送请求
        let response = self.send_request(request).await?;

        // 更新上下文
        if let Some(new_context) = &response.context {
            let mut context_guard = self.context.write().await;
            *context_guard = Some(new_context.clone());
        }

        log::info!("✅ Ollama 响应: 长度={}, 完成={}", response.response.len(), response.done);

        Ok(response.response)
    }

    /// 发送请求到 Ollama API
    pub async fn send_request(&self, request: OllamaRequest) -> Result<OllamaResponse, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/generate", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()).into());
        }
        
        let ollama_response: OllamaResponse = response.json().await?;
        
        Ok(ollama_response)
    }

    /// 获取当前会话上下文
    pub async fn get_context(&self) -> Option<Vec<i64>> {
        let context = self.context.read().await;
        context.clone()
    }

    /// 清除会话上下文
    pub async fn clear_context(&self) {
        let mut context = self.context.write().await;
        *context = None;
    }

    /// 设置会话上下文
    pub async fn set_context(&self, new_context: Vec<i64>) {
        let mut context = self.context.write().await;
        *context = Some(new_context);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ollama_client_creation() {
        let client = OllamaClient::new("http://localhost:11434".to_string());
        assert_eq!(client.base_url, "http://localhost:11434");
    }

    #[tokio::test]
    async fn test_context_management() {
        let client = OllamaClient::new("http://localhost:11434".to_string());
        
        // 测试设置和获取上下文
        let test_context = vec![1, 2, 3, 4, 5];
        client.set_context(test_context.clone()).await;
        
        let retrieved_context = client.get_context().await;
        assert_eq!(retrieved_context, Some(test_context));
        
        // 测试清除上下文
        client.clear_context().await;
        let cleared_context = client.get_context().await;
        assert_eq!(cleared_context, None);
    }
}

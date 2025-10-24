use serde::{Deserialize, Serialize};

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
    pub fn performance_stats(&self) -> crate::performance::PerformanceStats {
        crate::performance::PerformanceStats {
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
        self.thinking.is_some() && !self.thinking.as_ref().unwrap().is_empty()
    }
}

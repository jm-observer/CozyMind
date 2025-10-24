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

    /// 获取详细的性能报告
    pub fn detailed_report(&self) -> String {
        let mut report = Vec::new();
        
        report.push("=== Ollama 性能统计 ===".to_string());
        
        if let Some(total) = self.total_duration_ms {
            report.push(format!("总处理时间: {:.2}ms", total));
        }
        
        if let Some(load) = self.load_duration_ms {
            report.push(format!("模型加载时间: {:.2}ms", load));
        }
        
        if let Some(prompt_eval) = self.prompt_eval_duration_ms {
            report.push(format!("提示词评估时间: {:.2}ms", prompt_eval));
        }
        
        if let Some(eval) = self.eval_duration_ms {
            report.push(format!("生成时间: {:.2}ms", eval));
        }
        
        if let Some(prompt_count) = self.prompt_eval_count {
            report.push(format!("提示词评估次数: {}", prompt_count));
        }
        
        if let Some(eval_count) = self.eval_count {
            report.push(format!("生成评估次数: {}", eval_count));
        }
        
        if let Some(avg) = self.avg_eval_time_per_token_ms {
            report.push(format!("平均每token生成时间: {:.2}ms", avg));
        }
        
        report.join("\n")
    }
}

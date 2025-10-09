use serde::{Deserialize, Serialize};

/// 通用消息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub content: String,
    pub timestamp: i64,
}

impl Message {
    /// 创建新消息
    pub fn new(id: String, content: String, timestamp: i64) -> Self {
        Self {
            id,
            content,
            timestamp,
        }
    }
}

/// 通用响应结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> Response<T> {
    /// 创建成功响应
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    /// 创建失败响应
    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_creation() {
        let msg = Message::new("1".to_string(), "Hello".to_string(), 123456789);
        assert_eq!(msg.id, "1");
        assert_eq!(msg.content, "Hello");
        assert_eq!(msg.timestamp, 123456789);
    }

    #[test]
    fn test_response_success() {
        let response = Response::success("data");
        assert!(response.success);
        assert_eq!(response.data, Some("data"));
        assert_eq!(response.error, None);
    }

    #[test]
    fn test_response_error() {
        let response: Response<String> = Response::error("error message".to_string());
        assert!(!response.success);
        assert_eq!(response.data, None);
        assert_eq!(response.error, Some("error message".to_string()));
    }
}

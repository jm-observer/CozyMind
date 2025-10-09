use serde::{Deserialize, Serialize};
use std::time::SystemTime;

/// MQTT 消息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MqttMessage {
    /// 消息ID
    pub id: String,
    /// 主题
    pub topic: String,
    /// 消息内容
    pub payload: Vec<u8>,
    /// QoS 级别 (0, 1, 2)
    pub qos: u8,
    /// 是否保留消息
    pub retain: bool,
    /// 时间戳
    pub timestamp: u64,
    /// 客户端ID
    pub client_id: Option<String>,
}

impl MqttMessage {
    /// 创建新的MQTT消息
    pub fn new(topic: String, payload: Vec<u8>, qos: u8) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            topic,
            payload,
            qos,
            retain: false,
            timestamp: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            client_id: None,
        }
    }

    /// 设置客户端ID
    pub fn with_client_id(mut self, client_id: String) -> Self {
        self.client_id = Some(client_id);
        self
    }

    /// 设置保留标志
    pub fn with_retain(mut self, retain: bool) -> Self {
        self.retain = retain;
        self
    }

    /// 获取消息内容为字符串
    pub fn payload_as_string(&self) -> String {
        String::from_utf8_lossy(&self.payload).to_string()
    }

    /// 获取消息内容为JSON
    pub fn payload_as_json<T>(&self) -> Result<T, serde_json::Error>
    where
        T: for<'de> Deserialize<'de>,
    {
        serde_json::from_slice(&self.payload)
    }
}

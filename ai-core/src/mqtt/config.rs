use serde::{Deserialize, Serialize};

/// MQTT Broker 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MqttConfig {
    /// Broker 监听地址
    pub host: String,
    /// Broker 监听端口
    pub port: u16,
    /// 最大连接数
    pub max_connections: usize,
    /// 会话超时时间（秒）
    pub session_timeout: u64,
    /// 心跳间隔（秒）
    pub keep_alive: u16,
    /// 是否启用持久化
    pub persistence: bool,
    /// 日志级别
    pub log_level: String,
}

impl Default for MqttConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 1883,
            max_connections: 1000,
            session_timeout: 300,
            keep_alive: 60,
            persistence: true,
            log_level: "info".to_string(),
        }
    }
}

impl MqttConfig {
    /// 创建新的MQTT配置
    pub fn new(host: String, port: u16) -> Self {
        Self {
            host,
            port,
            ..Default::default()
        }
    }

    /// 获取监听地址
    pub fn listen_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

use chrono::{DateTime, FixedOffset, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// 消息类型枚举
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    System,
    User,
    Event,
}

/// 消息元数据
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MessageMeta {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    #[serde(default = "default_timestamp")]
    pub timestamp: DateTime<FixedOffset>,
    #[serde(flatten)]
    pub additional: HashMap<String, Value>,
}

fn default_schema_version() -> String {
    "v0".to_string()
}

/// 获取东八区时区
fn china_timezone() -> FixedOffset {
    FixedOffset::east_opt(8 * 3600).unwrap()
}

/// 默认时间戳（东八区当前时间）
fn default_timestamp() -> DateTime<FixedOffset> {
    Utc::now().with_timezone(&china_timezone())
}

impl Default for MessageMeta {
    fn default() -> Self {
        Self {
            schema_version: default_schema_version(),
            timestamp: default_timestamp(),
            additional: HashMap::new(),
        }
    }
}

impl MessageMeta {
    /// 创建一个新的 MessageMeta，使用默认的 schema_version (v0) 和东八区当前时间
    pub fn new() -> Self {
        Self::default()
    }

    /// 使用东八区当前时间创建 MessageMeta
    pub fn with_china_time() -> Self {
        Self {
            schema_version: default_schema_version(),
            timestamp: Utc::now().with_timezone(&china_timezone()),
            additional: HashMap::new(),
        }
    }
}

/// 事件状态
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventStatus {
    Ok,
    Error,
}

/// 错误信息
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EventError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<HashMap<String, Value>>,
    #[serde(flatten)]
    pub additional: HashMap<String, Value>,
}

/// 事件内容
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EventContent {
    pub source: String,
    pub status: EventStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<HashMap<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<EventError>,
    #[serde(flatten)]
    pub additional: HashMap<String, Value>,
}

impl EventContent {
    /// 创建一个成功状态的事件
    pub fn ok(source: impl Into<String>, data: HashMap<String, Value>) -> Self {
        Self {
            source: source.into(),
            status: EventStatus::Ok,
            data: Some(data),
            error: None,
            additional: HashMap::new(),
        }
    }

    /// 创建一个错误状态的事件
    pub fn error(source: impl Into<String>, error: EventError) -> Self {
        Self {
            source: source.into(),
            status: EventStatus::Error,
            data: None,
            error: Some(error),
            additional: HashMap::new(),
        }
    }

    /// 验证事件内容的一致性
    pub fn validate(&self) -> Result<(), String> {
        match self.status {
            EventStatus::Ok if self.data.is_none() => {
                Err("Status is 'ok' but 'data' is missing".to_string())
            }
            EventStatus::Error if self.error.is_none() => {
                Err("Status is 'error' but 'error' is missing".to_string())
            }
            _ => Ok(()),
        }
    }
}

/// 消息内容（可以是字符串或事件对象）
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    /// 用户消息内容（字符串）
    Text(String),
    /// 事件消息内容（对象）
    Event(EventContent),
    /// 系统消息或其他对象类型
    Object(HashMap<String, Value>),
}

/// 消息信封（顶层结构）
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Envelope {
    #[serde(rename = "type")]
    pub message_type: MessageType,
    pub content: MessageContent,
    #[serde(default)]
    pub meta: MessageMeta,
    #[serde(flatten)]
    pub additional: HashMap<String, Value>,
}

impl Envelope {
    /// 创建用户消息（使用默认 meta）
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            message_type: MessageType::User,
            content: MessageContent::Text(content.into()),
            meta: MessageMeta::default(),
            additional: HashMap::new(),
        }
    }

    /// 创建事件消息（使用默认 meta）
    pub fn event(content: EventContent) -> Self {
        Self {
            message_type: MessageType::Event,
            content: MessageContent::Event(content),
            meta: MessageMeta::default(),
            additional: HashMap::new(),
        }
    }

    /// 创建系统消息（使用默认 meta）
    pub fn system(content: HashMap<String, Value>) -> Self {
        Self {
            message_type: MessageType::System,
            content: MessageContent::Object(content),
            meta: MessageMeta::default(),
            additional: HashMap::new(),
        }
    }

    /// 设置元数据
    pub fn with_meta(mut self, meta: MessageMeta) -> Self {
        self.meta = meta;
        self
    }

    /// 从JSON字符串解析
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// 转换为JSON字符串
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// 转换为格式化的JSON字符串
    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_message() {
        let msg = Envelope::user("明早 7 点提醒我开会");
        let json = msg.to_json().unwrap();
        assert!(json.contains("\"type\":\"user\""));
        assert!(json.contains("明早 7 点提醒我开会"));

        let parsed: Envelope = Envelope::from_json(&json).unwrap();
        assert_eq!(parsed.message_type, MessageType::User);
        match parsed.content {
            MessageContent::Text(ref s) => assert_eq!(s, "明早 7 点提醒我开会"),
            _ => panic!("Expected Text content"),
        }
    }

    #[test]
    fn test_event_ok() {
        let mut data = HashMap::new();
        data.insert("id".to_string(), Value::String("r-1".to_string()));

        let event = EventContent::ok("mod-002", data);
        let msg = Envelope::event(event);

        let json = msg.to_json().unwrap();
        assert!(json.contains("\"type\":\"event\""));
        assert!(json.contains("\"status\":\"ok\""));
        assert!(json.contains("\"source\":\"mod-002\""));

        let parsed: Envelope = Envelope::from_json(&json).unwrap();
        assert_eq!(parsed.message_type, MessageType::Event);
    }

    #[test]
    fn test_event_error() {
        let error = EventError {
            code: "E001".to_string(),
            message: "处理失败".to_string(),
            details: None,
            additional: HashMap::new(),
        };

        let event = EventContent::error("mod-003", error);
        assert!(event.validate().is_ok());

        let msg = Envelope::event(event);
        let json = msg.to_json().unwrap();

        assert!(json.contains("\"status\":\"error\""));
        assert!(json.contains("\"code\":\"E001\""));
    }

    #[test]
    fn test_parse_fixture() {
        let json = r#"{ "type": "user", "content": "明早 7 点提醒我开会" }"#;
        let msg: Envelope = Envelope::from_json(json).unwrap();
        assert_eq!(msg.message_type, MessageType::User);

        let json2 = r#"{ "type": "event", "content": { "source": "mod-002", "status": "ok", "data": { "id": "r-1" } } }"#;
        let msg2: Envelope = Envelope::from_json(json2).unwrap();
        assert_eq!(msg2.message_type, MessageType::Event);
    }

    #[test]
    fn test_event_validation() {
        // 缺少 data 的 ok 状态
        let invalid_ok = EventContent {
            source: "test".to_string(),
            status: EventStatus::Ok,
            data: None,
            error: None,
            additional: HashMap::new(),
        };
        assert!(invalid_ok.validate().is_err());

        // 缺少 error 的 error 状态
        let invalid_error = EventContent {
            source: "test".to_string(),
            status: EventStatus::Error,
            data: None,
            error: None,
            additional: HashMap::new(),
        };
        assert!(invalid_error.validate().is_err());
    }

    #[test]
    fn test_meta() {
        // 测试使用默认值（东八区时间）
        let meta = MessageMeta::new();
        assert_eq!(meta.schema_version, "v0");
        
        // 验证时区是东八区（UTC+8）
        assert_eq!(meta.timestamp.offset().local_minus_utc(), 8 * 3600);

        let msg = Envelope::user("测试").with_meta(meta);
        // meta 总是存在
        assert_eq!(msg.meta.schema_version, "v0");

        let json = msg.to_json().unwrap();
        let parsed: Envelope = Envelope::from_json(&json).unwrap();
        // meta 总是存在
        assert_eq!(parsed.meta.schema_version, "v0");
        assert_eq!(parsed.meta.timestamp.offset().local_minus_utc(), 8 * 3600);
    }
}



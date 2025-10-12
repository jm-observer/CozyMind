# Message Models 快速入门

## 5 分钟快速上手

### 1. 添加依赖

在你的 `Cargo.toml` 中添加：

```toml
[dependencies]
message-models = { path = "../message-models" }
```

### 2. 导入类型

```rust
use message_models::prelude::*;
```

### 3. 基本用法

#### 创建和解析用户消息

```rust
// 创建用户消息（自动包含 meta：v0 + 东八区时间）
let msg = Envelope::user("明早 7 点提醒我开会");

// meta 总是存在
println!("版本: {}", msg.meta.schema_version);
println!("时间: {}", msg.meta.timestamp);

// 序列化为 JSON
let json = msg.to_json().unwrap();
println!("{}", json);

// 从 JSON 解析
let parsed = Envelope::from_json(&json).unwrap();
```

#### 创建和解析事件消息

```rust
use std::collections::HashMap;
use serde_json::Value;

// 成功事件
let mut data = HashMap::new();
data.insert("id".to_string(), Value::String("r-1".to_string()));
let event = EventContent::ok("mod-002", data);
let msg = Envelope::event(event);

// 错误事件
let error = EventError {
    code: "E_TIMEOUT".to_string(),
    message: "scheduler timeout".to_string(),
    details: None,
    additional: HashMap::new(),
};
let event = EventContent::error("mod-002", error);
let msg = Envelope::event(event);
```

#### 自定义版本信息

```rust
// 使用默认创建（推荐）
let msg = Envelope::user("测试消息");
// meta 自动包含 v0 + 东八区时间

// 如果需要自定义 meta
let custom_meta = MessageMeta::new();
let msg = Envelope::user("测试消息").with_meta(custom_meta);

// 或者手动创建
let meta = MessageMeta {
    schema_version: "v0".to_string(),
    timestamp: Utc::now().with_timezone(&FixedOffset::east_opt(8 * 3600).unwrap()),
    additional: HashMap::new(),
};
let msg = Envelope::user("测试消息").with_meta(meta);
```

#### 使用版本感知解析（推荐）

```rust
// 自动检测版本
let json = r#"{
    "type": "user",
    "content": "测试",
    "meta": { "schema_version": "v0" }
}"#;

let versioned = VersionedEnvelope::from_json(json).unwrap();
println!("版本: {}", versioned.version());

// 获取 v0 envelope
if let Some(envelope) = versioned.as_v0() {
    match envelope.content {
        MessageContent::Text(text) => println!("内容: {}", text),
        _ => {}
    }
}
```

### 4. 完整示例

```rust
use message_models::prelude::*;
use std::collections::HashMap;
use chrono::Utc;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. 创建带完整 meta 的用户消息（使用东八区时间）
    let meta = MessageMeta::new();
    
    let user_msg = Envelope::user("明早 7 点提醒我开会").with_meta(meta);
    
    // 2. 序列化
    let json = user_msg.to_json_pretty()?;
    println!("用户消息:\n{}\n", json);
    
    // 3. 使用 VersionedEnvelope 解析
    let versioned = VersionedEnvelope::from_json(&json)?;
    println!("检测到版本: {}", versioned.version());
    
    // 4. 创建事件消息
    let mut data = HashMap::new();
    data.insert("reminder_id".to_string(), 
                serde_json::Value::String("r-123".to_string()));
    
    let event = EventContent::ok("reminder-module", data);
    let event_msg = Envelope::event(event);
    
    // 5. 验证事件
    if let MessageContent::Event(ref evt) = event_msg.content {
        evt.validate()?;
        println!("事件验证通过!");
    }
    
    Ok(())
}
```

### 5. 常见模式

#### 处理接收到的消息

```rust
fn handle_message(json: &str) -> Result<(), Box<dyn std::error::Error>> {
    let versioned = VersionedEnvelope::from_json(json)?;
    
    if let Some(envelope) = versioned.as_v0() {
        match &envelope.content {
            MessageContent::Text(text) => {
                println!("用户输入: {}", text);
                // 处理用户输入
            }
            MessageContent::Event(event) => {
                event.validate()?;
                match event.status {
                    EventStatus::Ok => {
                        println!("事件成功: {}", event.source);
                        // 处理成功事件
                    }
                    EventStatus::Error => {
                        if let Some(err) = &event.error {
                            eprintln!("事件错误: {} - {}", err.code, err.message);
                        }
                        // 处理错误事件
                    }
                }
            }
            MessageContent::Object(obj) => {
                println!("系统消息");
                // 处理系统消息
            }
        }
    }
    
    Ok(())
}
```

#### MQTT 发布消息

```rust
fn publish_to_mqtt(client: &mqtt::Client, topic: &str, msg: &Envelope) -> Result<(), Box<dyn std::error::Error>> {
    let json = msg.to_json()?;
    client.publish(topic, json.as_bytes(), mqtt::QoS::AtLeastOnce, false)?;
    Ok(())
}
```

### 6. 测试你的代码

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create_and_parse() {
        let msg = Envelope::user("测试");
        let json = msg.to_json().unwrap();
        let parsed = Envelope::from_json(&json).unwrap();
        
        assert_eq!(parsed.message_type, MessageType::User);
    }
}
```

### 7. 运行示例

```bash
# 查看基本解析示例
cargo run --example parse_fixtures -p message-models

# 查看版本功能演示
cargo run --example version_demo -p message-models
```

## 下一步

- 阅读完整的 [README.md](./README.md)
- 查看 [CHANGELOG.md](./CHANGELOG.md) 了解最新功能
- 运行 `cargo test -p message-models` 查看更多测试示例

## 需要帮助？

查看 `examples/` 目录下的完整示例代码。



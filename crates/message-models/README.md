# Message Models

CozyMind 项目的消息模型库，基于 JSON Schema 定义的消息格式实现。

## 功能特性

- 📦 完整实现 envelope、event-content 和 user-content schema
- ✅ 支持序列化和反序列化（使用 serde）
- 🔒 类型安全的消息构建
- 🧪 包含完整的单元测试
- 📝 支持额外字段（additionalProperties）
- 🔄 **版本管理和多版本兼容支持**

## 版本支持

### Schema 版本

本库支持多版本 schema，可以轻松扩展到未来版本：

- **v0** - 当前版本（默认）
- 未来版本可以无缝添加

### SchemaVersion 枚举

```rust
use message_models::SchemaVersion;

// 获取默认版本
let version = SchemaVersion::default(); // v0

// 获取所有支持的版本
let versions = SchemaVersion::all();

// 获取最新版本
let latest = SchemaVersion::latest();

// 检查版本兼容性
assert!(SchemaVersion::V0.is_compatible_with(&SchemaVersion::V0));
```

### VersionedEnvelope - 版本感知的消息处理

`VersionedEnvelope` 可以自动检测和处理不同版本的消息：

```rust
use message_models::VersionedEnvelope;

// 自动检测版本（从 meta.schema_version 字段）
let json = r#"{
    "type": "user",
    "content": "测试",
    "meta": {
        "schema_version": "v0"
    }
}"#;

let versioned = VersionedEnvelope::from_json(json).unwrap();
println!("检测到版本: {}", versioned.version());

// 获取特定版本的 envelope
if let Some(envelope) = versioned.as_v0() {
    // 使用 v0 版本的 envelope
}

// 或者转换所有权
let envelope = versioned.into_v0().unwrap();
```

### 向后兼容

没有版本信息的消息会自动默认为 v0 版本：

```rust
// 没有 meta 字段的消息
let json = r#"{ "type": "user", "content": "测试" }"#;
let versioned = VersionedEnvelope::from_json(json).unwrap();
assert_eq!(versioned.version(), SchemaVersion::V0); // 默认 v0
```

## 消息类型

### Envelope (消息信封)

顶层消息结构，包含消息类型、内容和元数据。

```rust
use message_models::{Envelope, MessageMeta};
use std::collections::HashMap;

// 创建用户消息
let msg = Envelope::user("明早 7 点提醒我开会");

// 创建带版本信息的消息
let meta = MessageMeta {
    schema_version: "v0".to_string(),
    timestamp: Some(chrono::Utc::now()),
    locale: Some("zh-CN".to_string()),
    timezone: Some("Asia/Shanghai".to_string()),
    additional: HashMap::new(),
};

let msg = Envelope::user("测试").with_meta(meta);

// 转换为 JSON
let json = msg.to_json().unwrap();
```

### MessageType (消息类型)

- `System` - 系统消息
- `User` - 用户消息
- `Event` - 事件消息

### MessageContent (消息内容)

支持三种内容类型：

- `Text(String)` - 文本内容（用于用户消息）
- `Event(EventContent)` - 事件内容（用于事件消息）
- `Object(HashMap<String, Value>)` - 对象内容（用于系统消息）

### EventContent (事件内容)

事件消息的详细内容：

```rust
use message_models::{EventContent, EventError, Envelope};
use std::collections::HashMap;
use serde_json::Value;

// 创建成功事件
let mut data = HashMap::new();
data.insert("id".to_string(), Value::String("r-1".to_string()));
let event = EventContent::ok("mod-002", data);
let msg = Envelope::event(event);

// 创建错误事件
let error = EventError {
    code: "E001".to_string(),
    message: "处理失败".to_string(),
    details: None,
    additional: HashMap::new(),
};
let event = EventContent::error("mod-003", error);
let msg = Envelope::event(event);
```

### EventStatus (事件状态)

- `Ok` - 成功状态（需要 data 字段）
- `Error` - 错误状态（需要 error 字段）

### MessageMeta (消息元数据)

可选的元数据信息，**包含版本信息**：

```rust
use message_models::MessageMeta;
use chrono::Utc;
use std::collections::HashMap;

let meta = MessageMeta {
    schema_version: "v0".to_string(), // 版本信息
    timestamp: Some(Utc::now()),
    locale: Some("zh-CN".to_string()),
    timezone: Some("Asia/Shanghai".to_string()),
    additional: HashMap::new(),
};
```

## 使用示例

### 基本使用（直接使用 v0 模型）

```rust
use message_models::{Envelope, MessageContent};

let json = r#"{ "type": "user", "content": "明早 7 点提醒我开会" }"#;
let msg: Envelope = Envelope::from_json(json).unwrap();

match msg.content {
    MessageContent::Text(text) => println!("用户说: {}", text),
    MessageContent::Event(event) => println!("事件来源: {}", event.source),
    MessageContent::Object(obj) => println!("系统消息"),
}
```

### 版本感知的使用方式（推荐）

```rust
use message_models::VersionedEnvelope;

let json = r#"{
    "type": "user",
    "content": "测试",
    "meta": { "schema_version": "v0" }
}"#;

// 自动检测并解析版本
let versioned = VersionedEnvelope::from_json(json).unwrap();
println!("版本: {}", versioned.version());

// 获取具体版本的 envelope
if let Some(envelope) = versioned.as_v0() {
    // 处理 v0 版本的消息
}
```

### 验证事件内容

```rust
use message_models::EventContent;

let event = EventContent::ok("mod-002", data);

// 验证事件内容是否符合 schema 规则
if let Err(e) = event.validate() {
    eprintln!("事件验证失败: {}", e);
}
```

### 使用 Prelude 简化导入

```rust
use message_models::prelude::*;

// 现在可以直接使用所有常用类型
let msg = Envelope::user("测试");
let versioned = VersionedEnvelope::from_json(json)?;
```

## 测试

运行测试：

```bash
# 运行所有测试
cargo test -p message-models

# 运行特定测试
cargo test -p message-models test_version
```

## 示例

查看完整示例：

```bash
# 解析 fixtures 示例
cargo run --example parse_fixtures -p message-models

# 版本功能演示
cargo run --example version_demo -p message-models

# 加载 fixtures 文件
cargo run --example load_fixtures -p message-models
```

## Fixtures

项目包含示例 fixtures，所有 fixtures 都包含版本信息：

- `resources/fixtures/user_text_ok.json` - 用户消息示例
- `resources/fixtures/event_ok.json` - 成功事件示例
- `resources/fixtures/event_error.json` - 错误事件示例

所有 fixtures 都包含 `meta.schema_version` 字段以确保正确的版本识别。

## Schema 版本

当前实现基于 schema v0 版本，位于 `resources/schemas/v0/`。

## 未来版本支持

添加新版本非常简单：

1. 在 `src/` 下创建新的版本模块（如 `v1.rs`）
2. 在 `SchemaVersion` 枚举中添加新版本
3. 在 `VersionedEnvelope` 中添加新变体
4. 实现版本转换逻辑（如需要）

```rust
// 未来添加 v1 的示例
pub enum SchemaVersion {
    V0,
    V1, // 新版本
}

pub enum VersionedEnvelope {
    V0(crate::v0::Envelope),
    V1(crate::v1::Envelope), // 新版本
}
```

## 依赖

- `serde` - 序列化/反序列化
- `serde_json` - JSON 支持
- `chrono` - 日期时间处理

## 项目结构

```
message-models/
├── src/
│   ├── lib.rs          # 库入口和重导出
│   ├── version.rs      # 版本管理
│   └── v0.rs           # v0 版本的模型定义
├── tests/
│   └── fixtures_test.rs # Fixture 测试
├── examples/
│   ├── parse_fixtures.rs  # 基本解析示例
│   ├── version_demo.rs    # 版本功能演示
│   └── load_fixtures.rs   # 加载文件示例
└── README.md
```

## 最佳实践

1. **使用 VersionedEnvelope** - 对于需要处理多个版本的场景，使用 `VersionedEnvelope` 可以自动处理版本检测
2. **添加版本信息** - 在创建消息时总是包含 `meta.schema_version` 字段
3. **验证事件** - 对于事件消息，使用 `validate()` 方法确保数据完整性
4. **使用 prelude** - 通过 `use message_models::prelude::*;` 快速导入常用类型

## 许可证

MIT OR Apache-2.0

# CozyMind 公共库

本目录包含 CozyMind 项目的公共库（crates），这些库可以在多个项目中复用。

## 已有库

### mqtt-client

MQTT v5 客户端封装库。

- **功能**: 提供异步 MQTT 客户端功能
- **协议**: MQTT v5
- **特性**: 
  - 异步操作（基于 tokio）
  - 环境变量配置
  - JSON 消息支持
  - 自动消息分发

**文档**: [mqtt-client/README.md](mqtt-client/README.md)

**使用示例**:
```rust
use mqtt_client::{ClientConfig, MqttClient, QoS};

let config = ClientConfig::from_env(
    "MQTT_CLIENT_ID",
    "MQTT_BROKER_HOST",
    "MQTT_BROKER_PORT",
    "MQTT_KEEP_ALIVE",
);

let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
let mut client = MqttClient::new(config, tx);
client.connect().await.unwrap();
```

## 添加新库

在 `crates` 目录下创建新的库项目：

```bash
cd crates
cargo new --lib your-lib-name
```

然后在根目录的 `Cargo.toml` 中添加到 workspace：

```toml
[workspace]
members = [
    "ai-core",
    "broker",
    "gui",
    "crates/mqtt-client",
    "crates/your-lib-name",  # 添加新库
]
```

## 使用公共库

在其他项目中使用这些库，只需在 `Cargo.toml` 中添加依赖：

```toml
[dependencies]
mqtt-client = { path = "../crates/mqtt-client" }
```

## 最佳实践

1. **单一职责**: 每个库专注于一个功能领域
2. **良好文档**: 每个库都应有详细的 README 和 API 文档
3. **版本管理**: 使用语义化版本
4. **测试覆盖**: 提供充分的单元测试和集成测试
5. **示例代码**: 在 README 中提供使用示例

## 未来规划

可能添加的库：

- `common-models`: 共享数据模型
- `utils`: 通用工具函数
- `config`: 配置管理
- `storage`: 存储抽象层


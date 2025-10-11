# MQTT Client

CozyMind 项目的 MQTT v5 客户端封装库。

## 功能特性

- ✅ MQTT v5 协议支持
- ✅ 异步操作（基于 tokio）
- ✅ 自动重连机制
- ✅ 消息队列处理
- ✅ 环境变量配置
- ✅ JSON 消息支持

## 使用示例

```rust
use mqtt_client::{ClientConfig, MqttClient, MqttMessage, QoS};
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    // 创建消息通道
    let (tx, mut rx) = mpsc::unbounded_channel::<MqttMessage>();

    // 从环境变量创建配置
    let config = ClientConfig::from_env(
        "MQTT_CLIENT_ID",
        "MQTT_BROKER_HOST",
        "MQTT_BROKER_PORT",
        "MQTT_KEEP_ALIVE",
    );

    // 或者手动创建配置
    let config = ClientConfig::new(
        "my-client-id".to_string(),
        "localhost".to_string(),
        8884,
        60,
    );

    // 创建客户端
    let mut client = MqttClient::new(config, tx);

    // 连接到 Broker
    client.connect().await.unwrap();

    // 订阅主题
    client.subscribe("test/topic", QoS::AtLeastOnce).await.unwrap();

    // 发布消息
    client.publish("test/topic", b"Hello MQTT", QoS::AtLeastOnce, false)
        .await
        .unwrap();

    // 发布 JSON 消息
    #[derive(serde::Serialize)]
    struct Data {
        value: i32,
    }
    client.publish_json("test/json", &Data { value: 42 }, QoS::AtLeastOnce, false)
        .await
        .unwrap();

    // 处理接收到的消息
    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            println!("收到消息: topic={}, payload={}", 
                message.topic, 
                message.payload_as_string()
            );
        }
    });
}
```

## 配置

### 环境变量

使用 `ClientConfig::from_env()` 时，支持以下环境变量：

- `MQTT_CLIENT_ID`: 客户端 ID（可自定义环境变量名）
- `MQTT_BROKER_HOST`: Broker 地址
- `MQTT_BROKER_PORT`: Broker 端口
- `MQTT_KEEP_ALIVE`: 保持连接时间（秒）
- `MQTT_USERNAME`: 认证用户名（可选）
- `MQTT_PASSWORD`: 认证密码（可选）

### 手动配置

```rust
let config = ClientConfig {
    client_id: "my-client".to_string(),
    broker_host: "mqtt.example.com".to_string(),
    broker_port: 8884,
    username: Some("user".to_string()),
    password: Some("pass".to_string()),
    keep_alive: 60,
    clean_session: true,
};
```

## API 文档

### ClientConfig

配置结构体。

#### 方法

- `from_env(client_id_env, broker_host_env, broker_port_env, keep_alive_env)`: 从环境变量创建
- `new(client_id, broker_host, broker_port, keep_alive)`: 手动创建

### MqttClient

MQTT 客户端。

#### 方法

- `new(config, tx)`: 创建新客户端
- `connect()`: 连接到 Broker
- `disconnect()`: 断开连接
- `is_connected()`: 检查连接状态
- `subscribe(topic, qos)`: 订阅主题
- `unsubscribe(topic)`: 取消订阅
- `publish(topic, payload, qos, retain)`: 发布消息
- `publish_json(topic, data, qos, retain)`: 发布 JSON 消息
- `get_client_info()`: 获取客户端信息

### MqttMessage

MQTT 消息结构。

#### 字段

- `id`: 消息 ID
- `topic`: 主题
- `payload`: 消息载荷
- `qos`: QoS 等级
- `retain`: 保留标志
- `timestamp`: 时间戳

#### 方法

- `payload_as_string()`: 将载荷转换为字符串
- `payload_as_json<T>()`: 将载荷解析为 JSON

## 依赖

- `rumqttc`: MQTT 客户端库
- `tokio`: 异步运行时
- `serde`: 序列化/反序列化
- `uuid`: UUID 生成

## 许可证

MIT OR Apache-2.0


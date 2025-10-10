# CozyMind MQTT Broker

独立的MQTT Broker服务模块，提供完整的MQTT消息代理功能。

## 功能特性

- ✅ MQTT Broker 服务管理
- ✅ 客户端连接管理
- ✅ 消息发布和订阅
- ✅ 健康检查和状态监控
- ✅ RESTful API 接口
- ✅ 统计信息收集

## API 端点

### 基础接口
- `GET /` - 服务信息
- `GET /health` - 健康检查

### MQTT 管理接口
- `GET /mqtt/status` - 获取Broker状态
- `POST /mqtt/start` - 启动MQTT Broker
- `POST /mqtt/stop` - 停止MQTT Broker
- `POST /mqtt/publish` - 发布消息
- `GET /mqtt/clients` - 获取连接的客户端列表

## 启动方式

```bash
cd broker
cargo run --release
```

服务将在 `http://127.0.0.1:9801` 启动

## 使用示例

### 启动MQTT Broker

```bash
curl -X POST http://localhost:9801/mqtt/start \
  -H "Content-Type: application/json" \
  -d '{"host":"0.0.0.0","port":1883}'
```

### 检查状态

```bash
curl http://localhost:9801/mqtt/status
```

### 发布消息

```bash
curl -X POST http://localhost:9801/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{"topic":"test/topic","payload":[72,101,108,108,111],"qos":0}'
```

## 技术栈

- **语言**: Rust (Edition 2021)
- **Web框架**: actix-web 4.9
- **MQTT**: rumqttd 0.20, rumqttc 0.20
- **序列化**: serde, serde_json
- **异步运行时**: tokio
- **日志**: env_logger, log

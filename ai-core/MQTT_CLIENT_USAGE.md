# AI-Core MQTT 客户端使用指南

AI-Core 现在包含了完整的MQTT客户端功能，可以连接到MQTT Broker进行消息订阅和发布。

## 功能特性

- ✅ MQTT客户端连接管理
- ✅ 主题订阅和取消订阅
- ✅ 消息发布（支持QoS 0/1/2）
- ✅ 消息接收和处理
- ✅ RESTful API接口

## API 端点

### 基础接口
- `GET /` - 服务信息
- `GET /health` - 健康检查

### MQTT 客户端接口
- `GET /mqtt/status` - 获取MQTT客户端状态
- `POST /mqtt/connect` - 连接到MQTT Broker
- `POST /mqtt/disconnect` - 断开MQTT连接
- `POST /mqtt/subscribe` - 订阅主题
- `POST /mqtt/unsubscribe` - 取消订阅主题
- `POST /mqtt/publish` - 发布消息

## 使用示例

### 1. 连接MQTT Broker

```bash
curl -X POST http://localhost:9800/mqtt/connect \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "ai-core-client",
    "broker_host": "localhost",
    "broker_port": 1883,
    "username": null,
    "password": null,
    "keep_alive": 60,
    "clean_session": true
  }'
```

### 2. 检查连接状态

```bash
curl http://localhost:9800/mqtt/status
```

### 3. 订阅主题

```bash
curl -X POST http://localhost:9800/mqtt/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "ai/input",
    "qos": 1
  }'
```

### 4. 发布消息

```bash
curl -X POST http://localhost:9800/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "ai/output",
    "payload": [72,101,108,108,111,32,87,111,114,108,100],
    "qos": 1,
    "retain": false
  }'
```

### 5. 取消订阅主题

```bash
curl -X POST http://localhost:9800/mqtt/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "ai/input"
  }'
```

### 6. 断开连接

```bash
curl -X POST http://localhost:9800/mqtt/disconnect
```

## 与Broker服务配合使用

1. **启动Broker服务**:
   ```bash
   cd broker && cargo run --release
   ```

2. **启动AI-Core服务**:
   ```bash
   cd ai-core && cargo run --release
   ```

3. **启动Broker实例**:
   ```bash
   curl -X POST http://localhost:9801/mqtt/start \
     -H "Content-Type: application/json" \
     -d '{"host":"0.0.0.0","port":1883}'
   ```

4. **AI-Core连接到Broker**:
   ```bash
   curl -X POST http://localhost:9800/mqtt/connect \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "ai-core-client",
       "broker_host": "localhost",
       "broker_port": 1883,
       "keep_alive": 60,
       "clean_session": true
     }'
   ```

## 消息处理

AI-Core会自动处理接收到的MQTT消息，并在日志中记录：

```
📨 AI-Core received MQTT packet: ...
📨 AI-Core processing message: topic=ai/input, payload=Hello World
```

## QoS 级别说明

- **QoS 0 (AtMostOnce)**: 最多一次，消息可能丢失
- **QoS 1 (AtLeastOnce)**: 至少一次，消息不会丢失但可能重复
- **QoS 2 (ExactlyOnce)**: 恰好一次，消息不会丢失也不会重复

## 注意事项

1. 确保MQTT Broker服务已启动
2. 检查防火墙设置，确保端口1883可访问
3. 客户端ID必须唯一，避免冲突
4. 长时间运行建议设置合适的keep_alive值

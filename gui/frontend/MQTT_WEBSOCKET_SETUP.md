# MQTT WebSocket 实时通信设置指南

## 概述

本项目已集成 MQTT WebSocket 实时通信功能，支持前端与 MQTT broker 的实时消息传递。

## 架构

```
Frontend (Vue.js) 
    ↕ WebSocket
MQTT Broker (rumqttd)
    ↕ MQTT
AI-Core Services
```

## 配置

### 1. 环境变量配置

在 `gui/frontend` 目录下创建 `.env` 文件：

```env
# WebSocket 连接配置
VITE_WS_URL=ws://localhost:8885

# MQTT Broker 配置
VITE_MQTT_BROKER_HOST=localhost
VITE_MQTT_BROKER_PORT=8884
VITE_MQTT_BROKER_WS_PORT=8885

# API 配置
VITE_API_BASE_URL=/api
```

### 2. MQTT Broker 配置

确保 `rumqttd.toml` 配置正确：

```toml
[ws.1]
name = "ws-1"
listen = "0.0.0.0:8885"  # WebSocket 端口
next_connection_delay_ms = 1
    [ws.1.connections]
    connection_timeout_ms = 60000
    max_client_id_len = 256
    throttle_delay_ms = 0
    max_payload_size = 20480
    max_inflight_count = 500
    max_inflight_size = 1024
```

## 功能特性

### 1. 实时消息传递
- 用户发送消息通过 WebSocket 发送到 MQTT broker
- AI 回复通过 MQTT 主题实时推送到前端
- 支持消息状态跟踪（发送中、已发送、失败等）

### 2. 连接管理
- 自动连接和重连机制
- 连接状态监控
- 错误处理和恢复

### 3. 消息路由
- 基于 MQTT 主题的消息路由
- 支持多种消息类型（聊天、系统参数、状态更新等）
- 消息格式标准化

## MQTT 主题结构

### 聊天相关主题
- `chat/send` - 发送聊天消息
- `chat/receive` - 接收聊天回复
- `chat/status` - 消息状态更新
- `chat/session/create` - 创建会话
- `chat/session/delete` - 删除会话
- `chat/session/list` - 会话列表
- `chat/error` - 聊天错误

### 系统参数主题
- `system/send` - 发送系统参数
- `system/receive` - 接收系统参数响应
- `system/status` - 系统参数状态

### 连接状态主题
- `connection/client` - 客户端连接状态
- `connection/ai-core` - AI-Core 服务状态
- `connection/system` - 整体系统状态

## 使用方法

### 1. 在组件中使用

```typescript
import { useChatStore } from '@/stores/chatStore'

const chatStore = useChatStore()

// 初始化 WebSocket 连接
await chatStore.initializeWebSocket()

// 发送消息（自动通过 WebSocket 发送）
await chatStore.sendMessage('Hello, AI!')
```

### 2. 监听消息

消息会自动通过 WebSocket 接收并添加到消息列表中，无需手动处理。

### 3. 连接状态监控

```typescript
import { wsConnection } from '@/services/websocket'

// 监听连接状态
watch(() => wsConnection.isConnected, (connected) => {
  console.log('WebSocket connected:', connected)
})
```

## 开发调试

### 1. 启用调试日志

在浏览器控制台中可以看到详细的 WebSocket 和 MQTT 消息日志：

```
🔗 WebSocket connected
📤 WebSocket message sent: {topic: "chat/send", payload: {...}}
📨 WebSocket message received: {topic: "chat/receive", payload: {...}}
💬 Received chat message via MQTT: {...}
```

### 2. 测试连接

1. 启动 MQTT broker：`cargo run --bin broker`
2. 启动前端开发服务器：`npm run dev`
3. 打开浏览器控制台查看连接状态
4. 在聊天界面发送消息测试

## 故障排除

### 1. WebSocket 连接失败
- 检查 MQTT broker 是否运行在正确端口
- 检查防火墙设置
- 查看浏览器控制台错误信息

### 2. 消息发送失败
- 检查 WebSocket 连接状态
- 检查 MQTT broker 日志
- 验证消息格式是否正确

### 3. 消息接收失败
- 检查 MQTT 主题订阅
- 检查消息处理器注册
- 查看网络连接状态

## 扩展功能

### 1. 添加新的消息类型

1. 在 `mqttRouter.ts` 中定义新的消息类型
2. 在 `websocket.ts` 中注册处理器
3. 在相应的 store 中处理消息

### 2. 自定义消息格式

修改 `mqttRouter.ts` 中的消息接口定义，确保前后端格式一致。

### 3. 添加消息持久化

可以在消息处理器中添加数据库存储逻辑。

## 注意事项

1. **消息顺序**：MQTT 不保证消息顺序，需要根据消息 ID 和时间戳处理
2. **连接稳定性**：网络不稳定时可能频繁重连，建议添加指数退避
3. **消息大小**：MQTT 有消息大小限制，大消息需要分片处理
4. **安全性**：生产环境建议使用 WSS (WebSocket Secure) 和 MQTT over TLS

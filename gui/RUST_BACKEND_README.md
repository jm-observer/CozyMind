# CozyMind GUI - Rust Backend

## 简介

CozyMind GUI 的后端已从 Node.js Express 迁移到 Rust actix-web，提供更高的性能和更好的资源利用率。

## 特性

### ✅ 已实现功能

1. **AI-Core 管理 API**
   - 获取所有 AI-Core 配置
   - 添加/更新/删除 AI-Core 配置
   - 检测单个和批量连接状态
   - 获取 AI-Core 基本信息

2. **Ollama 管理 API**
   - 获取所有 Ollama 配置
   - 添加/更新/删除 Ollama 配置
   - 检查 Ollama 服务状态
   - 测试 Ollama 连接
   - 批量检测 Ollama 状态

3. **消息预设 API**
   - 获取所有消息预设
   - 添加/更新/删除消息预设
   - 持久化存储到 JSON 文件

4. **MQTT 客户端模块**
   - MQTT 客户端连接管理
   - 订阅/取消订阅主题
   - 发布消息（支持 JSON）
   - 事件循环监听

5. **静态文件服务**
   - 提供前端页面服务
   - CORS 支持

## 项目结构

```
gui/
├── src/
│   ├── main.rs           # 主程序入口
│   ├── models.rs         # 数据模型定义
│   ├── handlers.rs       # API 处理器
│   └── mqtt_client.rs    # MQTT 客户端模块
├── public/               # 前端静态文件
│   ├── index.html
│   ├── app.js
│   └── style.css
├── ai-core-data.json    # AI-Core 配置数据
├── ollama-data.json     # Ollama 配置数据
├── msg-pre-data.json    # 消息预设数据
├── Cargo.toml           # Rust 项目配置
└── target/              # 编译输出目录
```

## 快速开始

### 1. 编译项目

```bash
cd gui
cargo build --release
```

### 2. 运行服务

```bash
# 开发模式（带日志）
cargo run

# 或直接运行编译好的可执行文件
./target/release/gui-server.exe  # Windows
./target/release/gui-server       # Linux/macOS
```

### 3. 访问服务

- **前端页面**: http://localhost:3000
- **API 端点**: http://localhost:3000/api/*

## API 端点

### AI-Core 相关

- `GET /api/ai-cores` - 获取所有 AI-Core 配置
- `POST /api/ai-cores` - 添加 AI-Core 配置
- `PUT /api/ai-cores/{id}` - 更新 AI-Core 配置
- `DELETE /api/ai-cores/{id}` - 删除 AI-Core 配置
- `POST /api/check-connection` - 检测单个连接
- `GET /api/check-all` - 批量检测所有连接
- `POST /api/ai-core-info` - 获取 AI-Core 信息

### Ollama 相关

- `GET /api/ollama-configs` - 获取所有 Ollama 配置
- `POST /api/ollama-configs` - 添加 Ollama 配置
- `PUT /api/ollama-configs/{id}` - 更新 Ollama 配置
- `DELETE /api/ollama-configs/{id}` - 删除 Ollama 配置
- `POST /api/ollama-status` - 检查 Ollama 状态
- `POST /api/ollama-test` - 测试 Ollama 连接
- `GET /api/ollama-check-all` - 批量检测所有 Ollama

### 消息预设相关

- `GET /api/messages` - 获取所有消息预设
- `POST /api/messages` - 添加消息预设
- `PUT /api/messages/{id}` - 更新消息预设
- `DELETE /api/messages/{id}` - 删除消息预设

## 技术栈

- **Web 框架**: actix-web 4.9
- **HTTP 客户端**: reqwest 0.12
- **序列化**: serde + serde_json
- **异步运行时**: tokio 1.0
- **MQTT 客户端**: rumqttc 0.20
- **CORS**: actix-cors 0.7
- **静态文件**: actix-files 0.6
- **日志**: env_logger 0.11

## 性能优势

相比 Node.js 版本，Rust 版本具有以下优势：

1. **更低的内存占用**: Rust 的零成本抽象和没有 GC
2. **更快的启动速度**: 编译后的二进制文件直接执行
3. **更高的并发性能**: Tokio 异步运行时
4. **类型安全**: 编译时类型检查避免运行时错误
5. **更好的资源管理**: 所有权系统保证内存安全

## 开发说明

### 添加新的 API 端点

1. 在 `models.rs` 中定义请求/响应结构
2. 在 `handlers.rs` 中实现处理器函数
3. 在 `main.rs` 中注册路由

### MQTT 客户端使用

```rust
use mqtt_client::MqttClientManager;
use rumqttc::QoS;

let mut mqtt_client = MqttClientManager::new("localhost".to_string(), 1883);
mqtt_client.connect().await?;
mqtt_client.subscribe("test/topic", QoS::AtMostOnce).await?;
mqtt_client.publish("test/topic", b"Hello MQTT", QoS::AtMostOnce, false).await?;
```

## 配置文件

### AI-Core 配置 (`ai-core-data.json`)

```json
[
  {
    "id": 1,
    "name": "AI-Core 主服务",
    "url": "http://127.0.0.1:9800",
    "description": "主要AI处理服务"
  }
]
```

### Ollama 配置 (`ollama-data.json`)

```json
[
  {
    "id": 1,
    "name": "Ollama 本地",
    "url": "http://localhost:11434",
    "model": "qwen2:0.5b",
    "description": "本地Ollama服务"
  }
]
```

### 消息预设 (`msg-pre-data.json`)

```json
[
  {
    "id": 1,
    "name": "问候语",
    "content": "你好！很高兴见到你。",
    "category": "greeting"
  }
]
```

## 故障排除

### 端口已被占用

```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程
taskkill /F /PID <PID>
```

### CORS 问题

Rust 后端已配置 CORS 允许所有来源，如需限制，请修改 `main.rs` 中的 CORS 配置：

```rust
let cors = Cors::default()
    .allowed_origin("http://localhost:10086")  // 限制特定来源
    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
    .allowed_headers(vec![http::header::CONTENT_TYPE]);
```

## 与 Node.js 版本的兼容性

Rust 后端完全兼容原有的 Node.js API，前端代码无需修改即可使用。数据文件格式保持一致，可以无缝切换。

## 未来计划

- [ ] 添加 WebSocket 支持
- [ ] 实现完整的 MQTT broker 集成
- [ ] 添加数据库支持（PostgreSQL/SQLite）
- [ ] 实现用户认证和授权
- [ ] 添加 API 速率限制
- [ ] 集成 OpenTelemetry 监控

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT


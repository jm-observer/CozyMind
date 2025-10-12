# Ollama 客户端使用指南

## 概述

这个 Rust 版本的 Ollama 客户端提供了与 PowerShell 版本相同的功能，支持会话上下文管理。

## 环境变量配置

在 `.env` 文件中添加：

```env
# Ollama 配置
OLLAMA_HOST=127.0.0.1
OLLAMA_PORT=11434
```

如果不设置，默认使用 `http://localhost:11434`

## API 端点

### 1. 查看状态

**GET** `/ollama/status`

查看 Ollama 客户端状态和会话信息。

```bash
curl http://localhost:9800/ollama/status
```

响应示例：
```json
{
  "status": "ready",
  "has_context": true,
  "context_size": 1024,
  "message": "会话活跃，上下文大小: 1024"
}
```

### 2. 向 Ollama 提问

**POST** `/ollama/ask`

发送问题给 Ollama 模型。

请求体：
```json
{
  "prompt": "你好，请介绍一下自己",
  "model": "gpt-oss:20b",
  "new_session": false
}
```

参数说明：
- `prompt`: 必填，提示词/问题
- `model`: 可选，模型名称，默认为 "gpt-oss:20b"
- `new_session`: 可选，是否开始新会话（清空上下文），默认为 false

```bash
# 开始新会话
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "你好，请介绍一下自己", "new_session": true}'

# 继续会话（保持上下文）
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "我刚才说了什么？"}'
```

响应示例：
```json
{
  "status": "success",
  "response": "你好！我是一个AI助手...",
  "model": "gpt-oss:20b",
  "new_session": false
}
```

### 3. 清空会话

**POST** `/ollama/clear`

清空当前会话上下文。

```bash
curl -X POST http://localhost:9800/ollama/clear
```

响应：
```json
{
  "status": "success",
  "message": "会话已清空"
}
```

## 代码示例

### 基本使用

```rust
use ollama_client::OllamaClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 创建客户端
    let client = OllamaClient::new("http://localhost:11434");

    // 开始新会话
    let response = client.ask(
        "你好，请介绍一下自己",
        "gpt-oss:20b",
        true  // new_session
    ).await?;
    println!("回答: {}", response);

    // 继续会话（保持上下文）
    let response = client.ask(
        "我刚才说了什么？",
        "gpt-oss:20b",
        false  // 不是新会话
    ).await?;
    println!("回答: {}", response);

    // 清空会话
    client.clear_context().await;

    Ok(())
}
```

### 从环境变量创建

```rust
use ollama_client::OllamaClient;

let client = OllamaClient::from_env();
let response = client.ask_default("你好", false).await?;
```

### 检查会话状态

```rust
// 检查是否有活跃会话
if client.has_context().await {
    println!("当前有活跃会话");
}

// 获取上下文大小
let size = client.context_size().await;
println!("上下文大小: {}", size);

// 获取完整上下文
if let Some(context) = client.get_context().await {
    println!("上下文: {:?}", context);
}
```

### 获取完整响应

```rust
use ollama_client::OllamaResponse;

let response: OllamaResponse = client.ask_full(
    "测试问题",
    "gpt-oss:20b",
    false
).await?;

println!("回答: {}", response.response);
println!("模型: {:?}", response.model);
println!("完成: {}", response.done);
println!("创建时间: {:?}", response.created_at);
```

## PowerShell vs Rust 对照

### PowerShell

```powershell
# 新会话
Ask-Ollama -Prompt "你好" -Model "gpt-oss:20b" -NewSession

# 继续会话
Ask-Ollama -Prompt "我刚才说了什么？" -Model "gpt-oss:20b"

# 使用默认模型
Ask-Ollama -Prompt "测试"
```

### Rust (API)

```bash
# 新会话
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "你好", "model": "gpt-oss:20b", "new_session": true}'

# 继续会话
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "我刚才说了什么？", "model": "gpt-oss:20b"}'

# 使用默认模型
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "测试"}'
```

### Rust (代码)

```rust
// 新会话
client.ask("你好", "gpt-oss:20b", true).await?;

// 继续会话
client.ask("我刚才说了什么？", "gpt-oss:20b", false).await?;

// 使用默认模型
client.ask_default("测试", false).await?;
```

## 特性对比

| 特性 | PowerShell | Rust |
|------|-----------|------|
| 会话上下文管理 | ✅ 全局变量 | ✅ 线程安全结构体 |
| 新建会话 | ✅ -NewSession | ✅ new_session 参数 |
| 自定义模型 | ✅ -Model | ✅ model 参数 |
| 默认模型 | ✅ gpt-oss:20b | ✅ gpt-oss:20b |
| 环境变量配置 | ❌ | ✅ OLLAMA_HOST/PORT |
| HTTP API | ❌ | ✅ REST API |
| 并发安全 | ❌ | ✅ Arc + RwLock |
| 日志记录 | ❌ | ✅ log crate |

## 测试

```bash
# 启动服务
cd ai-core
cargo run

# 测试查看状态
curl http://localhost:9800/ollama/status

# 测试提问
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "1+1等于几？", "new_session": true}'

# 测试上下文
curl -X POST http://localhost:9800/ollama/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "我刚才问了什么？"}'

# 清空会话
curl -X POST http://localhost:9800/ollama/clear
```

## 注意事项

1. **线程安全**: Rust 版本使用 `Arc<RwLock<>>` 确保并发安全
2. **错误处理**: 所有 API 都有完整的错误处理
3. **日志**: 使用 `log` crate 记录所有操作
4. **环境变量**: 支持通过环境变量配置 Ollama 地址
5. **默认值**: 如果不指定模型，默认使用 "gpt-oss:20b"

## 未来改进

- [ ] 支持流式响应 (stream: true)
- [ ] 支持更多 Ollama API 参数
- [ ] 支持多个并发会话
- [ ] 添加会话历史记录
- [ ] 支持会话持久化


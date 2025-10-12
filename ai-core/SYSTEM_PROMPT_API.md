# 系统参数设定 API 文档

## 接口说明

设定模型系统参数，用于配置 AI 模型的系统提示词。

## 端点

**POST** `/api/system-prompt`

## 请求参数

### 请求体 (JSON)

```json
{
  "session_id": "可选-会话ID",
  "system_prompt": "你是一个helpful的AI助手"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | 否 | 会话ID，如果不提供会自动生成一个新的UUID |
| `system_prompt` | string | 是 | 系统参数/系统提示词 |

## 响应

### 成功响应

```json
{
  "status": "success",
  "message": "系统参数已设定，Ollama 响应: ...",
  "session_id": "会话ID"
}
```

### 错误响应

```json
{
  "error": "错误信息"
}
```

## 使用示例

### 示例 1：不提供会话ID（自动生成）

```bash
curl -X POST http://localhost:9800/api/system-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "system_prompt": "你是一个专业的中文助手，擅长回答各种问题"
  }'
```

响应：
```json
{
  "status": "success",
  "message": "系统参数已设定，Ollama 响应: 确认",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 示例 2：提供会话ID（继续使用已有会话）

```bash
curl -X POST http://localhost:9800/api/system-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "my-session-123",
    "system_prompt": "你是一个编程专家，精通Rust语言"
  }'
```

响应：
```json
{
  "status": "success",
  "message": "系统参数已设定，Ollama 响应: 确认",
  "session_id": "my-session-123"
}
```

## 工作流程

1. 接收请求，获取 `session_id`（可选）和 `system_prompt`（必须）
2. 如果没有提供 `session_id`，自动生成一个新的 UUID
3. 从会话存储中获取已有的上下文（如果存在）
4. 构造 Ollama 请求，包含：
   - `model`: 从环境变量 `OLLAMA_MODEL` 读取（默认: "gpt-oss:20b"）
   - `prompt`: "确认"
   - `system`: 传入的系统参数
   - `context`: 已有的会话上下文（如果存在）
5. 发送 HTTP 请求到 Ollama API
6. 保存返回的会话上下文
7. 返回响应给客户端

## 环境变量配置

在 `.env` 文件中添加：

```env
# Ollama 配置
OLLAMA_HOST=127.0.0.1
OLLAMA_PORT=11434
OLLAMA_MODEL=gpt-oss:20b
```

## 会话管理

- 每个 `session_id` 对应一个独立的会话上下文
- 会话上下文存储在内存中（`HashMap`）
- 使用相同的 `session_id` 可以继续之前的对话
- 不同的 `session_id` 之间相互独立

## 注意事项

1. 会话上下文存储在内存中，服务重启后会丢失
2. `session_id` 建议使用有意义的标识符，便于管理多个会话
3. 系统参数设定后会立即发送到 Ollama 进行确认
4. 返回的会话上下文会自动保存，用于后续对话


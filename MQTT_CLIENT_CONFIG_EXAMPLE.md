# MQTT 客户端配置示例

## 概述

本文档演示如何通过环境变量配置 AI-Core 的 MQTT 客户端。

## 配置项

AI-Core 的 MQTT 客户端支持以下环境变量：

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `MQTT_CLIENT_ID` | 客户端唯一标识 | `ai-core-{随机8位UUID}` |
| `MQTT_BROKER_HOST` | Broker 服务器地址 | `localhost` |
| `MQTT_BROKER_PORT` | Broker 服务器端口 | `8883` |
| `MQTT_KEEP_ALIVE` | 心跳保持时间（秒） | `60` |
| `MQTT_USERNAME` | 认证用户名（可选） | 无 |
| `MQTT_PASSWORD` | 认证密码（可选） | 无 |

## 配置方式

### 方式 1: 使用 .env 文件（推荐）

在项目根目录创建或编辑 `.env` 文件：

```env
# MQTT 客户端配置
MQTT_CLIENT_ID=ai-core-client
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=8883
MQTT_KEEP_ALIVE=60

# 如果 Broker 需要认证
# MQTT_USERNAME=admin
# MQTT_PASSWORD=secret123
```

### 方式 2: 直接设置环境变量

#### Windows (PowerShell)
```powershell
$env:MQTT_CLIENT_ID="ai-core-client"
$env:MQTT_BROKER_HOST="localhost"
$env:MQTT_BROKER_PORT="8883"
$env:MQTT_KEEP_ALIVE="60"

# 启动服务
cd ai-core
cargo run --release
```

#### Linux/Mac (Bash)
```bash
export MQTT_CLIENT_ID="ai-core-client"
export MQTT_BROKER_HOST="localhost"
export MQTT_BROKER_PORT="8883"
export MQTT_KEEP_ALIVE="60"

# 启动服务
cd ai-core
cargo run --release
```

## 使用场景

### 场景 1: 默认配置（本地开发）

不设置任何环境变量，使用默认值：

```bash
cd ai-core
cargo run
```

客户端将使用：
- Client ID: `ai-core-{随机UUID}`（如 `ai-core-a1b2c3d4`）
- Broker: `localhost:8883`
- Keep Alive: `60` 秒

### 场景 2: 固定 Client ID

在 `.env` 文件中设置：

```env
MQTT_CLIENT_ID=ai-core-dev-001
```

这样每次启动都使用相同的 Client ID，便于调试和日志追踪。

### 场景 3: 连接远程 Broker

```env
MQTT_CLIENT_ID=ai-core-prod
MQTT_BROKER_HOST=mqtt.example.com
MQTT_BROKER_PORT=1883
MQTT_USERNAME=ai_user
MQTT_PASSWORD=secure_pass_123
MQTT_KEEP_ALIVE=120
```

### 场景 4: Docker 容器环境

在 `docker-compose.yml` 中配置：

```yaml
version: '3.8'
services:
  ai-core:
    image: cozymind/ai-core:latest
    environment:
      - MQTT_CLIENT_ID=ai-core-docker
      - MQTT_BROKER_HOST=mqtt-broker
      - MQTT_BROKER_PORT=8883
      - MQTT_KEEP_ALIVE=60
    depends_on:
      - mqtt-broker

  mqtt-broker:
    image: cozymind/broker:latest
    ports:
      - "8883:8883"
```

### 场景 5: 多实例部署

部署多个 AI-Core 实例时，每个实例需要不同的 Client ID：

**实例 1:**
```env
MQTT_CLIENT_ID=ai-core-instance-1
MQTT_BROKER_HOST=mqtt.cluster.local
```

**实例 2:**
```env
MQTT_CLIENT_ID=ai-core-instance-2
MQTT_BROKER_HOST=mqtt.cluster.local
```

## 配置验证

### 检查配置是否生效

启动 AI-Core 后，可以通过以下方式验证配置：

#### 1. 查看日志

启动时会输出连接信息：

```
🔗 AI-Core connecting to MQTT Broker: localhost:8883
✅ AI-Core connected to MQTT Broker successfully
```

#### 2. 调用状态 API

```bash
curl http://localhost:9800/mqtt/status
```

响应示例：
```json
{
  "status": "connected",
  "client_info": {
    "client_id": "ai-core-client",
    "broker_url": "localhost:8883",
    "is_connected": true
  }
}
```

## 连接 MQTT Broker 示例

### 通过 API 手动连接

如果需要动态配置，可以通过 API 连接：

```bash
curl -X POST http://localhost:9800/mqtt/connect \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "ai-core-dynamic",
    "broker_host": "localhost",
    "broker_port": 8883,
    "username": null,
    "password": null,
    "keep_alive": 60,
    "clean_session": true
  }'
```

响应：
```json
{
  "status": "success",
  "message": "MQTT client connected successfully"
}
```

### 订阅主题

```bash
curl -X POST http://localhost:9800/mqtt/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "cozymind/events/#",
    "qos": 1
  }'
```

### 发布消息

```bash
curl -X POST http://localhost:9800/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "cozymind/commands",
    "payload": [72, 101, 108, 108, 111],
    "qos": 1,
    "retain": false
  }'
```

## 常见问题

### Q1: Client ID 冲突

**问题**: 两个客户端使用相同的 Client ID 连接到同一个 Broker。

**现象**: 后连接的客户端会踢掉先连接的客户端。

**解决**: 确保每个实例使用唯一的 `MQTT_CLIENT_ID`。

### Q2: 连接超时

**问题**: 无法连接到 Broker。

**检查**:
1. Broker 是否正在运行
2. 端口是否正确
3. 网络是否可达
4. 防火墙是否开放端口

```bash
# Windows: 检查端口是否监听
netstat -ano | findstr :8883

# Linux/Mac: 检查端口
lsof -i :8883
```

### Q3: 认证失败

**问题**: 设置了用户名和密码，但仍然无法连接。

**检查**:
1. 用户名和密码是否正确
2. Broker 是否启用了认证
3. 环境变量是否正确加载

```bash
# 打印环境变量检查
echo $MQTT_USERNAME
echo $MQTT_PASSWORD
```

### Q4: 环境变量未生效

**问题**: 修改了 `.env` 文件，但配置没有变化。

**解决**:
1. 确保 `.env` 文件在项目根目录（与 Cargo.toml 同级）
2. 重启服务
3. 检查环境变量格式是否正确（无多余空格）

```env
# 正确
MQTT_CLIENT_ID=ai-core-client

# 错误（有空格）
MQTT_CLIENT_ID = ai-core-client
```

## 最佳实践

### 1. 使用有意义的 Client ID

推荐格式：`{service}-{environment}-{instance}`

```env
# 开发环境
MQTT_CLIENT_ID=ai-core-dev-001

# 生产环境
MQTT_CLIENT_ID=ai-core-prod-001

# 测试环境
MQTT_CLIENT_ID=ai-core-test-001
```

### 2. 保护敏感信息

不要将包含密码的 `.env` 文件提交到版本控制：

```bash
# .gitignore 已包含
.env
.env.local
.env.*.local
```

### 3. 使用合适的 Keep Alive 时间

- **本地开发**: 30-60 秒
- **生产环境**: 60-120 秒
- **不稳定网络**: 120-300 秒

### 4. 启用 Clean Session

默认配置已启用 Clean Session，这样可以：
- 避免接收离线消息堆积
- 减少 Broker 资源占用
- 简化状态管理

## 相关文档

- [ENV_CONFIG.md](ENV_CONFIG.md) - 完整的环境变量配置说明
- [ai-core/MQTT_CLIENT_USAGE.md](ai-core/MQTT_CLIENT_USAGE.md) - MQTT 客户端使用说明
- [broker/README.md](broker/README.md) - MQTT Broker 配置说明


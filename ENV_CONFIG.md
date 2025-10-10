# 环境变量配置说明

## 概述

CozyMind 项目支持通过环境变量来配置各个服务的监听端口，这样可以方便地在不同环境中部署和管理服务。

## 配置文件

项目根目录下有一个 `env.config` 文件，这是环境变量配置的模板文件。

### 使用步骤

1. **复制配置文件**
   ```bash
   # 在项目根目录下执行
   cp env.config .env
   ```

2. **修改配置**
   根据实际需求修改 `.env` 文件中的配置项

3. **启动服务**
   启动服务时会自动加载 `.env` 文件中的配置

## 配置项说明

### AI-Core 服务配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `AI_CORE_HOST` | AI-Core 服务监听地址 | `127.0.0.1` |
| `AI_CORE_PORT` | AI-Core 服务监听端口 | `9800` |

**示例：**
```env
AI_CORE_HOST=127.0.0.1
AI_CORE_PORT=9800
```

### MQTT Broker 配置

#### MQTT v4 协议
| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `BROKER_MQTT_V4_HOST` | MQTT v4 监听地址 | `0.0.0.0` |
| `BROKER_MQTT_V4_PORT` | MQTT v4 监听端口 | `8883` |

#### MQTT v5 协议
| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `BROKER_MQTT_V5_HOST` | MQTT v5 监听地址 | `0.0.0.0` |
| `BROKER_MQTT_V5_PORT` | MQTT v5 监听端口 | `8884` |

#### Prometheus 监控
| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `BROKER_PROMETHEUS_HOST` | Prometheus 监听地址 | `127.0.0.1` |
| `BROKER_PROMETHEUS_PORT` | Prometheus 监听端口 | `9042` |

#### Console 控制台
| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `BROKER_CONSOLE_HOST` | Console 监听地址 | `0.0.0.0` |
| `BROKER_CONSOLE_PORT` | Console 监听端口 | `33030` |

### MQTT 客户端连接配置

这些配置供 AI-Core 的 MQTT 客户端使用，用于连接到 Broker。

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `MQTT_CLIENT_ID` | MQTT 客户端 ID | `ai-core-{random}` (随机生成) |
| `MQTT_BROKER_HOST` | MQTT Broker 主机地址 | `localhost` |
| `MQTT_BROKER_PORT` | MQTT Broker 端口 | `8883` |
| `MQTT_KEEP_ALIVE` | MQTT 保持连接时间（秒） | `60` |
| `MQTT_USERNAME` | MQTT 用户名（可选） | 无 |
| `MQTT_PASSWORD` | MQTT 密码（可选） | 无 |

**示例：**
```env
MQTT_CLIENT_ID=ai-core-client
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=8883
MQTT_KEEP_ALIVE=60
# 如果 Broker 需要认证，取消注释以下配置
# MQTT_USERNAME=your_username
# MQTT_PASSWORD=your_password
```

## 启动服务

### 启动 AI-Core

```bash
cd ai-core
cargo run --release
```

服务会从环境变量读取配置并启动：
```
🚀 Starting CozyMind AI-Core server...
📡 Server listening on http://127.0.0.1:9800
```

### 启动 Broker

```bash
cd broker
cargo run --release
```

Broker 会显示当前配置：
```
📡 MQTT Broker Configuration:
  MQTT v4: 0.0.0.0:8883
  MQTT v5: 0.0.0.0:8884
  Prometheus: 127.0.0.1:9042
  Console: 0.0.0.0:33030
```

## 常见配置场景

### 开发环境

使用默认配置即可，所有服务在本地运行。

```env
AI_CORE_HOST=127.0.0.1
AI_CORE_PORT=9800

BROKER_MQTT_V4_HOST=0.0.0.0
BROKER_MQTT_V4_PORT=8883

MQTT_CLIENT_ID=ai-core-dev
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=8883
```

### 生产环境

可能需要修改端口以避免冲突，或者绑定到特定的网络接口。

```env
AI_CORE_HOST=0.0.0.0
AI_CORE_PORT=8080

BROKER_MQTT_V4_HOST=0.0.0.0
BROKER_MQTT_V4_PORT=1883

MQTT_CLIENT_ID=ai-core-prod-001
MQTT_BROKER_HOST=mqtt-broker.example.com
MQTT_BROKER_PORT=1883
MQTT_USERNAME=ai_core_user
MQTT_PASSWORD=secure_password_here
```

### Docker 容器环境

在容器中运行时，通常绑定到 `0.0.0.0` 以允许外部访问。

```env
AI_CORE_HOST=0.0.0.0
AI_CORE_PORT=9800

BROKER_MQTT_V4_HOST=0.0.0.0
BROKER_MQTT_V4_PORT=8883

MQTT_CLIENT_ID=ai-core-docker
MQTT_BROKER_HOST=broker
MQTT_BROKER_PORT=8883
```

## 注意事项

1. **文件安全**：`.env` 文件包含敏感配置，不应提交到版本控制系统。项目已在 `.gitignore` 中排除此文件。

2. **端口冲突**：确保配置的端口没有被其他程序占用。

3. **防火墙**：如果绑定到 `0.0.0.0`，确保防火墙规则允许相应端口的访问。

4. **默认值**：如果未设置环境变量或 `.env` 文件不存在，服务会使用代码中定义的默认值。

5. **配置优先级**：
   - 环境变量 > .env 文件 > 代码默认值

## 故障排查

### 服务启动失败

1. 检查端口是否被占用：
   ```bash
   # Windows
   netstat -ano | findstr :9800
   
   # Linux/Mac
   lsof -i :9800
   ```

2. 检查 `.env` 文件格式是否正确（无多余空格、正确的键值对格式）

3. 查看服务日志输出，确认读取的配置值

### 无法连接到服务

1. 确认服务已正确启动
2. 检查防火墙设置
3. 如果在容器中运行，检查端口映射配置

## 更多信息

- AI-Core 文档：`ai-core/README.md`
- Broker 文档：`broker/README.md`
- 项目架构：`docs/architecture.md`


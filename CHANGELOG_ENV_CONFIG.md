# 环境变量配置更新日志

## 更新时间
2024年

## 更新内容

### 新增文件

1. **env.config** - 环境变量配置模板文件
   - 包含所有服务的端口配置
   - 用户需复制为 `.env` 文件使用

2. **ENV_CONFIG.md** - 环境变量配置详细文档
   - 完整的配置项说明
   - 使用示例和常见场景
   - 故障排查指南

3. **CHANGELOG_ENV_CONFIG.md** - 本更新日志

### 修改文件

#### 1. ai-core/Cargo.toml
- 新增依赖：`dotenvy = "0.15"`
- 用于加载 `.env` 文件

#### 2. ai-core/src/main.rs
- 添加 `dotenvy::dotenv()` 调用，加载环境变量
- 从环境变量读取服务配置：
  - `AI_CORE_HOST`（默认：127.0.0.1）
  - `AI_CORE_PORT`（默认：9800）
- 保持向后兼容，未设置环境变量时使用默认值

#### 3. broker/Cargo.toml
- 新增依赖：`dotenvy = "0.15"`

#### 4. broker/src/main.rs
- 添加 `dotenvy::dotenv()` 调用
- 导入 `std::collections::HashMap`
- 从环境变量读取 Broker 配置：
  - `BROKER_MQTT_V4_HOST` + `BROKER_MQTT_V4_PORT`
  - `BROKER_MQTT_V5_HOST` + `BROKER_MQTT_V5_PORT`
  - `BROKER_PROMETHEUS_HOST` + `BROKER_PROMETHEUS_PORT`
  - `BROKER_CONSOLE_HOST` + `BROKER_CONSOLE_PORT`
- 使用配置覆盖机制，环境变量优先于 `rumqttd.toml`
- 添加启动时的配置信息打印

#### 5. ai-core/src/mqtt.rs
- 修改 `ClientConfig::default()` 实现
- 从环境变量读取 MQTT 客户端配置：
  - `MQTT_CLIENT_ID`（默认：ai-core-{随机UUID}）
  - `MQTT_BROKER_HOST`（默认：localhost）
  - `MQTT_BROKER_PORT`（默认：8883）
  - `MQTT_KEEP_ALIVE`（默认：60）
  - `MQTT_USERNAME`（可选）
  - `MQTT_PASSWORD`（可选）
- 保持向后兼容性

#### 6. README.md
- 新增"环境配置"章节
- 添加环境变量配置文档链接
- 更新启动服务说明

## 功能特性

### 1. 灵活的端口配置
- 所有服务端口均可通过环境变量配置
- 支持不同环境（开发、测试、生产）使用不同配置

### 2. 向后兼容
- 未配置环境变量时，使用默认值
- 不影响现有部署

### 3. 配置优先级
```
环境变量 > .env 文件 > 配置文件默认值 > 代码默认值
```

### 4. 安全性
- `.env` 文件已在 `.gitignore` 中排除
- 敏感配置不会被提交到版本控制

## 环境变量列表

| 变量名 | 说明 | 默认值 | 服务 |
|--------|------|--------|------|
| `AI_CORE_HOST` | AI-Core 监听地址 | `127.0.0.1` | ai-core |
| `AI_CORE_PORT` | AI-Core 监听端口 | `9800` | ai-core |
| `BROKER_MQTT_V4_HOST` | MQTT v4 监听地址 | `0.0.0.0` | broker |
| `BROKER_MQTT_V4_PORT` | MQTT v4 监听端口 | `8883` | broker |
| `BROKER_MQTT_V5_HOST` | MQTT v5 监听地址 | `0.0.0.0` | broker |
| `BROKER_MQTT_V5_PORT` | MQTT v5 监听端口 | `8884` | broker |
| `BROKER_PROMETHEUS_HOST` | Prometheus 监听地址 | `127.0.0.1` | broker |
| `BROKER_PROMETHEUS_PORT` | Prometheus 监听端口 | `9042` | broker |
| `BROKER_CONSOLE_HOST` | Console 监听地址 | `0.0.0.0` | broker |
| `BROKER_CONSOLE_PORT` | Console 监听端口 | `33030` | broker |
| `MQTT_CLIENT_ID` | MQTT 客户端 ID | `ai-core-{random}` | ai-core |
| `MQTT_BROKER_HOST` | MQTT 客户端连接地址 | `localhost` | ai-core |
| `MQTT_BROKER_PORT` | MQTT 客户端连接端口 | `8883` | ai-core |
| `MQTT_KEEP_ALIVE` | MQTT 保持连接时间（秒） | `60` | ai-core |
| `MQTT_USERNAME` | MQTT 用户名（可选） | 无 | ai-core |
| `MQTT_PASSWORD` | MQTT 密码（可选） | 无 | ai-core |

## 使用方法

### 快速开始

```bash
# 1. 复制配置文件
cp env.config .env

# 2. 编辑 .env 文件（可选）
# vim .env

# 3. 启动服务
cd broker && cargo run --release  # 终端1
cd ai-core && cargo run --release # 终端2
```

### 自定义端口示例

```bash
# .env 文件内容
AI_CORE_PORT=8080
BROKER_MQTT_V4_PORT=1883
BROKER_MQTT_V5_PORT=1884

# 自定义 MQTT 客户端配置
MQTT_CLIENT_ID=my-ai-core
MQTT_BROKER_HOST=192.168.1.100
MQTT_BROKER_PORT=1883
MQTT_USERNAME=admin
MQTT_PASSWORD=secret123
```

## 测试验证

### 编译检查
```bash
# AI-Core
cd ai-core && cargo check
# ✅ 编译成功

# Broker
cd broker && cargo check
# ✅ 编译成功
```

### 运行验证
启动服务后，应看到类似输出：

**AI-Core:**
```
🚀 Starting CozyMind AI-Core server...
📡 Server listening on http://127.0.0.1:9800
```

**Broker:**
```
📡 MQTT Broker Configuration:
  MQTT v4: 0.0.0.0:8883
  MQTT v5: 0.0.0.0:8884
  Prometheus: 127.0.0.1:9042
  Console: 0.0.0.0:33030
```

## 注意事项

1. **首次使用**：需要手动复制 `env.config` 为 `.env`
2. **端口冲突**：确保配置的端口未被占用
3. **容器部署**：在容器中通常使用 `0.0.0.0` 作为监听地址
4. **安全性**：不要将 `.env` 文件提交到 Git

## 相关文档

- [ENV_CONFIG.md](ENV_CONFIG.md) - 详细配置说明
- [README.md](README.md) - 项目主文档
- [docs/architecture.md](docs/architecture.md) - 架构文档

## 未来改进

- [ ] 支持更多配置项（如日志级别、连接超时等）
- [ ] 添加配置验证和错误提示
- [ ] 支持多环境配置文件（.env.dev, .env.prod）
- [ ] 提供配置管理 CLI 工具


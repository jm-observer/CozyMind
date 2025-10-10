# MQTT 客户端配置更新总结

## 更新日期
2024年

## 更新内容

本次更新将 AI-Core 的 MQTT 客户端配置（包括 Client ID）添加到环境变量管理中。

## 新增配置项

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `MQTT_CLIENT_ID` | MQTT 客户端唯一标识 | `ai-core-{随机UUID}` |
| `MQTT_BROKER_HOST` | MQTT Broker 地址 | `localhost` |
| `MQTT_BROKER_PORT` | MQTT Broker 端口 | `8883` |
| `MQTT_KEEP_ALIVE` | 心跳保持时间（秒） | `60` |
| `MQTT_USERNAME` | 认证用户名（可选） | 无 |
| `MQTT_PASSWORD` | 认证密码（可选） | 无 |

## 修改的文件

### 1. ai-core/src/mqtt.rs
修改 `ClientConfig::default()` 实现，从环境变量读取配置：

```rust
impl Default for ClientConfig {
    fn default() -> Self {
        // 从环境变量读取配置，未设置则使用默认值
        let client_id = std::env::var("MQTT_CLIENT_ID")
            .unwrap_or_else(|_| format!("ai-core-{}", uuid::Uuid::new_v4().to_string()[..8].to_string()));
        
        let broker_host = std::env::var("MQTT_BROKER_HOST")
            .unwrap_or_else(|_| "localhost".to_string());
        
        let broker_port: u16 = std::env::var("MQTT_BROKER_PORT")
            .unwrap_or_else(|_| "8883".to_string())
            .parse()
            .unwrap_or(8883);
        
        let keep_alive: u16 = std::env::var("MQTT_KEEP_ALIVE")
            .unwrap_or_else(|_| "60".to_string())
            .parse()
            .unwrap_or(60);
        
        Self {
            client_id,
            broker_host,
            broker_port,
            username: std::env::var("MQTT_USERNAME").ok(),
            password: std::env::var("MQTT_PASSWORD").ok(),
            keep_alive,
            clean_session: true,
        }
    }
}
```

### 2. env.config
添加 MQTT 客户端配置项：

```env
# MQTT 客户端连接配置（供 AI-Core MQTT 客户端使用）
MQTT_CLIENT_ID=ai-core-client
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=8883
MQTT_KEEP_ALIVE=60
# MQTT_USERNAME=your_username
# MQTT_PASSWORD=your_password
```

### 3. ENV_CONFIG.md
- 添加 MQTT 客户端配置章节
- 更新配置示例
- 添加各种场景的配置说明

### 4. CHANGELOG_ENV_CONFIG.md
- 更新环境变量列表
- 添加新配置的说明

### 5. 新增文件
- **MQTT_CLIENT_CONFIG_EXAMPLE.md**: MQTT 客户端配置详细示例和最佳实践

### 6. README.md
- 添加 MQTT 客户端配置文档链接

## 使用方法

### 1. 编辑 .env 文件

```env
# 设置固定的 Client ID（推荐）
MQTT_CLIENT_ID=ai-core-dev-001

# 配置 Broker 地址
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=8883

# 配置保持连接时间
MQTT_KEEP_ALIVE=60

# 如果需要认证
# MQTT_USERNAME=admin
# MQTT_PASSWORD=secret123
```

### 2. 启动服务

```bash
cd ai-core
cargo run --release
```

### 3. 验证配置

```bash
# 查看 MQTT 客户端状态
curl http://localhost:9800/mqtt/status
```

响应示例：
```json
{
  "status": "connected",
  "client_info": {
    "client_id": "ai-core-dev-001",
    "broker_url": "localhost:8883",
    "is_connected": true
  }
}
```

## 优势

### 1. 灵活性
- 可以在不修改代码的情况下更改 Client ID
- 支持不同环境使用不同配置

### 2. 多实例支持
每个实例可以使用独立的 Client ID：
```env
# 实例 1
MQTT_CLIENT_ID=ai-core-instance-1

# 实例 2
MQTT_CLIENT_ID=ai-core-instance-2
```

### 3. 安全性
- 用户名和密码可以通过环境变量传递
- 敏感信息不需要硬编码

### 4. 向后兼容
- 未设置环境变量时使用默认值
- 不影响现有部署

### 5. 便于调试
- 固定的 Client ID 便于日志追踪
- 可以快速识别不同环境的客户端

## 典型应用场景

### 场景 1: 开发环境
```env
MQTT_CLIENT_ID=ai-core-dev
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=8883
```

### 场景 2: 生产环境
```env
MQTT_CLIENT_ID=ai-core-prod-001
MQTT_BROKER_HOST=mqtt.example.com
MQTT_BROKER_PORT=1883
MQTT_USERNAME=ai_core
MQTT_PASSWORD=secure_password
MQTT_KEEP_ALIVE=120
```

### 场景 3: Docker 部署
```yaml
services:
  ai-core:
    environment:
      - MQTT_CLIENT_ID=ai-core-docker
      - MQTT_BROKER_HOST=mqtt-broker
      - MQTT_BROKER_PORT=8883
```

### 场景 4: 集群部署
```env
# Node 1
MQTT_CLIENT_ID=ai-core-cluster-node-1

# Node 2
MQTT_CLIENT_ID=ai-core-cluster-node-2

# Node 3
MQTT_CLIENT_ID=ai-core-cluster-node-3
```

## 测试验证

### 编译测试
```bash
cd ai-core
cargo check
```

结果：✅ 编译成功

### 运行测试
```bash
# 1. 启动 Broker
cd broker
cargo run --release

# 2. 启动 AI-Core
cd ai-core
cargo run --release

# 3. 检查状态
curl http://localhost:9800/mqtt/status
```

## 注意事项

1. **Client ID 唯一性**: 确保每个客户端使用唯一的 ID
2. **环境变量格式**: 变量名和值之间不要有空格
3. **敏感信息保护**: 不要将包含密码的 `.env` 文件提交到 Git
4. **重启生效**: 修改环境变量后需要重启服务

## 相关文档

- [ENV_CONFIG.md](ENV_CONFIG.md) - 完整的环境变量配置说明
- [MQTT_CLIENT_CONFIG_EXAMPLE.md](MQTT_CLIENT_CONFIG_EXAMPLE.md) - MQTT 客户端配置详解
- [CHANGELOG_ENV_CONFIG.md](CHANGELOG_ENV_CONFIG.md) - 完整的变更日志

## 后续改进建议

- [ ] 添加配置验证功能
- [ ] 支持从配置文件读取（除了环境变量）
- [ ] 添加配置热更新功能
- [ ] 提供配置管理 CLI 工具
- [ ] 添加配置示例生成器


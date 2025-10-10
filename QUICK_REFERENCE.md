# CozyMind 快速参考

## 🚀 启动服务

### 方式 1: 使用 Workspace（推荐）

```bash
# 在项目根目录执行

# 终端 1 - MQTT Broker
cargo run -p broker --release

# 终端 2 - AI-Core
cargo run -p ai-core --release

# 终端 3 - GUI Server
cargo run -p gui-server --release
```

### 方式 2: 进入子目录

```bash
# 终端 1
cd broker && cargo run --release

# 终端 2
cd ai-core && cargo run --release

# 终端 3
cd gui && cargo run --release
```

## 📦 Cargo Workspace 命令

### 构建

```bash
# 构建所有项目
cargo build --workspace

# 构建特定项目
cargo build -p ai-core
cargo build -p broker
cargo build -p gui-server

# 发布构建
cargo build --workspace --release
```

### 运行

```bash
# 运行特定项目
cargo run -p ai-core
cargo run -p broker --release
cargo run -p gui-server
```

### 测试

```bash
# 测试所有项目
cargo test --workspace

# 测试特定项目
cargo test -p rust-models
```

### 检查

```bash
# 检查所有项目
cargo check --workspace

# 检查特定项目
cargo check -p ai-core
```

### 清理

```bash
# 清理所有构建产物
cargo clean

# 只清理发布构建
cargo clean --release
```

## ⚙️ 环境变量配置

### 快速设置

```bash
# 1. 复制配置文件（如果还没有 .env）
cp config.env .env

# 2. 编辑配置（可选）
# vim .env 或使用你喜欢的编辑器

# 3. 启动服务
cargo run -p broker --release
cargo run -p ai-core --release
```

### 主要配置项

```env
# AI-Core
AI_CORE_HOST=127.0.0.1
AI_CORE_PORT=9800

# Broker
BROKER_MQTT_V4_PORT=8883
BROKER_MQTT_V5_PORT=8884

# MQTT Client
AI_CORE_MQTT_CLIENT_ID=ai-core-client
MQTT_KEEP_ALIVE=60
```

## 🔌 MQTT 端口

| 服务 | 端口 | 说明 |
|------|------|------|
| MQTT v4 | 8883 | MQTT 协议 v4 |
| MQTT v5 | 8884 | MQTT 协议 v5 |
| AI-Core | 9800 | HTTP API 服务 |
| GUI Server | 10086 | Web 界面服务 |
| Prometheus | 9042 | 监控指标 |
| Console | 33030 | 管理控制台 |

## 🧪 测试 API

### 健康检查

```bash
# AI-Core
curl http://localhost:9800/health

# MQTT 状态
curl http://localhost:9800/mqtt/status
```

### MQTT 操作

```bash
# 连接 MQTT
curl -X POST http://localhost:9800/mqtt/connect \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client",
    "broker_host": "localhost",
    "broker_port": 8883,
    "keep_alive": 60,
    "clean_session": true
  }'

# 订阅主题
curl -X POST http://localhost:9800/mqtt/subscribe \
  -H "Content-Type: application/json" \
  -d '{"topic": "test/topic", "qos": 1}'

# 发布消息
curl -X POST http://localhost:9800/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "test/topic",
    "payload": [72, 101, 108, 108, 111],
    "qos": 1,
    "retain": false
  }'
```

## 📁 项目结构

```
CozyMind/
├── Cargo.toml              # Workspace 配置
├── Cargo.lock              # 依赖锁定文件
├── config.env              # 环境变量模板
├── ai-core/                # AI 辅助中枢
│   ├── Cargo.toml
│   └── src/
├── broker/                 # MQTT Broker
│   ├── Cargo.toml
│   ├── rumqttd.toml
│   └── src/
├── rust-models/            # 共享模型库
│   ├── Cargo.toml
│   └── src/
└── gui/                    # Web 界面
    ├── Cargo.toml
    ├── package.json
    ├── public/
    └── src/
```

## 🛠️ 开发工具

### 格式化代码

```bash
cargo fmt --all
```

### 代码检查

```bash
# 运行 Clippy
cargo clippy --workspace

# 自动修复
cargo clippy --workspace --fix
```

### 更新依赖

```bash
# 更新所有依赖
cargo update

# 查看过时的依赖
cargo outdated
```

### 查看依赖树

```bash
cargo tree -p ai-core
```

## 🐛 故障排查

### 端口被占用

```powershell
# Windows - 查看端口占用
netstat -ano | findstr :9800

# 杀掉进程
taskkill /PID <PID> /F
```

```bash
# Linux/Mac - 查看端口占用
lsof -i :9800

# 杀掉进程
kill -9 <PID>
```

### 编译错误

```bash
# 清理并重新构建
cargo clean
cargo build --workspace
```

### 依赖问题

```bash
# 更新 Cargo.lock
cargo update

# 重新生成
rm Cargo.lock
cargo build
```

## 📚 文档链接

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 项目总览 |
| [WORKSPACE.md](WORKSPACE.md) | Workspace 详细说明 |
| [ENV_CONFIG.md](ENV_CONFIG.md) | 环境变量配置 |
| [MQTT_CLIENT_CONFIG_EXAMPLE.md](MQTT_CLIENT_CONFIG_EXAMPLE.md) | MQTT 配置示例 |
| [WORKSPACE_SETUP_SUMMARY.md](WORKSPACE_SETUP_SUMMARY.md) | Workspace 配置总结 |

## 💡 快捷提示

### 一键启动所有服务（开发模式）

创建启动脚本：

**Windows (start-all.ps1)**:
```powershell
# 并行启动所有服务
Start-Process -NoNewWindow cargo "run -p broker --release"
Start-Sleep -Seconds 2
Start-Process -NoNewWindow cargo "run -p ai-core --release"
Start-Sleep -Seconds 2
Start-Process -NoNewWindow cargo "run -p gui-server"
```

**Linux/Mac (start-all.sh)**:
```bash
#!/bin/bash
cargo run -p broker --release &
sleep 2
cargo run -p ai-core --release &
sleep 2
cargo run -p gui-server &
wait
```

### 检查所有服务状态

```bash
# AI-Core
curl -s http://localhost:9800/health | jq

# MQTT Status
curl -s http://localhost:9800/mqtt/status | jq
```

### 监控日志

```bash
# 设置日志级别
export RUST_LOG=debug

# 启动服务
cargo run -p ai-core
```

## 🎯 常用工作流

### 1. 开始新功能开发

```bash
# 拉取最新代码
git pull

# 创建新分支
git checkout -b feature/new-feature

# 检查编译
cargo check --workspace
```

### 2. 提交代码

```bash
# 格式化代码
cargo fmt --all

# 代码检查
cargo clippy --workspace

# 运行测试
cargo test --workspace

# 提交
git add .
git commit -m "feat: add new feature"
```

### 3. 更新依赖

```bash
# 检查过时的依赖
cargo outdated

# 更新
cargo update

# 测试
cargo test --workspace
```

## ⚡ 性能优化建议

### 编译加速

在 `~/.cargo/config.toml` 添加：

```toml
[build]
jobs = 8  # 根据 CPU 核心数调整

[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]
```

### 使用 sccache

```bash
# 安装
cargo install sccache

# 配置
export RUSTC_WRAPPER=sccache
```

---

**更新日期**: 2024年  
**版本**: 0.1.0  
**维护**: CozyMind Team


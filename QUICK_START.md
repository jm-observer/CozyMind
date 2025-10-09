# CozyMind 快速启动指南

## 📋 前置要求

- Rust 1.70+ (Edition 2021)
- Cargo (Rust 包管理器)
- (可选) Node.js 18+ 和 npm (用于前端开发)

## 🚀 快速启动

### 方式一：使用 Rust 后端（推荐）

#### 1. 启动 AI-Core 服务

```bash
# 进入 ai-core 目录
cd ai-core

# 构建并运行（开发模式）
cargo run

# 或构建 release 版本
cargo build --release
./target/release/ai-core
```

**输出示例：**
```
🚀 Starting CozyMind AI-Core server...
📡 Server listening on http://127.0.0.1:9800
🏥 Health check endpoint: http://127.0.0.1:9800/health
🔌 MQTT Broker endpoints: http://127.0.0.1:9800/mqtt/*
```

**验证服务：**
```bash
curl http://localhost:9800/health
```

#### 2. 启动 GUI 服务

```bash
# 打开新终端，进入 gui 目录
cd gui

# 构建并运行（开发模式）
cargo run

# 或构建 release 版本
cargo build --release
./target/release/gui-server
```

**输出示例：**
```
🚀 CozyMind API Server started
📡 API Server running at http://127.0.0.1:3000
🔗 Monitoring 3 AI-Core services
🤖 Configured 2 Ollama instances
💬 Loaded 2 message presets
```

**验证服务：**
```bash
curl http://localhost:3000/api/ai-cores
```

#### 3. 访问前端

打开浏览器访问: **http://localhost:3000**

### 方式二：使用 Node.js 后端（遗留版本）

#### 1. 启动 AI-Core 服务
（同上）

#### 2. 启动 GUI 服务

```bash
cd gui

# 安装依赖（首次运行）
npm install

# 启动服务器
npm run server
```

#### 3. 访问前端
打开浏览器访问: **http://localhost:3000**

### 方式三：前端开发模式（热更新）

适用于前端开发，提供热模块替换（HMR）功能。

#### 1. 启动 AI-Core 服务
（同上）

#### 2. 启动 GUI API 服务

```bash
cd gui

# 使用 Rust 后端
cargo run

# 或使用 Node.js 后端
npm run server
```

#### 3. 启动 Vite 开发服务器

```bash
# 在新终端中
cd gui
npm install  # 首次运行
npm run dev
```

#### 4. 访问开发服务器

打开浏览器访问: **http://localhost:10086**

前端更改会自动刷新，`/api` 请求会代理到 `http://localhost:3000`

## 🏗️ 一键启动脚本

### Windows (PowerShell)

创建 `start.ps1`:

```powershell
# 启动 AI-Core
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-core; cargo run"

# 等待 2 秒
Start-Sleep -Seconds 2

# 启动 GUI 服务
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd gui; cargo run"

# 等待 2 秒
Start-Sleep -Seconds 2

# 打开浏览器
Start-Process "http://localhost:3000"
```

运行：
```bash
powershell -ExecutionPolicy Bypass -File start.ps1
```

### Linux/macOS (Bash)

创建 `start.sh`:

```bash
#!/bin/bash

# 启动 AI-Core
cd ai-core
cargo run &
AI_CORE_PID=$!

# 等待 2 秒
sleep 2

# 启动 GUI 服务
cd ../gui
cargo run &
GUI_PID=$!

# 等待 2 秒
sleep 2

# 打开浏览器
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
fi

# 捕获退出信号
trap "kill $AI_CORE_PID $GUI_PID; exit" INT TERM

# 等待进程结束
wait
```

运行：
```bash
chmod +x start.sh
./start.sh
```

## 🔧 配置说明

### AI-Core 配置

AI-Core 默认配置:
- **主机**: `127.0.0.1`
- **端口**: `9800`
- **MQTT Broker 端口**: 动态配置

### GUI 配置

GUI 默认配置:
- **主机**: `127.0.0.1`
- **端口**: `3000`

### 数据文件

配置数据存储在 `gui/` 目录下的 JSON 文件中：

- `ai-core-data.json` - AI-Core 服务配置
- `ollama-data.json` - Ollama 配置
- `msg-pre-data.json` - 消息预设

首次运行时，如果文件不存在，系统会自动创建空配置。

## 🧪 测试 API

### 测试 AI-Core

```bash
# 健康检查
curl http://localhost:9800/health

# 服务信息
curl http://localhost:9800/

# MQTT Broker 状态
curl http://localhost:9800/mqtt/status

# 启动 MQTT Broker
curl -X POST http://localhost:9800/mqtt/start \
  -H "Content-Type: application/json" \
  -d '{"host":"0.0.0.0","port":1883,"max_connections":1000,"session_timeout":300,"keep_alive":60,"persistence":true,"log_level":"info"}'
```

### 测试 GUI API

```bash
# 获取 AI-Core 列表
curl http://localhost:3000/api/ai-cores

# 添加 AI-Core
curl -X POST http://localhost:3000/api/ai-cores \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Core","url":"http://localhost:9800","description":"Test service"}'

# 批量检查连接
curl http://localhost:3000/api/check-all

# 获取 Ollama 配置
curl http://localhost:3000/api/ollama-configs

# 获取消息预设
curl http://localhost:3000/api/messages
```

## 🐛 故障排除

### 问题 1: 端口已被占用

**错误信息:**
```
Error: Address already in use
```

**解决方案:**

Windows:
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程
taskkill /F /PID <PID>
```

Linux/macOS:
```bash
# 查找占用端口的进程
lsof -i :3000

# 终止进程
kill -9 <PID>
```

### 问题 2: Rust 编译错误

**错误信息:**
```
error: linker `link.exe` not found
```

**解决方案:**

Windows: 安装 Visual Studio Build Tools
- 下载: https://visualstudio.microsoft.com/downloads/
- 选择 "Desktop development with C++"

Linux: 安装 build-essential
```bash
sudo apt-get install build-essential
```

macOS: 安装 Xcode Command Line Tools
```bash
xcode-select --install
```

### 问题 3: 前端无法访问 API

**症状:** 前端显示 "Network Error" 或 "Failed to fetch"

**检查清单:**
1. ✅ 确认 API 服务正在运行 (`netstat -ano | findstr :3000`)
2. ✅ 检查浏览器控制台错误
3. ✅ 验证 CORS 配置（Rust 后端已配置 CORS）
4. ✅ 检查防火墙设置

### 问题 4: MQTT Broker 无法启动

**错误信息:**
```
Failed to start MQTT Broker
```

**解决方案:**
1. 检查端口 1883 是否被占用
2. 确认有足够的系统权限
3. 查看日志获取详细错误信息

## 📊 系统监控

### 检查服务状态

```bash
# AI-Core 健康状态
curl http://localhost:9800/health

# GUI API 状态
curl http://localhost:3000/api/ai-cores

# MQTT Broker 状态
curl http://localhost:9800/mqtt/status
```

### 查看日志

服务运行时会在控制台输出日志：

```
# 设置日志级别
export RUST_LOG=debug  # Linux/macOS
$env:RUST_LOG="debug"  # Windows PowerShell

# 运行服务
cargo run
```

日志级别：`error`, `warn`, `info`, `debug`, `trace`

## 🔐 安全建议

在生产环境中：

1. **修改默认端口**
   - 编辑 `ai-core/src/main.rs` 和 `gui/src/main.rs`
   - 将 `127.0.0.1` 改为 `0.0.0.0` 以允许外部访问

2. **启用 HTTPS**
   - 使用反向代理 (Nginx/Caddy)
   - 配置 SSL 证书

3. **添加认证**
   - 实现 JWT 或 OAuth2
   - 添加 API 密钥验证

4. **限制 CORS**
   - 修改 `gui/src/main.rs` 中的 CORS 配置
   - 只允许特定来源

## 📚 更多资源

- [项目架构文档](docs/architecture.md)
- [API 示例](docs/api-examples.md)
- [开发指南](docs/development.md)
- [Rust 后端 README](gui/RUST_BACKEND_README.md)
- [实现总结](IMPLEMENTATION_SUMMARY.md)

## 🤝 获取帮助

遇到问题？

1. 查看 [故障排除](#-故障排除) 部分
2. 检查 [Issues](https://github.com/your-repo/issues)
3. 提交新的 Issue
4. 查看日志获取详细错误信息

---

**祝使用愉快！** 🎉


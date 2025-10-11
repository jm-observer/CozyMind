# CozyMind

一个集成GUI、AI辅助中枢和Rust通用模型的多模块项目。

## 项目结构

```
CozyMind/
├── gui/              # 用户图形界面模块
├── ai-core/          # AI辅助中枢模块
├── rust-models/      # Rust通用模型包
├── docs/             # 项目文档
└── README.md         # 项目说明
```

## 模块说明

### 1. GUI (用户界面)
用户交互的Web界面，基于 Taro 实现：
- **前端框架**: Taro 3.6 (支持H5、微信小程序)
- **UI**: React 18 + TypeScript
- **访问**: http://localhost:10086

### 2. AI-Core (AI辅助中枢)
AI处理的核心模块，基于Rust + actix-web实现，负责：
- AI模型调用
- 业务逻辑处理
- HTTP API服务（端口9800）

### 3. Rust-Models (通用模型包)
Rust实现的通用模型库，提供：
- 共享数据结构
- 通用算法
- 跨模块调用的接口

## 快速开始

### 前置要求
- Node.js (用于GUI)
- Rust 1.70+ (用于AI-Core和Rust-Models)

### 环境配置

项目支持通过环境变量配置服务端口：

```bash
# 1. 复制环境变量配置文件
cp config.env .env

# 2. 根据需要修改 .env 文件中的配置
# 主要配置项：
# - AI_CORE_HOST: AI-Core 服务地址（默认 127.0.0.1）
# - AI_CORE_PORT: AI-Core 服务端口（默认 9800）
# - AI_CORE_MQTT_CLIENT_ID: MQTT 客户端 ID（默认 ai-core）
# - BROKER_MQTT_V4_PORT: MQTT Broker v4 端口（默认 8883）
# - BROKER_MQTT_V5_PORT: MQTT Broker v5 端口（默认 8884）
# - MQTT_KEEP_ALIVE: MQTT 保持连接时间（默认 60 秒）
```

### 启动服务

```bash
# 启动 MQTT Broker（终端1）
cd broker
cargo run --release

# 启动 AI-Core 服务（终端2）
cd ai-core
cargo run --release

# 启动 GUI（终端3）
cd gui
npm install
npm run dev
# 访问 http://localhost:10086
```

### 文档链接

- 📖 [API使用示例](docs/api-examples.md) - API调用示例
- 🏗️ [架构设计](docs/architecture.md) - 系统架构说明
- 💻 [开发指南](docs/development.md) - 开发流程和规范
- 📁 [项目结构](PROJECT_STRUCTURE.md) - 项目结构说明
- 🚀 [快速开始指南](QUICK_START.md) - 快速开始教程

## 许可证

待定


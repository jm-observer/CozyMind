# CozyMind 项目结构

## 目录树

```
CozyMind/
├── ai-core/                    # AI辅助中枢（Rust + actix-web）
│   ├── src/
│   │   └── main.rs            # 主入口文件
│   ├── Cargo.toml             # Rust依赖配置
│   ├── Cargo.lock             # 依赖锁定文件
│   ├── README.md              # 模块说明
│   └── target/                # 编译输出（.gitignore）
│
├── rust-models/               # Rust通用模型包
│   ├── src/
│   │   └── lib.rs            # 库文件（数据结构定义）
│   ├── Cargo.toml            # Rust依赖配置
│   ├── Cargo.lock            # 依赖锁定文件
│   ├── README.md             # 模块说明
│   └── target/               # 编译输出（.gitignore）
│
├── gui/                      # 用户图形界面
│   ├── config/               # Taro配置
│   ├── src/                  # 源代码
│   │   ├── pages/           # 页面
│   │   │   ├── index/       # 首页
│   │   │   └── settings/    # 环境配置
│   │   ├── app.tsx          # 应用入口
│   │   └── app.config.ts    # 应用配置
│   ├── src-tauri/           # Tauri后端
│   │   ├── src/             # Rust源码
│   │   ├── Cargo.toml       # Rust依赖
│   │   └── tauri.conf.json  # Tauri配置
│   ├── package.json         # Node依赖
│   ├── tsconfig.json        # TS配置
│   └── README.md            # 模块说明
│
├── docs/                     # 项目文档
│   ├── quick-start.md        # 快速开始指南
│   ├── api-examples.md       # API使用示例
│   ├── architecture.md       # 架构设计文档
│   └── development.md        # 开发指南
│
├── README.md                 # 项目主说明文件
├── PROJECT_STRUCTURE.md      # 本文件 - 项目结构说明
└── .gitignore               # Git忽略配置
```

## 模块说明

### 1. ai-core（AI辅助中枢）

**技术栈**: Rust + actix-web  
**端口**: 9800  
**功能**: HTTP API服务

**当前实现的接口**:
- `GET /` - 服务信息
- `GET /health` - 健康检查

**主要文件**:
- `src/main.rs` - 主程序入口，包含HTTP服务器配置和路由
- `Cargo.toml` - 依赖管理（actix-web, serde, tokio等）

**启动方式**:
```bash
cd ai-core
cargo run
```

### 2. rust-models（通用模型包）

**技术栈**: Rust + serde  
**类型**: Library  
**功能**: 提供跨模块使用的数据结构

**当前实现的结构**:
- `Message` - 通用消息结构
- `Response<T>` - 通用响应结构（支持泛型）

**主要文件**:
- `src/lib.rs` - 库入口，包含数据结构定义
- `Cargo.toml` - 依赖管理（serde, serde_json）

**使用方式**:
```rust
use rust_models::{Message, Response};

let msg = Message::new("1".to_string(), "Hello".to_string(), 123456789);
let response = Response::success(msg);
```

### 3. gui（用户界面）

**技术栈**: Tauri 1.5 + Taro 3.6 + React 18  
**状态**: ✅ 基础版本已实现

**已实现功能**:
- Tab导航界面
- 首页（欢迎页面）
- 环境配置页面
  - AI-Core健康检查接口配置
  - Ollama模型HTTP接口配置
  - 连接测试功能
  - 配置持久化存储

**运行方式**:
```bash
cd gui
npm install
npm run tauri:dev  # 桌面应用
npm run dev:taro   # H5开发
npm run build:weapp # 编译微信小程序
```

### 4. docs（文档）

包含项目的所有文档：

| 文档 | 说明 |
|------|------|
| quick-start.md | 快速开始指南，包含详细的启动步骤 |
| api-examples.md | API使用示例，包含多语言调用示例 |
| architecture.md | 系统架构设计文档 |
| development.md | 开发指南和规范 |

## 依赖关系

```
┌─────────┐
│   GUI   │
└────┬────┘
     │ HTTP请求
     ↓
┌─────────┐      ┌──────────────┐
│AI-Core  │←────│ Rust-Models  │
│(actix)  │ 依赖 │   (Library)  │
└─────────┘      └──────────────┘
```

- **GUI** 通过HTTP调用 **AI-Core**
- **AI-Core** 可以依赖 **Rust-Models**（通过Cargo依赖）
- **Rust-Models** 是独立的库，不依赖其他模块

## 端口分配

| 服务 | 端口 | 协议 |
|------|------|------|
| AI-Core | 9800 | HTTP |
| GUI | 待定 | HTTP/本地 |

## 编译输出

所有Rust模块的编译输出都在各自的 `target/` 目录下：
- `target/debug/` - 开发版本（未优化）
- `target/release/` - 生产版本（已优化）

这些目录已在 `.gitignore` 中配置为忽略。

## 开发状态

| 模块 | 状态 | 完成度 |
|------|------|--------|
| ai-core | ✅ 已实现 | 基础版本（健康检查接口） |
| rust-models | ✅ 已实现 | 基础版本（基本数据结构） |
| gui | ✅ 已实现 | 基础版本（Tab界面、环境配置） |
| 文档 | ✅ 完成 | 100% |

## 下一步计划

1. **AI-Core扩展**:
   - 添加更多API接口
   - 集成AI模型
   - 添加数据库支持

2. **GUI扩展**:
   - 添加更多功能页面
   - 实现AI对话界面
   - 集成Ollama模型调用

3. **Rust-Models扩展**:
   - 添加更多通用数据结构
   - 实现通用算法
   - 提供FFI接口（如需要）

## 技术栈总览

### 后端（AI-Core）
- **语言**: Rust 2021 Edition
- **Web框架**: actix-web 4.9
- **异步运行时**: tokio 1.x
- **序列化**: serde, serde_json
- **日志**: env_logger, log

### 库（Rust-Models）
- **语言**: Rust 2021 Edition
- **序列化**: serde, serde_json

### 前端（GUI）
- **桌面框架**: Tauri 1.5
- **跨端框架**: Taro 3.6
- **UI框架**: React 18
- **语言**: TypeScript

## 资源链接

- [Rust官方文档](https://www.rust-lang.org/)
- [actix-web文档](https://actix.rs/)
- [Tauri文档](https://tauri.app/)


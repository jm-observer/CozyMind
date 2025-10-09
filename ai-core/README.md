# AI-Core 模块

AI辅助中枢，使用 Rust + actix-web 实现的高性能 HTTP 后端服务。

## 功能

- AI模型集成与调用
- 业务逻辑处理
- RESTful API接口服务
- 与其他模块的通信

## 技术栈

- **Rust** 1.70+
- **actix-web** 4.x - Web框架
- **serde** - JSON序列化/反序列化
- **tokio** - 异步运行时

## 开发指南

### 安装依赖

项目依赖通过 Cargo 自动管理，首次构建时会自动下载。

### 构建项目

```bash
# 开发模式构建
cargo build

# 生产模式构建（优化）
cargo build --release
```

### 运行服务

```bash
# 开发模式运行
cargo run

# 或者使用 cargo watch 实现热重载（需要先安装：cargo install cargo-watch）
cargo watch -x run
```

服务将在 `http://127.0.0.1:9800` 启动。

### 运行测试

```bash
cargo test
```

## API接口

### 健康检查

**端点**: `GET /health`

**响应示例**:
```json
{
  "status": "ok",
  "message": "CozyMind AI-Core is running",
  "version": "0.1.0"
}
```

### 根路径

**端点**: `GET /`

**响应示例**:
```json
{
  "service": "CozyMind AI-Core",
  "version": "0.1.0",
  "status": "running"
}
```

## 配置

- **监听地址**: 127.0.0.1
- **监听端口**: 9800
- **日志级别**: 通过环境变量 `RUST_LOG` 设置（默认：info）

### 修改日志级别

```bash
# Windows PowerShell
$env:RUST_LOG="debug"; cargo run

# Linux/Mac
RUST_LOG=debug cargo run
```

## 生产部署

```bash
# 构建优化版本
cargo build --release

# 运行
./target/release/ai-core
```

## 开发建议

### 添加新的API接口

1. 在 `src/main.rs` 中定义处理函数
2. 使用 `#[get("/path")]` 或其他HTTP方法宏
3. 在 `HttpServer::new()` 中注册服务

示例：
```rust
#[get("/api/example")]
async fn example_handler() -> impl Responder {
    HttpResponse::Ok().json(json!({"data": "example"}))
}

// 在 App::new() 中添加
.service(example_handler)
```

### 项目结构建议（扩展时）

```
ai-core/
├── src/
│   ├── main.rs          # 主入口
│   ├── handlers/        # API处理函数
│   ├── models/          # 数据模型
│   ├── services/        # 业务逻辑
│   └── utils/           # 工具函数
├── Cargo.toml
└── README.md
```

## 常见问题

### 端口被占用

修改 `src/main.rs` 中的 `port` 变量值。

### 跨域问题

如需支持跨域请求，可添加 `actix-cors` 依赖并配置CORS中间件。

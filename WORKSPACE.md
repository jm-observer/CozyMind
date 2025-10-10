# Cargo Workspace 配置说明

## 概述

CozyMind 项目使用 Cargo Workspace 来管理多个 Rust 子项目，这样可以：
- 统一管理依赖版本
- 共享构建缓存，加快编译速度
- 简化跨项目引用
- 统一发布和测试流程

## Workspace 成员

本项目包含以下 Rust 子项目：

| 项目 | 说明 | 类型 |
|------|------|------|
| `ai-core` | AI 辅助中枢服务 | Binary |
| `broker` | MQTT Broker 服务 | Binary |
| `rust-models` | 共享数据模型库 | Library |
| `gui` | Web 界面后端服务 | Binary |

## 目录结构

```
CozyMind/
├── Cargo.toml          # Workspace 配置文件（根目录）
├── Cargo.lock          # 统一的依赖锁定文件
├── target/             # 共享的构建输出目录
├── ai-core/
│   ├── Cargo.toml      # ai-core 项目配置
│   └── src/
├── broker/
│   ├── Cargo.toml      # broker 项目配置
│   └── src/
├── rust-models/
│   ├── Cargo.toml      # rust-models 库配置
│   └── src/
└── gui/
    ├── Cargo.toml      # gui-server 项目配置
    └── src/
```

## 共享依赖管理

### 使用 Workspace 依赖

在子项目的 `Cargo.toml` 中，可以这样引用 workspace 定义的依赖：

```toml
[dependencies]
# 使用 workspace 定义的版本
serde = { workspace = true }
tokio = { workspace = true }

# 或者覆盖 workspace 配置，添加额外的 features
tokio = { workspace = true, features = ["rt-multi-thread"] }
```

### 跨项目引用

子项目之间可以相互引用：

```toml
[dependencies]
# 引用同一 workspace 中的其他项目
rust-models = { path = "../rust-models" }
```

## Workspace 命令

### 构建所有项目

```bash
# 在根目录执行，构建所有 workspace 成员
cargo build

# 发布构建
cargo build --release
```

### 构建特定项目

```bash
# 构建 ai-core
cargo build -p ai-core

# 发布构建 broker
cargo build -p broker --release
```

### 运行特定项目

```bash
# 运行 ai-core
cargo run -p ai-core

# 运行 broker（发布模式）
cargo run -p broker --release
```

### 测试

```bash
# 测试所有项目
cargo test

# 测试特定项目
cargo test -p rust-models
```

### 检查代码

```bash
# 检查所有项目
cargo check

# 检查特定项目
cargo check -p gui
```

### 清理构建产物

```bash
# 清理所有构建产物
cargo clean

# 只清理发布构建
cargo clean --release
```

### 更新依赖

```bash
# 更新所有依赖到最新兼容版本
cargo update

# 更新特定依赖
cargo update -p serde
```

## 优化配置说明

### Release Profile

发布模式优化配置：

```toml
[profile.release]
opt-level = 3        # 最高优化级别
lto = true           # 启用链接时优化（Link Time Optimization）
codegen-units = 1    # 单个代码生成单元，提升优化效果
strip = true         # 移除调试符号，减小二进制大小
panic = "abort"      # Panic 时直接终止，减小二进制大小
```

**优势**：
- 更小的二进制文件
- 更快的运行速度
- 更少的内存占用

**劣势**：
- 编译时间较长
- 无法获取详细的 panic 堆栈信息

### Dev Profile

开发模式配置：

```toml
[profile.dev]
opt-level = 0        # 不优化，加快编译速度
debug = true         # 包含调试信息

[profile.dev.package."*"]
opt-level = 3        # 依赖包进行优化，提升运行速度
```

**优势**：
- 快速编译项目代码
- 保留完整调试信息
- 依赖包优化后运行速度更快

## 添加新的 Workspace 成员

如果需要添加新的 Rust 项目到 workspace：

### 1. 创建新项目

```bash
# 在项目根目录
cargo new my-new-project

# 或创建库项目
cargo new --lib my-new-lib
```

### 2. 更新 Workspace 配置

编辑根目录的 `Cargo.toml`：

```toml
[workspace]
members = [
    "ai-core",
    "broker",
    "rust-models",
    "gui",
    "my-new-project",  # 添加新项目
]
```

### 3. 验证配置

```bash
# 检查 workspace 配置是否正确
cargo check
```

## 依赖版本统一

Workspace 配置中定义了所有子项目共享的依赖版本，好处：

### 1. 避免版本冲突

所有项目使用相同版本的依赖，避免因版本不一致导致的问题。

### 2. 减小编译产物

相同的依赖只编译一次，多个项目共享。

### 3. 简化维护

只需在一个地方更新依赖版本。

## 最佳实践

### 1. 使用 Workspace 依赖

尽量在子项目中使用 `workspace = true` 引用依赖：

```toml
# 推荐
[dependencies]
serde = { workspace = true }

# 不推荐（除非有特殊需求）
[dependencies]
serde = { version = "1.0", features = ["derive"] }
```

### 2. 共享代码通过 rust-models

将多个项目共用的数据结构和工具函数放在 `rust-models` 库中：

```rust
// rust-models/src/lib.rs
pub mod models;
pub mod utils;

// ai-core 中使用
use rust_models::models::UserData;
```

### 3. 保持依赖最小化

只在需要的项目中引入依赖，避免不必要的依赖膨胀。

### 4. 定期更新依赖

```bash
# 检查过时的依赖
cargo outdated

# 更新依赖
cargo update
```

### 5. 使用 Cargo.lock

将 `Cargo.lock` 提交到版本控制，确保所有开发者使用相同的依赖版本。

## 常见问题

### Q1: Workspace 中的项目无法找到依赖？

**解决**：确保在根目录运行 `cargo build`，而不是在子项目目录。

### Q2: 修改 workspace 配置后编译失败？

**解决**：
```bash
cargo clean
cargo build
```

### Q3: 如何只构建需要的项目？

**解决**：使用 `-p` 参数指定项目：
```bash
cargo build -p ai-core
```

### Q4: Workspace 和独立项目有什么区别？

**Workspace 优势**：
- 共享构建缓存
- 统一依赖管理
- 简化跨项目引用

**独立项目优势**：
- 更灵活的版本控制
- 可以独立发布
- 更简单的项目结构

### Q5: 如何在 CI/CD 中使用 Workspace？

**示例**（GitHub Actions）：

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      # 构建所有项目
      - name: Build
        run: cargo build --release --workspace
      
      # 测试所有项目
      - name: Test
        run: cargo test --workspace
      
      # 分别构建各个服务
      - name: Build AI-Core
        run: cargo build --release -p ai-core
      
      - name: Build Broker
        run: cargo build --release -p broker
```

## 相关命令速查

| 命令 | 说明 |
|------|------|
| `cargo build` | 构建所有项目 |
| `cargo build -p <name>` | 构建指定项目 |
| `cargo run -p <name>` | 运行指定项目 |
| `cargo test` | 测试所有项目 |
| `cargo test -p <name>` | 测试指定项目 |
| `cargo check` | 检查所有项目 |
| `cargo clean` | 清理构建产物 |
| `cargo update` | 更新依赖 |
| `cargo tree` | 显示依赖树 |
| `cargo outdated` | 检查过时的依赖 |

## 更多信息

- [Cargo Book - Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)
- [Rust 项目最佳实践](https://rust-lang.github.io/api-guidelines/)
- [项目主文档](README.md)
- [环境变量配置](ENV_CONFIG.md)


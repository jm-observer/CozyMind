# 开发指南

## 环境准备

### 必需工具

1. **Node.js** (v18+)
   - 用于GUI模块开发
   - [下载地址](https://nodejs.org/)

2. **Rust** (v1.70+)
   - 用于AI-Core和Rust-Models模块开发
   - [安装指南](https://www.rust-lang.org/tools/install)

3. **Python** (v3.9+，可选)
   - 如需要AI/ML相关功能
   - [下载地址](https://www.python.org/)

### 可选工具

- **Docker**: 用于容器化部署
- **Git**: 版本控制
- **VSCode**: 推荐的IDE

## 开发流程

### 1. 克隆项目

```bash
git clone <repository-url>
cd CozyMind
```

### 2. 初始化各模块

#### Rust-Models
```bash
cd rust-models
cargo build
cargo test
```

#### AI-Core
```bash
cd ai-core
cargo build
cargo test
```

#### GUI
```bash
cd gui
# 根据选择的技术栈初始化
# npm install 或其他命令
```

### 3. 运行开发服务器

在不同的终端窗口中运行各个模块：

```bash
# 终端1 - AI-Core
cd ai-core
cargo run

# 终端2 - GUI
cd gui
npm run dev

# Rust-Models通常作为库被其他模块调用
```

## 代码规范

### Rust
- 遵循Rust官方代码风格
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量


### JavaScript/TypeScript
- 遵循Airbnb或Standard风格指南
- 使用ESLint和Prettier
- 优先使用TypeScript

## 测试

每个模块都应该包含单元测试和集成测试：

```bash
# Rust-Models
cd rust-models
cargo test

# AI-Core
cd ai-core
cargo test

# GUI
cd gui
npm test
```

## 提交规范

使用Conventional Commits规范：

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

## 常见问题

待补充...


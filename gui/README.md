# CozyMind GUI - AI-Core 连接监控

一个功能强大的 Web 应用程序，用于管理和监控多个 AI-Core 服务的连接状态。

## 功能特性

- 🎯 **多服务支持**：同时监控3个AI-Core服务（主服务、备用服务、测试服务）
- ✅ **实时状态监控**：显示每个服务的在线/离线状态和响应时间
- 🔄 **自动检测**：每5秒自动检测所有服务连接（可开关）
- 🎛️ **连接选择**：用户可选择使用特定的AI-Core连接
- 📊 **详细信息展示**：健康检查和基本信息标签页切换查看
- 📝 **日志记录**：完整的检测历史记录（支持清空）
- 🎨 **现代化UI**：卡片式设计，响应式布局

## 快速开始

### 1. 安装依赖

```bash
cd gui
npm install
```

### 2. 启动服务

```bash
npm start
```

服务将运行在 `http://localhost:10086`

### 3. 确保 AI-Core 正在运行

```bash
cd ../ai-core
cargo run
```

AI-Core 将运行在 `http://127.0.0.1:9800`

## 使用说明

1. 打开浏览器访问 `http://localhost:10086`
2. 页面将自动开始检测 AI-Core 的连接状态
3. 可以通过"立即检测"按钮手动触发检测
4. 可以通过"停止/启动自动检测"按钮控制自动检测

## 技术栈

- **后端**: Node.js + Express
- **HTTP 客户端**: Axios
- **前端**: 原生 HTML + CSS + JavaScript
- **样式**: 现代化渐变设计

## API 端点

### GET /api/ai-cores
获取所有AI-Core服务配置

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "AI-Core 主服务",
      "url": "http://127.0.0.1:9800",
      "description": "主要AI处理服务"
    }
  ]
}
```

### GET /api/check-all
检测所有AI-Core连接状态

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "AI-Core 主服务",
      "url": "http://127.0.0.1:9800",
      "connected": true,
      "status": "online",
      "data": {
        "status": "ok",
        "message": "CozyMind AI-Core is running",
        "version": "0.1.0"
      },
      "responseTime": 45,
      "timestamp": "2025-10-09T12:00:00.000Z"
    }
  ]
}
```

### POST /api/check-connection
检测单个AI-Core连接状态

**请求体**:
```json
{
  "url": "http://127.0.0.1:9800"
}
```

**响应示例**:
```json
{
  "success": true,
  "connected": true,
  "status": "online",
  "data": {
    "status": "ok",
    "message": "CozyMind AI-Core is running",
    "version": "0.1.0"
  },
  "responseTime": 45,
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

### POST /api/ai-core-info
获取AI-Core基本信息

**请求体**:
```json
{
  "url": "http://127.0.0.1:9800"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "service": "CozyMind AI-Core",
    "version": "0.1.0",
    "status": "running"
  },
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

## 项目结构

```
gui/
├── server.js           # Express 服务器
├── package.json        # 项目配置
├── README.md          # 说明文档
└── public/            # 静态资源
    ├── index.html     # 主页面
    ├── style.css      # 样式表
    └── app.js         # 前端脚本
```

## 自定义配置

可以在 `server.js` 中修改以下配置：

- `PORT`: GUI 服务端口（默认: 10086）
- `AI_CORE_URL`: AI-Core 服务地址（默认: http://127.0.0.1:9800）

可以在 `public/app.js` 中修改：

- 自动检测间隔（默认: 5000ms）
- 日志保留数量（默认: 50条）

## 许可证

待定


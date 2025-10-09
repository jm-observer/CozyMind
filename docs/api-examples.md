# API 使用示例

本文档展示如何使用 CozyMind AI-Core 的 HTTP API。

## 基本信息

- **服务地址**: http://127.0.0.1:9800
- **数据格式**: JSON
- **字符编码**: UTF-8

## API 端点

### 1. 根路径 - 服务信息

获取服务的基本信息。

**请求**:
```bash
GET http://127.0.0.1:9800/
```

**使用 curl**:
```bash
curl http://127.0.0.1:9800/
```

**响应**:
```json
{
  "service": "CozyMind AI-Core",
  "version": "0.1.0",
  "status": "running"
}
```

### 2. 健康检查

检查服务的健康状态。

**请求**:
```bash
GET http://127.0.0.1:9800/health
```

**使用 curl**:
```bash
curl http://127.0.0.1:9800/health
```

**响应**:
```json
{
  "status": "ok",
  "message": "CozyMind AI-Core is running",
  "version": "0.1.0"
}
```

## 代码示例

### Rust

```rust
use reqwest;
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    // 健康检查
    let response = client
        .get("http://127.0.0.1:9800/health")
        .send()
        .await?;
    
    let json: Value = response.json().await?;
    println!("健康检查响应: {}", json);
    
    Ok(())
}
```

### Python

```python
import requests

# 健康检查
response = requests.get("http://127.0.0.1:9800/health")
data = response.json()
print(f"健康检查响应: {data}")

# 服务信息
response = requests.get("http://127.0.0.1:9800/")
data = response.json()
print(f"服务信息: {data}")
```

### JavaScript/TypeScript

```javascript
// 使用 fetch API
async function checkHealth() {
  try {
    const response = await fetch('http://127.0.0.1:9800/health');
    const data = await response.json();
    console.log('健康检查响应:', data);
  } catch (error) {
    console.error('请求失败:', error);
  }
}

checkHealth();

// 使用 axios
import axios from 'axios';

async function getServiceInfo() {
  try {
    const response = await axios.get('http://127.0.0.1:9800/');
    console.log('服务信息:', response.data);
  } catch (error) {
    console.error('请求失败:', error);
  }
}

getServiceInfo();
```

### PowerShell

```powershell
# 健康检查
$response = Invoke-RestMethod -Uri "http://127.0.0.1:9800/health"
$response | ConvertTo-Json

# 服务信息
$response = Invoke-RestMethod -Uri "http://127.0.0.1:9800/"
$response | ConvertTo-Json
```

## 错误处理

API 在发生错误时会返回适当的 HTTP 状态码：

- **200 OK**: 请求成功
- **400 Bad Request**: 请求参数错误
- **404 Not Found**: 端点不存在
- **500 Internal Server Error**: 服务器内部错误

## 测试工具推荐

### 命令行工具
- **curl**: 最常用的命令行HTTP工具
- **httpie**: 更人性化的HTTP客户端

### GUI工具
- **Postman**: 功能强大的API测试工具
- **Insomnia**: 简洁的REST客户端
- **Thunder Client** (VSCode插件): 轻量级的API测试工具

## 快速测试脚本

创建一个测试脚本来验证所有端点：

**test-api.sh** (Linux/Mac):
```bash
#!/bin/bash

echo "测试根路径..."
curl http://127.0.0.1:9800/
echo -e "\n"

echo "测试健康检查..."
curl http://127.0.0.1:9800/health
echo -e "\n"

echo "所有测试完成！"
```

**test-api.ps1** (Windows PowerShell):
```powershell
Write-Host "测试根路径..." -ForegroundColor Green
Invoke-RestMethod -Uri "http://127.0.0.1:9800/" | ConvertTo-Json
Write-Host ""

Write-Host "测试健康检查..." -ForegroundColor Green
Invoke-RestMethod -Uri "http://127.0.0.1:9800/health" | ConvertTo-Json
Write-Host ""

Write-Host "所有测试完成！" -ForegroundColor Cyan
```

运行测试：
```bash
# Linux/Mac
chmod +x test-api.sh
./test-api.sh

# Windows
.\test-api.ps1
```


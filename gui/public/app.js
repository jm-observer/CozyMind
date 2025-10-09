let autoCheckInterval = null;
let isAutoChecking = true;

// 页面加载时开始自动检测
window.addEventListener('DOMContentLoaded', () => {
    addLog('应用启动，开始监控 AI-Core 连接状态...');
    checkConnection();
    startAutoCheck();
});

// 检测连接
async function checkConnection() {
    const startTime = Date.now();
    
    try {
        // 检查健康状态
        const healthResponse = await fetch('/api/check-connection');
        const healthData = await healthResponse.json();
        
        const responseTime = Date.now() - startTime;
        
        if (healthData.connected) {
            updateStatus('online', '在线', healthData, responseTime);
            
            // 获取详细信息
            const infoResponse = await fetch('/api/ai-core-info');
            const infoData = await infoResponse.json();
            
            if (infoData.success) {
                displayInfo(infoData.data);
            }
            
            addLog(`✅ 连接成功 - 响应时间: ${responseTime}ms`, 'success');
        } else {
            updateStatus('offline', '离线', healthData, responseTime);
            hideInfo();
            addLog(`❌ 连接失败 - ${healthData.error}`, 'error');
        }
    } catch (error) {
        updateStatus('offline', '离线', { error: error.message }, 0);
        hideInfo();
        addLog(`❌ 请求失败 - ${error.message}`, 'error');
    }
}

// 更新状态显示
function updateStatus(status, statusText, data, responseTime) {
    const statusIndicator = document.getElementById('statusIndicator');
    const lastCheck = document.getElementById('lastCheck');
    const responseTimeEl = document.getElementById('responseTime');
    
    // 更新状态指示器
    statusIndicator.innerHTML = `
        <span class="status-dot ${status}"></span>
        <span class="status-text">${statusText}</span>
    `;
    
    // 更新检测时间
    lastCheck.textContent = new Date().toLocaleString('zh-CN');
    responseTimeEl.textContent = responseTime > 0 ? `${responseTime}ms` : '--';
    
    // 如果在线，显示健康检查详情
    if (status === 'online' && data.data) {
        displayHealthInfo(data.data);
    } else {
        hideHealthInfo();
    }
}

// 显示健康检查详情
function displayHealthInfo(healthData) {
    const healthCard = document.getElementById('healthCard');
    const healthContent = document.getElementById('healthContent');
    
    healthCard.style.display = 'block';
    
    healthContent.innerHTML = `
        <div class="info-item">
            <strong>状态:</strong> ${healthData.status || 'N/A'}
        </div>
        <div class="info-item">
            <strong>消息:</strong> ${healthData.message || 'N/A'}
        </div>
        <div class="info-item">
            <strong>版本:</strong> ${healthData.version || 'N/A'}
        </div>
    `;
}

// 隐藏健康检查详情
function hideHealthInfo() {
    const healthCard = document.getElementById('healthCard');
    healthCard.style.display = 'none';
}

// 显示AI-Core信息
function displayInfo(info) {
    const infoCard = document.getElementById('infoCard');
    const infoContent = document.getElementById('infoContent');
    
    infoCard.style.display = 'block';
    
    infoContent.innerHTML = `
        <div class="info-item">
            <strong>服务名称:</strong> ${info.service || 'N/A'}
        </div>
        <div class="info-item">
            <strong>版本号:</strong> ${info.version || 'N/A'}
        </div>
        <div class="info-item">
            <strong>运行状态:</strong> ${info.status || 'N/A'}
        </div>
    `;
}

// 隐藏信息卡片
function hideInfo() {
    const infoCard = document.getElementById('infoCard');
    infoCard.style.display = 'none';
}

// 添加日志
function addLog(message, type = 'info') {
    const logContent = document.getElementById('logContent');
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.innerHTML = `
        <span class="timestamp">[${timestamp}]</span> ${message}
    `;
    
    // 添加到顶部
    if (logContent.firstChild) {
        logContent.insertBefore(logItem, logContent.firstChild);
    } else {
        logContent.appendChild(logItem);
    }
    
    // 限制日志数量
    while (logContent.children.length > 50) {
        logContent.removeChild(logContent.lastChild);
    }
}

// 开始自动检测
function startAutoCheck() {
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
    }
    
    autoCheckInterval = setInterval(() => {
        checkConnection();
    }, 5000); // 每5秒检测一次
    
    isAutoChecking = true;
    updateToggleButton();
}

// 停止自动检测
function stopAutoCheck() {
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
        autoCheckInterval = null;
    }
    
    isAutoChecking = false;
    updateToggleButton();
    addLog('⏸️ 自动检测已停止');
}

// 切换自动检测
function toggleAutoCheck() {
    if (isAutoChecking) {
        stopAutoCheck();
    } else {
        startAutoCheck();
        addLog('▶️ 自动检测已启动');
        checkConnection();
    }
}

// 更新切换按钮
function updateToggleButton() {
    const toggleBtn = document.getElementById('toggleAutoBtn');
    if (isAutoChecking) {
        toggleBtn.textContent = '⏸️ 停止自动检测';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    } else {
        toggleBtn.textContent = '▶️ 启动自动检测';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    }
}


let autoCheckInterval = null;
let isAutoChecking = true;
let aiCores = [];
let selectedCore = null;

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
    addLog('应用启动，加载 AI-Core 服务列表...');
    initTabSwitching();
    loadAICores();
});

// 加载所有 AI-Core 配置
async function loadAICores() {
    try {
        const response = await fetch('/api/ai-cores');
        const result = await response.json();
        
        if (result.success) {
            aiCores = result.data;
            renderServices();
            checkAllConnections();
            startAutoCheck();
            addLog(`✅ 加载了 ${aiCores.length} 个 AI-Core 服务配置`);
        }
    } catch (error) {
        addLog(`❌ 加载服务配置失败: ${error.message}`, 'error');
    }
}

// 渲染服务列表
function renderServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    
    servicesGrid.innerHTML = aiCores.map(core => `
        <div class="service-item ${selectedCore?.id === core.id ? 'selected' : ''}" 
             id="service-${core.id}" 
             data-id="${core.id}">
            <div class="service-header">
                <div class="service-title">
                    <h3>${core.name}</h3>
                    <span class="status-dot checking" id="dot-${core.id}"></span>
                </div>
                <div class="service-status" id="status-${core.id}">检测中...</div>
            </div>
            <div class="service-body">
                <div class="service-description">${core.description}</div>
                <div class="service-url">${core.url}</div>
                <div class="service-stats">
                    <div class="stat-item">
                        <span class="stat-label">响应时间:</span>
                        <span class="stat-value" id="time-${core.id}">--</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最后检测:</span>
                        <span class="stat-value" id="last-${core.id}">--</span>
                    </div>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn btn-sm btn-outline" onclick="checkSingleConnection(${core.id})">
                    🔄 检测
                </button>
                <button class="btn btn-sm btn-primary" onclick="selectConnection(${core.id})">
                    ✓ 选择使用
                </button>
            </div>
        </div>
    `).join('');
}

// 检测所有连接
async function checkAllConnections() {
    try {
        const response = await fetch('/api/check-all');
        const result = await response.json();
        
        if (result.success) {
            result.data.forEach(core => {
                updateServiceStatus(core);
            });
            addLog(`✅ 完成所有服务检测`, 'success');
        }
    } catch (error) {
        addLog(`❌ 检测失败: ${error.message}`, 'error');
    }
}

// 检测单个连接
async function checkSingleConnection(coreId) {
    const core = aiCores.find(c => c.id === coreId);
    if (!core) return;
    
    try {
        const response = await fetch('/api/check-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: core.url })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const coreData = { ...core, ...result };
            updateServiceStatus(coreData);
            
            if (result.connected) {
                addLog(`✅ ${core.name} 连接成功 - 响应时间: ${result.responseTime}ms`, 'success');
            } else {
                addLog(`❌ ${core.name} 连接失败 - ${result.error}`, 'error');
            }
        }
    } catch (error) {
        addLog(`❌ ${core.name} 检测失败: ${error.message}`, 'error');
    }
}

// 更新服务状态显示
function updateServiceStatus(core) {
    const dot = document.getElementById(`dot-${core.id}`);
    const status = document.getElementById(`status-${core.id}`);
    const time = document.getElementById(`time-${core.id}`);
    const last = document.getElementById(`last-${core.id}`);
    
    if (!dot || !status || !time || !last) return;
    
    if (core.connected) {
        dot.className = 'status-dot online';
        status.textContent = '在线';
        status.className = 'service-status online';
        time.textContent = `${core.responseTime}ms`;
    } else {
        dot.className = 'status-dot offline';
        status.textContent = '离线';
        status.className = 'service-status offline';
        time.textContent = '--';
    }
    
    last.textContent = new Date(core.timestamp).toLocaleTimeString('zh-CN');
    
    // 如果这是选中的服务，更新详细信息
    if (selectedCore?.id === core.id) {
        updateDetailInfo(core);
    }
}

// 选择连接
async function selectConnection(coreId) {
    const core = aiCores.find(c => c.id === coreId);
    if (!core) return;
    
    selectedCore = core;
    
    // 更新选中状态
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById(`service-${coreId}`).classList.add('selected');
    
    // 更新选中信息显示
    const selectedInfo = document.getElementById('selectedInfo');
    selectedInfo.innerHTML = `
        <span class="selected-name">${core.name}</span>
        <span class="selected-url">${core.url}</span>
    `;
    
    // 检测并显示详细信息
    await checkSingleConnection(coreId);
    
    // 显示详细信息卡片
    document.getElementById('detailCard').style.display = 'block';
    
    addLog(`✓ 已选择使用: ${core.name}`, 'success');
}

// 更新详细信息
async function updateDetailInfo(core) {
    const healthPane = document.getElementById('healthPane');
    const infoPane = document.getElementById('infoPane');
    
    // 更新健康检查信息
    if (core.connected && core.data) {
        healthPane.innerHTML = `
            <div class="info-item">
                <strong>状态:</strong> <span class="badge badge-success">${core.data.status || 'N/A'}</span>
            </div>
            <div class="info-item">
                <strong>消息:</strong> ${core.data.message || 'N/A'}
            </div>
            <div class="info-item">
                <strong>版本:</strong> ${core.data.version || 'N/A'}
            </div>
            <div class="info-item">
                <strong>响应时间:</strong> ${core.responseTime}ms
            </div>
            <div class="info-item">
                <strong>检测时间:</strong> ${new Date(core.timestamp).toLocaleString('zh-CN')}
            </div>
        `;
    } else {
        healthPane.innerHTML = `
            <div class="info-item error">
                <strong>连接失败:</strong> ${core.error || '无法连接到服务'}
            </div>
        `;
    }
    
    // 获取基本信息
    if (core.connected) {
        try {
            const response = await fetch('/api/ai-core-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: core.url })
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
                infoPane.innerHTML = `
                    <div class="info-item">
                        <strong>服务名称:</strong> ${result.data.service || 'N/A'}
                    </div>
                    <div class="info-item">
                        <strong>版本号:</strong> ${result.data.version || 'N/A'}
                    </div>
                    <div class="info-item">
                        <strong>运行状态:</strong> <span class="badge badge-success">${result.data.status || 'N/A'}</span>
                    </div>
                `;
            }
        } catch (error) {
            infoPane.innerHTML = `
                <div class="info-item error">
                    <strong>获取失败:</strong> ${error.message}
                </div>
            `;
        }
    } else {
        infoPane.innerHTML = `
            <div class="info-item error">
                <strong>服务离线:</strong> 无法获取基本信息
            </div>
        `;
    }
}

// 标签页切换
function initTabSwitching() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            const tab = e.target.dataset.tab;
            
            // 切换标签按钮状态
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // 切换内容面板
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            if (tab === 'health') {
                document.getElementById('healthPane').classList.add('active');
            } else if (tab === 'info') {
                document.getElementById('infoPane').classList.add('active');
            }
        }
    });
}

// 开始自动检测
function startAutoCheck() {
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
    }
    
    autoCheckInterval = setInterval(() => {
        checkAllConnections();
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
        checkAllConnections();
    }
}

// 更新切换按钮
function updateToggleButton() {
    const toggleBtn = document.getElementById('toggleAutoBtn');
    if (isAutoChecking) {
        toggleBtn.textContent = '⏸️ 停止自动';
    } else {
        toggleBtn.textContent = '▶️ 启动自动';
    }
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

// 清空日志
function clearLogs() {
    const logContent = document.getElementById('logContent');
    logContent.innerHTML = '<div class="log-item">日志已清空</div>';
    addLog('🗑️ 日志已清空');
}

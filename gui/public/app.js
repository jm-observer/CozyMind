let autoCheckInterval = null;
let isAutoChecking = true;
let aiCores = [];
let ollamaConfigs = [];
let selectedCore = null;
let selectedOllama = null;
let editingCoreId = null;
let editingOllamaId = null;
let currentSection = 'aicore';

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
    addLog('应用启动，加载配置...');
    initTabSwitching();
    loadAICores();
    loadOllamaConfigs();
});

// ========== 部分切换 ==========

function switchSection(section) {
    currentSection = section;
    
    // 切换导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });
    
    // 切换内容区域
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    if (section === 'aicore') {
        document.getElementById('aicoreSection').classList.add('active');
        if (aiCores.length === 0) {
            loadAICores();
        }
    } else if (section === 'ollama') {
        document.getElementById('ollamaSection').classList.add('active');
        if (ollamaConfigs.length === 0) {
            loadOllamaConfigs();
        }
    }
}

// ========== AI-Core 功能 ==========

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
    
    if (aiCores.length === 0) {
        servicesGrid.innerHTML = '<div class="empty-state">暂无服务配置，点击"添加服务"开始</div>';
        return;
    }
    
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
                <button class="btn btn-sm btn-warning" onclick="editCore(${core.id})">
                    ✏️ 编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCore(${core.id})">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');
}

// 检测所有连接
async function checkAllConnections() {
    if (aiCores.length === 0) return;
    
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
    const serviceItem = document.getElementById(`service-${coreId}`);
    if (serviceItem) {
        serviceItem.classList.add('selected');
    }
    
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

// AI-Core 模态框操作
function showAddCoreModal() {
    editingCoreId = null;
    document.getElementById('coreModalTitle').textContent = '添加 AI-Core 服务';
    document.getElementById('coreName').value = '';
    document.getElementById('coreUrl').value = '';
    document.getElementById('coreDescription').value = '';
    document.getElementById('coreModal').style.display = 'flex';
}

function editCore(coreId) {
    const core = aiCores.find(c => c.id === coreId);
    if (!core) return;
    
    editingCoreId = coreId;
    document.getElementById('coreModalTitle').textContent = '编辑 AI-Core 服务';
    document.getElementById('coreName').value = core.name;
    document.getElementById('coreUrl').value = core.url;
    document.getElementById('coreDescription').value = core.description;
    document.getElementById('coreModal').style.display = 'flex';
}

function closeCoreModal() {
    document.getElementById('coreModal').style.display = 'none';
    editingCoreId = null;
}

async function saveCoreConfig() {
    const name = document.getElementById('coreName').value.trim();
    const url = document.getElementById('coreUrl').value.trim();
    const description = document.getElementById('coreDescription').value.trim();
    
    if (!name || !url) {
        alert('请填写服务名称和地址');
        return;
    }
    
    try {
        let response;
        if (editingCoreId) {
            // 更新
            response = await fetch(`/api/ai-cores/${editingCoreId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url, description })
            });
        } else {
            // 添加
            response = await fetch('/api/ai-cores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url, description })
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ ${editingCoreId ? '更新' : '添加'}服务成功: ${name}`, 'success');
            closeCoreModal();
            await loadAICores();
        } else {
            addLog(`❌ 操作失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 操作失败: ${error.message}`, 'error');
    }
}

async function deleteCore(coreId) {
    const core = aiCores.find(c => c.id === coreId);
    if (!core) return;
    
    if (!confirm(`确定要删除 "${core.name}" 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/ai-cores/${coreId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ 删除服务成功: ${core.name}`, 'success');
            if (selectedCore?.id === coreId) {
                selectedCore = null;
                document.getElementById('detailCard').style.display = 'none';
                document.getElementById('selectedInfo').innerHTML = '<span class="selected-name">未选择</span>';
            }
            await loadAICores();
        } else {
            addLog(`❌ 删除失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 删除失败: ${error.message}`, 'error');
    }
}

// ========== Ollama 功能 ==========

// 加载 Ollama 配置
async function loadOllamaConfigs() {
    try {
        const response = await fetch('/api/ollama-configs');
        const result = await response.json();
        
        if (result.success) {
            ollamaConfigs = result.data;
            renderOllamaConfigs();
            addLog(`✅ 加载了 ${ollamaConfigs.length} 个 Ollama 配置`);
        }
    } catch (error) {
        addLog(`❌ 加载 Ollama 配置失败: ${error.message}`, 'error');
    }
}

// 渲染 Ollama 配置列表
function renderOllamaConfigs() {
    const ollamaGrid = document.getElementById('ollamaGrid');
    
    if (ollamaConfigs.length === 0) {
        ollamaGrid.innerHTML = '<div class="empty-state">暂无Ollama配置，点击"添加配置"开始</div>';
        return;
    }
    
    ollamaGrid.innerHTML = ollamaConfigs.map(config => `
        <div class="service-item ${selectedOllama?.id === config.id ? 'selected' : ''}" 
             id="ollama-${config.id}">
            <div class="service-header">
                <div class="service-title">
                    <h3>${config.name}</h3>
                    <span class="badge badge-info">${config.model}</span>
                </div>
            </div>
            <div class="service-body">
                <div class="service-description">${config.description}</div>
                <div class="service-url">${config.url}</div>
            </div>
            <div class="service-actions">
                <button class="btn btn-sm btn-outline" onclick="checkOllamaStatus(${config.id})">
                    🔍 检查状态
                </button>
                <button class="btn btn-sm btn-primary" onclick="selectOllama(${config.id})">
                    🚀 测试模型
                </button>
                <button class="btn btn-sm btn-warning" onclick="editOllama(${config.id})">
                    ✏️ 编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteOllama(${config.id})">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');
}

// 选择 Ollama 配置进行测试
function selectOllama(configId) {
    const config = ollamaConfigs.find(c => c.id === configId);
    if (!config) return;
    
    selectedOllama = config;
    
    // 更新选中状态
    document.querySelectorAll('#ollamaGrid .service-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById(`ollama-${configId}`).classList.add('selected');
    
    // 显示测试卡片
    document.getElementById('ollamaTestCard').style.display = 'block';
    document.getElementById('testResult').style.display = 'none';
    
    addLog(`✓ 已选择配置: ${config.name} (${config.model})`, 'success');
}

// 检查 Ollama 状态
async function checkOllamaStatus(configId) {
    const config = ollamaConfigs.find(c => c.id === configId);
    if (!config) return;
    
    addLog(`🔍 检查 ${config.name} 状态...`);
    
    try {
        const response = await fetch('/api/ollama-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: config.url })
        });
        
        const result = await response.json();
        
        if (result.success && result.connected) {
            addLog(`✅ ${config.name} 在线 - 响应时间: ${result.responseTime}ms`, 'success');
        } else {
            addLog(`❌ ${config.name} 离线 - ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 检查失败: ${error.message}`, 'error');
    }
}

// 运行 Ollama 测试
async function runOllamaTest() {
    if (!selectedOllama) {
        alert('请先选择一个配置');
        return;
    }
    
    const prompt = document.getElementById('testPrompt').value.trim();
    if (!prompt) {
        alert('请输入测试提示词');
        return;
    }
    
    const testResult = document.getElementById('testResult');
    const testResultContent = document.getElementById('testResultContent');
    
    testResult.style.display = 'block';
    testResultContent.innerHTML = '<div class="loading">🔄 正在请求 Ollama 生成响应...</div>';
    
    addLog(`🚀 开始测试 ${selectedOllama.name} (${selectedOllama.model})...`);
    
    try {
        const response = await fetch('/api/ollama-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: selectedOllama.url,
                model: selectedOllama.model,
                prompt: prompt
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.connected) {
            const data = result.data;
            testResultContent.innerHTML = `
                <div class="test-success">
                    <div class="test-info">
                        <span class="badge badge-success">成功</span>
                        <span>响应时间: ${result.responseTime}ms</span>
                    </div>
                    <div class="test-response">
                        <h4>模型响应:</h4>
                        <div class="response-text">${data.response}</div>
                    </div>
                    <div class="test-stats">
                        <div class="stat-item">
                            <span class="stat-label">模型:</span>
                            <span class="stat-value">${data.model}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">提示词 Token:</span>
                            <span class="stat-value">${data.prompt_eval_count || 'N/A'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">生成 Token:</span>
                            <span class="stat-value">${data.eval_count || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
            addLog(`✅ 测试成功 - 响应时间: ${result.responseTime}ms`, 'success');
        } else {
            testResultContent.innerHTML = `
                <div class="test-error">
                    <span class="badge badge-danger">失败</span>
                    <p>${result.error}</p>
                    ${result.errorDetails ? `<pre>${JSON.stringify(result.errorDetails, null, 2)}</pre>` : ''}
                </div>
            `;
            addLog(`❌ 测试失败 - ${result.error}`, 'error');
        }
    } catch (error) {
        testResultContent.innerHTML = `
            <div class="test-error">
                <span class="badge badge-danger">错误</span>
                <p>${error.message}</p>
            </div>
        `;
        addLog(`❌ 测试失败: ${error.message}`, 'error');
    }
}

// Ollama 模态框操作
function showAddOllamaModal() {
    editingOllamaId = null;
    document.getElementById('ollamaModalTitle').textContent = '添加 Ollama 配置';
    document.getElementById('ollamaName').value = '';
    document.getElementById('ollamaUrl').value = '';
    document.getElementById('ollamaModel').value = '';
    document.getElementById('ollamaDescription').value = '';
    document.getElementById('ollamaModal').style.display = 'flex';
}

function editOllama(configId) {
    const config = ollamaConfigs.find(c => c.id === configId);
    if (!config) return;
    
    editingOllamaId = configId;
    document.getElementById('ollamaModalTitle').textContent = '编辑 Ollama 配置';
    document.getElementById('ollamaName').value = config.name;
    document.getElementById('ollamaUrl').value = config.url;
    document.getElementById('ollamaModel').value = config.model;
    document.getElementById('ollamaDescription').value = config.description;
    document.getElementById('ollamaModal').style.display = 'flex';
}

function closeOllamaModal() {
    document.getElementById('ollamaModal').style.display = 'none';
    editingOllamaId = null;
}

async function saveOllamaConfig() {
    const name = document.getElementById('ollamaName').value.trim();
    const url = document.getElementById('ollamaUrl').value.trim();
    const model = document.getElementById('ollamaModel').value.trim();
    const description = document.getElementById('ollamaDescription').value.trim();
    
    if (!name || !url || !model) {
        alert('请填写配置名称、地址和模型名称');
        return;
    }
    
    try {
        let response;
        if (editingOllamaId) {
            // 更新
            response = await fetch(`/api/ollama-configs/${editingOllamaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url, model, description })
            });
        } else {
            // 添加
            response = await fetch('/api/ollama-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url, model, description })
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ ${editingOllamaId ? '更新' : '添加'}配置成功: ${name}`, 'success');
            closeOllamaModal();
            await loadOllamaConfigs();
        } else {
            addLog(`❌ 操作失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 操作失败: ${error.message}`, 'error');
    }
}

async function deleteOllama(configId) {
    const config = ollamaConfigs.find(c => c.id === configId);
    if (!config) return;
    
    if (!confirm(`确定要删除 "${config.name}" 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/ollama-configs/${configId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ 删除配置成功: ${config.name}`, 'success');
            if (selectedOllama?.id === configId) {
                selectedOllama = null;
                document.getElementById('ollamaTestCard').style.display = 'none';
            }
            await loadOllamaConfigs();
        } else {
            addLog(`❌ 删除失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 删除失败: ${error.message}`, 'error');
    }
}

// ========== 通用功能 ==========

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
    
    // 点击模态框背景关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// 开始自动检测
function startAutoCheck() {
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
    }
    
    autoCheckInterval = setInterval(() => {
        if (currentSection === 'aicore') {
            checkAllConnections();
        }
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
        if (currentSection === 'aicore') {
            checkAllConnections();
        }
    }
}

// 更新切换按钮
function updateToggleButton() {
    const toggleBtn = document.getElementById('toggleAutoBtn');
    if (toggleBtn) {
        if (isAutoChecking) {
            toggleBtn.textContent = '⏸️ 停止自动';
        } else {
            toggleBtn.textContent = '▶️ 启动自动';
        }
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

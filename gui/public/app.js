let autoCheckInterval = null;
let isAutoChecking = true;
let aiCores = [];
let ollamaConfigs = [];
let messagePresets = [];
let selectedCore = null;
let selectedOllama = null;
let selectedMessage = null;
let editingCoreId = null;
let editingOllamaId = null;
let currentSection = 'services';

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
    
    // 控制日志区域的显示
    const logCard = document.getElementById('logCard');
    
    if (section === 'services') {
        document.getElementById('servicesSection').classList.add('active');
        logCard.style.display = 'block';
        // 每次切换到服务管理页面都重新加载最新数据
        loadAICores();
        loadOllamaConfigs();
    } else if (section === 'messages') {
        document.getElementById('messagesSection').classList.add('active');
        logCard.style.display = 'none';
        // 每次切换到消息预设页面都重新加载最新数据
        loadMessages();
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
            
            // 自动选择第一个健康的服务
            const healthyServices = result.data.filter(core => core.status === 'online');
            if (healthyServices.length > 0 && !selectedCore) {
                const firstHealthy = healthyServices[0];
                selectConnection(firstHealthy.id);
                addLog(`✅ 自动选择第一个健康服务: ${firstHealthy.name}`, 'success');
            }
            
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
    
    // 检查连接状态：支持 connected 属性和 status === 'online'
    const isOnline = core.status === 'online';
    
    console.log(core,  isOnline);
    if (isOnline) {
        dot.className = 'status-dot online';
        status.textContent = '在线';
        status.className = 'service-status online';
        time.textContent = `${core.responseTime || 0}ms`;
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
    
    // 显示详细信息卡片（如果存在）
    const detailCard = document.getElementById('detailCard');
    if (detailCard) {
        detailCard.style.display = 'block';
    }
    
    addLog(`✓ 已选择使用: ${core.name}`, 'success');
}

// 更新详细信息
async function updateDetailInfo(core) {
    const healthPane = document.getElementById('healthPane');
    const infoPane = document.getElementById('infoPane');
    
    // 如果详细信息面板不存在，直接返回
    if (!healthPane || !infoPane) {
        return;
    }
    
    // 更新健康检查信息
    const isOnline = core.connected || core.status === 'online';
    if (isOnline && core.data) {
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
    if (isOnline) {
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
                const detailCard = document.getElementById('detailCard');
                if (detailCard) {
                    detailCard.style.display = 'none';
                }
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
            checkAllOllamaConfigs(); // 自动检查所有配置
            addLog(`✅ 加载了 ${ollamaConfigs.length} 个 Ollama 配置`);
        }
    } catch (error) {
        addLog(`❌ 加载 Ollama 配置失败: ${error.message}`, 'error');
    }
}

// 检查所有 Ollama 配置
async function checkAllOllamaConfigs() {
    if (ollamaConfigs.length === 0) return;
    
    try {
        const response = await fetch('/api/ollama-check-all');
        const result = await response.json();
        
        if (result.success) {
            result.data.forEach(config => {
                updateOllamaStatus(config);
            });
            
            // 自动选择第一个健康的配置
            const healthyConfigs = result.data.filter(config => config.status === 'online');
            if (healthyConfigs.length > 0 && !selectedOllama) {
                const firstHealthy = healthyConfigs[0];
                selectOllamaForUse(firstHealthy.id);
                addLog(`✅ 自动选择第一个健康的 Ollama 配置: ${firstHealthy.name}`, 'success');
            }
            
            addLog(`✅ 完成所有 Ollama 配置检测`, 'success');
        }
    } catch (error) {
        addLog(`❌ Ollama 配置检测失败: ${error.message}`, 'error');
    }
}

// 更新 Ollama 配置状态
function updateOllamaStatus(config) {
    // 更新状态显示
    const statusElement = document.getElementById(`ollama-status-${config.id}`);
    if (statusElement) {
        statusElement.textContent = config.status === 'online' ? '在线' : '离线';
        statusElement.className = `service-status ${config.status === 'online' ? 'online' : 'offline'}`;
    }
    
    // 更新响应时间
    const timeElement = document.getElementById(`ollama-time-${config.id}`);
    if (timeElement) {
        timeElement.textContent = `${config.responseTime}ms`;
    }
    
    // 更新最后检测时间
    const lastElement = document.getElementById(`ollama-last-${config.id}`);
    if (lastElement) {
        const time = new Date(config.timestamp).toLocaleTimeString();
        lastElement.textContent = time;
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
                    <div class="model-info">
                        <span class="model-label">模型:</span>
                        <span class="model-name">${config.model}</span>
                    </div>
                </div>
                <div class="service-status" id="ollama-status-${config.id}">检测中...</div>
            </div>
            <div class="service-body">
                <div class="service-description">${config.description}</div>
                <div class="service-url">${config.url}</div>
                <div class="service-stats">
                    <div class="stat-item">
                        <span class="stat-label">模型:</span>
                        <span class="stat-value model-badge">${config.model}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">响应时间:</span>
                        <span class="stat-value response-time" id="ollama-time-${config.id}">--</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最后检测:</span>
                        <span class="stat-value last-check" id="ollama-last-${config.id}">--</span>
                    </div>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn btn-sm btn-outline" onclick="checkOllamaStatus(${config.id})">
                    🔍 检查状态
                </button>
                <button class="btn btn-sm btn-primary" onclick="selectOllamaForUse(${config.id})">
                    ✓ 选择使用
                </button>
                <button class="btn btn-sm btn-warning" onclick="editOllama(${config.id})">
                    ✏️ 编辑
                </button>
            </div>
        </div>
    `).join('');
}

// 选择 Ollama 配置进行测试
// 选择 Ollama 配置进行使用
function selectOllamaForUse(configId) {
    const config = ollamaConfigs.find(c => c.id === configId);
    if (!config) return;
    
    selectedOllama = config;
    
    // 更新选中状态
    document.querySelectorAll('#ollamaGrid .service-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById(`ollama-${configId}`).classList.add('selected');
    
    addLog(`✓ 已选择 Ollama 配置: ${config.name} (${config.model})`, 'success');
}

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
            body: JSON.stringify({ 
                url: config.url,
                model: config.model
            })
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
                        <div class="response-text">${data.message || data.response || JSON.stringify(data.response)}</div>
                    </div>
                    <div class="test-stats">
                        <div class="stat-item">
                            <span class="stat-label">模型:</span>
                            <span class="stat-value">${data.model}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">完整响应:</span>
                            <span class="stat-value">
                                <pre style="font-size: 12px; max-height: 100px; overflow-y: auto;">${JSON.stringify(data.response, null, 2)}</pre>
                            </span>
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

// ========== 消息预设功能 ==========

// 加载消息列表
async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        const result = await response.json();
        
        if (result.success) {
            messagePresets = result.data;
            renderMessagesList();
            addLog(`✅ 加载了 ${messagePresets.length} 条消息预设`);
        }
    } catch (error) {
        addLog(`❌ 加载消息失败: ${error.message}`, 'error');
    }
}

// 渲染消息列表
function renderMessagesList() {
    const messagesList = document.getElementById('messagesList');
    
    if (messagePresets.length === 0) {
        messagesList.innerHTML = '<div class="empty-state">暂无消息预设</div>';
        return;
    }
    
    messagesList.innerHTML = messagePresets.map(msg => `
        <div class="message-item ${selectedMessage?.id === msg.id ? 'active' : ''}" 
             onclick="selectMessage(${msg.id})">
            <div class="message-item-header">
                <h4>${msg.title}</h4>
                <span class="message-type-badge ${msg.type}">${getTypeLabel(msg.type)}</span>
            </div>
            <div class="message-item-preview">${truncate(msg.content, 60)}</div>
            <div class="message-item-meta">
                ${msg.tags ? `<span class="tags">🏷️ ${msg.tags}</span>` : ''}
                <span class="date">${formatDate(msg.updatedAt)}</span>
            </div>
            <div class="message-item-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editMessage(${msg.id})" title="编辑">
                    ✏️
                </button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteMessage(${msg.id})" title="删除">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// 选择消息
function selectMessage(messageId) {
    const message = messagePresets.find(m => m.id === messageId);
    if (!message) return;
    
    selectedMessage = message;
    
    // 更新列表选中状态
    document.querySelectorAll('.message-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget?.classList.add('active');
    
    // 显示消息详情
    displayMessageDetail(message);
    
    addLog(`📄 已选择消息: ${message.title}`);
}

// 显示消息详情
function displayMessageDetail(message) {
    const detailContent = document.getElementById('messageDetailContent');
    const messageActions = document.getElementById('messageActions');
    
    messageActions.style.display = 'flex';
    
    detailContent.innerHTML = `
        <div class="message-detail-form">
            <div class="form-group">
                <label>消息标题</label>
                <input type="text" id="detailTitle" value="${message.title}" class="form-control">
            </div>
            <div class="form-group">
                <label>消息类型</label>
                <select id="detailType" class="form-control">
                    <option value="system" ${message.type === 'system' ? 'selected' : ''}>系统消息</option>
                    <option value="user" ${message.type === 'user' ? 'selected' : ''}>用户消息</option>
                    <option value="assistant" ${message.type === 'assistant' ? 'selected' : ''}>助手消息</option>
                </select>
            </div>
            <div class="form-group">
                <label>消息内容</label>
                <textarea id="detailContent" rows="12" class="form-control">${message.content}</textarea>
            </div>
            <div class="form-group">
                <label>标签</label>
                <input type="text" id="detailTags" value="${message.tags || ''}" class="form-control" placeholder="多个标签用逗号分隔">
            </div>
            <div class="message-meta">
                <div class="meta-item">
                    <strong>创建时间:</strong> ${formatDateTime(message.createdAt)}
                </div>
                <div class="meta-item">
                    <strong>更新时间:</strong> ${formatDateTime(message.updatedAt)}
                </div>
            </div>
        </div>
        <div id="validationResult" class="validation-result" style="display: none;"></div>
    `;
}

// 保存消息内容（更新右侧详情中修改的内容）
async function saveMessageContent() {
    if (!selectedMessage) {
        alert('请先选择一条消息');
        return;
    }
    
    const title = document.getElementById('detailTitle').value.trim();
    const type = document.getElementById('detailType').value;
    const content = document.getElementById('detailContent').value.trim();
    const tags = document.getElementById('detailTags').value.trim();
    
    if (!title || !content) {
        alert('标题和内容不能为空');
        return;
    }
    
    try {
        const response = await fetch(`/api/messages/${selectedMessage.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, type, tags })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ 保存成功: ${title}`, 'success');
            await loadMessages();
            // 重新选择以刷新显示
            selectMessage(selectedMessage.id);
        } else {
            addLog(`❌ 保存失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 保存失败: ${error.message}`, 'error');
    }
}

// 校验消息内容
async function validateMessageContent() {
    if (!selectedMessage) {
        alert('请先选择一条消息');
        return;
    }
    
    const content = document.getElementById('detailContent').value.trim();
    
    try {
        const response = await fetch('/api/messages/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        const result = await response.json();
        
        const validationResult = document.getElementById('validationResult');
        validationResult.style.display = 'block';
        
        if (result.success && result.valid) {
            validationResult.className = 'validation-result success';
            validationResult.innerHTML = `
                <h4>✓ 校验通过</h4>
                <div class="validation-info">
                    <div>字符数: ${result.info.length}</div>
                    <div>行数: ${result.info.lines}</div>
                    <div>单词数: ${result.info.words}</div>
                </div>
            `;
            addLog('✓ 内容校验通过', 'success');
        } else {
            validationResult.className = 'validation-result error';
            validationResult.innerHTML = `
                <h4>✗ 校验失败</h4>
                <ul class="error-list">
                    ${result.errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
            `;
            addLog('✗ 内容校验失败', 'error');
        }
    } catch (error) {
        addLog(`❌ 校验失败: ${error.message}`, 'error');
    }
}

// 显示新建消息模态框
function showAddMessageModal() {
    document.getElementById('messageModalTitle').textContent = '新建消息';
    document.getElementById('messageTitle').value = '';
    document.getElementById('messageContent').value = '';
    document.getElementById('messageType').value = 'user';
    document.getElementById('messageTags').value = '';
    document.getElementById('messageModal').style.display = 'flex';
}

// 编辑消息（通过模态框）
function editMessage(messageId) {
    const message = messagePresets.find(m => m.id === messageId);
    if (!message) return;
    
    selectedMessage = message;
    document.getElementById('messageModalTitle').textContent = '编辑消息';
    document.getElementById('messageTitle').value = message.title;
    document.getElementById('messageContent').value = message.content;
    document.getElementById('messageType').value = message.type;
    document.getElementById('messageTags').value = message.tags || '';
    document.getElementById('messageModal').style.display = 'flex';
}

// 关闭消息模态框
function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
}

// 保存消息（模态框）
async function saveMessage() {
    const title = document.getElementById('messageTitle').value.trim();
    const content = document.getElementById('messageContent').value.trim();
    const type = document.getElementById('messageType').value;
    const tags = document.getElementById('messageTags').value.trim();
    
    if (!title || !content) {
        alert('标题和内容不能为空');
        return;
    }
    
    try {
        let response;
        if (selectedMessage && document.getElementById('messageModalTitle').textContent === '编辑消息') {
            // 更新
            response = await fetch(`/api/messages/${selectedMessage.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, type, tags })
            });
        } else {
            // 新建
            response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, type, tags })
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ ${selectedMessage ? '更新' : '创建'}消息成功: ${title}`, 'success');
            closeMessageModal();
            await loadMessages();
            
            // 如果是新创建的，自动选中
            if (!selectedMessage) {
                selectMessage(result.data.id);
            }
        } else {
            addLog(`❌ 操作失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 操作失败: ${error.message}`, 'error');
    }
}

// 删除消息
async function deleteMessage(messageId) {
    const message = messagePresets.find(m => m.id === messageId);
    if (!message) return;
    
    if (!confirm(`确定要删除消息 "${message.title}" 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`✅ 删除消息成功: ${message.title}`, 'success');
            
            // 如果删除的是当前选中的消息，清空右侧
            if (selectedMessage?.id === messageId) {
                selectedMessage = null;
                document.getElementById('messageDetailContent').innerHTML = '<div class="empty-state">请从左侧选择一条消息</div>';
                document.getElementById('messageActions').style.display = 'none';
            }
            
            await loadMessages();
        } else {
            addLog(`❌ 删除失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 删除失败: ${error.message}`, 'error');
    }
}

// ========== 工具函数 ==========

function getTypeLabel(type) {
    const labels = {
        'system': '系统',
        'user': '用户',
        'assistant': '助手'
    };
    return labels[type] || type;
}

function truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN');
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
}

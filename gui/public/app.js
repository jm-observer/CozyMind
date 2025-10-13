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
let lastCheckResults = new Map(); // 存储最后的检测结果
let lastOllamaCheckResults = new Map(); // 存储Ollama最后的检测结果
let aiCoresLoaded = false; // 标记AI-Core列表是否已加载
let ollamaConfigsLoaded = false; // 标记Ollama配置列表是否已加载
let isFirstLoad = true; // 标记是否是首次加载
let isFirstModelSetupUpdate = true; // 标记是否是模型设定页面的首次状态更新

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

    console.log('切换到', section);
    
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
        // 首次加载时加载数据，之后只显示缓存数据
        if (!aiCoresLoaded) {
            console.log('切换到服务管理：首次加载，调用loadAICores()');
            loadAICores();
        } else {
            console.log('切换到服务管理：已加载，不调用API');
        }
        
        if (!ollamaConfigsLoaded) {
            console.log('切换到服务管理：首次加载，调用loadOllamaConfigs()');
            loadOllamaConfigs();
        } else {
            console.log('切换到服务管理：已加载Ollama，不调用API');
        }
    } else if (section === 'messages') {
        document.getElementById('messagesSection').classList.add('active');
        logCard.style.display = 'none';
        // 每次切换到消息预设页面都重新加载最新数据
        loadMessages();
    } else if (section === 'model-setup') {
        console.log('Switching to model-setup section');
        const modelSetupSection = document.getElementById('modelSetupSection');
        if (modelSetupSection) {
            modelSetupSection.classList.add('active');
            console.log('Model setup section activated');
            console.log('Model setup section classes:', modelSetupSection.className);
            console.log('Model setup section display:', window.getComputedStyle(modelSetupSection).display);
        } else {
            console.error('Model setup section not found');
        }
        logCard.style.display = 'none';
        console.log('调用 initModelSetup()，aiCores缓存状态:', aiCoresLoaded, '服务数量:', aiCores.length);
        initModelSetup();
    } else if (section === 'chat') {
        console.log('Switching to chat section');
        const chatSection = document.getElementById('chatSection');
        if (chatSection) {
            chatSection.classList.add('active');
            console.log('Chat section activated');
        } else {
            console.error('Chat section not found');
        }
        logCard.style.display = 'none';
        initChat();
    }
}

// ========== AI-Core 功能 ==========

// 同步更新模型设定页面的下拉框
// autoSelect: 是否尝试自动选择第一个健康服务
function updateModelSetupSelect(autoSelect = false) {
    console.log('🔄 updateModelSetupSelect() 被调用，autoSelect:', autoSelect);
    const select = document.getElementById('modelAiCoreSelect');
    if (!select) {
        console.log('❌ modelAiCoreSelect 元素未找到');
        return;
    }
    
    console.log('📊 当前状态 - aiCores.length:', aiCores.length, 'isFirstModelSetupUpdate:', isFirstModelSetupUpdate);
    
    select.innerHTML = '<option value="">-- 请选择 AI-Core 服务 --</option>';
    
    if (aiCores.length === 0) {
        console.log('⚠️ aiCores 数组为空，跳过更新');
        return;
    }
    
    let firstHealthyService = null;
    
    aiCores.forEach((core) => {
        const checkResult = lastCheckResults.get(core.id);
        const isHealthy = checkResult && checkResult.status === 'online';
        console.log(`🔍 服务 ${core.name} (ID:${core.id}) - 健康状态:`, isHealthy, '检查结果:', checkResult);
        
        if (isHealthy && !firstHealthyService) {
            firstHealthyService = core;
            console.log('✅ 找到第一个健康服务:', core.name);
        }
        
        const option = document.createElement('option');
        option.value = core.id;
        const healthIcon = isHealthy ? '🟢' : '🔴';
        const healthText = isHealthy ? '健康' : '离线';
        option.textContent = `${healthIcon} ${core.name} (${core.url}) - ${healthText}`;
        option.dataset.url = core.url;
        option.dataset.healthy = isHealthy;
        
        select.appendChild(option);
    });
    
    console.log('🎯 自动选择判断 - autoSelect:', autoSelect, 'firstHealthyService:', firstHealthyService?.name, 'isFirstModelSetupUpdate:', isFirstModelSetupUpdate);
    
    // 只有在状态更新时且首次更新时才自动选择第一个健康的服务
    if (autoSelect && firstHealthyService && isFirstModelSetupUpdate) {
        console.log('🚀 自动选择第一个健康服务:', firstHealthyService.name);
        select.value = firstHealthyService.id;
        // 触发change事件，确保状态同步
        select.dispatchEvent(new Event('change'));
        // 首次更新完成后，设置标志为false
        isFirstModelSetupUpdate = false;
        console.log('✅ 设置 isFirstModelSetupUpdate = false');
    } else {
        console.log('⏭️ 跳过自动选择 - 原因:', !autoSelect ? 'autoSelect=false' : !firstHealthyService ? '没有健康服务' : '不是首次更新');
    }
}

// 同步更新模型设定页面的单个服务状态
function updateModelSetupSelectStatus(core) {
    const select = document.getElementById('modelAiCoreSelect');
    if (!select) return;
    
    const option = select.querySelector(`option[value="${core.id}"]`);
    if (!option) return;
    
    const isHealthy = core.status === 'online';
    const healthIcon = isHealthy ? '🟢' : '🔴';
    const healthText = isHealthy ? '健康' : '离线';
    option.textContent = `${healthIcon} ${core.name} (${core.url}) - ${healthText}`;
    option.dataset.healthy = isHealthy;
}

// 重新加载 AI-Core 服务列表
async function reloadAICores() {
    addLog('🔄 重新加载 AI-Core 服务列表...');
    aiCoresLoaded = false; // 重置加载标志
    isFirstLoad = true; // 重置首次加载标志
    isFirstModelSetupUpdate = true; // 重置模型设定首次更新标志
    await loadAICores();
}

// 加载所有 AI-Core 配置
async function loadAICores() {
    console.log('📥 loadAICores() 被调用');
    try {
        console.log('🌐 请求 /api/ai-cores');
        const response = await fetch('/api/ai-cores');
        const result = await response.json();
        
        if (result.success) {
            aiCores = result.data;
            aiCoresLoaded = true; // 标记已加载
            console.log('✅ 设置 aiCoresLoaded = true');
            console.log('🔄 调用 renderServices()');
            renderServices();
            console.log('🔍 调用 checkAllConnections()');
            checkAllConnections();
            // 不再自动启动定时器，只有用户手动检测
            // startAutoCheck();
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
        // 同步清空模型设定页面的下拉框（初始化，不自动选择）
        updateModelSetupSelect(false);
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
    
    // 同步更新模型设定页面的下拉框（初始化，不自动选择）
    console.log('🔄 renderServices() 调用 updateModelSetupSelect(false) - 初始化，不自动选择');
    updateModelSetupSelect(false);
}

// 检测所有连接
async function checkAllConnections() {
    if (aiCores.length === 0) return;
    
    console.log('🔍 checkAllConnections() 开始检测');
    
    try {
        const response = await fetch('/api/check-all');
        const result = await response.json();
        
        if (result.success) {
            result.data.forEach(core => {
                updateServiceStatus(core);
                // 存储检测结果
                lastCheckResults.set(core.id, core);
            });
            
            // 更新aiCores数组，确保与检测结果同步
            aiCores.forEach(originalCore => {
                const updatedCore = result.data.find(c => c.id === originalCore.id);
                if (updatedCore) {
                    // 更新aiCores中的状态信息
                    Object.assign(originalCore, {
                        status: updatedCore.status,
                        response_time: updatedCore.response_time || updatedCore.responseTime,
                        timestamp: updatedCore.timestamp,
                        message: updatedCore.message
                    });
                }
            });
            
            // 只有在首次加载时才自动选择第一个健康的服务（服务管理页面）
            const healthyServices = result.data.filter(core => core.status === 'online');
            if (healthyServices.length > 0 && !selectedCore && isFirstLoad) {
                const firstHealthy = healthyServices[0];
                selectConnection(firstHealthy.id, true); // 传递true表示是自动选择
                addLog(`✅ 自动选择第一个健康服务: ${firstHealthy.name}`, 'success');
            }
            
            // 状态更新完成后，同步更新模型设定页面的下拉框（允许自动选择）
            console.log('🔄 checkAllConnections() 调用 updateModelSetupSelect(true) - 状态更新，允许自动选择');
            updateModelSetupSelect(true);
            
            addLog(`✅ 完成所有服务检测`, 'success');
            
            // 首次加载完成后，设置标志为false
            if (isFirstLoad) {
                isFirstLoad = false;
            }
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
            body: JSON.stringify({ id: core.id, url: core.url })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const coreData = { ...core, ...result.data };
            updateServiceStatus(coreData);
            // 存储检测结果
            lastCheckResults.set(coreId, coreData);
            
            // 更新aiCores数组中对应服务的状态信息
            Object.assign(core, {
                status: result.data.status,
                response_time: result.data.response_time || result.data.responseTime,
                timestamp: result.data.timestamp,
                message: result.data.message
            });
            
            if (result.data.status === 'online') {
                addLog(`✅ ${core.name} 连接成功 - 响应时间: ${result.data.response_time}ms`, 'success');
            } else {
                addLog(`❌ ${core.name} 连接失败 - ${result.data.message}`, 'error');
            }
        } else {
            addLog(`❌ ${core.name} 检测失败 - ${result.error}`, 'error');
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
    
    if (isOnline) {
        dot.className = 'status-dot online';
        status.textContent = '在线';
        status.className = 'service-status online';
        time.textContent = `${core.response_time || core.responseTime || 0}ms`;
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
    
    // 同步更新模型设定页面的下拉框状态
    updateModelSetupSelectStatus(core);
}

// 选择连接
async function selectConnection(coreId, isAutoSelect = false) {
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
    
    // 如果是自动选择且已有检测结果，直接使用缓存的结果
    if (isAutoSelect && lastCheckResults.has(coreId)) {
        const cachedResult = lastCheckResults.get(coreId);
        updateDetailInfo(cachedResult);
    } else {
        // 手动选择或没有缓存结果时，进行检测
        await checkSingleConnection(coreId);
    }
    
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
    const isOnline = core.status === 'online';
    if (isOnline) {
        healthPane.innerHTML = `
            <div class="info-item">
                <strong>状态:</strong> <span class="badge badge-success">${core.status || 'N/A'}</span>
            </div>
            <div class="info-item">
                <strong>消息:</strong> ${core.message || 'N/A'}
            </div>
            <div class="info-item">
                <strong>版本:</strong> ${core.version || 'N/A'}
            </div>
            <div class="info-item">
                <strong>响应时间:</strong> ${core.response_time || core.responseTime || 0}ms
            </div>
            <div class="info-item">
                <strong>检测时间:</strong> ${new Date(core.timestamp).toLocaleString('zh-CN')}
            </div>
        `;
    } else {
        healthPane.innerHTML = `
            <div class="info-item error">
                <strong>连接失败:</strong> ${core.message || '无法连接到服务'}
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
            aiCoresLoaded = false; // 标记需要重新加载
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
            aiCoresLoaded = false; // 标记需要重新加载
            await loadAICores();
        } else {
            addLog(`❌ 删除失败: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ 删除失败: ${error.message}`, 'error');
    }
}

// ========== Ollama 功能 ==========

// 重新加载 Ollama 配置列表
async function reloadOllamaConfigs() {
    addLog('🔄 重新加载 Ollama 配置列表...');
    ollamaConfigsLoaded = false; // 重置加载标志
    await loadOllamaConfigs();
}

// 加载 Ollama 配置
async function loadOllamaConfigs() {
    try {
        const response = await fetch('/api/ollama-configs');
        const result = await response.json();
        
        if (result.success) {
            ollamaConfigs = result.data;
            ollamaConfigsLoaded = true; // 标记已加载
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
                // 存储检测结果
                lastOllamaCheckResults.set(config.id, config);
            });
            
            // 自动选择第一个健康的配置
            const healthyConfigs = result.data.filter(config => config.status === 'online');
            if (healthyConfigs.length > 0 && !selectedOllama) {
                const firstHealthy = healthyConfigs[0];
                selectOllamaForUse(firstHealthy.id, true); // 传递true表示是自动选择
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
    // 更新状态点
    const dotElement = document.getElementById(`ollama-dot-${config.id}`);
    if (dotElement) {
        if (config.status === 'online') {
            dotElement.className = 'status-dot online';
        } else {
            dotElement.className = 'status-dot offline';
        }
    }
    
    // 更新状态显示
    const statusElement = document.getElementById(`ollama-status-${config.id}`);
    if (statusElement) {
        statusElement.textContent = config.status === 'online' ? '在线' : '离线';
        statusElement.className = `service-status ${config.status === 'online' ? 'online' : 'offline'}`;
    }
    
    // 更新响应时间
    const timeElement = document.getElementById(`ollama-time-${config.id}`);
    if (timeElement) {
        timeElement.textContent = `${config.response_time || config.responseTime || 0}ms`;
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
                    <span class="status-dot checking" id="ollama-dot-${config.id}"></span>
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
function selectOllamaForUse(configId, isAutoSelect = false) {
    const config = ollamaConfigs.find(c => c.id === configId);
    if (!config) return;
    
    selectedOllama = config;
    
    // 更新选中状态
    document.querySelectorAll('#ollamaGrid .service-item').forEach(item => {
        item.classList.remove('selected');
    });
    const ollamaItem = document.getElementById(`ollama-${configId}`);
    if (ollamaItem) {
        ollamaItem.classList.add('selected');
    }
    
    // 如果是自动选择，使用缓存的检测结果来更新状态显示
    if (isAutoSelect && lastOllamaCheckResults.has(configId)) {
        const cachedResult = lastOllamaCheckResults.get(configId);
        updateOllamaStatus(cachedResult);
    }
    
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
            ollamaConfigsLoaded = false; // 标记需要重新加载
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
            ollamaConfigsLoaded = false; // 标记需要重新加载
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
        if (currentSection === 'services') {
            checkAllConnections();
            checkAllOllamaConfigs();
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

function getMessageTypeLabel(type) {
    const typeLabels = {
        'system': '系统消息',
        'user': '用户消息',
        'event': '事件消息',
        'assistant': '助手消息'
    };
    return typeLabels[type] || type;
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

// ========== 模型设定功能 ==========

// 初始化模型设定页面
async function initModelSetup() {
    console.log('Initializing model setup...');
    
    // 检查关键元素是否存在
    const modelSetupSection = document.getElementById('modelSetupSection');
    const modelSetupCard = document.querySelector('.model-setup-card');
    const select = document.getElementById('modelAiCoreSelect');
    const textarea = document.getElementById('systemPromptInput');
    
    console.log('Model setup section:', modelSetupSection);
    console.log('Model setup card:', modelSetupCard);
    console.log('AI Core select:', select);
    console.log('System prompt textarea:', textarea);
    
    // 检查父元素
    const mainElement = document.querySelector('main');
    console.log('Main element:', mainElement);
    if (mainElement) {
        console.log('Main element padding:', window.getComputedStyle(mainElement).padding);
        console.log('Main element display:', window.getComputedStyle(mainElement).display);
    }
    
    if (!modelSetupSection) {
        console.error('Model setup section not found!');
        return;
    }
    
    if (!modelSetupCard) {
        console.error('Model setup card not found!');
        return;
    }
    
    console.log('Model setup card found and ready');
    
    // 使用同步更新的下拉框，无需重新加载
    console.log('模型设定：使用已同步的下拉框数据');
    // 加载消息预设
    await loadMessages();
    // 更新字符计数
    updateCharCount();
    console.log('Model setup initialized, messagePresets loaded:', messagePresets.length);
    
    // 测试按钮点击事件
    const testButton = document.querySelector('button[onclick="showMessageSelector()"]');
    if (testButton) {
        console.log('Message selector button found:', testButton);
        // 添加额外的点击事件监听器
        testButton.addEventListener('click', function(e) {
            console.log('Button clicked via event listener');
            e.preventDefault();
            showMessageSelector();
        });
    } else {
        console.error('Message selector button not found!');
    }
}

// 检查 AI-Core 服务可用性
async function checkAiCoreAvailability() {
    console.log('🔍 checkAiCoreAvailability() 被调用');
    const select = document.getElementById('modelAiCoreSelect');
    const statusDiv = document.getElementById('aiCoreStatus');
    const sendButton = document.getElementById('sendButton');
    
    if (!select.value) {
        console.log('⚠️ 没有选择服务，清空状态显示');
        statusDiv.innerHTML = '';
        sendButton.disabled = false;
        return;
    }
    
    const option = select.options[select.selectedIndex];
    const isHealthy = option.dataset.healthy === 'true';
    console.log(`📊 选中服务: ${option.textContent}, 健康状态:`, isHealthy);
    
    // 显示状态
    if (isHealthy) {
        statusDiv.innerHTML = '<span class="status-online">🟢 服务健康</span>';
        sendButton.disabled = false;
        console.log('✅ 服务健康，启用发送按钮');
    } else {
        statusDiv.innerHTML = '<span class="status-offline">🔴 服务离线</span>';
        sendButton.disabled = true;
        console.log('❌ 服务离线，禁用发送按钮');
    }
}

// 显示消息选择器
function showMessageSelector() {
    console.log('showMessageSelector called, messagePresets length:', messagePresets.length);
    
    const modal = document.getElementById('messageSelectorModal');
    const listDiv = document.getElementById('messageSelectorList');
    
    console.log('Modal element:', modal);
    console.log('List div element:', listDiv);
    
    if (!modal) {
        console.error('Message selector modal not found!');
        return;
    }
    
    if (!listDiv) {
        console.error('Message selector list div not found!');
        return;
    }
    
    // 填充消息列表
    listDiv.innerHTML = '';
    
    if (messagePresets.length === 0) {
        console.log('No message presets available');
        listDiv.innerHTML = '<p class="empty-message">暂无消息预设，请先在"消息预设"页面创建</p>';
    } else {
        console.log('Loading message presets:', messagePresets);
        messagePresets.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'message-selector-item';
            item.innerHTML = `
                <div class="message-title">${msg.title}</div>
                <div class="message-preview">${truncate(msg.content, 100)}</div>
                <div class="message-type-badge">${getMessageTypeLabel(msg.type)}</div>
            `;
            item.onclick = () => selectMessageForPrompt(msg);
            listDiv.appendChild(item);
        });
    }
    
    modal.style.display = 'flex';
    console.log('Modal displayed');
}

// 关闭消息选择器
function closeMessageSelector() {
    document.getElementById('messageSelectorModal').style.display = 'none';
}

// 选择消息填充到系统参数输入框
function selectMessageForPrompt(message) {
    document.getElementById('systemPromptInput').value = message.content;
    updateCharCount();
    closeMessageSelector();
}

// 清空系统参数
function clearSystemPrompt() {
    document.getElementById('systemPromptInput').value = '';
    updateCharCount();
}

// 更新字符计数
function updateCharCount() {
    const textarea = document.getElementById('systemPromptInput');
    const countSpan = document.getElementById('promptCharCount');
    if (textarea && countSpan) {
        countSpan.textContent = textarea.value.length;
    }
}

// 发送系统参数
async function sendSystemPrompt() {
    const select = document.getElementById('modelAiCoreSelect');
    const promptInput = document.getElementById('systemPromptInput');
    const sessionIdInput = document.getElementById('sessionIdInput');
    const resultDiv = document.getElementById('modelSetupResult');
    const resultContent = document.getElementById('resultContent');
    const sendButton = document.getElementById('sendButton');
    
    // 验证输入
    if (!select.value) {
        alert('请选择 AI-Core 服务');
        return;
    }
    
    if (!promptInput.value.trim()) {
        alert('请输入系统参数');
        return;
    }
    
    // 获取选中的服务信息并检查健康状态
    const option = select.options[select.selectedIndex];
    if (option.dataset.healthy !== 'true') {
        alert('所选服务当前不可用，请选择一个健康的服务');
        return;
    }
    
    const url = `${option.dataset.url}/api/system-prompt`;
    
    // 准备请求数据
    const requestData = {
        system_prompt: promptInput.value.trim()
    };
    
    if (sessionIdInput.value.trim()) {
        requestData.session_id = sessionIdInput.value.trim();
    }
    
    // 显示加载状态
    sendButton.disabled = true;
    sendButton.textContent = '⏳ 发送中...';
    resultDiv.style.display = 'block';
    resultContent.innerHTML = '<div class="loading">正在发送请求...</div>';
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            // 成功
            resultContent.innerHTML = `
                <div class="result-success">
                    <h4>✅ 发送成功</h4>
                    <div class="result-item">
                        <strong>状态:</strong> ${data.status}
                    </div>
                    <div class="result-item">
                        <strong>消息:</strong> ${data.message || '无'}
                    </div>
                    <div class="result-item">
                        <strong>会话 ID:</strong> 
                        <code>${data.session_id || '未返回'}</code>
                    </div>
                    <div class="result-item">
                        <strong>系统参数:</strong>
                        <pre>${promptInput.value}</pre>
                    </div>
                </div>
            `;
            
            // 如果返回了 session_id，更新输入框
            if (data.session_id && !sessionIdInput.value) {
                sessionIdInput.value = data.session_id;
            }
        } else {
            // 失败
            resultContent.innerHTML = `
                <div class="result-error">
                    <h4>❌ 发送失败</h4>
                    <div class="result-item">
                        <strong>错误:</strong> ${data.error || data.message || '未知错误'}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        resultContent.innerHTML = `
            <div class="result-error">
                <h4>❌ 请求失败</h4>
                <div class="result-item">
                    <strong>错误:</strong> ${error.message}
                </div>
                <div class="result-item">
                    <strong>建议:</strong> 请检查网络连接和服务状态
                </div>
            </div>
        `;
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = '🚀 发送系统参数';
    }
}

// 重置表单
function resetModelSetupForm() {
    document.getElementById('modelAiCoreSelect').value = '';
    document.getElementById('systemPromptInput').value = '';
    document.getElementById('sessionIdInput').value = '';
    document.getElementById('aiCoreStatus').innerHTML = '';
    document.getElementById('modelSetupResult').style.display = 'none';
    updateCharCount();
}

// ========== 用户对话功能 ==========

let chatHistory = [];
let chatStats = { sent: 0, received: 0 };
let mqttConnected = false;

// 初始化对话页面
function initChat() {
    console.log('Initializing chat...');
    renderChatMessages();
    updateChatStats();
    updateChatCharCount();
    
    // 绑定输入框事件
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', updateChatCharCount);
    }
    console.log('Chat initialized');
}

// 更新对话字符计数
function updateChatCharCount() {
    const textarea = document.getElementById('chatInput');
    const countSpan = document.getElementById('chatCharCount');
    if (textarea && countSpan) {
        countSpan.textContent = textarea.value.length;
    }
}

// 处理键盘事件 (Ctrl+Enter 发送)
function handleChatKeydown(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        sendChatMessage();
    }
}

// 连接 MQTT
async function connectMqtt() {
    const host = document.getElementById('chatBrokerHost').value;
    const port = document.getElementById('chatBrokerPort').value;
    const subscribeTopic = document.getElementById('chatSubscribeTopic').value;
    const statusDiv = document.getElementById('mqttStatus');
    const connectBtn = document.getElementById('mqttConnectButton');
    const disconnectBtn = document.getElementById('mqttDisconnectButton');
    
    connectBtn.disabled = true;
    connectBtn.textContent = '⏳ 连接中...';
    statusDiv.innerHTML = '<span class="status-connecting">🔄 连接中...</span>';
    
    try {
        const response = await fetch('/api/mqtt/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host,
                port: parseInt(port),
                subscribe_topic: subscribeTopic
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            mqttConnected = true;
            statusDiv.innerHTML = '<span class="status-connected">🟢 已连接</span>';
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'block';
            addChatSystemMessage(`✅ MQTT 连接成功 (${host}:${port})`);
            
            // 开始轮询消息
            startMqttPolling();
        } else {
            throw new Error(data.error || '连接失败');
        }
    } catch (error) {
        statusDiv.innerHTML = '<span class="status-disconnected">❌ 连接失败</span>';
        addChatSystemMessage(`❌ MQTT 连接失败: ${error.message}`);
    } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = '🔌 连接 MQTT';
    }
}

// 断开 MQTT
async function disconnectMqtt() {
    const statusDiv = document.getElementById('mqttStatus');
    const connectBtn = document.getElementById('mqttConnectButton');
    const disconnectBtn = document.getElementById('mqttDisconnectButton');
    
    try {
        const response = await fetch('/api/mqtt/disconnect', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            mqttConnected = false;
            statusDiv.innerHTML = '<span class="status-disconnected">⚫ 未连接</span>';
            connectBtn.style.display = 'block';
            disconnectBtn.style.display = 'none';
            addChatSystemMessage('🔌 MQTT 已断开');
            stopMqttPolling();
        }
    } catch (error) {
        addChatSystemMessage(`❌ 断开失败: ${error.message}`);
    }
}

let mqttPollingInterval = null;

// 开始轮询 MQTT 消息
function startMqttPolling() {
    if (mqttPollingInterval) return;
    
    mqttPollingInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/mqtt/messages');
            const data = await response.json();
            
            if (data.success && data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    addChatMessage('assistant', msg.payload, new Date(msg.timestamp));
                    chatStats.received++;
                });
                updateChatStats();
            }
        } catch (error) {
            console.error('轮询消息失败:', error);
        }
    }, 1000); // 每秒轮询一次
}

// 停止轮询
function stopMqttPolling() {
    if (mqttPollingInterval) {
        clearInterval(mqttPollingInterval);
        mqttPollingInterval = null;
    }
}

// 发送对话消息
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const sendButton = document.getElementById('chatSendButton');
    const message = input.value.trim();
    
    if (!message) {
        alert('请输入消息内容');
        return;
    }
    
    if (!mqttConnected) {
        alert('请先连接 MQTT Broker');
        return;
    }
    
    const publishTopic = document.getElementById('chatPublishTopic').value;
    
    sendButton.disabled = true;
    sendButton.textContent = '⏳ 发送中...';
    
    try {
        // 构造 Envelope 消息
        const envelope = {
            type: 'user',
            content: message,
            meta: {
                schema_version: 'v0',
                timestamp: new Date().toISOString()
            }
        };
        
        const response = await fetch('/api/mqtt/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: publishTopic,
                payload: JSON.stringify(envelope)
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // 添加到对话历史
            addChatMessage('user', message, new Date());
            chatStats.sent++;
            updateChatStats();
            
            // 清空输入框
            input.value = '';
            updateChatCharCount();
        } else {
            throw new Error(data.error || '发送失败');
        }
    } catch (error) {
        addChatSystemMessage(`❌ 发送失败: ${error.message}`);
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = '🚀 发送';
    }
}

// 添加对话消息到界面
function addChatMessage(role, content, timestamp) {
    const messagesDiv = document.getElementById('chatMessages');
    
    // 移除欢迎消息
    const welcome = messagesDiv.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${role}`;
    
    const time = timestamp.toLocaleTimeString('zh-CN');
    const roleLabel = role === 'user' ? '👤 用户' : '🤖 助手';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-role">${roleLabel}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    
    // 滚动到底部
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 保存到历史
    chatHistory.push({ role, content, timestamp: timestamp.toISOString() });
}

// 添加系统消息
function addChatSystemMessage(message) {
    const messagesDiv = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message chat-message-system';
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(message)}</div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 渲染对话消息
function renderChatMessages() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.innerHTML = '';
    
    if (chatHistory.length === 0) {
        messagesDiv.innerHTML = `
            <div class="chat-welcome">
                <p>👋 欢迎使用 CozyMind 对话功能</p>
                <p>输入消息后，将通过 MQTT 发送到 AI-Core 服务处理</p>
            </div>
        `;
    } else {
        chatHistory.forEach(msg => {
            addChatMessage(msg.role, msg.content, new Date(msg.timestamp));
        });
    }
}

// 清空对话历史
function clearChatHistory() {
    if (confirm('确定要清空所有对话记录吗？')) {
        chatHistory = [];
        renderChatMessages();
        chatStats = { sent: 0, received: 0 };
        updateChatStats();
        addChatSystemMessage('🗑️ 对话历史已清空');
    }
}

// 更新统计信息
function updateChatStats() {
    document.getElementById('statSentCount').textContent = chatStats.sent;
    document.getElementById('statReceivedCount').textContent = chatStats.received;
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

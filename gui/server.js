const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 10086;

// 支持的 AI-Core 地址列表（可动态修改）
let AI_CORE_URLS = [
    { id: 1, name: 'AI-Core 主服务', url: 'http://127.0.0.1:9800', description: '主要AI处理服务' },
    { id: 2, name: 'AI-Core 备用服务', url: 'http://127.0.0.1:9801', description: '备用AI处理服务' },
    { id: 3, name: 'AI-Core 测试服务', url: 'http://127.0.0.1:9802', description: '测试环境服务' }
];

// Ollama 配置列表
let OLLAMA_CONFIGS = [
    { id: 1, name: 'Ollama 本地', url: 'http://localhost:11434', model: 'llama2', description: '本地Ollama服务' }
];

// 消息预设列表
let MESSAGE_PRESETS = [
    { 
        id: 1, 
        title: '系统提示词', 
        content: 'You are a helpful AI assistant. Please provide clear and concise answers.', 
        type: 'system',
        tags: '系统, 通用',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    { 
        id: 2, 
        title: '友好问候', 
        content: 'Hello! How can I help you today?', 
        type: 'assistant',
        tags: '问候, 开场',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

let nextCoreId = 4;
let nextOllamaId = 2;
let nextMessageId = 3;

// 静态文件服务
app.use(express.static('public'));
app.use(express.json());

// API: 获取所有 AI-Core 地址
app.get('/api/ai-cores', (req, res) => {
    res.json({
        success: true,
        data: AI_CORE_URLS
    });
});

// API: 检测单个 AI-Core 连接状态
app.post('/api/check-connection', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }
    
    const startTime = Date.now();
    
    try {
        const response = await axios.get(`${url}/health`, {
            timeout: 3000
        });
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connected: true,
            status: 'online',
            data: response.data,
            responseTime,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connected: false,
            status: 'offline',
            error: error.message,
            responseTime,
            timestamp: new Date().toISOString()
        });
    }
});

// API: 检测所有 AI-Core 连接状态
app.get('/api/check-all', async (req, res) => {
    const results = await Promise.all(
        AI_CORE_URLS.map(async (core) => {
            const startTime = Date.now();
            
            try {
                const response = await axios.get(`${core.url}/health`, {
                    timeout: 3000
                });
                
                const responseTime = Date.now() - startTime;
                
                return {
                    ...core,
                    connected: true,
                    status: 'online',
                    data: response.data,
                    responseTime,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                const responseTime = Date.now() - startTime;
                
                return {
                    ...core,
                    connected: false,
                    status: 'offline',
                    error: error.message,
                    responseTime,
                    timestamp: new Date().toISOString()
                };
            }
        })
    );
    
    res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
    });
});

// API: 获取 AI-Core 基本信息
app.post('/api/ai-core-info', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }
    
    try {
        const response = await axios.get(`${url}/`, {
            timeout: 3000
        });
        
        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API: 添加 AI-Core 地址
app.post('/api/ai-cores', (req, res) => {
    const { name, url, description } = req.body;
    
    if (!name || !url) {
        return res.status(400).json({
            success: false,
            error: 'Name and URL are required'
        });
    }
    
    const newCore = {
        id: nextCoreId++,
        name,
        url,
        description: description || ''
    };
    
    AI_CORE_URLS.push(newCore);
    
    res.json({
        success: true,
        data: newCore
    });
});

// API: 更新 AI-Core 地址
app.put('/api/ai-cores/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, url, description } = req.body;
    
    const index = AI_CORE_URLS.findIndex(core => core.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'AI-Core not found'
        });
    }
    
    if (name) AI_CORE_URLS[index].name = name;
    if (url) AI_CORE_URLS[index].url = url;
    if (description !== undefined) AI_CORE_URLS[index].description = description;
    
    res.json({
        success: true,
        data: AI_CORE_URLS[index]
    });
});

// API: 删除 AI-Core 地址
app.delete('/api/ai-cores/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    const index = AI_CORE_URLS.findIndex(core => core.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'AI-Core not found'
        });
    }
    
    AI_CORE_URLS.splice(index, 1);
    
    res.json({
        success: true,
        message: 'AI-Core deleted successfully'
    });
});

// ========== Ollama API ==========

// API: 获取所有 Ollama 配置
app.get('/api/ollama-configs', (req, res) => {
    res.json({
        success: true,
        data: OLLAMA_CONFIGS
    });
});

// API: 添加 Ollama 配置
app.post('/api/ollama-configs', (req, res) => {
    const { name, url, model, description } = req.body;
    
    if (!name || !url || !model) {
        return res.status(400).json({
            success: false,
            error: 'Name, URL and model are required'
        });
    }
    
    const newConfig = {
        id: nextOllamaId++,
        name,
        url,
        model,
        description: description || ''
    };
    
    OLLAMA_CONFIGS.push(newConfig);
    
    res.json({
        success: true,
        data: newConfig
    });
});

// API: 更新 Ollama 配置
app.put('/api/ollama-configs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, url, model, description } = req.body;
    
    const index = OLLAMA_CONFIGS.findIndex(config => config.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Ollama config not found'
        });
    }
    
    if (name) OLLAMA_CONFIGS[index].name = name;
    if (url) OLLAMA_CONFIGS[index].url = url;
    if (model) OLLAMA_CONFIGS[index].model = model;
    if (description !== undefined) OLLAMA_CONFIGS[index].description = description;
    
    res.json({
        success: true,
        data: OLLAMA_CONFIGS[index]
    });
});

// API: 删除 Ollama 配置
app.delete('/api/ollama-configs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    const index = OLLAMA_CONFIGS.findIndex(config => config.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Ollama config not found'
        });
    }
    
    OLLAMA_CONFIGS.splice(index, 1);
    
    res.json({
        success: true,
        message: 'Ollama config deleted successfully'
    });
});

// API: 测试 Ollama 连接
app.post('/api/ollama-test', async (req, res) => {
    const { url, model, prompt } = req.body;
    
    if (!url || !model) {
        return res.status(400).json({
            success: false,
            error: 'URL and model are required'
        });
    }
    
    const testPrompt = prompt || 'Hello, this is a test message. Please respond briefly.';
    const startTime = Date.now();
    
    try {
        // 尝试连接 Ollama API
        const response = await axios.post(`${url}/api/generate`, {
            model: model,
            prompt: testPrompt,
            stream: false
        }, {
            timeout: 30000 // 30秒超时
        });
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connected: true,
            data: {
                response: response.data.response,
                model: response.data.model,
                total_duration: response.data.total_duration,
                load_duration: response.data.load_duration,
                prompt_eval_count: response.data.prompt_eval_count,
                eval_count: response.data.eval_count
            },
            responseTime,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connected: false,
            error: error.message,
            errorDetails: error.response?.data || null,
            responseTime,
            timestamp: new Date().toISOString()
        });
    }
});

// API: 检查 Ollama 服务状态
app.post('/api/ollama-status', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }
    
    const startTime = Date.now();
    
    try {
        // 检查 Ollama 版本端点
        const response = await axios.get(`${url}/api/version`, {
            timeout: 3000
        });
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connected: true,
            data: response.data,
            responseTime,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connected: false,
            error: error.message,
            responseTime,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== 消息预设 API ==========

// API: 获取所有消息预设
app.get('/api/messages', (req, res) => {
    res.json({
        success: true,
        data: MESSAGE_PRESETS
    });
});

// API: 获取单个消息预设
app.get('/api/messages/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const message = MESSAGE_PRESETS.find(m => m.id === id);
    
    if (!message) {
        return res.status(404).json({
            success: false,
            error: 'Message not found'
        });
    }
    
    res.json({
        success: true,
        data: message
    });
});

// API: 添加消息预设
app.post('/api/messages', (req, res) => {
    const { title, content, type, tags } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({
            success: false,
            error: 'Title and content are required'
        });
    }
    
    const newMessage = {
        id: nextMessageId++,
        title,
        content,
        type: type || 'user',
        tags: tags || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    MESSAGE_PRESETS.push(newMessage);
    
    res.json({
        success: true,
        data: newMessage
    });
});

// API: 更新消息预设
app.put('/api/messages/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { title, content, type, tags } = req.body;
    
    const index = MESSAGE_PRESETS.findIndex(m => m.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Message not found'
        });
    }
    
    if (title) MESSAGE_PRESETS[index].title = title;
    if (content) MESSAGE_PRESETS[index].content = content;
    if (type) MESSAGE_PRESETS[index].type = type;
    if (tags !== undefined) MESSAGE_PRESETS[index].tags = tags;
    MESSAGE_PRESETS[index].updatedAt = new Date().toISOString();
    
    res.json({
        success: true,
        data: MESSAGE_PRESETS[index]
    });
});

// API: 删除消息预设
app.delete('/api/messages/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    const index = MESSAGE_PRESETS.findIndex(m => m.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Message not found'
        });
    }
    
    MESSAGE_PRESETS.splice(index, 1);
    
    res.json({
        success: true,
        message: 'Message deleted successfully'
    });
});

// API: 校验消息内容
app.post('/api/messages/validate', (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.json({
            success: false,
            valid: false,
            errors: ['内容不能为空']
        });
    }
    
    const errors = [];
    
    // 基本校验
    if (content.length < 1) {
        errors.push('内容长度不能为空');
    }
    
    if (content.length > 10000) {
        errors.push('内容长度不能超过10000字符');
    }
    
    // 可以添加更多校验规则
    
    res.json({
        success: true,
        valid: errors.length === 0,
        errors: errors,
        info: {
            length: content.length,
            lines: content.split('\n').length,
            words: content.split(/\s+/).length
        }
    });
});

app.listen(PORT, () => {
    console.log('🚀 CozyMind GUI Server started');
    console.log(`📡 Server running at http://localhost:${PORT}`);
    console.log(`🔗 Monitoring ${AI_CORE_URLS.length} AI-Core services`);
    console.log(`🤖 Configured ${OLLAMA_CONFIGS.length} Ollama instances`);
    console.log(`💬 Loaded ${MESSAGE_PRESETS.length} message presets`);
});


const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 10086;

// 支持的 AI-Core 地址列表
const AI_CORE_URLS = [
    { id: 1, name: 'AI-Core 主服务', url: 'http://127.0.0.1:9800', description: '主要AI处理服务' },
    { id: 2, name: 'AI-Core 备用服务', url: 'http://127.0.0.1:9801', description: '备用AI处理服务' },
    { id: 3, name: 'AI-Core 测试服务', url: 'http://127.0.0.1:9802', description: '测试环境服务' }
];

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

app.listen(PORT, () => {
    console.log('🚀 CozyMind GUI Server started');
    console.log(`📡 Server running at http://localhost:${PORT}`);
    console.log(`🔗 Monitoring ${AI_CORE_URLS.length} AI-Core services:`);
    AI_CORE_URLS.forEach(core => {
        console.log(`   - ${core.name}: ${core.url}`);
    });
});


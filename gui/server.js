const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 10086;
const AI_CORE_URL = 'http://127.0.0.1:9800';

// 静态文件服务
app.use(express.static('public'));

// API: 检测 AI-Core 连接状态
app.get('/api/check-connection', async (req, res) => {
    try {
        const response = await axios.get(`${AI_CORE_URL}/health`, {
            timeout: 3000
        });
        
        res.json({
            connected: true,
            status: 'online',
            data: response.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            connected: false,
            status: 'offline',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API: 获取 AI-Core 基本信息
app.get('/api/ai-core-info', async (req, res) => {
    try {
        const response = await axios.get(`${AI_CORE_URL}/`, {
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
    console.log(`🔗 Monitoring AI-Core at ${AI_CORE_URL}`);
});


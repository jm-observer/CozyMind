<template>
  <div class="services-view">
    <div class="container mx-auto px-4 py-6">
      <!-- AI-Core 服务列表 -->
      <el-card class="services-card mb-6">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">AI-Core 服务列表</h2>
            <el-button type="primary" size="small" @click="reloadAICores">
              🔄 重新加载
            </el-button>
          </div>
        </template>
        
        <div class="services-grid">
          <div v-for="core in aiCores" :key="core.id" class="service-card">
            <div class="service-header">
              <h3 class="service-name">{{ core.name }}</h3>
              <div class="service-status" :class="getStatusClass(core.status)">
                {{ getStatusText(core.status) }}
              </div>
            </div>
            <p class="service-url">{{ core.url }}</p>
            <p class="service-description">{{ core.description }}</p>
            <div class="service-actions">
              <el-button size="small" @click="testConnection(core)">测试连接</el-button>
              <el-button size="small" type="danger" @click="deleteCore(core.id)">删除</el-button>
            </div>
          </div>
          
          <!-- 添加新服务按钮 -->
          <div class="add-service-card" @click="showAddCoreModal">
            <div class="add-content">
              <span class="add-icon">➕</span>
              <span class="add-text">添加 AI-Core 服务</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- Ollama 配置列表 -->
      <el-card class="services-card mb-6">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">Ollama 配置列表</h2>
            <el-button type="primary" size="small" @click="reloadOllamaConfigs">
              🔄 重新加载
            </el-button>
          </div>
        </template>
        
        <div class="services-grid">
          <div v-for="config in ollamaConfigs" :key="config.id" class="service-card">
            <div class="service-header">
              <h3 class="service-name">{{ config.name }}</h3>
              <div class="service-status" :class="getStatusClass(config.status)">
                {{ getStatusText(config.status) }}
              </div>
            </div>
            <p class="service-url">{{ config.url }}</p>
            <p class="service-description">{{ config.description }}</p>
            <div class="service-actions">
              <el-button size="small" @click="testOllamaConnection(config)">测试连接</el-button>
              <el-button size="small" type="danger" @click="deleteOllamaConfig(config.id)">删除</el-button>
            </div>
          </div>
          
          <!-- 添加新配置按钮 -->
          <div class="add-service-card" @click="showAddOllamaModal">
            <div class="add-content">
              <span class="add-icon">➕</span>
              <span class="add-text">添加 Ollama 配置</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 操作日志 -->
      <el-card class="log-card">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">操作日志</h2>
            <el-button size="small" @click="clearLogs">清空</el-button>
          </div>
        </template>
        
        <div class="log-content">
          <div v-for="(log, index) in logs" :key="index" class="log-item">
            {{ log }}
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAICoreStore } from '@/stores/aiCoreStore'
import { useOllamaStore } from '@/stores/ollamaStore'

// 使用 Pinia stores
const aiCoreStore = useAICoreStore()
const ollamaStore = useOllamaStore()

// 本地状态
const logs = ref(['等待操作...'])

// 计算属性
const aiCores = computed(() => aiCoreStore.aiCores)
const ollamaConfigs = computed(() => ollamaStore.ollamaConfigs)

// 方法
const reloadAICores = async () => {
  addLog('🔄 重新加载 AI-Core 服务列表...')
  try {
    await aiCoreStore.loadAICores()
    addLog(`✅ 加载了 ${aiCores.value.length} 个 AI-Core 服务配置`)
    // 自动检测连接状态
    await aiCoreStore.checkAllConnections()
  } catch (error) {
    addLog(`❌ 加载 AI-Core 配置失败: ${error}`)
    ElMessage.error('加载 AI-Core 配置失败')
  }
}

const reloadOllamaConfigs = async () => {
  addLog('🔄 重新加载 Ollama 配置列表...')
  try {
    await ollamaStore.loadOllamaConfigs()
    addLog(`✅ 加载了 ${ollamaConfigs.value.length} 个 Ollama 配置`)
    // 自动检测连接状态
    await ollamaStore.checkAllConnections()
  } catch (error) {
    addLog(`❌ 加载 Ollama 配置失败: ${error}`)
    ElMessage.error('加载 Ollama 配置失败')
  }
}

const testConnection = async (core: any) => {
  addLog(`🔍 测试连接: ${core.name}`)
  try {
    await aiCoreStore.checkConnection(core)
    addLog(`✅ 连接测试完成: ${core.name} - ${core.status}`)
    ElMessage.success(`连接测试完成: ${core.name}`)
  } catch (error) {
    addLog(`❌ 连接测试失败: ${core.name} - ${error}`)
    ElMessage.error(`连接测试失败: ${core.name}`)
  }
}

const testOllamaConnection = async (config: any) => {
  addLog(`🔍 测试 Ollama 连接: ${config.name}`)
  try {
    await ollamaStore.checkConnection(config)
    addLog(`✅ Ollama 连接测试完成: ${config.name} - ${config.status}`)
    ElMessage.success(`Ollama 连接测试完成: ${config.name}`)
  } catch (error) {
    addLog(`❌ Ollama 连接测试失败: ${config.name} - ${error}`)
    ElMessage.error(`Ollama 连接测试失败: ${config.name}`)
  }
}

const deleteCore = async (id: number) => {
  const core = aiCoreStore.getCoreById(id)
  if (!core) return

  try {
    await ElMessageBox.confirm(
      `确定要删除 "${core.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    addLog(`🗑️ 删除 AI-Core 服务: ${core.name}`)
    await aiCoreStore.deleteAICore(id)
    addLog(`✅ 删除成功: ${core.name}`)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      addLog(`❌ 删除失败: ${core.name} - ${error}`)
      ElMessage.error('删除失败')
    }
  }
}

const deleteOllamaConfig = async (id: number) => {
  const config = ollamaStore.getConfigById(id)
  if (!config) return

  try {
    await ElMessageBox.confirm(
      `确定要删除 "${config.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    addLog(`🗑️ 删除 Ollama 配置: ${config.name}`)
    await ollamaStore.deleteOllamaConfig(id)
    addLog(`✅ 删除成功: ${config.name}`)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      addLog(`❌ 删除失败: ${config.name} - ${error}`)
      ElMessage.error('删除失败')
    }
  }
}

const showAddCoreModal = () => {
  addLog('📝 打开添加 AI-Core 服务对话框')
  // TODO: 实现添加对话框
  ElMessage.info('添加功能待实现')
}

const showAddOllamaModal = () => {
  addLog('📝 打开添加 Ollama 配置对话框')
  // TODO: 实现添加对话框
  ElMessage.info('添加功能待实现')
}

const clearLogs = () => {
  logs.value = []
  addLog('日志已清空')
}

const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.unshift(`[${timestamp}] ${message}`)
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

const getStatusClass = (status: string) => {
  return status === 'online' ? 'status-online' : 'status-offline'
}

const getStatusText = (status: string) => {
  return status === 'online' ? '在线' : '离线'
}

onMounted(async () => {
  addLog('🚀 服务管理页面已加载')
  
  // 加载数据
  try {
    await Promise.all([
      aiCoreStore.loadAICores(),
      ollamaStore.loadOllamaConfigs()
    ])
    
    // 自动检测连接状态
    await Promise.all([
      aiCoreStore.checkAllConnections(),
      ollamaStore.checkAllConnections()
    ])
    
    addLog('✅ 数据加载完成')
  } catch (error) {
    addLog(`❌ 数据加载失败: ${error}`)
  }
})
</script>

<style scoped>
.services-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.services-card {
  @apply shadow-lg;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.service-card {
  @apply bg-white rounded-lg p-4 shadow-md border;
}

.service-header {
  @apply flex justify-between items-center mb-2;
}

.service-name {
  @apply text-lg font-semibold text-gray-800;
}

.service-status {
  @apply px-2 py-1 rounded-full text-xs font-medium;
}

.status-online {
  @apply bg-green-100 text-green-800;
}

.status-offline {
  @apply bg-red-100 text-red-800;
}

.service-url {
  @apply text-sm text-gray-600 mb-1;
}

.service-description {
  @apply text-sm text-gray-500 mb-3;
}

.service-actions {
  @apply flex gap-2;
}

.add-service-card {
  @apply bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors;
}

.add-content {
  @apply flex flex-col items-center justify-center h-full text-gray-500;
}

.add-icon {
  @apply text-2xl mb-2;
}

.add-text {
  @apply text-sm font-medium;
}

.log-card {
  @apply shadow-lg;
}

.log-content {
  @apply max-h-64 overflow-hidden;
}

.log-item {
  @apply text-sm text-gray-600 py-1 border-b border-gray-100;
}
</style>


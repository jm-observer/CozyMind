import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ollamaApi } from '@/services/api'
import type { OllamaConfig } from '@/types/api'

export const useOllamaStore = defineStore('ollama', () => {
  // 状态
  const ollamaConfigs = ref<OllamaConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastCheckResults = ref<Map<number, any>>(new Map())

  // 计算属性
  const onlineConfigs = computed(() => 
    ollamaConfigs.value.filter(config => config.status === 'online')
  )

  const offlineConfigs = computed(() => 
    ollamaConfigs.value.filter(config => config.status === 'offline')
  )

  // 动作
  const loadOllamaConfigs = async () => {
    loading.value = true
    error.value = null
    
    try {
      const configs = await ollamaApi.getAll()
      ollamaConfigs.value = configs
      console.log(`[Ollama Store] 加载了 ${configs.length} 个 Ollama 配置`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载 Ollama 配置失败'
      console.error('[Ollama Store] 加载失败:', err)
    } finally {
      loading.value = false
    }
  }

  const addOllamaConfig = async (config: Omit<OllamaConfig, 'id'>) => {
    loading.value = true
    error.value = null
    
    try {
      const newConfig = await ollamaApi.add(config)
      ollamaConfigs.value.push(newConfig)
      console.log('[Ollama Store] 添加成功:', newConfig)
      return newConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加 Ollama 配置失败'
      console.error('[Ollama Store] 添加失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateOllamaConfig = async (id: number, config: Omit<OllamaConfig, 'id'>) => {
    loading.value = true
    error.value = null
    
    try {
      const updatedConfig = await ollamaApi.update(id, config)
      const index = ollamaConfigs.value.findIndex(cfg => cfg.id === id)
      if (index !== -1) {
        ollamaConfigs.value[index] = updatedConfig
      }
      console.log('[Ollama Store] 更新成功:', updatedConfig)
      return updatedConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新 Ollama 配置失败'
      console.error('[Ollama Store] 更新失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteOllamaConfig = async (id: number) => {
    loading.value = true
    error.value = null
    
    try {
      await ollamaApi.delete(id)
      ollamaConfigs.value = ollamaConfigs.value.filter(config => config.id !== id)
      lastCheckResults.value.delete(id)
      console.log('[Ollama Store] 删除成功:', id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除 Ollama 配置失败'
      console.error('[Ollama Store] 删除失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const checkConnection = async (config: OllamaConfig) => {
    try {
      const result = await ollamaApi.checkConnection(config)
      
      // 更新状态
      const index = ollamaConfigs.value.findIndex(c => c.id === config.id)
      if (index !== -1) {
        ollamaConfigs.value[index].status = result.status
        ollamaConfigs.value[index].responseTime = result.responseTime
        ollamaConfigs.value[index].lastCheck = new Date().toISOString()
      }
      
      // 保存检测结果
      lastCheckResults.value.set(config.id, result)
      
      console.log(`[Ollama Store] 连接检测完成: ${config.name} - ${result.status}`)
      return result
    } catch (err) {
      console.error(`[Ollama Store] 连接检测失败: ${config.name}`, err)
      throw err
    }
  }

  const checkAllConnections = async () => {
    const promises = ollamaConfigs.value.map(config => checkConnection(config))
    try {
      await Promise.allSettled(promises)
      console.log('[Ollama Store] 所有连接检测完成')
    } catch (err) {
      console.error('[Ollama Store] 批量连接检测失败:', err)
    }
  }

  const getConfigById = (id: number) => {
    return ollamaConfigs.value.find(config => config.id === id)
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    ollamaConfigs,
    loading,
    error,
    lastCheckResults,
    
    // 计算属性
    onlineConfigs,
    offlineConfigs,
    
    // 动作
    loadOllamaConfigs,
    addOllamaConfig,
    updateOllamaConfig,
    deleteOllamaConfig,
    checkConnection,
    checkAllConnections,
    getConfigById,
    clearError
  }
})

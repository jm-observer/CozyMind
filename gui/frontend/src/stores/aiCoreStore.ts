import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { aiCoreApi } from '@/services/api'
import type { AICoreConfig } from '@/types/api'

export const useAICoreStore = defineStore('aiCore', () => {
  // 状态
  const aiCores = ref<AICoreConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastCheckResults = ref<Map<number, any>>(new Map())

  // 计算属性
  const onlineCores = computed(() => 
    aiCores.value.filter(core => core.status === 'online')
  )

  const offlineCores = computed(() => 
    aiCores.value.filter(core => core.status === 'offline')
  )

  // 动作
  const loadAICores = async () => {
    loading.value = true
    error.value = null
    
    try {
      const cores = await aiCoreApi.getAll()
      aiCores.value = cores
      console.log(`[AI-Core Store] 加载了 ${cores.length} 个 AI-Core 配置`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载 AI-Core 配置失败'
      console.error('[AI-Core Store] 加载失败:', err)
    } finally {
      loading.value = false
    }
  }

  const addAICore = async (config: Omit<AICoreConfig, 'id'>) => {
    loading.value = true
    error.value = null
    
    try {
      const newCore = await aiCoreApi.add(config)
      aiCores.value.push(newCore)
      console.log('[AI-Core Store] 添加成功:', newCore)
      return newCore
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加 AI-Core 配置失败'
      console.error('[AI-Core Store] 添加失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateAICore = async (id: number, config: Omit<AICoreConfig, 'id'>) => {
    loading.value = true
    error.value = null
    
    try {
      const updatedCore = await aiCoreApi.update(id, config)
      const index = aiCores.value.findIndex(core => core.id === id)
      if (index !== -1) {
        aiCores.value[index] = updatedCore
      }
      console.log('[AI-Core Store] 更新成功:', updatedCore)
      return updatedCore
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新 AI-Core 配置失败'
      console.error('[AI-Core Store] 更新失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteAICore = async (id: number) => {
    loading.value = true
    error.value = null
    
    try {
      await aiCoreApi.delete(id)
      aiCores.value = aiCores.value.filter(core => core.id !== id)
      lastCheckResults.value.delete(id)
      console.log('[AI-Core Store] 删除成功:', id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除 AI-Core 配置失败'
      console.error('[AI-Core Store] 删除失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const checkConnection = async (core: AICoreConfig) => {
    try {
      const result = await aiCoreApi.checkConnection(core.id)
      
      // 更新状态
      const index = aiCores.value.findIndex(c => c.id === core.id)
      if (index !== -1) {
        aiCores.value[index].status = result.status
        aiCores.value[index].responseTime = result.responseTime
        aiCores.value[index].lastCheck = new Date().toISOString()
      }
      
      // 保存检测结果
      lastCheckResults.value.set(core.id, result)
      
      console.log(`[AI-Core Store] 连接检测完成: ${core.name} - ${result.status}`)
      return result
    } catch (err) {
      console.error(`[AI-Core Store] 连接检测失败: ${core.name}`, err)
      throw err
    }
  }

  const checkAllConnections = async () => {
    const promises = aiCores.value.map(core => checkConnection(core))
    try {
      await Promise.allSettled(promises)
      console.log('[AI-Core Store] 所有连接检测完成')
    } catch (err) {
      console.error('[AI-Core Store] 批量连接检测失败:', err)
    }
  }

  const getCoreById = (id: number) => {
    return aiCores.value.find(core => core.id === id)
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    aiCores,
    loading,
    error,
    lastCheckResults,
    
    // 计算属性
    onlineCores,
    offlineCores,
    
    // 动作
    loadAICores,
    addAICore,
    updateAICore,
    deleteAICore,
    checkConnection,
    checkAllConnections,
    getCoreById,
    clearError
  }
})

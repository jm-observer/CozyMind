/**
 * API 缓存服务
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class APICache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 100
  private defaultTTL = 5 * 60 * 1000 // 5分钟

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 清理过期项
  cleanup(): void {
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 创建全局缓存实例
export const apiCache = new APICache()

// 定期清理过期缓存
setInterval(() => {
  apiCache.cleanup()
}, 60000) // 每分钟清理一次

// 缓存装饰器
export function cached(ttl = 5 * 60 * 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const key = `${propertyName}_${JSON.stringify(args)}`
      
      // 检查缓存
      if (apiCache.has(key)) {
        return apiCache.get(key)
      }

      // 执行原方法
      const result = await method.apply(this, args)
      
      // 缓存结果
      apiCache.set(key, result, ttl)
      
      return result
    }
  }
}

// 缓存键生成器
export function generateCacheKey(prefix: string, ...params: any[]): string {
  return `${prefix}_${params.map(p => 
    typeof p === 'object' ? JSON.stringify(p) : String(p)
  ).join('_')}`
}

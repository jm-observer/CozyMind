/**
 * 性能优化工具函数
 */

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 请求去重
const pendingRequests = new Map<string, Promise<any>>()

export function dedupeRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key)
  })
  
  pendingRequests.set(key, promise)
  return promise
}

// 缓存函数
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}

// 批量更新DOM
export function batchUpdate(updateFn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(updateFn)
  })
}

// 虚拟滚动优化
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  buffer = 5
) {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const end = Math.min(totalItems, start + visibleCount + buffer * 2)
  
  return { start, end }
}

// 性能监控
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  
  startTiming(name: string): () => void {
    const start = performance.now()
    return () => {
      const end = performance.now()
      const duration = end - start
      
      if (!this.metrics.has(name)) {
        this.metrics.set(name, [])
      }
      
      const times = this.metrics.get(name)!
      times.push(duration)
      
      // 只保留最近100次记录
      if (times.length > 100) {
        times.shift()
      }
      
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    }
  }
  
  getAverageTime(name: string): number {
    const times = this.metrics.get(name)
    if (!times || times.length === 0) return 0
    
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }
  
  getMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {}
    
    for (const [name, times] of this.metrics.entries()) {
      result[name] = {
        average: this.getAverageTime(name),
        count: times.length
      }
    }
    
    return result
  }
}

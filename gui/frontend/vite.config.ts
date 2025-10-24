import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 Vue 相关库分离
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // 将 Element Plus 分离
          'element-plus': ['element-plus'],
          // 将工具库分离
          'utils': ['axios', '@vueuse/core'],
          // 将 MQTT 分离
          'mqtt': ['mqtt']
        }
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 压缩配置
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    }
  },
  // 预构建优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      'axios',
      '@vueuse/core'
    ]
  }
})


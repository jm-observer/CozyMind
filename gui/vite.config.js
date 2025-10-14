import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  server: {
    port: 10086,
    proxy: {
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    assetsDir: 'assets'
  }
})

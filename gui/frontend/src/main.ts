import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'tailwindcss/tailwind.css'
import App from './App.vue'
import router from './router'

// 开发环境导入 MQTT 测试工具
if (import.meta.env.DEV) {
  import('./services/mqttClient')
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')


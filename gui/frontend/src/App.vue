<template>
  <div id="app">
    <AppLayout />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import AppLayout from './components/layout/AppLayout.vue'

// 使用异步组件优化加载
const AsyncAppLayout = defineAsyncComponent(() => 
  import('./components/layout/AppLayout.vue')
)
</script>


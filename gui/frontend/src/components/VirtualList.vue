<template>
  <div class="virtual-list" ref="containerRef" @scroll="handleScroll">
    <div :style="{ height: totalHeight + 'px' }" class="virtual-list-spacer">
      <div 
        :style="{ transform: `translateY(${offsetY}px)` }"
        class="virtual-list-content"
      >
        <div
          v-for="item in visibleItems"
          :key="item.id"
          class="virtual-list-item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item" :index="item.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { throttle, getVisibleRange } from '@/utils/performance'

interface Props {
  items: any[]
  itemHeight: number
  containerHeight: number
  buffer?: number
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5
})

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// 节流滚动处理
const throttledScroll = throttle((event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}, 16) // 60fps

const handleScroll = (event: Event) => {
  throttledScroll(event)
}

// 优化的可见区域计算
const visibleRange = computed(() => {
  return getVisibleRange(
    scrollTop.value,
    props.containerHeight,
    props.itemHeight,
    props.items.length,
    props.buffer
  )
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, index) => ({
    ...item,
    index: start + index
  }))
})

const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

const offsetY = computed(() => {
  return visibleRange.value.start * props.itemHeight
})

onMounted(() => {
  if (containerRef.value) {
    containerRef.value.style.height = props.containerHeight + 'px'
    containerRef.value.style.overflow = 'auto'
  }
})
</script>

<style scoped>
.virtual-list {
  overflow: auto;
}

.virtual-list-spacer {
  position: relative;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-list-item {
  display: flex;
  align-items: center;
}
</style>

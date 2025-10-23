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

interface Props {
  items: any[]
  itemHeight: number
  containerHeight: number
}

const props = defineProps<Props>()

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// 计算可见区域
const visibleStart = computed(() => {
  return Math.floor(scrollTop.value / props.itemHeight)
})

const visibleEnd = computed(() => {
  return Math.min(
    visibleStart.value + Math.ceil(props.containerHeight / props.itemHeight) + 1,
    props.items.length
  )
})

const visibleItems = computed(() => {
  return props.items.slice(visibleStart.value, visibleEnd.value).map((item, index) => ({
    ...item,
    index: visibleStart.value + index
  }))
})

const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

const offsetY = computed(() => {
  return visibleStart.value * props.itemHeight
})

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

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

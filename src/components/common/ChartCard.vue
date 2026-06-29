<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <span class="chart-card-title">{{ title }}</span>
      <div v-if="$slots['header-extra']" class="chart-card-extra">
        <slot name="header-extra" />
      </div>
    </div>
    <div
      class="chart-card-body"
      :style="{ height: height + 'px' }"
      v-loading="loading"
      element-loading-text="加载中..."
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  height?: number
  loading?: boolean
}>(), {
  height: 280,
  loading: false,
})

const chartContainerRef = ref<HTMLElement | null>(null)

function getChartContainer(): HTMLElement | null {
  return chartContainerRef.value
}

defineExpose({
  getChartContainer,
  chartContainerRef,
})
</script>

<style scoped>
.chart-card {
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: box-shadow var(--transition-base);
}

.chart-card:hover {
  box-shadow: var(--shadow-elevated);
}

.chart-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-12) var(--spacing-16);
  border-bottom: 1px solid var(--color-border-light);
}

.chart-card-title {
  font-size: var(--font-size-14);
  font-weight: var(--font-weight-600);
  color: var(--color-text-primary);
}

.chart-card-extra {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

.chart-card-body {
  position: relative;
  padding: 0;
  display: flex;
}

.chart-card-body > :deep(*) {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>

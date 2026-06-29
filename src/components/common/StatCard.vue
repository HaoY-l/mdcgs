<template>
  <div class="stat-card" :style="{ '--stat-color': color }">
    <div v-if="loading" class="stat-card-loading">
      <div class="skeleton stat-card-skeleton-icon" />
      <div class="stat-card-skeleton-body">
        <div class="skeleton skeleton-text" style="width: 80%" />
        <div class="skeleton skeleton-text" style="width: 60%" />
      </div>
    </div>
    <template v-else>
      <div class="stat-card-icon" :style="{ background: bg }">
        <slot name="icon">
          <span v-if="icon" v-html="icon" class="stat-icon-svg" />
        </slot>
      </div>
      <div class="stat-card-body">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value" :style="{ color }">{{ value ?? '-' }}</div>
        <div v-if="trend" class="stat-trend" :class="`stat-trend--${trend.direction}`">
          <el-icon :size="12">
            <Top v-if="trend.direction === 'up'" />
            <Bottom v-else-if="trend.direction === 'down'" />
            <Minus v-else />
          </el-icon>
          <span>{{ trend.value }}%</span>
          <span v-if="trend.label" class="stat-trend-label">{{ trend.label }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Top, Bottom, Minus } from '@element-plus/icons-vue'

interface TrendInfo {
  value: string | number
  direction: 'up' | 'down' | 'flat'
  label?: string
}

withDefaults(defineProps<{
  label: string
  value?: string | number | null
  icon?: string
  color?: string
  bg?: string
  trend?: TrendInfo | null
  loading?: boolean
}>(), {
  color: 'var(--color-text-primary)',
  bg: 'var(--color-surface-muted)',
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-16);
  padding: var(--spacing-16);
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
  transition: all var(--transition-base);
}

.stat-card:hover {
  box-shadow: var(--shadow-elevated);
  border-color: var(--color-border-hover);
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.stat-icon-svg {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-svg :deep(svg) {
  width: 20px;
  height: 20px;
  stroke: var(--stat-color, currentColor);
}

.stat-card-body {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-500);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: var(--font-size-24);
  font-weight: var(--font-weight-700);
  letter-spacing: var(--letter-spacing-tight);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-4);
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-4);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-500);
}

.stat-trend--up {
  color: var(--color-success-500);
}

.stat-trend--down {
  color: var(--color-danger-500);
}

.stat-trend--flat {
  color: var(--color-text-tertiary);
}

.stat-trend-label {
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-400);
}

/* Loading Skeleton */
.stat-card-loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-16);
  width: 100%;
}

.stat-card-skeleton-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.stat-card-skeleton-body {
  flex: 1;
}
</style>

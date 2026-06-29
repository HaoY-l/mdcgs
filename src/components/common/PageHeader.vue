<template>
  <div class="page-header-component">
    <div class="page-header-text">
      <h2 class="page-header-title">{{ title }}</h2>
      <p v-if="description" class="page-header-desc">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="page-header-actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<style scoped>
.page-header-component {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
  margin-bottom: var(--spacing-20);
  padding: var(--spacing-4) 0;
}

.page-header-text {
  flex: 1;
  min-width: 0;
}

.page-header-title {
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-600);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  margin: 0;
  letter-spacing: var(--letter-spacing-tight);
}

.page-header-desc {
  font-size: var(--font-size-14);
  color: var(--color-text-tertiary);
  margin: var(--spacing-4) 0 0;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  flex-shrink: 0;
  flex-wrap: wrap;
}
</style>

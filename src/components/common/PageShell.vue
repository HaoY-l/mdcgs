<template>
  <div class="page-shell">
    <div class="page-shell-header">
      <div class="page-shell-header-text">
        <h2 class="page-shell-title">{{ title }}</h2>
        <p v-if="description" class="page-shell-desc">{{ description }}</p>
      </div>
      <div v-if="$slots['header-actions']" class="page-shell-header-actions">
        <slot name="header-actions" />
      </div>
    </div>
    <div
      class="page-shell-body"
      v-loading="loading"
      :element-loading-text="loadingText"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  loading?: boolean
  loadingText?: string
}>()
</script>

<style scoped>
.page-shell {
  padding: var(--spacing-20) var(--spacing-24);
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.page-shell-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-16);
  margin-bottom: var(--spacing-20);
}

.page-shell-header-text {
  flex: 1;
  min-width: 0;
}

.page-shell-title {
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-600);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  margin: 0;
  letter-spacing: var(--letter-spacing-tight);
}

.page-shell-desc {
  font-size: var(--font-size-14);
  color: var(--color-text-tertiary);
  margin: var(--spacing-4) 0 0;
  line-height: var(--line-height-normal);
}

.page-shell-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  flex-shrink: 0;
}

.page-shell-body {
  min-height: 100px;
}
</style>

<template>
  <div class="stat-card-grid" :style="{ '--grid-columns': columns }">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  columns?: number
}>(), {
  columns: 5,
})
</script>

<style scoped>
.stat-card-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--spacing-16);
  margin-bottom: var(--spacing-20);
}

@media (max-width: 1200px) {
  .stat-card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

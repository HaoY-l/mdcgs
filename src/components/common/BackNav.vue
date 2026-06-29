<template>
  <div class="back-nav" @click="handleBack">
    <el-icon :size="14">
      <ArrowLeft />
    </el-icon>
    <span>{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  text?: string
  to?: string
}>(), {
  text: '返回',
})

const router = useRouter()

function handleBack() {
  if (props.to) {
    router.push(props.to)
  } else {
    router.back()
  }
}
</script>

<style scoped>
.back-nav {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-4);
  font-size: var(--font-size-14);
  color: var(--color-text-tertiary);
  cursor: pointer;
  margin-bottom: var(--spacing-12);
  padding: var(--spacing-4) var(--spacing-8);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.back-nav:hover {
  color: var(--color-primary-500);
  background: var(--color-primary-50);
}
</style>

<template>
  <div class="empty-state" :class="[`empty-state--${type}`]">
    <el-empty :description="description" :image-size="120">
      <template v-if="actionText" #default>
        <el-button type="primary" size="small" @click="$emit('action')">
          {{ actionText }}
        </el-button>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type?: 'empty' | 'error' | 'not-found'
  description?: string
  actionText?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-48) var(--spacing-24);
}

.empty-state--error {
  --el-empty-description-color: var(--color-danger-500);
}

.empty-state--error p {
  color: var(--color-danger-600);
}
</style>

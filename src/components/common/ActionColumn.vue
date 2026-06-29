<template>
  <div class="action-column">
    <template v-for="(action, index) in actions" :key="index">
      <el-divider v-if="index > 0" direction="vertical" />
      <el-button
        :type="action.type || 'primary'"
        link
        size="small"
        :disabled="action.disabled"
        :loading="action.loading"
        @click.stop="action.click"
      >
        {{ action.label }}
      </el-button>
    </template>
  </div>
</template>

<script setup lang="ts">
interface ActionItem {
  label: string
  click: () => void
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  disabled?: boolean
  loading?: boolean
}

defineProps<{
  actions: ActionItem[]
}>()
</script>

<style scoped>
.action-column {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.action-column .el-button + .el-divider {
  margin: 0;
}

.action-column .el-divider {
  height: 14px;
}
</style>

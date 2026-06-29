<template>
  <el-tag
    :type="resolvedType"
    :size="size"
    :effect="effect"
    :disable-transitions="true"
  >
    {{ resolvedLabel }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface StatusDef {
  label: string
  type?: string
}

const props = withDefaults(defineProps<{
  status: string | number
  map: Record<string, StatusDef>
  size?: 'small' | 'default' | 'large'
  effect?: 'dark' | 'light' | 'plain'
}>(), {
  size: 'small',
  effect: 'light',
})

const resolvedType = computed(() => {
  return (props.map[String(props.status)]?.type || 'info') as 'primary' | 'success' | 'warning' | 'info' | 'danger'
})

const resolvedLabel = computed(() => {
  return props.map[String(props.status)]?.label || String(props.status)
})
</script>

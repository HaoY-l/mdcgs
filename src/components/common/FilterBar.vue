<template>
  <div class="filter-bar" :class="{ 'filter-bar--collapsed': collapsed }">
    <div class="filter-bar-items">
      <template v-for="(item, index) in visibleItems" :key="index">
        <!-- Input -->
        <el-input
          v-if="item.type === 'input'"
          v-model="filterValues[item.key]"
          :placeholder="item.placeholder || '请输入'"
          :style="{ width: item.width || '180px' }"
          size="small"
          clearable
          @clear="emitSearch"
          @keyup.enter="emitSearch"
        />

        <!-- Select -->
        <el-select
          v-else-if="item.type === 'select'"
          v-model="filterValues[item.key]"
          :placeholder="item.placeholder || '请选择'"
          :style="{ width: item.width || '140px' }"
          size="small"
          clearable
          @change="emitSearch"
        >
          <el-option
            v-for="opt in item.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <!-- Date Range -->
        <el-date-picker
          v-else-if="item.type === 'date-range'"
          v-model="filterValues[item.key]"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :style="{ width: item.width || '240px' }"
          size="small"
          value-format="YYYY-MM-DD"
          @change="emitSearch"
        />

        <!-- Date -->
        <el-date-picker
          v-else-if="item.type === 'date'"
          v-model="filterValues[item.key]"
          type="date"
          :placeholder="item.placeholder || '选择日期'"
          :style="{ width: item.width || '150px' }"
          size="small"
          value-format="YYYY-MM-DD"
          @change="emitSearch"
        />

        <!-- Custom -->
        <slot v-else-if="item.type === 'custom'" :name="'filter-' + item.key" :item="item" />
      </template>

      <el-button size="small" type="primary" @click="emitSearch">
        搜索
      </el-button>
      <el-button v-if="showReset" size="small" @click="handleReset">
        重置
      </el-button>

      <el-button
        v-if="items.length > maxVisible"
        link
        type="primary"
        size="small"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '展开' : '收起' }}
        <el-icon :size="10">
          <ArrowDown v-if="collapsed" />
          <ArrowUp v-else />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

export interface FilterItem {
  key: string
  type: 'input' | 'select' | 'date-range' | 'date' | 'custom'
  placeholder?: string
  options?: { label: string; value: any }[]
  default?: any
  width?: string | number
}

const props = withDefaults(defineProps<{
  items: FilterItem[]
  modelValue?: Record<string, any>
  maxVisible?: number
  showReset?: boolean
}>(), {
  maxVisible: 5,
  showReset: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: Record<string, any>): void
  (e: 'search', filters: Record<string, any>): void
  (e: 'reset'): void
}>()

const collapsed = ref(true)

const filterValues = reactive<Record<string, any>>({})

// Initialize default values
props.items.forEach((item) => {
  filterValues[item.key] = props.modelValue?.[item.key] ?? item.default ?? (item.type === 'date-range' ? null : '')
})

const visibleItems = computed(() => {
  if (!collapsed.value) return props.items
  return props.items.slice(0, props.maxVisible)
})

function emitSearch() {
  const result: Record<string, any> = {}
  Object.keys(filterValues).forEach((key) => {
    const val = filterValues[key]
    if (val !== '' && val !== null && val !== undefined) {
      result[key] = val
    }
  })
  emit('update:modelValue', result)
  emit('search', result)
}

function handleReset() {
  Object.keys(filterValues).forEach((key) => {
    filterValues[key] = ''
  })
  emit('reset')
  emitSearch()
}

// Sync external model changes
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      Object.keys(val).forEach((key) => {
        if (key in filterValues) {
          filterValues[key] = val[key]
        }
      })
    }
  },
  { deep: true }
)
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-8);
}

.filter-bar-items {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  flex-wrap: wrap;
}

.filter-bar-items .el-button {
  flex-shrink: 0;
}
</style>

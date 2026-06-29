<template>
  <div class="data-table-wrapper">
    <!-- Toolbar -->
    <div v-if="hasToolbar" class="data-table-toolbar">
      <div class="toolbar-left">
        <slot name="toolbar" />
      </div>
      <div class="toolbar-right">
        <slot name="toolbar-right" />
      </div>
    </div>

    <!-- Batch Action Bar -->
    <transition name="slide-up">
      <div v-if="selectable && selected.length > 0" class="batch-bar">
        <div class="batch-bar-info">
          已选择 <strong>{{ selected.length }}</strong> 项
        </div>
        <div class="batch-bar-actions">
          <el-button
            v-for="act in batchActions"
            :key="act.key"
            size="small"
            :type="act.type || 'primary'"
            :loading="act.loading"
            @click="act.handler(selected)"
          >
            {{ act.label }}
          </el-button>
          <el-button size="small" @click="clearSelection">
            取消选择
          </el-button>
        </div>
      </div>
    </transition>

    <!-- Table -->
    <div
      class="data-table-container"
      v-loading="loading"
      :element-loading-text="loadingText"
    >
      <el-table
        ref="tableRef"
        v-bind="$attrs"
        :data="data"
        :stripe="stripe"
        :border="border"
        @selection-change="onSelectionChange"
        :header-cell-style="{
          background: 'var(--color-surface-muted)',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
        }"
      >
        <el-table-column
          v-if="selectable && !$slots.selection"
          type="selection"
          width="44"
          fixed="left"
        />
        <slot />
        <template #append>
          <slot name="append" />
        </template>
      </el-table>
    </div>

    <!-- Pagination -->
    <div v-if="showPagination && total > 0" class="data-table-pagination">
      <el-pagination
        v-model:current-page="currentPageModel"
        v-model:page-size="pageSizeModel"
        :page-sizes="pageSizes"
        :total="total"
        :layout="paginationLayout"
        :background="paginationBackground"
        :small="paginationSmall"
        @size-change="onSizeChange"
        @current-change="onCurrentChange"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && (!data || data.length === 0) && !$slots.empty"
      class="data-table-empty"
    >
      <el-empty :description="emptyText" :image-size="100" />
    </div>
    <template v-if="!loading && (!data || data.length === 0)">
      <slot name="empty" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue'

export interface BatchAction {
  key: string
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  handler: (selected: any[]) => void | Promise<void>
}

const props = withDefaults(defineProps<{
  data: any[]
  loading?: boolean
  loadingText?: string
  total?: number
  selectable?: boolean
  showPagination?: boolean
  pageSizes?: number[]
  paginationLayout?: string
  paginationBackground?: boolean
  paginationSmall?: boolean
  batchActions?: BatchAction[]
  emptyText?: string
  stripe?: boolean
  border?: boolean
  currentPage?: number
  pageSize?: number
}>(), {
  loading: false,
  loadingText: '加载中...',
  total: 0,
  selectable: false,
  showPagination: true,
  pageSizes: () => [10, 20, 50, 100],
  paginationLayout: 'total, sizes, prev, pager, next, jumper',
  paginationBackground: true,
  paginationSmall: false,
  batchActions: () => [],
  emptyText: '暂无数据',
  stripe: false,
  border: false,
  currentPage: 1,
  pageSize: 20,
})

const emit = defineEmits<{
  (e: 'page-change', payload: { page: number; pageSize: number }): void
  (e: 'selection-change', selected: any[]): void
  (e: 'update:currentPage', val: number): void
  (e: 'update:pageSize', val: number): void
}>()

const slots = useSlots()
const tableRef = ref()
const selected = ref<any[]>([])

const hasToolbar = computed(() => {
  return !!(slots.toolbar || slots['toolbar-right'])
})

const currentPageModel = computed({
  get: () => props.currentPage,
  set: (val: number) => emit('update:currentPage', val),
})

const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (val: number) => emit('update:pageSize', val),
})

function onSelectionChange(selection: any[]) {
  selected.value = selection
  emit('selection-change', selection)
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selected.value = []
}

function onSizeChange(size: number) {
  emit('page-change', { page: 1, pageSize: size })
}

function onCurrentChange(page: number) {
  emit('page-change', { page, pageSize: pageSizeModel.value })
}

function onPageChange(payload: { page: number; pageSize: number }) {
  emit('page-change', payload)
}

defineExpose({
  tableRef,
  clearSelection,
  selected,
})
</script>

<style scoped>
.data-table-wrapper {
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: box-shadow var(--transition-base);
}

.data-table-wrapper:hover {
  box-shadow: var(--shadow-elevated);
}

/* Toolbar */
.data-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-12);
  padding: var(--spacing-12) var(--spacing-16);
  background: var(--color-surface-white);
  border-bottom: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  flex-shrink: 0;
}

/* Batch Action Bar */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-8) var(--spacing-16);
  background: var(--color-primary-50);
  border-bottom: 1px solid var(--color-primary-200);
  font-size: var(--font-size-13);
}

.batch-bar-info {
  color: var(--color-text-secondary);
}

.batch-bar-info strong {
  color: var(--color-primary-600);
}

.batch-bar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

/* Table Container */
.data-table-container {
  min-height: 120px;
}

/* Pagination */
.data-table-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: var(--spacing-12) var(--spacing-16);
  border-top: 1px solid var(--color-border-light);
  background: var(--color-surface-white);
}

/* Empty State */
.data-table-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-32) 0;
  min-height: 200px;
}

/* Selection checkboxes spacing */
.data-table-wrapper :deep(.el-checkbox) {
  margin-right: 0;
}
</style>

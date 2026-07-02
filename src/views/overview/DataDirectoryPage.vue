<template>
  <div class="page-container">
    <div class="page-header">
      <h2>数据目录</h2>
    </div>

    <!-- Filter Panel -->
    <el-card shadow="hover" class="filter-card">
      <el-form :model="filterForm" label-width="90px" size="small">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="关键词">
              <el-input
                v-model="filterForm.keyword"
                placeholder="字段名 / 注释 / 类型"
                clearable
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="数据类型">
              <el-select
                v-model="filterForm.data_type"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option
                  v-for="t in dataTypeOptions"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="数据分级">
              <el-select
                v-model="filterForm.level"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option
                  v-for="l in levelOptions"
                  :key="l"
                  :label="l"
                  :value="l"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="分类路径">
              <el-select
                v-model="filterForm.category_path"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option
                  v-for="path in categoryPathOptions"
                  :key="path"
                  :label="path"
                  :value="path"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="数据资产">
              <el-select
                v-model="filterForm.asset"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option
                  v-for="a in assetOptions"
                  :key="a"
                  :label="a"
                  :value="a"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="敏感">
              <el-select
                v-model="filterForm.is_sensitive"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option label="是" :value="1" />
                <el-option label="否" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="脱敏状态">
              <el-select
                v-model="filterForm.is_masked"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option label="已脱敏" value="confirmed" />
                <el-option label="未脱敏" value="none" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="加密状态">
              <el-select
                v-model="filterForm.is_encrypted"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option label="已加密" value="confirmed" />
                <el-option label="未加密" value="none" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label-width="0">
              <div class="action-bar">
                <el-button type="primary" @click="handleSearch">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
                <el-divider direction="vertical" />
                <el-button size="small" @click="handleExportQuery" :loading="exporting">
                  导出查询结果
                </el-button>
                <el-button size="small" @click="handleExportAll" :loading="exportingAll">
                  导出全部目录
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Data Table -->
    <el-card shadow="hover" class="table-card">
      <el-table
        :data="tableData"
        stripe
        style="width: 100%"
        v-loading="loading"
        :max-height="560"
        border
        size="small"
      >
        <el-table-column type="index" label="#" width="50" fixed />
        <el-table-column prop="field_name" label="字段名" min-width="130" fixed />
        <el-table-column prop="field_comment" label="字段注释" min-width="150" show-overflow-tooltip />
        <el-table-column prop="data_type" label="数据类型" min-width="120" />
        <el-table-column prop="level" label="数据分级" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="levelTagType(row.level)"
              size="small"
              effect="dark"
            >
              {{ row.level || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category_path" label="分类路径" min-width="180" show-overflow-tooltip />
        <el-table-column prop="asset_name" label="数据资产" min-width="120" />
        <el-table-column prop="table_name" label="表" min-width="130" />
        <el-table-column prop="database_name" label="数据库" min-width="120" />
        <el-table-column prop="task_name" label="来源任务" min-width="120" show-overflow-tooltip />
        <el-table-column label="敏感" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small">
              {{ row.is_sensitive ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="脱敏" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_masked === 'confirmed' ? 'success' : 'info'" size="small">
              {{ row.is_masked === 'confirmed' ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="加密" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_encrypted === 'confirmed' ? 'warning' : 'info'" size="small">
              {{ row.is_encrypted === 'confirmed' ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="risk_suggestion" label="安全建议" min-width="140" />
      </el-table>

      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDirectory } from '@/api/overview'
import client from '@/api/client'

// ===== State =====
const loading = ref(false)
const exporting = ref(false)
const exportingAll = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const categoryPathOptions = ref<string[]>([])
const assetOptions = ref<string[]>([])
const dataTypeOptions = ref<string[]>([])
const levelOptions = ref<string[]>([])

const filterForm = reactive({
  keyword: '',
  data_type: '',
  level: '',
  category_path: '',
  asset: '',
  is_sensitive: null as number | null,
  is_masked: '',
  is_encrypted: '',
})

// ===== Helpers =====
function levelTagType(level: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  const map: Record<string, string> = {
    'L1': 'danger',
    'L2': 'warning',
    'L3': 'primary',
    'L4': 'info',
  }
  return (map[level] || 'info') as 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined
}

function buildParams(): Record<string, any> {
  const params: Record<string, any> = {
    page: currentPage.value,
    page_size: pageSize.value,
  }
  if (filterForm.keyword.trim()) params.keyword = filterForm.keyword.trim()
  if (filterForm.data_type) params.data_type = filterForm.data_type
  if (filterForm.level) params.level = filterForm.level
  if (filterForm.category_path) params.category_path = filterForm.category_path
  if (filterForm.asset) params.asset = filterForm.asset
  if (filterForm.is_sensitive !== null) params.is_sensitive = filterForm.is_sensitive
  if (filterForm.is_masked) params.is_masked = filterForm.is_masked
  if (filterForm.is_encrypted) params.is_encrypted = filterForm.is_encrypted
  return params
}

// ===== Fetch Data =====
async function fetchDirectory(params: Record<string, any>) {
  loading.value = true
  try {
    const res: any = await getDirectory(params)
    const d = res.data || {}
    tableData.value = d.items || []
    total.value = d.total ?? 0
  } catch (err: any) {
    ElMessage.error(err?.message || '获取数据目录失败')
  } finally {
    loading.value = false
  }
}

async function fetchFilterOptions() {
  try {
    const res: any = await client.get('/directory/options')
    const d = res.data || {}
    if (d.category_paths) {
      categoryPathOptions.value = d.category_paths
    }
    if (d.assets) {
      assetOptions.value = d.assets
    }
    if (d.data_type_options) {
      dataTypeOptions.value = d.data_type_options
    }
    if (d.level_options) {
      levelOptions.value = d.level_options
    }
  } catch {
    // silently fail
  }
}

// ===== Search =====
function handleSearch() {
  currentPage.value = 1
  fetchDirectory(buildParams())
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.data_type = ''
  filterForm.level = ''
  filterForm.category_path = ''
  filterForm.asset = ''
  filterForm.is_sensitive = null
  filterForm.is_masked = ''
  filterForm.is_encrypted = ''
  currentPage.value = 1
  handleSearch()
}

// ===== Export =====
async function handleExportQuery() {
  exporting.value = true
  try {
    const params = buildParams()
    params.export = 'query'
    const res: any = await getDirectory(params)
    triggerDownload(res, '数据目录_查询结果')
    ElMessage.success('导出成功')
  } catch (err: any) {
    ElMessage.error(err?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleExportAll() {
  exportingAll.value = true
  try {
    const res: any = await getDirectory({ export: 'all', page_size: -1 })
    triggerDownload(res, '数据目录_全部')
    ElMessage.success('导出成功')
  } catch (err: any) {
    ElMessage.error(err?.message || '导出失败')
  } finally {
    exportingAll.value = false
  }
}

function triggerDownload(res: any, filename: string) {
  if (res instanceof Blob) {
    const url = URL.createObjectURL(res)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    return
  }
  if (res.data?.download_url) {
    window.open(res.data.download_url, '_blank')
    return
  }
  if (res.data?.items || Array.isArray(res.data)) {
    const items = res.data?.items || res.data || []
    if (items.length > 0) {
      const csvContent = jsonToCsv(items)
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }
}

function jsonToCsv(items: any[]): string {
  if (items.length === 0) return ''
  const headers = Object.keys(items[0])
  const lines = [headers.join(',')]
  for (const item of items) {
    const row = headers.map((h) => {
      let val = item[h]
      if (val === null || val === undefined) return ''
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`
      }
      return val
    })
    lines.push(row.join(','))
  }
  return lines.join('\n')
}

// ===== Init =====
onMounted(() => {
  fetchFilterOptions()
  fetchDirectory(buildParams())
})
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 0;
}

.filter-card :deep(.el-form-item__label) {
  text-align: justify;
  text-justify: distribute-all-lines;
  -moz-text-align-last: justify;
  text-align-last: justify;
  width: 100%;
  display: block;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.table-card {
  margin-bottom: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
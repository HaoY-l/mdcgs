<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2>文件表盘</h2>
        <p class="page-desc">实时展示所有文件资产的敏感分类统计（数据基于人工确认）</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleRefresh" :loading="refreshing">刷新</el-button>
      </div>
    </div>

    <div v-loading="pageLoading" class="page-body">
      <!-- 统计卡片 -->
      <div class="stat-cards">
        <!-- 资产总数 -->
        <div class="stat-card">
          <div class="stat-card-icon" style="background: #e3f2fd">
            <span>📦</span>
          </div>
          <div class="stat-card-body">
            <div class="stat-value" style="color: #1976d2">{{ statistics.total_assets ?? '-' }}</div>
            <div class="stat-label">资产总数</div>
            <div class="stat-sub">
              <span>任务中 {{ statistics.assets_in_tasks ?? 0 }} 个资产</span>
              <span class="split">|</span>
              <span>敏感 {{ statistics.sensitive_assets ?? 0 }} 个</span>
            </div>
          </div>
        </div>

        <!-- 文件总数 -->
        <div class="stat-card">
          <div class="stat-card-icon" style="background: #e8f5e9">
            <span>📄</span>
          </div>
          <div class="stat-card-body">
            <div class="stat-value" style="color: #388e3c">{{ statistics.total_files ?? '-' }}</div>
            <div class="stat-label">文件总数</div>
            <div class="stat-sub">
              <span>任务中敏感 {{ statistics.sensitive_files ?? 0 }} 个</span>
              <span class="split">|</span>
              <span>敏感文件 {{ statistics.sensitive_files ?? 0 }} 个</span>
            </div>
          </div>
        </div>

        <!-- 内容块数量 -->
        <div class="stat-card">
          <div class="stat-card-icon" style="background: #fff3e0">
            <span>🧱</span>
          </div>
          <div class="stat-card-body">
            <div class="stat-value" style="color: #f57c00">{{ statistics.total_blocks ?? '-' }}</div>
            <div class="stat-label">内容块数量</div>
            <div class="stat-sub">
              <span>敏感内容块 {{ statistics.sensitive_blocks ?? 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 敏感分类数量 -->
        <div class="stat-card">
          <div class="stat-card-icon" style="background: #fce4ec">
            <span>⚠️</span>
          </div>
          <div class="stat-card-body">
            <div class="stat-value" style="color: #c62828">{{ statistics.sensitive_categories_count ?? '-' }}</div>
            <div class="stat-label">敏感分类数量</div>
            <div class="stat-sub">
              <span>敏感类型 {{ statistics.sensitive_categories_count ?? 0 }} 种</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select v-model="filters.asset_id" placeholder="资产" size="small" clearable style="width: 160px" @change="onAssetChange">
          <el-option v-for="a in filterOptions.assets" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <el-select v-model="filters.is_sensitive" placeholder="是否敏感" size="small" clearable style="width: 110px" @change="triggerSearch">
          <el-option label="敏感" :value="1" />
          <el-option label="非敏感" :value="0" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="文件名" size="small" clearable style="width: 140px" @keyup.enter="triggerSearch" />
        <el-button size="small" type="primary" @click="triggerSearch">搜索</el-button>
      </div>

      <!-- 表格 -->
      <div class="table-container">
        <el-table :data="tableData" stripe style="width: 100%" v-loading="tableLoading" max-height="600">
          <el-table-column type="expand" width="50">
            <template #default="{ row }">
              <div class="expand-content" v-if="row.sensitive_types_detail && row.sensitive_types_detail.length">
                <el-table :data="row.sensitive_types_detail" size="small" border>
                  <el-table-column prop="sensitive_type" label="敏感类型" min-width="150" />
                  <el-table-column prop="total_count" label="数量" min-width="100" align="center" />
                  <el-table-column prop="level" label="等级" min-width="100" align="center" />
                </el-table>
              </div>
              <div v-else class="expand-empty">无敏感数据</div>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleViewDetail(row)">
                {{ row.file_name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="sensitive_blocks" label="敏感块数" min-width="100" align="right">
            <template #default="{ row }">
              <span v-if="row.sensitive_blocks > 0" class="sensitive-count">{{ row.sensitive_blocks }}</span>
              <span v-else>0</span>
            </template>
          </el-table-column>
          <el-table-column prop="total_blocks" label="总块数" min-width="100" align="right">
            <template #default="{ row }">
              {{ row.total_blocks || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="sensitive_ratio" label="敏感占比" min-width="100" align="right">
            <template #default="{ row }">
              <span v-if="row.total_blocks > 0">{{ row.sensitive_ratio }}%</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="is_sensitive" label="是否敏感" min-width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.is_sensitive === 1" type="danger" size="small">敏感</el-tag>
              <el-tag v-else-if="row.is_sensitive === 0" type="success" size="small">非敏感</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="aggregation_level" label="聚合等级" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.aggregation_level" class="aggregation-text">{{ row.aggregation_level }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.page_size"
            :page-sizes="[20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getFileDashboardStatistics, getFileDashboardFiles, getFileDirectoryOptions } from '@/api/overview'

// 状态
const pageLoading = ref(false)
const tableLoading = ref(false)
const refreshing = ref(false)

// 统计数据
const statistics = ref<any>({
  total_assets: null,
  assets_in_tasks: 0,
  sensitive_assets: 0,
  total_files: null,
  files_in_tasks: 0,
  sensitive_files: 0,
  total_blocks: null,
  sensitive_blocks: 0,
  sensitive_categories_count: null,
})

// 筛选
const filters = reactive({
  asset_id: null as number | null,
  is_sensitive: null as number | null,
  keyword: '',
})

// 筛选选项
const filterOptions = ref<{
  assets: Array<{ id: number; name: string }>
}>({
  assets: [],
})

// 表格数据
const tableData = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0,
})

// 加载统计数据
async function loadStatistics() {
  try {
    const res: any = await getFileDashboardStatistics({ asset_id: filters.asset_id })
    statistics.value = res?.data || {}
  } catch (e: any) {
    console.error('加载统计数据失败:', e)
  }
}

// 加载筛选选项
async function loadFilterOptions() {
  try {
    const res: any = await getFileDirectoryOptions({})
    filterOptions.value.assets = res?.data?.assets || []
  } catch (e: any) {
    console.error('加载筛选选项失败:', e)
  }
}

// 加载表格数据
async function loadTableData() {
  tableLoading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.page_size,
    }
    if (filters.asset_id) params.asset_id = filters.asset_id
    if (filters.is_sensitive !== null) params.is_sensitive = filters.is_sensitive
    if (filters.keyword) params.keyword = filters.keyword

    const res: any = await getFileDashboardFiles(params)
    const data = res?.data || {}
    tableData.value = data.items || []
    pagination.total = data.total || 0
  } catch (e: any) {
    console.error('加载表格数据失败:', e)
    ElMessage.error('加载数据失败')
  } finally {
    tableLoading.value = false
  }
}

// 刷新
async function handleRefresh() {
  refreshing.value = true
  try {
    await loadStatistics()
    await loadTableData()
    ElMessage.success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

// 资产变化
function onAssetChange() {
  pagination.page = 1
  loadStatistics()
  loadTableData()
}

// 触发搜索
function triggerSearch() {
  pagination.page = 1
  loadStatistics()
  loadTableData()
}

// 分页变化
function handleSizeChange() {
  pagination.page = 1
  loadTableData()
}

function handlePageChange() {
  loadTableData()
}

// 查看详情
function handleViewDetail(row: any) {
  if (row.task_id) {
    window.open(`/classification/file-tasks/${row.task_id}`, '_blank')
  }
}

// 初始化
onMounted(async () => {
  pageLoading.value = true
  try {
    await Promise.all([
      loadStatistics(),
      loadFilterOptions(),
      loadTableData(),
    ])
  } finally {
    pageLoading.value = false
  }
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.page-desc {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.page-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  font-size: 24px;
}

.stat-card-body {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.stat-sub {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 4px;
}

.stat-sub .split {
  margin: 0 6px;
  color: #dcdfe6;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* 表格 */
.table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 16px;
}

.sensitive-count {
  color: #c62828;
  font-weight: 600;
}

.aggregation-text {
  font-size: 12px;
  color: #606266;
}

/* 展开内容 */
.expand-content {
  padding: 12px 20px;
  background: #f5f7fa;
}

.expand-empty {
  padding: 12px 20px;
  color: #909399;
  font-size: 13px;
}

.level-tag {
  display: inline-block;
  padding: 2px 8px;
  margin: 2px 4px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

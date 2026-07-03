<template>
  <PageShell title="报告中心" description="数据分类分级合规报告生成与管理">

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon total"><el-icon :size="22"><Document /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">报告总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon completed"><el-icon :size="22"><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon generating"><el-icon :size="22"><Loading /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.generating }}</div>
          <div class="stat-label">生成中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon failed"><el-icon :size="22"><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.failed }}</div>
          <div class="stat-label">失败</div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="filter-group">
        <el-input
          v-model="filters.keyword"
          placeholder="报告编号 / 标题"
          clearable
          style="width: 200px"
          @clear="fetchReports"
          @keyup.enter="fetchReports"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select
          v-model="filters.report_type"
          placeholder="报告类型"
          clearable
          style="width: 180px"
          @change="fetchReports"
        >
          <el-option
            v-for="t in reportTypeOptions"
            :key="t.value"
            :label="t.label"
            :value="t.value"
          />
        </el-select>

        <el-select
          v-model="filters.status"
          placeholder="状态"
          clearable
          style="width: 130px"
          @change="fetchReports"
        >
          <el-option label="已完成" value="completed" />
          <el-option label="生成中" value="generating" />
          <el-option label="失败" value="failed" />
          <el-option label="待处理" value="pending" />
        </el-select>
      </div>

      <div class="action-group">
        <el-button size="small" @click="resetFilters">重置</el-button>
        <el-button type="primary" size="small" @click="fetchReports">
          <el-icon style="margin-right: 4px"><Search /></el-icon>搜索
        </el-button>
        <el-button type="primary" size="small" @click="openGenerateDialog">
          <el-icon style="margin-right: 4px"><Plus /></el-icon>生成报告
        </el-button>
      </div>
    </div>

    <!-- 报告列表 -->
    <DataTable
      :data="reportList"
      :loading="loading"
      :total="pagination.total"
      :current-page="pagination.page"
      :page-size="pagination.pageSize"
      @page-change="handlePageChange"
    >
      <el-table-column prop="report_no" label="报告编号" min-width="160">
        <template #default="{ row }">
          <div class="report-no-cell">
            <span class="report-no">{{ row.report_no }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="报告类型" min-width="160">
        <template #default="{ row }">
          <span class="report-type-tag">{{ getTypeLabel(row.report_type) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="title" label="报告标题" min-width="200" show-overflow-tooltip />

      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            :type="statusTagType(row.status)"
            size="small"
            effect="light"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="格式" width="70">
        <template #default="{ row }">
          <span class="file-format">{{ (row.file_format || 'pdf').toUpperCase() }}</span>
        </template>
      </el-table-column>

      <el-table-column label="文件大小" width="100">
        <template #default="{ row }">
          <span class="text-muted">{{ formatFileSize(row.file_size) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="generated_at" label="生成时间" min-width="170">
        <template #default="{ row }">
          <span class="text-muted">{{ formatTime(row.generated_at) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" min-width="160" fixed="right">
        <template #default="{ row }">
          <div class="action-btns">
            <el-button
              v-if="row.status === 'completed'"
              type="primary"
              link
              size="small"
              @click="openPreview(row)"
            >
              预览
            </el-button>
            <el-button
              v-if="row.status === 'completed'"
              type="primary"
              link
              size="small"
              @click="handleDownload(row)"
            >
              下载
            </el-button>
            <el-button
              v-if="row.status === 'generating'"
              type="warning"
              link
              size="small"
              @click="checkStatus(row)"
            >
              刷新状态
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </DataTable>

    <!-- 生成报告对话框 -->
    <ReportGenerateDialog
      v-model="generateDialogVisible"
      @generated="onReportGenerated"
    />

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewData?.title || previewData?.report_no || '报告预览'"
      width="88%"
      top="3vh"
      destroy-on-close
      class="report-preview-dialog"
    >
      <div v-if="previewLoading" class="preview-loading">
        <el-icon class="is-loading" :size="36"><Loading /></el-icon>
        <p>正在加载报告内容...</p>
      </div>

      <div v-else-if="previewData?.status === 'generating'" class="preview-loading generating">
        <el-icon :size="48" color="#faad14"><WarningFilled /></el-icon>
        <p style="font-size: 15px; color: #1a1a2e; margin-top: 16px; font-weight: 600;">
          报告正在生成中
        </p>
        <p style="color: #909399; margin-top: 8px;">
          报告编号：{{ previewData.report_no }}，请稍后再预览
        </p>
        <el-button type="primary" style="margin-top: 20px" @click="checkPreviewStatus">
          刷新状态
        </el-button>
      </div>

      <div v-else-if="previewData?.status === 'failed'" class="preview-loading">
        <el-icon :size="48" color="#ff4d4f"><CircleCloseFilled /></el-icon>
        <p style="font-size: 15px; color: #1a1a2e; margin-top: 16px; font-weight: 600;">
          报告生成失败
        </p>
        <p style="color: #909399; margin-top: 8px;">{{ previewData.error_message }}</p>
      </div>

      <iframe
        v-else-if="previewData?.html_content"
        :srcdoc="previewData.html_content"
        class="preview-iframe"
        sandbox="allow-same-origin"
      />

      <div v-else class="preview-loading">
        <el-empty description="暂无预览内容" />
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button
          v-if="previewData?.status === 'completed'"
          type="primary"
          @click="handleDownload(previewTarget!)"
        >
          <el-icon style="margin-right: 4px"><Download /></el-icon>下载报告
        </el-button>
      </template>
    </el-dialog>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Document, CircleCheck, CircleClose, Loading, Download, WarningFilled, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ReportGenerateDialog from './ReportGenerateDialog.vue'
import {
  getReports,
  getReportStats,
  previewReport,
  downloadReport,
  deleteReport,
  type ReportItem,
  type PreviewData,
  type ReportStats,
  type ReportType,
} from '@/api/reports'

// ===== 报告类型选项 =====
const REPORT_TYPE_OPTIONS = [
  { value: 'classification_catalog', label: '数据分类分级目录' },
  { value: 'annual_security', label: '数据安全年度评估' },
  { value: 'pia', label: '个人信息保护影响评估' },
  { value: 'important_data', label: '重要数据识别报告' },
  { value: 'audit_summary', label: '审计合规摘要' },
  { value: 'change_log', label: '分类分级变更报告' },
]

const reportTypeOptions = REPORT_TYPE_OPTIONS

// ===== 状态 =====
const loading = ref(false)
const reportList = ref<ReportItem[]>([])
const stats = reactive<ReportStats>({ total: 0, completed: 0, generating: 0, failed: 0, pending: 0 })

const filters = reactive({
  keyword: '',
  report_type: '',
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// ===== 预览 =====
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewData = ref<PreviewData | null>(null)
const previewTarget = ref<ReportItem | null>(null)

// ===== 生成对话框 =====
const generateDialogVisible = ref(false)

// ===== 初始化 =====
onMounted(() => {
  fetchStats()
  fetchReports()
})

// ===== 获取列表 =====
async function fetchReports() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.pageSize,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.report_type) params.report_type = filters.report_type
    if (filters.status) params.status = filters.status

    const res = await getReports(params)
    reportList.value = res.items || []
    pagination.total = res.total || 0
  } catch {
    ElMessage.error('获取报告列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const data = await getReportStats()
    Object.assign(stats, data)
  } catch {
    // stats 失败不影响主流程
  }
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  pagination.page = page
  pagination.pageSize = size
  fetchReports()
}

function resetFilters() {
  filters.keyword = ''
  filters.report_type = ''
  filters.status = ''
  pagination.page = 1
  fetchReports()
}

// ===== 生成报告 =====
function openGenerateDialog() {
  generateDialogVisible.value = true
}

function onReportGenerated(reportId: number) {
  fetchStats()
  pagination.page = 1
  fetchReports()
  // 自动打开新生成报告的预览
  const newly = reportList.value.find((r) => r.id === reportId)
  if (!newly) {
    // 列表刷新后查找
    setTimeout(() => {
      const r = reportList.value.find((x) => x.id === reportId)
      if (r) openPreview(r)
    }, 1000)
  }
}

// ===== 预览 =====
async function openPreview(row: ReportItem) {
  previewTarget.value = row
  previewVisible.value = true
  previewLoading.value = true
  previewData.value = null

  try {
    const data = await previewReport(row.id)
    previewData.value = data
  } catch (err: any) {
    ElMessage.error(err?.message || '获取预览失败')
  } finally {
    previewLoading.value = false
  }
}

async function checkPreviewStatus() {
  if (!previewTarget.value) return
  previewLoading.value = true
  try {
    const data = await previewReport(previewTarget.value.id)
    previewData.value = data
  } finally {
    previewLoading.value = false
  }
}

// ===== 下载 =====
async function handleDownload(row: ReportItem) {
  if (row.status !== 'completed') {
    ElMessage.warning('报告尚未生成完成，暂不可下载')
    return
  }
  try {
    await downloadReport(row.id)
    ElMessage.success('报告下载已开始')
  } catch (err) {
    ElMessage.error('下载失败')
  }
}

// ===== 状态刷新 =====
async function checkStatus(row: ReportItem) {
  try {
    const data = await previewReport(row.id)
    const idx = reportList.value.findIndex((r) => r.id === row.id)
    if (idx !== -1) {
      reportList.value[idx].status = data.status
    }
    fetchStats()
    if (data.status === 'completed') {
      ElMessage.success('报告生成完成，可预览或下载')
    }
  } catch {
    ElMessage.error('状态刷新失败')
  }
}

// ===== 删除 =====
async function handleDelete(row: ReportItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告「${row.report_no}」吗？删除后无法恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return // 用户取消
  }

  try {
    await deleteReport(row.id)
    ElMessage.success('删除成功')
    fetchReports()
    fetchStats()
  } catch (err: any) {
    ElMessage.error(err?.message || '删除失败')
  }
}

// ===== 辅助 =====
function getTypeLabel(type: string) {
  return REPORT_TYPE_OPTIONS.find((t) => t.value === type)?.label || type
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    completed: '已完成',
    generating: '生成中',
    failed: '失败',
    pending: '待处理',
  }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, any> = {
    completed: 'success',
    generating: 'warning',
    failed: 'danger',
    pending: 'info',
  }
  return map[status] || 'info'
}

function formatFileSize(size?: number) {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(iso?: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
</script>

<style scoped>
/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 160px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat-icon.total { background: linear-gradient(135deg, #1890ff, #4fc3f7); }
.stat-icon.completed { background: linear-gradient(135deg, #52c41a, #73d13d); }
.stat-icon.generating { background: linear-gradient(135deg, #faad14, #ffc53d); }
.stat-icon.failed { background: linear-gradient(135deg, #ff4d4f, #ff7875); }

.stat-info { flex: 1; }

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 报告编号 */
.report-no-cell { display: flex; align-items: center; gap: 6px; }
.report-no { font-weight: 600; color: #1a1a2e; font-family: 'Courier New', monospace; }

/* 报告类型标签 */
.report-type-tag {
  font-size: 12px;
  color: #4fc3f7;
  font-weight: 600;
}

/* 格式 */
.file-format {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: #e6f0fa;
  color: #1890ff;
  border-radius: 4px;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* 预览 */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  color: #909399;
  text-align: center;
}

.preview-iframe {
  width: 100%;
  height: 70vh;
  min-height: 500px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: white;
}

.text-muted { font-size: 12px; color: #8c8c8c; }
</style>

<style>
/* 全局覆盖 el-dialog 样式 */
.report-preview-dialog .el-dialog__body {
  padding: 0 0 16px 0;
}
</style>

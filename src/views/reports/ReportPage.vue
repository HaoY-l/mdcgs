<template>
  <PageShell title="报告中心" description="查看和管理分类报告">
    <template #header-actions>
      <el-input v-model="filters.keyword" placeholder="报告编号 / 任务名称" clearable size="small"
        style="width: 240px; margin-right: 8px" @clear="fetchReports" @keyup.enter="fetchReports" />
      <el-button type="primary" size="small" @click="fetchReports">搜索</el-button>
      <el-button size="small" @click="resetFilters">重置</el-button>
    </template>

    <DataTable :data="reportList" :loading="loading" :total="pagination.total" :current-page="pagination.page"
      :page-size="pagination.pageSize" @page-change="handlePageChange">
      <el-table-column prop="report_no" label="报告编号" min-width="160" />
      <el-table-column prop="task_name" label="任务名称" min-width="200" />
      <el-table-column prop="generated_at" label="生成时间" min-width="180" />
      <el-table-column prop="file_size" label="报告大小" min-width="120" />
      <el-table-column label="操作" min-width="160" fixed="right">
        <template #default="{ row }">
          <ActionColumn :actions="getReportActions(row)" />
        </template>
      </el-table-column>
    </DataTable>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewData?.task_name || '报告预览'"
      width="80%"
      top="5vh"
      destroy-on-close
    >
      <div v-if="previewLoading" style="text-align: center; padding: 60px;">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p style="margin-top: 12px; color: #909399;">加载中...</p>
      </div>
      <div v-else-if="previewData?.html_content" class="preview-container" v-html="previewData.html_content"></div>
      <div v-else style="text-align: center; padding: 80px; color: #909399;">
        <el-empty description="暂无预览内容" />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleDownload(previewTarget)" v-if="previewTarget">下载报告</el-button>
      </template>
    </el-dialog>

    <!-- 下载模拟提示 -->
    <el-dialog
      v-model="downloadVisible"
      title="下载报告"
      width="420px"
    >
      <div style="text-align: center; padding: 20px 0;">
        <el-icon :size="48" color="#409EFF"><Download /></el-icon>
        <p style="margin-top: 16px; color: #606266;">
          {{ downloadInfo?.file_name || '报告' }}
        </p>
        <p style="margin-top: 8px; font-size: 13px; color: #909399;">
          文件大小: {{ downloadInfo?.file_size || '未知' }}
        </p>
        <p style="margin-top: 8px; font-size: 13px; color: #E6A23C;">
          {{ downloadInfo?.message || '模拟返回，实际部署时将提供文件下载' }}
        </p>
      </div>
      <template #footer>
        <el-button @click="downloadVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Loading, Download } from '@element-plus/icons-vue'
import { getReports, getReportDetail, downloadReport, previewReport } from '@/api/reports'
import type { ReportItem, DownloadInfo, PreviewData } from '@/api/reports'
import { ElMessage } from 'element-plus'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'

const loading = ref(false)
const previewLoading = ref(false)
const reportList = ref<ReportItem[]>([])

const filters = reactive({
  keyword: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const previewVisible = ref(false)
const previewData = ref<PreviewData | null>(null)
const previewTarget = ref<ReportItem | null>(null)

const downloadVisible = ref(false)
const downloadInfo = ref<DownloadInfo | null>(null)

onMounted(() => {
  fetchReports()
})

async function fetchReports() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.pageSize,
    }
    if (filters.keyword) {
      params.keyword = filters.keyword
    }
    const res = await getReports(params)
    if (res.data?.code === 0) {
      reportList.value = res.data.data?.items || []
      pagination.total = res.data.data?.total || 0
    } else {
      ElMessage.error(res.data?.message || '获取报告列表失败')
    }
  } catch (err) {
    ElMessage.error('获取报告列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  pagination.page = page
  pagination.pageSize = size
  fetchReports()
}

function resetFilters() {
  filters.keyword = ''
  pagination.page = 1
  fetchReports()
}

async function openPreview(row: ReportItem) {
  previewTarget.value = row
  previewVisible.value = true
  previewLoading.value = true
  previewData.value = null
  try {
    const res = await previewReport(row.id)
    if (res.data?.code === 0) {
      previewData.value = res.data.data
    } else {
      ElMessage.error(res.data?.message || '获取预览失败')
    }
  } catch (err) {
    ElMessage.error('获取报告预览失败')
  } finally {
    previewLoading.value = false
  }
}

async function handleDownload(row: ReportItem) {
  try {
    const res = await downloadReport(row.id)
    if (res.data?.code === 0) {
      downloadInfo.value = res.data.data
      downloadVisible.value = true
    } else {
      ElMessage.error(res.data?.message || '获取下载信息失败')
    }
  } catch (err) {
    ElMessage.error('下载失败')
  }
}

function getReportActions(row: ReportItem) {
  return [
    { label: '查看', click: () => openPreview(row) },
    { label: '下载', click: () => handleDownload(row) },
  ]
}
</script>

<style scoped>
.preview-container {
  max-height: 70vh;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
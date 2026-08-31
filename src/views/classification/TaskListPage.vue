<template>
  <div class="page-container">
    <div class="page-header">
      <h2>分类任务管理</h2>
      <div class="header-actions">
        <el-input v-model="searchKeyword" placeholder="搜索任务名称" clearable size="small" style="width: 180px" @clear="handleKeywordSearch" @keyup.enter="handleKeywordSearch" />
        <el-select v-model="filterStatus" placeholder="任务状态" clearable size="small" style="width: 130px" @change="handleStatusFilter">
          <el-option label="待处理" value="pending" />
          <el-option label="排队中" value="queued" />
          <el-option label="执行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="已停止" value="stopped" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-select v-model="filterExecuteType" placeholder="执行方式" clearable size="small" style="width: 130px" @change="handleExecuteTypeFilter">
          <el-option label="手动执行" value="manual" />
          <el-option label="周期执行" value="periodic" />
        </el-select>
        <el-button size="small" @click="fetchTasks">刷新</el-button>
        <el-button type="primary" size="small" @click="handleCreateTask">新建任务</el-button>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <div v-show="selectedTaskIds.length > 0" class="batch-toolbar">
      <el-button type="success" size="small" @click="handleBatchStart">
        批量启动 ({{ selectedTaskIds.length }})
      </el-button>
      <el-button type="warning" size="small" @click="handleBatchStop">
        批量停止 ({{ selectedTaskIds.length }})
      </el-button>
      <el-button type="danger" size="small" @click="handleBatchDelete">
        批量删除 ({{ selectedTaskIds.length }})
      </el-button>
      <span class="batch-tip">已选择 {{ selectedTaskIds.length }} 项</span>
    </div>

    <el-card shadow="hover">
      <el-table :data="tasks" stripe style="width: 100%" v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="34" />
        <!-- <el-table-column prop="id" label="ID" width="45" /> -->
        <el-table-column prop="name" label="任务名称" min-width="80" show-overflow-tooltip />
        <el-table-column prop="template_name" label="关联模板" min-width="90" show-overflow-tooltip />
        <el-table-column label="执行" width="52" align="center">
          <template #default="{ row }">
            <el-tag :type="row.execute_type === 'periodic' ? 'primary' : 'info'" size="small">{{ row.execute_type === 'periodic' ? '周期' : '手动' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tooltip :content="row.error_message || ''" placement="top" :disabled="!row.error_message">
              <el-tag :type="taskStatusType(row.status)" size="small">
                <span v-if="row.status === 'running' || row.status === 'processing' || row.status === 'queued'" class="status-spinner" />
                {{ taskStatusLabel(row.status) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="80">
          <template #default="{ row }">
            <el-progress v-if="row.status === 'running' || row.status === 'processing'" :percentage="row.progress || 0" :stroke-width="14" style="width: 50px" />
            <span v-else-if="row.status === 'completed'" style="color: #67c23a">已完成</span>
            <span v-else-if="row.status === 'queued'" style="color: #909399">等待中</span>
            <span v-else style="color: #909399">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_by_name" label="创建人" width="80" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="上次执行" width="160">
          <template #default="{ row }">
            {{ formatTime(row.last_run_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'running' && row.status !== 'processing' && row.status !== 'queued'" link type="success" size="small" @click="handleStartTask(row)">启动</el-button>
            <el-button v-if="row.status === 'running' || row.status === 'processing' || row.status === 'queued'" link type="warning" size="small" @click="handleStopTask(row)">停止</el-button>
            <el-button v-if="row.status !== 'running' && row.status !== 'processing' && row.status !== 'queued'" link type="primary" size="small" @click="handleViewTask(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEditTask(row)">编辑</el-button>
            <el-button v-if="row.status !== 'running' && row.status !== 'processing'" link type="danger" size="small" @click="handleDeleteTask(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="total" layout="total, sizes, prev, pager, next, jumper" :page-sizes="[10, 20, 50, 100]" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTasks, deleteTask, startTask, stopTask, batchStartTasks } from '@/api/task'

const router = useRouter()
const loading = ref(false)
const tasks = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterStatus = ref('')
const filterExecuteType = ref('')

// 选中项
const selectedTaskIds = ref<number[]>([])
const selectedTasks = ref<any[]>([])

// 自动刷新定时器
let refreshTimer: number | null = null

// 是否有正在运行或排队的任务
const hasRunningTasks = computed(() => tasks.value.some(t =>
  t.status === 'running' || t.status === 'processing' || t.status === 'queued'
))

const taskStatusMap: Record<string, { label: string; type: string }> = {
  pending: { label: '待处理', type: 'warning' },
  queued: { label: '排队中', type: 'info' },
  running: { label: '执行中', type: 'primary' },
  processing: { label: '处理中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  stopped: { label: '已停止', type: 'info' },
  failed: { label: '失败', type: 'danger' },
}
function taskStatusLabel(status: string): string { return taskStatusMap[status]?.label || status }
function taskStatusType(status: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' | undefined { return taskStatusMap[status]?.type as any || 'info' }

function formatTime(time: string): string {
  if (!time) return '-'
  try {
    const d = new Date(time)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return time }
}

function handleSelectionChange(rows: any[]) {
  selectedTasks.value = rows
  selectedTaskIds.value = rows.map(r => r.id)
}

function getParams() {
  const params: any = { page: currentPage.value, page_size: pageSize.value }
  if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
  if (filterStatus.value) params.status = filterStatus.value
  if (filterExecuteType.value) params.execute_type = filterExecuteType.value
  return params
}

async function fetchTasks() {
  loading.value = true
  try {
    const res = await getTasks(getParams())
    tasks.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

// 自动刷新：页面可见时每5秒轮询一次，有运行中/排队中任务则自动刷新列表
function startAutoRefresh() {
  if (refreshTimer) return
  refreshTimer = window.setInterval(() => {
    if (tasks.value.some(t => t.status === 'running' || t.status === 'processing' || t.status === 'queued')) {
      fetchTasks()
    }
  }, 5000)
}

onMounted(() => {
  fetchTasks()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

function handleKeywordSearch() { currentPage.value = 1; fetchTasks() }
function handleStatusFilter() { currentPage.value = 1; fetchTasks() }
function handleExecuteTypeFilter() { currentPage.value = 1; fetchTasks() }
function handleSizeChange(size: number) { pageSize.value = size; currentPage.value = 1; fetchTasks() }
function handleCurrentChange(page: number) { currentPage.value = page; fetchTasks() }

function handleCreateTask() { router.push('/classification/tasks/create') }
function handleViewTask(row: any) { router.push(`/classification/tasks/${row.id}`) }
function handleEditTask(row: any) { router.push(`/classification/tasks/${row.id}/edit`) }

async function handleStartTask(row: any) {
  try {
    await ElMessageBox.confirm(`确定启动任务 "${row.name}" 吗？`, '确认', { type: 'info' })
    const res = await startTask(row.id)
    if (res.data?.message) {
      ElMessage.warning(res.data.message)
    } else {
      ElMessage.success('任务已启动')
    }
    // 立即乐观更新状态 + 刷新
    row.status = 'queued'
    fetchTasks()
    // 1.5s 后再刷新一次，确保拿到后端最新状态
    setTimeout(() => fetchTasks(), 1500)
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.response?.data?.message || err?.message || '启动任务失败')
    }
  }
}

async function handleStopTask(row: any) {
  try {
    await ElMessageBox.confirm(`确定停止任务 "${row.name}" 吗？`, '确认', { type: 'warning' })
    await stopTask(row.id)
    ElMessage.success('任务已停止')
    fetchTasks()
  } catch {}
}

async function handleDeleteTask(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await deleteTask(row.id)
    ElMessage.success('已删除')
    fetchTasks()
  } catch {}
}

// ===== 批量操作 =====

async function handleBatchStart() {
  try {
    const names = selectedTasks.value.map(t => `"${t.name}"`).join('、')
    await ElMessageBox.confirm(`确定启动以下 ${selectedTaskIds.value.length} 个任务？<br>${names}`, '批量启动', {
      type: 'info',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '全部启动',
      cancelButtonText: '取消',
    })

    // 调用批量启动API
    const res = await batchStartTasks(selectedTaskIds.value)
    if (res?.code === 0) {
      const results = res?.data || []
      const successCount = results.filter((r: any) => r.status === 'submitted').length
      const runningCount = results.filter((r: any) => r.status === 'running').length
      const queuedCount = results.filter((r: any) => r.status === 'queued').length
      const notFoundCount = results.filter((r: any) => r.status === 'not_found').length

      let msg = ''
      if (successCount > 0) msg += `成功启动 ${successCount} 个任务`
      if (queuedCount > 0) msg += (msg ? '；' : '') + `${queuedCount} 个正在排队中`
      if (runningCount > 0) msg += (msg ? '；' : '') + `${runningCount} 个正在运行`
      if (notFoundCount > 0) msg += (msg ? '；' : '') + `${notFoundCount} 个任务不存在`
      ElMessage.info(msg || '批量启动完成')
    } else {
      ElMessage.error(res?.message || '批量启动失败')
    }

    selectedTaskIds.value = []
    selectedTasks.value = []
    fetchTasks()
    // 1.5s 后再刷新一次，确保拿到后端最新状态
    setTimeout(() => fetchTasks(), 1500)
  } catch {}
}

async function handleBatchStop() {
  try {
    const names = selectedTasks.value.map(t => `"${t.name}"`).join('、')
    await ElMessageBox.confirm(`确定停止以下 ${selectedTaskIds.value.length} 个任务？<br>${names}`, '批量停止', {
      type: 'warning',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '全部停止',
      cancelButtonText: '取消',
    })

    let stoppedCount = 0
    let skippedCount = 0
    for (const row of selectedTasks.value) {
      // 只停止运行中/排队中的
      if (row.status !== 'running' && row.status !== 'processing' && row.status !== 'queued') {
        skippedCount++
        continue
      }
      try {
        await stopTask(row.id)
        stoppedCount++
      } catch {
        // ignore
      }
      await new Promise(r => setTimeout(r, 300))
    }

    let msg = ''
    if (stoppedCount > 0) msg += `已停止 ${stoppedCount} 个任务`
    if (skippedCount > 0) msg += (msg ? '；' : '') + `${skippedCount} 个无需停止`
    ElMessage.info(msg || '批量停止完成')
    fetchTasks()
  } catch {}
}

async function handleBatchDelete() {
  try {
    const names = selectedTasks.value.map(t => `"${t.name}"`).join('、')
    await ElMessageBox.confirm(
      `确定删除以下 ${selectedTaskIds.value.length} 个任务？<br><span style="color:red">此操作不可恢复！</span><br>${names}`,
      '批量删除',
      {
        type: 'error',
        dangerouslyUseHTMLString: true,
        confirmButtonText: '全部删除',
        cancelButtonText: '取消',
      }
    )

    let deletedCount = 0
    let runningSkipped = 0
    for (const row of selectedTasks.value) {
      if (row.status === 'running' || row.status === 'processing') {
        runningSkipped++
        continue
      }
      try {
        await deleteTask(row.id)
        deletedCount++
      } catch {
        // ignore
      }
      await new Promise(r => setTimeout(r, 300))
    }

    let msg = ''
    if (deletedCount > 0) msg += `已删除 ${deletedCount} 个任务`
    if (runningSkipped > 0) msg += (msg ? '；' : '') + `${runningSkipped} 个正在运行的任务跳过删除`
    ElMessage.info(msg || '批量删除完成')
    selectedTaskIds.value = []
    selectedTasks.value = []
    fetchTasks()
  } catch {}
}

</script>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 8px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 20px; }
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: var(--el-border-radius-base);
}
.batch-tip {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.status-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
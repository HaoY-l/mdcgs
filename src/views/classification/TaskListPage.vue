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
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="任务ID" width="80" />
        <el-table-column prop="name" label="任务名称" min-width="160" />
        <el-table-column prop="template_name" label="关联模板" min-width="130" />
        <el-table-column label="执行方式" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.execute_type === 'periodic' ? 'primary' : 'info'" size="small">{{ row.execute_type === 'periodic' ? '周期' : '手动' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tooltip :content="row.error_message || ''" placement="top" :disabled="!row.error_message">
              <el-tag :type="taskStatusType(row.status)" size="small">{{ taskStatusLabel(row.status) }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="160">
          <template #default="{ row }">
            <el-progress v-if="row.status === 'running' || row.status === 'processing'" :percentage="row.progress || 0" :stroke-width="14" style="width: 120px" />
            <span v-else-if="row.status === 'completed'" style="color: #67c23a">已完成</span>
            <span v-else-if="row.status === 'queued'" style="color: #909399">等待中</span>
            <span v-else style="color: #909399">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_by_name" label="创建人" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" min-width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="handleStartTask(row)">启动</el-button>
            <el-button v-if="row.status === 'running' || row.status === 'processing' || row.status === 'queued'" link type="warning" size="small" @click="handleStopTask(row)">停止</el-button>
            <el-button link type="primary" size="small" @click="handleViewTask(row)">查看</el-button>
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
import { getTasks, deleteTask, startTask, stopTask } from '@/api/task'

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
    fetchTasks()
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
    let successCount = 0
    let failCount = 0
    let alreadyRunningCount = 0
    let queuedCount = 0

    for (const row of selectedTasks.value) {
      // 过滤掉已经在运行/排队中的
      if (row.status === 'running' || row.status === 'processing') {
        alreadyRunningCount++
        continue
      }
      if (row.status === 'queued') {
        queuedCount++
        continue
      }
      try {
        const res = await startTask(row.id)
        // 拦截器返回的是 { code, data, message }，code=0 表示成功
        // 消息中如果包含"排队"则算作排队，否则算成功
        const msgText = res?.message || ''
        if (res?.code === 0) {
          if (msgText.includes('排队')) {
            queuedCount++
          } else {
            successCount++
          }
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
      // 每间隔500ms发一个请求，避免后端瞬间并发
      await new Promise(r => setTimeout(r, 500))
    }

    let msg = ''
    if (successCount > 0) msg += `成功启动 ${successCount} 个任务`
    if (queuedCount > 0) msg += (msg ? '；' : '') + `${queuedCount} 个正在排队中`
    if (alreadyRunningCount > 0) msg += (msg ? '；' : '') + `${alreadyRunningCount} 个正在运行`
    if (failCount > 0) msg += (msg ? '；' : '') + `${failCount} 个启动失败`
    ElMessage.info(msg || '批量启动完成')
    selectedTaskIds.value = []
    selectedTasks.value = []
    fetchTasks()
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
</style>
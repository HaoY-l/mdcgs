<template>
  <div class="page-container">
    <div class="page-header">
      <h2>分类任务管理</h2>
      <div class="header-actions">
        <el-input v-model="searchKeyword" placeholder="搜索任务名称" clearable size="small" style="width: 180px" @clear="handleKeywordSearch" @keyup.enter="handleKeywordSearch" />
        <el-select v-model="filterStatus" placeholder="任务状态" clearable size="small" style="width: 130px" @change="handleStatusFilter">
          <el-option label="待处理" value="pending" />
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
    <el-card shadow="hover">
      <el-table :data="tasks" stripe style="width: 100%" v-loading="loading">
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
            <el-tag :type="taskStatusType(row.status)" size="small">{{ taskStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="160">
          <template #default="{ row }">
            <el-progress v-if="row.status === 'running' || row.status === 'processing'" :percentage="row.progress || 0" :stroke-width="14" style="width: 120px" />
            <span v-else-if="row.status === 'completed'" style="color: #67c23a">已完成</span>
            <span v-else style="color: #909399">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_by_name" label="创建人" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" min-width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="handleStartTask(row)">启动</el-button>
            <el-button v-if="row.status === 'running' || row.status === 'processing'" link type="warning" size="small" @click="handleStopTask(row)">停止</el-button>
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
import { ref, onMounted } from 'vue'
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

const taskStatusMap: Record<string, { label: string; type: string }> = {
  pending: { label: '待处理', type: 'warning' },
  running: { label: '执行中', type: 'primary' },
  processing: { label: '处理中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  stopped: { label: '已停止', type: 'info' },
  failed: { label: '失败', type: 'danger' },
}
function taskStatusLabel(status: string): string { return taskStatusMap[status]?.label || status }
function taskStatusType(status: string): string { return taskStatusMap[status]?.type || 'info' }

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
    await startTask(row.id)
    ElMessage.success('任务已启动')
    fetchTasks()
  } catch {}
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

onMounted(() => { fetchTasks() })
</script>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 8px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 20px; }
</style>
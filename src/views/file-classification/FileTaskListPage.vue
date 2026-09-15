<template>
  <div class="page-container">
    <div class="page-header">
      <h2>文件分类任务管理</h2>
      <div class="header-actions">
        <!-- 通用搜索/状态/执行方式/刷新/新建任务 已上移到 PageShell 顶部 -->
      </div>
    </div>

    <!-- 批量操作工具栏（与数据库任务完全一致） -->
    <div v-show="selectedIds.length > 0" class="batch-toolbar">
      <el-button type="success" size="small" @click="onBatchStart">
        批量启动 ({{ selectedIds.length }})
      </el-button>
      <el-button type="warning" size="small" @click="onBatchStop">
        批量停止 ({{ selectedIds.length }})
      </el-button>
      <el-button type="danger" size="small" @click="onBatchDelete">
        批量删除 ({{ selectedIds.length }})
      </el-button>
      <span class="batch-tip">已选择 {{ selectedIds.length }} 项</span>
    </div>

    <el-card shadow="hover">
    <el-table
      :data="items" v-loading="loading" stripe style="width: 100%" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="34" />
      <!-- <el-table-column prop="id" label="ID" width="45" /> -->
      <el-table-column prop="name" label="任务名称" min-width="80" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="goDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="关联模板" min-width="90" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag size="small">{{ templateMap.get(row.template_id) || `#${row.template_id}` }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行" width="52" align="center">
        <template #default="{ row }">
          <el-tag :type="row.execute_type === 'periodic' ? 'primary' : 'info'" size="small">{{ row.execute_type === 'periodic' ? '周期' : '手动' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tooltip :content="row.error_message || ''" placement="top" :disabled="!row.error_message">
            <el-tag :type="statusType(row.status)" size="small">
              <span v-if="row.status === 'running' || row.status === 'processing' || row.status === 'queued'" class="status-spinner" />
              {{ statusText(row.status) }}
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="进度" width="80">
        <template #default="{ row }">
          <span :style="{ color: row.status === 'completed' ? '#67c23a' : row.status === 'failed' ? '#f56c6c' : '' }">
            {{ row.progress || 0 }}%
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="created_by_name" label="创建人" width="80" show-overflow-tooltip />
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="上次执行" width="160">
        <template #default="{ row }">{{ formatTime(row.last_run_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'running' && row.status !== 'processing' && row.status !== 'queued'" link type="success" size="small" @click="onStart(row)">启动</el-button>
          <el-button v-if="row.status === 'running' || row.status === 'processing' || row.status === 'queued'" link type="warning" size="small" @click="onStop(row)">停止</el-button>
          <el-button v-if="row.status !== 'running' && row.status !== 'processing' && row.status !== 'queued'" link type="primary" size="small" @click="goDetail(row)">查看</el-button>
          <el-button link type="primary" size="small" @click="goEdit(row)">编辑</el-button>
          <el-button v-if="row.status !== 'running' && row.status !== 'processing'" link type="danger" size="small" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper" v-if="total > 0">
      <el-pagination
        v-model:current-page="page" :page-size="pageSize" :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="(s: number) => { pageSize = s; page = 1; fetch() }"
        @current-change="(p: number) => { page = p; fetch() }"
      />
    </div>
    </el-card>

    <el-dialog v-model="createDialog" title="新建文件分类任务" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.name" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="使用模板" required>
          <el-select v-model="form.template_id" style="width: 100%" placeholder="选择分类模板">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件资产" required>
          <el-select v-model="form.file_asset_ids" multiple style="width: 100%" placeholder="选择要分类的文件资产（可多选）" filterable>
            <el-option v-for="a in fileAssets" :key="a.id" :label="`${a.name} (${a.file_count} 文件)`" :value="a.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="onCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getFileTasks, createFileTask, deleteFileTask, startFileTask,
  stopFileTask, batchStartFileTasks,
} from '@/api/fileClassification'
import { getFileAssets } from '@/api/fileAsset'
import client from '@/api/client'

const router = useRouter()
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const selectedIds = ref<number[]>([])  // 批量选择
let refreshTimer: any = null  // 自动轮询定时器
// 通用搜索/状态/执行方式 由父组件 TaskTabPage 提供
const props = defineProps<{
  searchKeyword: string
  filterStatus: string
  filterExecuteType: string
}>()

const templates = ref<any[]>([])
// id → name 映射，用于把任务列表里的 template_id / file_asset_ids 渲染为可读名字
const templateMap = computed(() => {
  const m = new Map<number, string>()
  for (const t of templates.value) m.set(t.id, t.name)
  return m
})
const fileAssetMap = computed(() => {
  const m = new Map<number, string>()
  for (const a of allFileAssets.value) m.set(a.id, a.name)
  return m
})
const allFileAssets = ref<any[]>([])

function resolveAssetNames(ids?: number[] | null) {
  if (!ids || !ids.length) return '-'
  const names = ids.map((id: number) => fileAssetMap.value.get(id) || `#${id}`)
  if (names.length <= 2) return names.join('、')
  return `${names[0]}、${names[1]} 等 ${names.length} 个`
}
const fileAssets = ref<any[]>([])

const createDialog = ref(false)
const creating = ref(false)
const form = reactive({ name: '', template_id: null as any, file_asset_ids: [] as number[] })

function formatTime(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN', { hour12: false })
}
function statusText(s: string) { return ({ pending: '待处理', queued: '排队中', running: '执行中', completed: '已完成', stopped: '已停止', failed: '失败' } as any)[s] || s }
function statusType(s: string) { return ({ pending: 'info', queued: 'warning', running: 'warning', completed: 'success', stopped: '', failed: 'danger' } as any)[s] || 'info' }

async function fetch() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, page_size: pageSize.value }
    if (props.searchKeyword) params.keyword = props.searchKeyword
    if (props.filterStatus) params.status = props.filterStatus
    if (props.filterExecuteType) params.execute_type = props.filterExecuteType
    const res: any = await getFileTasks(params)
    items.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function goCreate() {
  // 加载下拉数据
  Promise.all([
    client.get('/templates', { params: { page: 1, page_size: 100 } }),
    getFileAssets({ page: 1, page_size: 100 }),
  ]).then(([t, a]) => {
    templates.value = t.data?.items || []
    fileAssets.value = a.data?.items || []
    createDialog.value = true
  })
}

async function onCreate() {
  if (!form.name.trim()) { ElMessage.warning('请填写任务名称'); return }
  if (!form.template_id) { ElMessage.warning('请选择模板'); return }
  if (!form.file_asset_ids.length) { ElMessage.warning('请选择至少一个文件资产'); return }
  creating.value = true
  try {
    const res: any = await createFileTask({
      name: form.name,
      template_id: form.template_id,
      file_asset_ids: form.file_asset_ids,
      execute_type: 'manual',
    })
    ElMessage.success('已创建，可在任务列表中手动启动')
    createDialog.value = false
    form.name = ''; form.template_id = null; form.file_asset_ids = []
    fetch()
  } finally {
    creating.value = false
  }
}

// 单条操作：启动（与数据库任务完全对齐：确认弹窗 + 乐观更新 + 1.5s 二次刷新）
async function onStart(row: any) {
  try {
    await ElMessageBox.confirm(`确定启动任务 "${row.name}" 吗？`, '确认', { type: 'info' })
    const res: any = await startFileTask(row.id)
    if (res?.data?.message && res.data.message !== '已启动') {
      ElMessage.warning(res.data.message)
    } else {
      ElMessage.success('任务已启动')
    }
    // 乐观更新：行状态改为 queued，立刻给用户反馈
    row.status = 'queued'
    fetch()
    // 1.5s 后再刷一次拿到后端真实状态
    setTimeout(() => fetch(), 1500)
    startAutoRefresh()
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.response?.data?.message || err?.message || '启动任务失败')
    }
  }
}

// 单条操作：停止
async function onStop(row: any) {
  try {
    await ElMessageBox.confirm(`确定停止任务 "${row.name}" 吗？`, '确认', { type: 'warning' })
    await stopFileTask(row.id)
    ElMessage.success('任务已停止')
    fetch()
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.response?.data?.message || err?.message || '停止任务失败')
    }
  }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除任务 "${row.name}" 吗？`, '确认', { type: 'warning' })
    await deleteFileTask(row.id)
    ElMessage.success('已删除')
    fetch()
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.message || '删除失败')
    }
  }
}

function goDetail(row: any) {
  router.push(`/file-classification-tasks/${row.id}`)
}

function goEdit(row: any) {
  router.push(`/file-classification-tasks/${row.id}/edit`)
}

// 批量操作
function onSelectionChange(rows: any[]) {
  selectedIds.value = rows.map(r => r.id)
}

async function onBatchStart() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择任务')
    return
  }
  try {
    const names = items.value
      .filter(t => selectedIds.value.includes(t.id))
      .map(t => t.name)
      .join('<br>')
    await ElMessageBox.confirm(
      `确定启动以下 ${selectedIds.value.length} 个任务？<br>${names}`,
      '批量启动', { type: 'info', confirmButtonText: '全部启动' }
    )
    const res: any = await batchStartFileTasks(selectedIds.value)
    const submitted = (res?.data || []).filter((r: any) => r.status === 'submitted').length
    const skipped = selectedIds.value.length - submitted
    let msg = `成功启动 ${submitted} 个任务`
    if (skipped) msg += `，跳过 ${skipped} 个（已在运行/不存在）`
    ElMessage.success(msg)
    selectedIds.value = []
    fetch()
    setTimeout(() => fetch(), 1500)
    startAutoRefresh()
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.response?.data?.message || err?.message || '批量启动失败')
    }
  }
}

async function onBatchStop() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择任务')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定停止所选 ${selectedIds.value.length} 个任务？`,
      '批量停止', { type: 'warning' }
    )
    let ok = 0
    for (const id of selectedIds.value) {
      try { await stopFileTask(id); ok++ } catch { /* 单个失败不影响其他 */ }
    }
    ElMessage.success(`已停止 ${ok} 个任务`)
    selectedIds.value = []
    fetch()
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.message || '批量停止失败')
    }
  }
}

async function onBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择任务')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认删除所选 ${selectedIds.value.length} 个任务？此操作不可恢复`,
      '批量删除', { type: 'warning' }
    )
    let ok = 0
    for (const id of selectedIds.value) {
      try { await deleteFileTask(id); ok++ } catch { /* */ }
    }
    ElMessage.success(`已删除 ${ok} 个任务`)
    selectedIds.value = []
    fetch()
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.message || '批量删除失败')
    }
  }
}

// 自动刷新：与数据库任务一致，有运行/排队中的任务时每 5s 轮询
function startAutoRefresh() {
  if (refreshTimer) return
  refreshTimer = setInterval(() => {
    const hasRunning = items.value?.some(t => t.status === 'running' || t.status === 'queued')
    if (hasRunning) {
      fetch()
    } else {
      stopAutoRefresh()
    }
  }, 5000)
}
function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 加载模板列表和文件资产列表（用于表格列的 id→name 渲染）
async function loadLookups() {
  try {
    const [tRes, aRes] = await Promise.all([
      client.get('/templates', { params: { page: 1, page_size: 100 } }),
      getFileAssets({ page: 1, page_size: 100 }),
    ])
    templates.value = tRes.data?.items || []
    allFileAssets.value = aRes.data?.items || []
  } catch (e) {
    // 静默失败：表格降级为显示 ID
  }
}

onMounted(() => { loadLookups(); fetch(); startAutoRefresh() })
onUnmounted(() => { stopAutoRefresh() })
// 监听父组件传入的通用搜索/状态/执行方式变化
watch(
  () => [props.searchKeyword, props.filterStatus, props.filterExecuteType],
  () => { page.value = 1; fetch() }
)

// 暴露给父组件调用
defineExpose({ fetch, goCreate })
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

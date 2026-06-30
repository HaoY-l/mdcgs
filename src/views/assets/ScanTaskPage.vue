<template>
  <div class="page-container">
    <div class="page-header">
      <h2>自动扫描</h2>
      <div class="header-actions">
        <el-button size="small" @click="fetchTasks">刷新</el-button>
        <el-button type="primary" size="small" @click="handleAdd">新增扫描任务</el-button>
      </div>
    </div>
    <el-card shadow="hover">
      <el-table :data="tasks" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="任务名称" min-width="150" />
        <el-table-column prop="ip_range" label="IP范围" min-width="180" />
        <el-table-column prop="port_range" label="端口范围" min-width="120" />
        <el-table-column label="执行方式" min-width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ executeTypeLabel(row.execute_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="扫描状态" min-width="120">
          <template #default="{ row }">
            <el-tooltip v-if="row.status === 'failed'" :content="row.error_message || '执行失败'" placement="top">
              <el-tag type="danger" size="small">{{ statusLabel(row.status) }}</el-tag>
            </el-tooltip>
            <el-tag v-else :type="statusTag(row.status) as any" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" min-width="140">
          <template #default="{ row }">
            <div v-if="row.status === 'running'" style="display: flex; align-items: center; gap: 8px;">
              <el-progress :percentage="row.progress || 0" :stroke-width="16" style="flex: 1" />
            </div>
            <span v-else-if="row.status === 'completed'" style="color: #67c23a">已完成</span>
            <span v-else-if="row.status === 'failed'" style="color: #f56c6c">执行失败</span>
            <span v-else style="color: #909399">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="asset_count" label="发现资产" min-width="80" />
        <el-table-column label="操作" min-width="260" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'running'" link type="primary" size="small" @click="handleStart(row)">开始</el-button>
            <el-button v-if="row.status === 'running'" link type="warning" size="small" @click="handleStop(row)">停止</el-button>
            <el-button v-if="row.status === 'completed' && row.asset_count > 0" link type="success" size="small" @click="handleViewResult(row)">查看结果</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchTasks" />
      </div>
    </el-card>

    <!-- 查看结果弹窗 -->
    <el-dialog v-model="showResultDialog" :title="'扫描结果 - ' + (resultTaskName)" width="600px">
      <el-table :data="discoveredAssets" stripe style="width: 100%" v-loading="resultLoading" size="small">
        <el-table-column prop="host" label="主机" min-width="140" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="asset_type" label="类型" width="80">
          <template #default="{ row }">{{ row.asset_type || '未知' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'claimed' ? 'success' : 'info'" size="small">
              {{ row.status === 'claimed' ? '已认领' : row.status === 'ignored' ? '已忽略' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleCreateAsset(row)">
              {{ row.status === 'claimed' ? '已创建' : '创建资产' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!discoveredAssets.length && !resultLoading" description="未发现开放端口" />
    </el-dialog>

    <!-- 新增扫描任务弹窗 -->
    <el-dialog v-model="showDialog" title="新增扫描任务" width="550px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="任务名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="执行方式" required>
          <el-radio-group v-model="form.execute_type">
            <el-radio value="manual">手动</el-radio>
            <el-radio value="periodic">周期</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.execute_type === 'periodic'">
          <el-form-item label="Cron表达式" required><el-input v-model="form.cron_expression" placeholder="0 0 2 * * ?" /></el-form-item>
        </template>
        <el-form-item label="IP范围" required><el-input v-model="form.ip_range" placeholder="192.168.1.0/24" /></el-form-item>
        <el-form-item label="端口范围"><el-input v-model="form.port_range" placeholder="1-65535" /></el-form-item>
        <el-form-item label="脱敏规则">
          <el-select v-model="form.masking_rule_id" placeholder="请选择(可选)" clearable style="width: 100%">
            <el-option v-for="r in maskingRules" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="加密方式">
          <el-select v-model="form.encryption_type_id" placeholder="请选择(可选)" clearable style="width: 100%">
            <el-option v-for="e in encryptionTypes" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import client from '@/api/client'
import { getMaskingRules, getEncryptionTypes } from '@/api/classification'
import { getScanTasks, createScanTask, deleteScanTask, startScanTask, stopScanTask } from '@/api/assets'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const tasks = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showDialog = ref(false)

const maskingRules = ref<any[]>([])
const encryptionTypes = ref<any[]>([])

const form = reactive({ name: '', execute_type: 'manual', cron_expression: '', ip_range: '', port_range: '', masking_rule_id: null, encryption_type_id: null })

// 查看结果
const showResultDialog = ref(false)
const resultLoading = ref(false)
const resultTaskName = ref('')
const resultTaskId = ref(0)
const discoveredAssets = ref<any[]>([])

const statusMap: Record<string, { label: string; tag: string }> = {
  pending: { label: '待执行', tag: 'info' },
  running: { label: '执行中', tag: 'warning' },
  completed: { label: '已完成', tag: 'success' },
  failed: { label: '执行失败', tag: 'danger' },
  stopped: { label: '已停止', tag: 'info' },
}

function statusLabel(status: string): string { return statusMap[status]?.label || status }
function statusTag(status: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | 'error' | '' { return (statusMap[status]?.tag || 'info') as 'success' | 'warning' | 'info' | 'danger' | 'primary' | 'error' | '' }
function executeTypeLabel(type: string): string { return type === 'periodic' ? '周期执行' : '手动执行' }

async function fetchTasks() {
  loading.value = true
  try {
    const res = await getScanTasks({ page: currentPage.value, page_size: pageSize.value })
    tasks.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

function handleAdd() {
  form.name = ''; form.execute_type = 'manual'; form.cron_expression = ''; form.ip_range = ''; form.port_range = ''; form.masking_rule_id = null; form.encryption_type_id = null
  showDialog.value = true
}

async function handleSave() {
  if (!form.name || !form.ip_range) { ElMessage.warning('请填写必要信息'); return }
  submitting.value = true
  try {
    await createScanTask({ ...form })
    ElMessage.success('创建成功')
    showDialog.value = false
    fetchTasks()
  } finally { submitting.value = false }
}

async function handleStart(row: any) {
  try {
    await startScanTask(row.id)
    ElMessage.success('任务已启动')
    fetchTasks()
  } catch {}
}

async function handleStop(row: any) {
  try {
    await stopScanTask(row.id)
    ElMessage.success('任务已停止')
    fetchTasks()
  } catch {}
}

async function handleDelete(row: any) {
  try {
    await deleteScanTask(row.id)
    ElMessage.success('已删除')
    fetchTasks()
  } catch {}
}

async function handleViewResult(row: any) {
  resultTaskName.value = row.name
  resultTaskId.value = row.id
  showResultDialog.value = true
  resultLoading.value = true
  try {
    const res = await client.get(`/scan-tasks/${row.id}/discovered?page_size=100`)
    const data = res?.data || {}
    discoveredAssets.value = data.items || data || []
  } catch {
    ElMessage.error('获取扫描结果失败')
    discoveredAssets.value = []
  } finally {
    resultLoading.value = false
  }
}

function handleCreateAsset(row: any) {
  // 导航到资产列表页，并传入主机和端口参数
  router.push(`/assets?quick_host=${row.host}&quick_port=${row.port}`)
}

async function loadMaskingRules() {
  try {
    const res = await getMaskingRules({ page_size: 100 })
    maskingRules.value = res.data?.items || res.data || []
  } catch { maskingRules.value = [] }
}

async function loadEncryptionTypes() {
  try {
    const res = await getEncryptionTypes({ page_size: 100 })
    encryptionTypes.value = res.data?.items || res.data || []
  } catch { encryptionTypes.value = [] }
}

onMounted(() => { fetchTasks(); loadMaskingRules(); loadEncryptionTypes() })
</script>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 8px; }
.pagination-wrapper { display: flex; justify-content: center; margin-top: 20px; }
</style>
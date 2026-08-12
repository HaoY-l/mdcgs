<template>
  <PageShell title="资产列表" description="管理数据库资产，添加资产后点击「更新」同步数据库表结构">
    <template #header-actions>
      <el-input v-model="searchKeyword" placeholder="搜索资产名称" clearable size="small"
        style="width: 200px; margin-right: 12px" @clear="fetchAssets" @keyup.enter="fetchAssets" />
      <el-select v-model="filterBusinessDept" placeholder="业务部门" clearable size="small" style="width: 140px" @change="fetchAssets">
        <el-option v-for="d in businessDeptOptions" :key="d" :label="d" :value="d" />
      </el-select>
      <el-select v-model="filterAppSystem" placeholder="应用系统" clearable size="small" style="width: 140px" @change="fetchAssets">
        <el-option v-for="a in appSystemOptions" :key="a" :label="a" :value="a" />
      </el-select>
      <el-button type="primary" size="small" @click="handleAdd">新增资产</el-button>
      <el-button size="small" @click="fetchAssets">刷新</el-button>
    </template>

    <DataTable :data="assets" :loading="loading" :total="total" :current-page="currentPage" :page-size="pageSize"
      :selectable="true" @page-change="handlePageChange" @selection-change="selection = $event">
      <el-table-column prop="name" label="资产名称" min-width="150" />
      <el-table-column prop="asset_type" label="资产类型" min-width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ getDataSourceLabel(row.asset_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="地址" min-width="180">
        <template #default="{ row }">{{ row.host }}:{{ row.port }}</template>
      </el-table-column>
      <el-table-column prop="version" label="版本" min-width="100" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.version || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新状态" min-width="120">
        <template #default="{ row }">
          <el-tooltip :content="row.update_error || getUpdateStatusText(row)" placement="top">
            <el-tag :type="getUpdateStatusType(row)" size="small">
              <span v-if="row.update_status === 'updating'" class="update-spinner" />
              {{ getUpdateStatusText(row) }}
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="执行方式" width="90">
        <template #default="{ row }">
          <el-tag :type="row.execute_type === 'periodic' ? 'primary' : 'info'" size="small">
            {{ row.execute_type === 'periodic' ? '周期' : '手动' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后更新" min-width="170">
        <template #default="{ row }">
          <span>{{ row.last_update_time ? formatTime(row.last_update_time) : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="business_dept" label="业务部门" min-width="120">
        <template #default="{ row }">
          <span>{{ row.business_dept || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="app_system" label="应用系统" min-width="120">
        <template #default="{ row }">
          <span>{{ row.app_system || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <ActionColumn :actions="getAssetActions(row)" />
        </template>
      </el-table-column>
    </DataTable>

    <!-- 新增/编辑资产弹窗 -->
    <el-dialog v-model="showDialog" :title="isEdit ? '编辑资产' : '新增资产'" width="700px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="资产名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="数据库类型" required>
          <el-select v-model="form.asset_type" style="width: 100%">
            <el-option
              v-for="type in DATA_SOURCE_TYPES"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="IP地址" required>
              <el-input v-model="form.host" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="端口" required>
              <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-input v-model="form.database_name" />
          <template #label>
            <span>
              数据库名
              <el-tooltip v-if="form.asset_type === 'oracle'" placement="top" :content="'Oracle 中作为 Schema/用户名过滤（如：BUS_USER），仅扫描该 Schema 下的表。不填则扫描所有业务 Schema。'">
                <el-icon style="margin-left: 4px; color: #909399; cursor: help; font-size: 14px; vertical-align: -2px;"><WarningFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
        </el-form-item>
        <!-- 服务名（仅 Oracle 显示） -->
        <el-form-item v-if="form.asset_type === 'oracle'">
          <el-input v-model="form.service_name" placeholder="如：ORCL、XE，不填使用默认服务名" />
          <template #label>
            <span>
              服务名
              <el-tooltip placement="top" :content="'Oracle 连接用服务名，即数据库实例的监听服务名。常见值：ORCL（11g）、XE（11g Express）、FREEPDB1（23c）、ORCLPDB1（12c/19c PDB）。不填则使用默认服务名。'">
                <el-icon style="margin-left: 4px; color: #909399; cursor: help; font-size: 14px; vertical-align: -2px;"><WarningFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>

        <!-- 执行方式 - 参照资产发现的样式 -->
        <el-form-item label="库表更新" required>
          <el-radio-group v-model="form.execute_type">
            <el-radio value="manual">手动</el-radio>
            <el-radio value="periodic">周期</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 周期执行配置 - 参照资产发现的设计 -->
        <template v-if="form.execute_type === 'periodic'">
          <el-form-item label="执行频率" required>
            <el-radio-group v-model="form.schedule_freq">
              <el-radio value="daily">每天</el-radio>
              <el-radio value="weekly">每周</el-radio>
              <el-radio value="monthly">每月</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="执行时间" required>
            <el-time-picker v-model="form.schedule_time" format="HH:mm" placeholder="选择时间" style="width: 140px" />
          </el-form-item>
          <el-form-item v-if="form.schedule_freq === 'weekly'" label="选择星期" required>
            <el-checkbox-group v-model="form.schedule_week_days">
              <el-checkbox :label="1">周一</el-checkbox>
              <el-checkbox :label="2">周二</el-checkbox>
              <el-checkbox :label="3">周三</el-checkbox>
              <el-checkbox :label="4">周四</el-checkbox>
              <el-checkbox :label="5">周五</el-checkbox>
              <el-checkbox :label="6">周六</el-checkbox>
              <el-checkbox :label="0">周日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item v-if="form.schedule_freq === 'monthly'" label="选择日期" required>
            <el-select v-model="form.schedule_month_day" style="width: 120px">
              <el-option v-for="d in 31" :key="d" :label="d + '日'" :value="d" />
            </el-select>
          </el-form-item>
        </template>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="业务部门">
              <el-input v-model="form.business_dept" placeholder="如：研发部、财务部" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用系统">
              <el-input v-model="form.app_system" placeholder="如：ERP、CRM" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button size="small" @click="testConnectionHandler">测试连接</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { getAssets, createAsset, updateAsset, deleteAsset, testConnection, testConnectionDirect, updateAssetManual, stopAssetUpdate } from '@/api/assets'
import { DATA_SOURCE_TYPES, getDefaultPort, getDefaultUsername, getDataSourceLabel } from '@/constants/datasource'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'
import client from '@/api/client'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const submitting = ref(false)
const assets = ref<any[]>([])
const selection = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterBusinessDept = ref('')
const filterAppSystem = ref('')
const businessDeptOptions = ref<string[]>([])
const appSystemOptions = ref<string[]>([])
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const form = reactive({
  name: '', asset_type: 'mysql', host: '127.0.0.1', port: 3306,
  database_name: '', service_name: '', username: 'root', password: '',
  business_dept: '', app_system: '',
  // 库表更新方式
  execute_type: 'manual',
  cron_expression: '',
  update_interval: 24,
  update_time_range: '',
  // 周期执行友好字段（同资产发现）
  schedule_freq: 'daily',
  schedule_time: null as Date | null,
  schedule_week_days: [] as number[],
  schedule_month_day: 1,
})

// 资产类型切换时自动更新默认端口和用户名
watch(() => form.asset_type, (newType) => {
  if (!isEdit.value) {
    form.port = getDefaultPort(newType)
    form.username = getDefaultUsername(newType)
  }
})

async function fetchAssets() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, page_size: pageSize.value }
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    if (filterBusinessDept.value) params.business_dept = filterBusinessDept.value
    if (filterAppSystem.value) params.app_system = filterAppSystem.value
    const res = await getAssets(params)
    assets.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

// 从后端获取业务部门和应用系统选项（用于筛选下拉框）
async function fetchFilterOptions() {
  try {
    const res = await getAssets({ page: 1, page_size: 100 })
    const items = res.data?.items || []
    const deptSet = new Set<string>()
    const appSet = new Set<string>()
    for (const a of items) {
      if (a.business_dept) deptSet.add(a.business_dept)
      if (a.app_system) appSet.add(a.app_system)
    }
    businessDeptOptions.value = Array.from(deptSet).sort()
    appSystemOptions.value = Array.from(appSet).sort()
  } catch { /* 忽略 */ }
}

function getUpdateStatusText(row: any): string {
  if (row.update_status === 'updating') return '更新中'
  if (row.update_status === 'failed') return '更新失败'
  if (row.last_update_time) return '已更新'
  return '未更新'
}

function getUpdateStatusType(row: any): 'success' | 'warning' | 'danger' | 'info' {
  if (row.update_status === 'updating') return 'warning'
  if (row.update_status === 'failed') return 'danger'
  if (row.last_update_time) return 'success'
  return 'info'
}

function formatTime(time: string): string {
  if (!time) return '-'
  try {
    const d = new Date(time)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return time
  }
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  currentPage.value = page
  pageSize.value = size
  fetchAssets()
}

function resetForm() {
  form.name = ''; form.asset_type = 'mysql'; form.host = '127.0.0.1'; form.port = 3306
  form.database_name = ''; form.service_name = ''; form.username = 'root'; form.password = ''
  form.business_dept = ''; form.app_system = ''
  form.execute_type = 'manual'; form.cron_expression = ''
  form.update_interval = 24; form.update_time_range = ''
  form.schedule_freq = 'daily'; form.schedule_time = null
  form.schedule_week_days = []; form.schedule_month_day = 1
  isEdit.value = false; editId.value = null
  // 重置时同步默认端口和用户名
  form.port = getDefaultPort(form.asset_type)
  form.username = getDefaultUsername(form.asset_type)
}

function handleAdd() {
  resetForm(); showDialog.value = true
}

function handleEdit(row: any) {
  isEdit.value = true; editId.value = row.id
  form.name = row.name; form.asset_type = row.asset_type; form.host = row.host
  form.port = row.port; form.database_name = row.database_name || ''; form.service_name = row.service_name || ''
  form.username = row.username || ''; form.password = ''
  form.business_dept = row.business_dept || ''
  form.app_system = row.app_system || ''
  form.execute_type = row.execute_type || 'manual'
  form.cron_expression = row.cron_expression || ''
  form.update_interval = row.update_interval || 0
  form.update_time_range = row.update_time_range || ''
  form.schedule_freq = 'daily'; form.schedule_time = null
  form.schedule_week_days = []; form.schedule_month_day = 1
  // 解析cron回显（与资产发现一致）
  if (form.cron_expression) {
    const parts = form.cron_expression.trim().split(/\s+/)
    if (parts.length >= 6) {
      const [, minute, hour, day, , dayOfWeek] = parts
      const h = parseInt(hour, 10); const m = parseInt(minute, 10)
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date(); d.setHours(h, m, 0, 0); form.schedule_time = d
      }
      if (dayOfWeek !== '*' && dayOfWeek !== '?') {
        form.schedule_freq = 'weekly'
        form.schedule_week_days = dayOfWeek.split(',').map(Number)
      } else if (day !== '*' && day !== '?') {
        form.schedule_freq = 'monthly'
        form.schedule_month_day = parseInt(day, 10) || 1
      } else {
        form.schedule_freq = 'daily'
      }
    }
  } else if (form.execute_type === 'periodic') {
    // 如果是旧的 periodic 但没有 cron_expression，从 update_interval 推断
    if (form.update_interval >= 24 && form.update_interval % 24 === 0) {
      form.schedule_freq = 'daily'
      if (form.update_time_range) {
        const timeParts = form.update_time_range.split('-')[0].trim().split(':')
        if (timeParts.length >= 2) {
          const d = new Date()
          d.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0)
          form.schedule_time = d
        }
      }
    }
  }
  showDialog.value = true
}

function handleView(row: any) {
  router.push(`/assets/${row.id}`)
}

async function handleUpdate(row: any) {
  // 如果已经在更新中，阻止重复点击
  if (row.update_status === 'updating') {
    ElMessage.warning('该资产正在更新中，请等待完成')
    return
  }
  try {
    const body: any = {}
    if (form.password) body.password = form.password
    await updateAssetManual(row.id, body)
    // 立即更新本地状态，让 UI 马上响应
    row.update_status = 'updating'
    row.update_error = null
    ElMessage.success('更新任务已触发，正在连接数据库扫描...')
    const poll = setInterval(async () => {
      try {
        const res = await getAssets({ page: 1, page_size: 100 })
        const items = res.data?.items || []
        const updated = items.find((a: any) => a.id === row.id)
        if (updated && updated.update_status === 'idle') {
          clearInterval(poll)
          ElMessage.success('资产更新完成')
          fetchAssets()
        } else if (updated && updated.update_status === 'failed') {
          clearInterval(poll)
          ElMessage.error(updated.update_error || '资产更新失败')
          fetchAssets()
        }
      } catch {}
    }, 2000)
    setTimeout(() => clearInterval(poll), 60000)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '更新启动失败')
  }
}

async function handleStopUpdate(row: any) {
  try {
    await stopAssetUpdate(row.id)
    row.update_status = 'failed'
    row.update_error = '已手动停止更新'
    ElMessage.success('已停止更新')
  } catch {
    ElMessage.error('停止更新失败')
  }
}

async function testConnectionHandler() {
  if (!editId.value) {
    try {
      const res = await testConnectionDirect({
        host: form.host,
        port: form.port,
        username: form.username,
        password: form.password,
        asset_type: form.asset_type,
        database: form.asset_type === 'oracle' ? (form.service_name || '') : (form.database_name || ''),
        service_name: form.asset_type === 'oracle' ? (form.service_name || '') : undefined,
      })
      ElMessage.success((res as any).message || '连接测试通过')
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.message || '连接失败')
    }
    return
  }
  try {
    const res = await testConnection(editId.value, { password: form.password || undefined })
    ElMessage.success((res as any).message || '连接测试通过')
  } catch {}
}

// 构建Cron表达式（与资产发现一致）
function buildCronExpression(): string {
  if (form.execute_type !== 'periodic') return ''
  const time = form.schedule_time
  if (!time) return ''
  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  if (form.schedule_freq === 'daily') return `0 ${m} ${h} * * ?`
  if (form.schedule_freq === 'weekly') {
    if (!form.schedule_week_days.length) return ''
    return `0 ${m} ${h} ? * ${form.schedule_week_days.join(',')}`
  }
  if (form.schedule_freq === 'monthly') return `0 ${m} ${h} ${form.schedule_month_day} * ?`
  return ''
}

async function handleSave() {
  if (!form.name || !form.host) { ElMessage.warning('请填写必要信息'); return }
  if (form.execute_type === 'periodic') {
    if (!form.schedule_time) { ElMessage.warning('请选择执行时间'); return }
    if (form.schedule_freq === 'weekly' && !form.schedule_week_days.length) { ElMessage.warning('请选择至少一天'); return }
  }
  submitting.value = true
  try {
    const data = { ...form }
    if (!data.password) data.password = ''
    if (form.execute_type === 'periodic') {
      data.cron_expression = buildCronExpression()
    } else {
      data.cron_expression = ''
    }
    data.schedule_freq = undefined as any
    data.schedule_time = undefined as any
    data.schedule_week_days = undefined as any
    data.schedule_month_day = undefined as any
    if (isEdit.value && editId.value) {
      await updateAsset(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createAsset(data)
      ElMessage.success('创建成功')
    }
    showDialog.value = false; fetchAssets()
  } finally { submitting.value = false }
}

function handleDelete(row: any) {
  ElMessageBox.confirm(`确定删除资产 "${row.name}" 吗？`, '提示', { type: 'warning' }).then(async () => {
    await deleteAsset(row.id)
    ElMessage.success('删除成功'); fetchAssets()
  }).catch(() => {})
}

function getAssetActions(row: any) {
  if (row.update_status === 'updating') {
    return [
      { label: '查看', click: () => handleView(row) },
      { label: '停止更新', type: 'warning' as const, click: () => handleStopUpdate(row) },
    ]
  }
  return [
    { label: '查看', click: () => handleView(row) },
    { label: '更新', click: () => handleUpdate(row) },
    { label: '编辑', click: () => handleEdit(row) },
    { label: '删除', type: 'danger' as const, click: () => handleDelete(row) },
  ]
}

// ===== 自动轮询：资产有 updating 状态时每 5s 刷新，空闲时每 10s 刷新 =====
// 保持空闲时也轮询，以便及时发现定时任务触发的状态变化
let refreshTimer: number | null = null
let assetTickCount = 0

function startAutoRefresh() {
  if (refreshTimer) return
  refreshTimer = window.setInterval(() => {
    assetTickCount++
    const hasUpdating = assets.value.some(a => a.update_status === 'updating')
    // 有更新中的资产每次都刷新，空闲时每 2 次（10s）刷新一次
    if (hasUpdating || assetTickCount % 2 === 0) {
      fetchAssets()
    }
  }, 5000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  fetchAssets()
  fetchFilterOptions()
  startAutoRefresh()
  // 来自扫描结果页的快速创建
  const quickHost = route.query.quick_host as string
  const quickPort = route.query.quick_port as string
  if (quickHost) {
    form.host = quickHost
    form.port = quickPort ? parseInt(quickPort) : 3306
    form.name = quickHost
    showDialog.value = true
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.update-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #e6a23c;
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
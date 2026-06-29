<template>
  <PageShell title="资产列表" description="管理数据库资产">
    <template #header-actions>
      <el-input v-model="searchKeyword" placeholder="搜索资产名称" clearable size="small"
        style="width: 200px; margin-right: 12px" @clear="fetchAssets" @keyup.enter="fetchAssets" />
      <el-button type="primary" size="small" @click="handleAdd">新增资产</el-button>
      <el-button size="small" @click="fetchAssets">刷新</el-button>
    </template>

    <DataTable :data="assets" :loading="loading" :total="total" :current-page="currentPage" :page-size="pageSize"
      :selectable="true" @page-change="handlePageChange" @selection-change="selection = $event">
      <el-table-column prop="name" label="资产名称" min-width="150" />
      <el-table-column prop="asset_type" label="资产类型" min-width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.asset_type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="地址" min-width="180">
        <template #default="{ row }">{{ row.host }}:{{ row.port }}</template>
      </el-table-column>
      <el-table-column prop="version" label="版本" min-width="100">
        <template #default="{ row }">
          <span>{{ row.version || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新状态" min-width="120">
        <template #default="{ row }">
          <el-tooltip :content="row.update_status === 'idle' ? '资产数据已是最新' : '正在同步更新资产元数据'" placement="top">
            <el-tag :type="row.update_status === 'idle' ? 'success' : 'warning'" size="small">
              {{ row.update_status === 'idle' ? '空闲' : '更新中' }}
            </el-tag>
          </el-tooltip>
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
            <el-option label="MySQL" value="mysql" />
            <el-option label="Oracle" value="oracle" />
            <el-option label="SQLServer" value="sqlserver" />
            <el-option label="PostgreSQL" value="postgresql" />
            <el-option label="ClickHouse" value="clickhouse" />
            <el-option label="MariaDB" value="mariadb" />
            <el-option label="MongoDB" value="mongodb" />
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
        <el-form-item label="数据库名">
          <el-input v-model="form.database_name" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAssets, createAsset, updateAsset, deleteAsset, testConnection, testConnectionDirect, updateAssetManual } from '@/api/assets'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'

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
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const form = reactive({
  name: '', asset_type: 'mysql', host: '127.0.0.1', port: 3306,
  database_name: '', username: 'root', password: '',
})

async function fetchAssets() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, page_size: pageSize.value }
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    const res = await getAssets(params)
    assets.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  currentPage.value = page
  pageSize.value = size
  fetchAssets()
}

function resetForm() {
  form.name = ''; form.asset_type = 'mysql'; form.host = '127.0.0.1'; form.port = 3306
  form.database_name = ''; form.username = 'root'; form.password = ''
  isEdit.value = false; editId.value = null
}

function handleAdd() {
  resetForm(); showDialog.value = true
}

function handleEdit(row: any) {
  isEdit.value = true; editId.value = row.id
  form.name = row.name; form.asset_type = row.asset_type; form.host = row.host
  form.port = row.port; form.database_name = row.database_name || ''
  form.username = row.username || ''; form.password = ''
  showDialog.value = true
}

function handleView(row: any) {
  router.push(`/assets/${row.id}`)
}

async function handleUpdate(row: any) {
  try {
    const body: any = {}
    if (form.password) body.password = form.password
    await updateAssetManual(row.id, body)
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
        }
      } catch {}
    }, 2000)
    setTimeout(() => clearInterval(poll), 30000)
  } catch {}
}

async function testConnectionHandler() {
  if (!editId.value) {
    try {
      const res = await testConnectionDirect({
        host: form.host,
        port: form.port,
        username: form.username,
        password: form.password,
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

async function handleSave() {
  if (!form.name || !form.host) { ElMessage.warning('请填写必要信息'); return }
  submitting.value = true
  try {
    const data = { ...form }
    if (!data.password) data.password = undefined
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
  return [
    { label: '查看', click: () => handleView(row) },
    { label: '更新', click: () => handleUpdate(row) },
    { label: '编辑', click: () => handleEdit(row) },
    { label: '删除', type: 'danger' as const, click: () => handleDelete(row) },
  ]
}

onMounted(() => {
  fetchAssets()
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
</script>

<style scoped>
</style>
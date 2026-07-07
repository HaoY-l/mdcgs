<template>
  <PageShell title="数据源管理" description="配置数据库连接资产">
    <template #header-actions>
      <el-input v-model="searchKeyword" placeholder="搜索数据源名称" clearable size="small"
        style="width: 200px; margin-right: 12px" @clear="fetchData" @keyup.enter="fetchData" />
      <el-button type="primary" size="small" @click="handleAdd">新增数据源</el-button>
      <el-button size="small" @click="fetchData">刷新</el-button>
    </template>

    <DataTable
      :data="dataSources"
      :loading="loading"
      :total="total"
      :current-page="currentPage"
      :page-size="pageSize"
      @page-change="handlePageChange"
    >
      <el-table-column prop="name" label="数据源名称" min-width="150" />
      <el-table-column prop="asset_type" label="数据库类型" min-width="120">
        <template #default="{ row }">
          <el-tag size="small">{{ getDataSourceLabel(row.asset_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="连接地址" min-width="180">
        <template #default="{ row }">{{ row.host }}:{{ row.port }}</template>
      </el-table-column>
      <el-table-column prop="database_name" label="数据库/实例" min-width="120">
        <template #default="{ row }">
          <span>{{ row.database_name || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="version" label="版本" min-width="120">
        <template #default="{ row }">
          <span>{{ row.version || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <ActionColumn :actions="getActions(row)" />
        </template>
      </el-table-column>
    </DataTable>

    <!-- 新增/编辑数据源弹窗 -->
    <el-dialog v-model="showDialog" :title="isEdit ? '编辑数据源' : '新增数据源'" width="700px">
      <el-form :model="form" label-width="120px" :rules="formRules" ref="formRef">
        <el-form-item label="数据源名称" prop="name">
          <el-input v-model="form.name" placeholder="如：生产环境 MySQL" />
        </el-form-item>
        <el-form-item label="数据库类型" prop="asset_type">
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
            <el-form-item label="主机地址" prop="host">
              <el-input v-model="form.host" placeholder="如：127.0.0.1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="端口" prop="port">
              <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="数据库名" prop="database_name">
          <el-input v-model="form.database_name" placeholder="数据库名或实例名" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="连接用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" show-password placeholder="连接密码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button size="small" @click="testConnectionHandler" :loading="testing">
            测试连接
          </el-button>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getDataSources, createDataSource, updateDataSource, deleteDataSource, testConnectionDirect, type DataSourceForm } from '@/api/datasource'
import { DATA_SOURCE_TYPES, getDefaultPort, getDefaultUsername, getDataSourceLabel } from '@/constants/datasource'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'

const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const testing = ref(false)
const dataSources = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<any>(null)

const form = reactive<DataSourceForm>({
  name: '',
  asset_type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database_name: '',
  username: 'root',
  password: '',
  status: 1,
  sample_count: 10,
  sample_method: 'random',
  sample_mode: 'increment',
  update_interval: 24,
})

const formRules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  asset_type: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
}

// 资产类型切换时自动更新默认端口和用户名
watch(() => form.asset_type, (newType) => {
  if (!isEdit.value) {
    form.port = getDefaultPort(newType)
    form.username = getDefaultUsername(newType)
  }
})

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, page_size: pageSize.value }
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    const res = await getDataSources(params)
    dataSources.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  currentPage.value = page
  pageSize.value = size
  fetchData()
}

function resetForm() {
  form.name = ''
  form.asset_type = 'mysql'
  form.host = '127.0.0.1'
  form.port = 3306
  form.database_name = ''
  form.username = 'root'
  form.password = ''
  form.status = 1
  isEdit.value = false
  editId.value = null
  // 重置时同步默认端口和用户名
  form.port = getDefaultPort(form.asset_type)
  form.username = getDefaultUsername(form.asset_type)
}

function handleAdd() {
  resetForm()
  showDialog.value = true
}

function handleEdit(row: any) {
  isEdit.value = true
  editId.value = row.id
  form.name = row.name
  form.asset_type = row.asset_type
  form.host = row.host
  form.port = row.port
  form.database_name = row.database_name || ''
  form.username = row.username || ''
  form.password = ''
  form.status = row.status ?? 1
  showDialog.value = true
}

function handleView(row: any) {
  router.push(`/assets/${row.id}`)
}

async function testConnectionHandler() {
  testing.value = true
  try {
    const res = await testConnectionDirect({
      host: form.host || '',
      port: form.port || 0,
      username: form.username || '',
      password: form.password || '',
      asset_type: form.asset_type || '',
    })
    ElMessage.success((res as any).message || '连接测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '连接失败')
  } finally {
    testing.value = false
  }
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const data = { ...form }
    if (!data.password) delete data.password
    if (isEdit.value && editId.value) {
      await updateDataSource(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createDataSource(data)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    fetchData()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: any) {
  try {
    await deleteDataSource(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  }
}

function getActions(row: any) {
  return [
    { label: '查看', click: () => handleView(row) },
    { label: '编辑', click: () => handleEdit(row) },
    { label: '删除', type: 'danger' as const, click: () => handleDelete(row) },
  ]
}

onMounted(() => {
  fetchData()
})
</script>

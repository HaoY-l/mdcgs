<template>
  <PageShell title="分类分级模板" description="管理数据分类分级模板">
    <template #header-actions>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索模板名称"
        clearable
        size="small"
        style="width: 240px; margin-right: 12px"
        @input="handleSearch"
      />
      <el-button type="primary" size="small" @click="showAddDialog = true">
        新增模板
      </el-button>
      <el-button size="small" @click="showImportDialog = true">
        导入模板
      </el-button>
    </template>

    <DataTable :data="templates" :loading="loading" :total="total" :current-page="currentPage" :page-size="pageSize" @page-change="handlePageChange">
      <el-table-column prop="name" label="模板名称" min-width="140" />
      <el-table-column prop="description" label="模板描述" min-width="200" />
      <el-table-column prop="template_type" label="类型" min-width="100" />
      <el-table-column prop="category_count" label="分类数" min-width="80" align="center" />
      <el-table-column prop="data_type_count" label="类型数" min-width="80" align="center" />
      <el-table-column label="状态" min-width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
            {{ row.is_active ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" min-width="160" />
      <el-table-column label="操作" min-width="260" fixed="right">
        <template #default="{ row }">
          <ActionColumn :actions="getActions(row)" />
        </template>
      </el-table-column>
    </DataTable>

    <!-- 新增模板弹窗 -->
    <el-dialog v-model="showAddDialog" title="新增模板" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        <el-form-item label="模板类型" required>
          <el-select v-model="form.template_type" placeholder="请选择模板类型" style="width: 100%">
            <el-option label="通用模板" value="general" />
            <el-option label="金融类" value="financial" />
            <el-option label="医疗类" value="medical" />
            <el-option label="教育类" value="education" />
            <el-option label="政务类" value="government" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑模板弹窗 -->
    <el-dialog v-model="showEditDialog" title="编辑模板" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="editForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        <el-form-item label="模板类型" required>
          <el-select v-model="editForm.template_type" placeholder="请选择模板类型" style="width: 100%">
            <el-option label="通用模板" value="general" />
            <el-option label="金融类" value="financial" />
            <el-option label="医疗类" value="medical" />
            <el-option label="教育类" value="education" />
            <el-option label="政务类" value="government" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleUpdate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导入模板弹窗 -->
    <el-dialog v-model="showImportDialog" title="导入模板" width="520px" :close-on-click-modal="false">
      <div style="margin-bottom: 16px">
        <el-button text type="primary" @click="handleDownloadTemplate">
          <el-icon><Download /></el-icon> 下载导入模板文件
        </el-button>
        <div style="font-size: 12px; color: #909399; margin-top: 4px">
          下载 Excel 模板，按格式填写后上传
        </div>
      </div>

      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :file-list="fileList"
      >
        <el-icon class="el-icon--upload" :size="48"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将 Excel 文件拖到此处，或 <em>点击选择</em>
        </div>
        <template #tip>
          <div style="font-size: 12px; color: #909399; padding: 0 4px">
            仅支持 .xlsx / .xls 格式
          </div>
        </template>
      </el-upload>

      <!-- 校验结果 -->
      <div v-if="importResult" style="margin-top: 16px">
        <template v-if="importResult.valid && importResult.summary">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>
              校验通过！即将导入：
              模板「{{ importResult.summary.template }}」，
              {{ importResult.summary.categories }} 个分类，
              {{ importResult.summary.features }} 个特征，
              {{ importResult.summary.data_types }} 个数据类型
            </template>
          </el-alert>
        </template>
        <template v-else>
          <el-alert type="error" :closable="false" show-icon>
            <template #title>校验未通过，请修正后重试</template>
          </el-alert>
          <div style="margin-top: 8px; max-height: 200px; overflow-y: auto">
            <div v-for="(err, i) in importResult.errors" :key="i" style="font-size: 13px; color: #f56c6c; padding: 2px 0">
              [{{ err.category }}] {{ err.message }}
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <el-button @click="handleCancelImport">取消</el-button>
        <el-button :loading="validating" @click="handleValidate">校验</el-button>
        <el-button type="primary" :loading="importing" :disabled="!importResult?.valid" @click="handleImport">
          确认导入
        </el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, UploadFilled } from '@element-plus/icons-vue'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  copyTemplate,
  activateTemplate,
  deactivateTemplate,
  validateTemplateImport,
  importTemplateFromExcel,
} from '@/api/classification'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'

const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const templates = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')

const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingId = ref<number | null>(null)

// ===== 导入模板 =====
const showImportDialog = ref(false)
const validating = ref(false)
const importing = ref(false)
const uploadRef = ref<any>(null)
const fileList = ref<any[]>([])
const importFile = ref<File | null>(null)
const importResult = ref<{
  valid: boolean
  errors: { category: string; message: string }[]
  summary?: { template: string; categories: number; features: number; data_types: number }
} | null>(null)

const form = reactive({
  name: '',
  description: '',
  template_type: '',
})

const editForm = reactive({
  name: '',
  description: '',
  template_type: '',
})

async function fetchTemplates() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (searchKeyword.value.trim()) {
      params.name = searchKeyword.value.trim()
    }
    const res = await getTemplates(params)
    if (res.data && Array.isArray(res.data.items)) {
      templates.value = res.data.items
      total.value = res.data.total ?? 0
    } else if (Array.isArray(res.data)) {
      templates.value = res.data
      total.value = res.data.length
    } else {
      templates.value = res.data || []
      total.value = 0
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchTemplates()
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  currentPage.value = page
  pageSize.value = size
  fetchTemplates()
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.template_type = ''
}

function resetEditForm() {
  editForm.name = ''
  editForm.description = ''
  editForm.template_type = ''
  editingId.value = null
}

async function handleCreate() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!form.template_type) {
    ElMessage.warning('请选择模板类型')
    return
  }
  submitting.value = true
  try {
    await createTemplate({
      name: form.name.trim(),
      description: form.description.trim(),
      template_type: form.template_type,
    })
    ElMessage.success('模板创建成功')
    showAddDialog.value = false
    resetForm()
    fetchTemplates()
  } finally {
    submitting.value = false
  }
}

function handleEdit(row: any) {
  editingId.value = row.id
  editForm.name = row.name || ''
  editForm.description = row.description || ''
  editForm.template_type = row.template_type || ''
  showEditDialog.value = true
}

async function handleUpdate() {
  if (!editingId.value) return
  if (!editForm.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!editForm.template_type) {
    ElMessage.warning('请选择模板类型')
    return
  }
  submitting.value = true
  try {
    await updateTemplate(editingId.value, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      template_type: editForm.template_type,
    })
    ElMessage.success('模板更新成功')
    showEditDialog.value = false
    resetEditForm()
    fetchTemplates()
  } finally {
    submitting.value = false
  }
}

function goDetail(row: any) {
  router.push(`/classification/templates/${row.id}`)
}

async function handleCopy(row: any) {
  try {
    await copyTemplate(row.id)
    ElMessage.success('模板复制成功')
    fetchTemplates()
  } catch {
    // error handled by interceptor
  }
}

async function handleToggleActive(row: any) {
  const action = row.is_active ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定${action}模板 "${row.name}" 吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    if (row.is_active) {
      await deactivateTemplate(row.id)
    } else {
      await activateTemplate(row.id)
    }
    ElMessage.success(`模板已${action}`)
    fetchTemplates()
  } catch {
    // cancelled or error handled by interceptor
  }
}

function handleDelete(row: any) {
  ElMessageBox.confirm(
    `确定删除模板 "${row.name}" 吗？此操作不可恢复。`,
    '提示',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    await deleteTemplate(row.id)
    ElMessage.success('模板已删除')
    fetchTemplates()
  }).catch(() => {})
}

function getActions(row: any) {
  return [
    { label: '管理', click: () => goDetail(row) },
    { label: '编辑', click: () => handleEdit(row) },
    { label: '复制', click: () => handleCopy(row) },
    { label: row.is_active ? '停用' : '启用', type: (row.is_active ? 'warning' : 'success') as 'warning' | 'success', click: () => handleToggleActive(row) },
    { label: '删除', type: 'danger' as const, click: () => handleDelete(row) },
  ]
}

// ===== 导入模板 =====
function handleFileChange(uploadFile: any) {
  importFile.value = uploadFile.raw
  importResult.value = null
}

function handleCancelImport() {
  showImportDialog.value = false
  importFile.value = null
  importResult.value = null
  fileList.value = []
  uploadRef.value?.clearFiles()
}

async function handleDownloadTemplate() {
  try {
    const token = localStorage.getItem('access_token')
    const response = await fetch('/api/v1/templates/import/template', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      ElMessage.error('模板文件下载失败')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '分类模板导入模板.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('模板文件下载失败')
  }
}

async function handleValidate() {
  if (!importFile.value) {
    ElMessage.warning('请先选择导入文件')
    return
  }
  validating.value = true
  try {
    const res = await validateTemplateImport(importFile.value)
    importResult.value = res.data
    if (!res.data?.valid) {
      ElMessage.warning('校验未通过，请查看错误详情')
    } else {
      ElMessage.success('校验通过，可以导入')
    }
  } catch {
    importResult.value = { valid: false, errors: [{ category: '请求失败', message: '校验请求失败' }] }
  } finally {
    validating.value = false
  }
}

async function handleImport() {
  if (!importFile.value || !importResult.value?.valid) {
    ElMessage.warning('请先通过校验后再导入')
    return
  }
  importing.value = true
  try {
    const res = await importTemplateFromExcel(importFile.value)
    ElMessage.success(`模板「${res.data?.name || ''}」导入成功`)
    handleCancelImport()
    fetchTemplates()
  } catch {
    // error handled by interceptor
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
</style>
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
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  copyTemplate,
  activateTemplate,
  deactivateTemplate,
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

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
</style>
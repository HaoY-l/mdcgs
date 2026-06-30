<template>
  <PageShell title="加密方式">
    <DataTable :data="encryptionTypes" :loading="tableLoading" stripe v-bind="$attrs">
      <template #toolbar>
        <span class="panel-title">加密方式列表</span>
      </template>
      <template #toolbar-right>
        <el-button type="primary" size="small" @click="handleAdd">新增加密方式</el-button>
      </template>
      <el-table-column prop="name" label="加密方式名称" min-width="200" />
      <el-table-column prop="description" label="描述" min-width="250">
        <template #default="{ row }">
          <span class="desc-text">{{ row.description || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="algorithm" label="算法" min-width="180" />
      <el-table-column label="内置" min-width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_builtin" type="info" size="small">内置</el-tag>
          <span v-else class="no-tag">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="150" fixed="right">
        <template #default="{ row }">
          <template v-if="!row.is_builtin">
            <ActionColumn :actions="[
              { label: '编辑', type: 'primary' as const, click: () => handleEdit(row as EncryptionType) },
              { label: '删除', type: 'danger' as const, click: () => handleDelete(row as EncryptionType) },
            ]" />
          </template>
          <span v-else class="no-actions">-</span>
        </template>
      </el-table-column>
    </DataTable>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑加密方式' : '新增加密方式'"
      width="550px"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="120px">
        <el-form-item label="加密方式名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入加密方式名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="算法" prop="algorithm">
          <el-select v-model="form.algorithm" placeholder="请选择算法" style="width: 100%" allow-create filterable>
            <el-option label="AES-256-CBC" value="AES-256-CBC" />
            <el-option label="AES-128-GCM" value="AES-128-GCM" />
            <el-option label="RSA-2048" value="RSA-2048" />
            <el-option label="RSA-4096" value="RSA-4096" />
            <el-option label="SM4-ECB" value="SM4-ECB" />
            <el-option label="SM4-CBC" value="SM4-CBC" />
            <el-option label="SM2" value="SM2" />
            <el-option label="3DES" value="3DES" />
            <el-option label="Blowfish" value="Blowfish" />
            <el-option label="ChaCha20" value="ChaCha20" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getEncryptionTypes,
  createEncryptionType,
  updateEncryptionType,
  deleteEncryptionType
} from '../../api/classification'

interface EncryptionType {
  id: number
  name: string
  description: string
  algorithm: string
  is_builtin: boolean
  created_at: string
  updated_at: string
}

const encryptionTypes = ref<EncryptionType[]>([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const formRef = ref()
const submitting = ref(false)

const form = reactive({
  id: 0,
  name: '',
  description: '',
  algorithm: ''
})

const formRules = {
  name: [{ required: true, message: '请输入加密方式名称', trigger: 'blur' }],
  algorithm: [{ required: true, message: '请选择算法', trigger: 'change' }]
}

function resetForm() {
  form.id = 0
  form.name = ''
  form.description = ''
  form.algorithm = ''
}

async function fetchEncryptionTypes() {
  tableLoading.value = true
  try {
    const res = await getEncryptionTypes({ page_size: 100 })
    encryptionTypes.value = res.data?.items || res.data || []
  } catch (err: any) {
    ElMessage.error(err?.message || '获取加密方式失败')
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  fetchEncryptionTypes()
})

function handleAdd() {
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: EncryptionType) {
  isEditing.value = true
  form.id = row.id
  form.name = row.name
  form.description = row.description
  form.algorithm = row.algorithm
  dialogVisible.value = true
}

async function handleDelete(row: EncryptionType) {
  if (row.is_builtin) {
    ElMessage.warning('内置加密方式不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除加密方式 "${row.name}" 吗？`, '确认删除', {
      type: 'warning'
    })
    await deleteEncryptionType(row.id)
    ElMessage.success('删除成功')
    fetchEncryptionTypes()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.message || '删除失败')
    }
  }
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  const payload = {
    name: form.name,
    description: form.description,
    algorithm: form.algorithm
  }

  try {
    if (isEditing.value) {
      await updateEncryptionType(form.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createEncryptionType(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchEncryptionTypes()
  } catch (err: any) {
    ElMessage.error(err?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.desc-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.no-actions {
  color: var(--el-text-color-placeholder);
}

.no-tag {
  color: var(--el-text-color-placeholder);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
}
</style>
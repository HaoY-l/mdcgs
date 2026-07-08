<template>
  <PageShell title="角色管理" description="管理系统角色和权限">
    <template #header-actions>
      <el-button type="primary" size="small" @click="handleAdd">新增角色</el-button>
    </template>

    <DataTable :data="roles" :loading="loading" :total="total">
      <el-table-column prop="code" label="角色代码" min-width="120" />
      <el-table-column prop="name" label="角色名称" min-width="120" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="用户数" min-width="80">
        <template #default="{ row }">
          <span>{{ row.user_count || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="权限数" min-width="80">
        <template #default="{ row }">
          <span>{{ getPermissionCount(row.permissions) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" min-width="160" />
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <ActionColumn :actions="getRoleActions(row)" />
        </template>
      </el-table-column>
    </DataTable>

    <!-- 新增/编辑角色对话框 -->
    <el-dialog v-model="showDialog" :title="isEdit ? '编辑角色' : '新增角色'" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="角色代码" required>
          <el-input v-model="form.code" :disabled="isEdit" placeholder="如: DATA_ADMIN" />
        </el-form-item>
        <el-form-item label="角色名称" required>
          <el-input v-model="form.name" placeholder="如: 数据管理员" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="角色描述" />
        </el-form-item>
      </el-form>

      <!-- 权限分配 -->
      <div v-if="permissionTree.length > 0" class="permission-section">
        <div class="permission-header">
          <span class="permission-title">权限分配</span>
          <el-checkbox
            v-model="selectAll"
            :indeterminate="isIndeterminate"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
        </div>
        <el-skeleton v-if="permissionsLoading" :rows="3" animated />
        <div v-else class="permission-tree">
          <el-collapse>
            <el-collapse-item v-for="cat in permissionTree" :key="cat.key" :title="cat.name">
              <el-checkbox-group v-model="selectedPermissions">
                <el-checkbox
                  v-for="perm in cat.permissions"
                  :key="perm.key"
                  :label="perm.key"
                >
                  {{ perm.name }}
                  <span class="perm-key">{{ perm.key }}</span>
                </el-checkbox>
              </el-checkbox-group>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type CheckboxValueType } from 'element-plus'
import { getRoles, getPermissions, getRole, createRole, updateRole, deleteRole, type PermissionCategory } from '@/api/role'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'

const loading = ref(false)
const submitting = ref(false)
const roles = ref<any[]>([])
const total = ref(0)
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const permissionTree = ref<PermissionCategory[]>([])
const selectedPermissions = ref<string[]>([])
const permissionsLoading = ref(false)

const form = reactive({
  code: '',
  name: '',
  description: '',
  is_system: 0,
})

// 全选逻辑
const selectAll = computed({
  get: () => {
    const allPerms = permissionTree.value.flatMap(cat => cat.permissions.map(p => p.key))
    return allPerms.length > 0 && allPerms.every(k => selectedPermissions.value.includes(k))
  },
  set: () => {}
})

const isIndeterminate = computed(() => {
  const allPerms = permissionTree.value.flatMap(cat => cat.permissions.map(p => p.key))
  const checked = selectedPermissions.value.filter(k => allPerms.includes(k))
  return checked.length > 0 && checked.length < allPerms.length
})

function handleSelectAll(val: CheckboxValueType) {
  const allPerms = permissionTree.value.flatMap(cat => cat.permissions.map(p => p.key))
  selectedPermissions.value = val ? [...allPerms] : []
}

function getPermissionCount(permissions: Record<string, boolean> | null): number | string {
  if (!permissions) return 0
  if (permissions['*']) return '全部'
  return Object.values(permissions).filter(Boolean).length
}

async function fetchRoles() {
  loading.value = true
  try {
    const res = await getRoles()
    roles.value = res.data || []
    total.value = roles.value.length
  } finally { loading.value = false }
}

async function fetchPermissions() {
  if (permissionTree.value.length > 0) return
  permissionsLoading.value = true
  try {
    const res = await getPermissions()
    permissionTree.value = res.data?.tree || []
  } finally {
    permissionsLoading.value = false
  }
}

function resetForm() {
  form.code = ''
  form.name = ''
  form.description = ''
  form.is_system = 0
  selectedPermissions.value = []
  isEdit.value = false
  editId.value = null
}

function handleAdd() {
  resetForm()
  showDialog.value = true
}

async function handleEdit(row: any) {
  isEdit.value = true
  editId.value = row.id
  form.code = row.code
  form.name = row.name
  form.description = row.description || ''
  form.is_system = row.is_system

  // 如果权限树还没加载，先加载
  if (permissionTree.value.length === 0) {
    await fetchPermissions()
  }

  // 加载角色详情获取权限
  try {
    const res = await getRole(row.id)
    const perms = res.data?.permissions || {}
    if (perms['*']) {
      // 全选
      const allPerms = permissionTree.value.flatMap(cat => cat.permissions.map(p => p.key))
      selectedPermissions.value = [...allPerms]
    } else {
      selectedPermissions.value = Object.entries(perms)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    }
  } catch {
    selectedPermissions.value = []
  }

  showDialog.value = true
}

async function handleSave() {
  if (!form.code && !isEdit.value) {
    ElMessage.warning('请输入角色代码')
    return
  }
  if (!form.name) {
    ElMessage.warning('请输入角色名称')
    return
  }

  // 构建权限对象
  const permissions: Record<string, boolean> = {}
  const allPerms = permissionTree.value.flatMap(cat => cat.permissions.map(p => p.key))

  if (selectedPermissions.value.length === allPerms.length) {
    permissions['*'] = true
  } else {
    for (const k of allPerms) {
      permissions[k] = selectedPermissions.value.includes(k)
    }
  }

  submitting.value = true
  try {
    const data = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      permissions,
    }

    if (isEdit.value && editId.value) {
      // 编辑时只传需要更新的字段
      await updateRole(editId.value, {
        name: form.name,
        description: form.description || undefined,
        permissions,
      })
      ElMessage.success('更新成功')
    } else {
      await createRole(data as any)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    fetchRoles()
  } finally {
    submitting.value = false
  }
}

function handleDelete(row: any) {
  if (row.is_system === 1) {
    ElMessage.warning('系统内置角色不能删除')
    return
  }
  if (row.user_count > 0) {
    ElMessage.warning(`该角色已被 ${row.user_count} 个用户使用，无法删除`)
    return
  }
  ElMessageBox.confirm(`确定删除角色 "${row.name}" 吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteRole(row.id)
      ElMessage.success('已删除')
      fetchRoles()
    })
    .catch(() => {})
}

function getRoleActions(row: any) {
  const actions: any[] = [
    { label: '编辑', click: () => handleEdit(row) },
  ]
  if (row.is_system !== 1) {
    actions.push({ label: '删除', type: 'danger', click: () => handleDelete(row) })
  }
  return actions
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>

<style scoped>
.permission-section {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.permission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.permission-title {
  font-weight: 500;
  color: #303133;
}

.permission-tree {
  max-height: 400px;
  overflow-y: auto;
}

.permission-tree :deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #606266;
}

.permission-tree :deep(.el-checkbox) {
  margin-left: 8px;
  margin-bottom: 8px;
  width: 160px;
}

.perm-key {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}
</style>

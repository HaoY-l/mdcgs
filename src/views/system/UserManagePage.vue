<template>
  <PageShell title="用户管理" description="管理系统用户账号和权限">
    <template #header-actions>
      <el-input v-model="searchKeyword" placeholder="搜索用户" clearable size="small" style="width: 200px; margin-right: 12px" @clear="fetchUsers" @keyup.enter="fetchUsers" />
      <el-button type="primary" size="small" @click="handleAdd">新增用户</el-button>
    </template>

    <DataTable :data="users" :loading="loading" :total="total" :current-page="currentPage" :page-size="pageSize" @page-change="handlePageChange">
      <el-table-column prop="username" label="用户账号" min-width="120" />
      <el-table-column prop="real_name" label="姓名" min-width="120" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column label="角色" min-width="120">
        <template #default="{ row }"><el-tag size="small">{{ row.role_name || '-' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" min-width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.status" :active-value="1" :inactive-value="0" size="small" @change="toggleUserStatus(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="valid_until" label="有效期" min-width="160" />
      <el-table-column prop="created_at" label="创建时间" min-width="160" />
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <ActionColumn :actions="getUserActions(row)" />
        </template>
      </el-table-column>
    </DataTable>

    <el-dialog v-model="showDialog" :title="isEdit ? '编辑用户' : '新增用户'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户账号" required>
          <el-input v-model="form.username" :disabled="isEdit" placeholder="5-20位字母数字" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" required>
          <el-input v-model="form.password" type="password" show-password placeholder="6-20位" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.real_name" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role_id" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker v-model="form.valid_range" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPasswordDialog" title="重置密码" width="400px">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="新密码" required>
          <el-input v-model="passwordForm.new_password" type="password" show-password placeholder="6-20位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPasswordReset">确定</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus as toggleUserStatusApi, resetUserPassword, getRoles } from '@/api/user'
import PageShell from '@/components/common/PageShell.vue'
import DataTable from '@/components/common/DataTable.vue'
import ActionColumn from '@/components/common/ActionColumn.vue'

const loading = ref(false)
const submitting = ref(false)
const users = ref<any[]>([])
const roles = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const showPasswordDialog = ref(false)
const passwordTarget = ref<any>(null)
const passwordForm = reactive({ new_password: '' })
const form = reactive({
  username: '', password: '', real_name: '', email: '',
  role_id: null as number | null,
  status: 1,
  valid_range: null as [string, string] | null,
})

async function fetchUsers() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, page_size: pageSize.value }
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    const res = await getUsers(params)
    users.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

function handlePageChange({ page, pageSize: size }: { page: number; pageSize: number }) {
  currentPage.value = page
  pageSize.value = size
  fetchUsers()
}

async function fetchRoles() {
  const res = await getRoles()
  roles.value = res.data || []
}

function resetForm() {
  form.username = ''; form.password = ''; form.real_name = ''; form.email = ''
  form.role_id = null; form.status = 1; form.valid_range = null
  isEdit.value = false; editId.value = null
}

function handleAdd() {
  resetForm(); showDialog.value = true
}

function handleEdit(row: any) {
  isEdit.value = true; editId.value = row.id
  form.username = row.username; form.real_name = row.real_name || ''; form.email = row.email || ''
  form.role_id = row.role_id; form.status = row.status
  form.password = ''; form.valid_range = null
  showDialog.value = true
}

async function handleSave() {
  if (!form.username) { ElMessage.warning('请输入用户账号'); return }
  if (!/^[a-zA-Z0-9]{5,20}$/.test(form.username)) { ElMessage.warning('用户账号为5-20位字母数字'); return }
  if (!isEdit.value) {
    if (!form.password) { ElMessage.warning('请输入密码'); return }
    if (!/^.{6,20}$/.test(form.password)) { ElMessage.warning('密码为6-20位'); return }
  }
  submitting.value = true
  try {
    const data: any = {
      username: form.username, real_name: form.real_name, email: form.email,
      role_id: form.role_id, status: form.status,
    }
    if (form.password) data.password = form.password
    if (form.valid_range) {
      data.valid_from = form.valid_range[0]
      data.valid_until = form.valid_range[1]
    }
    if (isEdit.value && editId.value) {
      await updateUser(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createUser(data)
      ElMessage.success('创建成功')
    }
    showDialog.value = false; fetchUsers()
  } finally { submitting.value = false }
}

async function toggleUserStatus(row: any) {
  const targetStatus = row.status === 1 ? 0 : 1
  try {
    await toggleUserStatusApi(row.id, targetStatus)
    ElMessage.success(targetStatus === 1 ? '已启用' : '已禁用')
    fetchUsers()
  } catch { fetchUsers() }
}

function handleResetPassword(row: any) {
  passwordTarget.value = row
  passwordForm.new_password = ''
  showPasswordDialog.value = true
}

async function submitPasswordReset() {
  if (!passwordForm.new_password) {
    ElMessage.warning('请输入新密码')
    return
  }
  submitting.value = true
  try {
    await resetUserPassword(passwordTarget.value.id, passwordForm.new_password)
    ElMessage.success('密码重置成功')
    showPasswordDialog.value = false
  } catch (err: any) {
    // 后端会返回密码策略错误
    ElMessage.error(err?.response?.data?.message || '重置失败')
  } finally { submitting.value = false }
}

function handleDelete(row: any) {
  ElMessageBox.confirm(`确定删除用户 "${row.username}" 吗？`, '提示', { type: 'warning' }).then(async () => {
    await deleteUser(row.id)
    ElMessage.success('已删除'); fetchUsers()
  }).catch(() => {})
}

function getUserActions(row: any) {
  return [
    { label: '编辑', click: () => handleEdit(row) },
    { label: '重置密码', click: () => handleResetPassword(row) },
    { label: '删除', type: 'danger' as const, click: () => handleDelete(row) },
  ]
}

onMounted(() => { fetchUsers(); fetchRoles() })
</script>

<style scoped>
</style>
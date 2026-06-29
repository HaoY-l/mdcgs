<template>
  <div class="page-container">
    <div class="page-header">
      <h2>授权验证</h2>
      <el-button type="primary" size="small" @click="showDialog = true">新增授权码</el-button>
    </div>
    <el-card shadow="hover">
      <el-table :data="items" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="code" label="授权码" min-width="180" />
        <el-table-column prop="username" label="被授权用户" min-width="120" />
        <el-table-column label="授权类型" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="t in parseAuthType(row.auth_type)" :key="t" size="small" style="margin-right: 4px">{{ authTypeLabel(t) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="80">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'" size="small">{{ row.status ? '有效' : '失效' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expires_at" label="有效期" min-width="160" />
        <el-table-column label="使用次数" min-width="100">
          <template #default="{ row }">{{ row.used_count || 0 }} / {{ row.max_uses || '∞' }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default="{ row }">
            <el-button v-if="row.status" link type="danger" size="small" @click="handleInvalidate(row)">失效</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchItems" />
      </div>
    </el-card>

    <el-dialog v-model="showDialog" title="新增授权码" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="被授权用户" required>
          <el-select v-model="form.user_id" placeholder="选择用户" style="width: 100%" filterable>
            <el-option v-for="u in users" :key="u.id" :label="u.username" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="授权类型" required>
          <el-checkbox-group v-model="form.auth_types">
            <el-checkbox label="view_sample">查看样本</el-checkbox>
            <el-checkbox label="change_level">变更分级</el-checkbox>
            <el-checkbox label="change_result">变更标注</el-checkbox>
            <el-checkbox label="export_data">导出数据</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="有效期">
          <el-radio-group v-model="form.expiry_type">
            <el-radio value="permanent">永久</el-radio>
            <el-radio value="custom">自定义</el-radio>
          </el-radio-group>
          <el-date-picker v-if="form.expiry_type === 'custom'" v-model="form.expires_at" type="datetime" placeholder="选择过期时间" style="width: 100%; margin-top: 8px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAuthorizations, createAuthorization, invalidateAuthorization } from '@/api/task'
import { getUsers } from '@/api/user'

const loading = ref(false)
const submitting = ref(false)
const items = ref<any[]>([])
const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const showDialog = ref(false)
const form = reactive({
  user_id: null as number | null,
  auth_types: [] as string[],
  expiry_type: 'permanent',
  expires_at: null as string | null,
})

function authTypeLabel(t: string) {
  const map: Record<string, string> = {
    view_sample: '查看样本', change_level: '变更分级',
    change_result: '变更标注', export_data: '导出数据'
  }
  return map[t] || t
}

function parseAuthType(type: string | string[]): string[] {
  if (Array.isArray(type)) return type
  if (typeof type === 'string') return type.split(',').map(t => t.trim())
  return []
}

async function fetchItems() {
  loading.value = true
  try {
    const res = await getAuthorizations({ page: page.value, page_size: pageSize.value })
    items.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

async function fetchUsers() {
  try {
    const res = await getUsers({ page: 1, page_size: 100 })
    users.value = res.data?.items || []
  } catch {}
}

async function handleCreate() {
  if (!form.user_id || !form.auth_types.length) {
    ElMessage.warning('请选择用户和授权类型')
    return
  }
  submitting.value = true
  try {
    await createAuthorization({
      user_id: form.user_id,
      auth_type: form.auth_types.join(','),
      expires_at: form.expiry_type === 'custom' ? form.expires_at : null,
    })
    ElMessage.success('授权码创建成功')
    showDialog.value = false
    fetchItems()
  } finally { submitting.value = false }
}

async function handleInvalidate(row: any) {
  try {
    await ElMessageBox.confirm(`确定使授权码 "${row.code}" 失效？`, '提示', { type: 'warning' })
    await invalidateAuthorization(row.id)
    ElMessage.success('已失效')
    fetchItems()
  } catch {}
}

onMounted(() => { fetchItems(); fetchUsers() })
</script>

<style scoped>
.pagination-wrapper { margin-top: 20px; text-align: center; }
</style>

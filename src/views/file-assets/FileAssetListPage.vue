<template>
  <div>
    <DataTable
      :data="items" :loading="loading" :total="total"
      :current-page="currentPage" :page-size="pageSize"
      @page-change="onPageChangeEvent"
    >
      <el-table-column prop="name" label="资产名称" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="goDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="规模" min-width="100">
        <template #default="{ row }">
          <span>{{ row.total_files || 0 }} 个文件 / {{ row.total_blocks || 0 }} 块</span>
        </template>
      </el-table-column>
      <el-table-column prop="business_dept" label="业务部门" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.business_dept || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="app_system" label="应用系统" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.app_system || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后更新" min-width="160">
        <template #default="{ row }">
          <span>{{ formatTime(row.updated_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="160">
        <template #default="{ row }">
          <span>{{ formatTime(row.created_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="goDetail(row)">查看</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该资产？关联的文件和内容块将一并删除" @confirm="onDelete(row)">
            <template #reference>
              <el-button link type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </DataTable>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialog" title="编辑文件资产" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="资产名称" required>
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="业务部门">
          <el-input v-model="editForm.business_dept" />
        </el-form-item>
        <el-form-item label="应用系统">
          <el-input v-model="editForm.app_system" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="onEditSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import DataTable from '@/components/common/DataTable.vue'
import { getFileAssets, updateFileAsset, deleteFileAsset } from '@/api/fileAsset'

const props = defineProps<{
  searchKeyword: string
  filterBusinessDept: string
  filterAppSystem: string
}>()

const router = useRouter()
const items = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

function formatTime(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN', { hour12: false })
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (props.searchKeyword) params.keyword = props.searchKeyword
    if (props.filterBusinessDept) params.business_dept = props.filterBusinessDept
    if (props.filterAppSystem) params.app_system = props.filterAppSystem
    const res: any = await getFileAssets(params)
    items.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  currentPage.value = p
  fetchList()
}
function onPageChangeEvent(p: { page: number; pageSize: number }) {
  currentPage.value = p.page
  fetchList()
}

function goDetail(row: any) {
  router.push(`/file-assets/${row.id}?from=list`)
}

// 编辑
const editDialog = ref(false)
const editSaving = ref(false)
const editForm = reactive({ id: 0, name: '', business_dept: '', app_system: '', status: 1 })

function openEdit(row: any) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.business_dept = row.business_dept || ''
  editForm.app_system = row.app_system || ''
  editForm.status = row.status
  editDialog.value = true
}

async function onEditSave() {
  if (!editForm.name.trim()) { ElMessage.warning('请填写资产名称'); return }
  editSaving.value = true
  try {
    await updateFileAsset(editForm.id, {
      name: editForm.name,
      business_dept: editForm.business_dept || null,
      app_system: editForm.app_system || null,
      status: editForm.status,
    })
    ElMessage.success('已保存')
    editDialog.value = false
    fetchList()
  } finally {
    editSaving.value = false
  }
}

async function onDelete(row: any) {
  await deleteFileAsset(row.id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(fetchList)
watch(
  () => [props.searchKeyword, props.filterBusinessDept, props.filterAppSystem],
  () => { currentPage.value = 1; fetchList() },
  { deep: true }
)
</script>

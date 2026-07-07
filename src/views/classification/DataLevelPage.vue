<template>
  <PageShell title="数据分级" description="配置数据安全分级（L1~L5）的颜色、管控原则及敏感属性，修改后自动同步到关联的分类与数据类型">
    <div class="content-wrap">
      <!-- 分级列表 -->
      <DataTable :data="levels" :loading="loading" stripe v-bind="$attrs" size="small">
        <el-table-column prop="level_code" label="级别" min-width="72" />
        <el-table-column label="颜色" min-width="76">
          <template #default="{ row }">
            <el-color-picker v-if="row.editing" v-model="row.edit_color" size="small" />
            <div v-else class="color-dot" :style="{ background: row.color || '#909399' }" />
          </template>
        </el-table-column>
        <el-table-column label="是否敏感" min-width="86" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="row.editing"
              v-model="row.edit_sensitive"
              size="small"
            />
            <el-switch
              v-else
              :model-value="!!row.is_sensitive"
              disabled
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column label="管控原则" min-width="260">
          <template #default="{ row }">
            <el-input
              v-if="row.editing"
              v-model="row.edit_principle"
              type="textarea"
              :rows="2"
              size="small"
            />
            <span v-else class="text-ellipsis">{{ row.control_principle || '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="180">
          <template #default="{ row }">
            <el-input
              v-if="row.editing"
              v-model="row.edit_description"
              type="textarea"
              :rows="2"
              size="small"
            />
            <span v-else class="text-ellipsis">{{ row.description || '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.editing" text type="primary" size="small" @click="startEdit(row)">
              编辑
            </el-button>
            <template v-else>
              <el-button text type="success" size="small" @click="saveEdit(row)">保存</el-button>
              <el-button text size="small" @click="cancelEdit(row)">取消</el-button>
            </template>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </DataTable>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLevels, updateLevel, deleteLevel } from '@/api/classification'

const loading = ref(false)
const levels = ref<any[]>([])

async function fetchLevels() {
  loading.value = true
  try {
    const res = await getLevels()
    const items = Array.isArray(res.data) ? res.data : []
    levels.value = items.map((l: any) => ({
      ...l,
      editing: false,
      edit_color: l.color,
      edit_sensitive: !!l.is_sensitive,
      edit_principle: l.control_principle,
      edit_description: l.description,
    }))
  } finally {
    loading.value = false
  }
}

function startEdit(row: any) {
  row.editing = true
  row.edit_color = row.color
  row.edit_sensitive = !!row.is_sensitive
  row.edit_principle = row.control_principle
  row.edit_description = row.description
}

async function saveEdit(row: any) {
  try {
    const payload: Record<string, any> = {
      color: row.edit_color,
      control_principle: row.edit_principle,
      description: row.edit_description,
    }
    if (row.edit_sensitive !== !!row.is_sensitive) {
      payload.is_sensitive = row.edit_sensitive
    }
    await updateLevel(row.id, payload)
    row.color = row.edit_color
    row.is_sensitive = row.edit_sensitive ? 1 : 0
    row.control_principle = row.edit_principle
    row.description = row.edit_description
    row.editing = false
    ElMessage.success('保存成功')
  } catch {
    // error handled by interceptor
  }
}

function cancelEdit(row: any) {
  row.editing = false
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定要删除级别 ${row.level_code} 吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteLevel(row.id)
    ElMessage.success('删除成功')
    fetchLevels()
  } catch {
    // error handled by interceptor
  }
}

onMounted(fetchLevels)
</script>

<style scoped>
.content-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.06);
}

.text-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #4e5969;
  font-size: 13px;
}
</style>

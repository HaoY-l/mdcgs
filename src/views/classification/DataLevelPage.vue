<template>
  <PageShell title="数据分级" description="配置数据安全分级（L1~L5）的名称、颜色、管控原则及敏感属性，修改后自动同步到关联的分类与数据类型">
    <div class="content-wrap">
      <!-- 分级设置 -->
      <el-card shadow="never" class="settings-card">
        <div class="card-title">
          <el-icon size="16"><Setting /></el-icon>
          分级全局设置
        </div>
        <el-form label-width="130px" class="settings-form">
          <el-form-item label="级别优先顺序">
            <el-radio-group v-model="priorityOrder" @change="handlePriorityChange" size="small">
              <el-radio-button value="asc">从小到大（1→10）</el-radio-button>
              <el-radio-button value="desc">从大到小（10→1）</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="受限级">
            <div class="restricted-row">
              <el-switch v-model="restrictedEnabled" size="small" @change="handleRestrictedChange" />
              <template v-if="restrictedEnabled">
                <el-input v-model="restrictedName" size="small" placeholder="名称" style="width: 140px" @blur="handleRestrictedChange" />
                <el-color-picker v-model="restrictedColor" size="small" @change="handleRestrictedChange" />
                <span class="hint">未命中的字段自动归为受限级</span>
              </template>
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 分级列表 -->
      <DataTable :data="levels" :loading="loading" stripe v-bind="$attrs" :row-class-name="tableRowClassName" size="small">
        <el-table-column prop="level_code" label="级别" min-width="72" />
        <el-table-column label="名称" min-width="110">
          <template #default="{ row }">
            <el-input
              v-if="row.editing"
              v-model="row.edit_name"
              size="small"
              @keyup.enter="saveEdit(row)"
              class="inline-input"
            />
            <span v-else class="level-name">{{ row.level_name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="颜色" min-width="76">
          <template #default="{ row }">
            <el-color-picker v-if="row.editing" v-model="row.edit_color" size="small" />
            <div v-else class="color-dot" :style="{ background: row.color || '#909399' }" />
          </template>
        </el-table-column>
        <el-table-column label="是否敏感" min-width="86" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="canEdit(row) && row.editing"
              v-model="row.edit_sensitive"
              size="small"
            />
            <el-switch
              v-else-if="canEdit(row)"
              :model-value="!!row.is_sensitive"
              disabled
              size="small"
            />
            <span v-else class="muted">--</span>
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
        <el-table-column label="操作" min-width="120" fixed="right">
          <template #default="{ row }">
            <template v-if="canEdit(row)">
              <el-button v-if="!row.editing" text type="primary" size="small" @click="startEdit(row)">
                编辑
              </el-button>
              <template v-else>
                <el-button text type="success" size="small" @click="saveEdit(row)">保存</el-button>
                <el-button text size="small" @click="cancelEdit(row)">取消</el-button>
              </template>
            </template>
            <span v-else class="muted">--</span>
          </template>
        </el-table-column>
      </DataTable>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, List } from '@element-plus/icons-vue'
import {
  getLevels,
  updateLevel,
  setLevelPriority,
  enableRestrictedLevel,
  disableRestrictedLevel,
} from '@/api/classification'

const loading = ref(false)
const levels = ref<any[]>([])
const priorityOrder = ref('asc')
const restrictedEnabled = ref(false)
const restrictedName = ref('受限级')
const restrictedColor = ref('#909399')

function canEdit(row: any): boolean {
  const match = row.level_code?.match(/L(\d+)/i)
  if (!match) return false
  const num = parseInt(match[1], 10)
  return num >= 1 && num <= 5
}

function tableRowClassName({ row }: { row: any }) {
  const match = row.level_code?.match(/L(\d+)/i)
  if (match) {
    const num = parseInt(match[1], 10)
    if (num >= 6) {
      return 'readonly-row'
    }
  }
  return ''
}

async function fetchLevels() {
  loading.value = true
  try {
    const res = await getLevels()
    const items = Array.isArray(res.data) ? res.data : []
    levels.value = items.map((l: any) => ({
      ...l,
      editing: false,
      edit_name: l.level_name,
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
  row.edit_name = row.level_name
  row.edit_color = row.color
  row.edit_sensitive = !!row.is_sensitive
  row.edit_principle = row.control_principle
  row.edit_description = row.description
}

async function saveEdit(row: any) {
  try {
    const payload: Record<string, any> = {
      level_name: row.edit_name,
      color: row.edit_color,
      control_principle: row.edit_principle,
      description: row.edit_description,
    }
    // 只有当 is_sensitive 有变化时才发送
    if (row.edit_sensitive !== !!row.is_sensitive) {
      payload.is_sensitive = row.edit_sensitive
    }
    await updateLevel(row.id, payload)
    row.level_name = row.edit_name
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

async function handlePriorityChange() {
  try {
    await setLevelPriority({ order: priorityOrder.value })
    ElMessage.success('级别优先顺序已更新')
  } catch {
    // error handled by interceptor
  }
}

async function handleRestrictedChange() {
  try {
    if (restrictedEnabled.value) {
      await enableRestrictedLevel({
        name: restrictedName.value || '受限级',
        color: restrictedColor.value,
      })
      ElMessage.success('受限级别已开启')
    } else {
      await disableRestrictedLevel()
      ElMessage.success('受限级别已关闭')
    }
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

/* 卡片标题 */
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
}

/* 设置卡片 */
.settings-card {
  border: 1px solid #e5e6eb;
  padding: 20px;
}

.settings-form {
  margin-top: 4px;
}

.settings-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.settings-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.restricted-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hint {
  font-size: 12px;
  color: #86909c;
}

/* 颜色圆点代替色块 */
.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.06);
}

.inline-input {
  width: 80px;
}

.level-name {
  font-weight: 500;
}

/* 只读行样式 */
:deep(.readonly-row) {
  color: #c9cdd4;
}

:deep(.readonly-row td) {
  color: #c9cdd4;
}

.muted {
  color: #c9cdd4;
  font-size: 12px;
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
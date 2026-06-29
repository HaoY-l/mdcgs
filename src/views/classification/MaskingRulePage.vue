<template>
  <PageShell title="脱敏特征">
    <DataTable :data="rules" :loading="tableLoading" stripe v-bind="$attrs">
      <template #toolbar>
        <span class="panel-title">脱敏规则列表</span>
      </template>
      <template #toolbar-right>
        <el-button type="primary" size="small" @click="handleAdd">新增脱敏规则</el-button>
      </template>
      <el-table-column prop="name" label="规则名称" min-width="150" />
      <el-table-column prop="description" label="规则说明" min-width="200">
        <template #default="{ row }">
          <span class="desc-text">{{ row.description || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="algorithm" label="脱敏算法" min-width="130" />
      <el-table-column prop="is_active" label="启用状态" min-width="100">
        <template #default="{ row }">
          <el-tag v-if="row.is_builtin" type="info" size="small">内置</el-tag>
          <el-tag v-else :type="row.is_active ? 'success' : 'info'" size="small">
            {{ row.is_active ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="used_count" label="使用次数" min-width="90" align="center" />
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <template v-if="!row.is_builtin">
            <ActionColumn :actions="[
              { label: '编辑', type: 'primary', click: () => handleEdit(row) },
              { label: row.is_active ? '停用' : '启用', type: row.is_active ? 'warning' : 'success', click: () => handleToggleActive(row) },
              { label: '删除', type: 'danger', click: () => handleDelete(row) },
            ]" />
          </template>
          <span v-else class="no-actions">-</span>
        </template>
      </el-table-column>
    </DataTable>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑脱敏规则' : '新增脱敏规则'"
      width="650px"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="120px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="规则说明" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入规则说明" />
        </el-form-item>
        <el-form-item label="脱敏算法" prop="algorithm">
          <el-select v-model="form.algorithm" placeholder="请选择脱敏算法" style="width: 100%" @change="handleAlgorithmChange">
            <el-option label="mask（替换脱敏）" value="mask" />
            <el-option label="hash（哈希脱敏）" value="hash" />
            <el-option label="random（随机脱敏）" value="random" />
            <el-option label="regex（正则替换）" value="regex" />
            <el-option label="format（格式保留）" value="format" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">算法参数</el-divider>
        <template v-if="form.algorithm">
          <!-- mask params -->
          <template v-if="form.algorithm === 'mask'">
            <el-form-item label="替换字符" prop="algorithm_params.replace_char">
              <el-input v-model="form.algorithm_params.replace_char" placeholder="如: *" maxlength="1" style="width: 100px" />
            </el-form-item>
            <el-form-item label="保留开头" prop="algorithm_params.keep_start">
              <el-input-number v-model="form.algorithm_params.keep_start" :min="0" :max="20" />
            </el-form-item>
            <el-form-item label="保留结尾" prop="algorithm_params.keep_end">
              <el-input-number v-model="form.algorithm_params.keep_end" :min="0" :max="20" />
            </el-form-item>
            <el-form-item label="长度" prop="algorithm_params.length">
              <el-input-number v-model="form.algorithm_params.length" :min="-1" :max="100" placeholder="-1表示自动" />
            </el-form-item>
          </template>

          <!-- hash params -->
          <template v-if="form.algorithm === 'hash'">
            <el-form-item label="哈希算法" prop="algorithm_params.hash_algorithm">
              <el-select v-model="form.algorithm_params.hash_algorithm" placeholder="请选择哈希算法" style="width: 100%">
                <el-option label="MD5" value="md5" />
                <el-option label="SHA-1" value="sha1" />
                <el-option label="SHA-256" value="sha256" />
                <el-option label="SHA-512" value="sha512" />
              </el-select>
            </el-form-item>
            <el-form-item label="加盐" prop="algorithm_params.salt">
              <el-input v-model="form.algorithm_params.salt" placeholder="输入盐值（可选）" />
            </el-form-item>
          </template>

          <!-- random params -->
          <template v-if="form.algorithm === 'random'">
            <el-form-item label="字符集" prop="algorithm_params.charset">
              <el-select v-model="form.algorithm_params.charset" placeholder="请选择字符集" style="width: 100%">
                <el-option label="数字" value="digits" />
                <el-option label="字母" value="letters" />
                <el-option label="数字+字母" value="alphanumeric" />
                <el-option label="所有字符" value="all" />
              </el-select>
            </el-form-item>
            <el-form-item label="长度" prop="algorithm_params.length">
              <el-input-number v-model="form.algorithm_params.length" :min="1" :max="100" />
            </el-form-item>
          </template>

          <!-- regex params -->
          <template v-if="form.algorithm === 'regex'">
            <el-form-item label="正则表达式" prop="algorithm_params.pattern">
              <el-input v-model="form.algorithm_params.pattern" placeholder="请输入正则表达式" />
            </el-form-item>
            <el-form-item label="替换内容" prop="algorithm_params.replacement">
              <el-input v-model="form.algorithm_params.replacement" placeholder="请输入替换内容" />
            </el-form-item>
          </template>

          <!-- format params -->
          <template v-if="form.algorithm === 'format'">
            <el-form-item label="输入格式" prop="algorithm_params.input_format">
              <el-input v-model="form.algorithm_params.input_format" placeholder="如: (\\d{3})\\d{4}(\\d{4})" />
            </el-form-item>
            <el-form-item label="输出格式" prop="algorithm_params.output_format">
              <el-input v-model="form.algorithm_params.output_format" placeholder="如: $1****$2" />
            </el-form-item>
          </template>
        </template>
        <p v-else class="no-algorithm-hint">请先选择脱敏算法</p>

        <el-divider content-position="left">校验测试</el-divider>
        <el-form-item label="输入值" prop="sample_input">
          <el-input v-model="sampleInput" placeholder="请输入测试值" />
        </el-form-item>
        <el-form-item label="输出值">
          <el-input v-model="sampleOutput" type="textarea" :rows="2" readonly />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleTestValidate" :disabled="!sampleInput">校验</el-button>
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
  getMaskingRules,
  createMaskingRule,
  updateMaskingRule,
  deleteMaskingRule,
  activateMaskingRule,
  deactivateMaskingRule,
} from '../../api/classification'

interface MaskingRule {
  id: number
  name: string
  description: string
  algorithm: string
  algorithm_params: Record<string, any>
  is_active: boolean
  is_builtin: boolean
  used_count: number
  created_at: string
  updated_at: string
}

interface AlgorithmParams {
  replace_char?: string
  keep_start?: number
  keep_end?: number
  length?: number
  hash_algorithm?: string
  salt?: string
  charset?: string
  pattern?: string
  replacement?: string
  input_format?: string
  output_format?: string
  [key: string]: any
}

const rules = ref<MaskingRule[]>([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const formRef = ref()
const submitting = ref(false)

const sampleInput = ref('')
const sampleOutput = ref('')

const form = reactive({
  id: 0,
  name: '',
  description: '',
  algorithm: '',
  algorithm_params: {} as AlgorithmParams
})

const formRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  algorithm: [{ required: true, message: '请选择脱敏算法', trigger: 'change' }]
}

function resetForm() {
  form.id = 0
  form.name = ''
  form.description = ''
  form.algorithm = ''
  form.algorithm_params = {}
  sampleInput.value = ''
  sampleOutput.value = ''
}

function handleAlgorithmChange(val: string) {
  form.algorithm_params = {}
  sampleOutput.value = ''
  sampleInput.value = ''
  switch (val) {
    case 'mask':
      form.algorithm_params = { replace_char: '*', keep_start: 0, keep_end: 0, length: -1 }
      break
    case 'hash':
      form.algorithm_params = { hash_algorithm: 'sha256', salt: '' }
      break
    case 'random':
      form.algorithm_params = { charset: 'alphanumeric', length: 8 }
      break
    case 'regex':
      form.algorithm_params = { pattern: '', replacement: '' }
      break
    case 'format':
      form.algorithm_params = { input_format: '', output_format: '' }
      break
  }
}

async function fetchRules() {
  tableLoading.value = true
  try {
    const res = await getMaskingRules({ page_size: 100 })
    rules.value = res.data?.items || res.data || []
  } catch (err: any) {
    ElMessage.error(err?.message || '获取脱敏规则失败')
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  fetchRules()
})

function handleAdd() {
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: MaskingRule) {
  isEditing.value = true
  form.id = row.id
  form.name = row.name
  form.description = row.description
  form.algorithm = row.algorithm
  form.algorithm_params = row.algorithm_params ? { ...row.algorithm_params } : {}
  dialogVisible.value = true
}

async function handleDelete(row: MaskingRule) {
  if (row.is_builtin) {
    ElMessage.warning('内置规则不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除脱敏规则 "${row.name}" 吗？`, '确认删除', {
      type: 'warning'
    })
    await deleteMaskingRule(row.id)
    ElMessage.success('删除成功')
    fetchRules()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.message || '删除失败')
    }
  }
}

async function handleToggleActive(row: MaskingRule) {
  try {
    const action = row.is_active ? '停用' : '启用'
    await ElMessageBox.confirm(`确定${action}规则 "${row.name}" 吗？`, '确认操作', {
      type: 'warning'
    })
    await (row.is_active ? deactivateMaskingRule : activateMaskingRule)(row.id)
    ElMessage.success(`${action}成功`)
    fetchRules()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.message || '操作失败')
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
    algorithm: form.algorithm,
    algorithm_params: form.algorithm_params
  }

  try {
    if (isEditing.value) {
      await updateMaskingRule(form.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createMaskingRule(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchRules()
  } catch (err: any) {
    ElMessage.error(err?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// Test validate (mock)
function handleTestValidate() {
  const input = sampleInput.value
  const algo = form.algorithm
  if (!input || !algo) {
    sampleOutput.value = '请先填写输入值和选择脱敏算法'
    return
  }

  // Simulate output
  let output = input
  switch (algo) {
    case 'mask': {
      const char = form.algorithm_params.replace_char || '*'
      const start = form.algorithm_params.keep_start || 0
      const end = form.algorithm_params.keep_end || 0
      if (input.length > start + end) {
        const masked = char.repeat(input.length - start - end)
        output = input.slice(0, start) + masked + input.slice(-end || input.length)
      }
      break
    }
    case 'hash':
      output = `[hash:${form.algorithm_params.hash_algorithm || 'sha256'}]${input}`
      break
    case 'random':
      output = `[random:${form.algorithm_params.length || 8}chars]`
      break
    case 'regex':
      output = `[regex: ${form.algorithm_params.pattern || ''} -> ${form.algorithm_params.replacement || ''}]`
      break
    case 'format':
      output = `[format:保留格式脱敏]${input}`
      break
  }

  sampleOutput.value = output
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

.no-algorithm-hint {
  color: var(--el-text-color-placeholder);
  padding: 0 0 16px 16px;
  margin: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
}
</style>
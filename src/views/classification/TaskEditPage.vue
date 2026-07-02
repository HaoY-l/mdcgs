<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="goBack" style="margin-right: 12px">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h2 style="margin: 0; flex: 1">编辑任务</h2>
    </div>

    <el-card shadow="hover" v-loading="loading">
      <el-form :model="form" label-width="120px" style="max-width: 600px">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.name" placeholder="请输入任务名称" maxlength="100" />
        </el-form-item>

        <el-form-item label="关联模板" required>
          <el-select v-model="form.template_id" placeholder="请选择模板" style="width: 100%" filterable @change="handleTemplateChange">
            <el-option
              v-for="tpl in templates"
              :key="tpl.id"
              :label="tpl.name"
              :value="tpl.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="执行方式" required>
          <el-radio-group v-model="form.execute_type">
            <el-radio value="manual">手动执行</el-radio>
            <el-radio value="periodic">周期执行</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.execute_type === 'periodic'" label="Cron 表达式" required>
          <el-input v-model="form.cron_expression" placeholder="例如: 0 0 2 * * ?"/>
        </el-form-item>
        <el-form-item label="脱敏规则">
          <el-select v-model="form.masking_rule_id" placeholder="请选择(可选)" clearable style="width: 100%">
            <el-option v-for="r in maskingRules" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="加密方式">
          <el-select v-model="form.encryption_type_id" placeholder="请选择(可选)" clearable style="width: 100%">
            <el-option v-for="e in encryptionTypes" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择资产" required>
          <el-select
            v-model="form.asset_ids"
            multiple
            placeholder="请选择数据资产"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="asset in assets"
              :key="asset.id"
              :label="asset.name || asset.database_name"
              :value="asset.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getTaskDetail, updateTask } from '@/api/task'
import { getTemplates, getMaskingRules, getEncryptionTypes } from '@/api/classification'
import { getAssets } from '@/api/assets'

const router = useRouter()
const route = useRoute()
const taskId = Number(route.params.id)

const loading = ref(false)
const saving = ref(false)
const templates = ref<any[]>([])
const assets = ref<any[]>([])

const maskingRules = ref<any[]>([])
const encryptionTypes = ref<any[]>([])

const form = ref({
  name: '',
  template_id: null as number | null,
  execute_type: 'manual',
  cron_expression: '',
  masking_rule_id: null as number | null,
  encryption_type_id: null as number | null,
  asset_ids: [] as number[],
})

async function loadTask() {
  loading.value = true
  try {
    const res = await getTaskDetail(taskId)
    const data = res.data || {}
    form.value.name = data.name || ''
    form.value.template_id = data.template_id || null
    form.value.execute_type = data.execute_type || 'manual'
    form.value.cron_expression = data.cron_expression || ''
    form.value.masking_rule_id = data.masking_rule_id ?? null
    form.value.encryption_type_id = data.encryption_type_id ?? null
    form.value.asset_ids = data.asset_ids || []
  } catch {
    ElMessage.error('加载任务信息失败')
    goBack()
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await getTemplates({ page_size: 100 })
    if (Array.isArray(res.data)) {
      templates.value = res.data
    } else if (res.data?.items) {
      templates.value = res.data.items
    }
  } catch {
    ElMessage.error('加载模板列表失败')
  }
}

function goBack() {
  router.push('/classification/tasks')
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (!form.value.template_id) {
    ElMessage.warning('请选择关联模板')
    return
  }

  saving.value = true
  try {
    const payload: Record<string, any> = {
      name: form.value.name.trim(),
      template_id: form.value.template_id,
      execute_type: form.value.execute_type,
      asset_ids: form.value.asset_ids,
    }
    if (form.value.execute_type === 'periodic') {
      payload.cron_expression = form.value.cron_expression.trim()
    }
    payload.masking_rule_id = form.value.masking_rule_id ?? undefined
    payload.encryption_type_id = form.value.encryption_type_id ?? undefined
    await updateTask(taskId, payload)
    ElMessage.success('更新成功')
    router.push('/classification/tasks')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '更新失败')
  } finally {
    saving.value = false
  }
}

async function loadMaskingRules() {
  try {
    const res = await getMaskingRules({ page_size: 100 })
    maskingRules.value = res.data?.items || res.data || []
  } catch { maskingRules.value = [] }
}

async function loadEncryptionTypes() {
  try {
    const res = await getEncryptionTypes({ page_size: 100 })
    encryptionTypes.value = res.data?.items || res.data || []
  } catch { encryptionTypes.value = [] }
}

async function loadAssets() {
  try {
    const res = await getAssets({ page_size: 100 })
    if (Array.isArray(res.data)) {
      assets.value = res.data
    } else {
      assets.value = res.data?.items || []
    }
  } catch { assets.value = [] }
}

function handleTemplateChange() {
  form.value.asset_ids = []
}

onMounted(() => {
  loadTask()
  loadTemplates()
  loadMaskingRules()
  loadEncryptionTypes()
  loadAssets()
})
</script>

<style scoped>
</style>
<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="goBack" style="margin-right: 12px">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h2 style="margin: 0; flex: 1">新建分类任务</h2>
    </div>

    <el-card shadow="hover">
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

        <el-form-item v-if="form.execute_type === 'periodic'" label="执行频率" required>
          <el-radio-group v-model="form.schedule_freq">
            <el-radio value="daily">每天</el-radio>
            <el-radio value="weekly">每周</el-radio>
            <el-radio value="monthly">每月</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.execute_type === 'periodic'" label="执行时间" required>
          <el-time-picker v-model="form.schedule_time" format="HH:mm" placeholder="选择时间" style="width: 140px" />
        </el-form-item>

        <el-form-item v-if="form.execute_type === 'periodic' && form.schedule_freq === 'weekly'" label="选择星期" required>
          <el-checkbox-group v-model="form.schedule_week_days">
            <el-checkbox :label="1">周一</el-checkbox>
            <el-checkbox :label="2">周二</el-checkbox>
            <el-checkbox :label="3">周三</el-checkbox>
            <el-checkbox :label="4">周四</el-checkbox>
            <el-checkbox :label="5">周五</el-checkbox>
            <el-checkbox :label="6">周六</el-checkbox>
            <el-checkbox :label="0">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item v-if="form.execute_type === 'periodic' && form.schedule_freq === 'monthly'" label="选择日期" required>
          <el-select v-model="form.schedule_month_day" style="width: 120px">
            <el-option v-for="d in 31" :key="d" :label="d + '日'" :value="d" />
          </el-select>
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
              v-for="asset in availableAssets"
              :key="asset.id"
              :label="(asset.name || asset.database_name) + (occupiedAssets[asset.id] ? '（已被任务「' + occupiedAssets[asset.id] + '」占用）' : '')"
              :value="asset.id"
              :disabled="!!occupiedAssets[asset.id]"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">创建任务</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { createTask, getOccupiedAssets } from '@/api/task'
import { getTemplates, getMaskingRules, getEncryptionTypes } from '@/api/classification'
import { getAssets } from '@/api/assets'

const router = useRouter()
const submitting = ref(false)
const templates = ref<any[]>([])
const assets = ref<any[]>([])

const maskingRules = ref<any[]>([])
const encryptionTypes = ref<any[]>([])
const occupiedAssets = ref<Record<string, string>>({})

const availableAssets = computed(() => {
  return assets.value.filter(a => !occupiedAssets.value[a.id])
})

const form = ref({
  name: '',
  template_id: null as number | null,
  execute_type: 'manual',
  cron_expression: '',
  masking_rule_id: null as number | null,
  encryption_type_id: null as number | null,
  asset_ids: [] as number[],
  // 周期执行友好字段
  schedule_freq: 'daily',
  schedule_time: null as Date | null,
  schedule_week_days: [] as number[],
  schedule_month_day: 1,
})

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

async function loadAssets() {
  try {
    const res = await getAssets({ page_size: 100 })
    if (Array.isArray(res.data)) {
      assets.value = res.data
    } else if (res.data?.items) {
      assets.value = res.data.items
    }
  } catch {
    ElMessage.error('加载资产列表失败')
  }
}

async function loadOccupiedAssets() {
  try {
    const res = await getOccupiedAssets()
    occupiedAssets.value = res.data || {}
  } catch {
    // ignore
  }
}

function handleTemplateChange() {
  // 模板选择后的逻辑（如有需要）
}

function goBack() {
  router.push('/classification/tasks')
}

function buildCronExpression(): string {
  if (form.value.execute_type !== 'periodic') return ''
  const time = form.value.schedule_time
  if (!time) return ''
  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  if (form.value.schedule_freq === 'daily') {
    return `0 ${m} ${h} * * ?`
  }
  if (form.value.schedule_freq === 'weekly') {
    const days = form.value.schedule_week_days
    if (!days.length) return ''
    return `0 ${m} ${h} ? * ${days.join(',')}`
  }
  if (form.value.schedule_freq === 'monthly') {
    return `0 ${m} ${h} ${form.value.schedule_month_day} * ?`
  }
  return ''
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (!form.value.template_id) {
    ElMessage.warning('请选择关联模板')
    return
  }
  if (!form.value.asset_ids.length) {
    ElMessage.warning('请选择至少一个数据资产')
    return
  }
  if (form.value.execute_type === 'periodic') {
    if (!form.value.schedule_time) {
      ElMessage.warning('请选择执行时间')
      return
    }
    if (form.value.schedule_freq === 'weekly' && !form.value.schedule_week_days.length) {
      ElMessage.warning('请选择至少一天')
      return
    }
  }

  submitting.value = true
  try {
    const payload: Record<string, any> = {
      name: form.value.name.trim(),
      template_id: form.value.template_id,
      execute_type: form.value.execute_type,
      asset_ids: form.value.asset_ids,
    }
    if (form.value.execute_type === 'periodic') {
      payload.cron_expression = buildCronExpression()
    }
    if (form.value.masking_rule_id) payload.masking_rule_id = form.value.masking_rule_id
    if (form.value.encryption_type_id) payload.encryption_type_id = form.value.encryption_type_id
    await createTask(payload)
    ElMessage.success('任务创建成功')
    router.push('/classification/tasks')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '创建失败')
  } finally {
    submitting.value = false
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

onMounted(() => {
  loadTemplates()
  loadAssets()
  loadOccupiedAssets()
  loadMaskingRules()
  loadEncryptionTypes()
})
</script>

<style scoped>
</style>
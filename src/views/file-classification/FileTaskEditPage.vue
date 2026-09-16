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
          <el-input v-model="form.name" placeholder="请输入任务名称" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="使用模板" required>
          <el-select v-model="form.template_id" style="width: 100%" placeholder="选择分类模板" filterable>
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
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

        <el-form-item label="文件资产" required>
          <el-select v-model="form.file_asset_ids" multiple style="width: 100%" placeholder="选择要分类的文件资产（可多选）" filterable>
            <el-option v-for="a in fileAssets" :key="a.id" :label="`${a.name} (${a.file_count} 文件)`" :value="a.id" />
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
import { getFileTask, updateFileTask } from '@/api/fileClassification'
import { getFileAssets } from '@/api/fileAsset'
import client from '@/api/client'

const router = useRouter()
const route = useRoute()
const taskId = Number(route.params.id)

const loading = ref(false)
const saving = ref(false)
const templates = ref<any[]>([])
const fileAssets = ref<any[]>([])

const form = ref({
  name: '',
  template_id: null as number | null,
  execute_type: 'manual',
  cron_expression: '',
  // 周期执行友好字段
  schedule_freq: 'daily',
  schedule_time: new Date(),
  schedule_week_days: [] as number[],
  schedule_month_day: 1,
  file_asset_ids: [] as number[],
})

async function loadTask() {
  loading.value = true
  try {
    const res = await getFileTask(taskId)
    const data = res.data || {}
    form.value.name = data.name || ''
    form.value.template_id = data.template_id || null
    form.value.execute_type = data.execute_type || 'manual'
    form.value.cron_expression = data.cron_expression || ''
    form.value.file_asset_ids = data.file_asset_ids || []

    // 解析 cron 表达式回显友好字段
    parseCronToForm(data.cron_expression || '')
  } catch {
    ElMessage.error('加载任务信息失败')
    goBack()
  } finally {
    loading.value = false
  }
}

function parseCronToForm(cron: string) {
  if (!cron) return
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return

  // 0 0 2 * * * => 每天凌晨2点
  // 0 30 8 ? * 1,2,3,4,5 => 每周一到周五 8:30
  // 0 0 3 15 * * => 每月15号凌晨3点

  // 解析时间 (分 时)
  const minute = parseInt(parts[0]) || 0
  const hour = parseInt(parts[1]) || 0
  form.value.schedule_time = new Date(2024, 0, 1, hour, minute)

  // 解析频率
  if (parts[4] === '*' && parts[3] === '*') {
    // 每天
    form.value.schedule_freq = 'daily'
  } else if (parts[4] === '*' && parts[3] !== '*') {
    // 每月
    form.value.schedule_freq = 'monthly'
    form.value.schedule_month_day = parseInt(parts[3]) || 1
  } else if (parts[4] !== '*' && parts[4] !== '?' && parts[3] === '*') {
    // 每周
    form.value.schedule_freq = 'weekly'
    const days = parts[4].split(',').map(d => parseInt(d))
    form.value.schedule_week_days = days
  } else if (parts[4] === '?') {
    // 周中某天
    form.value.schedule_freq = 'weekly'
    const days = parts[5] ? parts[5].split(',').map(d => parseInt(d)) : [1, 2, 3, 4, 5]
    form.value.schedule_week_days = days
  }
}

function buildCronExpression(): string {
  const time = form.value.schedule_time
  const minute = time.getMinutes()
  const hour = time.getHours()

  if (form.value.schedule_freq === 'daily') {
    return `0 ${minute} ${hour} * * *`
  } else if (form.value.schedule_freq === 'weekly') {
    const days = form.value.schedule_week_days.sort().join(',')
    return `0 ${minute} ${hour} ? * ${days}`
  } else if (form.value.schedule_freq === 'monthly') {
    return `0 ${minute} ${hour} ${form.value.schedule_month_day} * *`
  }
  return ''
}

async function loadTemplates() {
  try {
    const res = await client.get('/templates', { params: { page: 1, page_size: 100 } })
    templates.value = res.data?.items || res.data || []
  } catch {
    ElMessage.error('加载模板列表失败')
  }
}

async function loadFileAssets() {
  try {
    const res = await getFileAssets({ page: 1, page_size: 100 })
    fileAssets.value = res.data?.items || res.data || []
  } catch {
    ElMessage.error('加载文件资产列表失败')
  }
}

function goBack() {
  router.push('/classification/file-tasks')
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写任务名称')
    return
  }
  if (!form.value.template_id) {
    ElMessage.warning('请选择分类模板')
    return
  }
  if (form.value.file_asset_ids.length === 0) {
    ElMessage.warning('请选择文件资产')
    return
  }
  if (form.value.execute_type === 'periodic') {
    if (form.value.schedule_freq === 'weekly' && form.value.schedule_week_days.length === 0) {
      ElMessage.warning('请选择星期')
      return
    }
  }

  saving.value = true
  try {
    const payload: any = {
      name: form.value.name,
      template_id: form.value.template_id,
      execute_type: form.value.execute_type,
      file_asset_ids: form.value.file_asset_ids,
    }

    if (form.value.execute_type === 'periodic') {
      payload.cron_expression = buildCronExpression()
    }

    await updateFileTask(taskId, payload)
    ElMessage.success('保存成功')
    goBack()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      loadTask(),
      loadTemplates(),
      loadFileAssets(),
    ])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
</style>

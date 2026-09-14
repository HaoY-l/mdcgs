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

        <el-form-item v-if="form.execute_type === 'periodic'" label="Cron表达式" required>
          <el-input v-model="form.cron_expression" placeholder="如: 0 0 2 * * *" style="width: 100%" />
          <div style="font-size: 12px; color: #909399; margin-top: 4px">格式: 秒 分 时 日 月 周，如: 0 0 2 * * * 表示每天凌晨2点</div>
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
  } catch {
    ElMessage.error('加载任务信息失败')
    goBack()
  } finally {
    loading.value = false
  }
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
    ElMessage.warning('请选择模板')
    return
  }
  if (!form.value.file_asset_ids.length) {
    ElMessage.warning('请选择至少一个文件资产')
    return
  }
  if (form.value.execute_type === 'periodic') {
    if (!form.value.cron_expression.trim()) {
      ElMessage.warning('周期任务请填写Cron表达式')
      return
    }
  }

  saving.value = true
  try {
    await updateFileTask(taskId, {
      name: form.value.name.trim(),
      template_id: form.value.template_id,
      execute_type: form.value.execute_type,
      cron_expression: form.value.execute_type === 'periodic' ? form.value.cron_expression.trim() : undefined,
      file_asset_ids: form.value.file_asset_ids,
    })
    ElMessage.success('更新成功')
    router.push('/classification/file-tasks')
  } catch (err: any) {
    ElMessage.error(err?.message || err?.response?.data?.message || '更新失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadTask()
  loadTemplates()
  loadFileAssets()
})
</script>

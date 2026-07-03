<template>
  <el-dialog
    v-model="visible"
    title="生成报告"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">

      <!-- 报告类型 -->
      <el-form-item label="报告类型" prop="report_type">
        <el-select
          v-model="form.report_type"
          placeholder="请选择报告类型"
          style="width: 100%"
          :loading="typesLoading"
          filterable
          @change="onTypeChange"
        >
          <el-option
            v-for="opt in reportTypes"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <!-- 类型说明 -->
      <div v-if="selectedTypeDesc" class="type-desc">
        <el-icon color="#909399" :size="14"><InfoFilled /></el-icon>
        <span>{{ selectedTypeDesc }}</span>
      </div>

      <!-- 关联任务 -->
      <el-form-item label="关联任务" prop="task_id">
        <el-select
          v-model="form.task_id"
          placeholder="全部任务（可选）"
          style="width: 100%"
          clearable
          filterable
          :loading="tasksLoading"
        >
          <el-option
            v-for="t in taskList"
            :key="t.id"
            :label="`${t.name}（${t.status}）`"
            :value="t.id"
          >
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>{{ t.name }}</span>
              <el-tag size="small" :type="taskStatusType(t.status)">{{ taskStatusLabel(t.status) }}</el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 报告标题 -->
      <el-form-item label="报告标题">
        <el-input
          v-model="form.title"
          placeholder="不填写则自动生成"
          maxlength="200"
          clearable
        />
      </el-form-item>

      <!-- 文件格式 -->
      <el-form-item label="文件格式" prop="file_format">
        <el-radio-group v-model="form.file_format">
          <el-radio
            v-for="fmt in availableFormats"
            :key="fmt"
            :value="fmt"
          >
            {{ fmt.toUpperCase() }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="可选，添加报告备注"
          maxlength="500"
        />
      </el-form-item>

    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认生成
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 生成结果提示 -->
  <el-dialog
    v-model="resultVisible"
    title="报告生成"
    width="420px"
  >
    <div v-if="generateResult" style="text-align: center; padding: 16px 0;">
      <el-icon
        :size="52"
        :color="generateResult.status === 'completed' ? '#52c41a' : '#faad14'"
      >
        <CircleCheckFilled v-if="generateResult.status === 'completed'" />
        <WarningFilled v-else />
      </el-icon>
      <p style="margin-top: 16px; font-size: 16px; font-weight: 600; color: #1a1a2e;">
        {{ generateResult.status === 'completed' ? '报告生成成功' : '报告生成中' }}
      </p>
      <p style="margin-top: 8px; font-size: 13px; color: #666;">
        {{ generateResult.message }}
      </p>
      <p v-if="generateResult.report_no" style="margin-top: 6px; font-size: 12px; color: #999;">
        报告编号：{{ generateResult.report_no }}
      </p>
    </div>
    <template #footer>
      <el-button @click="resultVisible = false">关闭</el-button>
      <el-button
        v-if="generateResult?.status === 'completed'"
        type="primary"
        @click="handleViewReport"
      >
        查看报告
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { InfoFilled, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { generateReport, getReportTypes, type ReportType, type ReportFormat, type ReportTypeOption, type GenerateResult } from '@/api/reports'
import { getTasks } from '@/api/task'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'generated': [reportId: number]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const formRef = ref()
const submitting = ref(false)
const resultVisible = ref(false)
const generateResult = ref<GenerateResult | null>(null)
const typesLoading = ref(false)
const tasksLoading = ref(false)

const reportTypes = ref<ReportTypeOption[]>([])
const taskList = ref<any[]>([])
const selectedTypeDesc = ref('')

const form = ref({
  report_type: '' as string,
  task_id: undefined as number | undefined,
  file_format: 'pdf' as string,
  title: '',
  description: '',
})

const rules = {
  report_type: [{ required: true, message: '请选择报告类型', trigger: 'change' }],
  file_format: [{ required: true, message: '请选择文件格式', trigger: 'change' }],
}

const availableFormats = computed(() => {
  const opt = reportTypes.value.find((t: any) => t.value === form.value.report_type)
  return (opt as any)?.file_formats || ['pdf']
})

function onTypeChange() {
  const opt = reportTypes.value.find((t: any) => t.value === form.value.report_type)
  selectedTypeDesc.value = (opt as any)?.description || ''
}

async function loadReportTypes() {
  typesLoading.value = true
  try {
    const data = await getReportTypes()
    reportTypes.value = data || []
  } catch (err: any) {
    console.error('加载报告类型失败', err)
  } finally {
    typesLoading.value = false
  }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const res = await getTasks({ page: 1, page_size: 200 })
    console.log('[DEBUG] getTasks raw res:', JSON.stringify(res))
    // client.get() 经拦截器返回 {code, data, message}，data 里有 items
    taskList.value = (res as any)?.data?.items || (res as any)?.items || []
  } catch (err: any) {
    console.error('加载任务列表失败', err)
  } finally {
    tasksLoading.value = false
  }
}

async function handleSubmit() {
  if (!form.value.report_type) {
    ElMessage.warning('请选择报告类型')
    return
  }

  submitting.value = true
  try {
    const res = await generateReport({
      report_type: form.value.report_type,
      file_format: form.value.file_format as ReportFormat,
      task_id: form.value.task_id,
      title: form.value.title || undefined,
      description: form.value.description || undefined,
    })

    generateResult.value = res
    resultVisible.value = true
    visible.value = false
    emit('generated', res.id)
    form.value = { report_type: '', task_id: undefined, file_format: 'pdf', title: '', description: '' }
  } catch (err: any) {
    ElMessage.error(err?.message || '生成报告失败')
  } finally {
    submitting.value = false
  }
}

function handleViewReport() {
  resultVisible.value = false
  if (generateResult.value?.id) {
    emit('generated', generateResult.value.id)
  }
}

function taskStatusType(status?: string) {
  const map: Record<string, string> = {
    completed: 'success',
    running: 'warning',
    failed: 'danger',
    pending: 'info',
  }
  return map[status || ''] || 'info'
}

function taskStatusLabel(status?: string) {
  const map: Record<string, string> = {
    completed: '已完成',
    running: '执行中',
    failed: '失败',
    pending: '待执行',
    idle: '空闲',
  }
  return map[status || ''] || status || ''
}

// 每次打开重置并加载
watch(visible, async (val) => {
  if (val) {
    form.value = { report_type: '', task_id: undefined, file_format: 'pdf', title: '', description: '' }
    selectedTypeDesc.value = ''
    await Promise.all([loadReportTypes(), loadTasks()])
  }
})
</script>

<style scoped>
.type-desc {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
  color: #909399;
  margin: -8px 0 16px 0;
  line-height: 1.5;
}

.type-desc .el-icon { margin-top: 2px; flex-shrink: 0; }
</style>

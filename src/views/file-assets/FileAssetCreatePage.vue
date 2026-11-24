<template>
  <PageShell title="新建文件资产" description="填写基本信息并上传文件">
    <div class="create-page">
      <!-- 第一步：基本信息 -->
      <el-card class="section" shadow="never">
        <template #header>
          <span class="section-title"><el-icon><InfoFilled /></el-icon> 1. 基本信息</span>
        </template>
        <el-form :model="form" label-width="100px" :inline="false">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="资产名称" required>
                <el-input v-model="form.name" placeholder="如：人力资源部员工花名册" maxlength="200" show-word-limit />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="业务部门">
                <el-input v-model="form.business_dept" placeholder="如：人力资源部" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="应用系统">
                <el-input v-model="form.app_system" placeholder="如：HRIS" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="资产描述">
            <el-input v-model="form.description" type="textarea" :rows="2" placeholder="可选" />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 第二步：上传文件 -->
      <el-card class="section" shadow="never">
        <template #header>
          <span class="section-title"><el-icon><UploadFilled /></el-icon> 2. 上传文件</span>
        </template>

        <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px">
          <p>单文件最大 <b>{{ maxSizeMb }}MB</b>，大文件解析可能需要数分钟，请勿关闭页面。文件仅在内存中解析，<b>不会</b>保留在服务器上。</p>
          <p>支持格式：<b>{{ acceptText }}</b>。单次最多 {{ maxPerBatch }} 个文件/批，系统会自动分批提交。</p>
          <p>上传前会校验文件真实类型；<b>伪装扩展名的文件、含宏或内嵌对象的 Office 文档会被拒绝</b>。</p>
        </el-alert>

        <div class="upload-actions">
          <el-upload
            ref="uploaderRef"
            drag multiple :auto-upload="false"
            :accept="ACCEPT_EXTS"
            :on-change="onFileChange" :on-remove="onFileRemove"
            :show-file-list="false"
            class="upload-block"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件或<b>文件夹</b>拖到此处，或<em>点击选择文件</em></div>
            <template #tip>
              <div class="el-upload__tip">拖入文件夹时会自动递归读取其中所有文件</div>
            </template>
          </el-upload>

          <el-button type="primary" plain :icon="FolderOpened" @click="pickFolder">选择文件夹</el-button>
          <input
            ref="folderInputRef"
            type="file"
            webkitdirectory
            multiple
            style="display: none"
            @change="onFolderChange"
          />
        </div>

        <div v-if="items.length" class="files-block">
          <div class="files-head">
            <h4>
              已选择 {{ items.length }} 个文件
              <span class="files-summary">
                （合格 {{ pendingCount }}，已拒绝 {{ rejectedCount }}）
              </span>
            </h4>
            <el-button link type="danger" size="small" @click="clearQueue()">清空</el-button>
          </div>
          <el-table :data="items" border size="small" style="width: 100%" max-height="360">
            <el-table-column label="#" type="index" width="50" />
            <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip />
            <el-table-column label="大小" width="100">
              <template #default="{ row }">{{ formatSize(row.size) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="itemTagType(row)" size="small">{{ itemStatusText(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.message || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ $index, row }">
                <el-button v-if="row.status === 'waiting' || row.status === 'rejected'" link type="danger" size="small" @click="removeAt($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- 提交进度 -->
      <el-card v-if="uploading || batchTotal" class="section" shadow="never">
        <template #header>
          <span class="section-title"><el-icon><Loading /></el-icon> 上传进度</span>
        </template>
        <el-progress
          :percentage="uploadPercent"
          :status="uploading ? undefined : 'success'"
        />
        <p class="progress-text">
          已完成 {{ finishedCount }} / {{ items.length }} 个文件
          <span v-if="uploading">（第 {{ batchIndex }} / {{ batchTotal }} 批上传中）</span>
        </p>
        <el-alert
          v-if="!uploading && submitStat"
          :type="submitStat.failed ? 'warning' : 'success'"
          :closable="false"
          show-icon
          style="margin-top: 8px"
        >
          成功 {{ submitStat.uploaded }} 个，跳过 {{ submitStat.rejected }} 个，失败 {{ submitStat.failed }} 个。
          <span v-if="submitStat.uploaded">解析在后台进行，可前往资产详情查看结果。</span>
        </el-alert>
      </el-card>

      <div class="footer-bar">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="onSubmit">
          创建并上传（{{ pendingCount }} 个文件）
        </el-button>
      </div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type UploadFile, type UploadInstance } from 'element-plus'
import { InfoFilled, UploadFilled, Loading, FolderOpened } from '@element-plus/icons-vue'
import PageShell from '@/components/common/PageShell.vue'
import { createFileAsset, updateFileAsset } from '@/api/fileAsset'
import { useFileUploadQueue } from '@/composables/useFileUploadQueue'
import {
  ACCEPT_EXTS, SUPPORTED_EXTS, MAX_FILE_SIZE, MAX_FILES_PER_BATCH,
} from '@/constants/fileUpload'

const router = useRouter()
const uploaderRef = ref<UploadInstance>()
const folderInputRef = ref<HTMLInputElement>()

const {
  items, uploading, batchIndex, batchTotal, finishedCount,
  addFiles, removeAt, clear: clearQueue, submit: submitQueue,
} = useFileUploadQueue()

const maxSizeMb = Math.round(MAX_FILE_SIZE / 1024 / 1024)
const maxPerBatch = MAX_FILES_PER_BATCH
const acceptText = SUPPORTED_EXTS.join(' / ')

const form = reactive({
  name: '',
  description: '',
  business_dept: '',
  app_system: '',
})

const submitting = ref(false)
const createdAssetId = ref<number | null>(null)
const submitStat = ref<{ uploaded: number; rejected: number; failed: number } | null>(null)

const pendingCount = computed(
  () => items.value.filter(i => i.status === 'waiting').length
)
const rejectedCount = computed(
  () => items.value.filter(i => i.status === 'rejected').length
)
const uploadPercent = computed(() => {
  const total = items.value.length
  if (!total) return 0
  return Math.min(100, Math.round((finishedCount.value / total) * 100))
})

const canSubmit = computed(() => form.name.trim() !== '' && pendingCount.value > 0)

function formatSize(b: number) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function itemStatusText(row: any) {
  const map: Record<string, string> = {
    waiting: '待上传',
    uploading: '上传中',
    done: '已上传',
    rejected: '已拒绝',
  }
  return map[row.status] || row.status
}
function itemTagType(row: any) {
  return ({
    waiting: 'info',
    uploading: 'warning',
    done: 'success',
    rejected: 'danger',
  } as any)[row.status] || 'info'
}

// el-upload 选中单个/多个文件
function onFileChange(file: UploadFile, fileList: UploadFile[]) {
  if (file.raw) addFiles([file.raw])
  // 交给自有队列管理，清空组件内部列表避免重复展示
  if (uploaderRef.value) uploaderRef.value.clearFiles()
}
function onFileRemove(_file: UploadFile) { /* 列表由自有队列管理 */ }

function pickFolder() {
  folderInputRef.value?.click()
}
function onFolderChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) addFiles(files)
  // 允许再次选择同一目录
  input.value = ''
}

async function onSubmit() {
  if (!form.name.trim()) { ElMessage.warning('请填写资产名称'); return }
  if (!pendingCount.value) { ElMessage.warning('请至少选择一个文件'); return }

  submitting.value = true
  submitStat.value = null
  try {
    let assetId = createdAssetId.value
    if (!assetId) {
      const created: any = await createFileAsset({
        name: form.name.trim(),
        description: form.description || null,
        business_dept: form.business_dept || null,
        app_system: form.app_system || null,
      })
      assetId = created.data?.id
      createdAssetId.value = assetId
    } else {
      await updateFileAsset(assetId, {
        name: form.name.trim(),
        description: form.description || null,
        business_dept: form.business_dept || null,
        app_system: form.app_system || null,
      })
    }

    const stat = await submitQueue(assetId!)
    submitStat.value = stat

    if (!stat.failed && !stat.rejected) {
      ElMessage.success(`已上传 ${stat.uploaded} 个文件，解析在后台进行`)
    } else if (stat.uploaded) {
      ElMessage.warning(`上传完成：成功 ${stat.uploaded} 个，跳过 ${stat.rejected} 个，失败 ${stat.failed} 个`)
    } else {
      ElMessage.error('没有文件上传成功，请查看下方说明')
    }
  } catch (e) {
    ElMessage.error('提交失败：' + (e as any).message)
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push('/assets?tab=file')
}
</script>

<style scoped>
.create-page { max-width: 1200px; }
.section { margin-bottom: 16px; }
.section-title { font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.upload-actions { display: flex; align-items: flex-start; gap: 12px; }
.upload-block { flex: 1; }
.files-block { margin-top: 16px; }
.files-head { display: flex; align-items: center; justify-content: space-between; }
.files-head h4 { margin: 0 0 8px; }
.files-summary { font-weight: normal; font-size: 12px; color: #909399; }
.progress-text { margin: 8px 0 0; font-size: 13px; color: #606266; }
.footer-bar { position: sticky; bottom: 0; background: #fff; padding: 12px 0; text-align: right; border-top: 1px solid #ebeef5; margin-top: 8px; }
</style>

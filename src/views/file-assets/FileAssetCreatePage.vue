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
          <p>单文件最大 <b>1GB</b>，大文件解析可能需要数分钟，请勿关闭页面。文件仅在内存中解析，<b>不会</b>保留在服务器上。</p>
          <p>支持格式：<b>.xlsx / .xls / .csv / .docx / .pdf / .md / .json / .txt / .png / .jpg / .jpeg</b>。一次可上传任意数量的文件。</p>
        </el-alert>

        <el-upload
          ref="uploaderRef"
          drag multiple :auto-upload="false"
          :accept="'.xlsx,.xls,.csv,.docx,.pdf,.md,.json,.txt,.png,.jpg,.jpeg'"
          :on-change="onFileChange" :on-remove="onFileRemove"
          :file-list="fileList"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
          <template #tip>
            <div class="el-upload__tip">不限制文件数量，单个不超过 1GB</div>
          </template>
        </el-upload>

        <div v-if="fileList.length" class="files-block">
          <h4>已选择 {{ fileList.length }} 个文件</h4>
          <el-table :data="fileList" border size="small" style="width: 100%">
            <el-table-column label="#" type="index" width="50" />
            <el-table-column prop="name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column label="大小" width="100">
              <template #default="{ row }">{{ formatSize(row.size) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeAt(fileList.findIndex(f => f.uid === row.uid))">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- 提交后的解析进度 -->
      <el-card v-if="uploadResults.length" class="section" shadow="never">
        <template #header>
          <span class="section-title"><el-icon><Loading /></el-icon> 解析进度</span>
        </template>
        <el-table :data="uploadResults" border size="small" style="width: 100%">
          <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.parse_status)" size="small">
                {{ statusText(row.parse_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="内容块" width="100">
            <template #default="{ row }">{{ row.block_count || 0 }}</template>
          </el-table-column>
          <el-table-column prop="parse_error" label="信息" min-width="200" show-overflow-tooltip />
        </el-table>
      </el-card>

      <div class="footer-bar">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="onSubmit">
          创建并上传（{{ fileList.length }} 个文件）
        </el-button>
      </div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification, type UploadFile, type UploadInstance } from 'element-plus'
import { InfoFilled, UploadFilled, Loading } from '@element-plus/icons-vue'
import PageShell from '@/components/common/PageShell.vue'
import { createFileAsset, uploadFiles, updateFileAsset, getFile } from '@/api/fileAsset'

const router = useRouter()
const uploaderRef = ref<UploadInstance>()

const form = reactive({
  name: '',
  description: '',
  business_dept: '',
  app_system: '',
})

const fileList = ref<UploadFile[]>([])
const previewLoading = reactive<Record<number, boolean>>({})

const uploadResults = ref<any[]>([])
const submitting = ref(false)
const createdAssetId = ref<number | null>(null)

const MAX_SIZE = 1 * 1024 * 1024 * 1024

const canSubmit = computed(() =>
  form.name.trim() !== '' && fileList.value.length > 0
)

function formatSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function onFileChange(file: UploadFile) {
  if (!fileList.value.find(f => f.uid === file.uid)) {
    fileList.value.push(file)
  }
  if (file.raw && file.raw.size > MAX_SIZE) {
    ElMessage.error(`${file.name} 超过 1GB 限制`)
    setTimeout(() => {
      const idx = fileList.value.findIndex(f => f.uid === file.uid)
      if (idx >= 0) fileList.value.splice(idx, 1)
    }, 0)
  }
}

function onFileRemove(file: UploadFile) {
  const idx = fileList.value.findIndex(f => f.uid === file.uid)
  if (idx >= 0) fileList.value.splice(idx, 1)
}

function removeAt(idx: number) {
  const f = fileList.value[idx]
  if (f) fileList.value.splice(idx, 1)
}

function statusText(s: string) {
  return { pending: '排队中', parsing: '解析中', success: '成功', failed: '失败' }[s] || s
}
function statusType(s: string) {
  return ({ pending: 'info', parsing: 'warning', success: 'success', failed: 'danger' } as any)[s] || 'info'
}

async function onSubmit() {
  if (!form.name.trim()) { ElMessage.warning('请填写资产名称'); return }
  if (!fileList.value.length) { ElMessage.warning('请至少选择一个文件'); return }

  submitting.value = true
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

    const files: File[] = fileList.value.map(f => f.raw!) as File[]
    const res: any = await uploadFiles(assetId!, files)
    uploadResults.value = res.data?.files || []
    ElNotification.success({
      title: '上传完成',
      message: `已上传 ${files.length} 个文件，解析在后台进行`,
    })

    pollParseStatus(assetId!)
  } catch (e) {
    ElMessage.error('提交失败：' + (e as any).message)
  } finally {
    submitting.value = false
  }
}

async function pollParseStatus(assetId: number) {
  const timer = setInterval(async () => {
    try {
      let allDone = true
      for (let i = 0; i < uploadResults.value.length; i++) {
        const u = uploadResults.value[i]
        if (u.parse_status === 'success' || u.parse_status === 'failed') continue
        allDone = false
        const d: any = await getFile(assetId!, u.file_id)
        uploadResults.value[i] = { ...u, ...(d.data || d) }
      }
      if (allDone) {
        clearInterval(timer)
        const failed = uploadResults.value.filter((u: any) => u.parse_status === 'failed')
        if (!failed.length) {
          ElMessage.success('全部解析完成')
        } else {
          ElMessage.warning(`${failed.length} 个文件解析失败，请查看下方信息`)
        }
      }
    } catch (e) {
      clearInterval(timer)
    }
  }, 2000)
}

function goBack() {
  router.push('/assets?tab=file')
}

onMounted(() => {})
</script>

<style scoped>
.create-page { max-width: 1200px; }
.section { margin-bottom: 16px; }
.section-title { font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.files-block { margin-top: 16px; }
.files-block h4 { margin: 0 0 8px; }
.preview-content p { margin: 0 0 12px; }
.footer-bar { position: sticky; bottom: 0; background: #fff; padding: 12px 0; text-align: right; border-top: 1px solid #ebeef5; margin-top: 8px; }
</style>

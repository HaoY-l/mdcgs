<template>
  <PageShell :title="asset?.name || '文件资产详情'" :description="asset ? `${files.length} 文件 / ${asset.total_blocks || 0} 内容块` : ''">
    <template #header-actions>
      <el-button size="small" @click="$router.push('/assets?tab=file')">返回列表</el-button>
      <el-button size="small" @click="loadDetail" :loading="loading">刷新</el-button>
      <el-button size="small" type="primary" :loading="uploading" @click="showUpload = true">继续上传</el-button>
    </template>

    <div v-if="loading" v-loading="true" style="height: 200px" />
    <template v-else-if="asset">
      <!-- 资产元信息 -->
      <el-card class="section" shadow="never">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="资产名称">{{ asset.name }}</el-descriptions-item>
          <el-descriptions-item label="业务部门">{{ asset.business_dept || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应用系统">{{ asset.app_system || '-' }}</el-descriptions-item>
          <el-descriptions-item label="抽样数">{{ asset.sample_count }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="asset.status === 1 ? 'success' : 'info'" size="small">
              {{ asset.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(asset.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 文件列表 -->
      <el-card class="section" shadow="never">
        <template #header>
          <span class="section-title"><el-icon><Files /></el-icon> 文件（{{ files.length }}）</span>
        </template>
        <el-table :data="files" border size="small" @row-click="selectFile" :row-class-name="rowClass">
          <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
          <el-table-column label="大小" width="100">
            <template #default="{ row }">{{ formatSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="file_ext" label="类型" width="80">
            <template #default="{ row }"><el-tag size="small">{{ row.file_ext || '-' }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="block_count" label="内容块" width="90" align="center">
            <template #default="{ row }">{{ row.block_count || 0 }}</template>
          </el-table-column>
          <el-table-column label="解析" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.parse_status)" size="small">{{ statusText(row.parse_status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="90">
            <template #default="{ row }">
              <span v-if="row.parse_duration_ms">{{ row.parse_duration_ms }}ms</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-popconfirm title="确认删除该文件？" @confirm="onDeleteFile(row)">
                <template #reference>
                  <el-button link type="danger" size="small" @click.stop>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 当前文件的内容块列表 -->
      <el-card v-if="currentFile" class="section" shadow="never">
        <template #header>
          <span class="section-title">
            <el-icon><Files /></el-icon>
            {{ currentFile.file_name }} 的内容块
            <span v-if="currentFile.block_count > 0" style="font-weight: normal; font-size: 12px; color: #909399">（共 {{ currentFile.block_count }} 块）</span>
          </span>
        </template>
        <div v-if="currentFile.block_count === 0" style="padding: 32px; text-align: center; color: #909399">
          该文件尚未解析或无内容块
        </div>
        <template v-else>
          <div class="block-toolbar">
            <el-input v-model="blockKeyword" placeholder="搜索内容关键字" clearable size="small" style="width: 240px" @keyup.enter="loadBlocks" />
            <el-button size="small" @click="loadBlocks">搜索</el-button>
          </div>
          <el-table :data="blocks" border size="small" max-height="400">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="block_type" label="类型" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ blockTypeName(row.block_type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="path" label="路径" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <span style="font-family: monospace; font-size: 12px; color: #409eff">{{ row.path }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容预览" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">{{ row.content || '-' }}</template>
            </el-table-column>
            <el-table-column prop="char_count" label="字符数" width="80" align="center" />
          </el-table>
          <div v-if="blockTotal > 0" class="pagination-wrapper">
            <el-pagination
              :page-sizes="[50, 100, 200, 500]"
              :page-size="blockPageSize"
              :total="blockTotal"
              :current-page="blockPage"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="(s: number) => { blockPageSize = s; blockPage = 1; loadBlocks() }"
              @current-change="(p: number) => { blockPage = p; loadBlocks() }"
            />
          </div>
        </template>
      </el-card>
    </template>

    <!-- 继续上传弹窗 -->
    <el-dialog v-model="showUpload" title="继续上传" width="500px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 8px">
        单文件最大 1GB
      </el-alert>
      <el-upload
        ref="uploaderRef" drag multiple :auto-upload="false"
        :accept="'.xlsx,.xls,.csv,.docx,.pdf,.md,.json,.txt,.png,.jpg,.jpeg'"
        :file-list="newFiles"
        :on-change="onNewFileChange" :on-remove="onNewFileRemove"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
      </el-upload>
      <template #footer>
        <el-button @click="showUpload = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!newFiles.length" @click="onUploadConfirm">上传</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Files, UploadFilled } from '@element-plus/icons-vue'
import PageShell from '@/components/common/PageShell.vue'
import { getFileAssetDetail, deleteFile, uploadFiles, getFile } from '@/api/fileAsset'

const route = useRoute()
const assetId = ref(Number(route.params.id))

const loading = ref(false)
const asset = ref<any>(null)
const files = ref<any[]>([])
const currentFile = ref<any>(null)
const blocks = ref<any[]>([])
const blockTotal = ref(0)
const blockPage = ref(1)
const blockPageSize = ref(100)
const blockKeyword = ref('')

const showUpload = ref(false)
const newFiles = ref<any[]>([])
const uploading = ref(false)
const uploaderRef = ref()

function formatTime(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN', { hour12: false })
}
function formatSize(b: number) {
  if (!b) return '-'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}
function statusText(s: string) { return ({ pending: '排队中', parsing: '解析中', success: '成功', failed: '失败' } as any)[s] || s }
function statusType(s: string) { return ({ pending: 'info', parsing: 'warning', success: 'success', failed: 'danger' } as any)[s] || 'info' }
function blockTypeName(t?: string) {
  return ({
    excel_cell: 'Excel单元格',
    word_paragraph: 'Word段落',
    word_table_cell: 'Word表格',
    pdf_text: 'PDF文本',
    ocr_text: 'OCR文本',
    json_field: 'JSON字段',
    md_paragraph: 'Markdown',
    txt_line: '纯文本',
    image: '图片',
  } as any)[t || ''] || t || '-'
}

function rowClass({ row }: any) {
  return currentFile.value?.id === row.id ? 'active-row' : ''
}

async function loadDetail() {
  loading.value = true
  try {
    const data: any = await getFileAssetDetail(assetId.value)
    const payload = data.data || data
    asset.value = payload
    files.value = payload.files || []
    // 选中当前文件或第一个成功文件
    if (currentFile.value) {
      const refreshed = files.value.find(f => f.id === currentFile.value.id)
      currentFile.value = refreshed || files.value.find(f => f.parse_status === 'success') || files.value[0] || null
    } else {
      currentFile.value = files.value.find(f => f.parse_status === 'success') || files.value[0] || null
    }
    if (currentFile.value) {
      loadBlocks()
    }
  } finally {
    loading.value = false
  }
}

async function loadBlocks() {
  if (!currentFile.value) return
  blockTotal.value = 0
  blocks.value = []
  try {
    const params: Record<string, any> = {
      page: blockPage.value,
      page_size: blockPageSize.value,
    }
    if (blockKeyword.value) params.keyword = blockKeyword.value
    const data: any = await getFile(assetId.value, currentFile.value.id, params)
    const payload = data.data || data
    blocks.value = payload.blocks || []
    blockTotal.value = payload.total || blocks.value.length
  } catch (e) {
    console.error('loadBlocks error', e)
  }
}

function selectFile(row: any) {
  currentFile.value = row
  blockPage.value = 1
  blockKeyword.value = ''
  loadBlocksForFile(row)
}

async function loadBlocksForFile(row: any) {
  if (!row || row.block_count === 0) {
    blocks.value = []
    blockTotal.value = 0
    return
  }
  try {
    const params: Record<string, any> = {
      page: blockPage.value,
      page_size: blockPageSize.value,
    }
    if (blockKeyword.value) params.keyword = blockKeyword.value
    const data: any = await getFile(assetId.value, row.id, params)
    const payload = data.data || data
    blocks.value = payload.blocks || []
    blockTotal.value = payload.total || blocks.value.length
    currentFile.value = { ...currentFile.value, ...row, block_count: row.block_count }
  } catch (e) {
    console.error(e)
  }
}

async function onDeleteFile(row: any) {
  await deleteFile(assetId.value, row.id)
  ElMessage.success('已删除')
  if (currentFile.value?.id === row.id) {
    currentFile.value = null
    blocks.value = []
  }
  loadDetail()
}

const MAX_SIZE = 1 * 1024 * 1024 * 1024
function onNewFileChange(file: any) {
  if (!newFiles.value.find((f: any) => f.uid === file.uid)) {
    newFiles.value.push(file)
  }
  if (file.raw && file.raw.size > MAX_SIZE) {
    ElMessage.error(`${file.name} 超过 1GB`)
    setTimeout(() => {
      const idx = newFiles.value.findIndex((f: any) => f.uid === file.uid)
      if (idx >= 0) newFiles.value.splice(idx, 1)
    }, 0)
  }
}
function onNewFileRemove(file: any) {
  const idx = newFiles.value.findIndex((f: any) => f.uid === file.uid)
  if (idx >= 0) newFiles.value.splice(idx, 1)
}

async function onUploadConfirm() {
  if (!newFiles.value.length) return
  uploading.value = true
  try {
    const fileList: File[] = newFiles.value.map(f => f.raw).filter(Boolean)
    await uploadFiles(assetId.value, fileList)
    ElMessage.success(`已上传 ${fileList.length} 个文件`)
    showUpload.value = false
    newFiles.value = []
    loadDetail()
  } catch (e: any) {
    ElMessage.error('上传失败：' + (e?.message || ''))
  } finally {
    uploading.value = false
  }
}

import { onMounted } from 'vue'
onMounted(loadDetail)
</script>

<style scoped>
.section { margin-bottom: 16px; }
.section-title { font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.block-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
:deep(.active-row) { background: #ecf5ff !important; }
:deep(.active-row > td) { background: #ecf5ff !important; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>

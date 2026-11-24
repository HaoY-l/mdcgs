/**
 * 文件分批上传（目录导入 / 多文件导入共用）
 *
 * 为什么需要：浏览器无法把本地目录路径交给后端（后端在容器里看不到客户端磁盘），
 * 只能由前端递归读出文件后上传。文件多时必须分批，否则一次 FormData
 * 会把几百个文件同时压进内存和单次请求。
 */
import { ref } from 'vue'
import { uploadFiles } from '@/api/fileAsset'
import { sanitizeFileName } from '@/utils/filename'
import {
  MAX_FILE_SIZE, MAX_FILES_PER_BATCH, MAX_BYTES_PER_BATCH,
  isSupportedExt,
} from '@/constants/fileUpload'

export type ItemStatus = 'waiting' | 'uploading' | 'done' | 'rejected'

export interface UploadItem {
  uid: number
  name: string
  size: number
  raw: File
  status: ItemStatus
  /** 后端返回的 file_id（成功后） */
  fileId?: number
  /** 被拒绝或失败的原因 */
  reason?: string
  message?: string
}

let _uid = 0

export function useFileUploadQueue() {
  const items = ref<UploadItem[]>([])
  const uploading = ref(false)
  /** 当前批次序号（从 1 开始） */
  const batchIndex = ref(0)
  const batchTotal = ref(0)
  /** 已完成（含被拒绝）的文件数 */
  const finishedCount = ref(0)

  function reset() {
    items.value = []
    uploading.value = false
    batchIndex.value = 0
    batchTotal.value = 0
    finishedCount.value = 0
  }

  /** 加入待上传队列，同时做前端预检；超限/不支持的直接标为 rejected */
  function addFiles(files: File[]) {
    for (const f of files) {
      const item: UploadItem = {
        uid: ++_uid,
        name: f.name,
        size: f.size,
        raw: f,
        status: 'waiting',
      }
      if (!isSupportedExt(f.name)) {
        item.status = 'rejected'
        item.reason = 'unsupported_ext'
        item.message = '不支持的文件类型'
      } else if (f.size > MAX_FILE_SIZE) {
        item.status = 'rejected'
        item.reason = 'too_large'
        item.message = `超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB 限制`
      }
      items.value.push(item)
    }
  }

  function removeAt(idx: number) {
    if (idx >= 0 && idx < items.value.length) items.value.splice(idx, 1)
  }

  function clear() {
    items.value = []
  }

  /** 只把还在 waiting 状态的文件切批 */
  function buildBatches(): UploadItem[][] {
    const pending = items.value.filter(i => i.status === 'waiting')
    const batches: UploadItem[][] = []
    let cur: UploadItem[] = []
    let curSize = 0
    for (const item of pending) {
      const wouldExceedCount = cur.length >= MAX_FILES_PER_BATCH
      const wouldExceedSize = curSize + item.size > MAX_BYTES_PER_BATCH
      if (cur.length && (wouldExceedCount || wouldExceedSize)) {
        batches.push(cur)
        cur = []
        curSize = 0
      }
      cur.push(item)
      curSize += item.size
    }
    if (cur.length) batches.push(cur)
    return batches
  }

  /**
   * 串行分批上传
   * @param assetId 目标资产
   * @param onBatchDone 每批完成后的回调（用于刷新列表等）
   */
  async function submit(
    assetId: number,
    onBatchDone?: () => void
  ): Promise<{ uploaded: number; rejected: number; failed: number }> {
    const batches = buildBatches()
    if (!batches.length) return { uploaded: 0, rejected: 0, failed: 0 }

    uploading.value = true
    batchTotal.value = batches.length
    finishedCount.value = items.value.filter(i => i.status === 'rejected').length
    const stat = { uploaded: 0, rejected: 0, failed: 0 }

    try {
      for (let b = 0; b < batches.length; b++) {
        batchIndex.value = b + 1
        const batch = batches[b]

        batch.forEach(i => { i.status = 'uploading' })

        try {
          const res: any = await uploadFiles(
            assetId,
            batch.map(i => i.raw),
            undefined,
            true
          )
          const uploaded: any[] = res?.data?.files || []
          const skipped: any[] = res?.data?.skipped || []

          // 后端按提交顺序处理并返回；文件名可能被后端清洗过，
          // 因此优先用"清洗后名称 + 大小"匹配，再退化为按顺序匹配。
          const usedUploaded = new Set<number>()
          for (const item of batch) {
            const safeName = sanitizeFileName(item.name)
            let idx = uploaded.findIndex(
              (u: any, i: number) =>
                !usedUploaded.has(i) && u.file_name === safeName && u.file_size === item.size
            )
            if (idx < 0) {
              idx = uploaded.findIndex((u: any, i: number) => !usedUploaded.has(i) && u.file_name === safeName)
            }
            if (idx >= 0) {
              usedUploaded.add(idx)
              item.status = 'done'
              item.fileId = uploaded[idx].file_id
              item.message = '解析排队中'
              stat.uploaded++
              continue
            }

            const sk = skipped.find((s: any) => s.file_name === safeName)
            item.status = 'rejected'
            item.reason = sk?.reason || 'skipped'
            item.message = sk?.message || '未上传成功'
            stat.rejected++
          }
        } catch (e: any) {
          batch.forEach(i => {
            i.status = 'rejected'
            i.reason = 'request_failed'
            i.message = e?.message || '上传请求失败'
          })
          stat.failed += batch.length
        }

        finishedCount.value = items.value.filter(
          i => i.status === 'rejected' || i.status === 'done'
        ).length
        if (onBatchDone) onBatchDone()
      }
    } finally {
      uploading.value = false
    }

    return stat
  }

  return {
    items, uploading, batchIndex, batchTotal, finishedCount,
    addFiles, removeAt, clear, reset, submit, buildBatches,
  }
}

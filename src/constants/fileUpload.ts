/**
 * 文件上传常量（前后端同一份真值）
 *
 * 后端对应位置：
 * - app/services/file_parser.py: SUPPORTED_EXTS / MAX_FILE_SIZE（50MB）
 * - app/api/v1/file_assets/file_assets.py: MAX_FILES_PER_REQUEST / MAX_FILES_PER_ASSET
 *
 * 修改上限时必须两边同步，否则前端会放行后端拒绝的文件。
 */

/** 支持的文件扩展名（与后端 SUPPORTED_EXTS 一致） */
export const SUPPORTED_EXTS = [
  '.xlsx', '.xls', '.csv',
  '.docx',
  '.pdf',
  '.md', '.markdown',
  '.json',
  '.txt',
  '.png', '.jpg', '.jpeg',
] as const

/** el-upload accept 属性 */
export const ACCEPT_EXTS = SUPPORTED_EXTS.join(',')

/** 单文件大小上限：50MB（后端 file_parser.MAX_FILE_SIZE） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 单次请求文件数上限（后端 MAX_FILES_PER_REQUEST） */
export const MAX_FILES_PER_BATCH = 20

/** 单批累计体积上限，超过则提前切批（避免一次请求过大） */
export const MAX_BYTES_PER_BATCH = 200 * 1024 * 1024

/** 单个资产文件总数上限（后端 MAX_FILES_PER_ASSET） */
export const MAX_FILES_PER_ASSET = 5000

/**
 * 报告配图上传常量（前后端同一份真值）
 *
 * 后端对应位置：
 * - app/api/v1/reports/risk_assets.py: MAX_IMAGE_BYTES / MAX_IMAGE_PIXELS / MAX_IMAGE_SIDE
 *
 * 注意：报告配图只接受 PNG / JPEG，且后端会按魔数校验真实类型，
 * 不接受 SVG（可内联脚本，构成存储型 XSS）。
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/** 报告配图允许的扩展名 */
export const IMAGE_EXTS = ['.png', '.jpg', '.jpeg'] as const

/** 报告配图 el-upload accept 属性 */
export const IMAGE_ACCEPT = IMAGE_EXTS.join(',')

/** 报告配图总像素上限（2000 万像素，防解压炸弹） */
export const MAX_IMAGE_PIXELS = 20_000_000

/** 报告配图单边像素上限 */
export const MAX_IMAGE_SIDE = 4000

/** 扩展名是否属于允许的报告配图格式 */
export function isImageExt(name: string): boolean {
  const ext = extOf(name)
  return (IMAGE_EXTS as readonly string[]).includes(ext as any)
}

/** 扩展名是否受支持 */
export function isSupportedExt(name: string): boolean {
  const idx = name.lastIndexOf('.')
  if (idx < 0) return false
  const ext = name.slice(idx).toLowerCase()
  return (SUPPORTED_EXTS as readonly string[]).includes(ext)
}

/** 取小写扩展名（含点） */
export function extOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx < 0 ? '' : name.slice(idx).toLowerCase()
}

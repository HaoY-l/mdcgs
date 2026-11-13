import client from './client'

/** 离线导入表单 */
export interface OfflineImportForm {
  file: File
  assetName: string
  assetType: string
  databaseName: string
  charset: string
  sampleCount: number
  businessDept?: string
  appSystem?: string
}

/** 离线导入结果 */
export interface OfflineImportResult {
  asset_id: number
  asset_name: string
  database_name: string
  table_count: number
  column_count: number
  skipped_statements: number
  file_size: number
  encoding: string
  duration: number
}

/**
 * 上传 .sql 导出文件，离线解析并生成数据资产。
 * 文件较大（最大 10GB），因此不设置超时。
 */
export async function offlineImport(data: OfflineImportForm, onProgress?: (percent: number) => void) {
  const fd = new FormData()
  fd.append('file', data.file)
  fd.append('asset_name', data.assetName)
  fd.append('asset_type', data.assetType)
  fd.append('database_name', data.databaseName)
  fd.append('charset', data.charset)
  fd.append('sample_count', String(data.sampleCount))
  fd.append('business_dept', data.businessDept || '')
  fd.append('app_system', data.appSystem || '')

  return client.post('/assets/offline-import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
    onUploadProgress: (e: any) => {
      if (!onProgress) return
      if (e.total) {
        onProgress(Math.min(99, Math.floor((e.loaded / e.total) * 100)))
      }
    },
  })
}

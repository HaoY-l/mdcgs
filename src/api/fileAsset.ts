import client from './client'

// 文件资产 CRUD
export async function getFileAssets(params: Record<string, any> = {}) {
  return client.get('/file-assets', { params })
}
export async function getFileAssetDetail(id: number) {
  return client.get(`/file-assets/${id}`)
}
export async function createFileAsset(data: Record<string, any>) {
  return client.post('/file-assets', data)
}
export async function updateFileAsset(id: number, data: Record<string, any>) {
  return client.put(`/file-assets/${id}`, data)
}
export async function deleteFileAsset(id: number) {
  return client.delete(`/file-assets/${id}`)
}

// 文件上传（注意：multipart 由 client 自动处理）
export async function previewFile(assetId: number, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(`/file-assets/${assetId}/files/preview`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export async function uploadFiles(
  assetId: number,
  files: File[],
  onProgress?: (e: any) => void
) {
  const fd = new FormData()
  files.forEach(f => fd.append('files', f))
  return client.post(`/file-assets/${assetId}/files`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    timeout: 30 * 60 * 1000,
  })
}

// 文件查询与删除
export async function listFiles(assetId: number, params: Record<string, any> = {}) {
  return client.get(`/file-assets/${assetId}/files`, { params })
}
export async function getFile(assetId: number, fileId: number, params: Record<string, any> = {}) {
  return client.get(`/file-assets/${assetId}/files/${fileId}`, { params })
}
export async function deleteFile(assetId: number, fileId: number) {
  return client.delete(`/file-assets/${assetId}/files/${fileId}`)
}

// 内容块启用/禁用
export async function toggleBlock(assetId: number, blockId: number, isDisabled: boolean) {
  return client.put(`/file-assets/${assetId}/blocks/${blockId}/disabled`, { is_disabled: isDisabled ? 1 : 0 })
}

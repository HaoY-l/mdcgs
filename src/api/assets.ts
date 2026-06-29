import client from './client'

// ===== 资产分组 =====
export async function getAssetGroups(params: Record<string, any> = {}) {
  return client.get('/asset-groups', { params })
}

export async function createAssetGroup(data: Record<string, any>) {
  return client.post('/asset-groups', data)
}

export async function updateAssetGroup(id: number, data: Record<string, any>) {
  return client.put(`/asset-groups/${id}`, data)
}

export async function deleteAssetGroup(id: number) {
  return client.delete(`/asset-groups/${id}`)
}

export async function getAssetGroupTree() {
  return client.get('/asset-groups/tree')
}

// ===== 数据资产 =====
export async function getAssets(params: Record<string, any> = {}) {
  return client.get('/assets', { params })
}

export async function createAsset(data: Record<string, any>) {
  return client.post('/assets', data)
}

export async function getAssetDetail(id: number) {
  return client.get(`/assets/${id}`)
}

export async function updateAsset(id: number, data: Record<string, any>) {
  return client.put(`/assets/${id}`, data)
}

export async function deleteAsset(id: number) {
  return client.delete(`/assets/${id}`)
}

export async function testConnection(id: number, data?: Record<string, any>) {
  return client.post(`/assets/${id}/test-connection`, data || {})
}

export async function testConnectionDirect(data: Record<string, any>) {
  return client.post('/assets/test-connection-direct', data)
}

export async function updateAssetManual(id: number, data?: Record<string, any>) {
  return client.post(`/assets/${id}/update`, data || {})
}

export async function batchUpdateAssets(data: Record<string, any>) {
  return client.post('/assets/batch-update', data)
}

export async function batchDeleteAssets(data: Record<string, any>) {
  return client.post('/assets/batch-delete', data)
}

export async function importAssets(data: FormData) {
  return client.post('/assets/import', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ===== 资产数据库/表/字段 =====
export async function getAssetDatabases(assetId: number) {
  return client.get(`/assets/${assetId}/databases`)
}

export async function getAssetTables(assetId: number, params: Record<string, any> = {}) {
  return client.get(`/assets/${assetId}/tables`, { params })
}

export async function getAssetColumns(assetId: number, params: Record<string, any> = {}) {
  return client.get(`/assets/${assetId}/columns`, { params })
}

export async function getAssetSamples(assetId: number, params: Record<string, any> = {}) {
  return client.get(`/assets/${assetId}/samples`, { params })
}

export async function getUpdatingAssets() {
  return client.get('/assets/updating')
}

// ===== 自动扫描 =====
export async function getScanTasks(params: Record<string, any> = {}) {
  return client.get('/scan-tasks', { params })
}

export async function createScanTask(data: Record<string, any>) {
  return client.post('/scan-tasks', data)
}

export async function getScanTaskDetail(id: number) {
  return client.get(`/scan-tasks/${id}`)
}

export async function updateScanTask(id: number, data: Record<string, any>) {
  return client.put(`/scan-tasks/${id}`, data)
}

export async function deleteScanTask(id: number) {
  return client.delete(`/scan-tasks/${id}`)
}

export async function startScanTask(id: number) {
  return client.post(`/scan-tasks/${id}/start`)
}

export async function stopScanTask(id: number) {
  return client.post(`/scan-tasks/${id}/stop`)
}

export async function getDiscoveredAssets(taskId: number) {
  return client.get(`/scan-tasks/${taskId}/discovered`)
}

export async function claimDiscoveredAsset(taskId: number, assetId: number) {
  return client.post(`/scan-tasks/${taskId}/discovered/${assetId}/claim`)
}

export async function ignoreDiscoveredAsset(taskId: number, assetId: number) {
  return client.post(`/scan-tasks/${taskId}/discovered/${assetId}/ignore`)
}

// ===== 分表组合 =====
export async function getSubTableGroups(params: Record<string, any> = {}) {
  return client.get('/sub-table-groups', { params })
}

export async function createSubTableGroup(data: Record<string, any>) {
  return client.post('/sub-table-groups', data)
}

export async function getSubTableGroupDetail(id: number) {
  return client.get(`/sub-table-groups/${id}`)
}

export async function updateSubTableGroup(id: number, data: Record<string, any>) {
  return client.put(`/sub-table-groups/${id}`, data)
}

export async function deleteSubTableGroup(id: number) {
  return client.delete(`/sub-table-groups/${id}`)
}

export async function validateSubTableGroup(data: Record<string, any>) {
  return client.post('/sub-table-groups/validate', data)
}

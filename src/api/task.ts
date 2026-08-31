import client from './client'

// ===== 分类任务管理 =====

export async function getOccupiedAssets() {
  return client.get("/classification-tasks/occupied-assets")
}

export async function getTasks(params: Record<string, any> = {}) {
  return client.get('/classification-tasks', { params })
}

export async function createTask(data: Record<string, any>) {
  return client.post('/classification-tasks', data)
}

export async function getTaskDetail(id: number) {
  return client.get(`/classification-tasks/${id}`)
}

export async function updateTask(id: number, data: Record<string, any>) {
  return client.put(`/classification-tasks/${id}`, data)
}

export async function deleteTask(id: number) {
  return client.delete(`/classification-tasks/${id}`)
}

export async function startTask(id: number): Promise<Record<string, any>> {
  return client.post(`/classification-tasks/${id}/start`) as any
}

export async function stopTask(id: number) {
  return client.post(`/classification-tasks/${id}/stop`)
}

export async function batchStartTasks(taskIds: number[]): Promise<Record<string, any>> {
  return client.post('/classification-tasks/batch-start', { task_ids: taskIds }) as any
}

export async function clearTaskResults(id: number) {
  return client.post(`/classification-tasks/${id}/clear-results`)
}

export async function getTaskProgress(id: number) {
  return client.get(`/classification-tasks/${id}/progress`)
}

// ===== 任务结果 - 表级 =====

export async function getTaskResults(taskId: number, params: Record<string, any> = {}) {
  return client.get(`/classification-tasks/${taskId}/results`, { params })
}

export async function getTaskTables(taskId: number, params: Record<string, any> = {}) {
  return client.get(`/classification-tasks/${taskId}/results/tables`, { params })
}

export async function getTaskColumns(taskId: number, params: Record<string, any> = {}) {
  const queryParams = { ...params }
  return client.get(`/classification-tasks/${taskId}/results/columns`, { params: queryParams })
}

// ===== 单字段操作（使用元数据键定位） =====

/**
 * 获取单列结果
 * @param taskId 任务ID
 * @param fieldMeta 元数据键 { asset_id, database_name, table_name, column_name }
 */
export async function getColumnResult(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }) {
  return client.get(`/classification-tasks/${taskId}/results/field`, { params: fieldMeta })
}

/**
 * 确认字段分类结果
 * @param taskId 任务ID
 * @param fieldMeta 元数据键
 * @param data 请求体数据
 */
export async function confirmResult(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/field/confirm`, { ...fieldMeta, ...data })
}

/**
 * 变更字段分类结果
 */
export async function changeResult(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/field/change`, { ...fieldMeta, ...data })
}

/**
 * 解锁字段
 */
export async function unlockResult(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }) {
  return client.post(`/classification-tasks/${taskId}/results/field/unlock`, fieldMeta)
}

// ===== 批次操作 =====

/**
 * 批量确认 - data.fields: [{asset_id, database_name, table_name, column_name}, ...]
 */
export async function batchConfirm(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-confirm`, data)
}

/**
 * 批量变更 - data.fields: [{asset_id, database_name, table_name, column_name}, ...]
 */
export async function batchChange(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-change`, data)
}

/**
 * 批量解锁 - data.fields: [{asset_id, database_name, table_name, column_name}, ...]
 */
export async function batchUnlock(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-unlock`, data)
}

/**
 * 批量备注 - data.fields: [{asset_id, database_name, table_name, column_name}, ...]
 */
export async function batchNote(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-note`, data)
}

// ===== 脱敏与加密 =====

/**
 * 确认脱敏 - fieldMeta: {asset_id, database_name, table_name, column_name}
 */
export async function confirmMask(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/field/confirm-mask`, { ...fieldMeta, ...data })
}

/**
 * 确认加密 - fieldMeta: {asset_id, database_name, table_name, column_name}
 */
export async function confirmEncrypt(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/field/confirm-encrypt`, { ...fieldMeta, ...data })
}

/**
 * 变更表级别 - fieldMeta: {asset_id, database_name, table_name}
 */
export async function changeTableLevel(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string }, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/tables/change-level`, { ...fieldMeta, ...data })
}

/**
 * 解锁表级别 - fieldMeta: {asset_id, database_name, table_name}
 */
export async function unlockTableLevel(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string }) {
  return client.post(`/classification-tasks/${taskId}/tables/unlock`, fieldMeta)
}

// ===== 分类视图与统计 =====

export async function getCategoryView(taskId: number) {
  return client.get(`/classification-tasks/${taskId}/category-view`)
}

export async function getTaskStatistics(taskId: number) {
  return client.get(`/classification-tasks/${taskId}/statistics`)
}

export async function getTaskLogs(taskId: number, params: Record<string, any> = {}) {
  return client.get(`/classification-tasks/${taskId}/logs`, { params })
}

// ===== 历史记录 =====

export async function getTaskHistory(taskId: number, params: Record<string, any> = {}) {
  return client.get(`/classification-tasks/${taskId}/history`, { params })
}

export async function getHistoryDetail(historyId: number) {
  return client.get(`/classification-tasks/${historyId}/history`)
}

export async function compareHistory(taskId: number, historyId1: number, historyId2: number) {
  return client.get(`/classification-tasks/${taskId}/history/compare`, {
    params: { id1: historyId1, id2: historyId2 },
  })
}

// ===== AI 分类 =====

export async function aiClassify(taskId: number) {
  return client.post(`/classification-tasks/${taskId}/ai-classify`)
}

// ===== 样本数据 =====

/**
 * 获取字段样本数据 - fieldMeta: {asset_id, database_name, table_name, column_name}
 */
export async function getColumnSample(taskId: number, fieldMeta: { asset_id: number; database_name: string; table_name: string; column_name: string }) {
  return client.get(`/classification-tasks/${taskId}/results/field/sample`, { params: fieldMeta })
}

// ===== 审核相关 =====

export async function getAuditApplications(params: Record<string, any> = {}) {
  return client.get('/audit-applications', { params })
}

export async function getAuditDetail(id: number) {
  return client.get(`/audit-applications/${id}`)
}

export async function approveAudit(id: number, data: Record<string, any> = {}) {
  return client.post(`/audit-applications/${id}/approve`, data)
}

export async function rejectAudit(id: number, data: Record<string, any> = {}) {
  return client.post(`/audit-applications/${id}/reject`, data)
}

export async function getMyApplications(params: Record<string, any> = {}) {
  return client.get('/audit-applications/my', { params })
}

export async function withdrawApplication(id: number) {
  return client.post(`/audit-applications/${id}/withdraw`)
}

// ===== 授权相关 =====

export async function getAuthorizations(params: Record<string, any> = {}) {
  return client.get('/authorizations', { params })
}

export async function createAuthorization(data: Record<string, any>) {
  return client.post('/authorizations', data)
}

export async function invalidateAuthorization(id: number) {
  return client.post(`/authorizations/${id}/invalidate`)
}

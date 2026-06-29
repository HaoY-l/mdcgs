import client from './client'

// ===== 分类任务管理 =====

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

export async function startTask(id: number) {
  return client.post(`/classification-tasks/${id}/start`)
}

export async function stopTask(id: number) {
  return client.post(`/classification-tasks/${id}/stop`)
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
  // Support table_id filter
  const queryParams = { ...params }
  return client.get(`/classification-tasks/${taskId}/results/columns`, { params: queryParams })
}

export async function getColumnResult(taskId: number, columnId: number) {
  return client.get(`/classification-tasks/${taskId}/results/${columnId}`)
}

export async function confirmResult(taskId: number, columnId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/${columnId}/confirm`, data)
}

export async function changeResult(taskId: number, columnId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/${columnId}/change`, data)
}

export async function unlockResult(taskId: number, columnId: number) {
  return client.post(`/classification-tasks/${taskId}/results/${columnId}/unlock`)
}

// ===== 批次操作 =====

export async function batchConfirm(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-confirm`, data)
}

export async function batchChange(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-change`, data)
}

export async function batchUnlock(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-unlock`, data)
}

export async function batchNote(taskId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/batch-note`, data)
}

// ===== 脱敏与加密 =====

export async function confirmMask(taskId: number, columnId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/${columnId}/confirm-mask`, data)
}

export async function confirmEncrypt(taskId: number, columnId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/results/${columnId}/confirm-encrypt`, data)
}

export async function changeTableLevel(taskId: number, tableId: number, data: Record<string, any> = {}) {
  return client.post(`/classification-tasks/${taskId}/tables/${tableId}/change-level`, data)
}

export async function unlockTableLevel(taskId: number, tableId: number) {
  return client.post(`/classification-tasks/${taskId}/tables/${tableId}/unlock`)
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

// ===== 样本数据 =====

export async function getColumnSample(taskId: number, columnId: number) {
  return client.get(`/classification-tasks/${taskId}/results/${columnId}/sample`)
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

import client from './client'

export async function getFileTasks(params: Record<string, any> = {}) {
  return client.get('/file-classification-tasks', { params })
}
export async function createFileTask(data: any) {
  return client.post('/file-classification-tasks', data)
}
export async function getFileTask(id: number) {
  return client.get(`/file-classification-tasks/${id}`)
}
export async function updateFileTask(id: number, data: any) {
  return client.put(`/file-classification-tasks/${id}`, data)
}
export async function deleteFileTask(id: number) {
  return client.delete(`/file-classification-tasks/${id}`)
}
export async function startFileTask(id: number) {
  return client.post(`/file-classification-tasks/${id}/start`)
}
export async function stopFileTask(id: number) {
  return client.post(`/file-classification-tasks/${id}/stop`)
}
export async function batchStartFileTasks(taskIds: number[]) {
  return client.post('/file-classification-tasks/batch-start', { task_ids: taskIds })
}
export async function clearFileTaskResults(id: number) {
  return client.post(`/file-classification-tasks/${id}/clear-results`)
}
export async function getFileTaskProgress(id: number) {
  return client.get(`/file-classification-tasks/${id}/progress`)
}

// 任务结果（内容块级）
export async function getFileTaskResults(taskId: number, params: Record<string, any> = {}) {
  return client.get(`/file-classification-tasks/${taskId}/results`, { params })
}
// 按文件聚合的摘要
export async function getFileTaskResultsSummary(taskId: number) {
  return client.get(`/file-classification-tasks/${taskId}/results/summary`)
}

// 统计信息
export async function getFileTaskStatistics(taskId: number) {
  return client.get(`/file-classification-tasks/${taskId}/statistics`)
}

// 分类视图
export async function getFileTaskCategoryView(taskId: number) {
  return client.get(`/file-classification-tasks/${taskId}/category-view`)
}

// 执行记录 / 任务日志
export async function getFileTaskExecutions(taskId: number) {
  return client.get(`/file-classification-tasks/${taskId}/executions`)
}

// 筛选选项（文件名列表、块类型列表）
export async function getFileTaskFilterOptions(taskId: number) {
  return client.get(`/file-classification-tasks/${taskId}/filter-options`)
}

// 确认 / 变更（兼容旧路由）
export async function confirmFileResult(taskId: number, resultId: number) {
  return client.post(`/file-classification-tasks/${taskId}/results/${resultId}/confirm`)
}
export async function changeFileResult(taskId: number, resultId: number, data: any) {
  return client.post(`/file-classification-tasks/${taskId}/results/${resultId}/change`, data)
}
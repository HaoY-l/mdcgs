import client from './client'

// ===== 审计日志 =====

export interface AuditLogItem {
  id: number
  user_id: number
  username: string
  module: string
  action: string
  detail: string
  request_id?: string
  resource_type?: string
  resource_id?: string
  before_value?: string
  after_value?: string
  ip_address: string
  user_agent: string
  status: number
  error_message?: string
  duration_ms?: number
  created_at: string
}

export interface AuditLogStats {
  total_logs: number
  module_distribution: { name: string; value: number }[]
  ip_distribution: { name: string; value: number }[]
  status_distribution: { name: string; value: number }[]
  today_logs: number
}

export interface AuditLogOptions {
  users: string[]
  modules: string[]
  actions: string[]
  resource_types: string[]
  module_actions: Record<string, string[]>
}

export interface AuditLogExport {
  total_rows: number
  export_format: string
  export_url: string
  file_name: string
  message: string
}

// 趋势分析
export interface AuditTrendData {
  daily_trend: { date: string; count: number }[]
  action_distribution: { action: string; count: number }[]
  top_users: { username: string; count: number }[]
}

// 审计规则
export interface AuditRule {
  id: number
  name: string
  description: string
  module?: string
  action?: string
  condition?: Record<string, any>
  alert_level: string
  alert_channels: string[]
  notify_target_ids?: number[]
  enabled: boolean
  created_at: string
}

// 审计告警
export interface AuditAlert {
  id: number
  rule_id: number
  rule_name: string
  alert_level: string
  log_id: number
  resource_type?: string
  resource_id?: string
  message: string
  status: 'pending' | 'sent' | 'ack'
  sent_at?: string
  acknowledged_at?: string
  acknowledged_by?: number
  push_errors?: string[] | null
  created_at: string
}

export interface AlertStats {
  total: number
  pending: number
  sent: number
  unconfirmed: number
  acknowledged: number
  level_distribution: { level: string; count: number }[]
}

// 保留设置
export interface RetentionSettings {
  log_retention_days: string
  log_level: string
  enable_audit_log: string
  archive_enabled: string
  archive_before_delete: string
}

export async function getAuditLogs(params: Record<string, any> = {}) {
  return client.get('/audit-logs', { params })
}

export async function getAuditLogStats(params: Record<string, any> = {}) {
  return client.get('/audit-logs/statistics', { params })
}

// 筛选下拉选项（全量用户/模块/操作类型）
export async function getAuditLogOptions() {
  return client.get('/audit-logs/options')
}

// 单条日志详情
export async function getAuditLogDetail(logId: number) {
  return client.get(`/audit-logs/${logId}`)
}

// 导出为 CSV 文件流
export async function exportAuditLogs(params: Record<string, any> = {}) {
  return client.get('/audit-logs/export', { params, responseType: 'blob' })
}

export async function updateAuditLogSettings(data: Record<string, any>) {
  return client.put('/audit-logs/settings', data)
}

// 趋势分析
export async function getAuditLogTrend(params: Record<string, any> = {}) {
  return client.get('/audit-logs/trend', { params })
}

// 保留设置
export async function getRetentionSettings() {
  return client.get('/audit-logs/retention')
}

export async function cleanupOldLogs(dryRun: boolean = false, retentionDays?: number) {
  const params: Record<string, any> = { dry_run: dryRun }
  if (retentionDays !== undefined && retentionDays !== null) {
    params.retention_days = retentionDays
  }
  return client.post('/audit-logs/retention/cleanup', null, { params })
}

// 审计规则
export async function getAuditRules(params: Record<string, any> = {}) {
  return client.get('/audit-rules', { params })
}

// 规则试算：按条件统计最近 N 天会命中的日志条数
export async function previewAuditRule(params: Record<string, any> = {}) {
  return client.get('/audit-rules/preview', { params })
}

export async function createAuditRule(data: Record<string, any>) {
  return client.post('/audit-rules', data)
}

export async function updateAuditRule(ruleId: number, data: Record<string, any>) {
  return client.put(`/audit-rules/${ruleId}`, data)
}

export async function deleteAuditRule(ruleId: number) {
  return client.delete(`/audit-rules/${ruleId}`)
}

export async function toggleAuditRule(ruleId: number) {
  return client.put(`/audit-rules/${ruleId}/toggle`)
}

// 审计告警
export async function getAuditAlerts(params: Record<string, any> = {}) {
  return client.get('/audit-alerts', { params })
}

// 右上角通知：未确认告警数量 + 最近告警
export async function getUnreadAlerts(limit: number = 10) {
  return client.get('/audit-alerts/unread', { params: { limit } })
}

export async function acknowledgeAlert(alertId: number) {
  return client.put(`/audit-alerts/${alertId}/ack`)
}

export async function acknowledgeAllAlerts() {
  return client.put('/audit-alerts/ack-all')
}

export async function resendAlert(alertId: number) {
  return client.post(`/audit-alerts/${alertId}/send`)
}

export async function getAlertStats() {
  return client.get('/audit-alerts/stats')
}

// ── 系统通知（任务完成 / 报告生成 / 资产发现 / 资产更新失败）──

/** 通知分页列表 */
export async function getNotifications(params: Record<string, any> = {}) {
  return client.get('/notifications', { params })
}

/** 通知中心：未读数 + 各类型未读 + 最近 N 条 */
export async function getUnreadNotifications(limit: number = 20) {
  return client.get('/notifications/unread', { params: { limit } })
}

/** 单条已读 */
export async function readNotification(id: number) {
  return client.put(`/notifications/${id}/read`)
}

/** 全部已读（可按类型） */
export async function readAllNotifications(type?: string) {
  return client.put('/notifications/read-all', undefined, {
    params: type ? { type } : {},
  })
}

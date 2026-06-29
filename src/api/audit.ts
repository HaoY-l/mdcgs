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
  mock_data: boolean
}

export interface AuditLogExport {
  total_rows: number
  export_format: string
  export_url: string
  file_name: string
  mock_data: boolean
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
  created_at: string
}

export interface AlertStats {
  total: number
  pending: number
  sent: number
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

export async function exportAuditLogs(params: Record<string, any> = {}) {
  return client.get('/audit-logs/export', { params })
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

export async function cleanupOldLogs(dryRun: boolean = false) {
  return client.post('/audit-logs/retention/cleanup', null, { params: { dry_run: dryRun } })
}

// 审计规则
export async function getAuditRules(params: Record<string, any> = {}) {
  return client.get('/audit-rules', { params })
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

export async function acknowledgeAlert(alertId: number) {
  return client.put(`/audit-alerts/${alertId}/ack`)
}

export async function resendAlert(alertId: number) {
  return client.post(`/audit-alerts/${alertId}/send`)
}

export async function getAlertStats() {
  return client.get('/audit-alerts/stats')
}

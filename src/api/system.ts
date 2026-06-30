import client from './client'

// ============================================================
// 系统设置
// ============================================================

export async function getSettings() {
  return client.get('/settings')
}

export async function updateSettings(data: Record<string, any>) {
  return client.put('/settings', data)
}

export async function uploadLogo(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function getLogoUrl() {
  return client.get('/settings/logo-url')
}

// ============================================================
// LDAP设置
// ============================================================

export async function getLdapSettings() {
  return client.get('/settings/ldap')
}

export async function updateLdapSettings(data: Record<string, any>) {
  return client.put('/settings/ldap', data)
}

export async function testLdapConnection(data: Record<string, any>) {
  return client.post('/settings/ldap/test', data)
}

// ============================================================
// 系统监控
// ============================================================

export interface MonitorStatus {
  cpu_usage: number
  cpu_count: number
  memory_usage: number
  memory_used: string
  memory_total: string
  disk_usage: number
  disk_used: string
  disk_total: string
  load_avg_1m: number
  load_avg_5m: number
  load_avg_15m: number
  services: { name: string; status: string; uptime: string }[]
}

export interface PerformanceData {
  period: string
  timestamps: string[]
  cpu_history: number[]
  memory_history: number[]
  disk_history: number[]
  count: number
}

export async function getMonitorStatus() {
  return client.get('/monitor/status')
}

export async function getPerformanceData(params?: Record<string, any>) {
  return client.get('/monitor/performance', { params })
}

// ============================================================
// 数据备份
// ============================================================

export interface BackupItem {
  id: string
  name: string
  size: string
  size_bytes: number
  created_at: string
}

export async function getBackups() {
  return client.get('/monitor/backups')
}

export async function createBackup() {
  return client.post('/monitor/backups')
}

export async function deleteBackup(id: string) {
  return client.delete(`/monitor/backups/${id}`)
}

export async function restoreBackup(id: string) {
  return client.post(`/monitor/backups/${id}/restore`)
}

export async function downloadBackup(id: string) {
  return client.get(`/monitor/backups/${id}/download`, {
    responseType: 'blob',
  })
}

// ============================================================
// 系统日志
// ============================================================

export interface SystemLogItem {
  id: string
  name: string
  path: string
  size: string
  size_bytes: number
  updated_at: string
}

export interface LogContent {
  name: string
  lines: string[]
  total_lines: number
}

export async function getSystemLogs(params?: Record<string, any>) {
  return client.get('/monitor/logs', { params })
}

export async function getLogContent(logName: string, lines?: number) {
  return client.get(`/monitor/logs/${encodeURIComponent(logName)}/content`, {
    params: { lines: lines || 500 },
  })
}

export async function downloadSystemLog(logName: string) {
  return client.get('/monitor/logs/download', {
    params: { log_name: logName },
    responseType: 'blob',
  })
}

export async function deleteSystemLog(id: string) {
  return client.delete(`/monitor/logs/${id}`)
}

// ============================================================
// 审核申请
// ============================================================

export async function getAuditApplications(params: Record<string, any>) {
  return client.get('/audit-applications', { params })
}

export async function getAuditApplication(id: number) {
  return client.get(`/audit-applications/${id}`)
}

export async function approveApplication(id: number, comment?: string) {
  return client.post(`/audit-applications/${id}/approve`, { comment })
}

export async function rejectApplication(id: number, comment?: string) {
  return client.post(`/audit-applications/${id}/reject`, { comment })
}

// ============================================================
// 授权码管理
// ============================================================

export async function getAuthorizations(params: Record<string, any>) {
  return client.get('/authorizations', { params })
}

export async function getAuthorization(id: number) {
  return client.get(`/authorizations/${id}`)
}

export async function createAuthorization(data: Record<string, any>) {
  return client.post('/authorizations', data)
}

export async function invalidateAuthorization(id: number) {
  return client.post(`/authorizations/${id}/invalidate`)
}

// ============================================================
// 安全设置 - 审计日志设置
// ============================================================

export async function updateAuditLogSettings(data: Record<string, any>) {
  return client.put('/audit-logs/settings', data)
}

// ============================================================
// 开放接口
// ============================================================

export async function getApiKeys() {
  return client.get('/api-keys')
}

export async function createApiKey(data: Record<string, any>) {
  return client.post('/api-keys', data)
}

export async function deleteApiKey(id: number) {
  return client.delete(`/api-keys/${id}`)
}

// ============================================================
// 数据安全应用集成
// ============================================================

export async function getDataApps() {
  return client.get('/data-apps')
}

export async function createDataApp(data: Record<string, any>) {
  return client.post('/data-apps', data)
}

export async function deleteDataApp(id: number) {
  return client.delete(`/data-apps/${id}`)
}

export async function testDataAppConnection(id: number) {
  return client.post(`/data-apps/${id}/test`)
}

// ============================================================
// IP白名单
// ============================================================

export async function getIpWhitelist() {
  return client.get('/ip-whitelist')
}

export async function updateIpWhitelist(data: Record<string, any>) {
  return client.put('/ip-whitelist', data)
}

// ============================================================
// 密码策略
// ============================================================

export async function getPasswordPolicy() {
  return client.get('/password-policy')
}

export async function updatePasswordPolicy(data: Record<string, any>) {
  return client.put('/password-policy', data)
}

// ============================================================
// 登录锁定设置
// ============================================================

export async function getLoginLockout() {
  return client.get('/login-lockout')
}

export async function updateLoginLockout(data: Record<string, any>) {
  return client.put('/login-lockout', data)
}

// ============================================================
// 会话超时设置
// ============================================================

export async function getSessionTimeout() {
  return client.get('/session-timeout')
}

export async function updateSessionTimeout(data: Record<string, any>) {
  return client.put('/session-timeout', data)
}

// ============================================================
// 软件授权管理
// ============================================================

export interface LicenseInfo {
  activated: boolean
  machine_code: string
  start_time: string | null
  end_time: string | null
  remaining_days: number | null
  status: string
}

export async function getMachineCode() {
  return client.get('/license/machine-code')
}

export async function getLicenseInfo() {
  return client.get('/license/info-public')
}

export async function activateLicense(license_key: string) {
  return client.post('/license/activate', null, {
    params: { license_key }
  })
}

export async function deactivateLicense() {
  return client.post('/license/deactivate')
}

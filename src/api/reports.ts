import client from './client'

// ===== 报告中心 =====

export type ReportType =
  | 'classification_catalog'
  | 'change_log'
  | 'pia'
  | 'annual_security'
  | 'important_data'
  | 'audit_summary'
  | 'data_security_risk'

export type ReportFormat = 'pdf' | 'excel' | 'html'

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface ReportItem {
  id: number
  report_no: string
  title?: string
  task_name: string
  task_id: number
  report_type: ReportType
  file_format: ReportFormat
  status: ReportStatus
  file_size?: number
  file_path?: string
  description?: string
  generated_at?: string
  created_at: string
  updated_at?: string
  generated_by?: string
  error_message?: string
}

export interface ReportDetail extends ReportItem {
  summary?: Record<string, any>
  content?: string
}

export interface ReportTypeOption {
  value: string
  label: string
  description: string
  file_formats: string[]
}

export interface ReportStats {
  total: number
  completed: number
  generating: number
  failed: number
  pending: number
}

export interface GenerateReportDTO {
  report_type: ReportType
  file_format?: ReportFormat
  title?: string
  description?: string
  start_date?: string
  end_date?: string
  mask_file_content?: boolean  // 文件数据是否脱敏
}

export interface GenerateResult {
  id: number
  report_no: string
  status: ReportStatus
  message: string
}

export interface PreviewData {
  id: number
  report_no: string
  title?: string
  task_name?: string
  report_type: string
  html_content?: string | null
  summary?: Record<string, any>
  generated_at?: string
  status: ReportStatus
  message?: string
  error_message?: string
}

// ===== 内部统一响应处理 =====

async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  const res = await client.get(url, { params })
  // client 拦截器已返回 response.data（{code, data, message}）
  // 所以 res 已经是 {code, data, message} 对象
  if ((res as any).code !== 0) {
    throw new Error((res as any).message || '请求失败')
  }
  return (res as any).data as T
}

async function post<T>(url: string, data?: Record<string, any>): Promise<T> {
  const res = await client.post(url, data)
  if ((res as any).code !== 0) {
    throw new Error((res as any).message || '请求失败')
  }
  return (res as any).data as T
}

// ===== API 方法 =====

export async function getReports(params: Record<string, any> = {}) {
  return get<{ items: ReportItem[]; total: number }>('/reports', params)
}

export async function getReportDetail(id: number) {
  return get<ReportDetail>(`/reports/${id}`)
}

export async function getReportTypes() {
  return get<ReportTypeOption[]>('/reports/types')
}

export async function getReportStats() {
  return get<ReportStats>('/reports/stats')
}

export async function generateReport(data: GenerateReportDTO) {
  return post<GenerateResult>('/reports/generate', data)
}

export async function getReportStatus(id: number) {
  return get<{ id: number; status: string; error_message?: string; file_path?: string }>(`/reports/${id}/status`)
}

export async function previewReport(id: number) {
  return get<PreviewData>(`/reports/${id}/preview`)
}

export async function deleteReport(id: number) {
  const res = await client.delete(`/reports/${id}`)
  if ((res as any).code !== 0) {
    throw new Error((res as any).message || '删除失败')
  }
  return (res as any).data
}

/** 真实下载文件 */
export async function downloadReport(id: number): Promise<void> {
  const token = localStorage.getItem('access_token') || ''
  const response = await fetch(`/api/v1/reports/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`)
  }
  const contentDisposition = response.headers.get('content-disposition') || ''
  let fileName = `report_${id}.pdf`
  // 优先按 RFC 5987 解析 filename*=utf-8''%E7%80%9A...，
  // 直接用 filename[^;=]*= 会把 "utf-8''" 当成文件名的一部分（导致下载名多出 utf-8 前缀）
  const starMatch = contentDisposition.match(/filename\*\s*=\s*[^']*'[^']*'([^;\n]+)/i)
  if (starMatch) {
    try {
      fileName = decodeURIComponent(starMatch[1].trim())
    } catch {
      fileName = starMatch[1].trim()
    }
  } else {
    const match = contentDisposition.match(/filename\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;\n]*))/i)
    if (match) {
      const raw = (match[1] ?? match[2] ?? match[3] ?? '').trim()
      try {
        fileName = decodeURIComponent(raw)
      } catch {
        fileName = raw
      }
    }
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

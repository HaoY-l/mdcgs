import client from './client'

// ===== 报告中心 =====

export interface ReportItem {
  id: number
  report_no: string
  task_name: string
  task_id: number
  report_type: string
  generated_at: string
  file_size: string
  file_path: string
  description: string
  created_at: string
}

export interface ReportDetail {
  id: number
  report_no: string
  task_name: string
  task_id: number
  report_type: string
  generated_at: string
  file_size: string
  file_path: string
  file_format: string
  description: string
  created_at: string
  updated_at: string
}

export interface DownloadInfo {
  id: number
  report_no: string
  file_name: string
  file_size: string
  file_path: string
  download_url: string
  message: string
}

export interface PreviewData {
  id: number
  html_content: string
  report_no: string
  task_name: string
}

export async function getReports(params: Record<string, any> = {}) {
  return client.get('/reports', { params })
}

export async function getReportDetail(id: number) {
  return client.get(`/reports/${id}`)
}

export async function downloadReport(id: number) {
  return client.get(`/reports/${id}/download`)
}

export async function previewReport(id: number) {
  return client.get(`/reports/${id}/preview`)
}

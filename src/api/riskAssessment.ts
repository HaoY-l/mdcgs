import client from './client'

// ===== 数据安全风险评估（GB/T 45577-2025） =====

export interface RiskDimension {
  code: string
  name: string
  desc: string
}

export interface RiskCheckItem {
  k: string
  text: string
}

export interface RiskClauseSegment {
  intro: string
  items: RiskCheckItem[]
}

export interface RiskClause {
  code: string
  title: string
  depth: number
  intro: string
  segments: RiskClauseSegment[]
  item_count: number
}

export interface RiskType {
  no: number
  name: string
  desc: string
}

export interface RiskLevelOption {
  value: string
  label?: string
  desc: string
}

export interface RiskMatrix {
  [harm: string]: { [likelihood: string]: string }
}

export interface RiskFramework {
  standard_no: string
  standard_name: string
  dimensions: RiskDimension[]
  clauses: RiskClause[]
  risk_types: RiskType[]
  harm_levels: RiskLevelOption[]
  likelihood_levels: RiskLevelOption[]
  risk_matrix: RiskMatrix
  risk_levels: RiskLevelOption[]
  result_options: { value: string; label: string }[]
  clause_count: number
  item_count: number
}

export interface RiskPrefill {
  levels: { level_code: string; level_value: number; is_sensitive: number; is_restricted: number }[]
  assets: {
    total_assets: number
    total_databases: number
    total_tables: number
    total_columns: number
    classified_count: number
    sensitive_count: number
    classification_rate: number
  }
  catalog: {
    category_count: number
    data_type_count: number
    level_distribution: { level_code: string; count: number }[]
  }
  file_assets: {
    total_file_assets: number
    total_files: number
    total_blocks: number
    file_sensitive_count: number
    file_sensitive_files: number
  }
}

export interface RiskItem {
  clause_code: string
  clause_title?: string
  dimension_code?: string
  result?: string | null
  evidence?: string | null
  suggestion?: string | null
  risk_type_nos?: number[] | null
  risk_desc?: string | null
  source_desc?: string | null
  data_involved?: string | null
  activity_involved?: string | null
  harm_level?: string | null
  likelihood_level?: string | null
  risk_level?: string | null
  /** 取消判定标记：保存时后端直接删除该条款记录（整条作废，回到未判定） */
  cleared?: boolean
}

export interface RiskProgress {
  done: number
  total: number
  pct: number
  ok: number
  part: number
  no: number
  na: number
  none: number
}

export interface RiskAssessment {
  id: number
  assessment_no: string
  title?: string | null
  status: string
  org_name?: string | null
  credit_code?: string | null
  org_address?: string | null
  postal_code?: string | null
  org_type?: string | null
  industry?: string | null
  org_scale?: string | null
  data_security_officer?: string | null
  target_scope?: string | null
  target_desc?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  contact_title?: string | null
  contact_dept?: string | null
  assessor_org_name?: string | null
  assessor_org_address?: string | null
  assessor_postal_code?: string | null
  assessor_contact_name?: string | null
  assessor_contact_phone?: string | null
  team_leader?: string | null
  reviewer?: string | null
  assess_date?: string | null
  remark?: string | null
  business_info?: string | null
  system_info?: string | null
  data_asset_info?: string | null
  processing_info?: string | null
  measure_info?: string | null
  assessment_purpose?: string | null
  assessment_basis?: string | null
  summary?: string | null
  conclusion?: string | null
  residual_risk?: string | null
  report_id?: number | null
  progress?: RiskProgress | null
  report_status?: string | null
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  items?: RiskItem[]
}

async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  const res = await client.get(url, { params })
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

async function put<T>(url: string, data?: Record<string, any>): Promise<T> {
  const res = await client.put(url, data)
  if ((res as any).code !== 0) {
    throw new Error((res as any).message || '请求失败')
  }
  return (res as any).data as T
}

async function del<T>(url: string): Promise<T> {
  const res = await client.delete(url)
  if ((res as any).code !== 0) {
    throw new Error((res as any).message || '删除失败')
  }
  return (res as any).data as T
}

export async function getRiskFramework() {
  return get<RiskFramework>('/risk-assessments/framework')
}

export async function getRiskPrefill() {
  return get<RiskPrefill>('/risk-assessments/prefill')
}

export async function getRiskAssessments(params: Record<string, any> = {}) {
  return get<{ items: RiskAssessment[]; total: number }>('/risk-assessments', params)
}

export async function getRiskAssessment(id: number) {
  return get<RiskAssessment>(`/risk-assessments/${id}`)
}

export async function createRiskAssessment(data: Record<string, any>) {
  return post<RiskAssessment>('/risk-assessments', data)
}

export async function updateRiskAssessment(id: number, data: Record<string, any>) {
  return put<RiskAssessment>(`/risk-assessments/${id}`, data)
}

export async function deleteRiskAssessment(id: number) {
  return del<{ id: number }>(`/risk-assessments/${id}`)
}

export async function saveRiskItems(id: number, items: RiskItem[]) {
  return put<{ saved: number }>(`/risk-assessments/${id}/items`, { items })
}

export async function generateRiskReport(
  id: number,
  data: { file_format?: string; title?: string; description?: string } = {},
) {
  return post<{ id: number; report_no: string; assessment_id: number; status: string; message: string }>(
    `/risk-assessments/${id}/generate`,
    data,
  )
}

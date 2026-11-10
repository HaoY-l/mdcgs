import client from './client'
import { getSettings, updateSettings } from './system'

// ===== 开放接口文档（后端 /open/v1/docs 提供，前端仅做展示） =====

/** SDK 示例语言 */
export const SDK_LANGUAGES = [
  { value: 'curl', label: 'cURL' },
  { value: 'shell', label: 'Shell' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
] as const

export type SdkLang = (typeof SDK_LANGUAGES)[number]['value']

export interface OpenApiParam {
  name: string
  type: string
  required?: boolean
  default?: string
  example?: string
  desc?: string
  /** 字符串型参数的最大长度 */
  max_length?: number
  /** 数值型参数的下界 */
  ge?: number
  /** 数值型参数的上界 */
  le?: number
  /** 可选项来源：classification_templates 表示该参数按分类模版名称下拉选择 */
  options_source?: string
}

export interface OpenApiSnippets {
  curl: string
  shell: string
  python: string
  javascript: string
  go: string
}

export interface OpenApiEndpoint {
  id: string
  group: string
  name: string
  method: string
  path: string
  auth: boolean
  summary: string
  description: string
  query_params?: OpenApiParam[]
  path_params?: OpenApiParam[]
  /** 是否支持在文档面板中在线调试（需要上传文件的接口为 false） */
  debug_supported?: boolean
  response_fields?: OpenApiParam[]
  response_example?: any
  snippets: OpenApiSnippets
}

export interface OpenApiErrorCode {
  code: number
  http_status: number
  message: string
  desc: string
}

export interface OpenApiDocs {
  /** 主服务地址（示例代码中使用） */
  base_url: string
  /** 开放接口根地址 = base_url + /api/v1/open/v1 */
  api_base_url: string
  /** 直连后端地址（选填） */
  direct_url: string
  /** base_url 是否为自动识别（未配置） */
  auto_detected: boolean
  version: string
  auth_header: string
  /** 数据可见范围说明（全量返回，不做部门/租户隔离） */
  data_scope_note?: string
  /** 调用频率限制 */
  rate_limit?: {
    per_key_per_minute: number
    per_ip_per_minute: number
    window_seconds: number
  }
  endpoints: OpenApiEndpoint[]
  error_codes: OpenApiErrorCode[]
  quick_start: OpenApiSnippets
}

/** 开放接口服务地址配置 */
export interface OpenApiAddressConfig {
  base_url: string
  direct_url: string
}

// ===== 开放接口调试 =====

/** 调试请求参数 */
export interface OpenApiDebugRequest {
  /** 目标接口 ID（取自开放接口定义） */
  endpoint_id: string
  /** 用于调用的 API Key ID（后端按 ID 取真实密钥，前端不接触密钥明文） */
  api_key_id?: number | null
  /** 路径参数 */
  path_params?: Record<string, any>
  /** 查询参数 */
  query?: Record<string, any>
}

/** 调试结果 */
export interface OpenApiDebugResult {
  method: string
  url: string
  status_code: number
  elapsed_ms: number
  response: any
}

/** 调试开放接口（后端持密钥发起真实调用，响应中不含密钥） */
export async function debugOpenApiEndpoint(
  data: OpenApiDebugRequest
): Promise<OpenApiDebugResult> {
  const res = await client.post('/system/open-api/debug', data)
  return (res as any).data as OpenApiDebugResult
}

/** 获取开放接口文档（结构化） */
export async function getOpenApiDocs(): Promise<OpenApiDocs> {
  const res = await client.get('/open/v1/docs')
  if ((res as any).code !== 0) {
    throw new Error((res as any).message || '获取接口文档失败')
  }
  return (res as any).data as OpenApiDocs
}

/** 读取开放接口服务地址配置 */
export async function getOpenApiAddressConfig(): Promise<OpenApiAddressConfig> {
  const res = await getSettings({ category: 'open_api' })
  const cfg = (res as any).data?.open_api || {}
  return {
    base_url: cfg.base_url || '',
    direct_url: cfg.direct_url || '',
  }
}

/** 保存开放接口服务地址配置 */
export async function saveOpenApiAddressConfig(data: OpenApiAddressConfig): Promise<void> {
  await updateSettings({
    open_api: {
      base_url: (data.base_url || '').trim(),
      direct_url: (data.direct_url || '').trim(),
    },
  })
}

/** 下载开放接口文档（Markdown / PDF）
 *
 * 后端在 PDF 渲染依赖不可用时会降级返回 HTML，并通过 X-Doc-Format 头标明实际格式，
 * 返回值中的 degraded 为 true 表示发生了降级。
 */
export async function downloadOpenApiDoc(
  format: 'md' | 'pdf'
): Promise<{ degraded: boolean; actual: string }> {
  const token = localStorage.getItem('access_token') || ''
  const response = await fetch(`/api/v1/open/v1/docs/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`)
  }
  const actual = response.headers.get('x-doc-format') || format
  const contentDisposition = response.headers.get('content-disposition') || ''
  let fileName = format === 'pdf' ? 'MDCGS开放接口文档.pdf' : 'MDCGS开放接口文档.md'
  const starMatch = contentDisposition.match(/filename\*\s*=\s*[^']*'[^']*'([^;\n]+)/i)
  if (starMatch) {
    try {
      fileName = decodeURIComponent(starMatch[1].trim())
    } catch {
      fileName = starMatch[1].trim()
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
  return { degraded: actual !== format, actual }
}

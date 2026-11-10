<template>
  <div class="open-api-docs" v-loading="loading">
    <!-- ========== 地址栏 ========== -->
    <div class="addr-bar">
      <div class="addr-main">
        <div class="addr-item">
          <span class="addr-label">服务地址</span>
          <code class="addr-value">{{ docs?.base_url || '-' }}</code>
          <el-button link type="primary" size="small" @click="copyText(docs?.base_url || '', '服务地址')">
            复制
          </el-button>
          <el-tag v-if="docs?.auto_detected" size="small" type="info" effect="plain">自动识别</el-tag>
        </div>
        <div class="addr-item" v-if="docs?.direct_url">
          <span class="addr-label">直连后端</span>
          <code class="addr-value">{{ docs.direct_url }}</code>
          <el-button link type="primary" size="small" @click="copyText(docs.direct_url, '直连地址')">
            复制
          </el-button>
        </div>
      </div>
      <div class="addr-actions">
        <el-button size="small" :loading="loading" @click="loadDocs">
          <el-icon><Refresh /></el-icon>&nbsp;刷新
        </el-button>
        <el-button size="small" :loading="downloading === 'md'" @click="handleDownload('md')">
          <el-icon><Document /></el-icon>&nbsp;下载 Markdown
        </el-button>
        <el-button size="small" :loading="downloading === 'pdf'" @click="handleDownload('pdf')">
          <el-icon><Tickets /></el-icon>&nbsp;下载 PDF
        </el-button>
      </div>
    </div>

    <!-- ========== 加载失败 ========== -->
    <el-alert
      v-if="errorMsg"
      type="error"
      show-icon
      :closable="false"
      class="docs-alert"
      :title="errorMsg"
      description="如果刚刚重启过后端，请点击右上角「刷新」重新加载接口文档。"
    >
      <template #default>
        <el-button size="small" type="danger" plain :loading="loading" @click="loadDocs">重新加载</el-button>
      </template>
    </el-alert>

    <!-- ========== 数据可见范围与限流 ========== -->
    <el-alert
      v-if="docs?.data_scope_note"
      type="warning"
      show-icon
      :closable="false"
      class="docs-alert"
      title="数据可见范围"
      :description="docs?.data_scope_note || ''"
    >
      <template #default>
        <span v-if="docs?.rate_limit" class="rate-limit-hint">
          调用频率限制：单个 API Key 每分钟 {{ docs.rate_limit?.per_key_per_minute }} 次，单个客户端 IP 每分钟
          {{ docs.rate_limit?.per_ip_per_minute }} 次，超限返回 HTTP 429（错误码 2002）。
        </span>
      </template>
    </el-alert>

    <!-- ========== 快速开始 ========== -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-head">
          <span class="card-title">快速开始</span>
          <span class="card-sub">三步接入：选择密钥 → 复制示例 → 发起请求</span>
        </div>
      </template>

      <div class="qs-row">
        <span class="qs-k">认证方式</span>
        <code class="qs-code">{{ docs?.auth_header }}</code>
        <span class="qs-hint">也支持 <code>X-API-Key</code> 请求头；除健康检查外均需携带密钥</span>
      </div>
      <div class="qs-row">
        <span class="qs-k">API Key</span>
        <el-select
          v-model="apiKeyId"
          placeholder="选择密钥（示例代码中显示密钥名称，实际调用由后端取真实密钥）"
          class="qs-key-select"
          clearable
        >
          <el-option
            v-for="k in apiKeys"
            :key="k.id"
            :label="k.name"
            :value="k.id"
          >
            <span class="opt-name">{{ k.name }}</span>
            <span class="opt-preview">{{ k.key_preview }}</span>
          </el-option>
        </el-select>
        <span class="qs-hint">示例代码中显示的是密钥名称，不会暴露密钥明文；下方各接口的调试也使用该密钥</span>
      </div>

      <div class="snippet">
        <div class="snippet-head">
          <span class="snippet-label">调用示例 · {{ currentLangLabel }}</span>
          <el-button size="small" text type="primary" @click="copyText(quickSnippet, '代码示例')">复制代码</el-button>
        </div>
        <pre class="code-block"><code>{{ quickSnippet }}</code></pre>
      </div>

      <!-- 全局语言选择：放在快速开始的最后一行 -->
      <div class="qs-row lang-row">
        <span class="qs-k">SDK 语言</span>
        <el-select v-model="lang" size="default" class="lang-select">
          <el-option
            v-for="item in SDK_LANGUAGES"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <span class="qs-hint">切换后，下方所有接口的示例代码会同步转换</span>
      </div>
    </el-card>

    <!-- ========== 接口列表 ========== -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-head">
          <span class="card-title">接口列表</span>
          <span class="card-sub">
            共 {{ endpoints.length }} 个接口<template v-if="keyword">，匹配 {{ filteredEndpoints.length }} 个</template>
          </span>
        </div>
      </template>

      <el-input v-model="keyword" class="search-input" clearable placeholder="搜索接口：名称 / 路径 / 描述 / 参数名">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <div class="ep-list">
        <div
          v-for="ep in filteredEndpoints"
          :key="ep.id"
          class="ep-item"
          :class="{ expanded: expandedId === ep.id }"
        >
          <div class="ep-row" @click="toggleExpand(ep)">
            <span class="method-badge" :class="ep.method.toLowerCase()">{{ ep.method }}</span>
            <code class="ep-row-path">{{ ep.path }}</code>
            <span class="ep-row-name">{{ ep.name }}</span>
            <el-tag size="small" :type="ep.auth ? 'warning' : 'success'" effect="plain">
              {{ ep.auth ? '需认证' : '无需认证' }}
            </el-tag>
            <span class="ep-row-desc">{{ plainDesc(ep) }}</span>
            <el-icon class="ep-row-arrow">
              <ArrowRight v-if="expandedId === ep.id" />
              <ArrowDown v-else />
            </el-icon>
          </div>

          <!-- 展开区：请求参数 / 响应字段 / 响应示例 / SDK 示例 / 调试 五个 tab 横向排列 -->
          <div v-show="expandedId === ep.id" class="ep-expand">
            <div class="ep-expand-head">
              <span class="ep-expand-name">{{ ep.name }}</span>
            </div>
            <p class="ep-expand-desc">{{ ep.description }}</p>

            <el-tabs v-model="detailTab" class="ep-tabs">
              <el-tab-pane :label="paramTabLabel(ep)" name="params">
                <el-table v-if="paramRows(ep).length" :data="paramRows(ep)" size="small" border>
                  <el-table-column prop="name" label="参数" min-width="150">
                    <template #default="{ row }"><code>{{ row.name }}</code></template>
                  </el-table-column>
                  <el-table-column prop="type" label="类型" width="100" />
                  <el-table-column label="必填" width="70" align="center">
                    <template #default="{ row }">
                      <span :style="{ color: row.required ? '#f56c6c' : '#909399' }">{{ row.required ? '是' : '否' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="default" label="默认值" width="100" />
                  <el-table-column prop="example" label="示例" width="140" />
                  <el-table-column prop="desc" label="说明" min-width="220" />
                </el-table>
                <el-empty v-else description="该接口无需查询参数" :image-size="60" />
              </el-tab-pane>

              <el-tab-pane label="响应字段" name="response">
                <el-table v-if="ep.response_fields?.length" :data="ep.response_fields" size="small" border>
                  <el-table-column prop="name" label="字段" min-width="190">
                    <template #default="{ row }"><code>{{ row.name }}</code></template>
                  </el-table-column>
                  <el-table-column prop="type" label="类型" width="110" />
                  <el-table-column prop="desc" label="说明" min-width="260" />
                </el-table>
                <el-empty v-else description="暂无字段说明" :image-size="60" />
              </el-tab-pane>

              <el-tab-pane label="响应示例" name="example">
                <div class="snippet">
                  <div class="snippet-head">
                    <span class="snippet-label">JSON</span>
                    <el-button size="small" text type="primary" @click="copyText(exampleText(ep), '响应示例')">复制</el-button>
                  </div>
                  <pre class="code-block"><code>{{ exampleText(ep) }}</code></pre>
                </div>
              </el-tab-pane>

              <el-tab-pane label="SDK 示例" name="sdk">
                <div class="snippet">
                  <div class="snippet-head">
                    <span class="snippet-label">{{ currentLangLabel }}</span>
                    <el-button size="small" text type="primary" @click="copyText(snippetOf(ep), '代码示例')">复制代码</el-button>
                  </div>
                  <pre class="code-block"><code>{{ snippetOf(ep) }}</code></pre>
                </div>
              </el-tab-pane>

              <!-- 调试：后端持密钥发起真实调用，前端不接触密钥明文 -->
              <el-tab-pane label="调试" name="debug">
                <el-alert
                  v-if="ep.debug_supported === false"
                  type="warning"
                  :closable="false"
                  show-icon
                  title="该接口需要上传文件，无法在文档面板中在线调试"
                  description="请参考「SDK 示例」标签页中的调用示例，直接以 multipart/form-data 方式调用该接口。"
                />
                <template v-else>
                <div class="dbg-form">
                  <div class="dbg-row" v-if="ep.auth">
                    <span class="dbg-k">API Key</span>
                    <span class="dbg-key-name">
                      {{ selectedKeyName || '未选择（请在上方「快速开始」中选择密钥）' }}
                    </span>
                    <el-tag
                      v-if="selectedKey && !keyAllowed(selectedKey, ep)"
                      size="small"
                      type="danger"
                      effect="plain"
                    >
                      该密钥未被开放此接口
                    </el-tag>
                    <span class="dbg-hint">使用「快速开始」中选择的密钥，实际调用由后端取真实值</span>
                  </div>

                  <div class="dbg-row" v-for="p in ep.path_params || []" :key="'p_' + p.name">
                    <span class="dbg-k">{{ p.name }}</span>
                    <el-select
                      v-if="p.options_source === 'classification_templates'"
                      v-model="debugStates[ep.id].pathParams[p.name]"
                      placeholder="选择分类模版"
                      class="dbg-ctrl"
                      filterable
                    >
                      <el-option
                        v-for="t in templates"
                        :key="t.id"
                        :label="t.name"
                        :value="t.id"
                      />
                    </el-select>
                    <el-input-number
                      v-else-if="p.type === 'integer'"
                      v-model="debugStates[ep.id].pathParams[p.name]"
                      :min="1"
                      :controls="false"
                      class="dbg-ctrl"
                    />
                    <el-input
                      v-else
                      v-model="debugStates[ep.id].pathParams[p.name]"
                      :placeholder="p.example || p.desc"
                      class="dbg-ctrl"
                    />
                    <span class="dbg-hint">{{ p.desc }}</span>
                  </div>

                  <div class="dbg-row" v-for="p in ep.query_params || []" :key="'q_' + p.name">
                    <span class="dbg-k">{{ p.name }}</span>
                    <el-input-number
                      v-if="p.type === 'integer' && p.name !== 'is_sensitive'"
                      v-model="debugStates[ep.id].query[p.name]"
                      :min="1"
                      :controls="false"
                      class="dbg-ctrl"
                    />
                    <el-select
                      v-else-if="p.name === 'is_sensitive'"
                      v-model="debugStates[ep.id].query[p.name]"
                      placeholder="不限"
                      clearable
                      class="dbg-ctrl"
                    >
                      <el-option label="敏感字段（1）" :value="1" />
                      <el-option label="非敏感字段（0）" :value="0" />
                    </el-select>
                    <el-input
                      v-else
                      v-model="debugStates[ep.id].query[p.name]"
                      :placeholder="p.example || p.desc"
                      class="dbg-ctrl"
                    />
                    <span class="dbg-hint">{{ p.desc }}</span>
                  </div>

                  <div class="dbg-row">
                    <el-button type="primary" :loading="debugStates[ep.id].loading" @click="sendDebug(ep)">
                      发送请求
                    </el-button>
                    <el-button
                      :disabled="!debugStates[ep.id].result"
                      @click="copyText(debugResultText(ep), '响应内容')"
                    >
                      复制响应
                    </el-button>
                  </div>
                </div>

                <div class="dbg-result" v-if="debugStates[ep.id].result">
                  <div class="dbg-result-head">
                    <code class="dbg-req-line">{{ debugStates[ep.id].result.method }} {{ debugStates[ep.id].result.url }}</code>
                    <el-tag
                      size="small"
                      :type="debugStates[ep.id].result.status_code < 400 ? 'success' : 'danger'"
                      effect="dark"
                    >
                      {{ debugStates[ep.id].result.status_code }}
                    </el-tag>
                    <span class="dbg-elapsed">{{ debugStates[ep.id].result.elapsed_ms }} ms</span>
                  </div>
                  <pre class="code-block"><code>{{ debugResultText(ep) }}</code></pre>
                </div>
                </template>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
        <el-empty v-if="!filteredEndpoints.length" description="没有匹配的接口" :image-size="70" />
      </div>
    </el-card>

    <!-- ========== 错误码 ========== -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-head">
          <span class="card-title">错误码</span>
          <span class="card-sub">所有接口统一返回 <code>{ code, message, data }</code></span>
        </div>
      </template>
      <el-table :data="docs?.error_codes || []" size="small" border>
        <el-table-column prop="code" label="code" width="90" />
        <el-table-column prop="http_status" label="HTTP" width="90" />
        <el-table-column prop="message" label="message" min-width="200" />
        <el-table-column prop="desc" label="说明" min-width="280" />
      </el-table>
    </el-card>

    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Tickets, Refresh, Search, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import {
  getOpenApiDocs,
  downloadOpenApiDoc,
  debugOpenApiEndpoint,
  SDK_LANGUAGES,
  type OpenApiDocs,
  type OpenApiEndpoint,
  type OpenApiParam,
  type SdkLang,
} from '@/api/openApi'
import { getApiKeys } from '@/api/system'
import { getTemplates } from '@/api/classification'

/** 密钥列表项（与后端 /api-keys 返回结构一致） */
interface ApiKeyItem {
  id: number
  name: string
  key_preview: string
  is_active: boolean
  /** 该密钥被开放的接口 ID 列表；为空表示开放全部开放接口 */
  endpoints?: string[]
}

const props = defineProps<{
  /** 由父组件传入的密钥列表（父组件已在开放接口页加载） */
  apiKeys?: ApiKeyItem[]
}>()

const loading = ref(false)
const downloading = ref<'md' | 'pdf' | ''>('')
const errorMsg = ref('')
const docs = ref<OpenApiDocs | null>(null)
// 选中的密钥 ID（仅用于在示例代码中显示密钥名称）
const apiKeyId = ref<number | null>(null)
// 全局 SDK 语言（快速开始与所有接口同步）
const lang = ref<SdkLang>('curl')
const keyword = ref('')
const detailTab = ref('params')

/** 密钥列表：优先使用父组件传入的，未传入时自行加载 */
const localKeys = ref<ApiKeyItem[]>([])
const apiKeys = computed<ApiKeyItem[]>(() =>
  props.apiKeys && props.apiKeys.length ? props.apiKeys : localKeys.value
)

const endpoints = computed<OpenApiEndpoint[]>(() => docs.value?.endpoints || [])

const currentLangLabel = computed(
  () => SDK_LANGUAGES.find((l) => l.value === lang.value)?.label || 'cURL'
)

/** 当前选中的密钥（快速开始中选择的密钥，所有接口调试共用） */
const selectedKey = computed<ApiKeyItem | undefined>(() =>
  apiKeys.value.find((x) => x.id === apiKeyId.value)
)

/** 当前选中的密钥名称（代码中显示名称，不显示明文） */
const selectedKeyName = computed(() => selectedKey.value?.name || '')

/** 把示例文本中的密钥占位符替换为密钥名称 */
function resolve(text: string): string {
  if (!text) return ''
  return text.split('{{API_KEY}}').join(selectedKeyName.value || '{{API_KEY}}')
}

/** 搜索过滤：接口名称 / 路径 / 描述 / 分组 / 参数名 均参与模糊匹配 */
const filteredEndpoints = computed<OpenApiEndpoint[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return endpoints.value
  return endpoints.value.filter((ep) => {
    const haystack = [
      ep.name, ep.path, ep.description, ep.group, ep.summary,
      ...(ep.query_params || []).map((p) => p.name),
      ...(ep.path_params || []).map((p) => p.name),
      ...(ep.query_params || []).map((p) => p.desc || ''),
    ].join(' ').toLowerCase()
    return haystack.includes(kw)
  })
})

const quickSnippet = computed(() => {
  const qs = docs.value?.quick_start
  if (!qs) return ''
  return resolve((qs as any)[lang.value] || '')
})

/** 当前展开的接口 id（同一时刻只展开一个） */
const expandedId = ref('')

/** 取指定接口在当前语言下的示例代码 */
function snippetOf(ep: OpenApiEndpoint) {
  return resolve((ep.snippets as any)[lang.value] || '')
}

/** 去掉描述里的 markdown 标记，用于列表单行展示 */
function plainDesc(ep: OpenApiEndpoint) {
  return (ep.description || '').replace(/\*\*/g, '').replace(/\n/g, ' ')
}

function paramRows(ep: OpenApiEndpoint): OpenApiParam[] {
  return [...(ep.path_params || []), ...(ep.query_params || [])]
}

function paramTabLabel(ep: OpenApiEndpoint) {
  const n = paramRows(ep).length
  return n ? `请求参数 (${n})` : '请求参数'
}

function exampleText(ep: OpenApiEndpoint) {
  return JSON.stringify(ep.response_example, null, 2)
}

// ============================================================
// 调试
// ============================================================
interface DebugState {
  pathParams: Record<string, any>
  query: Record<string, any>
  loading: boolean
  result: any
}

/** 每个接口一份调试状态（key 为接口 ID） */
const debugStates = reactive<Record<string, DebugState>>({})

/** 初始化指定接口的调试状态（已存在则跳过） */
function initDebugState(ep: OpenApiEndpoint) {
  if (debugStates[ep.id]) return
  const pathParams: Record<string, any> = {}
  for (const p of ep.path_params || []) {
    pathParams[p.name] = p.example !== undefined && p.example !== '' ? p.example : ''
  }
  const query: Record<string, any> = {}
  for (const p of ep.query_params || []) {
    query[p.name] = ''
  }
  debugStates[ep.id] = {
    pathParams,
    query,
    loading: false,
    result: null,
  }
}

/** 取指定接口的调试状态 */
function debugState(ep: OpenApiEndpoint): DebugState {
  initDebugState(ep)
  return debugStates[ep.id]
}

/** 密钥是否被开放该接口（未配置授权时视为开放全部） */
function keyAllowed(key: ApiKeyItem, ep: OpenApiEndpoint): boolean {
  if (!ep.auth) return true
  const list = key.endpoints || []
  if (!list.length) return true
  return list.includes(ep.id)
}

function debugResultText(ep: OpenApiEndpoint): string {
  const r = debugState(ep).result
  if (!r) return ''
  return typeof r.response === 'string' ? r.response : JSON.stringify(r.response, null, 2)
}

/** 发起调试请求：后端按密钥 ID 取真实密钥调用真实路由 */
async function sendDebug(ep: OpenApiEndpoint) {
  const st = debugState(ep)
  if (ep.auth && !apiKeyId.value) {
    ElMessage.warning('该接口需要 API Key，请先在「快速开始」中选择密钥')
    return
  }
  const picked = selectedKey.value
  if (ep.auth && picked && !keyAllowed(picked, ep)) {
    ElMessage.warning('该密钥未被开放此接口，调用将被拒绝')
  }
  st.loading = true
  try {
    const payload: any = {
      endpoint_id: ep.id,
      api_key_id: apiKeyId.value,
      path_params: st.pathParams,
      query: st.query,
    }
    st.result = await debugOpenApiEndpoint(payload)
  } catch (e: any) {
    ElMessage.error(e?.message || '调试请求失败')
  } finally {
    st.loading = false
  }
}

/** 点击接口行：展开/收起（再次点击收起） */
function toggleExpand(ep: OpenApiEndpoint) {
  if (expandedId.value === ep.id) {
    expandedId.value = ''
    return
  }
  expandedId.value = ep.id
  detailTab.value = 'params'
}

async function copyText(text: string, label: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label} 已复制`)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      ElMessage.success(`${label} 已复制`)
    } catch {
      ElMessage.warning('复制失败，请手动选择文本复制')
    }
    document.body.removeChild(ta)
  }
}

async function handleDownload(format: 'md' | 'pdf') {
  downloading.value = format
  try {
    const { degraded, actual } = await downloadOpenApiDoc(format)
    if (degraded) {
      ElMessage.warning(`当前环境无法生成 PDF，已降级下载 ${actual.toUpperCase()} 格式文档`)
    } else {
      ElMessage.success('文档下载已开始')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '文档下载失败')
  } finally {
    downloading.value = ''
  }
}

async function loadDocs() {
  loading.value = true
  errorMsg.value = ''
  try {
    docs.value = await getOpenApiDocs()
    // 预初始化每个接口的调试表单（保证模板中 debugStates[ep.id] 始终可用）
    for (const ep of docs.value.endpoints || []) {
      initDebugState(ep)
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '接口文档加载失败'
    ElMessage.error(errorMsg.value)
  } finally {
    loading.value = false
  }
}

/** 父组件未传入密钥列表时自行加载 */
async function loadKeys() {
  if (props.apiKeys && props.apiKeys.length) return
  try {
    const res = await getApiKeys()
    localKeys.value = (res as any).data?.items || []
  } catch {
    localKeys.value = []
  }
}

/** 分类模版选项：路径参数声明 options_source=classification_templates 时按名称下拉选择 */
const templates = ref<{ id: number; name: string }[]>([])

/** 加载分类模版列表，并把下拉参数的默认值对齐到真实模版 */
async function loadTemplates() {
  try {
    const res: any = await getTemplates({ page: 1, page_size: 100 })
    const items = res?.data?.items || []
    templates.value = items.map((t: any) => ({ id: t.id, name: t.name }))
  } catch {
    templates.value = []
  }
  for (const ep of endpoints.value) {
    for (const p of ep.path_params || []) {
      if (p.options_source !== 'classification_templates') continue
      const st = debugState(ep)
      const current = Number(st.pathParams[p.name])
      if (!templates.value.some((t) => t.id === current)) {
        st.pathParams[p.name] = templates.value.length ? templates.value[0].id : ''
      }
    }
  }
}

onMounted(async () => {
  await loadKeys()
  await loadDocs()
  await loadTemplates()
})
</script>

<style scoped>
.open-api-docs {
  --doc-border: var(--el-border-color-lighter, #ebeef5);
  --doc-muted: var(--el-text-color-secondary, #909399);
}

/* ===== 地址栏 ===== */
.addr-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--color-surface-muted, #f5f7fa);
  border: 1px solid var(--doc-border);
  border-radius: 8px;
}
.addr-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.addr-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.addr-label {
  font-size: 12px;
  color: var(--doc-muted);
  flex: none;
}
.addr-value {
  font-family: monospace;
  font-size: 12px;
  color: var(--el-color-primary, #409eff);
  word-break: break-all;
}
.addr-actions {
  display: flex;
  gap: 8px;
  flex: none;
}

/* ===== 通用卡片 ===== */
.docs-alert {
  margin-bottom: 16px;
}
.rate-limit-hint {
  font-size: 12px;
  color: #909399;
}
.section-card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.card-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
}
.card-sub {
  font-size: 12px;
  color: var(--doc-muted);
}

/* ===== 快速开始 ===== */
.qs-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.qs-k {
  font-size: 13px;
  color: var(--doc-muted);
  width: 66px;
  flex: none;
}
.qs-code {
  font-family: monospace;
  font-size: 12px;
  background: var(--color-surface-muted, #f5f7fa);
  padding: 3px 8px;
  border-radius: 4px;
}
.qs-hint {
  font-size: 12px;
  color: var(--doc-muted);
}
.qs-key-select {
  width: 320px;
  max-width: 100%;
}
.lang-row {
  margin-bottom: 0;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--doc-border);
}
.lang-select {
  width: 150px;
}
.opt-name {
  margin-right: 10px;
}
.opt-preview {
  font-family: monospace;
  font-size: 11px;
  color: var(--doc-muted);
}

/* ===== 接口列表 ===== */
.search-input {
  max-width: 420px;
  margin-bottom: 12px;
}
.ep-list {
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  overflow: hidden;
}
.ep-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--doc-border);
  cursor: pointer;
  transition: background .18s;
}
.ep-row:last-child {
  border-bottom: none;
}
.ep-row:hover {
  background: var(--el-color-primary-light-9, #ecf5ff);
}
.ep-row-path {
  font-family: monospace;
  font-size: 12.5px;
  color: var(--el-text-color-primary, #303133);
  flex: none;
}
.ep-row-name {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  flex: none;
}
.ep-row-desc {
  font-size: 12px;
  color: var(--doc-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.ep-row-arrow {
  color: var(--el-text-color-placeholder, #c0c4cc);
  flex: none;
}

/* ===== 方法徽标 ===== */
.method-badge {
  display: inline-block;
  min-width: 42px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  color: #fff;
  background: #909399;
  flex: none;
}
.method-badge.get {
  background: #67c23a;
}
.method-badge.post {
  background: #409eff;
}

/* ===== 展开区 ===== */
.ep-item {
  border-bottom: 1px solid var(--doc-border);
}
.ep-item:last-child {
  border-bottom: none;
}
.ep-item.expanded > .ep-row {
  background: var(--el-color-primary-light-9, #ecf5ff);
}
.ep-expand {
  padding: 14px 16px 18px 16px;
  background: var(--color-surface-muted, #f5f7fa);
  border-top: 1px dashed var(--doc-border);
}
.ep-expand-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.ep-expand-name {
  font-size: 13px;
  font-weight: 600;
}
.ep-expand-desc {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--el-text-color-regular, #606266);
}
.ep-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

/* ===== 调试 ===== */
.dbg-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.dbg-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.dbg-k {
  font-size: 13px;
  color: var(--doc-muted);
  width: 96px;
  flex: none;
  font-family: monospace;
}
.dbg-ctrl {
  width: 220px;
  max-width: 100%;
}
.dbg-key-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}
.dbg-hint {
  font-size: 12px;
  color: var(--doc-muted);
}
.dbg-result {
  margin-top: 4px;
}
.dbg-result-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}
.dbg-req-line {
  font-family: monospace;
  font-size: 12px;
  color: var(--el-text-color-primary, #303133);
  word-break: break-all;
}
.dbg-elapsed {
  font-size: 12px;
  color: var(--doc-muted);
}

/* ===== 代码块 ===== */
.snippet {
  margin-top: 10px;
}
.snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.snippet-label {
  font-size: 12px;
  color: var(--doc-muted);
}
.code-block {
  margin: 0;
  padding: 12px 14px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
  font-family: "SFMono-Regular", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
  max-height: 460px;
  overflow: auto;
}
.code-block :deep(code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-family: inherit;
}
</style>

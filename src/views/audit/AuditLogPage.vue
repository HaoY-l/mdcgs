<template>
  <PageShell title="审计日志">
    <template #header-actions>
      <el-button size="small" @click="handleExport">导出日志</el-button>
      <el-button size="small" @click="showSettingsDialog = true">保留策略</el-button>
      <el-button size="small" @click="showRuleDialog = true">审计规则</el-button>
      <el-button size="small" type="warning" @click="showAlertDialog = true">
        告警
        <el-badge :value="alertStats.pending" :hidden="alertStats.pending === 0" />
      </el-button>
    </template>

    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <label>关键字</label>
          <el-input
            v-model="filters.keyword"
            placeholder="用户/模块/操作/IP"
            clearable
            @clear="fetchLogs"
            @keyup.enter="fetchLogs"
            size="default"
            style="width: 180px;"
          />
        </div>
        <div class="filter-item">
          <label>操作用户</label>
          <el-select
            v-model="filters.username"
            placeholder="全部"
            clearable
            @change="fetchLogs"
            size="default"
            style="width: 140px;"
          >
            <el-option v-for="u in userOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>操作模块</label>
          <el-select
            v-model="filters.module"
            placeholder="全部"
            clearable
            @change="fetchLogs"
            size="default"
            style="width: 140px;"
          >
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>操作类型</label>
          <el-select
            v-model="filters.action"
            placeholder="全部"
            clearable
            @change="fetchLogs"
            size="default"
            style="width: 130px;"
          >
            <el-option label="新增" value="新增" />
            <el-option label="修改" value="修改" />
            <el-option label="删除" value="删除" />
            <el-option label="查询" value="查询" />
            <el-option label="登录" value="登录成功" />
            <el-option label="登出" value="登出" />
            <el-option label="启用规则" value="启用规则" />
            <el-option label="停用规则" value="停用规则" />
            <el-option label="批量操作" value="批量" />
            <el-option label="测试连接" value="测试连接" />
            <el-option label="导出" value="导出" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <el-select
            v-model="filters.status"
            placeholder="全部"
            clearable
            @change="fetchLogs"
            size="default"
            style="width: 100px;"
          >
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>时间范围</label>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            @change="fetchLogs"
            size="default"
            style="width: 240px;"
          />
        </div>
        <div class="filter-actions">
          <el-button type="primary" @click="fetchLogs" size="default">搜索</el-button>
          <el-button @click="resetFilters" size="default">重置</el-button>
          <el-button @click="refreshStats" size="default">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计图表 -->
    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>操作模块分布</span>
          </template>
          <div ref="moduleChartRef" style="height: 250px;"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>操作IP分布 (Top 10)</span>
          </template>
          <div ref="ipChartRef" style="height: 250px;"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>趋势分析 (7天)</span>
          </template>
          <div ref="trendChartRef" style="height: 250px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 日志列表 -->
    <DataTable :data="logList" :loading="loading" :total="pagination.total" :current-page="pagination.page" :page-size="pagination.pageSize" stripe v-bind="$attrs" @page-change="onPageChange">
      <el-table-column prop="created_at" label="时间" min-width="170" />
      <el-table-column prop="username" label="用户" min-width="110" />
      <el-table-column prop="module" label="模块" min-width="120" />
      <el-table-column prop="action" label="操作类型" min-width="100" />
      <el-table-column prop="detail" label="操作详情" min-width="200" show-overflow-tooltip />
      <el-table-column prop="ip_address" label="IP地址" min-width="140" />
      <el-table-column label="状态" min-width="80" fixed="right">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="showLogDetail(row as AuditLogItem)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <!-- 导出对话框 -->
    <el-dialog v-model="exportVisible" title="导出日志" width="420px">
      <div style="text-align: center; padding: 20px 0;">
        <el-icon :size="48" color="#67C23A"><SuccessFilled /></el-icon>
        <p style="margin-top: 16px; color: #606266;">
          导出文件名: {{ exportInfo?.file_name || 'audit_logs.csv' }}
        </p>
        <p style="margin-top: 8px; font-size: 13px; color: #909399;">
          共 {{ exportInfo?.total_rows || 0 }} 条记录
        </p>
        <p style="margin-top: 8px; font-size: 13px; color: #E6A23C;">
          {{ exportInfo?.message || '模拟返回，实际部署时将下载CSV/Excel文件' }}
        </p>
      </div>
      <template #footer>
        <el-button @click="exportVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 日志详情对话框 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="600px">
      <el-descriptions :column="2" border v-if="currentLog">
        <el-descriptions-item label="ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ currentLog.username }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ currentLog.module }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ currentLog.action }}</el-descriptions-item>
        <el-descriptions-item label="资源类型">{{ currentLog.resource_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="资源ID">{{ currentLog.resource_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ip_address }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLog.status === 1 ? 'success' : 'danger'" size="small">
            {{ currentLog.status === 1 ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="耗时" v-if="currentLog.duration_ms">{{ currentLog.duration_ms }}ms</el-descriptions-item>
        <el-descriptions-item label="时间">{{ currentLog.created_at }}</el-descriptions-item>
        <el-descriptions-item label="操作详情" :span="2">{{ currentLog.detail }}</el-descriptions-item>
        <el-descriptions-item label="变更前值" :span="2" v-if="currentLog.before_value">
          <pre style="margin: 0; white-space: pre-wrap;">{{ formatJson(currentLog.before_value) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="变更后值" :span="2" v-if="currentLog.after_value">
          <pre style="margin: 0; white-space: pre-wrap;">{{ formatJson(currentLog.after_value) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="currentLog.error_message">
          <span style="color: #F56C6C;">{{ currentLog.error_message }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 保留策略对话框 -->
    <el-dialog v-model="showSettingsDialog" title="日志保留策略" width="500px">
      <el-form :model="retentionSettings" label-width="140px">
        <el-form-item label="日志保留天数">
          <el-input-number v-model="retentionSettings.log_retention_days as any" :min="1" :max="365" />
        </el-form-item>
        <el-form-item label="日志级别">
          <el-select v-model="retentionSettings.log_level" style="width: 100%;">
            <el-option label="Info" value="info" />
            <el-option label="Warning" value="warning" />
            <el-option label="Error" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用审计日志">
          <el-switch v-model="retentionSettings.enable_audit_log" />
        </el-form-item>
        <el-divider />
        <el-form-item label="预删除演练">
          <el-button size="small" @click="handleDryRunCleanup">预览待删除日志</el-button>
          <span v-if="cleanupPreview" style="margin-left: 12px; color: #909399;">
            将删除 {{ cleanupPreview.will_delete }} 条日志
          </span>
        </el-form-item>
        <el-form-item>
          <el-button type="danger" size="small" @click="handleCleanup">立即清理过期日志</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSettings">保存设置</el-button>
      </template>
    </el-dialog>

    <!-- 审计规则对话框 -->
    <el-dialog v-model="showRuleDialog" title="审计规则管理" width="800px">
      <div style="margin-bottom: 16px;">
        <el-button type="primary" size="small" @click="showRuleForm = true">新建规则</el-button>
      </div>

      <!-- 规则表单 -->
      <el-card v-if="showRuleForm" shadow="hover" style="margin-bottom: 16px;">
        <template #header>新建审计规则</template>
        <el-form :model="ruleForm" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="规则名称" required>
                <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="告警级别">
                <el-select v-model="ruleForm.alert_level" style="width: 100%;">
                  <el-option label="信息" value="info" />
                  <el-option label="警告" value="warning" />
                  <el-option label="严重" value="critical" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="适用模块">
                <el-select v-model="ruleForm.module" placeholder="全部模块" clearable style="width: 100%;">
                  <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用操作">
                <el-select v-model="ruleForm.action" placeholder="全部操作" clearable style="width: 100%;">
                  <el-option label="新增" value="新增" />
                  <el-option label="修改" value="修改" />
                  <el-option label="删除" value="删除" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="规则描述">
            <el-input v-model="ruleForm.description" type="textarea" rows="2" />
          </el-form-item>
          <el-form-item label="触发条件">
            <el-input v-model="ruleForm.conditionText as any" type="textarea" rows="2" placeholder='如: {"status": "failed"}' />
          </el-form-item>
          <el-form-item label="告警渠道">
            <el-checkbox-group v-model="ruleForm.alert_channels as any">
              <el-checkbox label="email">邮件</el-checkbox>
              <el-checkbox label="webhook">Webhook</el-checkbox>
              <el-checkbox label="sms">短信</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="handleCreateRule">创建</el-button>
            <el-button size="small" @click="showRuleForm = false">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 规则列表 -->
      <el-table :data="ruleList" stripe>
        <el-table-column prop="name" label="规则名称" min-width="120" />
        <el-table-column prop="module" label="模块" min-width="100" />
        <el-table-column prop="action" label="操作" min-width="80" />
        <el-table-column prop="alert_level" label="告警级别" width="100">
          <template #default="{ row }">
            <el-tag :type="row.alert_level === 'critical' ? 'danger' : row.alert_level === 'warning' ? 'warning' : 'info'" size="small">
              {{ row.alert_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleToggleRule(row as AuditRule)">
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDeleteRule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="showRuleDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 告警对话框 -->
    <el-dialog v-model="showAlertDialog" title="审计告警" width="900px">
      <el-row :gutter="16" style="margin-bottom: 16px;">
        <el-col :span="6">
          <el-statistic title="待处理" :value="alertStats.pending">
            <template #prefix><el-icon color="#E6A23C"><WarningFilled /></el-icon></template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="已发送" :value="alertStats.sent" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已确认" :value="alertStats.acknowledged" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="总计" :value="alertStats.total" />
        </el-col>
      </el-row>

      <el-form :inline="true" style="margin-bottom: 16px;">
        <el-form-item label="状态">
          <el-select v-model="alertFilters.status" placeholder="全部" clearable @change="fetchAlerts" style="width: 120px;">
            <el-option label="待处理" value="pending" />
            <el-option label="已发送" value="sent" />
            <el-option label="已确认" value="ack" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="alertFilters.alert_level" placeholder="全部" clearable @change="fetchAlerts" style="width: 120px;">
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="严重" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="fetchAlerts">刷新</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="alertList" stripe>
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column prop="rule_name" label="规则" min-width="120" />
        <el-table-column prop="alert_level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="row.alert_level === 'critical' ? 'danger' : row.alert_level === 'warning' ? 'warning' : 'info'" size="small">
              {{ row.alert_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="消息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="resource_type" label="资源类型" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ack' ? 'success' : row.status === 'sent' ? 'primary' : 'warning'" size="small">
              {{ row.status === 'ack' ? '已确认' : row.status === 'sent' ? '已发送' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" size="small" v-if="row.status !== 'ack'" @click="handleAckAlert(row)">
              确认
            </el-button>
            <el-button link type="primary" size="small" v-if="row.status === 'pending'" @click="handleResendAlert(row)">
              重发
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="showAlertDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { SuccessFilled, WarningFilled } from '@element-plus/icons-vue'
import {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogTrend,
  exportAuditLogs,
  updateAuditLogSettings,
  getRetentionSettings,
  cleanupOldLogs,
  getAuditRules,
  createAuditRule,
  deleteAuditRule,
  toggleAuditRule,
  getAuditAlerts,
  acknowledgeAlert,
  resendAlert,
  getAlertStats,
} from '@/api/audit'
import type {
  AuditLogItem,
  AuditLogStats,
  AuditLogExport,
  AuditTrendData,
  AuditRule,
  AuditAlert,
  AlertStats,
  RetentionSettings,
} from '@/api/audit'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const logList = ref<AuditLogItem[]>([])
const moduleChartRef = ref<HTMLDivElement | null>(null)
const ipChartRef = ref<HTMLDivElement | null>(null)
const trendChartRef = ref<HTMLDivElement | null>(null)
const exportVisible = ref(false)
const exportInfo = ref<AuditLogExport | null>(null)
const detailVisible = ref(false)
const currentLog = ref<AuditLogItem | null>(null)
const showSettingsDialog = ref(false)
const showRuleDialog = ref(false)
const showAlertDialog = ref(false)
const showRuleForm = ref(false)

const userOptions = ref<string[]>([])
const moduleOptions = ref<string[]>([])
const ruleList = ref<AuditRule[]>([])
const alertList = ref<AuditAlert[]>([])
const alertStats = reactive<AlertStats>({ total: 0, pending: 0, sent: 0, acknowledged: 0, level_distribution: [] })
const cleanupPreview = ref<{ will_delete: number } | null>(null)

const filters = reactive({
  keyword: '',
  username: '',
  module: '',
  action: '',
  status: null as number | null,
})

const alertFilters = reactive({
  status: '',
  alert_level: '',
})

const retentionSettings = reactive<RetentionSettings>({
  log_retention_days: '90',
  log_level: 'info',
  enable_audit_log: 'true',
  archive_enabled: 'false',
  archive_before_delete: 'true',
})

const ruleForm = reactive({
  name: '',
  description: '',
  module: '',
  action: '',
  alert_level: 'warning',
  alert_channels: [] as string[],
  conditionText: '',
})

const dateRange = ref<[string, string] | null>(null)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

onMounted(() => {
  fetchLogs()
  fetchStats()
  fetchTrend()
  fetchRetentionSettings()
  fetchAlertStats()
})

function onPageChange({ page, pageSize: ps }: { page: number; pageSize: number }) {
  pagination.page = page
  pagination.pageSize = ps
  fetchLogs()
}

async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.pageSize,
      sort_by: 'created_at',
      order: 'desc',
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.username) params.username = filters.username
    if (filters.module) params.module = filters.module
    if (filters.action) params.action = filters.action
    if (filters.status !== null) params.status = filters.status
    if (dateRange.value) {
      params.date_from = dateRange.value[0]
      params.date_to = dateRange.value[1]
    }

    const res = await getAuditLogs(params)
    if (res.code === 0) {
      logList.value = res.data?.items || []
      pagination.total = res.data?.total || 0

      // 提取用户和模块选项用于筛选
      const users = new Set<string>()
      const modules = new Set<string>()
      logList.value.forEach((log: AuditLogItem) => {
        if (log.username) users.add(log.username)
        if (log.module) modules.add(log.module)
      })
      userOptions.value = Array.from(users)
      moduleOptions.value = Array.from(modules)
    } else {
      ElMessage.error(res.message || '获取日志列表失败')
    }
  } catch (err) {
    ElMessage.error('获取日志列表失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.username = ''
  filters.module = ''
  filters.action = ''
  filters.status = null
  dateRange.value = null
  pagination.page = 1
  fetchLogs()
}

function showLogDetail(log: AuditLogItem) {
  currentLog.value = log
  detailVisible.value = true
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

// 统计图表
let moduleChartInstance: echarts.ECharts | null = null
let ipChartInstance: echarts.ECharts | null = null
let trendChartInstance: echarts.ECharts | null = null

async function fetchStats() {
  try {
    const params: Record<string, any> = {}
    if (dateRange.value) {
      params.date_from = dateRange.value[0]
      params.date_to = dateRange.value[1]
    }
    const res = await getAuditLogStats(params)
    if (res.code === 0) {
      const stats: AuditLogStats = res.data
      await nextTick()
      renderModuleChart(stats.module_distribution || [])
      renderIpChart(stats.ip_distribution || [])
    }
  } catch (err) {
    console.error('获取统计失败', err)
  }
}

async function fetchTrend() {
  try {
    const res = await getAuditLogTrend({ days: 7 })
    if (res.code === 0) {
      const trend: AuditTrendData = res.data
      await nextTick()
      renderTrendChart(trend.daily_trend || [])
    }
  } catch (err) {
    console.error('获取趋势失败', err)
  }
}

function refreshStats() {
  fetchStats()
  fetchTrend()
  ElMessage.success('统计已刷新')
}

function renderModuleChart(data: { name: string; value: number }[]) {
  if (!moduleChartRef.value) return
  if (!moduleChartInstance) {
    moduleChartInstance = echarts.init(moduleChartRef.value)
  }
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center' },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }],
    }],
  }
  moduleChartInstance.setOption(option)
  moduleChartInstance.resize()
}

function renderIpChart(data: { name: string; value: number }[]) {
  if (!ipChartRef.value) return
  if (!ipChartInstance) {
    ipChartInstance = echarts.init(ipChartRef.value)
  }
  const names = data.map((d) => d.name)
  const values = data.map((d) => d.value)
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: '操作次数' },
    yAxis: { type: 'category', data: names.length > 0 ? names : ['暂无数据'], axisLabel: { rotate: 0 } },
    series: [{
      type: 'bar',
      data: values.length > 0 ? values : [0],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#409EFF' },
          { offset: 1, color: '#79bbff' },
        ]),
        borderRadius: [0, 4, 4, 0],
      },
      barMaxWidth: 30,
    }],
  }
  ipChartInstance.setOption(option)
  ipChartInstance.resize()
}

function renderTrendChart(data: { date: string; count: number }[]) {
  if (!trendChartRef.value) return
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value)
  }
  const dates = data.map((d) => d.date)
  const counts = data.map((d) => d.count)
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 0 } },
    yAxis: { type: 'value', name: '操作次数' },
    series: [{
      type: 'line',
      data: counts,
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
        ]),
      },
      lineStyle: { color: '#409EFF', width: 2 },
      itemStyle: { color: '#409EFF' },
    }],
  }
  trendChartInstance.setOption(option)
  trendChartInstance.resize()
}

// 窗口变化时重绘
watch([moduleChartRef, ipChartRef, trendChartRef], () => {
  window.addEventListener('resize', () => {
    moduleChartInstance?.resize()
    ipChartInstance?.resize()
    trendChartInstance?.resize()
  })
})

// 导出
async function handleExport() {
  try {
    const params: Record<string, any> = {}
    if (dateRange.value) {
      params.date_from = dateRange.value[0]
      params.date_to = dateRange.value[1]
    }
    if (filters.module) params.module = filters.module
    const res = await exportAuditLogs(params)
    if (res.code === 0) {
      exportInfo.value = res.data
      exportVisible.value = true
    } else {
      ElMessage.error(res.message || '导出失败')
    }
  } catch (err) {
    ElMessage.error('导出日志失败')
  }
}

// 保留设置
async function fetchRetentionSettings() {
  try {
    const res = await getRetentionSettings()
    if (res.code === 0) {
      Object.assign(retentionSettings, res.data)
    }
  } catch (err) {
    console.error('获取保留设置失败', err)
  }
}

async function handleSaveSettings() {
  try {
    const res = await updateAuditLogSettings({
      log_retention_days: parseInt(retentionSettings.log_retention_days),
      log_level: retentionSettings.log_level,
      enable_audit_log: retentionSettings.enable_audit_log === 'true',
    })
    if (res.code === 0) {
      ElMessage.success('设置已保存')
      showSettingsDialog.value = false
    }
  } catch (err) {
    ElMessage.error('保存设置失败')
  }
}

async function handleDryRunCleanup() {
  try {
    const res = await cleanupOldLogs(true)
    if (res.code === 0) {
      cleanupPreview.value = res.data
    }
  } catch (err) {
    ElMessage.error('预览失败')
  }
}

async function handleCleanup() {
  try {
    await ElMessageBox.confirm('确定要清理过期日志吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await cleanupOldLogs(false)
    if (res.code === 0) {
      ElMessage.success(`已删除 ${res.data.deleted} 条过期日志`)
      cleanupPreview.value = null
      fetchLogs()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('清理失败')
    }
  }
}

// 审计规则
async function fetchRules() {
  try {
    const res = await getAuditRules()
    if (res.code === 0) {
      ruleList.value = res.data?.items || []
    }
  } catch (err) {
    console.error('获取规则失败', err)
  }
}

async function handleCreateRule() {
  try {
    let condition = {}
    if (ruleForm.conditionText) {
      try {
        condition = JSON.parse(ruleForm.conditionText)
      } catch {
        ElMessage.error('触发条件格式错误，请输入有效的JSON')
        return
      }
    }
    const res = await createAuditRule({
      name: ruleForm.name,
      description: ruleForm.description,
      module: ruleForm.module || null,
      action: ruleForm.action || null,
      alert_level: ruleForm.alert_level,
      alert_channels: ruleForm.alert_channels,
      condition,
    })
    if (res.code === 0) {
      ElMessage.success('规则创建成功')
      showRuleForm.value = false
      Object.assign(ruleForm, { name: '', description: '', module: '', action: '', alert_level: 'warning', alert_channels: [], conditionText: '' })
      fetchRules()
    }
  } catch (err) {
    ElMessage.error('创建规则失败')
  }
}

async function handleToggleRule(rule: AuditRule) {
  try {
    const res = await toggleAuditRule(rule.id)
    if (res.code === 0) {
      ElMessage.success(`规则已${res.data.enabled ? '启用' : '禁用'}`)
      fetchRules()
    }
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

async function handleDeleteRule(rule: AuditRule) {
  try {
    await ElMessageBox.confirm(`确定要删除规则"${rule.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await deleteAuditRule(rule.id)
    if (res.code === 0) {
      ElMessage.success('规则已删除')
      fetchRules()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 告警
async function fetchAlertStats() {
  try {
    const res = await getAlertStats()
    if (res.code === 0) {
      Object.assign(alertStats, res.data)
    }
  } catch (err) {
    console.error('获取告警统计失败', err)
  }
}

async function fetchAlerts() {
  try {
    const params: Record<string, any> = {}
    if (alertFilters.status) params.status = alertFilters.status
    if (alertFilters.alert_level) params.alert_level = alertFilters.alert_level
    const res = await getAuditAlerts(params)
    if (res.code === 0) {
      alertList.value = res.data?.items || []
    }
  } catch (err) {
    console.error('获取告警列表失败', err)
  }
}

async function handleAckAlert(alert: AuditAlert) {
  try {
    const res = await acknowledgeAlert(alert.id)
    if (res.code === 0) {
      ElMessage.success('告警已确认')
      fetchAlerts()
      fetchAlertStats()
    }
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

async function handleResendAlert(alert: AuditAlert) {
  try {
    const res = await resendAlert(alert.id)
    if (res.code === 0) {
      ElMessage.success('告警已重新发送')
      fetchAlerts()
    }
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

// 监听对话框打开
watch(showRuleDialog, (val) => {
  if (val) fetchRules()
})

watch(showAlertDialog, (val) => {
  if (val) {
    fetchAlerts()
    fetchAlertStats()
  }
})
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  min-width: 56px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
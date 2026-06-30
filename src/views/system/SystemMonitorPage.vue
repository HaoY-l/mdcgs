<template>
  <PageShell title="性能监控">
    <template #header-actions>
      <el-button size="small" @click="refreshAll">刷新</el-button>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="服务状态" name="status">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover">
              <template #header><span>CPU使用率</span></template>
              <div ref="cpuChartRef" style="height: 220px;"></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <template #header><span>内存使用率</span></template>
              <div ref="memChartRef" style="height: 220px;"></div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <template #header><span>磁盘使用率</span></template>
              <div ref="diskChartRef" style="height: 220px;"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="hover" style="margin-top: 20px">
          <template #header><span>系统负载</span></template>
          <div class="load-avg">
            <div class="load-item">
              <div class="load-label">1分钟</div>
              <div class="load-value">{{ loadAvg[0] }}</div>
            </div>
            <div class="load-item">
              <div class="load-label">5分钟</div>
              <div class="load-value">{{ loadAvg[1] }}</div>
            </div>
            <div class="load-item">
              <div class="load-label">15分钟</div>
              <div class="load-value">{{ loadAvg[2] }}</div>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" style="margin-top: 20px">
          <template #header><span>服务运行状态</span></template>
          <el-table :data="serviceList" stripe>
            <el-table-column prop="name" label="服务名称" />
            <el-table-column prop="status" label="状态">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'running' ? 'success' : 'danger'" size="small">
                  {{ scope.row.status === 'running' ? '运行中' : '异常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="uptime" label="运行信息" />
          </el-table>
        </el-card>

        <el-card shadow="hover" style="margin-top: 20px">
          <template #header>
            <div class="flex-between">
              <span>性能趋势</span>
              <el-radio-group v-model="trendPeriod" size="small" @change="fetchTrend">
                <el-radio-button label="1h">1小时</el-radio-button>
                <el-radio-button label="24h">24小时</el-radio-button>
                <el-radio-button label="7d">7天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" style="height: 300px;"></div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="数据备份" name="backup">
        <el-card shadow="hover">
          <template #header>
            <div class="flex-between">
              <span>备份历史</span>
              <div class="flex-center">
                <el-popover placement="bottom" :width="400" trigger="hover">
                  <template #reference>
                    <el-button size="small" text type="info" style="margin-right: 8px">备份说明</el-button>
                  </template>
                  <div style="line-height: 1.8; font-size: 13px;">
                    <p style="margin: 0 0 8px; font-weight: 600;">备份包含以下数据：</p>
                    <ul style="margin: 0; padding-left: 18px;">
                      <li><b>数据库表结构</b> — 所有表的 CREATE TABLE SQL（不含表数据）</li>
                      <li><b>系统设置</b> — SysSettings 表中的配置（LDAP、密码策略、会话超时等）</li>
                      <li><b>审计规则</b> — SysAuditRule 表中的审计规则配置</li>
                    </ul>
                    <el-divider style="margin: 10px 0;" />
                    <p style="margin: 0 0 6px; color: #E6A23C; font-size: 12px;">⚠️ 不包含以下业务数据：</p>
                    <ul style="margin: 0; padding-left: 18px; color: #909399; font-size: 12px;">
                      <li>用户账号、角色权限</li>
                      <li>资产连接信息、数据库 schema</li>
                      <li>分类分级任务结果、扫描发现记录</li>
                      <li>确认的脱敏/加密字段记录</li>
                    </ul>
                    <p style="margin: 8px 0 0; color: #67C23A; font-size: 12px;">💡 建议定期做 MySQL 全量备份以保护业务数据</p>
                  </div>
                </el-popover>
                <el-button type="primary" size="small" @click="handleCreateBackup" :loading="backupLoading">创建备份</el-button>
              </div>
            </div>
          </template>
          <el-table :data="backups" stripe v-loading="backupLoading">
            <el-table-column prop="name" label="备份名称" min-width="200" />
            <el-table-column prop="size" label="大小" width="100" />
            <el-table-column prop="created_at" label="创建时间" width="170" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="row">
                <el-button link type="primary" size="small" @click="handleDownloadBackup(row.row as BackupItem)">下载</el-button>
                <el-button link type="warning" size="small" @click="handleRestoreBackup(row.row as BackupItem)">恢复</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteBackup(row.row as BackupItem)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="系统日志" name="logs">
        <el-card shadow="hover">
          <template #header>
            <div class="flex-between">
              <span>日志文件</span>
              <div class="flex-center">
                <el-select v-model="logFilter.level" placeholder="级别" clearable size="small" style="width: 100px; margin-right: 8px;">
                  <el-option label="INFO" value="INFO" />
                  <el-option label="WARNING" value="WARNING" />
                  <el-option label="ERROR" value="ERROR" />
                </el-select>
                <el-input v-model="logFilter.keyword" placeholder="关键字" clearable size="small" style="width: 120px; margin-right: 8px;" />
                <el-button size="small" @click="fetchLogs">搜索</el-button>
              </div>
            </div>
          </template>
          <el-table :data="systemLogs" stripe v-loading="logLoading">
            <el-table-column prop="name" label="日志文件" min-width="200" />
            <el-table-column prop="size" label="大小" width="100" />
            <el-table-column prop="updated_at" label="更新时间" width="170" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="row">
                <el-button link type="primary" size="small" @click="handleViewLog(row.row as SystemLogItem)">查看</el-button>
                <el-button link type="primary" size="small" @click="handleDownloadLog(row.row as SystemLogItem)">下载</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteLog(row.row as SystemLogItem)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="logViewerVisible" title="日志查看" width="900px" :fullscreen="true">
      <div class="log-viewer">
        <div class="log-toolbar">
          <span>{{ currentLogName }}</span>
          <el-button size="small" @click="downloadCurrentLog">下载</el-button>
        </div>
        <el-input v-model="logSearch" placeholder="搜索日志内容" clearable size="small" style="margin: 8px 0;" />
        <div class="log-content">
          <pre><code>{{ filteredLogContent }}</code></pre>
        </div>
      </div>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMonitorStatus,
  getPerformanceData,
  getBackups,
  createBackup,
  deleteBackup,
  restoreBackup,
  downloadBackup,
  getSystemLogs,
  getLogContent,
  downloadSystemLog,
  deleteSystemLog,
  type MonitorStatus,
  type PerformanceData,
  type BackupItem,
  type SystemLogItem,
} from '@/api/system'

const activeTab = ref('status')
const backupLoading = ref(false)
const logLoading = ref(false)
const backups = ref<BackupItem[]>([])
const systemLogs = ref<SystemLogItem[]>([])
const serviceList = ref<{ name: string; status: string; uptime: string }[]>([])
const logViewerVisible = ref(false)
const currentLogName = ref('')
const currentLogContent = ref<string[]>([])
const logSearch = ref('')

const trendPeriod = ref('1h')
const trendChartRef = ref<HTMLDivElement | null>(null)
let trendChart: echarts.ECharts | null = null

const cpuChartRef = ref<HTMLDivElement | null>(null)
const memChartRef = ref<HTMLDivElement | null>(null)
const diskChartRef = ref<HTMLDivElement | null>(null)
let cpuChart: echarts.ECharts | null = null
let memChart: echarts.ECharts | null = null
let diskChart: echarts.ECharts | null = null

const loadAvg = reactive(['0', '0', '0'])
const logFilter = reactive({ level: '', keyword: '' })
let refreshTimer: number | null = null

const filteredLogContent = computed(() => {
  const content = currentLogContent.value.join('\n')
  if (!logSearch.value) return content
  const keyword = logSearch.value.toLowerCase()
  return content.split('\n').filter(line => line.toLowerCase().includes(keyword)).join('\n')
})

// Tab 切换时加载对应数据
watch(activeTab, (tab) => {
  if (tab === 'status') {
    fetchStatus()
    fetchTrend()
  } else if (tab === 'backup') {
    fetchBackups()
  } else if (tab === 'logs') {
    fetchLogs()
  }
})

function getColor(value: number, thresholds: number[]): string {
  if (value > thresholds[1]) return '#F56C6C'
  if (value > thresholds[0]) return '#E6A23C'
  return '#67C23A'
}

function initCharts() {
  const opts = {
    series: [{
      type: 'gauge' as const,
      startAngle: 200,
      endAngle: -20,
      radius: '95%',
      min: 0,
      max: 100,
      pointer: { show: false },
      progress: { show: true, width: 18 },
      axisLine: { lineStyle: { width: 18 } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { fontSize: 32, fontWeight: 'bold', formatter: '{value}%', offsetCenter: [0, '30%'] },
      data: [{ value: 0 }],
      title: { show: false },
    }]
  }

  if (cpuChartRef.value) {
    cpuChart = echarts.init(cpuChartRef.value)
    cpuChart.setOption(opts)
  }
  if (memChartRef.value) {
    memChart = echarts.init(memChartRef.value)
    memChart.setOption(opts)
  }
  if (diskChartRef.value) {
    diskChart = echarts.init(diskChartRef.value)
    diskChart.setOption(opts)
  }
}

function updateCharts(data: MonitorStatus) {
  const cpuVal = Math.round((data.cpu_usage || 0) * 10) / 10
  const memVal = Math.round((data.memory_usage || 0) * 10) / 10
  const diskVal = Math.round((data.disk_usage || 0) * 10) / 10

  const cpuColor = cpuVal > 80 ? '#F56C6C' : cpuVal > 60 ? '#E6A23C' : '#67C23A'
  const memColor = memVal > 80 ? '#F56C6C' : memVal > 60 ? '#E6A23C' : '#67C23A'
  const diskColor = diskVal > 90 ? '#F56C6C' : diskVal > 80 ? '#E6A23C' : '#67C23A'

  if (cpuChart) {
    cpuChart.setOption({ series: [{ data: [{ value: cpuVal }] }] })
  }
  if (memChart) {
    memChart.setOption({ series: [{ data: [{ value: memVal }] }] })
  }
  if (diskChart) {
    diskChart.setOption({ series: [{ data: [{ value: diskVal }] }] })
  }

  loadAvg[0] = (data.load_avg_1m || 0).toFixed(2)
  loadAvg[1] = (data.load_avg_5m || 0).toFixed(2)
  loadAvg[2] = (data.load_avg_15m || 0).toFixed(2)
}

async function fetchStatus() {
  try {
    const res = await getMonitorStatus() as any
    if (res.code === 0) {
      updateCharts(res.data)
      serviceList.value = res.data.services || []
    }
  } catch (err) {
    console.error('获取状态失败', err)
  }
}

async function fetchTrend() {
  try {
    const res = await getPerformanceData({ period: trendPeriod.value }) as any
    if (res.code === 0) {
      await nextTick()
      renderTrendChart(res.data)
    }
  } catch (err) {
    console.error('获取趋势失败', err)
  }
}

function renderTrendChart(data: PerformanceData) {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  // 格式化时间戳：根据时间段显示不同精度
  const formatTime = (ts: string) => {
    if (!ts) return ''
    const d = new Date(ts)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  const formatDate = (ts: string) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const labels = data.timestamps?.map((ts: string) => {
    if (trendPeriod.value === '1h') return formatTime(ts)
    return formatDate(ts)
  }) || []

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', formatter: (params: any) => {
      const time = params[0]?.axisValue || ''
      return params.map((p: any) => `${p.marker} ${p.seriesName}: <b>${p.value}%</b>`).join('<br/>') + `<br/><span style="color:#999;font-size:11px">${time}</span>`
    }},
    legend: { data: ['CPU', '内存', '磁盘'], top: 10 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { rotate: trendPeriod.value === '1h' ? 0 : 30, fontSize: 10 },
      boundaryGap: false,
    },
    yAxis: { type: 'value', min: 0, max: 100, name: '使用率(%)' },
    series: [
      { name: 'CPU', type: 'line', data: data.cpu_history || [], smooth: true, lineStyle: { width: 2 }, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#409EFF' } },
      { name: '内存', type: 'line', data: data.memory_history || [], smooth: true, lineStyle: { width: 2 }, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#E6A23C' } },
      { name: '磁盘', type: 'line', data: data.disk_history || [], smooth: true, lineStyle: { width: 2 }, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#67C23A' } },
    ],
  }
  trendChart.setOption(option)
}

async function fetchBackups() {
  backupLoading.value = true
  try {
    const res = await getBackups() as any
    if (res.code === 0) backups.value = res.data?.items || []
  } catch (err) { console.error('获取备份列表失败', err) }
  finally { backupLoading.value = false }
}

async function handleCreateBackup() {
  backupLoading.value = true
  try {
    const res = await createBackup() as any
    if (res.code === 0) { ElMessage.success('备份创建成功'); fetchBackups() }
  } catch { ElMessage.error('备份创建失败') }
  finally { backupLoading.value = false }
}

async function handleDownloadBackup(row: BackupItem) {
  try {
    const res: any = await downloadBackup(row.id)
    // axios 返回 response.data，拦截器已直接返回 response
    const blob = new Blob([res.data as unknown as BlobPart], { type: 'application/gzip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = row.name; a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载开始')
  } catch { ElMessage.error('下载失败') }
}

async function handleRestoreBackup(row: BackupItem) {
  try {
    await ElMessageBox.confirm(`确定要恢复备份 "${row.name}" 吗？这将覆盖当前系统设置。`, '恢复备份', { type: 'warning' })
    const res = await restoreBackup(row.id) as any
    if (res.code === 0) ElMessage.success('备份恢复成功')
  } catch (err: unknown) { if ((err as { toString: () => string })?.toString() !== 'cancel') ElMessage.error('恢复失败') }
}

async function handleDeleteBackup(row: BackupItem) {
  try {
    await ElMessageBox.confirm(`确定要删除备份 "${row.name}" 吗？`, '删除备份', { type: 'warning' })
    const res = await deleteBackup(row.id) as any
    if (res.code === 0) { ElMessage.success('备份已删除'); fetchBackups() }
  } catch (err: unknown) { if ((err as { toString: () => string })?.toString() !== 'cancel') ElMessage.error('删除失败') }
}

async function fetchLogs() {
  logLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (logFilter.level) params.level = logFilter.level
    if (logFilter.keyword) params.keyword = logFilter.keyword
    const res = await getSystemLogs(params) as any
    if (res.code === 0) systemLogs.value = res.data?.items || []
  } catch (err) { console.error('获取日志列表失败', err) }
  finally { logLoading.value = false }
}

async function handleViewLog(row: SystemLogItem) {
  currentLogName.value = row.name
  logViewerVisible.value = true
  try {
    const res = await getLogContent(row.name, 500) as any
    if (res.code === 0) currentLogContent.value = res.data?.lines || []
  } catch { ElMessage.error('获取日志内容失败') }
}

async function handleDownloadLog(row: SystemLogItem) {
  try {
    const res: any = await downloadSystemLog(row.name)
    const blob = new Blob([res.data as unknown as BlobPart], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = row.name; a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载开始')
  } catch { ElMessage.error('下载失败') }
}

async function downloadCurrentLog() {
  if (!currentLogName.value) return
  await handleDownloadLog({ id: '', name: currentLogName.value, size: '', size_bytes: 0, updated_at: '', path: '' } as SystemLogItem)
}

async function handleDeleteLog(row: SystemLogItem) {
  try {
    await ElMessageBox.confirm(`确定要删除日志 "${row.name}" 吗？`, '删除日志', { type: 'warning' })
    const res = await deleteSystemLog(row.id) as any
    if (res.code === 0) { ElMessage.success('日志已删除'); fetchLogs() }
  } catch (err: unknown) { if ((err as { toString: () => string })?.toString() !== 'cancel') ElMessage.error('删除失败') }
}

async function refreshAll() {
  if (activeTab.value === 'status') {
    await fetchStatus()
    await fetchTrend()
  } else if (activeTab.value === 'backup') {
    await fetchBackups()
  } else if (activeTab.value === 'logs') {
    await fetchLogs()
  }
}

function handleResize() {
  cpuChart?.resize()
  memChart?.resize()
  diskChart?.resize()
  trendChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    initCharts()
    fetchStatus()
    fetchTrend()
  })
  refreshTimer = window.setInterval(refreshAll, 30000)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cpuChart?.dispose()
  memChart?.dispose()
  diskChart?.dispose()
  trendChart?.dispose()
  if (refreshTimer) clearInterval(refreshTimer)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-center { display: flex; align-items: center; }
.load-avg { display: flex; justify-content: space-around; padding: 20px 0; }
.load-item { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 40px; background: #f5f7fa; border-radius: 8px; min-width: 120px; }
.load-label { font-size: 14px; color: #909399; font-weight: 500; }
.load-value { font-size: 28px; font-weight: bold; color: #409EFF; }
.log-viewer { height: calc(100vh - 200px); display: flex; flex-direction: column; }
.log-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f5f7fa; border-radius: 4px; margin-bottom: 8px; }
.log-content { flex: 1; overflow: auto; background: #1e1e1e; padding: 12px; border-radius: 4px; }
.log-content pre { margin: 0; color: #d4d4d4; font-family: Monaco, Menlo, monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; }
</style>
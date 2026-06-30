<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2>数据概览</h2>
        <p class="page-desc">实时了解数据资产的安全状态与分类分布</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleRefresh" :loading="refreshing">刷新</el-button>
      </div>
    </div>
    <div v-loading="pageLoading" class="page-body">
      <div class="stat-cards">
        <div class="stat-card" v-for="card in statCards" :key="card.key">
          <div class="stat-card-icon" :style="{ background: card.bg }">
            <span v-html="card.icon"></span>
          </div>
          <div class="stat-card-body">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value" :style="{ color: card.color }">{{ card.value ?? '-' }}</div>
          </div>
        </div>
      </div>
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">敏感字段变化趋势</span>
            <el-radio-group v-model="trendRange" size="small" @change="fetchTrend">
              <el-radio-button value="7">7天</el-radio-button>
              <el-radio-button value="30">30天</el-radio-button>
              <el-radio-button value="90">90天</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="trendChartRef" class="chart-body" v-loading="trendLoading"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">数据类型占比</span>
          </div>
          <div ref="typeRatioChartRef" class="chart-body" v-loading="typeRatioLoading"></div>
        </div>
      </div>
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">数据分级标签占比</span>
          </div>
          <div ref="levelRatioChartRef" class="chart-body" v-loading="levelRatioLoading"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">数据分类标签 TOP10</span>
          </div>
          <div ref="categoryRatioChartRef" class="chart-body" v-loading="categoryRatioLoading"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getStatistics, getTrend, getTypeRatio, getLevelRatio, getCategoryRatio, invalidateOverviewCache } from '@/api/overview'
import { getSettings } from '@/api/system'

const pageLoading = ref(false)
const refreshing = ref(false)

function getFilterParams(extra: Record<string, any> = {}) {
  return { ...extra }
}

const statCards = reactive([
  { key: 'total_assets', label: '资产总数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', color: '#2563eb', bg: '#eff6ff', value: null as string | null },
  { key: 'classified_count', label: '已分类字段', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>', color: '#10b981', bg: '#ecfdf5', value: null as string | null },
  { key: 'sensitive_column_count', label: '敏感字段', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', color: '#f59e0b', bg: '#fffbeb', value: null as string | null },
  { key: 'sensitive_table_count', label: '敏感表', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', color: '#ef4444', bg: '#fef2f2', value: null as string | null },
  { key: 'sensitive_ratio', label: '敏感占比', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', color: '#6b7280', bg: '#f3f4f6', value: null as string | null },
])

const trendRange = ref('30')
const trendChartRef = ref<HTMLElement | null>(null)
const typeRatioChartRef = ref<HTMLElement | null>(null)
const levelRatioChartRef = ref<HTMLElement | null>(null)
const categoryRatioChartRef = ref<HTMLElement | null>(null)
const trendLoading = ref(false)
const typeRatioLoading = ref(false)
const levelRatioLoading = ref(false)
const categoryRatioLoading = ref(false)

let trendChart: echarts.ECharts | null = null
let typeRatioChart: echarts.ECharts | null = null
let levelRatioChart: echarts.ECharts | null = null
let categoryRatioChart: echarts.ECharts | null = null

const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

async function fetchStatistics() {
  try {
    const res = await getStatistics(getFilterParams())
    const data = res.data || {}
    statCards.forEach(c => {
      if (c.key in data) {
        const raw = data[c.key]
        c.value = c.key === 'sensitive_ratio'
          ? (raw != null ? Number(raw).toFixed(1) + '%' : '-')
          : (raw != null ? Number(raw).toLocaleString() : '-')
      }
    })
  } catch {}
}

async function fetchTrend() {
  trendLoading.value = true
  try {
    const res = await getTrend(getFilterParams({ days: trendRange.value }))
    const data = res.data || {}
    const dates = data.dates || []
    const values = data.values || []
    const dailyChanges = data.daily_changes || []
    if (!trendChart && trendChartRef.value) {
      trendChart = echarts.init(trendChartRef.value)
    }
    trendChart?.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#1e293b',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any[]) => {
          const idx = params[0].dataIndex
          return `<div style="font-weight:600">${params[0].axisValue}</div>
            <div>累计: <span style="color:#2563eb;font-weight:600">${params[0].value}</span></div>
            <div>当日新增: <span style="color:#10b981;font-weight:600">${dailyChanges[idx] || 0}</span></div>`
        }
      },
      grid: { left: 50, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#2563eb', width: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37,99,235,0.15)' }, { offset: 1, color: 'rgba(37,99,235,0.02)' }
        ])},
        itemStyle: { color: '#2563eb' }
      }]
    }, true)
  } finally { trendLoading.value = false }
}

async function fetchTypeRatio() {
  typeRatioLoading.value = true
  try {
    const res = await getTypeRatio(getFilterParams())
    const data = (res.data || []).filter((d: any) => d.name)
    if (!typeRatioChart && typeRatioChartRef.value) {
      typeRatioChart = echarts.init(typeRatioChartRef.value)
    }
    typeRatioChart?.setOption({
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 12, color: '#6b7280' }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['40%', '50%'],
        label: { show: false }, emphasis: { label: { show: true, fontSize: 13 } },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: data.map((d: any, i: number) => ({ name: d.name, value: d.count, itemStyle: { color: chartColors[i % chartColors.length] } }))
      }]
    }, true)
  } finally { typeRatioLoading.value = false }
}

async function fetchLevelRatio() {
  levelRatioLoading.value = true
  try {
    const res = await getLevelRatio(getFilterParams())
    const data = res.data || []
    if (!levelRatioChart && levelRatioChartRef.value) {
      levelRatioChart = echarts.init(levelRatioChartRef.value)
    }
    levelRatioChart?.setOption({
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 12, color: '#6b7280' }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['40%', '50%'],
        label: { show: false }, emphasis: { label: { show: true, fontSize: 13 } },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: data.map((d: any, i: number) => ({
          name: d.level_name || d.level_code || '',
          value: d.count,
          itemStyle: { color: d.level_code === 'L1' ? '#ef4444' : d.level_code === 'L2' ? '#f59e0b' : d.level_code === 'L3' ? '#f97316' : d.level_code === 'L4' ? '#10b981' : d.level_code === 'L5' ? '#06b6d4' : chartColors[i % chartColors.length] }
        }))
      }]
    }, true)
  } finally { levelRatioLoading.value = false }
}

async function fetchCategoryRatio() {
  categoryRatioLoading.value = true
  try {
    const res = await getCategoryRatio(getFilterParams())
    const items = (res.data || []).slice(0, 10)
    const names = items.map((d: any) => d.category_name || d.category_path || '').reverse()
    const values = items.map((d: any) => d.count || 0).reverse()
    if (!categoryRatioChart && categoryRatioChartRef.value) {
      categoryRatioChart = echarts.init(categoryRatioChartRef.value)
    }
    categoryRatioChart?.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 110, right: 16, top: 12, bottom: 20 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      yAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 12, color: '#6b7280', width: 100, overflow: 'truncate' } },
      series: [{
        type: 'bar', data: values.map((v: number) => ({ value: v, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#60a5fa' }]), borderRadius: [0, 4, 4, 0] } })),
        barWidth: 18,
      }]
    }, true)
  } finally { categoryRatioLoading.value = false }
}

async function loadAll() {
  pageLoading.value = true
  try {
    await Promise.all([
      fetchStatistics(), fetchTrend(), fetchTypeRatio(),
      fetchLevelRatio(), fetchCategoryRatio(),
    ])
  } finally { pageLoading.value = false }
  nextTick(() => {
    trendChart?.resize()
    typeRatioChart?.resize()
    levelRatioChart?.resize()
    categoryRatioChart?.resize()
  })
}

function handleFilterChange() { loadAll() }
function handleResize() { [trendChart, typeRatioChart, levelRatioChart, categoryRatioChart].forEach(c => c?.resize()) }

async function handleRefresh() {
  refreshing.value = true
  try {
    // 清除概览缓存
    await invalidateOverviewCache()
    await loadAll()
  } finally {
    refreshing.value = false
  }
}

let refreshTimer: number | null = null

async function loadRefreshInterval() {
  try {
    const res = await getSettings()
    const basic = res.data?.basic || {}
    const interval = basic.refresh_interval || 0
    if (interval > 0) {
      if (refreshTimer) clearInterval(refreshTimer)
      refreshTimer = window.setInterval(() => {
        loadAll()
      }, interval * 1000)
    }
  } catch {}
}

onMounted(async () => {
  await loadAll()
  await loadRefreshInterval()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  ;[trendChart, typeRatioChart, levelRatioChart, categoryRatioChart].forEach(c => c?.dispose())
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 8px; }
.page-body { min-height: 400px; }

.stat-cards {
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 16px; margin-bottom: 20px;
}
.stat-card {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 16px; background: #fff;
  border: 1px solid #e5e6eb; border-radius: 8px;
}
.stat-card-icon {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0;
}
.stat-card-body { flex: 1; min-width: 0; }
.stat-label { font-size: 13px; font-weight: 500; color: #86909c; margin-bottom: 4px; }
.stat-value { font-size: 24px; font-weight: 700; line-height: 1.25; }

@media (max-width: 1200px) { .stat-cards { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } }

.charts-row {
  display: grid; grid-template-columns: 3fr 2fr;
  gap: 16px; margin-bottom: 16px;
}
.chart-card {
  background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden;
}
.chart-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #f2f3f5;
}
.chart-title { font-size: 14px; font-weight: 600; color: #1d2129; }
.chart-body { height: 280px; padding: 8px; }
@media (max-width: 1200px) { .charts-row { grid-template-columns: 1fr; } }
</style>
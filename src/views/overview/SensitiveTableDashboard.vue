<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2>敏感表盘</h2>
        <p class="page-desc">实时展示所有数据资产的表级敏感等级分布情况</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="showRulesDrawer = true">
          <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></span>
          规则
        </el-button>
        <el-button size="small" @click="showToolDrawer = true">
          <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>
          工具
        </el-button>
        <el-button size="small" @click="handleRefresh" :loading="refreshing">刷新</el-button>
      </div>
    </div>

    <div v-loading="pageLoading" class="page-body">
      <!-- 统计卡片 -->
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

      <!-- 图表区域 -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">等级分布</span>
          </div>
          <div ref="levelDistChartRef" class="chart-body" v-loading="chartLoading"></div>
        </div>
        <div class="chart-card chart-narrow">
          <div class="chart-header">
            <span class="chart-title">敏感占比</span>
          </div>
          <div ref="sensitiveRatioChartRef" class="chart-body" v-loading="chartLoading"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">各级别敏感表数量</span>
          </div>
          <div ref="levelSensitivityChartRef" class="chart-body" v-loading="chartLoading"></div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select v-model="filters.asset_name" placeholder="资产" size="small" clearable style="width: 130px" @change="onAssetChange">
          <el-option v-for="a in filterOptions.assets" :key="a" :label="a" :value="a" />
        </el-select>
        <el-select v-model="filters.database_name" placeholder="库" size="small" clearable style="width: 130px" @change="triggerSearch">
          <el-option v-for="d in filteredDatabases" :key="d" :label="d" :value="d" />
        </el-select>
        <el-select v-model="filters.table_name" placeholder="表名" size="small" clearable filterable style="width: 140px" @change="triggerSearch">
	          <el-option v-for="t in filterOptions.tables" :key="t" :label="t" :value="t" />
	        </el-select>
        <el-select v-model="filters.level" placeholder="等级" size="small" clearable style="width: 100px" @change="triggerSearch">
          <el-option v-for="l in filterOptions.levels" :key="l" :label="l" :value="l" />
        </el-select>
        <el-select v-model="filters.is_sensitive" placeholder="是否敏感" size="small" clearable style="width: 110px" @change="triggerSearch">
          <el-option label="敏感" :value="1" />
          <el-option label="非敏感" :value="0" />
        </el-select>
        <el-select v-model="filters.category" placeholder="分类" size="small" clearable style="width: 120px" filterable @change="triggerSearch">
          <el-option v-for="c in filterOptions.categories" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filters.task_name" placeholder="所属任务" size="small" clearable style="width: 140px" filterable @change="triggerSearch">
          <el-option v-for="t in filterOptions.tasks" :key="t" :label="t" :value="t" />
        </el-select>
        <el-button size="small" type="primary" @click="triggerSearch">搜索</el-button>
      </div>

      <!-- 表格 -->
      <div class="table-container">
        <el-table :data="tableData" stripe style="width: 100%" v-loading="tableLoading" max-height="600" @sort-change="handleSortChange">
          <el-table-column prop="asset_name" label="资产" min-width="120" sortable="custom" show-overflow-tooltip />
          <el-table-column prop="database_name" label="库" min-width="120" sortable="custom" show-overflow-tooltip />
          <el-table-column prop="table_name" label="表名" min-width="160" sortable="custom" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleViewDetail(row)">
                {{ row.table_name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="等级" min-width="100" align="center" sortable="custom" prop="level">
            <template #default="{ row }">
              <span v-if="row.level" class="level-badge" :style="getLevelBadgeStyle(row.level)"
                :title="row.upgrade > 0 ? `原等级: ${row.base_level} → 现等级: ${row.level} ↑+${row.upgrade}` : `等级: ${row.level}`">
                {{ row.level }}<span v-if="row.upgrade > 0" class="upgrade-indicator">↑+{{ row.upgrade }}</span><span v-if="row.is_manual_locked" style="margin-left:4px">🔒</span>
              </span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="是否敏感" min-width="80" align="center" sortable="custom" prop="is_sensitive">
            <template #default="{ row }">
              <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small" effect="plain">
                {{ row.is_sensitive ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="field_count" label="字段总数" min-width="80" align="right" sortable="custom" />
          <el-table-column prop="sensitive_count" label="敏感字段数" min-width="80" align="right" sortable="custom">
            <template #default="{ row }">
              <span :style="{ color: row.sensitive_count > 0 ? '#ef4444' : '#666' }">
                {{ row.sensitive_count }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="分类标签" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="row.categories && row.categories.length">
                <el-tag v-for="cat in row.categories.slice(0, 3)" :key="cat" size="small" style="margin-right: 4px; margin-bottom: 2px" effect="plain">{{ cat }}</el-tag>
                <el-tag v-if="row.categories.length > 3" size="small" type="info" effect="plain">+{{ row.categories.length - 3 }}</el-tag>
              </template>
              <span v-else style="color:#c0c4cc">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="task_name" label="所属任务" min-width="130" show-overflow-tooltip sortable="custom" />
          <el-table-column label="操作" min-width="80" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleChangeLevel(row)">变更等级</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper" v-if="total > 0">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

        <!-- 规则抽屉 -->
    <el-drawer v-model="showRulesDrawer" title="表等级升级规则" size="600px" direction="rtl">
      <div class="drawer-body">
        <!-- 工具栏 -->
        <div class="rules-toolbar">
          <div class="rules-toolbar-left">
            <div class="rules-hint">敏感字段数达到阈值时自动提升表等级</div>
            <el-button type="primary" size="small" @click="handleAddRule">
              <span class="btn-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
              新增规则
            </el-button>
          </div>
        </div>

        <!-- 组合逻辑全局控制 -->
        <div class="logic-control" v-if="tableRules.length > 0">
          <span class="logic-label">多规则匹配逻辑：</span>
          <el-radio-group v-model="globalLogic" size="small">
            <el-radio-button label="OR">满足任一规则即升级</el-radio-button>
            <el-radio-button label="AND">满足所有规则才升级</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 规则表格 -->
        <el-table :data="tableRules" stripe border size="small" max-height="360">
          <el-table-column prop="name" label="规则名称" min-width="130" show-overflow-tooltip />
          <el-table-column prop="level_code" label="基础级别" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ row.level_code }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="敏感字段条件" width="150" align="center">
            <template #default="{ row }">
              <span class="condition-expr">{{ row.sensitive_count_operator }}{{ row.sensitive_count_threshold }}</span>
            </template>
          </el-table-column>
          <el-table-column label="升级级数" width="90" align="center">
            <template #default="{ row }">
              <span style="color:#10b981;font-weight:600">+{{ row.upgrade_level }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row, $index }">
              <el-button type="primary" link size="small" @click="handleEditRule(row, $index)">编辑</el-button>
              <el-button type="danger" link size="small" @click="handleDeleteRule($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:16px;text-align:right">
          <el-button @click="showRulesDrawer = false">取消</el-button>
          <el-button type="primary" @click="handleSaveRules">保存规则</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 变更等级弹窗 -->
    <el-dialog v-model="showChangeLevelDialog" title="变更表等级" width="420px">
      <el-form :model="changeLevelForm" label-width="80px" size="small">
        <el-form-item label="表名">
          <span style="word-break:break-all">{{ changeLevelForm.table_name }}</span>
        </el-form-item>
        <el-form-item label="当前等级">
          <el-tag size="small" :style="getLevelBadgeStyle(changeLevelForm.current_level)">{{ changeLevelForm.current_level }}</el-tag>
          <span v-if="changeLevelForm.upgrade > 0" class="upgrade-indicator" style="margin-left:6px">↑+{{ changeLevelForm.upgrade }}</span>
          <span v-if="changeLevelForm.upgrade > 0" style="margin-left:8px;font-size:12px;color:#999">(原等级: {{ changeLevelForm.base_level }})</span>
        </el-form-item>
        <el-form-item label="新等级" required>
          <el-select v-model="changeLevelForm.new_level" placeholder="选择新等级" style="width:100%">
            <el-option v-for="l in levelOptions" :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item label="变更原因">
          <el-input v-model="changeLevelForm.reason" type="textarea" :rows="2" placeholder="请输入变更原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangeLevelDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmLevelChange">确认变更</el-button>
      </template>
    </el-dialog>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="showRuleEditDialog" :title="ruleEditTitle" width="480px">
      <el-form :model="ruleForm" label-width="100px" size="small">
        <el-form-item label="规则名称" required>
          <el-input v-model="ruleForm.name" placeholder="如：L2字段数超标升一级" />
        </el-form-item>
        <el-form-item label="基础级别" required>
          <el-select v-model="ruleForm.level_code" placeholder="选择级别" style="width:100%">
            <el-option v-for="l in levelOptions" :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item label="敏感字段条件" required>
          <div style="display:flex;gap:8px;align-items:center">
            <el-select v-model="ruleForm.sensitive_count_operator" style="width:80px">
              <el-option label=">" value=">" />
              <el-option label=">=" value=">=" />
              <el-option label="<" value="<" />
              <el-option label="<=" value="<=" />
              <el-option label="=" value="=" />
            </el-select>
            <el-input-number v-model="ruleForm.sensitive_count_threshold" :min="0" style="width:140px" placeholder="阈值" />
          </div>
        </el-form-item>
        <el-form-item label="升级级数" required>
          <el-input-number v-model="ruleForm.upgrade_level" :min="1" :max="5" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRuleEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmRuleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 工具抽屉 -->
    <el-drawer v-model="showToolDrawer" title="工具" size="480px" direction="rtl">
      <div class="drawer-body">
        <div class="tool-section">
          <div class="tool-section-title">导出数据</div>
          <el-button size="small" style="width:100%;margin-bottom:8px" @click="handleExportCSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            导出 CSV
          </el-button>
        </div>
        <el-divider />
        <div class="tool-section">
          <div class="tool-section-title">自动刷新</div>
          <div class="tool-section-row">
            <span class="tool-section-label">刷新间隔：</span>
            <el-select v-model="autoRefreshInterval" size="small" style="width:160px" @change="handleAutoRefreshChange">
              <el-option label="关闭" :value="0" />
              <el-option label="10秒" :value="10" />
              <el-option label="30秒" :value="30" />
              <el-option label="60秒" :value="60" />
            </el-select>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getSensitiveTables, invalidateOverviewCache, getSensitiveTableRules, saveSensitiveTableRules } from '@/api/overview'
import { getLevels } from '@/api/classification'
import client from '@/api/client'

// ===== 状态 =====
const pageLoading = ref(false)
const refreshing = ref(false)
const tableLoading = ref(false)
const chartLoading = ref(false)
const showRulesDrawer = ref(false)
const showToolDrawer = ref(false)
const showChangeLevelDialog = ref(false)
const showRuleEditDialog = ref(false)
const ruleEditTitle = ref('新增规则')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableData = ref<any[]>([])
const levelRules = ref<any[]>([])
const tableRules = ref<any[]>([])

// 变更等级
const changeLevelForm = reactive({
  table_name: '',
  current_level: '',
  new_level: '',
  reason: '',
  task_id: null as number | null,
  table_id: null as number | null,
  upgrade: 0,
  base_level: '',
})

// 规则编辑
const ruleForm = reactive({
  name: '',
  level_code: '',
  sensitive_count_operator: '>',
  sensitive_count_threshold: 10,
  upgrade_level: 1,
  logic_operator: 'OR',
})
const editingRuleIndex = ref(-1)
const globalLogic = ref<'AND' | 'OR'>('OR')

// 筛选条件
const filters = reactive({
  asset_name: '',
  database_name: '',
  table_name: '',
  level: '',
  is_sensitive: undefined as number | undefined,
  category: '',
  task_name: '',
})

// 筛选选项（由接口返回）
const filterOptions = reactive({
  assets: [] as string[],
  databases_by_asset: {} as Record<string, string[]>,
  tables: [] as string[],
  levels: [] as string[],
  categories: [] as string[],
  tasks: [] as string[],
})

// 联动计算：当前资产下的可选库列表
const filteredDatabases = computed(() => {
  if (filters.asset_name && filterOptions.databases_by_asset[filters.asset_name]) {
    return filterOptions.databases_by_asset[filters.asset_name]
  }
  const allDbs = new Set<string>()
  for (const dbs of Object.values(filterOptions.databases_by_asset)) {
    for (const db of dbs) allDbs.add(db)
  }
  return Array.from(allDbs).sort()
})

// 统计卡片
const statCards = reactive([
  { key: 'total_assets', label: '资产总数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', color: '#2563eb', bg: '#eff6ff', value: null as string | null },
  { key: 'total_tables', label: '总表数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', color: '#8b5cf6', bg: '#f5f3ff', value: null },
  { key: 'sensitive_tables', label: '敏感表数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', color: '#ef4444', bg: '#fef2f2', value: null },
  { key: 'sensitive_ratio', label: '敏感率', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', color: '#6b7280', bg: '#f3f4f6', value: null },
])

// 级别颜色映射
const levelColorMap = ref<Record<string, string>>({})

// 级别选项（从 levelRules 动态生成）
const levelOptions = computed(() => {
  return [...levelRules.value]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map(l => l.level_code)
    .filter(Boolean)
})

// 图表 refs
const levelDistChartRef = ref<HTMLElement | null>(null)
const sensitiveRatioChartRef = ref<HTMLElement | null>(null)
const levelSensitivityChartRef = ref<HTMLElement | null>(null)
let levelDistChart: echarts.ECharts | null = null
let sensitiveRatioChart: echarts.ECharts | null = null
let levelSensitivityChart: echarts.ECharts | null = null

// ===== 辅助函数 =====
function getLevelBadgeStyle(level: string): Record<string, string> {
  const color = levelColorMap.value[level]
  if (!color) return { backgroundColor: '#6b7280', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }
  return { backgroundColor: color, color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }
}

// ===== 数据加载 =====
async function loadLevelColors() {
  try {
    const res = await getLevels()
    const data = res.data || []
    levelRules.value = data
    for (const l of data) {
      if (l.level_code && l.color) {
        levelColorMap.value[l.level_code] = l.color
      }
    }
  } catch {
    levelColorMap.value = { L1: '#52C41A', L2: '#FF7A00', L3: '#FF4D4F', L4: '#CF1322', L5: '#8C1D18' }
  }
}

async function fetchData() {
  tableLoading.value = true
  chartLoading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (filters.asset_name) params.asset_name = filters.asset_name
    if (filters.database_name) params.database_name = filters.database_name
    if (filters.table_name) params.table_name = filters.table_name
    if (filters.level) params.level = filters.level
    if (filters.is_sensitive !== undefined) params.is_sensitive = filters.is_sensitive
    if (filters.category) params.category = filters.category
    if (filters.task_name) params.task_name = filters.task_name

    const res = await getSensitiveTables(params)
    const data = res.data || {}

    // 统计卡片
    const stats = data.statistics || {}
    statCards.forEach(c => {
      if (c.key in stats) {
        const raw = stats[c.key]
        c.value = c.key === 'sensitive_ratio'
          ? (raw != null ? Number(raw).toFixed(1) + '%' : '-')
          : (raw != null ? Number(raw).toLocaleString() : '-')
      }
    })

    // 筛选选项
    const opts = data.filter_options || {}
    filterOptions.assets = opts.assets || []
    filterOptions.databases_by_asset = opts.databases_by_asset || {}
    filterOptions.tables = opts.tables || []
    filterOptions.levels = opts.levels || []
    filterOptions.categories = opts.categories || []
    filterOptions.tasks = opts.tasks || []

    // 表格数据
    tableData.value = data.items || []
    total.value = data.total || 0

    // 图表
    const chartData = data.chart_data || {}
    await nextTick()
    renderCharts(chartData)
  } catch (e: any) {
    ElMessage.error(e?.message || '获取数据失败')
  } finally {
    tableLoading.value = false
    chartLoading.value = false
  }
}

// ===== 图表渲染 =====
function renderCharts(chartData: any) {
  // 等级分布（环形图）
  if (levelDistChartRef.value) {
    if (!levelDistChart) levelDistChart = echarts.init(levelDistChartRef.value)
    const dist = chartData.level_distribution || []
    levelDistChart.setOption({
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: '{b}: {c} 表 ({d}%)' },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '50%'],
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#374151' },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: dist.map((d: any) => ({ name: d.level_code, value: d.count, itemStyle: { color: d.color || '#909399' } })),
      }],
    }, true)
  }

  // 敏感占比（环形图）
  if (sensitiveRatioChartRef.value) {
    if (!sensitiveRatioChart) sensitiveRatioChart = echarts.init(sensitiveRatioChartRef.value)
    const ratio = chartData.sensitivity_ratio || {}
    sensitiveRatioChart.setOption({
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: '{b}: {c} 表 ({d}%)' },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '50%'],
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#374151' },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: [
          { name: '敏感表', value: ratio.sensitive || 0, itemStyle: { color: '#ef4444' } },
          { name: '非敏感表', value: ratio.non_sensitive || 0, itemStyle: { color: '#e5e7eb' } },
        ],
      }],
    }, true)
  }

  // 各级别敏感表数量（堆叠柱状图）
  if (levelSensitivityChartRef.value) {
    if (!levelSensitivityChart) levelSensitivityChart = echarts.init(levelSensitivityChartRef.value)
    const detail = chartData.level_sensitivity_detail || []
    levelSensitivityChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { data: ['非敏感表', '敏感表'], bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
      grid: { left: 50, right: 16, top: 16, bottom: 40 },
      xAxis: { type: 'category', data: detail.map((d: any) => d.level_code), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 12, color: '#6b7280' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: [
        { name: '非敏感表', type: 'bar', stack: 'total', barWidth: 36, itemStyle: { color: '#d1d5db' }, data: detail.map((d: any) => d.non_sensitive || 0) },
        { name: '敏感表', type: 'bar', stack: 'total', barWidth: 36, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f87171' }]), borderRadius: [4, 4, 0, 0] }, data: detail.map((d: any) => d.sensitive || 0) },
      ],
    }, true)
  }
}

// ===== 交互处理 =====
function onAssetChange() {
  filters.database_name = '' // 联动清空库
  triggerSearch()
}

function triggerSearch() {
  currentPage.value = 1
  fetchData()
}

function handleSortChange(sortData: { prop: string | null; order: string | null }) {
  // 前端的客户端排序
  if (!sortData.prop || !sortData.order) return
  const key = sortData.prop
  const dir = sortData.order === 'ascending' ? 1 : -1
  tableData.value = [...tableData.value].sort((a: any, b: any) => {
    let va = a[key], vb = b[key]
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va == null) va = key === 'is_sensitive' ? false : ''
    if (vb == null) vb = key === 'is_sensitive' ? false : ''
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
}

function handlePageChange() { fetchData() }
function handleSizeChange(size: number) { pageSize.value = size; currentPage.value = 1; fetchData() }

async function handleRefresh() {
  refreshing.value = true
  try {
    await invalidateOverviewCache()
    await fetchData()
  } finally {
    refreshing.value = false
  }
}

function handleDeleteRule(index: number) {
  tableRules.value.splice(index, 1)
}

async function handleSaveRules() {
  try {
    // 保存时把全局 logic_operator 同步到每条规则
    const rulesToSave = tableRules.value.map(r => ({ ...r, logic_operator: globalLogic.value }))
    await saveSensitiveTableRules(rulesToSave)
    ElMessage.success('规则保存成功')
    showRulesDrawer.value = false
    await invalidateOverviewCache()
    await fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function loadTableRules() {
  try {
    const res = await getSensitiveTableRules()
    tableRules.value = res.data || []
    // 同步全局组合逻辑
    if (tableRules.value.length > 0 && tableRules.value[0].logic_operator) {
      globalLogic.value = tableRules.value[0].logic_operator
    }
  } catch {
    tableRules.value = []
  }
}

function handleChangeLevel(row: any) {
  changeLevelForm.table_name = row.table_name
  changeLevelForm.current_level = row.level || '-'
  changeLevelForm.new_level = row.level || ''
  changeLevelForm.reason = ''
  changeLevelForm.task_id = row.task_id ?? null
  changeLevelForm.table_id = row.table_id ?? null
  changeLevelForm.upgrade = row.upgrade ?? 0
  changeLevelForm.base_level = row.base_level || row.level || ''
  showChangeLevelDialog.value = true
}

async function handleConfirmLevelChange() {
  if (!changeLevelForm.new_level) {
    ElMessage.warning('请选择新等级')
    return
  }
  if (!changeLevelForm.task_id || !changeLevelForm.table_id) {
    ElMessage.warning('该表无法变更等级（缺少任务或表ID）')
    return
  }
  try {
    await client.post(`/classification-tasks/${changeLevelForm.task_id}/tables/${changeLevelForm.table_id}/change-level`, {
      level: changeLevelForm.new_level,
      reason: changeLevelForm.reason,
    })
    ElMessage.success('等级变更成功')
    showChangeLevelDialog.value = false
    await invalidateOverviewCache()
    await fetchData()
  } catch (e: any) {
    ElMessage.error(e?.message || '变更失败')
  }
}

function handleAddRule() {
  editingRuleIndex.value = -1
  ruleEditTitle.value = '新增规则'
  Object.assign(ruleForm, { name: '', level_code: 'L1', sensitive_count_operator: '>', sensitive_count_threshold: 10, upgrade_level: 1, logic_operator: globalLogic.value })
  showRuleEditDialog.value = true
}

function handleEditRule(row: any, index: number) {
  editingRuleIndex.value = index
  ruleEditTitle.value = '编辑规则'
  Object.assign(ruleForm, { ...row })
  showRuleEditDialog.value = true
}

function handleConfirmRuleSave() {
  if (!ruleForm.name || !ruleForm.level_code) {
    ElMessage.warning('请填写规则名称和基础级别')
    return
  }
  if (editingRuleIndex.value >= 0) {
    tableRules.value[editingRuleIndex.value] = { ...ruleForm }
  } else {
    tableRules.value.push({ ...ruleForm })
  }
  showRuleEditDialog.value = false
}

function handleViewDetail(row: any) {
  ElMessage.info(`查看表 "${row.table_name}" 的详情`)
}

function handleExportCSV() {
  if (!tableData.value.length) { ElMessage.warning('暂无数据可导出'); return }
  const headers = ['资产', '库', '表名', '等级', '是否敏感', '字段总数', '敏感字段数', '分类标签', '所属任务']
  const rows = tableData.value.map((r: any) => [r.asset_name, r.database_name, r.table_name, r.level, r.is_sensitive ? '是' : '否', r.field_count, r.sensitive_count, (r.categories || []).join('; '), r.task_name])
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `敏感表盘_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 自动刷新
const autoRefreshInterval = ref(0)
let refreshTimer: number | null = null
function handleAutoRefreshChange() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  if (autoRefreshInterval.value > 0) {
    refreshTimer = window.setInterval(() => { fetchData() }, autoRefreshInterval.value * 1000)
  }
}

function handleResize() {
  levelDistChart?.resize()
  sensitiveRatioChart?.resize()
  levelSensitivityChart?.resize()
}

// ===== 生命周期 =====
watch(showRulesDrawer, async (val) => {
  if (val) {
    await loadTableRules()
  }
})

onMounted(async () => {
  pageLoading.value = true
  try {
    await loadLevelColors()
    await fetchData()
  } finally {
    pageLoading.value = false
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  levelDistChart?.dispose()
  sensitiveRatioChart?.dispose()
  levelSensitivityChart?.dispose()
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.page-container { padding: 0 var(--spacing-24) var(--spacing-24); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 18px; font-weight: 600; color: #1d2129; }
.page-desc { margin: 4px 0 0; font-size: 13px; color: #86909c; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.header-actions .el-button { display: flex; align-items: center; gap: 4px; }
.btn-icon { display: flex; align-items: center; }
.page-body { min-height: 400px; }

/* 统计卡片 */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px 12px; background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; }
.stat-card-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; }
.stat-card-body { flex: 1; min-width: 0; }
.stat-label { font-size: 12px; font-weight: 500; color: #86909c; margin-bottom: 4px; white-space: nowrap; }
.stat-value { font-size: 20px; font-weight: 700; line-height: 1.25; }
@media (max-width: 1200px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } }

/* 图表区域 */
.charts-row { display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 16px; margin-bottom: 16px; }
.chart-card { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden; }
.chart-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f2f3f5; }
.chart-title { font-size: 14px; font-weight: 600; color: #1d2129; }
.chart-body { height: 260px; padding: 8px; }
@media (max-width: 1400px) { .charts-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

/* 筛选栏 */
.filter-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }

/* 表格 */
.table-container { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden; padding: 16px; }
.level-badge { display: inline-block; border-radius: 4px; font-size: 12px; font-weight: 600; line-height: 16px; }
.upgrade-indicator { color: #10b981; font-size: 11px; margin-left: 3px; font-weight: 700; vertical-align: middle; }
.pagination-wrapper { display: flex; justify-content: center; margin-top: 20px; }

/* 抽屉 */
.drawer-body { padding: 0 16px; }
.drawer-hint { font-size: 13px; color: #86909c; margin-bottom: 16px; }
.level-cell { display: flex; align-items: center; gap: 6px; }
.level-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.tool-section { margin-bottom: 8px; }
.tool-section-title { font-size: 14px; font-weight: 600; color: #1d2129; margin-bottom: 12px; }
.tool-section-row { display: flex; align-items: center; gap: 12px; }
.tool-section-label { font-size: 13px; color: #374151; white-space: nowrap; }
.rules-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
.rules-toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.rules-hint { font-size: 13px; color: #666; flex: 1; }
.logic-control { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 12px; border: 1px solid #f0f0f0; }
.logic-label { font-size: 13px; color: #374151; white-space: nowrap; }
.condition-expr { font-family: monospace; font-size: 12px; color: #374151; }
</style>
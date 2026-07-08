<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2>数量分级</h2>
        <p class="page-desc">基于敏感数据类型与数量规模的动态分级管理</p>
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
        <el-button size="small" @click="showReportDialog = true">
          <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
          报告
        </el-button>
        <el-button size="small" @click="handleRefresh" :loading="refreshing">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          刷新
        </el-button>
      </div>
    </div>

    <div v-loading="pageLoading" class="page-body">
      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div
          class="stat-card"
          v-for="card in statCards"
          :key="card.key"
          :title="card.tip"
        >
          <div class="stat-card-icon" :style="{ background: card.bg }">
            <span v-html="card.icon"></span>
          </div>
          <div class="stat-card-body">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value" :style="{ color: card.color }">{{ card.value || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">数据类型级别分布</span>
          </div>
          <div ref="typeLevelChartRef" class="chart-body" v-loading="typeLevelLoading"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">各级别数据量</span>
          </div>
          <div ref="levelCountChartRef" class="chart-body" v-loading="levelCountLoading"></div>
        </div>
      </div>

      <!-- 评估记录 -->
      <div class="record-section">
        <div class="section-header">
          <span class="section-title">评估记录</span>
        </div>
        <el-table :data="evaluationRecords" stripe border size="small" v-loading="recordsLoading">
          <el-table-column prop="id" label="序号" width="60" align="center" />
          <el-table-column prop="executed_at" label="评估时间" min-width="160" />
          <el-table-column prop="total_fields" label="参与字段数" width="110" align="center" />
          <el-table-column prop="total_assets" label="涉及资产数" width="110" align="center" />
          <el-table-column prop="max_level" label="最高级别" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="levelTagType(row.max_level)">{{ row.max_level || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="upgraded_count" label="触发升级数" width="110" align="center">
            <template #default="{ row }">
              <span v-if="row.upgraded_count > 0" style="color:#f59e0b;font-weight:600">{{ row.upgraded_count }}</span>
              <span v-else>0</span>
            </template>
          </el-table-column>
          <el-table-column label="评估结果" min-width="200">
            <template #default="{ row }">
              <span class="record-summary">{{ row.summary || '无' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 规则抽屉 -->
    <el-drawer v-model="showRulesDrawer" title="量级定级规则" size="600px" direction="rtl">
      <div class="drawer-body">
        <div class="drawer-toolbar">
          <el-button type="primary" size="small" @click="handleAddRule">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增规则
          </el-button>
        </div>
        <el-table :data="rulesTable" stripe border size="small" max-height="360">
          <el-table-column prop="data_type" label="数据类型" min-width="130" />
          <el-table-column prop="base_level" label="基础级别" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="levelTagType(row.base_level)">{{ row.base_level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="threshold_1k" label="1K阈值" width="80" align="center">
            <template #default="{ row }">
              <span class="threshold-val">{{ row.threshold_1k && row.threshold_1k.toLocaleString() || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="threshold_10k" label="1万阈值" width="85" align="center">
            <template #default="{ row }">
              <span class="threshold-val">{{ row.threshold_10k && row.threshold_10k.toLocaleString() || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="threshold_100k" label="10万阈值" width="90" align="center">
            <template #default="{ row }">
              <span class="threshold-val">{{ row.threshold_100k && row.threshold_100k.toLocaleString() || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="special_rule" label="特殊规则" min-width="130" show-overflow-tooltip />
          <el-table-column label="操作" width="70" align="center">
            <template #default="{ row, $index }">
              <el-button type="primary" link size="small" @click="handleEditRule(row, $index)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 规则说明 -->
        <div class="rules-legend">
          <div class="legend-title">规则说明</div>
          <div class="legend-item" v-for="item in legendItems" :key="item.text">
            <span class="legend-dot" :style="{ background: item.color }"></span>
            {{ item.text }}
          </div>
        </div>

        <div class="drawer-law">
          <div class="legend-title">法律依据</div>
          <div class="law-item"><span class="law-tag">数据安全法§21</span>根据数据在经济社会发展中的重要程度分级保护</div>
          <div class="law-item"><span class="law-tag">个保法§28</span>敏感个人信息包括身份信息、金融账户、医疗健康等</div>
          <div class="law-item"><span class="law-tag">GB/T 42574</span>个人信息保护影响评估，超过阈值需开展评估</div>
          <div class="law-item"><span class="law-tag">JR/T 0171</span>金融数据分级，按数量规模确定保护等级</div>
        </div>
      </div>
    </el-drawer>

    <!-- 工具抽屉 -->
    <el-drawer v-model="showToolDrawer" title="量级评估工具" size="560px" direction="rtl">
      <div class="drawer-body">
        <div class="tool-intro">
          <p>点击「执行评估」按钮，系统将自动从数据目录获取已人工分类的字段数据，按当前规则计算各级别的建议级别，并生成一条评估记录。</p>
        </div>
        <el-divider />
        <div class="tool-current-rules">
          <div class="tool-rules-title">当前规则（将用于本次评估）</div>
          <el-tag v-for="rule in rulesTable" :key="rule.data_type" size="small" style="margin:4px 4px 4px 0">
            {{ rule.data_type }}：{{ rule.base_level }}
          </el-tag>
        </div>
        <el-divider />
        <el-button type="primary" size="default" style="width:100%;margin-bottom:16px" @click="handleExecuteEvaluation" :loading="evaluating">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          执行评估
        </el-button>

        <!-- 本次预览 -->
        <div v-if="lastEvaluation" class="tool-result">
          <div class="tool-result-title">最近一次评估结果</div>
          <div class="tool-result-row">
            <span class="tool-result-label">评估时间：</span>
            <span class="tool-result-val">{{ lastEvaluation.executed_at }}</span>
          </div>
          <div class="tool-result-row">
            <span class="tool-result-label">参与字段：</span>
            <span class="tool-result-val">{{ lastEvaluation.total_fields }} 条</span>
          </div>
          <div class="tool-result-row">
            <span class="tool-result-label">最高级别：</span>
            <el-tag size="small" :type="levelTagType(lastEvaluation.max_level)">{{ lastEvaluation.max_level }}</el-tag>
          </div>
          <div class="tool-result-row">
            <span class="tool-result-label">触发升级：</span>
            <span style="color:#f59e0b;font-weight:600">{{ lastEvaluation.upgraded_count }} 条规则</span>
          </div>
          <div class="tool-result-detail">
            <div class="tool-result-detail-title">各类型评估明细</div>
            <el-table :data="lastEvaluation.details" stripe border size="small">
              <el-table-column prop="data_type" label="数据类型" min-width="120" />
              <el-table-column prop="field_count" label="字段数" width="80" align="center" />
              <el-table-column prop="base_level" label="基础级" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="levelTagType(row.base_level)">{{ row.base_level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="suggested_level" label="建议级" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" type="warning">{{ row.suggested_level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="upgrade" label="升级" width="60" align="center">
                <template #default="{ row }">
                  <span v-if="row.upgrade > 0" style="color:#ef4444">+{{ row.upgrade }}</span>
                  <span v-else style="color:#9ca3af">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="trigger" label="触发原因" min-width="120" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 报告弹窗 -->
    <el-dialog v-model="showReportDialog" title="量级定级评估报告" width="760px">
      <div v-loading="reportLoading" class="report-content">
        <div class="report-header">
          <div class="report-title">数量分级评估报告</div>
          <div class="report-meta">生成时间：{{ reportData.generated_at }}</div>
        </div>
        <el-divider />

        <div v-if="reportData.evaluation" class="report-section">
          <div class="report-section-title">一、评估概况</div>
          <div class="report-stat-row">
            <div class="report-stat">
              <div class="report-stat-value">{{ reportData.evaluation.total_fields }}</div>
              <div class="report-stat-label">参与字段数</div>
            </div>
            <div class="report-stat">
              <div class="report-stat-value">{{ reportData.evaluation.total_assets }}</div>
              <div class="report-stat-label">涉及资产数</div>
            </div>
            <div class="report-stat">
              <div class="report-stat-value" :style="{ color: levelColor(reportData.evaluation.max_level) }">{{ reportData.evaluation.max_level }}</div>
              <div class="report-stat-label">最高级别</div>
            </div>
            <div class="report-stat">
              <div class="report-stat-value" style="color:#f59e0b">{{ reportData.evaluation.upgraded_count }}</div>
              <div class="report-stat-label">触发升级数</div>
            </div>
          </div>
        </div>

        <div v-if="reportData.evaluation?.details" class="report-section">
          <div class="report-section-title">二、评估明细</div>
          <el-table :data="reportData.evaluation.details" stripe border size="small" max-height="280">
            <el-table-column prop="data_type" label="数据类型" min-width="130" />
            <el-table-column prop="field_count" label="字段数" width="90" align="center">
              <template #default="{ row }">{{ row.field_count?.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="base_level" label="基础级别" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="levelTagType(row.base_level)">{{ row.base_level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="suggested_level" label="建议级别" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" type="warning">{{ row.suggested_level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="upgrade" label="升级" width="70" align="center">
              <template #default="{ row }">
                <span v-if="row.upgrade > 0" style="color:#ef4444;font-weight:600">+{{ row.upgrade }}级</span>
                <span v-else style="color:#9ca3af">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="trigger" label="触发原因" min-width="160" show-overflow-tooltip />
          </el-table>
        </div>

        <div v-if="!reportData.evaluation" class="report-empty">
          <p>暂无评估数据，请先在工具中执行评估</p>
        </div>

        <div class="report-section">
          <div class="report-section-title">三、法律依据</div>
          <div class="report-law-list">
            <div class="report-law-item" v-for="law in reportData.laws" :key="law.code">
              <span class="report-law-code">{{ law.code }}</span>
              <span class="report-law-text">{{ law.text }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showReportDialog = false">关闭</el-button>
        <el-button type="primary" @click="handleExportReport">导出Excel</el-button>
      </template>
    </el-dialog>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="showRuleEditDialog" :title="ruleEditTitle" width="500px">
      <el-form :model="ruleForm" label-width="100px" size="small">
        <el-form-item label="数据类型" required>
          <el-input v-model="ruleForm.data_type" placeholder="如：身份证信息、银行卡账户" />
        </el-form-item>
        <el-form-item label="基础级别" required>
          <el-select v-model="ruleForm.base_level" style="width:100%">
            <el-option
              v-for="opt in levelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="1K阈值">
          <el-input-number v-model="ruleForm.threshold_1k" :min="0" style="width:100%" placeholder="字段数超过此值触发+1升级" />
          <div class="form-tip">字段数达到此值，级别+1</div>
        </el-form-item>
        <el-form-item label="1万阈值">
          <el-input-number v-model="ruleForm.threshold_10k" :min="0" style="width:100%" placeholder="字段数超过此值触发+2升级" />
          <div class="form-tip">字段数达到此值，级别+2</div>
        </el-form-item>
        <el-form-item label="10万阈值">
          <el-input-number v-model="ruleForm.threshold_100k" :min="0" style="width:100%" placeholder="字段数超过此值触发+3升级" />
          <div class="form-tip">字段数达到此值，级别+3或强制L4</div>
        </el-form-item>
        <el-form-item label="特殊规则">
          <el-input v-model="ruleForm.special_rule" type="textarea" :rows="2" placeholder="如：无论数量多少，最低L3；金融信息严格保护" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRuleEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { getDirectory, getLevelRatio, getStatistics } from '@/api/overview'
import { getLevels } from '@/api/classification'
import client from '@/api/client'

// ===== 状态 =====
const pageLoading = ref(false)
const refreshing = ref(false)
const showRulesDrawer = ref(false)
const showToolDrawer = ref(false)
const showReportDialog = ref(false)
const showRuleEditDialog = ref(false)
const ruleEditTitle = ref('编辑规则')
const evaluating = ref(false)
const reportLoading = ref(false)
const recordsLoading = ref(false)
const typeLevelLoading = ref(false)
const levelCountLoading = ref(false)

// ===== 级别（从数据分级API动态获取） =====
interface LevelItem {
  id: number
  level_code: string    // 如 L1, L2
  color: string
  is_sensitive: number  // 0 or 1
  sort: number          // 优先级，数字越小级别越低
}

const levels = ref<LevelItem[]>([])

// 从级别列表构建 levelCode → LevelItem 的映射
const levelMap = computed(() => {
  const m: Record<string, LevelItem> = {}
  levels.value.forEach(l => { m[l.level_code] = l })
  return m
})

// 级别选项（用于规则表单下拉）
const levelOptions = computed(() =>
  [...levels.value]
    .sort((a, b) => a.sort - b.sort)
    .map(l => ({ label: l.level_code, value: l.level_code }))
)

// 最低级别代码
const lowestLevel = computed(() => {
  const sorted = [...levels.value].sort((a, b) => a.sort - b.sort)
  return sorted[0]?.level_code || 'L1'
})

// 最高级别代码
const highestLevel = computed(() => {
  const sorted = [...levels.value].sort((a, b) => a.sort - b.sort)
  return sorted[sorted.length - 1]?.level_code || 'L5'
})

// 敏感级别（is_sensitive=1）
const sensitiveLevel = computed(() => {
  return levels.value.find(l => l.is_sensitive)?.level_code || highestLevel.value
})

// 规则说明（动态）
const legendItems = computed(() => [
  { color: '#10b981', text: `特殊敏感信息（身份证、生物识别、宗教信仰等）：无论数量多少，最低${sensitiveLevel.value}` },
  { color: '#f59e0b', text: `数量 ≥ 1K阈值：+1级` },
  { color: '#f97316', text: `数量 ≥ 1万阈值：+2级` },
  { color: '#ef4444', text: `数量 ≥ 10万阈值：+3级或强制${highestLevel.value}` },
])

// ===== 评估记录（本地存储） =====
interface EvaluationDetail {
  data_type: string
  field_count: number
  base_level: string
  suggested_level: string
  upgrade: number
  trigger: string
  legal_basis: string
}

interface EvaluationRecord {
  id: number
  executed_at: string
  total_fields: number
  total_assets: number
  max_level: string
  upgraded_count: number
  summary: string
  details: EvaluationDetail[]
}

const STORAGE_KEY = 'mdcgs_volume_grade_records'
const RULES_STORAGE_KEY = 'mdcgs_volume_grade_rules'

function loadRecords(): EvaluationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecords(records: EvaluationRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

const evaluationRecords = ref<EvaluationRecord[]>(loadRecords())
const lastEvaluation = computed(() => evaluationRecords.value[0] || null)

function loadRules() {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return getDefaultRules()
}

function saveRules(rules: any[]) {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules))
}

function getDefaultRules() {
  const lowest = lowestLevel.value
  const second = [...levels.value].sort((a, b) => a.sort - b.sort)[1]?.level_code || 'L2'
  return [
    { data_type: '身份证信息', base_level: second, threshold_1k: 1000, threshold_10k: 10000, threshold_100k: 100000, special_rule: `无论数量，最低${second}` },
    { data_type: '姓名+手机号', base_level: second, threshold_1k: 1000, threshold_10k: 10000, threshold_100k: 100000, special_rule: '组合信息视为敏感' },
    { data_type: '银行卡账户', base_level: highestLevel.value, threshold_1k: 500, threshold_10k: 5000, threshold_100k: 50000, special_rule: '金融信息，严格保护' },
    { data_type: '健康医疗记录', base_level: highestLevel.value, threshold_1k: 500, threshold_10k: 5000, threshold_100k: 50000, special_rule: '医疗信息，最高保护' },
    { data_type: '邮箱地址', base_level: second, threshold_1k: 5000, threshold_10k: 50000, threshold_100k: 500000, special_rule: '-' },
    { data_type: '一般个人信息', base_level: lowest, threshold_1k: 10000, threshold_10k: 100000, threshold_100k: 1000000, special_rule: '-' },
    { data_type: '行为日志数据', base_level: lowest, threshold_1k: 50000, threshold_10k: 500000, threshold_100k: 5000000, special_rule: '-' },
  ]
}

const rulesTable = ref<any[]>([])

// ===== 统计卡片 =====
const statCards = reactive([
  {
    key: 'last_eval_time', label: '上次评估时间', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', color: '#6b7280', bg: '#f3f4f6',
    tip: '最近一次执行评估的时间',
    value: null as string | null,
  },
  {
    key: 'total_fields', label: '参与字段数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>', color: '#2563eb', bg: '#eff6ff',
    tip: '最近一次评估中参与计算的已分类字段总数',
    value: null as string | null,
  },
  {
    key: 'total_assets', label: '涉及资产数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>', color: '#8b5cf6', bg: '#f5f3ff',
    tip: '最近一次评估中涉及的数据资产数量',
    value: null as string | null,
  },
  {
    key: 'max_level', label: '最高级别', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="14" width="4" height="6"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>', color: '#ef4444', bg: '#fef2f2',
    tip: '最近一次评估中，建议的最高保护级别',
    value: null as string | null,
  },
  {
    key: 'upgraded_count', label: '触发升级', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/><polyline points="18 21 12 15 6 21"/></svg>', color: '#f59e0b', bg: '#fffbeb',
    tip: '最近一次评估中，因数量规模触发升级的数据类型数量',
    value: null as string | null,
  },
  {
    key: 'record_count', label: '评估记录数', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', color: '#10b981', bg: '#ecfdf5',
    tip: '历史评估记录的总条数',
    value: null as string | null,
  },
])

// ===== 图表 refs =====
const typeLevelChartRef = ref<HTMLElement | null>(null)
const levelCountChartRef = ref<HTMLElement | null>(null)
const reportLevelChartRef = ref<HTMLElement | null>(null)
let typeLevelChart: echarts.ECharts | null = null
let levelCountChart: echarts.ECharts | null = null
let reportLevelChart: echarts.ECharts | null = null

// ===== 规则表单 =====
const ruleForm = reactive({
  data_type: '',
  base_level: '',
  threshold_1k: null as number | null,
  threshold_10k: null as number | null,
  threshold_100k: null as number | null,
  special_rule: '',
})
const editingRuleIndex = ref(-1)

// ===== 报告数据 =====
const reportData = reactive({
  generated_at: '',
  evaluation: null as EvaluationRecord | null,
  laws: [
    { code: '《数据安全法》第21条', text: '国家建立数据分类分级保护制度，根据数据在经济社会发展中的重要程度分级保护' },
    { code: '《个人信息保护法》第28条', text: '敏感个人信息包括身份信息、金融账户、医疗健康、宗教信仰等，需单独告知并取得同意' },
    { code: 'GB/T 42574-2023', text: '个人信息保护影响评估指南，明确超过特定数量阈值需开展影响评估' },
    { code: 'JR/T 0171-2020', text: '金融数据安全分级，按数据量规模确定相应等级的保护措施' },
  ],
})

// ===== 工具函数 =====
function levelTagType(level: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  const item = levelMap.value[level]
  if (item) {
    return item.is_sensitive ? 'danger' : 'info'
  }
  return 'info'
}

function levelColor(level: string): string {
  return levelMap.value[level]?.color || '#6b7280'
}

function computeLevelSort(l: any): number {
  if (l.sort_order != null) return l.sort_order
  const v = parseInt(l.level_code.replace(/L/i, ''))
  return v || 0
}

function getLevelOrder(level: string): number {
  const item = levelMap.value[level]
  if (item) return item.sort
  // fallback: 从 level_code 提取数字
  const match = level.match(/L(\d+)/)
  return match ? parseInt(match[1]) : 0
}

// ===== 数据获取 =====
async function fetchDirectoryForEvaluation() {
  const res = await getDirectory({ page_size: -1 })
  return res.data?.items || []
}

async function fetchStatistics() {
  try {
    const res = await getStatistics()
    return res.data || {}
  } catch {
    return {}
  }
}

async function fetchStatisticsForCards() {
  try {
    const stats = await fetchStatistics()
    const last = lastEvaluation.value

    statCards.forEach(c => {
      if (c.key === 'last_eval_time') {
        c.value = last?.executed_at?.replace('T', ' ').substring(0, 19) || '-'
      } else if (c.key === 'total_fields') {
        c.value = last ? String(last.total_fields) : '-'
      } else if (c.key === 'total_assets') {
        c.value = last ? String(last.total_assets) : '-'
      } else if (c.key === 'max_level') {
        c.value = last?.max_level || '-'
      } else if (c.key === 'upgraded_count') {
        c.value = last ? String(last.upgraded_count) : '-'
      } else if (c.key === 'record_count') {
        c.value = String(evaluationRecords.value.length)
      }
    })
  } catch {
    statCards.forEach(c => { c.value = '-' })
  }
}

async function fetchTypeLevelChart() {
  typeLevelLoading.value = true
  try {
    await nextTick()
    if (!typeLevelChart && typeLevelChartRef.value) {
      typeLevelChart = echarts.init(typeLevelChartRef.value)
    }
    const last = lastEvaluation.value
    if (!last || !last.details?.length) {
      typeLevelChart?.setOption({
        series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '50%'], label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#374151' }, data: [] }],
      }, true)
      return
    }

    const seriesData = last.details.map((d: EvaluationDetail) => ({
      name: `${d.data_type}(${d.suggested_level})`,
      value: d.field_count,
    }))

    typeLevelChart?.setOption({
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: (p: any) => `${p.name}: ${p.value.toLocaleString()} 字段` },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '50%'],
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#374151' },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: seriesData,
      }]
    }, true)
  } finally { typeLevelLoading.value = false }
}

async function fetchLevelCountChart() {
  levelCountLoading.value = true
  try {
    await nextTick()
    if (!levelCountChart && levelCountChartRef.value) {
      levelCountChart = echarts.init(levelCountChartRef.value)
    }
    const last = lastEvaluation.value

    // 按建议级别聚合（使用动态级别列表）
    const sortedLevels = [...levels.value].sort((a, b) => a.sort - b.sort)
    const levelAgg: Record<string, number> = {}
    sortedLevels.forEach(l => { levelAgg[l.level_code] = 0 })

    if (last?.details) {
      last.details.forEach((d: EvaluationDetail) => {
        if (d.suggested_level in levelAgg) {
          levelAgg[d.suggested_level] += d.field_count
        }
      })
    }

    const chartData = sortedLevels.map(l => ({ level: l.level_code, count: levelAgg[l.level_code] || 0 }))

    levelCountChart?.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: (p: any) => `${p[0].name}: ${p[0].value.toLocaleString()} 字段` },
      grid: { left: 60, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: chartData.map(d => d.level), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 12, color: '#6b7280' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: [{
        type: 'bar', data: chartData.map(d => ({
          value: d.count,
          itemStyle: { color: levelMap.value[d.level]?.color || '#6b7280', borderRadius: [4, 4, 0, 0] }
        })),
        barWidth: 40,
      }]
    }, true)
  } finally { levelCountLoading.value = false }
}

async function loadAll() {
  pageLoading.value = true
  try {
    // 先获取级别配置
    const levelsRes = await getLevels()
    const items = (Array.isArray(levelsRes.data) ? levelsRes.data : [])
      .filter((l: any) => l.is_active)
    levels.value = items.map((l: any) => ({
      id: l.id,
      level_code: l.level_code,
      color: l.color || '#6b7280',
      is_sensitive: l.is_sensitive || 0,
      sort: computeLevelSort(l),
    }))

    // 如果规则表为空，用默认规则初始化
    if (rulesTable.value.length === 0) {
      rulesTable.value = getDefaultRules()
      saveRules(rulesTable.value)
    }

    evaluationRecords.value = loadRecords()
    await Promise.all([fetchStatisticsForCards(), fetchTypeLevelChart(), fetchLevelCountChart()])
  } finally { pageLoading.value = false }
}

async function handleRefresh() {
  refreshing.value = true
  try {
    await loadAll()
    ElMessage.success('刷新成功')
  } finally { refreshing.value = false }
}

function handleResize() {
  typeLevelChart?.resize()
  levelCountChart?.resize()
  reportLevelChart?.resize()
}

// ===== 执行评估 =====
async function handleExecuteEvaluation() {
  evaluating.value = true
  try {
    // 1. 从数据目录获取已人工分类的字段
    const items = await fetchDirectoryForEvaluation()

    if (!items || items.length === 0) {
      ElMessage.warning('数据目录中暂无已分类字段，请先进行数据分类')
      return
    }

    // 2. 按数据类型聚合统计字段数
    const typeFieldMap: Record<string, number> = {}
    const assetSet = new Set<string>()

    items.forEach((item: any) => {
      const categoryPath = item.category_path || '未分类'
      if (!typeFieldMap[categoryPath]) typeFieldMap[categoryPath] = 0
      typeFieldMap[categoryPath]++
      if (item.asset_name) assetSet.add(item.asset_name)
    })

    // 3. 按规则计算每种类型的建议级别
    const rules = loadRules()
    const details: EvaluationDetail[] = []
    const sortedLevels = [...levels.value].sort((a, b) => a.sort - b.sort)
    const levelOrderMap: Record<string, number> = {}
    sortedLevels.forEach((l, i) => { levelOrderMap[l.level_code] = i })
    const maxSort = sortedLevels.length - 1
    let maxLevel = lowestLevel.value
    let upgradedCount = 0

    Object.entries(typeFieldMap).forEach(([dataType, fieldCount]) => {
      const rule = rules.find((r: any) =>
        dataType.includes(r.data_type) || r.data_type.includes(dataType)
      ) || {
        data_type: dataType,
        base_level: lowestLevel.value,
        threshold_1k: 1000,
        threshold_10k: 10000,
        threshold_100k: 100000,
        special_rule: '-',
      }

      const baseNum = levelOrderMap[rule.base_level] || 0
      let suggestedNum = baseNum
      let upgrade = 0
      let trigger = '-'
      let legalBasis = '-'

      // 特殊敏感信息：拉到这个类型的敏感最低级别
      const sensitiveLevel = sortedLevels.find(l => l.is_sensitive)?.level_code || sortedLevels[sortedLevels.length - 1]?.level_code
      const specialKeywords = ['身份证', '银行卡', '健康', '医疗', '生物识别', '宗教', '基因']
      const isSpecial = specialKeywords.some(k => dataType.includes(k)) || rule.special_rule?.includes(sensitiveLevel || '敏感')

      if (isSpecial && sensitiveLevel) {
        const sensitiveSort = levelOrderMap[sensitiveLevel]
        if (sensitiveSort !== undefined && sensitiveSort > baseNum) {
          suggestedNum = sensitiveSort
          upgrade = suggestedNum - baseNum
          trigger = `特殊敏感信息，最低${sensitiveLevel}`
          legalBasis = '《个人信息保护法》第28条'
        }
      }

      if (fieldCount >= (rule.threshold_100k || 100000)) {
        const up = Math.max(upgrade, 3)
        if (up > upgrade) {
          upgrade = up
          trigger = `字段数${fieldCount.toLocaleString()}，超10万阈值，+3升级`
          legalBasis = 'GB/T 42574-2023 / JR/T 0171-2020'
        }
        suggestedNum = Math.min(baseNum + 3, maxSort)
      } else if (fieldCount >= (rule.threshold_10k || 10000)) {
        const up = Math.max(upgrade, 2)
        if (up > upgrade) {
          upgrade = up
          trigger = `字段数${fieldCount.toLocaleString()}，超1万阈值，+2升级`
          legalBasis = 'GB/T 42574-2023 / JR/T 0171-2020'
        }
        suggestedNum = Math.min(baseNum + 2, maxSort)
      } else if (fieldCount >= (rule.threshold_1k || 1000)) {
        const up = Math.max(upgrade, 1)
        if (up > upgrade) {
          upgrade = up
          trigger = `字段数${fieldCount.toLocaleString()}，超1千阈值，+1升级`
          legalBasis = '《数据安全法》第21条'
        }
        suggestedNum = Math.min(baseNum + 1, maxSort)
      } else if (!isSpecial) {
        trigger = `字段数${fieldCount.toLocaleString()}，未超过阈值，不升级`
        legalBasis = '《数据安全法》第21条'
      }

      const suggestedLevel = sortedLevels[suggestedNum]?.level_code || highestLevel.value

      if (levelOrderMap[suggestedLevel] > levelOrderMap[maxLevel]) {
        maxLevel = suggestedLevel
      }
      if (upgrade > 0) upgradedCount++

      details.push({
        data_type: dataType,
        field_count: fieldCount,
        base_level: rule.base_level,
        suggested_level: suggestedLevel,
        upgrade,
        trigger,
        legal_basis: legalBasis,
      })
    })

    // 4. 排序
    details.sort((a, b) => b.field_count - a.field_count)

    // 5. 如果有触发升级的，先让用户确认
    const upgradedDetails = details.filter(d => d.upgrade > 0)
    if (upgradedDetails.length > 0) {
      // 构建确认消息
      const upgradeListHtml = upgradedDetails.map(d =>
        `<b>${d.data_type}</b>：${d.base_level} → <b>${d.suggested_level}</b>（${d.field_count.toLocaleString()}字段，${d.trigger}）`
      ).join('<br>')

      try {
        await ElMessageBox.confirm(
          `<div style="text-align:left;line-height:1.8">以下数据类型触发升级，请确认：<br><br>${upgradeListHtml}<br><br>确认后将保存本次评估记录。</div>`,
          `评估结果确认（${upgradedDetails.length}项需确认）`,
          {
            confirmButtonText: '确认保存',
            cancelButtonText: '取消',
            type: 'warning',
            dangerouslyUseHTMLString: true,
          }
        )
      } catch {
        evaluating.value = false
        return
      }
    }

    // 6. 生成评估摘要
    const upgradedTypes = details.filter(d => d.upgrade > 0).map(d => d.data_type)
    const summary = upgradedTypes.length > 0
      ? `触发升级：${upgradedTypes.slice(0, 3).join('、')}${upgradedTypes.length > 3 ? '等' : ''}`
      : '各数据类型均未触发升级'

    // 7. 生成评估记录
    const record: EvaluationRecord = {
      id: Date.now(),
      executed_at: new Date().toLocaleString('zh-CN'),
      total_fields: items.length,
      total_assets: assetSet.size,
      max_level: maxLevel,
      upgraded_count: upgradedCount,
      summary,
      details,
    }

    // 8. 保存记录（插入到最前面）
    const records = [record, ...evaluationRecords.value].slice(0, 50)
    evaluationRecords.value = records
    saveRecords(records)

    // 9. 更新卡片和图表
    await Promise.all([fetchStatisticsForCards(), fetchTypeLevelChart(), fetchLevelCountChart()])

    ElMessage.success(`评估完成：参与${items.length}个字段，${assetSet.size}个资产，最高${maxLevel}`)
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '评估执行失败')
    }
  } finally {
    evaluating.value = false
  }
}

// ===== 规则操作 =====
function handleAddRule() {
  editingRuleIndex.value = -1
  ruleEditTitle.value = '新增规则'
  Object.assign(ruleForm, { data_type: '', base_level: lowestLevel.value, threshold_1k: null, threshold_10k: null, threshold_100k: null, special_rule: '' })
  showRuleEditDialog.value = true
}

function handleEditRule(row: any, index: number) {
  editingRuleIndex.value = index
  ruleEditTitle.value = '编辑规则'
  Object.assign(ruleForm, { ...row })
  showRuleEditDialog.value = true
}

function handleSaveRule() {
  if (!ruleForm.data_type || !ruleForm.base_level) {
    ElMessage.warning('请填写数据类型和基础级别')
    return
  }
  if (editingRuleIndex.value >= 0) {
    rulesTable.value[editingRuleIndex.value] = { ...ruleForm }
    ElMessage.success('规则更新成功')
  } else {
    rulesTable.value.push({ ...ruleForm })
    ElMessage.success('规则新增成功')
  }
  saveRules(rulesTable.value)
  showRuleEditDialog.value = false
}

// ===== 报告 =====
async function showReport() {
  reportData.generated_at = new Date().toLocaleString('zh-CN')
  reportData.evaluation = lastEvaluation.value
  showReportDialog.value = true
  await nextTick()
}

function handleExportReport() {
  if (!lastEvaluation.value) {
    ElMessage.warning('暂无评估数据可导出')
    return
  }
  // TODO: 调用后端导出接口
  ElMessage.info('导出功能（待后端对接）')
}

// ===== 生命周期 =====
onMounted(async () => {
  await loadAll()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  ;(typeLevelChart as any)?.dispose()
  ;(levelCountChart as any)?.dispose()
  ;(reportLevelChart as any)?.dispose()
})
</script>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 8px; }
.header-actions .el-button { display: flex; align-items: center; gap: 4px; }
.btn-icon { display: flex; align-items: center; }
.page-body { min-height: 400px; }

.stat-cards {
  display: grid; grid-template-columns: repeat(6, 1fr);
  gap: 16px; margin-bottom: 20px;
}
.stat-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 12px; background: #fff;
  border: 1px solid #e5e6eb; border-radius: 8px; cursor: default;
}
.stat-card-icon {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
}
.stat-card-body { flex: 1; min-width: 0; }
.stat-label { font-size: 12px; font-weight: 500; color: #86909c; margin-bottom: 4px; white-space: nowrap; }
.stat-value { font-size: 20px; font-weight: 700; line-height: 1.25; }

@media (max-width: 1400px) { .stat-cards { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } }

.charts-row {
  display: grid; grid-template-columns: 1fr 1fr;
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

/* 评估记录 */
.record-section { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #f2f3f5;
}
.section-title { font-size: 14px; font-weight: 600; color: #1d2129; }
.record-summary { font-size: 12px; color: #6b7280; }

/* 抽屉 */
.drawer-body { padding: 0 16px; }
.drawer-toolbar { margin-bottom: 16px; }
.threshold-val { font-size: 12px; }

.rules-legend { margin-top: 24px; padding: 12px; background: #f9fafb; border-radius: 8px; }
.legend-title { font-size: 13px; font-weight: 600; color: #1d2129; margin-bottom: 8px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280; margin-bottom: 6px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.drawer-law { margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 8px; }
.law-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #374151; margin-bottom: 8px; }
.law-tag { background: #2563eb; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 11px; white-space: nowrap; flex-shrink: 0; }

/* 工具抽屉 */
.tool-intro { background: #eff6ff; padding: 12px; border-radius: 8px; font-size: 13px; color: #374151; line-height: 1.6; }
.tool-intro p { margin: 0; }
.tool-current-rules { margin: 8px 0; }
.tool-rules-title { font-size: 13px; font-weight: 600; color: #1d2129; margin-bottom: 8px; }

.tool-result { background: #f9fafb; border-radius: 8px; padding: 12px; }
.tool-result-title { font-size: 14px; font-weight: 600; color: #1d2129; margin-bottom: 10px; }
.tool-result-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; }
.tool-result-label { color: #86909c; flex-shrink: 0; }
.tool-result-val { color: #374151; font-weight: 500; }
.tool-result-detail { margin-top: 12px; }
.tool-result-detail-title { font-size: 12px; font-weight: 600; color: #1d2129; margin-bottom: 6px; }

/* 报告弹窗 */
.report-content { max-height: 60vh; overflow-y: auto; }
.report-header { margin-bottom: 8px; }
.report-title { font-size: 18px; font-weight: 700; color: #1d2129; }
.report-meta { font-size: 12px; color: #86909c; margin-top: 4px; }
.report-section { margin-bottom: 20px; }
.report-section-title { font-size: 14px; font-weight: 600; color: #1d2129; margin-bottom: 12px; }
.report-stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.report-stat { text-align: center; padding: 12px; background: #f9fafb; border-radius: 8px; }
.report-stat-value { font-size: 22px; font-weight: 700; color: #2563eb; }
.report-stat-label { font-size: 12px; color: #86909c; margin-top: 2px; }
.report-law-list { display: flex; flex-direction: column; gap: 8px; }
.report-law-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #374151; padding: 8px; background: #f9fafb; border-radius: 6px; }
.report-law-code { background: #2563eb; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 11px; white-space: nowrap; flex-shrink: 0; }
.report-empty { text-align: center; padding: 40px; color: #9ca3af; font-size: 14px; }

/* 规则编辑 */
.form-tip { font-size: 11px; color: #9ca3af; margin-top: 2px; }
</style>

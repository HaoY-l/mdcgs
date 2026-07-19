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
        <el-button size="small" @click="handleRefresh" :loading="refreshing">
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
        <div class="chart-card" style="cursor: pointer">
          <div class="chart-header">
            <span class="chart-title">一级分类占比</span>
          </div>
          <div ref="typeLevelChartRef" class="chart-body" v-loading="typeLevelLoading"></div>
        </div>
        <div class="chart-card" style="cursor: pointer">
          <div class="chart-header">
            <span class="chart-title">各级别数量</span>
          </div>
          <div ref="levelCountChartRef" class="chart-body" v-loading="levelCountLoading"></div>
        </div>
      </div>

      <div class="chart-card-full">
        <div class="chart-header">
          <span class="chart-title">二级分类数量趋势</span>
        </div>
        <!-- 自定义图例 -->
        <div class="trend-legend" v-if="trendCategories.length > 0">
          <span
            v-for="cat in trendCategories"
            :key="cat"
            class="trend-legend-item"
            :class="{ active: selectedTrendCategory === cat }"
            :style="{ borderColor: selectedTrendCategory && selectedTrendCategory !== cat ? '#e5e7eb' : getTrendColor(cat) }"
            @click="toggleTrendCategory(cat)"
          >
            {{ cat }}
          </span>
          <span v-if="selectedTrendCategory" class="trend-legend-clear" @click="clearTrendFilter">× 清除</span>
        </div>
        <div ref="trendChartRef" class="chart-body" v-loading="trendLoading"></div>
      </div>

      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">按业务部门级别分布</span>
          </div>
          <div ref="deptLevelChartRef" class="chart-body" v-loading="deptLevelLoading"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">按应用系统级别分布</span>
          </div>
          <div ref="systemLevelChartRef" class="chart-body" v-loading="systemLevelLoading"></div>
        </div>
      </div>

      <!-- 最新评估结果 -->
      <div v-if="lastEvaluation" class="result-section">
        <div class="section-header">
          <span class="section-title">最新评估结果</span>
          <span class="section-meta">{{ lastEvaluation.executed_at }}</span>
          <div class="section-actions">
            <el-button size="small" type="primary" @click="applySuggestedLevels">应用建议级</el-button>
            <el-button size="small" @click="exportEvaluationCSV">导出CSV</el-button>
          </div>
        </div>
        <div class="result-summary">
          <div class="result-stat">
            <span class="result-stat-val">{{ lastEvaluation.total_fields?.toLocaleString() }}</span>
            <span class="result-stat-label">参与字段</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-val">{{ lastEvaluation.total_assets }}</span>
            <span class="result-stat-label">涉及资产</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-val" :style="{ color: levelColorMap[lastEvaluation.max_level] }">{{ lastEvaluation.max_level }}</span>
            <span class="result-stat-label">最高级别</span>
          </div>
          <div class="result-stat">
            <span class="result-stat-val" style="color:#f59e0b">{{ lastEvaluation.upgraded_count }}</span>
            <span class="result-stat-label">触发升级</span>
          </div>
        </div>
        <el-table :data="lastEvaluation.details" stripe border size="small" max-height="400">
          <el-table-column prop="data_type" label="数据类型" min-width="140" show-overflow-tooltip />
          <el-table-column prop="field_count" label="字段数" width="80" align="center">
            <template #default="{ row }">{{ row.field_count?.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="基础级" width="75" align="center">
            <template #default="{ row }">
              <el-tag size="small" :style="{ backgroundColor: levelColorMap[row.base_level], color: '#fff', border: 'none' }">{{ row.base_level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="建议级" width="75" align="center">
            <template #default="{ row }">
              <el-tag size="small" :style="{ backgroundColor: levelColorMap[row.suggested_level], color: '#fff', border: 'none' }">{{ row.suggested_level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="升级" width="60" align="center">
            <template #default="{ row }">
              <span v-if="row.upgrade > 0" style="color:#ef4444;font-weight:600">+{{ row.upgrade }}</span>
              <span v-else style="color:#9ca3af">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="trigger" label="触发原因" min-width="140" show-overflow-tooltip />
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row, $index }">
              <el-button link type="primary" size="small" @click="openChangeLevelDialog(row, $index)">变更</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else class="result-empty">
        <p>暂无评估结果，请点击「工具 → 同步」获取数据</p>
      </div>
    </div>

    <!-- 规则抽屉 -->
    <el-drawer v-model="showRulesDrawer" title="量级定级规则" size="600px" direction="rtl">
      <div class="drawer-body">
        <div class="drawer-toolbar">
          <el-select v-model="selectedTemplateId" placeholder="选择模板" size="small" style="width: 180px; margin-right: 8px" filterable>
            <el-option
              v-for="t in templateOptions"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
          <el-button type="primary" size="small" @click="handleSync" :loading="syncing" :disabled="!selectedTemplateId">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            同步
          </el-button>
        </div>
        <el-table :data="rulesTable" stripe border size="small" max-height="360">
          <el-table-column prop="data_type" label="数据类型" min-width="130" />
          <el-table-column prop="base_level" label="基础级别" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="levelTagType(row.base_level)">{{ row.base_level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="threshold_1k" label="梯度1" width="80" align="center">
            <template #default="{ row }">
              <span class="threshold-val">{{ row.threshold_1k && row.threshold_1k.toLocaleString() || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="threshold_10k" label="梯度2" width="85" align="center">
            <template #default="{ row }">
              <span class="threshold-val">{{ row.threshold_10k && row.threshold_10k.toLocaleString() || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="threshold_100k" label="梯度3" width="90" align="center">
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

    <!-- 工具抽屉：简化为只执行评估 -->
    <el-drawer v-model="showToolDrawer" title="量级评估" size="480px" direction="rtl">
      <div class="drawer-body">
        <div class="tool-intro">
          <p>点击「立即执行」按钮，系统将自动从<strong>数据目录</strong>获取所有已人工分类标记的字段，按数据量规模计算建议级别，生成评估记录。</p>
          <p style="margin-top:8px;color:#6b7280;font-size:12px">每次执行都会从后端实时拉取最新数据，不使用任何预设假数据。</p>
        </div>
        <el-divider />
        <div class="tool-schedule">
          <div class="tool-schedule-title">定期执行（可选）</div>
          <div class="tool-schedule-row">
            <span class="tool-schedule-label">定期执行：</span>
            <el-switch v-model="scheduleEnabled" size="small" />
          </div>
          <div v-if="scheduleEnabled" class="tool-schedule-config">
            <el-select v-model="scheduleCron" size="small" style="width:100%;margin-bottom:8px">
              <el-option label="每天凌晨 2:00" value="0 2 * * *" />
              <el-option label="每周一凌晨 2:00" value="0 2 * * 1" />
              <el-option label="每月1号凌晨 2:00" value="0 2 1 * *" />
            </el-select>
            <div class="tool-schedule-tip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              定期任务由后端 Celery 执行，不依赖前端页面打开
            </div>
          </div>
        </div>
        <el-divider />
        <el-button type="primary" size="default" style="width:100%;margin-bottom:12px" @click="handleExecuteEvaluation" :loading="evaluating">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          {{ scheduleEnabled ? '保存并执行' : '立即执行' }}
        </el-button>

        <!-- 评估结果（最新一次） -->
        <div v-if="lastEvaluation" class="tool-result">
          <div class="tool-result-title">
            <span>评估结果</span>
            <span class="tool-result-time">{{ lastEvaluation.executed_at }}</span>
          </div>
          <div class="tool-result-summary">
            <span>参与字段：<strong>{{ lastEvaluation.total_fields?.toLocaleString() }}</strong> 条</span>
            <span>涉及资产：<strong>{{ lastEvaluation.total_assets }}</strong> 个</span>
            <span>最高级别：<el-tag size="small" :type="levelTagType(lastEvaluation.max_level)">{{ lastEvaluation.max_level }}</el-tag></span>
            <span>触发升级：<strong style="color:#f59e0b">{{ lastEvaluation.upgraded_count }}</strong> 条</span>
          </div>
          <el-divider style="margin: 12px 0" />
          <div class="tool-result-detail">
            <div class="tool-result-detail-title">评估明细（支持变更级别）</div>
            <el-table :data="lastEvaluation.details" stripe border size="small" max-height="400">
              <el-table-column prop="data_type" label="数据类型" min-width="100" />
              <el-table-column prop="field_count" label="字段数" width="70" align="center">
                <template #default="{ row }">{{ row.field_count?.toLocaleString() }}</template>
              </el-table-column>
              <el-table-column label="基础级" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :style="{ backgroundColor: levelColorMap[row.base_level], color: '#fff', border: 'none' }">{{ row.base_level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="建议级" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :style="{ backgroundColor: levelColorMap[row.suggested_level], color: '#fff', border: 'none' }">{{ row.suggested_level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="upgrade" label="升级" width="55" align="center">
                <template #default="{ row }">
                  <span v-if="row.upgrade > 0" style="color:#ef4444;font-weight:600">+{{ row.upgrade }}</span>
                  <span v-else style="color:#9ca3af">-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" align="center">
                <template #default="{ row, $index }">
                  <el-button link type="primary" size="small" @click="openChangeLevelDialog(row, $index)">变更</el-button>
                </template>
              </el-table-column>
              <el-table-column prop="trigger" label="触发原因" min-width="120" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
        <div v-else class="tool-empty">
          <p>暂无评估结果，请先执行评估</p>
        </div>
      </div>
    </el-drawer>

    <!-- 变更级别弹窗 -->
    <el-dialog v-model="showChangeLevelDialog" title="变更级别" width="400px">
      <el-form :model="changeLevelForm" label-width="80px" size="small">
        <el-form-item label="数据类型">
          <span>{{ changeLevelForm.data_type }}</span>
        </el-form-item>
        <el-form-item label="当前级别">
          <el-tag size="small" :style="{ backgroundColor: levelColorMap[changeLevelForm.current_level], color: '#fff', border: 'none' }">{{ changeLevelForm.current_level }}</el-tag>
        </el-form-item>
        <el-form-item label="新级别" required>
          <el-select v-model="changeLevelForm.new_level" placeholder="选择新级别" style="width: 100%">
            <el-option v-for="l in levelOptions" :key="l.value" :label="l.label" :value="l.value" />
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
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { getDirectory, getLevelRatio, getStatistics, getLevelDistribution } from '@/api/overview'
import { getLevels, getTemplates, getCategoryTree } from '@/api/classification'
import client from '@/api/client'

// ===== 状态 =====
const pageLoading = ref(false)
const refreshing = ref(false)
const showRulesDrawer = ref(false)
const showToolDrawer = ref(false)

watch(showRulesDrawer, async (val) => {
  if (val) {
    // 抽屉打开时加载模板列表
    try {
      const res = await getTemplates({ is_active: 1 })
      const list = res.data?.items || res.data || []
      templateOptions.value = list
      // 默认选中第一个有分类数据的模板（而非列表第一个）
      if (!selectedTemplateId.value && list.length > 0) {
        const firstWithCategories = list.find((t: any) => (t.category_count || 0) > 0)
        selectedTemplateId.value = firstWithCategories?.id || list[0].id
      }
    } catch { /* ignore */ }
  }
})
const showReportDialog = ref(false)
const showRuleEditDialog = ref(false)
const ruleEditTitle = ref('编辑规则')
const evaluating = ref(false)
const syncing = ref(false)
const reportLoading = ref(false)
const recordsLoading = ref(false)
const typeLevelLoading = ref(false)
const levelCountLoading = ref(false)
const trendLoading = ref(false)
const deptLevelLoading = ref(false)
const systemLevelLoading = ref(false)
const scheduleEnabled = ref(false)
const scheduleCron = ref('0 2 * * *')
const showTrendChart = ref(true)
const trendCategories = ref<string[]>([])
const selectedTrendCategory = ref('')

function handleSelectTrendCategory(category: string) {
  selectedTrendCategory.value = category
  fetchTrendChart()
}

function clearTrendFilter() {
  selectedTrendCategory.value = ''
  fetchTrendChart()
}

// 应用建议级：将所有明细的建议级更新为基础级
function applySuggestedLevels() {
  if (!lastEvaluation.value) return
  ElMessageBox.confirm('确定要将所有明细的建议级更新为基础级吗？', '确认应用', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    let appliedCount = 0
    lastEvaluation.value.details.forEach((d: EvaluationDetail) => {
      if (d.upgrade > 0) {
        d.base_level = d.suggested_level
        d.upgrade = 0
        d.trigger = '已应用建议级'
        appliedCount++
      }
    })
    saveRecords(evaluationRecords.value)
    ElMessage.success(`已应用 ${appliedCount} 个分类的建议级`)
  }).catch(() => {})
}

// 导出评估结果为 CSV
function exportEvaluationCSV() {
  if (!lastEvaluation.value) return
  const details = lastEvaluation.value.details
  const headers = ['数据类型', '字段数', '基础级', '建议级', '升级', '触发原因']
  const rows = details.map((d: EvaluationDetail) => [
    d.data_type,
    d.field_count,
    d.base_level,
    d.suggested_level,
    d.upgrade,
    d.trigger,
  ])
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `数量分级评估_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function toggleTrendCategory(cat: string) {
  if (selectedTrendCategory.value === cat) {
    selectedTrendCategory.value = ''
  } else {
    selectedTrendCategory.value = cat
  }
  fetchTrendChart()
}

function getTrendColor(name: string): string {
  const idx = trendCategories.value.indexOf(name)
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
  return colors[idx % colors.length]
}

// 级别颜色映射（用于表格中动态颜色）
const levelColorMap = computed(() => {
  const m: Record<string, string> = {}
  levels.value.forEach(l => { m[l.level_code] = l.color || '#6b7280' })
  return m
})

// ===== 变更级别弹窗 =====
const showChangeLevelDialog = ref(false)
const changeLevelForm = reactive({
  data_type: '',
  current_level: '',
  new_level: '',
  reason: '',
  detailIndex: -1,
})

function openChangeLevelDialog(row: any, index: number) {
  changeLevelForm.data_type = row.data_type
  changeLevelForm.current_level = row.suggested_level
  changeLevelForm.new_level = row.suggested_level
  changeLevelForm.reason = ''
  changeLevelForm.detailIndex = index
  showChangeLevelDialog.value = true
}

function handleConfirmLevelChange() {
  if (!changeLevelForm.new_level) {
    ElMessage.warning('请选择新级别')
    return
  }
  const idx = changeLevelForm.detailIndex
  if (idx >= 0 && lastEvaluation.value?.details[idx]) {
    const detail = lastEvaluation.value.details[idx]
    detail.suggested_level = changeLevelForm.new_level
    // 重新计算是否触发升级
    const baseNum = levelOrderMapRef[detail.base_level] ?? 0
    const newNum = levelOrderMapRef[changeLevelForm.new_level] ?? 0
    detail.upgrade = Math.max(0, newNum - baseNum)
    detail.trigger = changeLevelForm.reason || '人工变更级别'
    // 保存更新后的记录
    saveRecords(evaluationRecords.value)
    ElMessage.success('级别变更成功')
  }
  showChangeLevelDialog.value = false
}

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
  { color: '#f59e0b', text: `数量 ≥ 梯度1：+1级` },
  { color: '#f97316', text: `数量 ≥ 梯度2：+2级` },
  { color: '#ef4444', text: `数量 ≥ 梯度3：+3级或强制${highestLevel.value}` },
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
  return []
}

function saveRules(rules: any[]) {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules))
}

// 从模板分类目录获取真实的数据类型和级别
interface CategoryItem {
  name: string
  level_code: string
}
async function fetchDataTypesFromTemplate(templateId: number): Promise<CategoryItem[]> {
  try {
    // 获取分类树
    const treeRes = await getCategoryTree(templateId)
    const tree = treeRes.data || []

    // 收集所有二级分类的名称和级别
    const categoryMap = new Map<string, string>()
    tree.forEach((cat: any) => {
      if (cat.children) {
        cat.children.forEach((child: any) => {
          if (child.name) {
            // 二级分类直接用二级分类的级别
            categoryMap.set(child.name, child.level_code || '')
          }
        })
      }
      // 如果没有二级分类，一级分类也算
      if (!cat.children && cat.name) {
        categoryMap.set(cat.name, cat.level_code || '')
      }
    })

    // 转为数组
    return Array.from(categoryMap.entries()).map(([name, level_code]) => ({
      name,
      level_code: level_code || 'L1',
    }))
  } catch {
    return []
  }
}

function buildRulesFromDataTypes(categories: CategoryItem[]) {
  // 默认阈值
  const defaultThreshold1k = 1000
  const defaultThreshold10k = 10000
  const defaultThreshold100k = 100000

  return categories.map(cat => ({
    data_type: cat.name,
    base_level: cat.level_code || 'L1',
    threshold_1k: defaultThreshold1k,
    threshold_10k: defaultThreshold10k,
    threshold_100k: defaultThreshold100k,
    special_rule: '-',
  }))
}

const rulesTable = ref<any[]>([])
const templateOptions = ref<any[]>([])
const selectedTemplateId = ref<number | null>(null)

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
const trendChartRef = ref<HTMLElement | null>(null)
const deptLevelChartRef = ref<HTMLElement | null>(null)
const systemLevelChartRef = ref<HTMLElement | null>(null)
const reportLevelChartRef = ref<HTMLElement | null>(null)
let typeLevelChart: echarts.ECharts | null = null
let levelCountChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let deptLevelChart: echarts.ECharts | null = null
let systemLevelChart: echarts.ECharts | null = null
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
// 分页获取所有字段，前端过滤出已分级的
async function fetchDirectoryForEvaluation() {
  const allItems: any[] = []
  let page = 1
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const res = await getDirectory({ page, page_size: pageSize })
    const items = res.data?.items || res.data || []
    allItems.push(...items)
    if (!items || items.length < pageSize) {
      hasMore = false
    } else {
      page++
    }
  }

  // 前端过滤：只保留有 level 的字段
  return allItems.filter((item: any) => item.level)
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

    // 按一级分类聚合（从数据类型名称中提取，去掉最后一个">"之后的部分）
    const firstLevelMap: Record<string, number> = {}
    last.details.forEach((d: EvaluationDetail) => {
      const firstLevel = d.data_type.split('>')[0].trim() || '其他'
      firstLevelMap[firstLevel] = (firstLevelMap[firstLevel] || 0) + d.field_count
    })

    const seriesData = Object.entries(firstLevelMap).map(([name, value]) => ({ name, value }))
    const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

    typeLevelChart?.setOption({
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, enterable: true, confine: false, appendToBody: true, formatter: (p: any) => {
        const total = seriesData.reduce((sum, d) => sum + d.value, 0)
        const percent = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0'
        return `<div style="max-width:200px;white-space:normal;word-wrap:break-word;">${p.name}<br/>占比: ${percent}%<br/>数量: ${p.value.toLocaleString()}</div>`
      }},
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '50%'],
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#374151' },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: seriesData.map((d, i) => ({ ...d, itemStyle: { color: chartColors[i % chartColors.length] } })),
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
    if (!last || !last.details?.length) {
      levelCountChart?.setOption({
        series: [{ type: 'bar', data: [] }],
      }, true)
      return
    }

    // 按建议级别聚合
    const sortedLevels = [...levels.value].sort((a, b) => a.sort - b.sort)
    const levelAgg: Record<string, number> = {}
    sortedLevels.forEach(l => { levelAgg[l.level_code] = 0 })

    last.details.forEach((d: EvaluationDetail) => {
      if (d.suggested_level && levelAgg[d.suggested_level] !== undefined) {
        levelAgg[d.suggested_level] += d.field_count
      }
    })

    const chartData = sortedLevels.map(l => ({ level: l.level_code, count: levelAgg[l.level_code] || 0 }))

    levelCountChart?.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, enterable: true, confine: false, appendToBody: true, formatter: (params: any[]) => {
        const p = params[0]
        return `<div style="max-width:200px;white-space:normal;word-wrap:break-word;">${p.name}<br/>数量: ${p.value?.toLocaleString() || 0}</div>`
      }},
      grid: { left: 60, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: chartData.map(d => d.level), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 12, color: '#6b7280' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: [{
        type: 'bar', data: chartData.map(d => ({
          value: d.count,
          itemStyle: { color: levelColorMap.value[d.level] || '#6b7280', borderRadius: [4, 4, 0, 0] }
        })),
        barWidth: 40,
      }]
    }, true)
  } finally { levelCountLoading.value = false }
}

async function fetchTrendChart() {
  trendLoading.value = true
  try {
    await nextTick()
    if (!trendChart && trendChartRef.value) {
      trendChart = echarts.init(trendChartRef.value)
    }

    // 从历史评估记录中提取趋势数据
    if (evaluationRecords.value.length === 0) {
      trendChart?.setOption({
        series: [{ type: 'line', data: [] }],
      }, true)
      trendCategories.value = []
      return
    }

    // 按时间顺序，取最近10条记录
    const recentRecords = [...evaluationRecords.value].reverse().slice(-10)

    // 提取二级分类名称（最后一个">"之后的部分）
    const secondLevelSet = new Set<string>()
    recentRecords.forEach(record => {
      record.details?.forEach((d: EvaluationDetail) => {
        const parts = d.data_type.split('>')
        const secondLevel = parts[parts.length - 1]?.trim() || d.data_type
        secondLevelSet.add(secondLevel)
      })
    })
    const secondLevels = Array.from(secondLevelSet)
    trendCategories.value = secondLevels

    // 如果选择了特定分类，只显示该分类
    const filteredLevels = selectedTrendCategory.value
      ? secondLevels.filter(l => l === selectedTrendCategory.value)
      : secondLevels

    // 构建每个二级分类的时间序列数据
    const seriesData = filteredLevels.map((secondLevel, idx) => {
      const data = recentRecords.map(record => {
        const detail = record.details?.find((d: EvaluationDetail) => {
          const parts = d.data_type.split('>')
          const name = parts[parts.length - 1]?.trim()
          return name === secondLevel
        })
        return detail?.field_count || 0
      })
      return {
        name: secondLevel,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
      }
    })

    const dates = recentRecords.map(r => r.executed_at.split(' ')[0] || r.executed_at.substring(5, 10))
    const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

    trendChart?.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 }, enterable: true, confine: false, appendToBody: true, formatter: (params: any[]) => {
        let result = `<div style="max-width:300px;white-space:normal;word-wrap:break-word;">${params[0].axisValue}<br/>`
        params.forEach(p => {
          result += `<span style="color:${p.color};">●</span> ${p.seriesName}: <b>${p.value?.toLocaleString() || 0}</b><br/>`
        })
        return result + '</div>'
      }},
      legend: { show: false },
      grid: { left: 50, right: 16, top: 16, bottom: selectedTrendCategory.value ? 16 : 50 },
      xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 11, color: '#6b7280' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: seriesData.map((s, i) => ({ ...s, itemStyle: { color: chartColors[i % chartColors.length] }, lineStyle: { color: chartColors[i % chartColors.length], width: 2 } })),
    }, true)

    // 注册趋势图点击事件，点击图例时筛选
    if (trendChart) {
      trendChart.off('legendselectchanged')
      trendChart.on('legendselectchanged', (params: any) => {
        // ECharts 默认会切换图例选中状态，我们需要覆盖它
        const name = params.name
        const isSelected = params.selected?.[name]

        if (isSelected) {
          // 选中了这个图例
          selectedTrendCategory.value = name
        } else {
          // 取消选中
          selectedTrendCategory.value = ''
        }
        fetchTrendChart()
      })
    }
  } finally { trendLoading.value = false }
}

async function fetchDeptLevelChart() {
  deptLevelLoading.value = true
  try {
    const res = await getLevelDistribution({ group_by: 'business_dept' })
    const data = res.data || {}
    const groups = data.distribution || []
    const levelCodes = data.levels || []
    if (!deptLevelChart && deptLevelChartRef.value) {
      deptLevelChart = echarts.init(deptLevelChartRef.value)
    }
    if (!groups.length) { deptLevelChart?.setOption({ series: [] }, true); return }
    const names = groups.map((g: any) => g.group)
    const colors = levelCodes.map((lc: string) => levelColorMap.value[lc] || '#6b7280')
    deptLevelChart?.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { show: false },
      grid: { left: 50, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', data: names, axisLabel: { fontSize: 11, color: '#9ca3af', rotate: names.length > 4 ? 25 : 0, interval: 0, overflow: 'truncate', width: 72 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: levelCodes.map((lc: string, i: number) => ({
        name: lc, type: 'bar', stack: 'total', barCategoryGap: '30%',
        data: groups.map((g: any) => g[lc] || 0),
        itemStyle: { color: colors[i], borderRadius: [0, 0, 0, 0] },
      })),
    }, true)
  } finally { deptLevelLoading.value = false }
}

async function fetchSystemLevelChart() {
  systemLevelLoading.value = true
  try {
    const res = await getLevelDistribution({ group_by: 'app_system' })
    const data = res.data || {}
    const groups = data.distribution || []
    const levelCodes = data.levels || []
    if (!systemLevelChart && systemLevelChartRef.value) {
      systemLevelChart = echarts.init(systemLevelChartRef.value)
    }
    if (!groups.length) { systemLevelChart?.setOption({ series: [] }, true); return }
    const names = groups.map((g: any) => g.group)
    const colors = levelCodes.map((lc: string) => levelColorMap.value[lc] || '#6b7280')
    systemLevelChart?.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#1e293b', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { show: false },
      grid: { left: 50, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', data: names, axisLabel: { fontSize: 11, color: '#9ca3af', rotate: names.length > 4 ? 25 : 0, interval: 0, overflow: 'truncate', width: 72 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
      series: levelCodes.map((lc: string, i: number) => ({
        name: lc, type: 'bar', stack: 'total', barCategoryGap: '30%',
        data: groups.map((g: any) => g[lc] || 0),
        itemStyle: { color: colors[i], borderRadius: [0, 0, 0, 0] },
      })),
    }, true)
  } finally { systemLevelLoading.value = false }
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

    // 初始化 levelOrderMapRef
    initLevelOrderMapRef()

    // 如果规则表为空，从本地存储加载
    if (rulesTable.value.length === 0) {
      rulesTable.value = loadRules()
    }

    evaluationRecords.value = loadRecords()
    await Promise.all([
      fetchStatisticsForCards(), fetchTypeLevelChart(), fetchLevelCountChart(),
      fetchTrendChart(), fetchDeptLevelChart(), fetchSystemLevelChart(),
    ])
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
  trendChart?.resize()
  deptLevelChart?.resize()
  systemLevelChart?.resize()
  reportLevelChart?.resize()
}

// ===== 同步 =====
async function handleSync() {
  if (!selectedTemplateId.value) {
    ElMessage.warning('请先选择模板')
    return
  }
  syncing.value = true
  try {
    // 1. 从选中模板获取分类目录（含级别信息）
    const categories = await fetchDataTypesFromTemplate(selectedTemplateId.value)
    if (categories.length === 0) {
      ElMessage.warning('选中模板中未获取到数据类型，请先在分类模板中配置')
      return
    }

    // 2. 构建新规则，但保留用户已修改的阈值
    const existingRules = new Map(rulesTable.value.map(r => [r.data_type, r]))
    const newRules = buildRulesFromDataTypes(categories).map(newRule => {
      const existing = existingRules.get(newRule.data_type)
      if (existing) {
        // 保留用户修改过的阈值
        return { ...existing }
      }
      return newRule
    })

    rulesTable.value = newRules
    saveRules(rulesTable.value)

    // 3. 执行评估
    await handleExecuteEvaluation()

    ElMessage.success(`同步完成：共 ${categories.length} 个数据类型`)
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

// 引用 levelOrderMap（需要在 handleSync 中使用）
const levelOrderMapRef: Record<string, number> = {}

// 初始化 levelOrderMapRef
function initLevelOrderMapRef() {
  const sorted = [...levels.value].sort((a, b) => a.sort - b.sort)
  sorted.forEach((l, i) => { levelOrderMapRef[l.level_code] = i })
}

// ===== 执行评估 =====
async function handleExecuteEvaluation() {
  evaluating.value = true
  try {
    // 1. 如果启用调度，先保存调度配置到后端
    if (scheduleEnabled.value) {
      try {
        await client.post('/volume-grade/schedule', {
          enabled: true,
          cron: scheduleCron.value,
        })
      } catch {
        // 调度配置失败不影响主流程
      }
    }

    // 2. 从数据目录获取已人工分类标记的字段（level 不为空）
    const items = await fetchDirectoryForEvaluation()

    if (!items || items.length === 0) {
      ElMessage.warning('数据目录中暂无已分级字段，请先在数据目录中为字段标记级别')
      return
    }

    // 3. 先构建级别顺序映射
    const sortedLevels = [...levels.value].sort((a, b) => a.sort - b.sort)
    const levelOrderMap: Record<string, number> = {}
    sortedLevels.forEach((l, i) => { levelOrderMap[l.level_code] = i })

    // 4. 按分类路径（category_path）聚合统计字段数，同时记录每个分类的最低级别
    const typeFieldMap: Record<string, { count: number; baseLevel: string }> = {}
    const assetSet = new Set<string>()

    items.forEach((item: any) => {
      // 优先用 category_path（人工分类路径），没有则用 data_type（数据类型）
      const categoryKey = item.category_path || item.data_type || '未分类'
      if (!typeFieldMap[categoryKey]) {
        typeFieldMap[categoryKey] = { count: 0, baseLevel: '' }
      }
      typeFieldMap[categoryKey].count++

      // 记录该分类的最低级别（数字越小级别越低，取 sort 最小的）
      if (item.level) {
        const currentBase = typeFieldMap[categoryKey].baseLevel
        if (!currentBase) {
          typeFieldMap[categoryKey].baseLevel = item.level
        } else {
          const currentSort = levelOrderMap[currentBase] ?? 0
          const itemSort = levelOrderMap[item.level] ?? 0
          if (itemSort < currentSort) {
            typeFieldMap[categoryKey].baseLevel = item.level
          }
        }
      }

      if (item.asset_name) assetSet.add(item.asset_name)
    })

    // 5. 按阈值规则计算每种类型的建议级别
    const details: EvaluationDetail[] = []
    const maxSort = sortedLevels.length - 1
    let maxLevel = lowestLevel.value
    let upgradedCount = 0

    Object.entries(typeFieldMap).forEach(([dataType, { count: fieldCount, baseLevel: dataBaseLevel }]) => {
      // 找到该数据类型对应的规则（用于获取阈值）
      const rule = rulesTable.value.find((r: any) =>
        dataType.includes(r.data_type) || r.data_type.includes(dataType)
      )

      // 基础级别：优先用数据目录中该分类的实际分级，其次用规则中的基础级
      const baseLevelCode = dataBaseLevel || rule?.base_level || lowestLevel.value
      const baseNum = levelOrderMap[baseLevelCode] ?? 0
      let suggestedNum = baseNum
      let upgrade = 0
      let trigger = '-'
      let legalBasis = '-'

      // 特殊敏感信息：强制到敏感级别（从模板获取）
      const sensitiveLevelCode = sortedLevels.find(l => l.is_sensitive)?.level_code
      const specialKeywords = ['身份证', '银行卡', '健康', '医疗', '生物识别', '宗教', '基因', '护照']
      const isSpecial = specialKeywords.some(k => dataType.includes(k))

      if (isSpecial && sensitiveLevelCode) {
        const sensitiveNum = levelOrderMap[sensitiveLevelCode]
        if (sensitiveNum !== undefined && sensitiveNum > baseNum) {
          suggestedNum = sensitiveNum
          upgrade = sensitiveNum - baseNum
          trigger = `特殊敏感信息，强制${sensitiveLevelCode}`
          legalBasis = '《个人信息保护法》第28条'
        }
      }

      // 按阈值升级
      if (fieldCount >= (rule?.threshold_100k || 100000)) {
        const up = Math.max(upgrade, 3)
        if (up > upgrade) {
          upgrade = up
          trigger = `字段数${fieldCount.toLocaleString()} ≥ 10万，+3升级`
          legalBasis = 'GB/T 42574-2023 / JR/T 0171-2020'
        }
        suggestedNum = Math.min(baseNum + 3, maxSort)
      } else if (fieldCount >= (rule?.threshold_10k || 10000)) {
        const up = Math.max(upgrade, 2)
        if (up > upgrade) {
          upgrade = up
          trigger = `字段数${fieldCount.toLocaleString()} ≥ 1万，+2升级`
          legalBasis = 'GB/T 42574-2023 / JR/T 0171-2020'
        }
        suggestedNum = Math.min(baseNum + 2, maxSort)
      } else if (fieldCount >= (rule?.threshold_1k || 1000)) {
        const up = Math.max(upgrade, 1)
        if (up > upgrade) {
          upgrade = up
          trigger = `字段数${fieldCount.toLocaleString()} ≥ 1千，+1升级`
          legalBasis = '《数据安全法》第21条'
        }
        suggestedNum = Math.min(baseNum + 1, maxSort)
      } else if (!isSpecial) {
        trigger = `字段数${fieldCount.toLocaleString()}，未超阈值，不升级`
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
        base_level: baseLevelCode,
        suggested_level: suggestedLevel,
        upgrade,
        trigger,
        legal_basis: legalBasis,
      })
    })

    // 5. 按字段数降序排列
    details.sort((a, b) => b.field_count - a.field_count)

    // 6. 生成评估摘要
    const upgradedTypes = details.filter(d => d.upgrade > 0).map(d => d.data_type)
    const summary = upgradedTypes.length > 0
      ? `触发升级：${upgradedTypes.slice(0, 3).join('、')}${upgradedTypes.length > 3 ? `等${upgradedTypes.length}类` : ''}`
      : '各数据类型均未触发升级'

    // 7. 保存评估记录到后端（如果后端支持），同时保存到本地
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

    // 保存到本地存储
    const records = [record, ...evaluationRecords.value].slice(0, 50)
    evaluationRecords.value = records
    saveRecords(records)

    // 8. 更新卡片和图表
    await Promise.all([fetchStatisticsForCards(), fetchTypeLevelChart(), fetchLevelCountChart(), fetchTrendChart()])

    ElMessage.success(`评估完成：共 ${items.length} 个已分级字段，${assetSet.size} 个资产涉及，最高${maxLevel}`)
  } catch (e: any) {
    ElMessage.error(e?.message || '评估执行失败')
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
  ;(trendChart as any)?.dispose()
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
.charts-row-3 {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 16px; margin-bottom: 16px;
}
.chart-card {
  background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden;
}
.chart-card-full {
  background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden;
  margin-bottom: 16px;
}
.chart-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #f2f3f5;
}
.chart-title { font-size: 14px; font-weight: 600; color: #1d2129; }
.chart-title-left { display: flex; align-items: center; gap: 8px; }
.chart-dropdown-trigger { cursor: pointer; display: flex; align-items: center; color: #409eff; }
.chart-dropdown-trigger:hover { color: #66b1ff; }
.chart-body { height: 280px; padding: 8px; }
.chart-filter-tag { background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 400; }
.chart-filter-hint { color: #86909c; font-size: 12px; font-weight: 400; }
.trend-legend { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 16px; border-bottom: 1px solid #f2f3f5; }
.trend-legend-item { padding: 2px 10px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 12px; cursor: pointer; color: #6b7280; transition: all 0.2s; }
.trend-legend-item:hover { border-color: #409eff; color: #409eff; }
.trend-legend-item.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.trend-legend-clear { padding: 2px 10px; font-size: 12px; color: #ef4444; cursor: pointer; }
@media (max-width: 1400px) { .charts-row-3 { grid-template-columns: 1fr 1fr; } }
@media (max-width: 1200px) { .charts-row { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .charts-row-3 { grid-template-columns: 1fr; } }

/* 最新评估结果 */
.result-section { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #f2f3f5;
}
.section-title { font-size: 14px; font-weight: 600; color: #1d2129; }
.section-meta { font-size: 12px; color: #86909c; }
.section-actions { display: flex; gap: 8px; }
.result-summary { display: flex; gap: 24px; padding: 12px 16px; border-bottom: 1px solid #f2f3f5; }
.result-stat { display: flex; flex-direction: column; align-items: center; min-width: 60px; }
.result-stat-val { font-size: 20px; font-weight: 700; line-height: 1.2; }
.result-stat-label { font-size: 12px; color: #86909c; margin-top: 2px; }
.result-empty { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 40px; text-align: center; color: #9ca3af; margin-bottom: 16px; }
.result-empty p { margin: 0; }

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
.tool-result-title { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; color: #1d2129; margin-bottom: 10px; }
.tool-result-time { font-size: 12px; font-weight: 400; color: #86909c; }
.tool-result-summary { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; }
.tool-result-summary span { display: flex; align-items: center; gap: 4px; }
.tool-result-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; }
.tool-result-label { color: #86909c; flex-shrink: 0; }
.tool-result-val { color: #374151; font-weight: 500; }
.tool-result-detail { margin-top: 12px; }
.tool-result-detail-title { font-size: 12px; font-weight: 600; color: #1d2129; margin-bottom: 6px; }
.tool-empty { text-align: center; padding: 40px; color: #9ca3af; font-size: 14px; }
.tool-empty p { margin: 0; }

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

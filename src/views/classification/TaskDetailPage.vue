<template>
  <div class="page-container">
    <div class="page-header">
      <el-button text @click="goBack" style="margin-right: 12px">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h2 style="margin: 0; flex: 1">任务详情</h2>
      <el-button size="small" @click="refreshAll">刷新</el-button>
    </div>

    <!-- 基本信息栏 -->
    <el-card shadow="hover" class="info-card" v-loading="loading">
      <div class="info-bar">
        <div class="info-item">
          <span class="info-label">任务名称</span>
          <span class="info-value">{{ taskDetail.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">模板</span>
          <span class="info-value">{{ taskDetail.template_name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">执行方式</span>
          <el-tag :type="executeTypeTag(taskDetail.execute_type)" size="small" effect="plain">
            {{ executeTypeLabel(taskDetail.execute_type) }}
          </el-tag>
        </div>
        <div class="info-item">
          <span class="info-label">状态</span>
          <el-tag :type="statusTag(taskDetail.status)" size="small">
            {{ statusLabel(taskDetail.status) }}
          </el-tag>
        </div>
        <div class="info-item">
          <span class="info-label">进度</span>
          <el-progress
            :percentage="taskDetail.progress || 0"
            :stroke-width="18"
            :text-inside="true"
            style="width: 200px"
          />
        </div>
      </div>
      <div class="info-stats">
        <div class="stat-item">
          <span class="stat-value">{{ taskStats.total_tables ?? 0 }}</span>
          <span class="stat-label">总表数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ taskStats.processed_tables ?? 0 }}</span>
          <span class="stat-label">已处理</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ taskStats.sensitive_tables ?? 0 }}</span>
          <span class="stat-label">敏感表</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ taskStats.classified_fields ?? 0 }}</span>
          <span class="stat-label">已分类字段</span>
        </div>
      </div>
    </el-card>

    <!-- Tab 内容 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 表级视图 -->
        <el-tab-pane label="表级视图" name="tables">
          <div class="tab-toolbar">
            <el-input
              v-model="tableKeyword"
              placeholder="搜索表名"
              clearable
              size="small"
              style="width: 200px"
              @input="resetTableFilter"
            />
          </div>
          <el-table :data="tables" stripe style="width: 100%" v-loading="tablesLoading" max-height="500">
            <el-table-column prop="table_name" label="表名" min-width="160" />
            <el-table-column prop="comment" label="注释" min-width="160" />
            <el-table-column label="聚合级别" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.aggregation_level || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="是否敏感" min-width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small">
                  {{ row.is_sensitive ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="field_count" label="字段数" min-width="70" align="center" />
            <el-table-column prop="sensitive_count" label="敏感数" min-width="70" align="center" />
            <el-table-column label="状态" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="tableStatusTag(row.status)" size="small">
                  {{ tableStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openChangeTableLevel(row)">
                  变更级别
                </el-button>
                <el-button
                  v-if="row.level_locked"
                  link
                  type="warning"
                  size="small"
                  @click="handleUnlockTableLevel(row)"
                >
                  解锁
                </el-button>
                <el-button link type="primary" size="small" @click="switchToColumns(row)">
                  查看字段
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper" v-if="tablesTotal > 0">
            <el-pagination
              v-model:current-page="tablePage"
              :page-size="tablePageSize"
              :total="tablesTotal"
              layout="total, sizes, prev, pager, next, jumper"
              :page-sizes="[10, 20, 50, 100]"
              @size-change="handleTableSizeChange"
              @current-change="handleTablePageChange"
            />
          </div>
        </el-tab-pane>

        <!-- 字段详情 -->
        <el-tab-pane label="字段详情" name="columns">
          <div class="tab-toolbar">
            <el-input
              v-model="columnKeyword"
              placeholder="搜索关键词"
              clearable
              size="small"
              style="width: 140px; margin-right: 8px"
              @input="resetColumnFilter"
            />
            <el-input
              v-model="columnNameFilter"
              placeholder="字段名"
              clearable
              size="small"
              style="width: 120px; margin-right: 8px"
              @input="resetColumnFilter"
            />
            <el-input
              v-model="commentFilter"
              placeholder="注释"
              clearable
              size="small"
              style="width: 120px; margin-right: 8px"
              @input="resetColumnFilter"
            />
            <el-select
              v-model="columnTableFilter"
              placeholder="按表筛选"
              clearable
              size="small"
              style="width: 150px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option
                v-for="tbl in tables"
                :key="tbl.id"
                :label="tbl.table_name"
                :value="tbl.id"
              />
            </el-select>
            <el-select
              v-model="columnStatusFilter"
              placeholder="状态"
              clearable
              size="small"
              style="width: 100px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option label="待确认" value="pending" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已变更" value="changed" />
              <el-option label="已锁定" value="locked" />
            </el-select>
            <el-select
              v-model="isConfirmedFilter"
              placeholder="人工确认"
              clearable
              size="small"
              style="width: 110px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option label="已确认" value="true" />
              <el-option label="未确认" value="false" />
            </el-select>
            <el-select
              v-model="hasHitFilter"
              placeholder="规则命中"
              clearable
              size="small"
              style="width: 110px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option label="已命中" value="true" />
              <el-option label="未命中" value="false" />
            </el-select>
            <el-select
              v-model="isSensitiveFilter"
              placeholder="是否敏感"
              clearable
              size="small"
              style="width: 100px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option label="敏感" value="true" />
              <el-option label="非敏感" value="false" />
            </el-select>
            <el-button size="small" @click="showBatchDialog = true">批量操作</el-button>
          </div>
          <el-table :data="columns" stripe style="width: 100%" v-loading="columnsLoading" max-height="500">
            <el-table-column prop="column_name" label="字段名" min-width="140" />
            <el-table-column prop="comment" label="注释" min-width="140" />
            <el-table-column prop="system_type" label="系统类型" min-width="100" />
            <el-table-column label="人工类型" min-width="130">
              <template #default="{ row }">
                <!-- 已人工确认/变更过，展示值 -->
                <span v-if="row.data_type_name_manual">{{ row.data_type_name_manual }}</span>
                <!-- 未确认但系统有匹配，显示确认按钮 -->
                <el-button
                  v-else-if="row.system_type && !row.is_confirmed"
                  size="small"
                  type="primary"
                  link
                  @click="handleAcceptSystemType(row)"
                >
                  确认
                </el-button>
                <!-- 无系统匹配也无人工值 -->
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="级别" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="levelTag(row.level)" size="small">{{ row.level || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="分类路径" min-width="200">
              <template #default="{ row }">
                <span style="white-space: nowrap;">{{ (row.category_path_manual || row.category_path || '').split('>')[0] || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="是否敏感" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small" style="white-space: nowrap;">
                  {{ row.is_sensitive ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="脱敏方式" min-width="140" align="center">
              <template #default="{ row }">
                <el-select v-model="row.masking_rule_name" placeholder="选择脱敏方式" size="small" clearable style="width: 120px" @change="(val: string) => handleChangeMask(row, val)">
                  <el-option v-for="r in maskingRules" :key="r.id" :label="r.name" :value="r.name" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="加密方式" min-width="140" align="center">
              <template #default="{ row }">
                <el-select v-model="row.encryption_type_name" placeholder="选择加密方式" size="small" clearable style="width: 120px" @change="(val: string) => handleChangeEncrypt(row, val)">
                  <el-option v-for="e in encryptionTypes" :key="e.id" :label="e.name" :value="e.name" />
                </el-select>
              </template>
            </el-table-column>
                        <el-table-column label="命中率" min-width="80" align="center">
              <template #default="{ row }">
                <span>{{ row.hit_rate != null ? Number(row.hit_rate).toFixed(1) + '%' : '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleColumnSample(row)">
                  样本
                </el-button>
                <el-button link type="primary" size="small" @click="openChangeDialog(row)">
                  变更
                </el-button>
                <el-button v-if="row.system_type || row.manual_type" link type="success" size="small" @click="handleConfirmColumn(row)">
                  确认
                </el-button>
                <el-button
                  v-if="row.locked"
                  link
                  type="warning"
                  size="small"
                  @click="handleUnlockColumn(row)"
                >
                  解锁
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper" v-if="columnTotal > 0">
            <el-pagination
              v-model:current-page="columnPage"
              :page-size="columnPageSize"
              :total="columnTotal"
              layout="total, sizes, prev, pager, next, jumper"
              :page-sizes="[10, 20, 50, 100]"
              @size-change="handleColumnSizeChange"
              @current-change="handleColumnPageChange"
            />
          </div>
        </el-tab-pane>

        <!-- 分类视图 -->
        <el-tab-pane label="分类视图" name="category">
          <div v-loading="categoryLoading" style="min-height: 200px">
            <el-tree
              v-if="categoryTree.length"
              :data="categoryTree"
              :props="{ children: 'children', label: 'name' }"
              default-expand-all
              highlight-current
            >
              <template #default="{ node, data }">
                <span class="category-node">
                  <span>{{ data.name }}</span>
                  <el-tag size="small" type="info" style="margin-left: 8px">{{ data.hit_count }}</el-tag>
                </span>
              </template>
            </el-tree>
            <el-empty v-else description="暂无分类数据" />
          </div>
        </el-tab-pane>

        <!-- 统计信息 -->
        <el-tab-pane label="统计信息" name="statistics">
          <div v-loading="statsLoading" class="stats-grid">
            <div v-if="typeRatioChartData.labels.length" class="chart-box">
              <h4>类型占比</h4>
              <div style="height: 300px">
                <canvas ref="typeRatioCanvas"></canvas>
              </div>
            </div>
            <div v-if="levelDistChartData.labels.length" class="chart-box">
              <h4>级别分布</h4>
              <div style="height: 300px">
                <canvas ref="levelDistCanvas"></canvas>
              </div>
            </div>
            <el-empty v-if="!typeRatioChartData.labels.length && !levelDistChartData.labels.length" description="暂无统计数据" />
          </div>
        </el-tab-pane>

        <!-- 任务日志 -->
        <el-tab-pane label="任务日志" name="logs">
          <div class="tab-toolbar">
            <el-button size="small" @click="refreshLogs">刷新</el-button>
          </div>
          <div class="log-container" v-loading="logsLoading">
            <div v-for="log in logs" :key="log.id" class="log-entry">
              <span class="log-time">{{ log.created_at }}</span>
              <span class="log-level" :class="'log-level-' + (log.level || 'info')">
                {{ (log.level || 'INFO').toUpperCase() }}
              </span>
              <span class="log-msg">{{ log.message }}</span>
            </div>
            <el-empty v-if="!logs.length" description="暂无日志" />
          </div>
        </el-tab-pane>

        <!-- 历史记录 -->
        <el-tab-pane label="历史记录" name="history">
          <el-table :data="historyList" stripe style="width: 100%" v-loading="historyLoading">
            <el-table-column prop="id" label="执行编号" min-width="90" />
            <el-table-column prop="started_at" label="开始时间" min-width="160" />
            <el-table-column prop="finished_at" label="结束时间" min-width="160" />
            <el-table-column label="状态" min-width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status)" size="small">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="table_count" label="处理表数" min-width="80" align="center" />
            <el-table-column prop="field_count" label="处理字段" min-width="80" align="center" />
            <el-table-column prop="summary" label="摘要" min-width="200" />
            <el-table-column label="操作" min-width="160" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleViewHistory(row)"
                >
                  详情
                </el-button>
                <el-button
                  link
                  type="primary"
                  size="small"
                  :disabled="!compareTarget"
                  @click="handleCompare(row)"
                >
                  对比
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper" v-if="historyTotal > 0">
            <el-pagination
              v-model:current-page="historyPage"
              :page-size="historyPageSize"
              :total="historyTotal"
              layout="total, prev, pager, next"
              @current-change="fetchHistory"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 变更弹窗 -->
    <el-dialog v-model="showChangeDialog" title="变更字段" width="500px">
      <el-form :model="changeForm" label-width="100px">
        <el-form-item label="当前分类">
          <el-input :model-value="changeForm.current_category" disabled />
        </el-form-item>
        <el-form-item label="当前级别">
          <el-input :model-value="changeForm.current_level" disabled />
        </el-form-item>
        <el-form-item label="新分类" required>
          <el-tree-select
            v-model="changeForm.new_category_id"
            :data="categoryTreeForSelect"
            :props="{ label: 'name', value: 'id', children: 'children' } as any"
            placeholder="请选择分类"
            style="width: 100%"
            filterable
          />
        </el-form-item>
        <el-form-item label="将设为类型">
          <el-input :model-value="changeForm.new_type_name || '选择分类后自动带出'" disabled />
        </el-form-item>
        <el-form-item label="将设为级别">
          <el-input :model-value="changeForm.new_level_code || '选择分类后自动带出'" disabled />
        </el-form-item>
        <el-form-item label="变更原因" required>
          <el-input
            v-model="changeForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入变更原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangeDialog = false">取消</el-button>
        <el-button type="primary" :loading="changing" @click="submitChange">提交变更</el-button>
      </template>
    </el-dialog>

    <!-- 表级变更级别弹窗 -->
    <el-dialog v-model="showTableLevelDialog" title="变更表级别" width="450px">
      <el-form :model="tableLevelForm" label-width="100px">
        <el-form-item label="表名">
          <el-input :model-value="tableLevelForm.table_name" disabled />
        </el-form-item>
        <el-form-item label="当前级别">
          <el-input :model-value="tableLevelForm.current_level" disabled />
        </el-form-item>
        <el-form-item label="新级别" required>
          <el-select v-model="tableLevelForm.new_level" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="lv in levelOptions"
              :key="lv.id"
              :label="lv.level_name || lv.level_code"
              :value="lv.level_code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="变更原因" required>
          <el-input
            v-model="tableLevelForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入变更原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTableLevelDialog = false">取消</el-button>
        <el-button type="primary" :loading="changing" @click="submitTableLevelChange">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量操作弹窗 -->
    <el-dialog v-model="showBatchDialog" title="批量操作" width="450px">
      <el-form label-width="100px">
        <el-form-item label="操作类型" required>
          <el-select v-model="batchActionType" placeholder="请选择操作" style="width: 100%">
            <el-option label="批量确认" value="confirm" />
            <el-option label="批量变更" value="change" />
            <el-option label="批量解锁" value="unlock" />
            <el-option label="批量备注" value="note" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="batchActionType === 'note'" label="备注内容">
          <el-input
            v-model="batchNoteContent"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
        <el-form-item v-if="batchActionType === 'change'" label="目标类型">
          <el-select v-model="batchChangeType" placeholder="请选择" style="width: 100%" filterable>
            <el-option
              v-for="dt in dataTypeOptions"
              :key="dt"
              :label="dt"
              :value="dt"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" :loading="batchLoading" @click="submitBatch">确定</el-button>
      </template>
    </el-dialog>

    <!-- 样本弹窗 -->
    <el-dialog v-model="showSampleDialog" title="样本数据" width="600px">
      <div v-loading="sampleLoading">
        <el-table v-if="sampleData.length" :data="sampleData" stripe style="width: 100%">
          <el-table-column type="index" label="#" min-width="50" />
          <el-table-column prop="value" label="值" />
        </el-table>
        <el-empty v-else description="无样本数据" />
      </div>
    </el-dialog>

    <!-- 历史详情弹窗 -->
    <el-dialog v-model="showHistoryDialog" title="历史详情" width="700px">
      <div v-loading="historyDetailLoading">
        <el-descriptions v-if="historyDetail" :column="2" border>
          <el-descriptions-item label="执行编号">{{ historyDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(historyDetail.status)" size="small">
              {{ statusLabel(historyDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ historyDetail.started_at }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ historyDetail.finished_at }}</el-descriptions-item>
          <el-descriptions-item label="处理表数">{{ historyDetail.table_count }}</el-descriptions-item>
          <el-descriptions-item label="处理字段">{{ historyDetail.field_count }}</el-descriptions-item>
          <el-descriptions-item label="摘要" :span="2">{{ historyDetail.summary }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-if="!historyDetail && !historyDetailLoading" description="暂无详情" />
      </div>
    </el-dialog>

    <!-- 对比弹窗 -->
    <el-dialog v-model="showCompareDialog" title="历史对比" width="800px">
      <div v-loading="compareLoading">
        <el-table v-if="compareData.length" :data="compareData" stripe style="width: 100%">
          <el-table-column prop="field" label="字段" min-width="140" />
          <el-table-column label="旧值" min-width="140">
            <template #default="{ row }">{{
              typeof row.old_value === 'object' ? JSON.stringify(row.old_value) : row.old_value
            }}</template>
          </el-table-column>
          <el-table-column label="新值" min-width="140">
            <template #default="{ row }">{{
              typeof row.new_value === 'object' ? JSON.stringify(row.new_value) : row.new_value
            }}</template>
          </el-table-column>
          <el-table-column prop="changed" label="是否变更" min-width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.changed ? 'warning' : 'info'" size="small">
                {{ row.changed ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!compareData.length && !compareLoading" description="无对比数据" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type TabPaneName } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  getTaskDetail,
  getTaskProgress,
  getTaskTables,
  getTaskColumns,
  getColumnResult,
  getColumnSample,
  confirmResult,
  changeResult,
  unlockResult,
  batchConfirm,
  batchChange,
  batchUnlock,
  batchNote,
  changeTableLevel,
  unlockTableLevel,
  getCategoryView,
  getTaskStatistics,
  getTaskLogs,
  getTaskHistory,
  getHistoryDetail,
  compareHistory,
} from '@/api/task'
import { getLevels, getMaskingRules, getEncryptionTypes } from '@/api/classification'
import { confirmMask, confirmEncrypt } from '@/api/task'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()
const taskId = Number(route.params.id)

const loading = ref(false)
const activeTab = ref('tables')

// 任务基本信息
const taskDetail = ref<any>({})
const taskStats = reactive({
  total_tables: 0,
  processed_tables: 0,
  sensitive_tables: 0,
  classified_fields: 0,
})

// 状态映射
const statusMap: Record<string, { label: string; tag: string }> = {
  pending: { label: '待执行', tag: 'info' },
  running: { label: '执行中', tag: 'warning' },
  completed: { label: '已完成', tag: 'success' },
  stopped: { label: '已停止', tag: '' },
  failed: { label: '执行失败', tag: 'danger' },
}

function statusLabel(status: string): string {
  return statusMap[status]?.label || status
}

function statusTag(status: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  const tag = statusMap[status]?.tag
  return (tag || 'info') as 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined
}

const executeTypeMap: Record<string, { label: string; tag: string }> = {
  immediate: { label: '立即执行', tag: '' },
  scheduled: { label: '定时执行', tag: 'primary' },
  periodic: { label: '周期执行', tag: 'success' },
}

function executeTypeLabel(type: string): string {
  return executeTypeMap[type]?.label || type
}

function executeTypeTag(type: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  const tag = executeTypeMap[type]?.tag
  return (tag || 'info') as 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined
}

function tableStatusLabel(status: string): string {
  const m: Record<string, string> = { pending: '待处理', processing: '处理中', completed: '已完成', skipped: '已跳过' }
  return m[status] || status
}

function tableStatusTag(status: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  const m: Record<string, string> = { pending: 'info', processing: 'warning', completed: 'success', skipped: 'default' }
  return (m[status] || 'info') as 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined
}

function levelTag(level: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  const m: Record<string, string> = { L0: 'info', L1: 'success', L2: 'warning', L3: 'danger', L4: 'danger' }
  return (m[level] || 'info') as 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined
}

// 选项数据
const dataTypeOptions = ref<string[]>([])
const levelOptions = ref<any[]>([])
const maskingRules = ref<any[]>([])
const encryptionTypes = ref<any[]>([])

async function loadMaskingRules() {
  try {
    const res = await getMaskingRules({ page_size: 100 })
    const items = res.data?.items || res.data || []
    maskingRules.value = Array.isArray(items) ? items : []
  } catch { maskingRules.value = [] }
}

async function loadEncryptionTypes() {
  try {
    const res = await getEncryptionTypes({ page_size: 100 })
    const items = res.data?.items || res.data || []
    encryptionTypes.value = Array.isArray(items) ? items : []
  } catch { encryptionTypes.value = [] }
}

async function handleChangeMask(row: any, ruleName: string) {
  try {
    if (!ruleName) return
    await confirmMask(taskId, row.column_id, { masking_rule_name: ruleName })
    ElMessage.success('脱敏方式已设置')
  } catch { ElMessage.error('设置脱敏方式失败') }
}

async function handleChangeEncrypt(row: any, typeName: string) {
  try {
    if (!typeName) return
    await confirmEncrypt(taskId, row.column_id, { encryption_type_name: typeName })
    ElMessage.success('加密方式已设置')
  } catch { ElMessage.error('设置加密方式失败') }
}

// 定时刷新
let progressTimer: number | null = null

async function fetchTaskDetail() {
  loading.value = true
  try {
    const res = await getTaskDetail(taskId)
    taskDetail.value = res.data || {}
    taskStats.total_tables = res.data?.total_tables ?? 0
    taskStats.processed_tables = res.data?.processed_tables ?? 0
    taskStats.sensitive_tables = res.data?.sensitive_tables ?? 0
    taskStats.classified_fields = res.data?.classified_fields ?? 0
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const res = await getTaskDetail(taskId)
    if (res.data?.template_id) {
      const { getDataTypes } = await import('@/api/classification')
      const dtRes = await getDataTypes(res.data.template_id, { page_size: 200 })
      if (Array.isArray(dtRes.data)) {
        dataTypeOptions.value = dtRes.data.map((d: any) => d.name || d)
      } else if (dtRes.data?.items) {
        dataTypeOptions.value = dtRes.data.items.map((d: any) => d.name || d)
      }

      // Also load category tree for the change dialog
      try {
        const { getCategoryTree } = await import('@/api/classification')
        const catRes = await getCategoryTree(res.data.template_id)
        const cats = catRes.data || []

        function flattenCategories(items: any[], parentName = '', level = 0): any[] {
          const result: any[] = []
          for (const item of items) {
            const { children, ...rest } = item
            result.push({ ...rest, parent_name: parentName, _level: level })
            if (children && children.length) {
              result.push(...flattenCategories(children, item.name, level + 1))
            }
          }
          return result
        }

        const flatCats = flattenCategories(cats)
        fullCategoryList.value = flatCats

        const map: Record<number, number> = {}
        for (const cat of flatCats) {
          if (cat.level_id) {
            map[cat.id] = cat.level_id
          }
        }
        levelByCategoryId.value = map

        // Build proper tree for the tree-select
        const treeData = JSON.parse(JSON.stringify(cats))
        categoryTreeForSelect.value = treeData
      } catch { /* ignore */ }
    }
    const lvRes = await getLevels()
    if (Array.isArray(lvRes.data)) {
      levelOptions.value = lvRes.data
    } else if (lvRes.data?.items) {
      levelOptions.value = lvRes.data.items
    } else {
      levelOptions.value = lvRes.data || []
    }
  } catch {
    dataTypeOptions.value = ['PII', 'PHI', 'PCI', 'Financial', 'Public', 'Internal']
    levelOptions.value = [{ id: 1, name: 'L0' }, { id: 2, name: 'L1' }, { id: 3, name: 'L2' }, { id: 4, name: 'L3' }, { id: 5, name: 'L4' }]
  }
}

// ========== 表级视图 ==========
const tables = ref<any[]>([])
const tablesLoading = ref(false)
const tableKeyword = ref('')
const tablesTotal = ref(0)
const tablePage = ref(1)
const tablePageSize = ref(20)

async function fetchTables() {
  tablesLoading.value = true
  try {
    const params: Record<string, any> = { page: tablePage.value, page_size: tablePageSize.value }
    if (tableKeyword.value.trim()) {
      params.keyword = tableKeyword.value.trim()
    }
    const res = await getTaskTables(taskId, params)
    if (res.data && Array.isArray(res.data.items)) {
      tables.value = res.data.items
      tablesTotal.value = res.data.total ?? 0
    } else if (Array.isArray(res.data)) {
      tables.value = res.data
      tablesTotal.value = res.data.length
    } else {
      tables.value = res.data || []
      tablesTotal.value = 0
    }
  } finally {
    tablesLoading.value = false
  }
}

function handleTablePageChange() {
  fetchTables()
}

function handleTableSizeChange(size: number) {
  tablePageSize.value = size
  tablePage.value = 1
  fetchTables()
}

function resetTableFilter() {
  tablePage.value = 1
  fetchTables()
}

// ========== 字段详情 ==========
const columns = ref<any[]>([])
const columnsLoading = ref(false)
const columnKeyword = ref('')
const columnTableFilter = ref<number | null>(null)
const columnStatusFilter = ref('')
const columnNameFilter = ref('')
const commentFilter = ref('')
const isConfirmedFilter = ref('')
const hasHitFilter = ref('')
const isSensitiveFilter = ref('')
const columnTotal = ref(0)
const columnPage = ref(1)
const columnPageSize = ref(20)

async function fetchColumns() {
  columnsLoading.value = true
  try {
    const params: Record<string, any> = { page: columnPage.value, page_size: columnPageSize.value }
    if (columnKeyword.value.trim()) params.keyword = columnKeyword.value.trim()
    if (columnStatusFilter.value) params.status = columnStatusFilter.value
    if (columnTableFilter.value) params.table_id = columnTableFilter.value
    if (columnNameFilter.value.trim()) params.column_name = columnNameFilter.value.trim()
    if (commentFilter.value.trim()) params.comment = commentFilter.value.trim()
    if (isConfirmedFilter.value) params.is_confirmed = isConfirmedFilter.value
    if (hasHitFilter.value) params.has_hit = hasHitFilter.value
    if (isSensitiveFilter.value) params.is_sensitive = isSensitiveFilter.value
    const res = await getTaskColumns(taskId, params)
    if (res.data && Array.isArray(res.data.items)) {
      columns.value = res.data.items
      columnTotal.value = res.data.total ?? 0
    } else if (Array.isArray(res.data)) {
      columns.value = res.data
      columnTotal.value = res.data.length
    } else {
      columns.value = res.data || []
      columnTotal.value = 0
    }
    // Map API field names to template-expected field names
    columns.value = columns.value.map((col: any) => ({
      ...col,
      system_type: col.data_type_name,
      manual_type: col.data_type_name_manual,
      level: col.level_code_manual || col.level_code,
      category_path: col.category_path_manual || col.category_path,
      masked: col.is_masked,
      encrypted: col.is_encrypted,
      locked: col.is_locked,
    }))
  } finally {
    columnsLoading.value = false
  }
}


// ========== 变更弹窗 ==========
const showChangeDialog = ref(false)

function handleColumnPageChange() {
  fetchColumns()
}

function handleColumnSizeChange(size: number) {
  columnPageSize.value = size
  columnPage.value = 1
  fetchColumns()
}

function resetColumnFilter() {
  columnPage.value = 1
  fetchColumns()
}

const changing = ref(false)
const changeForm = reactive({
  column_id: null as number | null,
  current_type: '',
  current_level: '',
  current_category: '',
  new_level_id: null as number | null,
  new_level_code: '',
  new_category_id: null as number | null,
  new_category_path: '',
  new_type_name: '', // 所选分类对应的数据类型名称
  reason: '',
})

function openChangeDialog(row: any) {
  changeForm.column_id = row.column_id
  changeForm.current_type = row.system_type || ''
  changeForm.current_level = row.level || ''
  changeForm.current_category = row.category_path || ''
  changeForm.new_category_id = null
  changeForm.new_level_id = null
  changeForm.new_level_code = ''
  changeForm.reason = ''
  showChangeDialog.value = true
}

async function submitChange() {
  if (!changeForm.new_category_id) { ElMessage.warning('请选择新分类'); return }
  if (!changeForm.reason.trim()) { ElMessage.warning('请输入变更原因'); return }
  if (!changeForm.new_level_id) { ElMessage.warning('所选分类未绑定分级，请先配置分类分级'); return }
  changing.value = true
  try {
    await changeResult(taskId, changeForm.column_id!, {
      level_id: changeForm.new_level_id,
      level_code: changeForm.new_level_code,
      category_path: changeForm.new_category_path,
      data_type_name_manual: changeForm.new_type_name,
      reason: changeForm.reason.trim(),
    })
    ElMessage.success('变更已提交')
    showChangeDialog.value = false
    fetchColumns()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '变更失败')
  } finally {
    changing.value = false
  }
}

// ========== 表级变更 ==========
const showTableLevelDialog = ref(false)
const tableLevelForm = reactive({
  table_id: null as number | null,
  table_name: '',
  current_level: '',
  new_level: '',
  reason: '',
})

function openChangeTableLevel(row: any) {
  tableLevelForm.table_id = row.id
  tableLevelForm.table_name = row.table_name || ''
  tableLevelForm.current_level = row.level || ''
  tableLevelForm.new_level = ''
  tableLevelForm.reason = ''
  showTableLevelDialog.value = true
}

async function submitTableLevelChange() {
  if (!tableLevelForm.new_level) { ElMessage.warning('请选择新级别'); return }
  if (!tableLevelForm.reason.trim()) { ElMessage.warning('请输入变更原因'); return }
  changing.value = true
  try {
    await changeTableLevel(taskId, tableLevelForm.table_id!, {
      level: tableLevelForm.new_level,
      reason: tableLevelForm.reason.trim(),
    })
    ElMessage.success('表级别变更已提交')
    showTableLevelDialog.value = false
    fetchTables()
  } finally {
    changing.value = false
  }
}

async function handleUnlockTableLevel(row: any) {
  try {
    await ElMessageBox.confirm('确定解锁该表的级别吗？', '提示', { type: 'warning' })
    await unlockTableLevel(taskId, row.id)
    ElMessage.success('已解锁')
    fetchTables()
  } catch {
    // cancelled
  }
}

// ========== 确认系统类型 ==========
async function handleAcceptSystemType(row: any) {
  try {
    await ElMessageBox.confirm(
      `系统识别类型为"${row.system_type}"，确认使用该类型吗？`,
      '确认系统类型',
      { type: 'info' }
    )
    await changeResult(taskId, row.column_id, {
      data_type_name: row.system_type,
      reason: '确认系统匹配类型',
    })
    ElMessage.success('已确认')
    fetchColumns()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || err?.message || '确认失败')
  }
}

// ========== 列确认/解锁 ==========
async function handleConfirmColumn(row: any) {
  try {
    await ElMessageBox.confirm(`确定确认字段 "${row.column_name}" 的分类结果吗？`, '确认', { type: 'info' })
    await confirmResult(taskId, row.column_id, {})
    ElMessage.success('已确认')
    fetchColumns()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || err?.message || '确认失败')
  }
}

async function handleUnlockColumn(row: any) {
  try {
    await ElMessageBox.confirm(`确定解锁字段 "${row.column_name}" 吗？`, '提示', { type: 'warning' })
    await unlockResult(taskId, row.column_id)
    ElMessage.success('已解锁')
    fetchColumns()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || err?.message || '解锁失败')
  }
}

// ========== 批量操作 ==========
const showBatchDialog = ref(false)
const batchLoading = ref(false)
const batchActionType = ref('confirm')
const batchNoteContent = ref('')
const batchChangeType = ref('')

async function submitBatch() {
  batchLoading.value = true
  try {
    const selectedIds = columns.value.filter((c: any) => !c.locked).map((c: any) => c.id)
    if (!selectedIds.length) {
      ElMessage.warning('没有可操作的字段')
      return
    }
    if (batchActionType.value === 'confirm') {
      await batchConfirm(taskId, { column_ids: selectedIds })
      ElMessage.success('批量确认成功')
    } else if (batchActionType.value === 'unlock') {
      await batchUnlock(taskId, { column_ids: selectedIds })
      ElMessage.success('批量解锁成功')
    } else if (batchActionType.value === 'note') {
      if (!batchNoteContent.value.trim()) { ElMessage.warning('请输入备注内容'); return }
      await batchNote(taskId, { column_ids: selectedIds, note: batchNoteContent.value.trim() })
      ElMessage.success('批量备注成功')
    } else if (batchActionType.value === 'change') {
      if (!batchChangeType.value) { ElMessage.warning('请选择目标类型'); return }
      await batchChange(taskId, { column_ids: selectedIds, manual_type: batchChangeType.value })
      ElMessage.success('批量变更成功')
    }
    showBatchDialog.value = false
    fetchColumns()
  } finally {
    batchLoading.value = false
  }
}

// ========== 样本 ==========
const showSampleDialog = ref(false)
const sampleData = ref<any[]>([])
const sampleLoading = ref(false)

async function handleColumnSample(row: any) {
  showSampleDialog.value = true
  sampleLoading.value = true
  try {
    const res = await getColumnSample(taskId, row.column_id)
    if (Array.isArray(res.data)) {
      sampleData.value = res.data
    } else if (res.data?.values) {
      sampleData.value = res.data.values.map((v: any) => ({ value: v }))
    } else if (res.data?.items) {
      sampleData.value = res.data.items
    } else {
      sampleData.value = res.data || []
    }
  } finally {
    sampleLoading.value = false
  }
}

// ========== 分类视图 ==========
const categoryTree = ref<any[]>([])
const categoryTreeForSelect = ref<any[]>([])
// New variables for category mapping
const fullCategoryList = ref<any[]>([])
const levelByCategoryId = ref<Record<number, number>>({})

// When category changes in change dialog, auto-fill level and path
watch(() => changeForm.new_category_id, (newId) => {
  if (newId) {
    // Look up the selected category in fullCategoryList
    const cat = fullCategoryList.value.find((c: any) => c.id === newId)
    if (cat) {
      // 用末级分类名称作为数据类型名称
      changeForm.new_type_name = cat.name || ''
      // Build the full path from category name
      changeForm.new_category_path = cat.path || cat.name || ''

      // Look up the level
      const levelId = cat.level_id
      if (levelId) {
        changeForm.new_level_id = levelId
        const level = levelOptions.value.find((l: any) => l.id === levelId)
        if (level) {
          changeForm.new_level_code = level.level_code || level.level_name || level.name || ''
        } else {
          changeForm.new_level_code = ''
        }
      } else {
        changeForm.new_level_id = null
        changeForm.new_level_code = ''
      }
    }
  } else {
    changeForm.new_level_id = null
    changeForm.new_level_code = ''
    changeForm.new_category_path = ''
    changeForm.new_type_name = ''
  }
})

const categoryLoading = ref(false)

async function fetchCategoryView() {
  categoryLoading.value = true
  try {
    const res = await getCategoryView(taskId)
    const data = Array.isArray(res.data) ? res.data : res.data?.tree || []
    categoryTree.value = data
  } finally {
    categoryLoading.value = false
  }
}

// ========== 统计 ==========
const statsLoading = ref(false)
const typeRatioCanvas = ref<HTMLCanvasElement | null>(null)
const levelDistCanvas = ref<HTMLCanvasElement | null>(null)
const typeRatioChartData = reactive({ labels: [] as string[], values: [] as number[] })
const levelDistChartData = reactive({ labels: [] as string[], values: [] as number[] })
let chartInstance1: echarts.ECharts | null = null
let chartInstance2: echarts.ECharts | null = null

async function fetchStatistics() {
  statsLoading.value = true
  try {
    const res = await getTaskStatistics(taskId)
    const stats = res.data || {}
    typeRatioChartData.labels = Object.keys(stats.type_distribution || {})
    typeRatioChartData.values = Object.values(stats.type_distribution || {})
    levelDistChartData.labels = Object.keys(stats.level_distribution || {})
    levelDistChartData.values = Object.values(stats.level_distribution || {})
    await nextTick()
    renderCharts()
  } finally {
    statsLoading.value = false
  }
}

function renderCharts() {
  if (typeRatioCanvas.value && typeRatioChartData.labels.length) {
    if (chartInstance1) chartInstance1.dispose()
    chartInstance1 = echarts.init(typeRatioCanvas.value)
    chartInstance1.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['30%', '60%'],
        data: typeRatioChartData.labels.map((l, i) => ({ name: l, value: typeRatioChartData.values[i] || 0 })),
        color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'],
      }],
    })
  }
  if (levelDistCanvas.value && levelDistChartData.labels.length) {
    if (chartInstance2) chartInstance2.dispose()
    chartInstance2 = echarts.init(levelDistCanvas.value)
    chartInstance2.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: levelDistChartData.labels },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: levelDistChartData.values, color: '#409EFF' }],
    })
  }
}

// ========== 日志 ==========
const logs = ref<any[]>([])
const logsLoading = ref(false)

async function fetchLogs() {
  logsLoading.value = true
  try {
    const res = await getTaskLogs(taskId)
    if (Array.isArray(res.data)) {
      logs.value = res.data
    } else if (res.data?.items) {
      logs.value = res.data.items
    } else {
      logs.value = res.data || []
    }
  } finally {
    logsLoading.value = false
  }
}

function refreshLogs() {
  fetchLogs()
}

// ========== 历史记录 ==========
const historyList = ref<any[]>([])
const historyLoading = ref(false)
const historyTotal = ref(0)
const historyPage = ref(1)
const historyPageSize = ref(20)
const compareTarget = ref<any>(null)

async function fetchHistory() {
  historyLoading.value = true
  try {
    const params: Record<string, any> = { page: historyPage.value, page_size: historyPageSize.value }
    const res = await getTaskHistory(taskId, params)
    if (res.data && Array.isArray(res.data.items)) {
      historyList.value = res.data.items
      historyTotal.value = res.data.total ?? 0
    } else if (Array.isArray(res.data)) {
      historyList.value = res.data
      historyTotal.value = res.data.length
    } else {
      historyList.value = res.data || []
      historyTotal.value = 0
    }
  } finally {
    historyLoading.value = false
  }
}

// 历史详情
const showHistoryDialog = ref(false)
const historyDetail = ref<any>(null)
const historyDetailLoading = ref(false)

async function handleViewHistory(row: any) {
  showHistoryDialog.value = true
  historyDetailLoading.value = true
  try {
    const res = await getHistoryDetail(row.id)
    historyDetail.value = res.data || {}
  } finally {
    historyDetailLoading.value = false
  }
}

// 对比
const showCompareDialog = ref(false)
const compareData = ref<any[]>([])
const compareLoading = ref(false)

async function handleCompare(row: any) {
  if (!compareTarget.value) {
    compareTarget.value = row
    ElMessage.info(`已选择 "${row.id}" 作为对比基准，请点击另一个历史记录进行对比`)
    return
  }
  const id1 = compareTarget.value.id
  const id2 = row.id
  compareTarget.value = null
  showCompareDialog.value = true
  compareLoading.value = true
  try {
    const res = await compareHistory(taskId, id1, id2)
    if (Array.isArray(res.data)) {
      compareData.value = res.data
    } else if (res.data?.diffs) {
      compareData.value = res.data.diffs
    } else {
      compareData.value = res.data || []
    }
  } finally {
    compareLoading.value = false
  }
}

// ========== 辅助 ==========
function switchToColumns(row: any) {
  activeTab.value = 'columns'
  columnTableFilter.value = row.id
  fetchColumns()
}

function handleTabChange(tabName: TabPaneName) {
  const name = String(tabName)
  if (name === 'tables' && !tables.value.length) fetchTables()
  if (name === 'columns' && !columns.value.length) fetchColumns()
  if (name === 'category' && !categoryTree.value.length) fetchCategoryView()
  if (name === 'statistics' && !typeRatioChartData.labels.length && !levelDistChartData.labels.length) fetchStatistics()
  if (name === 'logs' && !logs.value.length) fetchLogs()
  if (name === 'history' && !historyList.value.length) fetchHistory()
}

function goBack() {
  router.push('/classification/tasks')
}

// 轮询进度
function startProgressPolling() {
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = window.setInterval(async () => {
    if (taskDetail.value?.status === 'running') {
      try {
        const res = await getTaskProgress(taskId)
        if (res.data) {
          taskDetail.value.progress = res.data.progress ?? taskDetail.value.progress
          taskStats.total_tables = res.data.total_tables ?? taskStats.total_tables
          taskStats.processed_tables = res.data.processed_tables ?? taskStats.processed_tables
          taskStats.sensitive_tables = res.data.sensitive_tables ?? taskStats.sensitive_tables
          taskStats.classified_fields = res.data.classified_fields ?? taskStats.classified_fields
          if (res.data.status && res.data.status !== 'running') {
            taskDetail.value.status = res.data.status
            fetchTaskDetail()
          }
        }
      } catch {
        // ignore polling errors
      }
    }
  }, 5000)
}

async function refreshAll() {
  await Promise.all([
    fetchTaskDetail(), fetchTables(), fetchColumns(),
    fetchCategoryView(), fetchStatistics(), fetchLogs(), fetchHistory(),
  ])
}

onMounted(async () => {
  await fetchTaskDetail()
  await loadOptions()
  await loadMaskingRules()
  await loadEncryptionTypes()
  // 首次加载当前标签页的数据
  await fetchTables()
  startProgressPolling()
})

onUnmounted(() => {
  if (progressTimer) clearInterval(progressTimer)
  if (chartInstance1) chartInstance1.dispose()
  if (chartInstance2) chartInstance2.dispose()
})
</script>

<style scoped>
.info-card {
  margin-bottom: 0;
}

.info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 8px 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
}

.info-stats {
  display: flex;
  gap: 32px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tab-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.log-container {
  max-height: 500px;
  overflow-y: auto;
  background: #fafafa;
  border-radius: 4px;
  padding: 8px;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  font-size: 13px;
  font-family: monospace;
  border-bottom: 1px solid var(--el-border-color-light);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.log-level {
  font-weight: 600;
  min-width: 50px;
}

.log-level-info { color: var(--el-color-primary); }
.log-level-warn { color: var(--el-color-warning); }
.log-level-error { color: var(--el-color-danger); }

.log-msg {
  flex: 1;
  word-break: break-all;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-box {
  background: #fafafa;
  border-radius: 4px;
  padding: 16px;
}

.chart-box h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.category-node {
  display: flex;
  align-items: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
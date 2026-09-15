<template>
  <div class="page-container">
    <!-- 顶栏（对齐数据资产） -->
    <div class="page-header">
      <el-button text @click="$router.push('/classification/file-tasks')" style="margin-right: 12px">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h2 style="margin: 0; flex: 1">任务详情</h2>
      <el-button size="small" @click="loadAll" :loading="loading">刷新</el-button>
    </div>

    <div v-if="!task && !loading" style="text-align:center;padding:80px 0;color:#999">
      <el-empty description="任务不存在或已被删除" />
    </div>
    <template v-else>
      <!-- 任务概况卡片（对齐数据资产） -->
      <el-card shadow="hover" class="info-card">
        <div class="info-bar">
          <div class="info-item">
            <span class="info-label">任务名称</span>
            <span class="info-value">{{ task?.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">模板</span>
            <span class="info-value">{{ templateName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">执行方式</span>
            <el-tag size="small" effect="plain">{{ task?.execute_type === 'periodic' ? '周期' : '手动' }}</el-tag>
          </div>
          <div class="info-item">
            <span class="info-label">状态</span>
            <el-tag :type="statusType(task?.status)" size="small">{{ statusText(task?.status) }}</el-tag>
          </div>
          <div class="info-item" v-if="task?.current_step">
            <span class="info-label">当前步骤</span>
            <span class="info-value">{{ task.current_step }}</span>
          </div>
          <div class="info-item" v-if="task?.last_executed_at">
            <span class="info-label">上次执行</span>
            <span class="info-value">{{ formatTime(task.last_executed_at) }}</span>
          </div>
        </div>
        <div class="info-stats" v-if="task?.status === 'running' || task?.status === 'pending' || task?.status === 'queued'">
          <el-progress :percentage="task?.progress || 0" :stroke-width="18" :text-inside="true" style="width: 100%; max-width: 400px" />
        </div>
        <div class="info-stats">
          <div class="stat-item">
            <span class="stat-value">{{ task?.total_files || 0 }}</span>
            <span class="stat-label">文件数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ task?.processed_files || 0 }}/{{ task?.total_files || 0 }}</span>
            <span class="stat-label">已处理</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ task?.total_blocks || 0 }}</span>
            <span class="stat-label">内容块</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ task?.processed_blocks || 0 }}</span>
            <span class="stat-label">已处理块</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ task?.sensitive_count || 0 }}</span>
            <span class="stat-label">敏感块</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ task?.classified_count || 0 }}</span>
            <span class="stat-label">已分类</span>
          </div>
        </div>
      </el-card>

      <!-- Tab 内容 -->
      <el-card shadow="hover" style="margin-top: 16px">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">

          <!-- Tab1: 文件摘要（对齐数据资产表级视图） -->
          <el-tab-pane label="文件摘要" name="files">
            <div class="tab-toolbar">
              <el-input v-model="fileKeyword" placeholder="搜索文件名" clearable size="small" style="width: 140px; margin-right: 8px" @input="handleFileSearch" />
            </div>
            <el-table :data="filteredFiles" stripe style="width: 100%" v-loading="filesLoading" max-height="500" :header-cell-style="{ background: '#f5f7fa', color: '#606266' }">
              <el-table-column prop="file_name" label="文件名" min-width="0" flex="2" show-overflow-tooltip />
              <el-table-column prop="file_ext" label="类型" min-width="0" flex="1" align="center">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.file_ext || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="分级" min-width="0" flex="1" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.level_code" size="small" effect="plain">{{ row.level_code }}</el-tag>
                  <span v-else style="color:#999">-</span>
                </template>
              </el-table-column>
              <el-table-column label="是否敏感" min-width="0" flex="1" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.sensitive_blocks > 0 ? 'danger' : 'info'" size="small">{{ row.sensitive_blocks > 0 ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="total_blocks" label="内容块数" min-width="0" flex="1" align="center" />
              <el-table-column label="敏感块数" min-width="0" flex="1" align="center">
                <template #default="{ row }">
                  <span :style="{ color: row.sensitive_blocks > 0 ? '#f56c6c' : '' }">{{ row.sensitive_blocks || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="敏感率" min-width="0" flex="1" align="center">
                <template #default="{ row }">
                  <span v-if="row.total_blocks > 0">{{ ((row.sensitive_blocks / row.total_blocks) * 100).toFixed(1) }}%</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- Tab2: 块详情（对齐数据资产字段详情） -->
          <el-tab-pane label="块详情" name="blocks">
            <div class="tab-toolbar">
              <el-input v-model="blockKeyword" placeholder="关键字" clearable size="small" style="width: 140px; margin-right: 8px" @input="onFilterChange" />
              <el-select v-model="blockFileAssetFilter" placeholder="文件资产" clearable size="small" style="width: 130px; margin-right: 8px" filterable @change="onFilterChange">
                <el-option v-for="a in fileAssetOptions" :key="a.id" :label="a.name" :value="a.id" />
              </el-select>
              <el-select v-model="blockFileFilter" placeholder="文件" clearable size="small" style="width: 130px; margin-right: 8px" filterable @change="onFilterChange">
                <el-option v-for="f in fileNameOptions" :key="f" :label="f" :value="f" />
              </el-select>
              <el-select v-model="blockTypeFilter" placeholder="块类型" clearable size="small" style="width: 100px; margin-right: 8px" @change="onFilterChange">
                <el-option v-for="t in blockTypeOptions" :key="t" :label="t" :value="t" />
              </el-select>
              <el-input v-model="blockContentFilter" placeholder="块内容" clearable size="small" style="width: 120px; margin-right: 8px" @input="onFilterChange" />
              <el-select v-model="isSensitiveFilter" placeholder="是否敏感" clearable size="small" style="width: 100px; margin-right: 8px" @change="onFilterChange">
                <el-option label="敏感" value="true" />
                <el-option label="非敏感" value="false" />
              </el-select>
              <el-select v-model="aiTypeStatus" placeholder="AI分类" clearable size="small" style="width: 110px; margin-right: 4px" @change="onFilterChange">
                <el-option label="未命中" value="unconfirmed" />
                <el-option label="已命中" value="confirmed_top" />
                <el-option v-for="a in aiCategoryOptions" :key="a" :label="a" :value="a" />
              </el-select>
              <el-select v-model="systemTypeStatus" placeholder="系统分类" clearable size="small" style="width: 110px; margin-right: 4px" @change="onFilterChange">
                <el-option label="未命中" value="unconfirmed" />
                <el-option label="已命中" value="confirmed_top" />
                <el-option v-for="t in systemTypeOptions" :key="t" :label="t" :value="t" />
              </el-select>
              <el-select v-model="manualTypeStatus" placeholder="人工分类" clearable size="small" style="width: 110px; margin-right: 4px" @change="onFilterChange">
                <el-option label="未确认" value="unconfirmed" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="已变更" value="changed" />
              </el-select>
              <el-select v-model="levelFilter" placeholder="分级" clearable size="small" style="width: 80px" @change="onFilterChange">
                <el-option v-for="l in levelOptions" :key="l.level_code" :label="l.level_code" :value="l.level_code" />
              </el-select>
            </div>
            <el-table :data="blocks" stripe style="width: 100%" v-loading="blocksLoading" max-height="500" :header-cell-style="{ background: '#f5f7fa', color: '#606266' }" @selection-change="handleBlockSelectionChange">
              <el-table-column type="selection" width="45" fixed />
              <el-table-column type="index" label="序号" width="60" :index="blockIndexOffset" fixed />
              <el-table-column label="路径" min-width="160" fixed show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tooltip :content="`文件: ${row.file_name}\n块路径: ${row.block_path}`" placement="top" :enterable="false">
                    <span class="block-path">{{ row.block_path || '-' }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column label="文件" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ row.file_name || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="系统分类" min-width="100" show-overflow-tooltip>
                <template #default="{ row }">
                  <span
                    v-if="row.sensitive_type"
                    :class="['dblclick-confirm', { 'is-locked': row.is_confirmed || row.is_changed }]"
                    :title="(row.is_confirmed || row.is_changed) ? '已确认或变更' : '双击确认'"
                    @dblclick.stop="!(row.is_confirmed || row.is_changed) && handleSystemConfirm(row)"
                  >{{ row.sensitive_type }}</span>
                  <span v-else style="color:#999">-</span>
                </template>
              </el-table-column>
              <el-table-column label="AI分类" min-width="100" show-overflow-tooltip>
                <template #default="{ row }">
                  <span
                    v-if="row.ai_category"
                    :class="['dblclick-confirm', { 'is-locked': row.is_confirmed || row.is_changed }]"
                    :title="(row.is_confirmed || row.is_changed) ? '已确认或变更' : '双击确认'"
                    @dblclick.stop="!(row.is_confirmed || row.is_changed) && handleAiConfirm(row)"
                  >{{ parseAiCategory(row.ai_category) }}</span>
                  <span v-else style="color: #c0c4cc">-</span>
                </template>
              </el-table-column>
              <el-table-column label="人工确认" min-width="100" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="row.is_changed">
                    <el-tag type="warning" size="small" effect="plain">{{ row.sensitive_type || '已变更' }}</el-tag>
                  </template>
                  <template v-else-if="row.is_confirmed">
                    <span class="manual-type-name">{{ row.sensitive_type || getManualTypeName(row) }}</span>
                  </template>
                  <el-button v-else type="primary" link size="small" @click="openConfirmDialog(row)">待确认</el-button>
                </template>
              </el-table-column>
              <el-table-column label="分级" min-width="70" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.level_code" size="small" effect="plain">{{ row.level_code }}</el-tag>
                  <span v-else style="color: #999">-</span>
                </template>
              </el-table-column>
              <el-table-column label="是否敏感" min-width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small" effect="plain">{{ row.is_sensitive ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="分类路径" min-width="130" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ (row.category_path || '').split('>')[0] || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="handleBlockSample(row)">样本</el-button>
                  <el-button link type="primary" size="small" @click="openChangeDialog(row)">变更</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="batch-actions" v-if="selectedBlocks.length > 0">
              <span>已选择 {{ selectedBlocks.length }} 项</span>
              <el-select v-model="batchConfirmSource" placeholder="选择确认来源" size="small" style="width: 160px; margin-right: 8px">
                <el-option label="系统分类确认" value="system" />
                <el-option label="AI分类确认" value="ai" />
              </el-select>
              <el-button size="small" type="success" @click="handleBatchConfirm">批量确认</el-button>
            </div>
            <div class="pagination-wrapper" v-if="blockTotal > 0">
              <el-pagination
                v-model:current-page="blockPage"
                :page-size="blockPageSize"
                :total="blockTotal"
                layout="total, sizes, prev, pager, next, jumper"
                :page-sizes="[20, 50, 100, 200]"
                @size-change="handleBlockSizeChange"
                @current-change="handleBlockPageChange"
              />
            </div>
          </el-tab-pane>

          <!-- Tab3: 分类视图（对齐数据资产） -->
          <el-tab-pane label="分类视图" name="category">
            <div v-loading="categoryLoading" style="min-height: 200px">
              <el-tree
                v-if="categoryTree.length > 0"
                :data="categoryTree"
                :props="{ label: 'label', children: 'children' }"
                highlight-current
              >
                <template #default="{ data }">
                  <span class="category-node">
                    <span>{{ data.label }}</span>
                    <el-tag size="small" type="info" style="margin-left: 8px">{{ data.count }}</el-tag>
                  </span>
                </template>
              </el-tree>
              <el-empty v-else description="暂无分类数据" />
            </div>
          </el-tab-pane>

          <!-- Tab4: 统计信息（对齐数据资产） -->
          <el-tab-pane label="统计信息" name="statistics">
            <div v-loading="statsLoading" style="min-height: 200px">
              <div class="stats-summary">
                <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                  <div class="stats-card-title">内容块总数</div>
                  <div class="stats-card-value">{{ stats.total_blocks }}</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                  <div class="stats-card-title">已分类</div>
                  <div class="stats-card-value">{{ stats.classified_blocks }}</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                  <div class="stats-card-title">敏感块</div>
                  <div class="stats-card-value">{{ stats.sensitive_blocks }}</div>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
                  <div class="stats-card-title">敏感占比</div>
                  <div class="stats-card-value">{{ stats.sensitive_ratio }}%</div>
                </div>
              </div>
              <div class="stats-charts">
                <div class="chart-card">
                  <h3 class="chart-title">级别分布</h3>
                  <div class="chart-body">
                    <div v-if="Object.keys(stats.level_distribution).length > 0" class="bar-chart">
                      <div class="bar-row" v-for="(count, level) in stats.level_distribution" :key="level">
                        <span class="bar-label">{{ level }}</span>
                        <div class="bar-track">
                          <div class="bar-fill" :style="{ width: (count / maxLevelCount * 100) + '%' }" />
                        </div>
                        <span class="bar-count">{{ count }}</span>
                      </div>
                    </div>
                    <el-empty v-else description="暂无数据" />
                  </div>
                </div>
                <div class="chart-card">
                  <h3 class="chart-title">敏感类型分布（Top 15）</h3>
                  <div class="chart-body">
                    <div v-if="Object.keys(stats.type_distribution).length > 0" class="bar-chart">
                      <div class="bar-row" v-for="(count, type) in stats.type_distribution" :key="type">
                        <span class="bar-label bar-label-type">{{ type }}</span>
                        <div class="bar-track">
                          <div class="bar-fill bar-fill-type" :style="{ width: (count / maxTypeCount * 100) + '%' }" />
                        </div>
                        <span class="bar-count">{{ count }}</span>
                      </div>
                    </div>
                    <el-empty v-else description="暂无数据" />
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab5: 任务日志（对齐数据资产） -->
          <el-tab-pane label="任务日志" name="logs">
            <div v-loading="logsLoading" style="min-height: 200px">
              <div class="tab-toolbar">
                <el-button size="small" @click="loadLogs">刷新</el-button>
              </div>
              <el-table v-if="taskLogs.length > 0" :data="taskLogs" stripe style="width: 100%" max-height="500" :header-cell-style="{ background: '#f5f7fa', color: '#606266' }">
                <el-table-column label="时间" width="180">
                  <template #default="{ row }">{{ row.time ? new Date(row.time).toLocaleString('zh-CN', { hour12: false }) : '-' }}</template>
                </el-table-column>
                <el-table-column label="级别" width="80">
                  <template #default="{ row }">
                    <el-tag :type="row.level === 'ERROR' ? 'danger' : 'info'" size="small">{{ row.level }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="消息" min-width="300" show-overflow-tooltip />
              </el-table>
              <el-empty v-else description="暂无日志" />
            </div>
          </el-tab-pane>

        </el-tabs>
      </el-card>
    </template>

    <!-- 确认弹窗 -->
    <el-dialog v-model="showConfirmDialog" title="确认分类" width="500px">
      <div v-if="confirmDialogRow">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="块路径">{{ confirmDialogRow.block_path }}</el-descriptions-item>
          <el-descriptions-item label="文件">{{ confirmDialogRow.file_name }}</el-descriptions-item>
          <el-descriptions-item label="内容">{{ (confirmDialogRow.content_preview || '-').substring(0, 100) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px">
          <el-radio-group v-model="confirmSourceChoice">
            <el-card shadow="never" style="margin-bottom: 8px">
              <el-radio label="system">
                <span style="font-weight: 500">系统分类</span>
              </el-radio>
              <div style="margin-left: 24px; margin-top: 4px; color: #606266">
                <span>敏感类型：{{ confirmDialogRow.sensitive_type || '-' }}</span>
                <span style="margin-left: 16px">级别：{{ confirmDialogRow.level_code || '-' }}</span>
              </div>
            </el-card>
            <el-card v-if="confirmDialogRow.ai_category" shadow="never">
              <el-radio label="ai">
                <span style="font-weight: 500">AI分类</span>
              </el-radio>
              <div style="margin-left: 24px; margin-top: 4px; color: #606266">
                <span>{{ parseAiCategory(confirmDialogRow.ai_category) }}</span>
              </div>
            </el-card>
          </el-radio-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="showConfirmDialog = false">取消</el-button>
        <el-button type="primary" :loading="confirming" @click="handleConfirm">确认</el-button>
      </template>
    </el-dialog>

    <!-- 样本数据弹窗 -->
    <el-dialog v-model="showSampleDialog" title="内容预览" width="600px">
      <div v-loading="sampleLoading">
        <el-table v-if="sampleData.length" :data="sampleData" stripe style="width: 100%">
          <el-table-column prop="block_path" label="位置" min-width="120" />
          <el-table-column prop="content" label="内容" min-width="400" show-overflow-tooltip />
        </el-table>
        <el-empty v-else description="无样本数据" />
      </div>
    </el-dialog>

    <!-- 变更弹窗 -->
    <el-dialog v-model="showChangeDialog" title="变更分类" width="500px">
      <el-form :model="changeForm" label-width="100px">
        <el-form-item label="当前分类">
          <el-input :model-value="changeForm.current_type || '-'" disabled />
        </el-form-item>
        <el-form-item label="当前级别">
          <el-input :model-value="changeForm.current_level || '-'" disabled />
        </el-form-item>
        <el-form-item label="新级别" required>
          <el-select v-model="changeForm.level_code" placeholder="选择新级别" style="width: 100%">
            <el-option v-for="l in levelOptions" :key="l.level_code" :label="l.level_code" :value="l.level_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="新分类路径">
          <el-input v-model="changeForm.category_path" placeholder="可选" />
        </el-form-item>
        <el-form-item label="新敏感类型">
          <el-input v-model="changeForm.sensitive_type" placeholder="可选" />
        </el-form-item>
        <el-form-item label="变更原因" required>
          <el-input v-model="changeForm.reason" type="textarea" :rows="3" placeholder="请输入变更原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangeDialog = false">取消</el-button>
        <el-button type="primary" :loading="changing" @click="submitChange">提交变更</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  getFileTask, getFileTaskResults, getFileTaskResultsSummary,
  getFileTaskStatistics, getFileTaskCategoryView, getFileTaskExecutions,
  getFileTaskFilterOptions,
  confirmFileResult, changeFileResult,
} from '@/api/fileClassification'
import { getFileAssets } from '@/api/fileAsset'
import client from '@/api/client'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => Number(route.params.id))

const loading = ref(false)
const task = ref<any>(null)
const activeTab = ref('files')

// 模板名称映射
const templateMap = ref<Record<number, string>>({})
const templateName = computed(() => {
  if (!task.value?.template_id) return '-'
  return templateMap.value[task.value.template_id] || `#${task.value.template_id}`
})

// 状态映射
const statusMap: Record<string, { label: string; tag: string }> = {
  pending: { label: '待处理', tag: 'info' },
  queued: { label: '排队中', tag: 'warning' },
  running: { label: '执行中', tag: 'warning' },
  completed: { label: '已完成', tag: 'success' },
  stopped: { label: '已停止', tag: '' },
  failed: { label: '失败', tag: 'danger' },
}
function statusText(s: string) { return statusMap[s]?.label || s }
function statusType(s: string) { return (statusMap[s]?.tag || 'info') as any }
function formatTime(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// 总敏感块数（来自统计API）
const fileSensitiveCount = ref(0)

// ========== 文件摘要 ==========
const files = ref<any[]>([])
const filesLoading = ref(false)
const fileKeyword = ref('')
const filteredFiles = computed(() => {
  if (!fileKeyword.value.trim()) return files.value
  const kw = fileKeyword.value.trim().toLowerCase()
  return files.value.filter(f => f.file_name?.toLowerCase().includes(kw))
})
function handleFileSearch() {}

// ========== 块详情筛选 ==========
const blocks = ref<any[]>([])
const blocksLoading = ref(false)

// 筛选条件（与数据资产完全对齐）
const blockKeyword = ref('')
const blockFileAssetFilter = ref<number | null>(null)
const blockFileFilter = ref('')
const blockTypeFilter = ref('')
const blockContentFilter = ref('')
const isSensitiveFilter = ref('')
const levelFilter = ref('')
const aiTypeStatus = ref('')
const systemTypeStatus = ref('')
const manualTypeStatus = ref('')

const blockTotal = ref(0)
const blockPage = ref(1)
const blockPageSize = ref(20)
const blockIndexOffset = computed(() => (blockPage.value - 1) * blockPageSize.value + 1)

// 下拉选项（从后端实时加载）
const fileNameOptions = ref<string[]>([])
const blockTypeOptions = ref<string[]>([])
const fileAssetOptions = ref<any[]>([])
const allFileAssets = ref<any[]>([])
const systemTypeOptions = ref<string[]>([])
const aiCategoryOptions = ref<string[]>([])

// 监听所有筛选条件变化
function onFilterChange() {
  blockPage.value = 1
  loadBlocks()
}

const levelOptions = ref<any[]>([])

// ========== 统计信息 ==========
const statsLoading = ref(false)
const stats = reactive({
  total_blocks: 0,
  classified_blocks: 0,
  sensitive_blocks: 0,
  sensitive_ratio: 0,
  level_distribution: {} as Record<string, number>,
  type_distribution: {} as Record<string, number>,
})
const maxLevelCount = computed(() => Math.max(...Object.values(stats.level_distribution), 1))
const maxTypeCount = computed(() => Math.max(...Object.values(stats.type_distribution), 1))

// ========== 分类视图 ==========
const categoryLoading = ref(false)
const categoryTree = ref<any[]>([])

// ========== 任务日志 ==========
const logsLoading = ref(false)
const taskLogs = ref<any[]>([])

// ========== 确认/变更 ==========
const showConfirmDialog = ref(false)
const confirmDialogRow = ref<any>(null)
const confirming = ref(false)
const confirmSourceChoice = ref<'system' | 'ai'>('system')

const showChangeDialog = ref(false)
const changing = ref(false)
const changeForm = reactive({
  result_id: null as number | null,
  current_type: '',
  current_level: '',
  level_code: '',
  category_path: '',
  sensitive_type: '',
  reason: '',
})

// 批量确认
const selectedBlocks = ref<any[]>([])
const batchConfirmSource = ref<'system' | 'ai'>('system')

// 样本数据
const showSampleDialog = ref(false)
const sampleData = ref<any[]>([])
const sampleLoading = ref(false)
const sampleTotal = ref(0)

// 跳过确认弹窗
const skipConfirmDialog = ref(localStorage.getItem('skipConfirmDialog') === 'true')
watch(skipConfirmDialog, (val) => {
  localStorage.setItem('skipConfirmDialog', val ? 'true' : 'false')
})

// ========== 轮询进度（与数据库资产一致） ==========
let progressTimer: number | null = null

function startProgressPolling() {
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = window.setInterval(async () => {
    if (task.value?.status === 'running' || task.value?.status === 'queued') {
      try {
        const res: any = await getFileTaskProgress(taskId.value)
        if (res.data) {
          task.value.progress = res.data.progress ?? task.value.progress
          task.value.current_step = res.data.current_step ?? task.value.current_step
          task.value.processed_files = res.data.processed_files ?? task.value.processed_files
          task.value.processed_blocks = res.data.processed_blocks ?? task.value.processed_blocks
          task.value.ai_processed = res.data.ai_processed ?? task.value.ai_processed
          if (res.data.status && res.data.status !== 'running' && res.data.status !== 'queued') {
            task.value.status = res.data.status
            loadAll()
          }
        }
      } catch {
        // ignore polling errors
      }
    }
  }, 5000)
}

function stopProgressPolling() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

// 解析AI分类JSON，返回分类名称
function parseAiCategory(aiCategory: string | null): string {
  if (!aiCategory) return '-'
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory
    const path = data.category_path || ''
    if (path) {
      const parts = path.split('>').map((p: string) => p.trim()).filter(Boolean)
      return parts[parts.length - 1] || data.data_type_name || '-'
    }
    return data.data_type_name || '-'
  } catch {
    return aiCategory || '-'
  }
}

// 获取人工确认后的实际分类名称（与数据库资产一致）
function getManualTypeName(row: any): string {
  // 优先使用sensitive_type（确认时会把分类名写入此字段）
  if (row.sensitive_type) return row.sensitive_type
  // 如果有level_code说明已分类
  if (row.level_code) return row.level_code
  return '-'
}

let pollTimer: any = null

// ========== 加载函数 ==========

async function loadTask() {
  try {
    const res: any = await getFileTask(taskId.value)
    task.value = res.data || res
    if (task.value?.status === 'running' || task.value?.status === 'queued' || task.value?.status === 'pending') {
      startProgressPolling()
    } else {
      stopProgressPolling()
    }
  } catch {
    task.value = null
  }
}

async function loadFiles() {
  filesLoading.value = true
  try {
    const res: any = await getFileTaskResultsSummary(taskId.value)
    const items = res.data || []
    files.value = items
    fileNameOptions.value = [...new Set(items.map((f: any) => f.file_name).filter(Boolean))].sort() as string[]
  } finally {
    filesLoading.value = false
  }
}

async function loadBlocks() {
  blocksLoading.value = true
  try {
    const params: Record<string, any> = {
      page: blockPage.value,
      page_size: blockPageSize.value,
    }
    if (blockKeyword.value.trim()) params.keyword = blockKeyword.value.trim()
    else if (blockContentFilter.value.trim()) params.keyword = blockContentFilter.value.trim()
    if (blockFileAssetFilter.value !== null) params.file_asset_id = blockFileAssetFilter.value
    if (blockFileFilter.value) params.file_name = blockFileFilter.value
    if (blockTypeFilter.value) params.block_type = blockTypeFilter.value
    if (isSensitiveFilter.value === 'true') params.is_sensitive = 1
    if (isSensitiveFilter.value === 'false') params.is_sensitive = 0
    if (aiTypeStatus.value) params.ai_type_status = aiTypeStatus.value
    if (systemTypeStatus.value) params.system_type_status = systemTypeStatus.value
    if (manualTypeStatus.value === 'confirmed') params.is_confirmed = 1
    else if (manualTypeStatus.value === 'changed') params.is_changed = 1
    else if (manualTypeStatus.value === 'unconfirmed') { params.is_confirmed = 0; params.is_changed = 0 }
    if (levelFilter.value) params.level_code = levelFilter.value

    const res: any = await getFileTaskResults(taskId.value, params)
    blocks.value = res.data?.items || []
    blockTotal.value = res.data?.total || 0
  } finally {
    blocksLoading.value = false
  }
}

async function loadStatistics() {
  statsLoading.value = true
  try {
    const res: any = await getFileTaskStatistics(taskId.value)
    if (res.data) {
      stats.total_blocks = res.data.total_blocks || 0
      stats.classified_blocks = res.data.classified_blocks || 0
      stats.sensitive_blocks = res.data.sensitive_blocks || 0
      stats.sensitive_ratio = res.data.sensitive_ratio || 0
      stats.level_distribution = res.data.level_distribution || {}
      stats.type_distribution = res.data.type_distribution || {}
    }
  } finally {
    statsLoading.value = false
  }
}

async function loadCategoryView() {
  categoryLoading.value = true
  try {
    const res: any = await getFileTaskCategoryView(taskId.value)
    categoryTree.value = res.data || []
  } finally {
    categoryLoading.value = false
  }
}

async function loadLogs() {
  logsLoading.value = true
  try {
    const res: any = await getFileTaskExecutions(taskId.value)
    taskLogs.value = res.data?.logs || []
  } finally {
    logsLoading.value = false
  }
}

async function loadFilterOptions() {
  try {
    const res: any = await getFileTaskFilterOptions(taskId.value)
    if (res.data) {
      blockTypeOptions.value = (res.data.block_types || []) as string[]
    }
    // 加载系统分类和AI分类的筛选选项
    try {
      const sampleRes: any = await getFileTaskResults(taskId.value, { page: 1, page_size: 500 })
      const items = sampleRes.data?.items || []
      const systemTypes = new Set<string>()
      const aiCategories = new Set<string>()
      for (const item of items) {
        if (item.sensitive_type) systemTypes.add(item.sensitive_type)
        if (item.ai_category) aiCategories.add(parseAiCategory(item.ai_category))
      }
      systemTypeOptions.value = Array.from(systemTypes).sort()
      aiCategoryOptions.value = Array.from(aiCategories).sort()
    } catch {}
  } catch {}
}

// 加载下拉数据源
async function loadLookups() {
  try {
    const [templatesRes, levelsRes, assetsRes] = await Promise.all([
      client.get('/templates', { params: { page: 1, page_size: 100 } }),
      client.get('/levels', { params: { page: 1, page_size: 100 } }),
      getFileAssets({ page: 1, page_size: 100 }),
    ])
    const tplItems = templatesRes.data?.items || templatesRes.data || []
    for (const t of tplItems) templateMap.value[t.id] = t.name
    const lvlItems = levelsRes.data?.items || levelsRes.data || []
    levelOptions.value = lvlItems
    allFileAssets.value = assetsRes.data?.items || []
    fileAssetOptions.value = allFileAssets.value
  } catch {
    levelOptions.value = []
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(loadAll, 5000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function loadAll() {
  loading.value = true
  try {
    await loadTask()
    await loadFilterOptions()
    if (activeTab.value === 'files') await loadFiles()
    if (activeTab.value === 'blocks') await loadBlocks()
    if (fileSensitiveCount.value === 0 && task.value?.status === 'completed') {
      const res: any = await getFileTaskStatistics(taskId.value)
      if (res.data) fileSensitiveCount.value = res.data.sensitive_blocks || 0
    }
  } finally {
    loading.value = false
  }
}

function handleTabChange(name: any) {
  if (name === 'files' && !files.value.length) loadFiles()
  if (name === 'blocks' && !blocks.value.length) loadBlocks()
  if (name === 'category' && !categoryTree.value.length) loadCategoryView()
  if (name === 'statistics') loadStatistics()
  if (name === 'logs' && !taskLogs.value.length) loadLogs()
}

// ========== 分页 ==========
function handleBlockSizeChange(size: number) {
  blockPageSize.value = size
  blockPage.value = 1
  loadBlocks()
}
function handleBlockPageChange() {
  loadBlocks()
}

// ========== 确认/变更弹窗 ==========
function openConfirmDialog(row: any) {
  confirmDialogRow.value = row
  confirmSourceChoice.value = 'system'
  showConfirmDialog.value = true
}

async function handleConfirm() {
  if (!confirmDialogRow.value) return
  confirming.value = true
  try {
    await confirmFileResult(taskId.value, confirmDialogRow.value.id, confirmSourceChoice.value)
    ElMessage.success('已确认')
    showConfirmDialog.value = false
    confirmDialogRow.value = null
    loadBlocks()
  } catch (err: any) {
    ElMessage.error(err?.message || '确认失败')
  } finally {
    confirming.value = false
  }
}

function openChangeDialog(row: any) {
  changeForm.result_id = row.id
  changeForm.current_type = row.sensitive_type || ''
  changeForm.current_level = row.level_code || row.level_code_manual || ''
  changeForm.level_code = row.level_code_manual || row.level_code || ''
  changeForm.category_path = row.category_path_manual || row.category_path || ''
  changeForm.sensitive_type = row.sensitive_type || ''
  changeForm.reason = ''
  showChangeDialog.value = true
}

async function submitChange() {
  if (!changeForm.level_code && !changeForm.category_path && !changeForm.sensitive_type) {
    ElMessage.warning('请至少填写一项变更')
    return
  }
  if (!changeForm.reason.trim()) {
    ElMessage.warning('请输入变更原因')
    return
  }
  changing.value = true
  try {
    await changeFileResult(taskId.value, changeForm.result_id!, {
      level_code: changeForm.level_code || undefined,
      category_path: changeForm.category_path || undefined,
      sensitive_type: changeForm.sensitive_type || undefined,
      reason: changeForm.reason.trim(),
    })
    ElMessage.success('变更已提交')
    showChangeDialog.value = false
    loadBlocks()
  } catch (err: any) {
    ElMessage.error(err?.message || '变更失败')
  } finally {
    changing.value = false
  }
}

// 批量选择
function handleBlockSelectionChange(selection: any[]) {
  selectedBlocks.value = selection
}

// 系统分类双击确认
async function handleSystemConfirm(row: any) {
  if (skipConfirmDialog.value) {
    try {
      await confirmFileResult(taskId.value, row.id, 'system')
      ElMessage.success('已确认')
      loadBlocks()
    } catch (err: any) {
      ElMessage.error(err?.message || '确认失败')
    }
    return
  }
  confirmDialogRow.value = row
  showConfirmDialog.value = true
}

// AI分类双击确认
async function handleAiConfirm(row: any) {
  if (skipConfirmDialog.value) {
    try {
      await confirmFileResult(taskId.value, row.id, 'ai')
      ElMessage.success('已确认')
      loadBlocks()
    } catch (err: any) {
      ElMessage.error(err?.message || '确认失败')
    }
    return
  }
  confirmDialogRow.value = row
  showConfirmDialog.value = true
}

// 批量确认
async function handleBatchConfirm() {
  if (!selectedBlocks.value.length) {
    ElMessage.warning('请先选择要确认的项')
    return
  }
  const confirmable = selectedBlocks.value.filter((b: any) => !b.is_confirmed && !b.is_changed)
  if (!confirmable.length) {
    ElMessage.warning('所选项均已确认或变更')
    return
  }
  try {
    for (const block of confirmable) {
      await confirmFileResult(taskId.value, block.id, batchConfirmSource.value || 'system')
    }
    ElMessage.success(`已确认 ${confirmable.length} 项`)
    selectedBlocks.value = []
    loadBlocks()
  } catch (err: any) {
    ElMessage.error(err?.message || '批量确认失败')
  }
}

// 样本数据
async function handleBlockSample(row: any) {
  showSampleDialog.value = true
  sampleLoading.value = false
  // 直接使用该行的content_preview数据
  sampleData.value = [{
    content: row.content_preview || '-',
    block_path: row.block_path || '-',
  }]
  sampleTotal.value = 1
}

onMounted(async () => {
  await loadLookups()
  await loadAll()
})
onUnmounted(() => { stopPolling() })
</script>

<style scoped>
.page-container {
  padding: 20px 24px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.info-card { margin-bottom: 0; }

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
  white-space: nowrap;
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
  flex-wrap: wrap;
  gap: 0;
}

.block-path {
  color: #409eff;
  cursor: default;
  font-family: monospace;
  font-size: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 分类视图 */
.category-node {
  display: flex;
  align-items: center;
}

/* 统计卡片（对齐数据资产） */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stats-card {
  padding: 20px;
  border-radius: 8px;
  color: #fff;
  text-align: center;
}

.stats-card-title {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stats-card-value {
  font-size: 32px;
  font-weight: 700;
}

/* 图表容器（对齐数据资产） */
.stats-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
}

.chart-title {
  margin: 0;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.chart-body {
  padding: 16px;
  min-height: 200px;
}

/* 柱状图 */
.bar-chart { margin-top: 4px; }
.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.bar-label { width: 60px; font-size: 13px; text-align: right; flex-shrink: 0; }
.bar-label-type { width: 80px; }
.bar-track { flex: 1; height: 20px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: #409eff; border-radius: 4px; transition: width 0.3s; min-width: 2px; }
.bar-fill-type { background: #67c23a; }
.bar-count { width: 40px; font-size: 12px; color: #606266; flex-shrink: 0; }

/* 双击确认样式 */
.dblclick-confirm {
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #ecf5ff;
  color: #409eff;
  transition: all 0.15s;
  display: inline-block;
}
.dblclick-confirm:hover {
  background: #d9ecff;
  border-color: #409eff;
}
.dblclick-confirm.is-locked {
  cursor: not-allowed;
  opacity: 0.6;
  background: #f5f5f5;
  color: #909399;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-top: 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: var(--el-border-radius-base);
}
</style>
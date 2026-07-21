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
          <span class="info-label">数据资产</span>
          <span class="info-value">{{ (taskDetail.asset_names || []).join('、') || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">状态</span>
          <el-tooltip :content="taskDetail.error_message || ''" placement="top" :disabled="!taskDetail.error_message">
            <el-tag :type="statusTag(taskDetail.status)" size="small">
              {{ statusLabel(taskDetail.status) }}
            </el-tag>
          </el-tooltip>
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
        <div class="info-item" v-if="taskDetail.current_step">
          <span class="info-label">当前步骤</span>
          <span class="info-value">{{ taskDetail.current_step }}</span>
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
            <el-select
              v-model="columnAssetFilter"
              placeholder="资产"
              clearable
              size="small"
              style="width: 130px; margin-right: 8px"
              filterable
              @change="onAssetFilterChange"
            >
              <el-option
                v-for="a in assetOptions"
                :key="a"
                :label="a"
                :value="a"
              />
            </el-select>
            <el-select
              v-model="columnDatabaseFilter"
              placeholder="库"
              clearable
              size="small"
              style="width: 130px; margin-right: 8px"
              filterable
              @change="onDatabaseFilterChange"
            >
              <el-option
                v-for="d in filteredDatabaseOptions"
                :key="d"
                :label="d"
                :value="d"
              />
            </el-select>
            <el-select
              v-model="columnTableFilter"
              placeholder="表"
              clearable
              size="small"
              style="width: 130px; margin-right: 8px"
              filterable
              @change="resetColumnFilter"
            >
              <el-option
                v-for="t in filteredTableOptions"
                :key="t"
                :label="t"
                :value="t"
              />
            </el-select>
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
            <el-select
              v-model="isMaskedFilter"
              placeholder="是否脱敏"
              clearable
              size="small"
              style="width: 100px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option label="已脱敏" value="true" />
              <el-option label="未脱敏" value="false" />
            </el-select>
            <el-select
              v-model="isEncryptedFilter"
              placeholder="是否加密"
              clearable
              size="small"
              style="width: 100px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option label="已加密" value="true" />
              <el-option label="未加密" value="false" />
            </el-select>
            <el-select
              v-model="systemTypeStatus"
              placeholder="系统类型"
              clearable
              filterable
              size="small"
              style="width: 130px; margin-right: 4px"
              @change="resetColumnFilter"
            >
              <el-option label="未确认" value="unconfirmed" />
              <el-option label="已确认" value="confirmed_top" />
              <el-option
                v-for="t in systemTypeOptions"
                :key="t"
                :label="t"
                :value="t"
              />
            </el-select>
            <el-select
              v-model="aiTypeStatus"
              placeholder="AI类型"
              clearable
              filterable
              size="small"
              style="width: 130px; margin-right: 4px"
              @change="resetColumnFilter"
            >
              <el-option label="未确认" value="unconfirmed" />
              <el-option label="已确认" value="confirmed_top" />
              <el-option
                v-for="a in aiCategoryOptions"
                :key="a"
                :label="a"
                :value="a"
              />
            </el-select>
            <el-select
              v-model="manualTypeStatus"
              placeholder="人工类型"
              clearable
              filterable
              size="small"
              style="width: 130px; margin-right: 4px"
              @change="resetColumnFilter"
            >
              <el-option label="未确认" value="unconfirmed" />
              <el-option label="已确认" value="confirmed_top" />
              <el-option
                v-for="m in manualTypeOptions"
                :key="m"
                :label="m"
                :value="m"
              />
            </el-select>
            <el-select
              v-model="levelFilter"
              placeholder="数据分级"
              clearable
              filterable
              size="small"
              style="width: 90px; margin-right: 8px"
              @change="resetColumnFilter"
            >
              <el-option
                v-for="l in levelFilterOptions"
                :key="l"
                :label="l"
                :value="l"
              />
            </el-select>
          </div>
          <el-table :data="columns" stripe style="width: 100%" v-loading="columnsLoading" max-height="500" :header-cell-style="{ background: '#f5f7fa', color: '#606266' }" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="45" fixed />
            <el-table-column type="index" label="序号" width="60" fixed />
            <el-table-column label="字段名" min-width="140" fixed show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip :content="`资产: ${row.asset_name || '-'}\n库: ${row.database_name || '-'}\n表: ${row.table_name || '-'}`" placement="top" :enterable="false">
                  <span class="column-name">{{ row.column_name }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="comment" label="注释" min-width="120" show-overflow-tooltip />
            <el-table-column label="系统分类" min-width="90" show-overflow-tooltip>
              <template #default="{ row }">
                <span
                  v-if="row.system_type"
                  :class="['dblclick-confirm', { 'is-locked': row.manual_type }]"
                  :title="row.manual_type ? '已变更或确认' : '双击确认'"
                  @dblclick.stop="!row.manual_type && handleConfirmWithSource(row, 'system')"
                >{{ row.system_type }}</span>
                <span v-else style="color:#999">-</span>
              </template>
            </el-table-column>
            <el-table-column label="AI分类" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                <span
                  v-if="row.ai_category && row.ai_category !== '{}'"
                  :class="['dblclick-confirm', { 'is-locked': row.manual_type || !isAiCategoryMatched(row.ai_category) }]"
                  :title="row.manual_type ? '已变更或确认' : (isAiCategoryMatched(row.ai_category) ? '双击确认' : '无匹配分类')"
                  @dblclick.stop="!row.manual_type && isAiCategoryMatched(row.ai_category) && handleConfirmWithSource(row, 'ai')"
                >
                  <el-tooltip :content="getFullAiCategory(row.ai_category)" placement="top" :enterable="false">
                    <span>{{ getDisplayAiCategory(row.ai_category) }}</span>
                  </el-tooltip>
                </span>
                <span v-else style="color:#c0c4cc">-</span>
              </template>
            </el-table-column>
            <el-table-column label="人工确认" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tag v-if="row.manual_type" type="success" size="small" effect="plain" class="manual-tag">{{ row.manual_type }}</el-tag>
                <el-button
                  v-else
                  type="primary"
                  link
                  size="small"
                  @click="openConfirmDialog(row)"
                >
                  待确认
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="数据分级" min-width="70" align="center">
              <template #default="{ row }">
                <span
                  v-if="row.level"
                  class="level-badge"
                  :style="getLevelBadgeStyle(row.level)"
                >
                  {{ row.level }}
                </span>
                <span v-else style="color:#999">-</span>
              </template>
            </el-table-column>
            <el-table-column label="是否敏感" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small" effect="plain">
                  {{ row.is_sensitive ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数据分类" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ (row.category_path_manual || row.category_path || '').split('>')[0] || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="是否脱敏" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_masked === 'confirmed' ? 'success' : 'info'" size="small" effect="plain">
                  {{ row.is_masked === 'confirmed' ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="是否加密" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_encrypted === 'confirmed' ? 'warning' : 'info'" size="small" effect="plain">
                  {{ row.is_encrypted === 'confirmed' ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="risk_suggestion" label="建议" min-width="120" show-overflow-tooltip />
            <el-table-column prop="note" label="备注" min-width="100" show-overflow-tooltip />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleColumnSample(row)">样本</el-button>
                <el-button link type="primary" size="small" @click="openChangeDialog(row)">变更</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="batch-actions" v-if="selectedColumns.length > 0">
            <span>已选择 {{ selectedColumns.length }} 项</span>
            <el-select v-model="batchConfirmSource" placeholder="选择确认来源" size="small" style="width: 160px; margin-right: 8px">
              <el-option label="系统分类确认" value="system" />
              <el-option label="AI分类确认" value="ai" />
            </el-select>
            <el-button size="small" type="success" @click="handleBatchConfirm">批量确认</el-button>
            <el-button size="small" type="warning" @click="handleBatchChange">批量变更</el-button>
          </div>
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
          <div v-loading="statsLoading" class="stats-content">
            <div class="stats-summary">
              <div class="summary-card">
                <div class="summary-label">总字段数</div>
                <div class="summary-value">{{ statsData.total_fields || 0 }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">已分类</div>
                <div class="summary-value success">{{ statsData.classified_fields || 0 }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">敏感字段</div>
                <div class="summary-value danger">{{ statsData.sensitive_fields || 0 }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">敏感占比</div>
                <div class="summary-value warning">{{ statsData.sensitive_ratio || '0%' }}</div>
              </div>
            </div>
            <div class="stats-charts">
              <div v-if="typeRatioChartData.labels.length" class="chart-card">
                <h4>类型占比</h4>
                <div class="chart-container">
                  <div ref="typeRatioCanvas" style="width: 100%; height: 300px"></div>
                </div>
              </div>
              <div v-if="levelDistChartData.labels.length" class="chart-card">
                <h4>级别分布</h4>
                <div class="chart-container">
                  <div ref="levelDistCanvas" style="width: 100%; height: 300px"></div>
                </div>
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
              :label="lv.level_code"
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


    <!-- 样本弹窗 -->
    <el-dialog v-model="showSampleDialog" title="样本数据" width="600px">
      <div style="font-size: 13px; color: #909399; margin-bottom: 12px; padding: 0 4px;">
        每个字段最多采集5条样本数据 📊
      </div>
      <div v-loading="sampleLoading">
        <el-table v-if="sampleData.length" :data="sampleData" stripe style="width: 100%">
          <el-table-column type="index" label="#" min-width="50" />
          <el-table-column prop="value" label="值" />
        </el-table>
        <el-empty v-else description="无样本数据" />
      </div>
    </el-dialog>

    <!-- 确认选择弹窗（待确认点击后展示） -->
    <el-dialog v-model="showConfirmDialog" title="确认分类" width="520px" @close="clearConfirmDialog">
      <div v-if="confirmDialogRow" class="confirm-options">
        <!-- 系统分类选项（待确认弹窗或双击系统分类时显示） -->
        <div
          v-if="confirmDialogRow.system_type && (confirmDialogShowSource === 'both' || confirmDialogShowSource === 'system')"
          class="confirm-option-card"
          :class="{ selected: confirmDialogSelected === 'system' }"
          @click="confirmDialogSelected = 'system'"
          @dblclick="handleConfirmFromDialog('system')"
        >
          <div class="confirm-option-header">
            <el-tag type="primary" size="small" effect="dark">系统分类</el-tag>
            <span class="confirm-option-hint">双击确认</span>
          </div>
          <div class="confirm-option-body">
            <span class="confirm-option-type">{{ confirmDialogRow.system_type }}</span>
            <span class="confirm-option-detail">
              级别: {{ confirmDialogRow.level_code || '-' }} | 敏感: {{ confirmDialogRow.is_sensitive ? '是' : '否' }}
            </span>
          </div>
        </div>
        <!-- AI分类选项（待确认弹窗或双击AI分类时显示） -->
        <div
          v-if="confirmDialogRow.ai_category && confirmDialogRow.ai_category !== '{}' && (confirmDialogShowSource === 'both' || confirmDialogShowSource === 'ai')"
          class="confirm-option-card"
          :class="{ selected: confirmDialogSelected === 'ai' }"
          @click="confirmDialogSelected = 'ai'"
          @dblclick="handleConfirmFromDialog('ai')"
        >
          <div class="confirm-option-header">
            <el-tag type="warning" size="small" effect="dark">AI分类</el-tag>
            <span class="confirm-option-hint">双击确认</span>
          </div>
          <div class="confirm-option-body">
            <span class="confirm-option-type">{{ getAiParentChild(confirmDialogRow.ai_category) }}</span>
            <span class="confirm-option-detail">
              级别: {{ getAiLevelFromCategory(confirmDialogRow.ai_category) }} | 敏感: {{ getAiSensitiveFromCategory(confirmDialogRow.ai_category) ? '是' : '否' }}
            </span>
          </div>
        </div>
        <el-empty v-if="!confirmDialogRow.system_type && (!confirmDialogRow.ai_category || confirmDialogRow.ai_category === '{}')" description="无分类结果可确认" />
      </div>
      <template #footer>
        <div v-if="confirmDialogShowSource !== 'both'" style="display: flex; align-items: center; margin-right: auto;">
          <el-checkbox v-model="skipConfirmDialog">跳过弹窗确认</el-checkbox>
        </div>
        <div v-else style="flex: 1;"></div>
        <el-button @click="showConfirmDialog = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!confirmDialogSelected"
          @click="handleConfirmFromDialog(confirmDialogSelected)"
        >确认{{ confirmDialogSelected === 'system' ? '系统' : 'AI' }}分类</el-button>
      </template>
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
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
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
import { getSettings } from '@/api/system'
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
  // 根据级别代码判断敏感标签类型（使用 levelOptions 中已加载的数据）
  if (!level) return 'info'
  const found = levelOptions.value.find(l => l.level_code === level || l.name === level)
  if (found) {
    // 如果该级别在 levelOptions 中标记为敏感，使用 warning 或 danger
    if (found.is_sensitive) {
      return 'danger'
    }
    return 'info'
  }
  // 不在选项中的级别默认 info
  return 'info'
}

// 级别颜色映射
const levelColorMap = ref<Record<string, string>>({})

// ========== AI分类解析辅助函数 ==========
// 是否仅用模版分类数据（从系统设置获取）
const onlyTemplateCategories = ref(false)

// 从系统设置加载 onlyTemplateCategories
async function loadOnlyTemplateSetting() {
  try {
    const res = await getSettings()
    if (res.data?.ai?.only_template_categories !== undefined) {
      onlyTemplateCategories.value = res.data.ai.only_template_categories === 'true'
    }
  } catch { /* ignore */ }
}

// 解析AI分类JSON，提取父类和子类用于表格显示
function getDisplayAiCategory(aiCategory: any): string {
  if (!aiCategory || aiCategory === '{}') return ''
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory
    // 如果没匹配到模板（unmatched=true），但有category_path，则解析显示
    if (data.unmatched) {
      const path = data.category_path || ''
      if (path && path !== '无') {
        // 格式是 "无 > 子类"，提取子类显示
        const parts = path.split('>').filter(Boolean)
        if (parts.length >= 2) {
          return parts[parts.length - 1]  // 返回AI的子类
        }
        // 只有一级的情况（如"无 > 通知内容"），显示最后一部分
        return parts[parts.length - 1] || '无'
      }
      return '无'
    }
    const path = data.category_path || ''
    if (!path) {
      // 没有路径但有AI推荐的类型名，显示推荐类型
      return data.data_type_name || '无'
    }
    const parts = path.split('>').filter(Boolean)
    // 只显示子类（二级分类）
    if (parts.length >= 2) {
      return parts[parts.length - 1]  // 取最后一个（子类）
    }
    // 只有一级分类的情况
    return data.data_type_name || parts[parts.length - 1] || '无'
  } catch {
    return typeof aiCategory === 'string' ? aiCategory : ''
  }
}

// 获取完整的AI分类信息（用于tooltip），显示父类和子类
function getFullAiCategory(aiCategory: any): string {
  if (!aiCategory || aiCategory === '{}') return ''
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory
    const parts: string[] = []

    // 如果没匹配到模板（unmatched），但有category_path则解析显示
    if (data.unmatched) {
      const path = data.category_path || ''
      if (path && path !== '无') {
        const pathParts = path.split('>').filter(Boolean)
        // 父类 = 第一个（可能是"无"）
        const parentClass = pathParts[0] || '无'
        // 子类优先使用 data_type_name，其次使用路径的最后一部分
        const childClass = data.data_type_name || (pathParts[pathParts.length - 1] || '无')
        parts.push('父类: ' + parentClass)
        parts.push('子类: ' + childClass)
      } else {
        parts.push('父类: 无')
        parts.push('子类: ' + (data.data_type_name || '无'))
      }
      if (data.level_code) {
        parts.push('级别: ' + data.level_code)
      }
      return parts.join(' | ')
    }

    const path = data.category_path || ''

    if (path) {
      const pathParts = path.split('>').filter(Boolean)
      // 父类 = 第一个
      const parentClass = pathParts[0] || ''
      // 子类 = 最后一个，但优先使用 data_type_name
      const childClass = data.data_type_name || (pathParts[pathParts.length - 1] || '')

      parts.push('父类: ' + parentClass)
      parts.push('子类: ' + childClass)
    }

    // 级别
    if (data.level_code) {
      parts.push('级别: ' + data.level_code)
    }
    return parts.join(' | ')
  } catch {
    return typeof aiCategory === 'string' ? aiCategory : ''
  }
}

// 检查AI分类是否匹配到模板（用于判断是否能双击确认）
function isAiCategoryMatched(aiCategory: any): boolean {
  if (!aiCategory || aiCategory === '{}') return false
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory
    // unmatched=true 表示没匹配到模板，但如果AI返回了category_path或data_type_name，也允许确认
    if (data.unmatched) {
      const path = data.category_path || ''
      // 只要有有效的category_path（不是"无"且不是空），或是有data_type_name，就允许确认
      if (path && path !== '无') {
        return true
      }
      // 即使没有category_path，只要有data_type_name也允许确认
      if (data.data_type_name) {
        return true
      }
      return false
    }
    return true
  } catch {
    return false
  }
}

// 获取AI分类的父类和子类显示（用于确认弹窗）
function getAiParentChild(aiCategory: any): string {
  if (!aiCategory || aiCategory === '{}') return ''
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory

    // 没匹配到模板（unmatched），但有category_path则解析显示
    if (data.unmatched) {
      const path = data.category_path || ''
      if (path && path !== '无') {
        const pathParts = path.split('>').filter(Boolean)
        // 父类 = 第一个
        const parentClass = pathParts[0] || '无'
        // 子类优先使用 data_type_name，其次使用路径的最后一部分
        let childClass = data.data_type_name || (pathParts[pathParts.length - 1] || '无')
        return '父类: ' + parentClass + ' | 子类: ' + childClass
      }
      return '父类: 无 | 子类: ' + (data.data_type_name || '无')
    }

    const path = data.category_path || ''

    if (!path) {
      // 没有路径，有AI推荐类型
      return '父类: 无 | 子类: ' + (data.data_type_name || '无')
    }

    const pathParts = path.split('>').filter(Boolean)
    // 父类 = 第一个
    const parentClass = pathParts[0] || '无'
    // 子类 = 最后一个
    let childClass = pathParts[pathParts.length - 1] || '无'

    if (data.data_type_name && childClass !== data.data_type_name) {
      // 子类名称和AI推荐类型不一致时显示AI推荐
      childClass = data.data_type_name
    }

    return '父类: ' + parentClass + ' | 子类: ' + childClass
  } catch {
    return typeof aiCategory === 'string' ? aiCategory : ''
  }
}

function getAiLevelFromCategory(aiCategory: any): string {
  if (!aiCategory || aiCategory === '{}') return ''
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory
    return data.level_code || data.level || ''
  } catch {
    return ''
  }
}

function getAiSensitiveFromCategory(aiCategory: any): boolean {
  if (!aiCategory || aiCategory === '{}') return false
  try {
    const data = typeof aiCategory === 'string' ? JSON.parse(aiCategory) : aiCategory
    return !!data.is_sensitive
  } catch {
    return false
  }
}

function getLevelBadgeStyle(level: string): Record<string, string> {
  const color = levelColorMap.value[level]
  if (!color) return { backgroundColor: '#6b7280', color: '#fff' }
  return {
    backgroundColor: color,
    color: '#fff',
    borderRadius: '4px',
  }
}

async function loadLevelColors() {
  try {
    const res = await getLevels()
    const data = res.data || []
    for (const l of data) {
      if (l.level_code && l.color) {
        levelColorMap.value[l.level_code] = l.color
      }
    }
  } catch {
    // fallback
    levelColorMap.value = {
      'L1': '#52C41A',
      'L2': '#FF7A00',
      'L3': '#FF4D4F',
    }
  }
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
      const dtRes = await getDataTypes(res.data.template_id, { page_size: 100 })
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
  // 填充数据分级筛选选项
  levelFilterOptions.value = levelOptions.value.map((l: any) => l.level_code || l.name).filter(Boolean)
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
const selectedColumns = ref<any[]>([])
const columnKeyword = ref('')
const columnAssetFilter = ref('')
const columnDatabaseFilter = ref('')
const columnTableFilter = ref('')
const columnNameFilter = ref('')
const commentFilter = ref('')
const isSensitiveFilter = ref('')
const isMaskedFilter = ref('')
const isEncryptedFilter = ref('')
const systemTypeFilter = ref('')
const aiCategoryFilter = ref('')
const manualTypeFilter = ref('')
const levelFilter = ref('')

// 新增类型状态筛选
const manualTypeStatus = ref('')
const systemTypeStatus = ref('')
const aiTypeStatus = ref('')
const manualTypeInput = ref('')
const systemTypeInput = ref('')
const aiTypeInput = ref('')

// 确认对话框相关
const showConfirmDialog = ref(false)
const confirmDialogRow = ref<any>(null)
const confirmDialogSelected = ref<'system' | 'ai'>('system')
const batchConfirmSource = ref<'system' | 'ai'>('system')
// 弹窗显示哪些选项：'both'/'system'/'ai'
const confirmDialogShowSource = ref<'both' | 'system' | 'ai'>('both')
// 双击确认是否跳过弹窗确认
// 双击确认是否跳过弹窗确认（从localStorage读取）
const skipConfirmDialog = ref(localStorage.getItem('skipConfirmDialog') === 'true')

// 筛选选项
const systemTypeOptions = ref<string[]>([])
const aiCategoryOptions = ref<string[]>([])
const manualTypeOptions = ref<string[]>([])
const levelFilterOptions = ref<string[]>([])
const columnTotal = ref(0)
const columnPage = ref(1)
const columnPageSize = ref(20)

// 筛选选项
const assetOptions = ref<string[]>([])
const databaseOptions = ref<string[]>([])
const tableOptions = ref<string[]>([])
const databasesByAsset = ref<Record<string, string[]>>({})
const tablesByDatabase = ref<Record<string, string[]>>({})

// 级联筛选后的选项
const filteredDatabaseOptions = computed(() => {
  if (columnAssetFilter.value && databasesByAsset.value[columnAssetFilter.value]) {
    return databasesByAsset.value[columnAssetFilter.value]
  }
  return databaseOptions.value
})

const filteredTableOptions = computed(() => {
  if (columnDatabaseFilter.value && tablesByDatabase.value[columnDatabaseFilter.value]) {
    return tablesByDatabase.value[columnDatabaseFilter.value]
  }
  return tableOptions.value
})

function onAssetFilterChange() {
  columnDatabaseFilter.value = ''
  columnTableFilter.value = ''
  resetColumnFilter()
}

function onDatabaseFilterChange() {
  columnTableFilter.value = ''
  resetColumnFilter()
}

function handleSelectionChange(selection: any[]) {
  selectedColumns.value = selection
}

async function handleBatchConfirm() {
  if (!selectedColumns.value.length) {
    ElMessage.warning('请先选择字段')
    return
  }
  if (!batchConfirmSource.value) {
    ElMessage.warning('请选择确认来源（系统分类/AI分类）')
    return
  }
  // 过滤出可以确认的字段（没有人工确认过的才需要确认）
  const confirmable = selectedColumns.value.filter((c: any) => !c.manual_type)
  if (!confirmable.length) {
    ElMessage.warning('所选字段均已确认，无需再次确认')
    return
  }
  if (confirmable.length < selectedColumns.value.length) {
    ElMessage.warning(`已过滤 ${selectedColumns.value.length - confirmable.length} 个已确认的字段`)
  }
  try {
    const column_ids = confirmable.map((c: any) => c.column_id)
    await batchConfirm(taskId, { column_ids, confirm_source: batchConfirmSource.value })
    ElMessage.success(`批量确认成功（${batchConfirmSource.value === 'ai' ? 'AI分类' : '系统分类'}）`)
    selectedColumns.value = []
    fetchColumns()
  } catch (err: any) {
    ElMessage.error(err?.message || '批量确认失败')
  }
}

async function handleBatchChange() {
  if (!selectedColumns.value.length) {
    ElMessage.warning('请先选择字段')
    return
  }
  // 过滤出可以变更的字段（没有人工确认过的）
  const changeable = selectedColumns.value.filter((c: any) => !c.manual_type)
  if (!changeable.length) {
    ElMessage.warning('所选字段均已变更或确认，无法再次变更')
    return
  }
  if (changeable.length < selectedColumns.value.length) {
    ElMessage.warning(`已过滤 ${selectedColumns.value.length - changeable.length} 个已变更/确认的字段`)
  }
  // TODO: 批量变更需要选择目标类型
  ElMessage.info('请在变更弹窗中选择目标类型')
}

async function fetchColumns() {
  columnsLoading.value = true
  try {
    // 先用大page_size获取全部数据用于提取筛选选项
    const allParams: Record<string, any> = { page: 1, page_size: 5000 }
    if (columnKeyword.value.trim()) allParams.keyword = columnKeyword.value.trim()
    if (columnAssetFilter.value) allParams.asset_name = columnAssetFilter.value
    if (columnDatabaseFilter.value) allParams.database_name = columnDatabaseFilter.value
    if (columnTableFilter.value) allParams.table_name = columnTableFilter.value
    if (columnNameFilter.value.trim()) allParams.column_name = columnNameFilter.value.trim()
    if (commentFilter.value.trim()) allParams.comment = commentFilter.value.trim()
    if (isSensitiveFilter.value) allParams.is_sensitive = isSensitiveFilter.value
    if (isMaskedFilter.value) allParams.is_masked = isMaskedFilter.value
    if (isEncryptedFilter.value) allParams.is_encrypted = isEncryptedFilter.value
    if (manualTypeStatus.value) allParams.manual_type_status = manualTypeStatus.value
    if (manualTypeInput.value.trim()) allParams.manual_type_input = manualTypeInput.value.trim()
    if (systemTypeStatus.value) allParams.system_type_status = systemTypeStatus.value
    if (systemTypeInput.value.trim()) allParams.system_type_input = systemTypeInput.value.trim()
    if (aiTypeStatus.value) allParams.ai_type_status = aiTypeStatus.value
    if (aiTypeInput.value.trim()) allParams.ai_type_input = aiTypeInput.value.trim()
    if (levelFilter.value) allParams.level_filter = levelFilter.value

    const allRes = await getTaskColumns(taskId, allParams)
    const allData = allRes.data?.items || allRes.data || []

    // 提取筛选选项（去重）并构建级联关系
    const assets = new Set<string>()
    const databases = new Set<string>()
    const tables = new Set<string>()
    const dbByAsset: Record<string, Set<string>> = {}
    const tblByDb: Record<string, Set<string>> = {}

    for (const c of allData) {
      const asset = c.asset_name || ''
      const db = c.database_name || ''
      const tbl = c.table_name || ''

      if (asset) assets.add(asset)
      if (db) databases.add(db)
      if (tbl) tables.add(tbl)

      if (asset && db) {
        if (!dbByAsset[asset]) dbByAsset[asset] = new Set()
        dbByAsset[asset].add(db)
      }

      if (db && tbl) {
        if (!tblByDb[db]) tblByDb[db] = new Set()
        tblByDb[db].add(tbl)
      }
    }

    assetOptions.value = Array.from(assets).sort()
    databaseOptions.value = Array.from(databases).sort()
    tableOptions.value = Array.from(tables).sort()

    databasesByAsset.value = {}
    for (const [asset, dbs] of Object.entries(dbByAsset)) {
      databasesByAsset.value[asset] = Array.from(dbs).sort()
    }

    tablesByDatabase.value = {}
    for (const [db, tbls] of Object.entries(tblByDb)) {
      tablesByDatabase.value[db] = Array.from(tbls).sort()
    }

    // 提取系统类型/AI类型/人工类型的选项（用API原始字段名）
    const sysTypes = new Set<string>()
    const aiTypes = new Set<string>()
    const manTypes = new Set<string>()
    for (const c of allData) {
      if (c.data_type_name) sysTypes.add(c.data_type_name)
      if (c.ai_category) aiTypes.add(c.ai_category)
      if (c.data_type_name_manual) manTypes.add(c.data_type_name_manual)
    }
    systemTypeOptions.value = Array.from(sysTypes).sort()
    aiCategoryOptions.value = Array.from(aiTypes).sort()
    manualTypeOptions.value = Array.from(manTypes).sort()

    // 再获取当前分页数据用于显示
    const params: Record<string, any> = { page: columnPage.value, page_size: columnPageSize.value }
    if (columnKeyword.value.trim()) params.keyword = columnKeyword.value.trim()
    if (columnAssetFilter.value) params.asset_name = columnAssetFilter.value
    if (columnDatabaseFilter.value) params.database_name = columnDatabaseFilter.value
    if (columnTableFilter.value) params.table_name = columnTableFilter.value
    if (columnNameFilter.value.trim()) params.column_name = columnNameFilter.value.trim()
    if (commentFilter.value.trim()) params.comment = commentFilter.value.trim()
    if (isSensitiveFilter.value) params.is_sensitive = isSensitiveFilter.value
    if (isMaskedFilter.value) params.is_masked = isMaskedFilter.value
    if (isEncryptedFilter.value) params.is_encrypted = isEncryptedFilter.value
    if (manualTypeStatus.value) params.manual_type_status = manualTypeStatus.value
    if (manualTypeInput.value.trim()) params.manual_type_input = manualTypeInput.value.trim()
    if (systemTypeStatus.value) params.system_type_status = systemTypeStatus.value
    if (systemTypeInput.value.trim()) params.system_type_input = systemTypeInput.value.trim()
    if (aiTypeStatus.value) params.ai_type_status = aiTypeStatus.value
    if (aiTypeInput.value.trim()) params.ai_type_input = aiTypeInput.value.trim()
    if (levelFilter.value) params.level_filter = levelFilter.value

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
// 打开待确认弹窗 - 展示AI和系统分类供用户选择（点击待确认必须弹窗）
function openConfirmDialog(row: any) {
  confirmDialogRow.value = row
  confirmDialogSelected.value = row.system_type ? 'system' : 'ai'
  confirmDialogShowSource.value = 'both'
  showConfirmDialog.value = true
}

function clearConfirmDialog() {
  confirmDialogRow.value = null
  confirmDialogSelected.value = 'system'
}

// 从弹窗确认分类
async function handleConfirmFromDialog(source: string) {
  if (!confirmDialogRow.value) return
  await confirmResult(taskId, confirmDialogRow.value.column_id, { confirm_source: source })
  ElMessage.success('已确认')
  showConfirmDialog.value = false
  confirmDialogRow.value = null
  fetchColumns()
}

// 双击直接确认（从表格行双击触发，跳过弹窗选项仅对双击有效）
async function handleConfirmWithSource(row: any, source: 'system' | 'ai') {
  try {
    // 双击时如果勾选了跳过弹窗，直接确认
    if (skipConfirmDialog.value) {
      await confirmResult(taskId, row.column_id, { confirm_source: source })
      ElMessage.success('已确认')
      fetchColumns()
      return
    }
    // 否则打开弹窗（只显示对应类型的选项，显示跳过复选框）
    confirmDialogRow.value = row
    confirmDialogSelected.value = source
    confirmDialogShowSource.value = source
    showConfirmDialog.value = true
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || err?.message || '确认失败')
  }
}

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
          changeForm.new_level_code = level.level_code || level.name || ''
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

// 跳过弹窗选项保存到 localStorage
watch(skipConfirmDialog, (val) => {
  localStorage.setItem('skipConfirmDialog', val ? 'true' : 'false')
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
const typeRatioCanvas = ref<HTMLElement | null>(null)
const levelDistCanvas = ref<HTMLElement | null>(null)
const typeRatioChartData = reactive({ labels: [] as string[], values: [] as number[] })
const levelDistChartData = reactive({ labels: [] as string[], values: [] as number[] })
const statsData = reactive({
  total_fields: 0,
  classified_fields: 0,
  sensitive_fields: 0,
  sensitive_ratio: '0%',
})
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
    statsData.total_fields = stats.total_fields || 0
    statsData.classified_fields = stats.classified_fields || 0
    statsData.sensitive_fields = stats.sensitive_fields || 0
    statsData.sensitive_ratio = stats.sensitive_ratio || '0%'
    await nextTick()
    renderCharts()
  } finally {
    statsLoading.value = false
  }
}

function renderCharts() {
  if (typeRatioCanvas.value && typeRatioChartData.labels.length) {
    if (chartInstance1) chartInstance1.dispose()
    chartInstance1 = echarts.init(typeRatioCanvas.value as HTMLDivElement)
    chartInstance1.setOption({
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', right: 0, top: 0, bottom: 0, orient: 'vertical' },
      series: [{
        type: 'pie', radius: ['30%', '60%'],
        center: ['40%', '50%'],
        data: typeRatioChartData.labels.map((l, i) => ({ name: l, value: typeRatioChartData.values[i] || 0 })),
        color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'],
      }],
    })
  }
  if (levelDistCanvas.value && levelDistChartData.labels.length) {
    if (chartInstance2) chartInstance2.dispose()
    chartInstance2 = echarts.init(levelDistCanvas.value as HTMLDivElement)
    chartInstance2.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: levelDistChartData.labels },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: levelDistChartData.values, itemStyle: { color: '#409EFF' } }],
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
          taskDetail.value.current_step = res.data.current_step ?? taskDetail.value.current_step
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
  await loadLevelColors()
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

.level-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.type-tag {
  background: #ecf5ff;
  color: #409eff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.manual-type {
  background: #f0f9eb;
  color: #67c23a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.column-name {
  color: #409eff;
  cursor: default;
}

.log-msg {
  flex: 1;
  word-break: break-all;
}

.stats-content {
  padding: 16px 0;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: #fff;
}

.summary-card .summary-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.summary-card .summary-value {
  font-size: 28px;
  font-weight: 600;
}

.summary-card .summary-value.success {
  color: #67c23a;
}

.summary-card .summary-value.danger {
  color: #f56c6c;
}

.summary-card .summary-value.warning {
  color: #e6a23c;
}

.stats-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chart-card h4 {
  margin: 0 0 16px;
  font-size: 15px;
  color: #303133;
  font-weight: 500;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.chart-container {
  width: 100%;
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

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 12px;
}

/* 确认选择弹窗 */
.confirm-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.confirm-option-card {
  border: 2px solid #ebeef5;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-option-card:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.confirm-option-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.confirm-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.confirm-option-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.confirm-option-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.confirm-option-type {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.confirm-option-detail {
  font-size: 12px;
  color: #909399;
}

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
}

.dblclick-confirm.is-locked {
  cursor: not-allowed;
  opacity: 0.6;
  background: #f5f5f5;
  color: #909399;
}

.dblclick-confirm:hover {
  background: #d9ecff;
  border-color: #409eff;
}

.manual-tag {
  font-size: 12px;
}

.batch-actions span {
  color: #606266;
  font-size: 14px;
}
</style>
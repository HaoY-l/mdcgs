<template>
  <div class="page-container">
    <div class="page-header">
      <h2>数据目录</h2>
    </div>

    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- ====== 数据库目录 ====== -->
      <el-tab-pane label="数据库目录" name="database">
        <!-- Filter Panel -->
        <el-card shadow="hover" class="filter-card">
      <el-form :model="filterForm" label-width="90px" size="small">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="关键词">
              <el-input
                v-model="filterForm.keyword"
                placeholder="字段名 / 注释"
                clearable
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="资产">
              <el-select
                v-model="filterForm.asset"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="onAssetChange"
              >
                <el-option
                  v-for="a in assetOptions"
                  :key="a"
                  :label="a"
                  :value="a"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="数据库">
              <el-select
                v-model="filterForm.database_name"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                :disabled="!filterForm.asset"
                @change="onDatabaseChange"
              >
                <el-option
                  v-for="d in filteredDatabaseOptions"
                  :key="d"
                  :label="d"
                  :value="d"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="表">
              <el-select
                v-model="filterForm.table_name"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                :disabled="!filterForm.database_name"
                @change="handleSearch"
              >
                <el-option
                  v-for="t in filteredTableOptions"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="数据类型">
              <el-select
                v-model="filterForm.data_type_status"
                placeholder="全部"
                clearable
                filterable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option label="未确认" value="unconfirmed" />
                <el-option label="已确认" value="confirmed" />
                <el-option
                  v-for="t in dataTypeOptions"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="分级">
              <el-select
                v-model="filterForm.level"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option
                  v-for="l in levelOptions"
                  :key="l"
                  :label="l"
                  :value="l"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="敏感">
              <el-select
                v-model="filterForm.is_sensitive"
                placeholder="全部"
                clearable
                style="width: 100%"
                @change="handleSearch"
              >
                <el-option label="是" :value="1" />
                <el-option label="否" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="脱敏">
              <el-select
                v-model="filterForm.is_masked"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option label="已脱敏" value="confirmed" />
                <el-option label="未脱敏" value="none" />
                <el-option
                  v-for="opt in maskedOptions"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="加密">
              <el-select
                v-model="filterForm.is_encrypted"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option label="已加密" value="confirmed" />
                <el-option label="未加密" value="none" />
                <el-option
                  v-for="opt in encryptedOptions"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="分类路径">
              <el-select
                v-model="filterForm.category_path"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option
                  v-for="path in categoryPathOptions"
                  :key="path"
                  :label="path"
                  :value="path"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="业务部门">
              <el-select
                v-model="filterForm.business_dept"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option
                  v-for="d in businessDeptOptions"
                  :key="d"
                  :label="d"
                  :value="d"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="应用系统">
              <el-select
                v-model="filterForm.app_system"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option
                  v-for="a in appSystemOptions"
                  :key="a"
                  :label="a"
                  :value="a"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="4">
            <el-form-item label="所属任务">
              <el-select
                v-model="filterForm.task_name"
                placeholder="全部"
                clearable
                style="width: 100%"
                filterable
                @change="handleSearch"
              >
                <el-option
                  v-for="t in taskNameOptions"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label-width="0">
              <div class="action-bar">
                <el-button type="primary" @click="handleSearch">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
                <el-divider direction="vertical" />
                <el-button size="small" @click="handleExportQuery" :loading="exporting">
                  导出查询结果
                </el-button>
                <el-button size="small" @click="handleExportAll" :loading="exportingAll">
                  导出全部目录
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Data Table -->
    <el-card shadow="hover" class="table-card">
      <div class="table-wrapper" v-loading="loading">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 60px; width: 60px">序号</th>
              <th style="min-width: 100px">字段名</th>
              <th style="min-width: 80px">数据类型</th>
              <th style="min-width: 50px; text-align: center">分级</th>
              <th style="min-width: 50px; text-align: center">敏感</th>
              <th style="min-width: 80px; text-align: center">脱敏</th>
              <th style="min-width: 80px; text-align: center">加密</th>
              <th style="min-width: 120px">分类路径</th>
              <th style="min-width: 100px">资产</th>
              <th style="min-width: 100px">数据库</th>
              <th style="min-width: 80px">表</th>
              <th style="min-width: 100px">业务部门</th>
              <th style="min-width: 100px">应用系统</th>
              <th style="min-width: 100px">所属任务</th>
              <th style="min-width: 120px">字段注释</th>
              <th style="min-width: 120px">安全建议</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in tableData" :key="idx">
              <td style="min-width: 65px; width: 65px; text-align: center">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td><span class="cell-text">{{ row.field_name }}</span></td>
              <td><span class="cell-text">{{ row.data_type }}</span></td>
              <td style="text-align: center">
                <span v-if="row.level" class="level-badge" :style="getLevelBadgeStyle(row.level)">{{ row.level }}</span>
                <span v-else class="empty-cell">-</span>
              </td>
              <td style="text-align: center">
                <span class="tag" :class="row.is_sensitive ? 'tag-danger' : 'tag-info'">{{ row.is_sensitive ? '是' : '否' }}</span>
              </td>
              <td style="text-align: center">
                <span v-if="row.is_masked === 'confirmed' && row.masking_rule_name" class="tag tag-success">{{ row.masking_rule_name }}</span>
                <span v-else class="tag tag-info">否</span>
              </td>
              <td style="text-align: center">
                <span v-if="row.is_encrypted === 'confirmed' && row.encryption_type_name" class="tag tag-warning">{{ row.encryption_type_name }}</span>
                <span v-else class="tag tag-info">否</span>
              </td>
              <td><span class="cell-text">{{ row.category_path }}</span></td>
              <td><span class="cell-text">{{ row.asset_name }}</span></td>
              <td><span class="cell-text">{{ row.database_name }}</span></td>
              <td><span class="cell-text">{{ row.table_name }}</span></td>
              <td><span class="cell-text">{{ row.business_dept }}</span></td>
              <td><span class="cell-text">{{ row.app_system }}</span></td>
              <td><span class="cell-text">{{ row.task_name }}</span></td>
              <td><span class="cell-text">{{ row.field_comment }}</span></td>
              <td><span class="cell-text">{{ row.risk_suggestion }}</span></td>
            </tr>
            <tr v-if="!tableData.length && !loading">
              <td colspan="16" class="empty-row">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchDirectory(buildParams())"
          @current-change="fetchDirectory(buildParams())"
        />
      </div>
    </el-card>

    </el-tab-pane>

    <!-- ====== 文件目录 ====== -->
    <el-tab-pane label="文件目录" name="file">
      <!-- File Filter Panel -->
      <el-card shadow="hover" class="filter-card">
        <el-form :model="fileFilterForm" label-width="80px" size="small">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="关键词">
                <el-input
                  v-model="fileFilterForm.keyword"
                  placeholder="块路径 / 文件名 / 内容"
                  clearable
                  @keyup.enter="handleFileSearch"
                  @clear="handleFileSearch"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="资产">
                <el-select
                  v-model="fileFilterForm.asset_id"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  filterable
                  @change="onFileAssetChange"
                >
                  <el-option
                    v-for="a in fileAssetOptions"
                    :key="a.id"
                    :label="a.name"
                    :value="a.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="文件">
                <el-select
                  v-model="fileFilterForm.file_name"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  filterable
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="fn in fileFileNameOptions"
                    :key="fn"
                    :label="fn"
                    :value="fn"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="文件类型">
                <el-select
                  v-model="fileFilterForm.file_ext"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="ext in fileExtOptions"
                    :key="ext"
                    :label="ext"
                    :value="ext"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="敏感类型">
                <el-select
                  v-model="fileFilterForm.data_type_status"
                  placeholder="全部"
                  clearable
                  filterable
                  style="width: 100%"
                  @change="handleFileSearch"
                >
                  <el-option label="未确认" value="unconfirmed" />
                  <el-option label="已确认" value="confirmed" />
                  <el-option
                    v-for="t in fileDataTypeOptions"
                    :key="t"
                    :label="t"
                    :value="t"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="分级">
                <el-select
                  v-model="fileFilterForm.level"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="l in fileLevelOptions"
                    :key="l"
                    :label="l"
                    :value="l"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="敏感">
                <el-select
                  v-model="fileFilterForm.is_sensitive"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  @change="handleFileSearch"
                >
                  <el-option label="是" :value="1" />
                  <el-option label="否" :value="0" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="分类路径">
                <el-select
                  v-model="fileFilterForm.category_path"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  filterable
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="path in fileCategoryPathOptions"
                    :key="path"
                    :label="path"
                    :value="path"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="业务部门">
                <el-select
                  v-model="fileFilterForm.business_dept"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  filterable
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="d in fileBusinessDeptOptions"
                    :key="d"
                    :label="d"
                    :value="d"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="应用系统">
                <el-select
                  v-model="fileFilterForm.app_system"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  filterable
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="a in fileAppSystemOptions"
                    :key="a"
                    :label="a"
                    :value="a"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8" :lg="4">
              <el-form-item label="所属任务">
                <el-select
                  v-model="fileFilterForm.task_name"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                  filterable
                  @change="handleFileSearch"
                >
                  <el-option
                    v-for="t in fileTaskNameOptions"
                    :key="t"
                    :label="t"
                    :value="t"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label-width="0">
                <div class="action-bar">
                  <el-button type="primary" @click="handleFileSearch">查询</el-button>
                  <el-button @click="handleFileReset">重置</el-button>
                  <el-divider direction="vertical" />
                  <el-button size="small" @click="fileExportDialogVisible = true" :loading="fileExporting || fileExportingAll">
                    导出
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>

      <!-- File Data Table -->
      <el-card shadow="hover" class="table-card">
        <div class="table-wrapper" v-loading="fileLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th style="min-width: 60px; width: 60px">序号</th>
                <th style="min-width: 160px">内容块路径</th>
                <th style="min-width: 100px">敏感类型</th>
                <th style="min-width: 60px; text-align: center">分级</th>
                <th style="min-width: 50px; text-align: center">敏感</th>
                <th style="min-width: 120px">文件</th>
                <th style="min-width: 60px">类型</th>
                <th style="min-width: 200px">内容预览</th>
                <th style="min-width: 120px">分类路径</th>
                <th style="min-width: 100px">资产</th>
                <th style="min-width: 100px">业务部门</th>
                <th style="min-width: 100px">应用系统</th>
                <th style="min-width: 100px">所属任务</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in fileTableData" :key="idx">
                <td style="min-width: 65px; width: 65px; text-align: center">{{ (fileCurrentPage - 1) * filePageSize + idx + 1 }}</td>
                <td><span class="cell-text">{{ row.block_path }}</span></td>
                <td><span class="cell-text">{{ row.sensitive_type || '-' }}</span></td>
                <td style="text-align: center">
                  <span v-if="row.level_code" class="level-badge" :style="getLevelBadgeStyle(row.level_code)">{{ row.level_code }}</span>
                  <span v-else class="empty-cell">-</span>
                </td>
                <td style="text-align: center">
                  <span v-if="row.is_sensitive === ''" class="empty-cell">-</span>
                  <span v-else class="tag" :class="row.is_sensitive ? 'tag-danger' : 'tag-info'">{{ row.is_sensitive ? '是' : '否' }}</span>
                </td>
                <td><span class="cell-text">{{ row.file_name }}</span></td>
                <td><span class="cell-text">{{ row.file_ext || '-' }}</span></td>
                <td><span class="cell-text">{{ row.content_preview || '-' }}</span></td>
                <td><span class="cell-text">{{ row.category_path || '-' }}</span></td>
                <td><span class="cell-text">{{ row.asset_name }}</span></td>
                <td><span class="cell-text">{{ row.business_dept || '-' }}</span></td>
                <td><span class="cell-text">{{ row.app_system || '-' }}</span></td>
                <td><span class="cell-text">{{ row.task_name || '-' }}</span></td>
              </tr>
              <tr v-if="!fileTableData.length && !fileLoading">
                <td colspan="12" class="empty-row">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-wrapper" v-if="fileTotal > 0">
          <el-pagination
            v-model:current-page="fileCurrentPage"
            v-model:page-size="filePageSize"
            :page-sizes="[20, 50, 100]"
            :total="fileTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchFileDirectory(fileBuildParams())"
            @current-change="fetchFileDirectory(fileBuildParams())"
          />
        </div>
      </el-card>
    </el-tab-pane>

  </el-tabs>

  <!-- 文件目录导出弹窗 -->
  <el-dialog v-model="fileExportDialogVisible" title="导出文件目录" width="420px" :close-on-click-modal="false">
    <el-form label-width="180px" size="small">
      <el-form-item label="导出范围">
        <el-radio-group v-model="fileExportScope">
          <el-radio value="query">导出查询结果</el-radio>
          <el-radio value="all">导出全部结果</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="内容预览明文导出">
        <el-switch v-model="fileExportPlainContent" />
        <span style="margin-left: 8px; font-size: 12px; color: #909399;">
          {{ fileExportPlainContent ? '明文导出' : '全 *** 导出' }}
        </span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="fileExportDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleFileExportConfirm" :loading="fileExporting">确认导出</el-button>
    </template>
  </el-dialog>
</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDirectory, getFileDirectory, getFileDirectoryOptions } from '@/api/overview'
import { getLevels } from '@/api/classification'
import client from '@/api/client'

// ===== Tab =====
const activeTab = ref('database')

function handleTabChange(name: string) {
  if (name === 'file' && !fileTableData.value.length) {
    fetchFileDirectoryOptions()
    fetchFileDirectory(fileBuildParams())
  }
}

// 级别颜色映射（动态加载）
const levelColorMap = reactive<Record<string, string>>({})

async function loadLevelColors() {
  try {
    const res = await getLevels()
    const data = res.data || []
    for (const l of data) {
      if (l.level_code && l.color) {
        levelColorMap[l.level_code] = l.color
      }
    }
  } catch {
    // fallback 颜色：L1绿色、L2橙色、L3红色
    levelColorMap['L1'] = '#52C41A'
    levelColorMap['L2'] = '#FF7A00'
    levelColorMap['L3'] = '#FF4D4F'
  }
}

// ===== State =====
const loading = ref(false)
const exporting = ref(false)
const exportingAll = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const categoryPathOptions = ref<string[]>([])
const assetOptions = ref<string[]>([])
const dataTypeOptions = ref<string[]>([])
const levelOptions = ref<string[]>([])
const databaseOptions = ref<string[]>([])
const tableOptions = ref<string[]>([])
const businessDeptOptions = ref<string[]>([])
const appSystemOptions = ref<string[]>([])
const taskNameOptions = ref<string[]>([])
const databasesByAsset = ref<Record<string, string[]>>({})
const tablesByDatabase = ref<Record<string, string[]>>({})
const maskedOptions = ref<string[]>([])
const encryptedOptions = ref<string[]>([])

// 联动筛选计算属性
const filteredDatabaseOptions = computed(() => {
  if (filterForm.asset && databasesByAsset.value[filterForm.asset]) {
    return databasesByAsset.value[filterForm.asset]
  }
  return databaseOptions.value
})

const filteredTableOptions = computed(() => {
  if (filterForm.database_name && tablesByDatabase.value[filterForm.database_name]) {
    return tablesByDatabase.value[filterForm.database_name]
  }
  return tableOptions.value
})

const filterForm = reactive({
  keyword: '',
  asset: '',
  database_name: '',
  table_name: '',
  data_type_status: '',
  level: '',
  is_sensitive: null as number | null,
  is_masked: '',
  is_encrypted: '',
  category_path: '',
  business_dept: '',
  app_system: '',
  task_name: '',
})

// ===== Helpers =====
function levelTagType(level: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined {
  if (!level) return 'info'
  const color = levelColorMap[level]
  if (color) {
    if (color.includes('ff4d4f') || color.includes('ef4444')) return 'danger'
    if (color.includes('ff7a00') || color.includes('f59e0b')) return 'warning'
  }
  return 'info'
}

function getLevelBadgeStyle(level: string): Record<string, string> {
  const color = levelColorMap[level]
  if (!color) return { backgroundColor: '#6b7280', color: '#fff' }
  // 白色文字，背景用级别颜色
  return {
    backgroundColor: color,
    color: '#fff',
    borderRadius: '4px',
  }
}

function buildParams(): Record<string, any> {
  const params: Record<string, any> = {
    page: currentPage.value,
    page_size: pageSize.value,
  }
  if (filterForm.keyword.trim()) params.keyword = filterForm.keyword.trim()
  if (filterForm.database_name) params.database = filterForm.database_name
  if (filterForm.table_name) params.table_name = filterForm.table_name
  if (filterForm.data_type_status) params.data_type_status = filterForm.data_type_status
  if (filterForm.level) params.level = filterForm.level
  if (filterForm.is_sensitive !== null) params.is_sensitive = filterForm.is_sensitive
  if (filterForm.is_masked) {
    if (maskedOptions.value.includes(filterForm.is_masked)) {
      // 选择了具体规则名，走 confirmed + 规则名双重过滤
      params.is_masked = 'confirmed'
      params.masking_rule_name = filterForm.is_masked
    } else {
      params.is_masked = filterForm.is_masked
    }
  }
  if (filterForm.is_encrypted) {
    if (encryptedOptions.value.includes(filterForm.is_encrypted)) {
      params.is_encrypted = 'confirmed'
      params.encryption_type_name = filterForm.is_encrypted
    } else {
      params.is_encrypted = filterForm.is_encrypted
    }
  }
  if (filterForm.category_path) params.category_path = filterForm.category_path
  if (filterForm.asset) params.asset = filterForm.asset
  if (filterForm.business_dept) params.business_dept = filterForm.business_dept
  if (filterForm.app_system) params.app_system = filterForm.app_system
  if (filterForm.task_name) params.task_name = filterForm.task_name
  return params
}

// ===== Fetch Data =====
async function fetchDirectory(params: Record<string, any>) {
  loading.value = true
  try {
    const res: any = await getDirectory(params)
    const d = res.data || {}
    tableData.value = d.items || []
    total.value = d.total ?? 0
  } catch (err: any) {
    ElMessage.error(err?.message || '获取数据目录失败')
  } finally {
    loading.value = false
  }
}

async function fetchFilterOptions(extra?: Record<string, any>) {
  try {
    const params: Record<string, any> = {}
    if (filterForm.asset) params.asset = filterForm.asset
    const db = extra?.database ?? filterForm.database_name
    if (db) params.database = db
    const res: any = await client.get('/directory/options', { params })
    const d = res.data || {}
    if (d.category_paths) {
      categoryPathOptions.value = d.category_paths
    }
    if (d.assets) {
      assetOptions.value = d.assets
    }
    if (d.data_type_options) {
      dataTypeOptions.value = d.data_type_options
    }
    if (d.level_options) {
      levelOptions.value = d.level_options
    }
    if (d.database_options) {
      databaseOptions.value = d.database_options
    }
    if (d.table_options) {
      tableOptions.value = d.table_options
    }
    if (d.databases_by_asset) {
      databasesByAsset.value = d.databases_by_asset
    }
    if (d.tables_by_database) {
      tablesByDatabase.value = d.tables_by_database
    }
    if (d.business_dept_options) {
      businessDeptOptions.value = d.business_dept_options
    }
    if (d.app_system_options) {
      appSystemOptions.value = d.app_system_options
    }
    if (d.task_name_options) {
      taskNameOptions.value = d.task_name_options
    }
    if (d.masked_options) {
      maskedOptions.value = d.masked_options
    }
    if (d.encrypted_options) {
      encryptedOptions.value = d.encrypted_options
    }
  } catch {
    // silently fail
  }
}

// ===== Cascading Select =====
function onAssetChange() {
  // 选择资产后，清空数据库和表的选中值，重新加载联动数据
  filterForm.database_name = ''
  filterForm.table_name = ''
  fetchFilterOptions()
  handleSearch()
}

function onDatabaseChange() {
  // 选择数据库后，清空表的选中值，并带上 database 参数重新拉选项
  filterForm.table_name = ''
  fetchFilterOptions({ database: filterForm.database_name })
  handleSearch()
}

// ===== Search =====
function handleSearch() {
  currentPage.value = 1
  fetchDirectory(buildParams())
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.asset = ''
  filterForm.database_name = ''
  filterForm.table_name = ''
  filterForm.data_type_status = ''
  filterForm.level = ''
  filterForm.is_sensitive = null
  filterForm.is_masked = ''
  filterForm.is_encrypted = ''
  filterForm.category_path = ''
  filterForm.business_dept = ''
  filterForm.app_system = ''
  filterForm.task_name = ''
  currentPage.value = 1
  fetchFilterOptions()
  handleSearch()
}

// ===== Export =====
// 导出列定义：顺序与Web界面一致，使用中文列头
const EXPORT_COLUMNS = [
  { key: 'field_name', label: '字段名' },
  { key: 'data_type', label: '数据类型' },
  { key: 'level', label: '分级' },
  { key: 'is_sensitive', label: '敏感' },
  { key: 'is_masked', label: '脱敏' },
  { key: 'is_encrypted', label: '加密' },
  { key: 'category_path', label: '分类路径' },
  { key: 'asset_name', label: '资产' },
  { key: 'database_name', label: '数据库' },
  { key: 'table_name', label: '表' },
  { key: 'business_dept', label: '业务部门' },
  { key: 'app_system', label: '应用系统' },
  { key: 'task_name', label: '所属任务' },
  { key: 'field_comment', label: '字段注释' },
  { key: 'risk_suggestion', label: '安全建议' },
]

async function handleExportQuery() {
  exporting.value = true
  try {
    const params = buildParams()
    params.export = 1
    const res: any = await getDirectory(params)
    triggerDownload(res, '数据目录_查询结果')
    ElMessage.success('导出成功')
  } catch (err: any) {
    ElMessage.error(err?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleExportAll() {
  exportingAll.value = true
  try {
    const res: any = await getDirectory({ export: 1 })
    triggerDownload(res, '数据目录_全部')
    ElMessage.success('导出成功')
  } catch (err: any) {
    ElMessage.error(err?.message || '导出失败')
  } finally {
    exportingAll.value = false
  }
}

function triggerDownload(res: any, filename: string) {
  if (res instanceof Blob) {
    const url = URL.createObjectURL(res)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    return
  }
  if (res.data?.download_url) {
    window.open(res.data.download_url, '_blank')
    return
  }
  if (res.data?.items || Array.isArray(res.data)) {
    const items = res.data?.items || res.data || []
    if (items.length > 0) {
      const csvContent = jsonToCsv(items)
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }
}

function jsonToCsv(items: any[]): string {
  if (items.length === 0) return ''
  const lines = [EXPORT_COLUMNS.map(c => c.label).join(',')]
  for (const item of items) {
    const row = EXPORT_COLUMNS.map(col => {
      let val = item[col.key]
      // 敏感/脱敏/加密 显示中文
      if (col.key === 'is_sensitive') {
        val = val ? '是' : '否'
      } else if (col.key === 'is_masked') {
        val = val === 'confirmed' && item.masking_rule_name ? item.masking_rule_name : (val === 'confirmed' ? '是' : '否')
      } else if (col.key === 'is_encrypted') {
        val = val === 'confirmed' && item.encryption_type_name ? item.encryption_type_name : (val === 'confirmed' ? '是' : '否')
      }
      if (val === null || val === undefined) return ''
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`
      }
      return val
    })
    lines.push(row.join(','))
  }
  return lines.join('\n')
}

// ===== Init =====
onMounted(() => {
  loadLevelColors()
  fetchFilterOptions()
  fetchDirectory(buildParams())
})

// ============================================================
// 文件目录
// ============================================================

// ==== State ====
const fileLoading = ref(false)
const fileTableData = ref<any[]>([])
const fileTotal = ref(0)
const fileCurrentPage = ref(1)
const filePageSize = ref(20)

const fileAssetOptions = ref<any[]>([])
const fileFileNameOptions = ref<string[]>([])
const fileExtOptions = ref<string[]>([])
const fileDataTypeOptions = ref<string[]>([])
const fileLevelOptions = ref<string[]>([])
const fileCategoryPathOptions = ref<string[]>([])
const fileBusinessDeptOptions = ref<string[]>([])
const fileAppSystemOptions = ref<string[]>([])
const fileTaskNameOptions = ref<string[]>([])

// 文件名联动
const fileNamesByAsset = ref<Record<number, string[]>>({})

const fileFilterForm = reactive({
  keyword: '',
  asset_id: null as number | null,
  file_name: '',
  file_ext: '',
  data_type_status: '',
  level: '',
  is_sensitive: null as number | null,
  category_path: '',
  business_dept: '',
  app_system: '',
  task_name: '',
})

// ==== Helpers ====
function fileBuildParams(): Record<string, any> {
  const params: Record<string, any> = {
    page: fileCurrentPage.value,
    page_size: filePageSize.value,
  }
  if (fileFilterForm.keyword.trim()) params.keyword = fileFilterForm.keyword.trim()
  if (fileFilterForm.asset_id !== null) params.asset_id = fileFilterForm.asset_id
  if (fileFilterForm.file_name) params.file_name = fileFilterForm.file_name
  if (fileFilterForm.file_ext) params.file_ext = fileFilterForm.file_ext
  if (fileFilterForm.data_type_status) params.data_type_status = fileFilterForm.data_type_status
  if (fileFilterForm.level) params.level = fileFilterForm.level
  if (fileFilterForm.is_sensitive !== null) params.is_sensitive = fileFilterForm.is_sensitive
  if (fileFilterForm.category_path) params.category_path = fileFilterForm.category_path
  if (fileFilterForm.business_dept) params.business_dept = fileFilterForm.business_dept
  if (fileFilterForm.app_system) params.app_system = fileFilterForm.app_system
  if (fileFilterForm.task_name) params.task_name = fileFilterForm.task_name
  return params
}

// ==== Fetch ====
async function fetchFileDirectory(params: Record<string, any>) {
  fileLoading.value = true
  try {
    const res: any = await getFileDirectory(params)
    const d = res.data || {}
    fileTableData.value = d.items || []
    fileTotal.value = d.total ?? 0
  } catch (err: any) {
    ElMessage.error(err?.message || '获取文件目录失败')
  } finally {
    fileLoading.value = false
  }
}

async function fetchFileDirectoryOptions() {
  try {
    const params: Record<string, any> = {}
    if (fileFilterForm.asset_id !== null) params.asset_id = fileFilterForm.asset_id
    const res: any = await getFileDirectoryOptions(params)
    const d = res.data || {}
    if (d.assets) fileAssetOptions.value = d.assets
    if (d.file_name_options) fileFileNameOptions.value = d.file_name_options
    if (d.file_ext_options) fileExtOptions.value = d.file_ext_options
    if (d.data_type_options) fileDataTypeOptions.value = d.data_type_options
    if (d.level_options) fileLevelOptions.value = d.level_options
    if (d.category_paths) fileCategoryPathOptions.value = d.category_paths
    if (d.business_dept_options) fileBusinessDeptOptions.value = d.business_dept_options
    if (d.app_system_options) fileAppSystemOptions.value = d.app_system_options
    if (d.task_name_options) fileTaskNameOptions.value = d.task_name_options
    if (d.files_by_asset) fileNamesByAsset.value = d.files_by_asset
  } catch {
    // silently fail
  }
}

// ==== Handlers ====
function onFileAssetChange() {
  // 联动：选择资产后刷新文件名选项
  fileFilterForm.file_name = ''
  if (fileFilterForm.asset_id !== null && fileNamesByAsset.value[fileFilterForm.asset_id]) {
    fileFileNameOptions.value = fileNamesByAsset.value[fileFilterForm.asset_id]
  } else {
    // 重新获取全部文件名选项
    fetchFileDirectoryOptions()
  }
  handleFileSearch()
}

function handleFileSearch() {
  fileCurrentPage.value = 1
  fetchFileDirectory(fileBuildParams())
}

function handleFileReset() {
  fileFilterForm.keyword = ''
  fileFilterForm.asset_id = null
  fileFilterForm.file_name = ''
  fileFilterForm.file_ext = ''
  fileFilterForm.data_type_status = ''
  fileFilterForm.level = ''
  fileFilterForm.is_sensitive = null
  fileFilterForm.category_path = ''
  fileFilterForm.business_dept = ''
  fileFilterForm.app_system = ''
  fileFilterForm.task_name = ''
  fileCurrentPage.value = 1
  fetchFileDirectoryOptions()
  handleFileSearch()
}

// ==== 文件目录导出 ====
const fileExportDialogVisible = ref(false)
const fileExportScope = ref('query')
const fileExportPlainContent = ref(false)
const fileExporting = ref(false)

const FILE_EXPORT_COLUMNS = [
  { key: 'block_path', label: '内容块路径' },
  { key: 'sensitive_type', label: '敏感类型' },
  { key: 'level_code', label: '分级' },
  { key: 'is_sensitive', label: '敏感' },
  { key: 'file_name', label: '文件' },
  { key: 'file_ext', label: '类型' },
  { key: 'content_preview', label: '内容预览' },
  { key: 'category_path', label: '分类路径' },
  { key: 'asset_name', label: '资产' },
  { key: 'business_dept', label: '业务部门' },
  { key: 'app_system', label: '应用系统' },
  { key: 'task_name', label: '所属任务' },
]

async function handleFileExportConfirm() {
  fileExporting.value = true
  try {
    const isAll = fileExportScope.value === 'all'
    const params: Record<string, any> = { export: 1, export_plain_content: fileExportPlainContent.value ? 1 : 0 }
    if (!isAll) {
      // 带上当前筛选条件
      if (fileFilterForm.keyword.trim()) params.keyword = fileFilterForm.keyword.trim()
      if (fileFilterForm.asset_id !== null) params.asset_id = fileFilterForm.asset_id
      if (fileFilterForm.file_name) params.file_name = fileFilterForm.file_name
      if (fileFilterForm.file_ext) params.file_ext = fileFilterForm.file_ext
      if (fileFilterForm.data_type_status) params.data_type_status = fileFilterForm.data_type_status
      if (fileFilterForm.level) params.level = fileFilterForm.level
      if (fileFilterForm.is_sensitive !== null) params.is_sensitive = fileFilterForm.is_sensitive
      if (fileFilterForm.category_path) params.category_path = fileFilterForm.category_path
      if (fileFilterForm.business_dept) params.business_dept = fileFilterForm.business_dept
      if (fileFilterForm.app_system) params.app_system = fileFilterForm.app_system
      if (fileFilterForm.task_name) params.task_name = fileFilterForm.task_name
    }
    const res: any = await getFileDirectory(params)
    const filename = isAll ? '文件目录_全部' : '文件目录_查询结果'
    triggerFileDownload(res, filename)
    fileExportDialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err?.message || '导出失败')
  } finally {
    fileExporting.value = false
  }
}

function triggerFileDownload(res: any, filename: string) {
  if (res instanceof Blob) {
    const url = URL.createObjectURL(res)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    return
  }
  if (res.data?.download_url) {
    window.open(res.data.download_url, '_blank')
    return
  }
  if (res.data?.items || Array.isArray(res.data)) {
    const items = res.data?.items || res.data || []
    if (items.length > 0) {
      const csvContent = fileJsonToCsv(items)
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }
}

function fileJsonToCsv(items: any[]): string {
  if (items.length === 0) return ''
  const lines = [FILE_EXPORT_COLUMNS.map(c => c.label).join(',')]
  for (const item of items) {
    const row = FILE_EXPORT_COLUMNS.map(col => {
      let val = item[col.key]
      // 敏感显示中文
      if (col.key === 'is_sensitive') {
        val = val === '' ? '-' : (val ? '是' : '否')
      }
      if (val === null || val === undefined) return ''
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`
      }
      return val
    })
    lines.push(row.join(','))
  }
  return lines.join('\n')
}
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 0;
}

.filter-card :deep(.el-form-item__label) {
  text-align: justify;
  text-justify: distribute-all-lines;
  -moz-text-align-last: justify;
  text-align-last: justify;
  width: 100%;
  display: block;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.table-card {
  margin-bottom: 0;
  overflow: visible;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.level-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

/* 原生表格布局 */
.table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
}

.data-table {
  width: auto;
  min-width: 800px;
  border-collapse: collapse;
}

.data-table thead {
  /* 不使用 sticky，整个表格一起横向滚动，表头表体天然同步 */
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  border: 1px solid #ebeef5;
  text-align: left;
  font-size: 13px;
  line-height: 1.5;
  background: #fff;
  white-space: nowrap;
}

.data-table tbody tr:nth-child(even) td {
  background: #fafafa;
}

.data-table tbody tr:hover td {
  background: #f5f7fa;
}

/* 表头样式 */
.data-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

/* 单元格文字：不换行、不截断、完全可见 */
.cell-text {
  display: inline-block;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
  max-width: none;
}

/* 空值显示 */
.empty-cell {
  color: #d1d5db;
}

/* 空行 */
.empty-row {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}

/* 标签样式 */
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
}
.tag-danger { background: #fef0f0; color: #ff4d4f; }
.tag-info { background: #f4f4f5; color: #909399; }
.tag-success { background: #f0f9eb; color: #52c41a; }
.tag-warning { background: #fff7e6; color: #ff7a00; }
</style>


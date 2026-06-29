<template>
  <div class="page-container">
    <div class="page-header">
      <h2>申请审核</h2>
    </div>

    <el-card shadow="hover">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="申请列表" name="applications">
          <div class="tab-toolbar">
            <el-select
              v-model="filterStatus"
              placeholder="审核状态"
              clearable
              size="small"
              style="width: 130px; margin-right: 8px"
              @change="fetchApplications"
            >
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-select
              v-model="filterType"
              placeholder="申请类型"
              clearable
              size="small"
              style="width: 130px; margin-right: 8px"
              @change="fetchApplications"
            >
              <el-option label="类型变更" value="type_change" />
              <el-option label="级别变更" value="level_change" />
              <el-option label="脱敏确认" value="mask_confirm" />
              <el-option label="加密确认" value="encrypt_confirm" />
              <el-option label="批量变更" value="batch_change" />
              <el-option label="其他" value="other" />
            </el-select>
            <el-date-picker
              v-model="filterDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="small"
              style="width: 240px; margin-right: 8px"
              value-format="YYYY-MM-DD"
              @change="fetchApplications"
            />
            <el-button size="small" @click="resetFilters">重置</el-button>
          </div>

          <el-table :data="applications" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="application_no" label="申请编号" min-width="140" />
            <el-table-column prop="applicant_name" label="申请人" min-width="100" />
            <el-table-column label="申请类型" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="appTypeTag(row.application_type)" size="small" effect="plain">
                  {{ appTypeLabel(row.application_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="目标信息" min-width="200">
              <template #default="{ row }">
                <span>{{ row.target_info || row.target_description || row.target || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="appStatusTag(row.status)" size="small">
                  {{ appStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="申请时间" min-width="160" />
            <el-table-column label="操作" min-width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleViewDetail(row)">查看</el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  link
                  type="success"
                  size="small"
                  @click="handleApprove(row)"
                >通过</el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  link
                  type="danger"
                  size="small"
                  @click="handleReject(row)"
                >拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper" v-if="applicationTotal > 0">
            <el-pagination
              v-model:current-page="applicationPage"
              :page-size="applicationPageSize"
              :total="applicationTotal"
              layout="total, prev, pager, next"
              @current-change="fetchApplications"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="我的申请" name="my">
          <div class="tab-toolbar">
            <el-select
              v-model="myFilterStatus"
              placeholder="审核状态"
              clearable
              size="small"
              style="width: 130px; margin-right: 8px"
              @change="fetchMyApplications"
            >
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-select
              v-model="myFilterType"
              placeholder="申请类型"
              clearable
              size="small"
              style="width: 130px"
              @change="fetchMyApplications"
            >
              <el-option label="类型变更" value="type_change" />
              <el-option label="级别变更" value="level_change" />
              <el-option label="脱敏确认" value="mask_confirm" />
              <el-option label="加密确认" value="encrypt_confirm" />
              <el-option label="批量变更" value="batch_change" />
              <el-option label="其他" value="other" />
            </el-select>
          </div>

          <el-table :data="myApplications" stripe style="width: 100%" v-loading="myLoading">
            <el-table-column prop="application_no" label="申请编号" min-width="140" />
            <el-table-column label="申请类型" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="appTypeTag(row.application_type)" size="small" effect="plain">
                  {{ appTypeLabel(row.application_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="目标信息" min-width="200">
              <template #default="{ row }">
                <span>{{ row.target_info || row.target_description || row.target || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="appStatusTag(row.status)" size="small">
                  {{ appStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="申请时间" min-width="160" />
            <el-table-column prop="reviewed_at" label="审核时间" min-width="160" />
            <el-table-column prop="reviewer_name" label="审核人" min-width="100" />
            <el-table-column label="操作" min-width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleViewDetail(row)">查看</el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  link
                  type="warning"
                  size="small"
                  @click="handleWithdraw(row)"
                >撤回</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper" v-if="myTotal > 0">
            <el-pagination
              v-model:current-page="myPage"
              :page-size="myPageSize"
              :total="myTotal"
              layout="total, prev, pager, next"
              @current-change="fetchMyApplications"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 申请详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="申请详情" width="700px" :close-on-click-modal="false">
      <div v-loading="detailLoading">
        <el-descriptions v-if="applicationDetail" :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="申请编号">{{ applicationDetail.application_no }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ applicationDetail.applicant_name }}</el-descriptions-item>
          <el-descriptions-item label="申请类型">
            <el-tag :type="appTypeTag(applicationDetail.application_type)" size="small" effect="plain">
              {{ appTypeLabel(applicationDetail.application_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="appStatusTag(applicationDetail.status)" size="small">
              {{ appStatusLabel(applicationDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{ applicationDetail.reason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ applicationDetail.created_at }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ applicationDetail.reviewed_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ applicationDetail.reviewer_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审核意见" :span="2">{{ applicationDetail.review_comment || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px">变更内容对比</h4>
        <el-table v-if="compareFields.length" :data="compareFields" stripe style="width: 100%">
          <el-table-column prop="field" label="字段" min-width="120" />
          <el-table-column label="原值" min-width="140">
            <template #default="{ row }">
              <span style="color: var(--el-color-danger)">{{ row.old_value ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="新值" min-width="140">
            <template #default="{ row }">
              <span style="color: var(--el-color-success)">{{ row.new_value ?? '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div v-else-if="applicationDetail?.changes" class="change-detail-text">
          <div v-for="(change, key) in applicationDetail.changes" :key="key" class="change-row">
            <span class="change-key">{{ key }}:</span>
            <span class="change-old">{{ change.old ?? change.original ?? '-' }}</span>
            <el-icon style="margin: 0 8px; color: var(--el-color-primary)"><ArrowRight /></el-icon>
            <span class="change-new">{{ change.new ?? change.updated ?? '-' }}</span>
          </div>
        </div>
        <div v-else-if="applicationDetail?.original_data" class="change-detail-text">
          <div v-for="(val, key) in applicationDetail.original_data" :key="key" class="change-row">
            <span class="change-key">{{ key }}:</span>
            <span class="change-old">{{ val ?? '-' }}</span>
            <el-icon style="margin: 0 8px; color: var(--el-color-primary)"><ArrowRight /></el-icon>
            <span class="change-new">{{ applicationDetail.new_data?.[key] ?? '-' }}</span>
          </div>
        </div>
        <el-empty v-else-if="!detailLoading" description="无变更数据" />

        <template v-if="applicationDetail?.status === 'pending'">
          <el-divider />
          <el-form label-width="80px">
            <el-form-item label="审核意见">
              <el-input
                v-model="reviewComment"
                type="textarea"
                :rows="3"
                placeholder="请输入审核意见（可选）"
              />
            </el-form-item>
          </el-form>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px">
            <el-button type="danger" :loading="reviewing" @click="submitReject">
              拒绝
            </el-button>
            <el-button type="success" :loading="reviewing" @click="submitApprove">
              通过
            </el-button>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import {
  getAuditApplications,
  getAuditDetail,
  approveAudit,
  rejectAudit,
  getMyApplications,
  withdrawApplication,
} from '@/api/task'

const activeTab = ref('applications')

// ===== 申请列表 =====
const loading = ref(false)
const applications = ref<any[]>([])
const applicationTotal = ref(0)
const applicationPage = ref(1)
const applicationPageSize = ref(20)
const filterStatus = ref('')
const filterType = ref('')
const filterDateRange = ref<[string, string] | null>(null)

// ===== 我的申请 =====
const myLoading = ref(false)
const myApplications = ref<any[]>([])
const myTotal = ref(0)
const myPage = ref(1)
const myPageSize = ref(20)
const myFilterStatus = ref('')
const myFilterType = ref('')

// ===== 详情弹窗 =====
const showDetailDialog = ref(false)
const detailLoading = ref(false)
const applicationDetail = ref<any>(null)
const compareFields = ref<any[]>([])
const reviewComment = ref('')
const reviewing = ref(false)

const appTypeMap: Record<string, { label: string; tag: string }> = {
  type_change: { label: '类型变更', tag: '' },
  level_change: { label: '级别变更', tag: 'warning' },
  mask_confirm: { label: '脱敏确认', tag: 'success' },
  encrypt_confirm: { label: '加密确认', tag: 'primary' },
  batch_change: { label: '批量变更', tag: '' },
  other: { label: '其他', tag: 'info' },
}

function appTypeLabel(type: string): string {
  return appTypeMap[type]?.label || type
}

function appTypeTag(type: string): string {
  return appTypeMap[type]?.tag || 'info'
}

const appStatusMap: Record<string, { label: string; tag: string }> = {
  pending: { label: '待审核', tag: 'warning' },
  approved: { label: '已通过', tag: 'success' },
  rejected: { label: '已拒绝', tag: 'danger' },
}

function appStatusLabel(status: string): string {
  return appStatusMap[status]?.label || status
}

function appStatusTag(status: string): string {
  return appStatusMap[status]?.tag || 'info'
}

// ===== 申请列表 =====
async function fetchApplications() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: applicationPage.value,
      page_size: applicationPageSize.value,
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterType.value) params.application_type = filterType.value
    if (filterDateRange.value) {
      params.start_date = filterDateRange.value[0]
      params.end_date = filterDateRange.value[1]
    }
    const res = await getAuditApplications(params)
    if (res.data && Array.isArray(res.data.items)) {
      applications.value = res.data.items
      applicationTotal.value = res.data.total ?? 0
    } else if (Array.isArray(res.data)) {
      applications.value = res.data
      applicationTotal.value = res.data.length
    } else {
      applications.value = res.data || []
      applicationTotal.value = 0
    }
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filterStatus.value = ''
  filterType.value = ''
  filterDateRange.value = null
  applicationPage.value = 1
  fetchApplications()
}

// ===== 我的申请 =====
async function fetchMyApplications() {
  myLoading.value = true
  try {
    const params: Record<string, any> = {
      page: myPage.value,
      page_size: myPageSize.value,
    }
    if (myFilterStatus.value) params.status = myFilterStatus.value
    if (myFilterType.value) params.application_type = myFilterType.value
    const res = await getMyApplications(params)
    if (res.data && Array.isArray(res.data.items)) {
      myApplications.value = res.data.items
      myTotal.value = res.data.total ?? 0
    } else if (Array.isArray(res.data)) {
      myApplications.value = res.data
      myTotal.value = res.data.length
    } else {
      myApplications.value = res.data || []
      myTotal.value = 0
    }
  } finally {
    myLoading.value = false
  }
}

// ===== 详情 =====
async function handleViewDetail(row: any) {
  showDetailDialog.value = true
  detailLoading.value = true
  applicationDetail.value = null
  compareFields.value = []
  reviewComment.value = ''
  try {
    const res = await getAuditDetail(row.id)
    const detail = res.data || {}
    applicationDetail.value = detail

    // Build comparison fields from various possible data structures
    const fields: any[] = []
    if (detail.changes) {
      if (Array.isArray(detail.changes)) {
        compareFields.value = detail.changes
        return
      }
      for (const [key, val] of Object.entries(detail.changes)) {
        const change = val as any
        fields.push({
          field: key,
          old_value: change.old ?? change.original ?? '-',
          new_value: change.new ?? change.updated ?? '-',
        })
      }
      compareFields.value = fields
    } else if (detail.comparison) {
      if (Array.isArray(detail.comparison)) {
        compareFields.value = detail.comparison
      }
    } else if (detail.original_data) {
      // Handled in template
    }
  } finally {
    detailLoading.value = false
  }
}

async function handleApprove(row: any) {
  try {
    await ElMessageBox.confirm('确定通过该申请吗？', '确认', { type: 'info' })
    await approveAudit(row.id, { comment: '' })
    ElMessage.success('申请已通过')
    fetchApplications()
    fetchMyApplications()
    if (showDetailDialog.value) showDetailDialog.value = false
  } catch {
    // cancelled or handled
  }
}

async function handleReject(row: any) {
  try {
    await ElMessageBox.confirm('确定拒绝该申请吗？', '确认', { type: 'warning' })
    await rejectAudit(row.id, { comment: '' })
    ElMessage.success('申请已拒绝')
    fetchApplications()
    fetchMyApplications()
    if (showDetailDialog.value) showDetailDialog.value = false
  } catch {
    // cancelled or handled
  }
}

async function submitApprove() {
  if (!applicationDetail.value) return
  reviewing.value = true
  try {
    await approveAudit(applicationDetail.value.id, {
      comment: reviewComment.value.trim() || undefined,
    })
    ElMessage.success('申请已通过')
    showDetailDialog.value = false
    fetchApplications()
    fetchMyApplications()
  } finally {
    reviewing.value = false
  }
}

async function submitReject() {
  if (!applicationDetail.value) return
  reviewing.value = true
  try {
    await rejectAudit(applicationDetail.value.id, {
      comment: reviewComment.value.trim() || undefined,
    })
    ElMessage.success('申请已拒绝')
    showDetailDialog.value = false
    fetchApplications()
    fetchMyApplications()
  } finally {
    reviewing.value = false
  }
}

// ===== 撤回 =====
async function handleWithdraw(row: any) {
  try {
    await ElMessageBox.confirm('确定撤回该申请吗？', '提示', { type: 'warning' })
    await withdrawApplication(row.id)
    ElMessage.success('申请已撤回')
    fetchMyApplications()
  } catch {
    // cancelled
  }
}

function handleTabChange(tabName: string) {
  if (tabName === 'my' && !myApplications.value.length) {
    fetchMyApplications()
  }
}

onMounted(() => {
  fetchApplications()
  fetchMyApplications()
})
</script>

<style scoped>
.tab-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.change-detail-text {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.change-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
}

.change-key {
  font-weight: 600;
  min-width: 100px;
  color: var(--el-text-color-primary);
}

.change-old {
  color: var(--el-color-danger);
  text-decoration: line-through;
  margin-left: 8px;
}

.change-new {
  color: var(--el-color-success);
  font-weight: 500;
}
</style>
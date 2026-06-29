<template>
  <div class="page-container">
    <div class="back-nav">
      <el-button link @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回资产列表
      </el-button>
    </div>

    <!-- 基本信息 -->
    <el-card shadow="hover" class="mb-20" v-loading="loading">
      <template #header>
        <span><strong>{{ asset?.name || '资产详情' }}</strong></span>
        <el-tag size="small" style="margin-left: 8px">{{ asset?.asset_type }}</el-tag>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="资产名称">{{ asset?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据库类型">{{ asset?.asset_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ asset?.host || '-' }}</el-descriptions-item>
        <el-descriptions-item label="端口">{{ asset?.port || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据库名">{{ asset?.database_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="版本">{{ asset?.version || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ asset?.username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新状态">
          <el-tag :type="asset?.update_status === 'idle' ? 'success' : 'warning'" size="small">
            {{ asset?.update_status === 'idle' ? '空闲' : '更新中' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ asset?.last_update_time || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Tab: 库表结构 / 样本数据 -->
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="库表结构" name="dbs">
          <el-table :data="dbList" stripe v-loading="dbLoading" style="width: 100%" row-key="db_id">
            <!-- 数据库行 -->
            <el-table-column type="expand" min-width="30">
              <template #default="{ row }">
                <div style="padding: 8px 0 8px 20px; background: #fafafa; border-radius: 4px; margin: 4px;">
                  <div v-for="tbl in row.tables" :key="tbl.id" style="margin-bottom: 8px;">
                    <div @click="toggleTable(tbl.id)" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #fff; border-radius: 4px; border: 1px solid #e8e8e8; cursor: pointer; user-select: none;">
                      <el-icon :color="tbl._expanded ? '#409EFF' : '#909399'">
                        <ArrowRight v-if="!tbl._expanded" /><ArrowDown v-else />
                      </el-icon>
                      <el-icon color="#409EFF"><Folder /></el-icon>
                      <strong style="flex: 1">{{ tbl.name }}</strong>
                      <el-tag v-if="tbl.comment" size="small" type="info" effect="plain">{{ tbl.comment }}</el-tag>
                      <span style="color: #909399; font-size: 12px;">{{ tbl.row_count || 0 }} 行</span>
                      <span style="color: #909399; font-size: 12px;">{{ tbl.columns?.length || 0 }} 字段</span>
                      <el-tag size="small" :type="tbl._expanded ? 'primary' : 'info'" effect="plain">{{ tbl._expanded ? '收起' : '展开' }}</el-tag>
                    </div>
                    <!-- 字段列表（折叠/展开） -->
                    <div v-show="tbl._expanded && tbl.columns?.length" style="padding: 4px 0 0 24px;">
                      <div v-for="col in tbl.columns" :key="col.id" style="display: flex; align-items: center; gap: 8px; padding: 3px 8px; font-size: 13px;">
                        <el-icon :size="12" color="#67C23A"><Coin /></el-icon>
                        <span style="font-weight: 500; min-width: 120px;">{{ col.name }}</span>
                        <el-tag size="small" effect="plain" style="min-width: 80px; text-align: center;">{{ col.data_type }}</el-tag>
                        <span style="color: #909399; flex: 1;">{{ col.comment || '' }}</span>
                        <el-tag v-if="col.is_primary_key" size="small" type="danger" effect="dark" style="min-width: 32px; text-align: center;">PK</el-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="数据库" min-width="250">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-icon color="#E6A23C"><FolderOpened /></el-icon>
                  <strong>{{ row.name }}</strong>
                  <el-tag size="small" type="info" effect="plain">{{ row.charset || 'utf8mb4' }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="表数量" min-width="100" align="center">
              <template #default="{ row }">{{ row.tables?.length || 0 }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="isAdmin" label="样本数据" name="samples">
          <div style="padding: 16px">
            <el-form inline>
              <el-form-item label="数据库">
                <el-select v-model="sampleDbId" placeholder="选数据库" @change="loadSampleTables" style="width: 200px">
                  <el-option v-for="db in dbList" :key="db.id || db.db_id" :label="db.name" :value="db.id || db.db_id" />
                </el-select>
              </el-form-item>
              <el-form-item label="数据表">
                <el-select v-model="sampleTableId" placeholder="选数据表" @change="loadSampleColumns" style="width: 200px">
                  <el-option v-for="tbl in sampleTables" :key="tbl.id" :label="tbl.name" :value="tbl.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="字段">
                <el-select v-model="sampleColumnId" placeholder="选字段" @change="loadSamples" style="width: 200px">
                  <el-option v-for="col in sampleColumns" :key="col.id" :label="col.name" :value="col.id" />
                </el-select>
              </el-form-item>
            </el-form>
            <div v-if="samples.length > 0" style="margin-top: 16px">
              <h4>样本数据 ({{ samples.length }} 条)</h4>
              <el-table :data="samples.map((v, i) => ({ index: i + 1, value: v }))" stripe>
                <el-table-column type="index" label="#" min-width="60" />
                <el-table-column prop="value" label="值" min-width="300" />
              </el-table>
            </div>
            <div v-else-if="sampleColumnId" style="text-align: center; padding: 40px; color: #909399">正在加载样本数据...</div>
            <div v-else style="text-align: center; padding: 40px; color: #909399">请选择数据库、表和字段查看样本数据</div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowDown, ArrowRight, FolderOpened, Folder, Coin } from '@element-plus/icons-vue'
import { getAssetDetail, getAssetSamples } from '@/api/assets'
import { useUserStore } from '@/store/user'

const route = useRoute()
const assetId = Number(route.params.id)

const userStore = useUserStore()
const isAdmin = computed(() => userStore.userInfo?.role_code === 'ADMIN')

const loading = ref(false)
const dbLoading = ref(false)
const activeTab = ref('dbs')
const asset = ref<any>(null)
const dbList = ref<any[]>([])

// Sample data
const sampleDbId = ref<number | null>(null)
const sampleTableId = ref<number | null>(null)
const sampleColumnId = ref<number | null>(null)
const sampleTables = ref<any[]>([])
const sampleColumns = ref<any[]>([])
const samples = ref<any[]>([])

async function fetchAsset() {
  loading.value = true
  try {
    const res = await getAssetDetail(assetId)
    asset.value = res.data
  } finally { loading.value = false }
}

function toggleTable(tblId: number) {
  for (const db of dbList.value) {
    for (const tbl of (db.tables || [])) {
      if (tbl.id === tblId) {
        tbl._expanded = !tbl._expanded
        return
      }
    }
  }
}

async function fetchDatabases() {
  dbLoading.value = true
  try {
    const { getAssetDatabases, getAssetTables, getAssetColumns } = await import('@/api/assets')
    // 1. 获取数据库列表
    const dbRes = await getAssetDatabases(assetId)
    const dbs = dbRes.data?.items || dbRes.data || []
    // 2. 获取所有表
    const tblRes = await getAssetTables(assetId)
    const tbls = tblRes.data?.items || tblRes.data || []
    // 3. 获取所有字段
    const colRes = await getAssetColumns(assetId)
    const colData = colRes.data?.items || colRes.data || []
    // 4. 组装树形结构
    dbList.value = (Array.isArray(dbs) ? dbs : []).map((db: any) => {
      const dbId = db.id || db.db_id
      const tblMatch = (Array.isArray(tbls) ? tbls : []).filter((t: any) => t.database_id === dbId)
      return {
        db_id: dbId,
        id: dbId,
        name: db.name || db.database_name,
        type: 'database',
        charset: db.charset || '',
        tables: tblMatch.map((t: any) => {
          const colMatch = (Array.isArray(colData) ? colData : []).filter((c: any) => c.table_id === t.id)
          return {
            ...t,
            id: t.id,
            type: 'table',
            _expanded: false,
            columns: colMatch.length ? colMatch : (t.columns || []),
          }
        }),
      }
    })
  } finally { dbLoading.value = false }
}

// ===== 样本数据 =====
function loadSampleTables() {
  const db = dbList.value.find(d => d.db_id === sampleDbId.value || d.id === sampleDbId.value)
  sampleTables.value = db?.tables?.map((t: any) => ({ id: t.id || t.table_id, name: t.name })) || []
  sampleTableId.value = null
  sampleColumnId.value = null
  samples.value = []
}

async function loadSampleColumns() {
  sampleColumnId.value = null
  samples.value = []
  if (!sampleTableId.value) return
  // 从dbList中获取该表的字段
  for (const db of dbList.value) {
    const tbl = db.tables?.find((t: any) => t.id === sampleTableId.value)
    if (tbl) {
      sampleColumns.value = tbl.columns?.map((c: any) => ({ id: c.id, name: c.name })) || []
      break
    }
  }
}

async function loadSamples() {
  if (!sampleDbId.value || !sampleTableId.value || !sampleColumnId.value) return
  try {
    const res = await getAssetSamples(assetId, {
      database_id: sampleDbId.value,
      table_id: sampleTableId.value,
      column_id: sampleColumnId.value,
      limit: 10,
    })
    if (res.data?.samples) {
      samples.value = res.data.samples
    }
  } catch (err: any) {
    if (err?.response?.data?.message?.includes('权限不足')) {
      ElMessage.warning('仅管理员可查看样本数据')
    }
    samples.value = []
  }
}

onMounted(async () => {
  await fetchAsset()
  await fetchDatabases()
})
</script>

<style scoped>
.back-nav { margin-bottom: 12px; }
.mb-20 { margin-bottom: 20px; }
</style>

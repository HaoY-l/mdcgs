<template>
  <div class="page-container">
    <div class="back-nav">
      <el-button text @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回模板列表
      </el-button>
    </div>

    <!-- 顶部信息 -->
    <div class="header-bar">
      <div class="header-info">
        <h2>{{ template?.name || '模板详情' }}</h2>
        <p class="header-desc">{{ template?.description }}</p>
      </div>
      <div class="header-badges">
        <el-tag :type="template?.is_active ? 'success' : 'info'" size="small" effect="plain" round>
          {{ template?.is_active ? '已启用' : '已停用' }}
        </el-tag>
        <el-tag type="primary" size="small" effect="plain" round>{{ template?.template_type }}</el-tag>
      </div>
    </div>

    <!-- Tab页签 -->
    <div class="tab-card">
      <el-tabs v-model="activeTab">
        <!-- 分类目录 -->
        <el-tab-pane label="分类目录" name="categories">
          <div class="toolbar">
            <el-button type="primary" size="small" @click="openAddCategoryDialog()">
              <el-icon><Plus /></el-icon> 新增分类
            </el-button>
            <el-button size="small" @click="handleImportCategories">导入目录</el-button>
          </div>
          <el-table
            :data="flatCategories"
            stripe
            v-loading="catLoading"
            size="small"
            row-key="id"
            style="width: 100%"
            :header-cell-style="{ 'white-space': 'nowrap' }"
          >
            <el-table-column prop="name" label="分类名称" min-width="120">
              <template #default="{ row }">
                <span :style="{ paddingLeft: (row._level || 0) * 20 + 'px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }">
                  <el-icon :size="14" :color="row.children?.length ? '#409EFF' : '#86909c'">
                    <component :is="row.children?.length ? FolderOpened : Document" />
                  </el-icon>
                  {{ row.name }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="parent_name" label="父级分类" min-width="100">
              <template #default="{ row }">
                <span v-if="row.parent_name" style="white-space: nowrap">{{ row.parent_name }}</span>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="数据分级" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag
                  v-if="row.level_code"
                  :color="getLevelColor(row.level_code)"
                  size="small"
                  style="color: #fff; border: none; font-weight: 500; white-space: nowrap"
                >
                  {{ row.level_name || row.level_code }}
                </el-tag>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="是否敏感" min-width="68" align="center">
              <template #default="{ row }">
                <template v-if="row.level_id">
                  <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small" effect="dark" style="white-space: nowrap">
                    {{ row.is_sensitive ? '敏感' : '非敏感' }}
                  </el-tag>
                </template>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="180">
              <template #default="{ row }">
                <div style="white-space: nowrap">
                  <el-button text type="primary" size="small" @click="openAddCategoryDialog(row)">
                    <el-icon><Plus /></el-icon>新增子级
                  </el-button>
                  <el-button text type="primary" size="small" @click="editCategory(row)">编辑</el-button>
                  <el-button text type="danger" size="small" @click="handleDeleteCategory(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 数据特征 -->
        <el-tab-pane label="数据特征" name="features">
          <div class="toolbar">
            <el-button type="primary" size="small" @click="openAddFeatureDialog()">
              <el-icon><Plus /></el-icon> 新增特征
            </el-button>
          </div>
          <el-table :data="features" stripe v-loading="featLoading" size="small" style="width: 100%" :header-cell-style="{ whiteSpace: 'nowrap' }">
            <el-table-column prop="name" label="特征名称" min-width="120" />
            <el-table-column label="规则组合" min-width="64" align="center">
              <template #default="{ row }">
                <el-tag :type="row.rule_type === 'and' ? 'primary' : 'warning'" size="small" effect="dark">
                  {{ row.rule_type === 'and' ? '且' : '或' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="规则预览" min-width="220">
              <template #default="{ row }">
                <div v-if="row.rules?.length" style="white-space: nowrap">
                  <el-tag
                    v-for="(r, i) in row.rules.slice(0, 3)" :key="i"
                    size="small" type="info" class="rule-tag"
                  >
                    {{ r.field_type === 'column_name' ? '字段名' : r.field_type === 'column_comment' ? '注释' : '样本' }}
                    {{ r.match_type === 'contains' ? '包含' : r.match_type === 'regex' ? '正则' : r.match_type }}
                    "{{ r.value }}"
                  </el-tag>
                  <el-tag v-if="row.rules.length > 3" size="small" effect="plain">+{{ row.rules.length - 3 }}</el-tag>
                </div>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="启用" min-width="58" align="center">
              <template #default="{ row }">
                <el-tooltip
                  v-if="referencedFeatureIds.has(row.id)"
                  content="该特征已被数据类型引用，强制启用"
                  placement="top"
                >
                  <el-switch v-model="row.is_active" size="small" @change="toggleFeature(row)"
                    :disabled="true" />
                </el-tooltip>
                <el-switch v-else v-model="row.is_active" size="small" @change="toggleFeature(row)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="110">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button text type="primary" size="small" @click="editFeature(row)">编辑</el-button>
                  <el-button text type="danger" size="small" @click="handleDeleteFeature(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 数据类型 -->
        <el-tab-pane label="数据类型" name="dataTypes">
          <div class="toolbar">
            <el-button type="primary" size="small" @click="openAddDataTypeDialog()">
              <el-icon><Plus /></el-icon> 新增数据类型
            </el-button>
          </div>
          <el-table :data="dataTypes" stripe v-loading="dtLoading" size="small" style="width: 100%" :header-cell-style="{ whiteSpace: 'nowrap' }">
            <el-table-column prop="name" label="数据类型名称" min-width="110" />
            <el-table-column prop="category_name" label="所属分类" min-width="120" />
            <el-table-column label="数据分级" min-width="80" align="center">
              <template #default="{ row }">
                <el-tag
                  v-if="row.level_code"
                  :color="getLevelColor(row.level_code)"
                  size="small"
                  style="color: #fff; border: none; white-space: nowrap"
                >
                  {{ row.level_name || row.level_code }}
                </el-tag>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="是否敏感" min-width="76" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_sensitive ? 'danger' : 'info'" size="small" effect="dark">
                  {{ row.is_sensitive ? '敏感' : '非敏感' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="feature_count" label="特征数" min-width="64" align="center" />
            <el-table-column prop="hit_threshold" label="阈值" min-width="72" align="center">
              <template #default="{ row }">
                <span>{{ row.hit_threshold ?? 80 }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="脱敏" min-width="56" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.suggest_mask" color="#67C23A" size="16"><Check /></el-icon>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="加密" min-width="56" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.suggest_encrypt" color="#67C23A" size="16"><Check /></el-icon>
                <span v-else style="color: #c9cdd4">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="110">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button text type="primary" size="small" @click="editDataType(row)">编辑</el-button>
                  <el-button text type="danger" size="small" @click="handleDeleteDataType(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- ====== 弹窗保持不变 ====== -->
    <!-- 把原来所有的弹窗代码拿进来 -->
    <!-- ===== 分类目录弹窗 ===== -->
    <el-dialog v-model="showCatDialog" :title="catDialogTitle" width="480px" :close-on-click-modal="false" class="form-dialog">
      <template v-if="catForm.parent_id !== 0 && catForm.parent_id !== null">
        <el-form :model="catForm" label-width="90px">
          <el-form-item label="分类名称" required>
            <el-input v-model="catForm.name" placeholder="如: 手机号, 邮箱" />
          </el-form-item>
          <el-form-item label="父级分类">
            <el-tag type="primary">{{ catForm.parent_name || lookupParentName(catForm.parent_id) }}</el-tag>
          </el-form-item>
          <el-form-item label="数据分级" required>
            <el-select v-model="catForm.level_id" placeholder="选择分级" style="width: 100%">
              <el-option v-for="l in levelOptions" :key="l.id" :label="l.level_name + ' (' + l.level_code + ')'" :value="l.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
        <el-form :model="catForm" label-width="90px">
          <el-form-item label="分类名称" required>
            <el-input v-model="catForm.name" placeholder="如: 个人信息" />
          </el-form-item>
          <el-form-item label="父级分类">
            <el-tree-select
              v-model="catForm.parent_id"
              :data="categoryTree"
              :props="{ label: 'name', value: 'id', children: 'children', emitPath: false } as any"
              placeholder="不选则创建一级分类"
              style="width: 100%"
              filterable clearable
            />
          </el-form-item>
          <el-form-item label="数据分级">
            <el-select v-model="catForm.level_id" placeholder="选择分级(可选)" style="width: 100%" clearable>
              <el-option v-for="l in levelOptions" :key="l.id" :label="l.level_name + ' (' + l.level_code + ')'" :value="l.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="showCatDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveCategory">确定</el-button>
      </template>
    </el-dialog>

    <!-- ===== 数据特征弹窗 ===== -->
    <el-dialog v-model="showFeatDialog" :title="featDialogTitle" width="640px" :close-on-click-modal="false" class="form-dialog">
      <el-form :model="featForm" label-width="90px">
        <el-form-item label="特征名称" required>
          <el-input v-model="featForm.name" placeholder="如: 手机号特征" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="14">
            <el-form-item label="规则组合">
              <el-radio-group v-model="featForm.rule_type" size="small">
                <el-radio-button value="and">全部匹配</el-radio-button>
                <el-radio-button value="or">任一匹配</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="启用">
              <el-switch v-model="featForm.is_active" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="特征描述">
          <el-input v-model="featForm.description" type="textarea" :rows="2" placeholder="可选描述" />
        </el-form-item>
        <div class="divider-title">匹配规则 <span class="hint">支持多规则组合</span></div>
        <div v-for="(rule, idx) in featForm.rules" :key="idx" class="rule-row">
          <el-row :gutter="8" align="middle">
            <el-col :span="7">
              <el-select v-model="rule.field_type" size="small" style="width: 100%">
                <el-option label="字段名" value="column_name" />
                <el-option label="字段注释" value="column_comment" />
                <el-option label="字段内容" value="column_value" />
              </el-select>
            </el-col>
            <el-col :span="7">
              <el-select v-model="rule.match_type" size="small" style="width: 100%">
                <el-option label="正则匹配" value="regex" />
                <el-option label="包含" value="contains" />
                <el-option label="不包含" value="not_contains" />
                <el-option label="等于" value="equals" />
                <el-option label="开头" value="starts_with" />
                <el-option label="结尾" value="ends_with" />
                <el-option label="数据字典" value="dict" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-input v-model="rule.value" size="small" :placeholder="rule.match_type === 'regex' ? '如: ^1[3-9]\\\d{9}$' : '匹配值'" />
            </el-col>
            <el-col :span="2" style="text-align: center">
              <el-button text type="danger" size="small" @click="featForm.rules.splice(idx, 1)" :disabled="featForm.rules.length <= 1">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-col>
          </el-row>
        </div>
        <el-button size="small" plain @click="featForm.rules.push({ field_type: 'column_name', match_type: 'regex', value: '' })">
          <el-icon><Plus /></el-icon> 添加规则
        </el-button>
      </el-form>
      <template #footer>
        <el-button @click="showFeatDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveFeature">确定</el-button>
      </template>
    </el-dialog>

    <!-- ===== 数据类型弹窗 ===== -->
    <el-dialog v-model="showDtDialog" :title="dtDialogTitle" width="520px" :close-on-click-modal="false" class="form-dialog">
      <el-form :model="dtForm" label-width="100px">
        <el-form-item label="数据类型名称" required>
          <el-input v-model="dtForm.name" placeholder="如: 手机号, 身份证" />
        </el-form-item>
        <el-form-item label="所属分类" required>
          <el-tree-select
            v-model="dtForm.category_id"
            :data="categoryTree"
            :props="{ label: 'name', value: 'id', children: 'children', emitPath: false } as any"
            placeholder="选择末级分类"
            style="width: 100%" filterable
          />
        </el-form-item>
        <el-form-item label="数据分级" required>
          <template v-if="selectedCategoryLevel">
            <el-tag :color="getLevelColor(selectedCategoryLevel.level_code)" style="color: #fff; border: none;">
              {{ selectedCategoryLevel.level_name }} ({{ selectedCategoryLevel.level_code }})
            </el-tag>
            <span class="inherit-hint">继承自「{{ selectedCategoryName }}」</span>
            <input type="hidden" :value="selectedCategoryLevel.id" />
          </template>
          <el-select v-else v-model="dtForm.level_id" placeholder="分类未绑定分级，请手动选择" style="width: 100%">
            <el-option v-for="l in levels" :key="l.id" :label="l.level_name" :value="l.id">
              <span>{{ l.level_name }} ({{ l.level_code }})</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="命中率阈值">
              <el-input-number v-model="dtForm.hit_threshold" :min="0" :max="100" controls-position="right" style="width: 140px" />
              <span style="margin-left: 6px; color: #86909c">%</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联特征">
              <el-select v-model="dtForm.feature_ids" multiple placeholder="选择" style="width: 100%" filterable>
                <el-option v-for="f in features" :key="f.id" :label="f.name" :value="f.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="divider-title">安全建议</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="建议脱敏">
              <el-switch v-model="dtForm.suggest_mask" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="建议加密">
              <el-switch v-model="dtForm.suggest_encrypt" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showDtDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveDataType">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, FolderOpened, Document, Plus, Edit, Delete, Check } from '@element-plus/icons-vue'
import {
  getTemplateDetail,
  getCategoryTree, createCategory, updateCategory, deleteCategory,
  getFeatures, createFeature, updateFeature, deleteFeature,
  getDataTypes, createDataType, updateDataType, deleteDataType,
  getLevels,
} from '@/api/classification'

const route = useRoute()
const tplId = Number(route.params.id)

const activeTab = ref('categories')
const submitting = ref(false)

// ===== 模板信息 =====
const template = ref<any>(null)

// ===== 分类目录 =====
const catLoading = ref(false)
const categoryTree = ref<any[]>([])
const showCatDialog = ref(false)
const editingCat = ref(false)
const catEditId = ref<number | null>(null)
const levelOptions = ref<any[]>([])
const catForm = reactive({
  name: '',
  parent_id: null as number | null,
  parent_name: '',
  level_id: null as number | null,
  sort_order: 0,
})

const catDialogTitle = computed(() => editingCat.value ? '编辑分类' : '新增分类')

// 展平树结构用于表格显示
const flatCategories = computed(() => {
  function flatten(items: any[], parentName = '', level = 0): any[] {
    const result: any[] = []
    for (const item of items) {
      const { children, ...rest } = item
      result.push({
        ...rest,
        parent_name: parentName,
        _level: level,
        hasChildren: !!(children && children.length),
      })
      if (children && children.length) {
        result.push(...flatten(children, item.name, level + 1))
      }
    }
    return result
  }
  return flatten(categoryTree.value)
})

// ===== 数据特征 =====
const featLoading = ref(false)
const features = ref<any[]>([])
const showFeatDialog = ref(false)
const editingFeat = ref(false)
const featForm = reactive({
  name: '',
  rule_type: 'and',
  is_active: true,
  description: '',
  rules: [{ field_type: 'column_name', match_type: 'regex', value: '' }],
})
const featEditId = ref<number | null>(null)

const featDialogTitle = computed(() => editingFeat.value ? '编辑特征' : '新增特征')

// ===== 数据类型 =====
const dtLoading = ref(false)
const dataTypes = ref<any[]>([])
const levels = ref<any[]>([])
const showDtDialog = ref(false)
const editingDt = ref(false)
const dtForm = reactive({
  name: '',
  category_id: null as number | null,
  level_id: null as number | null,
  hit_threshold: 80,
  feature_ids: [] as number[],
  suggest_mask: false,
  suggest_encrypt: false,
})
const dtEditId = ref<number | null>(null)

const dtDialogTitle = computed(() => editingDt.value ? '编辑数据类型' : '新增数据类型')

// 根据选中的分类自动获取其绑定的分级
const selectedCategoryLevel = computed(() => {
  if (!dtForm.category_id) return null
  const cat = flatCategories.value.find((c: any) => c.id === dtForm.category_id)
  if (!cat || !cat.level_id) return null
  return levels.value.find((l: any) => l.id === cat.level_id) || null
})

const selectedCategoryName = computed(() => {
  if (!dtForm.category_id) return ''
  const cat = flatCategories.value.find((c: any) => c.id === dtForm.category_id)
  return cat?.name || ''
})

// 被数据类型引用的特征ID集合（被引用时强制启用，不可关闭）
const referencedFeatureIds = computed(() => {
  const ids = new Set<number>()
  for (const dt of dataTypes.value) {
    if (dt.feature_ids && Array.isArray(dt.feature_ids)) {
      for (const fid of dt.feature_ids) {
        ids.add(fid)
      }
    }
  }
  return ids
})

// ===== 工具函数 =====
function getLevelColor(code: string): string {
  const map: Record<string, string> = {
    'L1': '#FF4D4F',
    'L2': '#FF7A00',
    'L3': '#FFC000',
    'L4': '#92D050',
    'L5': '#00B0F0',
  }
  return map[code] || '#909399'
}

// ===== 加载数据 =====
async function loadAll() {
  await Promise.all([
    fetchTemplate(),
    fetchCategories(),
    fetchFeatures(),
    fetchDataTypes(),
    fetchLevels(),
  ])
}

async function fetchTemplate() {
  try {
    const res = await getTemplateDetail(tplId)
    template.value = res.data
  } catch {
    // ignore
  }
}

// ===== 分类目录操作 =====
async function fetchCategories() {
  catLoading.value = true
  try {
    const res = await getCategoryTree(tplId)
    categoryTree.value = res.data || []
  } finally {
    catLoading.value = false
  }
}

async function fetchLevels() {
  try {
    const res = await getLevels()
    levelOptions.value = res.data || []
    levels.value = res.data || []
  } catch {
    // ignore
  }
}

function lookupParentName(id: number): string {
  for (const item of flatCategories.value) {
    if (item.id === id) return item.name
  }
  return ''
}

function openAddCategoryDialog(parent?: any) {
  catForm.name = ''
  catForm.parent_id = parent ? parent.id : 0
  catForm.level_id = null
  catForm.sort_order = 0
  catForm.parent_name = parent ? parent.name : ''
  editingCat.value = false
  catEditId.value = null
  showCatDialog.value = true
}

function editCategory(data: any) {
  catEditId.value = data.id
  catForm.name = data.name
  catForm.parent_id = data.parent_id || null
  catForm.level_id = data.level_id || null
  catForm.sort_order = data.sort_order ?? 0
  editingCat.value = true
  showCatDialog.value = true
}

async function saveCategory() {
  if (!catForm.name) {
    ElMessage.warning('请输入分类名称')
    return
  }
  submitting.value = true
  try {
    const payload: any = { name: catForm.name }
    if (catForm.parent_id && catForm.parent_id !== 0 && catForm.parent_id !== null) {
      payload.parent_id = catForm.parent_id
    }
    if (catForm.level_id) {
      payload.level_id = catForm.level_id
    }
    if (catForm.sort_order !== undefined && catForm.sort_order !== null) {
      payload.sort_order = catForm.sort_order
    }
    if (editingCat.value && catEditId.value) {
      await updateCategory(tplId, catEditId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createCategory(tplId, payload)
      ElMessage.success('创建成功')
    }
    showCatDialog.value = false
    await fetchCategories()
  } catch {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDeleteCategory(data: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类 "${data.name}" 吗？${data.children && data.children.length ? '该分类下有子分类，删除后子分类将一并删除。' : ''}`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteCategory(tplId, data.id)
    ElMessage.success('已删除')
    await fetchCategories()
  } catch {
    // cancelled or error
  }
}

function handleImportCategories() {
  ElMessage.info('导入功能（待实现）')
}

// ===== 数据特征操作 =====
async function fetchFeatures() {
  featLoading.value = true
  try {
    const res = await getFeatures(tplId)
    features.value = res.data?.items || res.data || []
    // 被数据类型引用的特征强制启用
    features.value.forEach((f: any) => {
      if (referencedFeatureIds.value.has(f.id)) {
        f.is_active = true
      }
    })
  } finally {
    featLoading.value = false
  }
}

function openAddFeatureDialog() {
  featForm.name = ''
  featForm.rule_type = 'and'
  featForm.is_active = true
  featForm.description = ''
  featForm.rules = [{ field_type: 'column_name', match_type: 'regex', value: '' }]
  editingFeat.value = false
  featEditId.value = null
  showFeatDialog.value = true
}

function editFeature(row: any) {
  editingFeat.value = true
  featEditId.value = row.id
  featForm.name = row.name
  featForm.rule_type = row.rule_type || 'and'
  featForm.is_active = !!row.is_active
  featForm.description = row.description || ''
  featForm.rules = (row.rules && row.rules.length)
    ? JSON.parse(JSON.stringify(row.rules))
    : [{ field_type: 'column_name', match_type: 'regex', value: '' }]
  showFeatDialog.value = true
}

async function saveFeature() {
  if (!featForm.name) {
    ElMessage.warning('请输入特征名称')
    return
  }
  if (!featForm.rules.length || !featForm.rules.some((r: any) => r.value)) {
    ElMessage.warning('请至少设置一条有值的规则')
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: featForm.name,
      rule_type: featForm.rule_type,
      is_active: featForm.is_active,
      description: featForm.description || undefined,
      rules: featForm.rules.filter((r: any) => r.value),
    }
    if (editingFeat.value && featEditId.value) {
      await updateFeature(tplId, featEditId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createFeature(tplId, payload)
      ElMessage.success('创建成功')
    }
    showFeatDialog.value = false
    await fetchFeatures()
  } catch {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function toggleFeature(row: any) {
  try {
    await updateFeature(tplId, row.id, { is_active: row.is_active })
  } catch {
    // reverted by el-switch? handled in catch
  }
}

async function handleDeleteFeature(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除特征 "${row.name}" 吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteFeature(tplId, row.id)
    ElMessage.success('已删除')
    await fetchFeatures()
  } catch {
    // cancelled
  }
}

// ===== 数据类型操作 =====
async function fetchDataTypes() {
  dtLoading.value = true
  try {
    const res = await getDataTypes(tplId)
    dataTypes.value = res.data?.items || res.data || []
    // enrich with level names / category names
    const catList = flatCategories.value
    dataTypes.value.forEach((dt: any) => {
      const lv = levels.value.find((l: any) => l.id === dt.level_id)
      dt.level_name = lv?.level_name || ''
      dt.level_code = lv?.level_code || ''
      // 类型转换：后端 SmallInteger 0/1 → boolean
      dt.is_sensitive = !!dt.is_sensitive
      dt.suggest_mask = !!dt.suggest_mask
      dt.suggest_encrypt = !!dt.suggest_encrypt
      dt.feature_ids = dt.feature_ids || []
      // find category path
      if (dt.category_id) {
        const cat = catList.find((c: any) => c.id === dt.category_id)
        dt.category_name = cat ? cat.name : ''
      }
    })
  } finally {
    dtLoading.value = false
  }
}

function openAddDataTypeDialog() {
  dtForm.name = ''
  dtForm.category_id = null
  dtForm.level_id = null  // 将由分类自动继承
  dtForm.hit_threshold = 80
  dtForm.feature_ids = []
  dtForm.suggest_mask = false
  dtForm.suggest_encrypt = false
  editingDt.value = false
  dtEditId.value = null
  showDtDialog.value = true
}

function editDataType(row: any) {
  editingDt.value = true
  dtEditId.value = row.id
  dtForm.name = row.name
  dtForm.category_id = row.category_id
  dtForm.level_id = row.level_id
  dtForm.hit_threshold = row.hit_threshold || 80
  dtForm.feature_ids = row.feature_ids ? [...row.feature_ids] : []
  dtForm.suggest_mask = !!row.suggest_mask
  dtForm.suggest_encrypt = !!row.suggest_encrypt
  showDtDialog.value = true
}

async function saveDataType() {
  if (!dtForm.name) {
    ElMessage.warning('请输入数据类型名称')
    return
  }
  if (!dtForm.category_id) {
    ElMessage.warning('请选择所属分类')
    return
  }
  // 优先使用分类绑定的分级，其次使用手动选中的分级
  const levelId = selectedCategoryLevel.value?.id ?? dtForm.level_id
  if (!levelId) {
    ElMessage.warning('所选分类未绑定分级，请手动选择数据分级')
    return
  }
  submitting.value = true
  try {
    const payload: any = {
      name: dtForm.name,
      category_id: dtForm.category_id,
      level_id: levelId,
      hit_threshold: dtForm.hit_threshold,
      suggest_mask: dtForm.suggest_mask,
      suggest_encrypt: dtForm.suggest_encrypt,
    }
    if (dtForm.feature_ids.length) {
      payload.feature_ids = dtForm.feature_ids
    }
    if (editingDt.value && dtEditId.value) {
      await updateDataType(tplId, dtEditId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createDataType(tplId, payload)
      ElMessage.success('创建成功')
    }
    showDtDialog.value = false
    await fetchDataTypes()
  } catch {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDeleteDataType(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除数据类型 "${row.name}" 吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteDataType(tplId, row.id)
    ElMessage.success('已删除')
    await fetchDataTypes()
  } catch {
    // cancelled
  }
}

onMounted(loadAll)
</script>

<style scoped>
/* ===== 顶部导航 ===== */
.back-nav {
  margin-bottom: 12px;
}

/* ===== 信息头 ===== */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 16px;
}

.header-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.header-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #86909c;
}

.header-badges {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== Tab卡片 ===== */
.tab-card {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 0 20px 20px;
  overflow: visible;
}

.tab-card :deep(.el-tabs__header) {
  margin: 0 -20px;
  padding: 0 20px;
  background: #f7f8fa;
  border-bottom: 1px solid #e5e6eb;
  border-radius: 8px 8px 0 0;
}

.tab-card :deep(.el-tabs__item) {
  font-size: 14px;
  height: 44px;
  line-height: 44px;
  padding: 0 20px;
}

.tab-card :deep(.el-tabs__content) {
  padding-top: 16px;
}

/* 表格自适应宽度、不换行 */
.tab-card :deep(.el-table .cell) {
  white-space: nowrap;
}

/* 固定列需要父容器 overflow 可见 */
.tab-card :deep(.el-table__body-wrapper) {
  overflow: visible;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

/* ===== 表格操作按钮组 ===== */
.table-actions {
  display: flex;
  gap: 4px;
}

/* ===== 父级分类名 ===== */
.parent-name {
  color: #4e5969;
  font-size: 13px;
}

/* ===== 规则预览 ===== */
.rule-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 规则标签 - 完全显示，不截断 */
.rule-tag {
  margin: 2px 0;
  white-space: nowrap;
}

/* ===== 特征规则行 ===== */
.rule-row {
  margin-bottom: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #eee;
}

/* ===== 分割标题 ===== */
.divider-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.hint {
  font-weight: normal;
  font-size: 12px;
  color: #86909c;
  margin-left: 6px;
}

/* ===== 继承提示 ===== */
.inherit-hint {
  margin-left: 8px;
  color: #86909c;
  font-size: 12px;
}

/* ===== 弹窗 ===== */
.form-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.form-dialog :deep(.el-form-item) {
  margin-bottom: 16px;
}

.form-dialog :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
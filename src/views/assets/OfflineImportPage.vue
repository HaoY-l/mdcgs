<template>
  <PageShell
    title="离线数据库导入"
    description="上传数据库导出脚本(.sql)，系统解析出库/表/字段结构并生成数据资产，导入后可直接用于分类分级任务"
  >
    <el-steps :active="step" align-center finish-status="success" class="import-steps">
      <el-step title="选择文件" description="选择 .sql 导出脚本" />
      <el-step title="填写信息" description="资产名称、库名等" />
      <el-step title="导入结果" description="解析并生成数据资产" />
    </el-steps>

    <!-- 第一步：选择文件 -->
    <el-card v-if="step === 0" class="section" shadow="never">
      <template #header><span class="section-title">选择导出脚本</span></template>

      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px">
        <p>单文件最大 <b>1GB</b>，大文件解析可能需要数分钟，请勿关闭页面。文件仅在内存中解析，<b>不会</b>保留在服务器上。</p>
        <p>支持格式：<b>.sql</b>（MySQL / Oracle / PostgreSQL / SQL Server 等常见导出脚本）。</p>
      </el-alert>

      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <template #title>不知道该怎么导出？展开下面的「导出指南」，每种数据库都有对应的导出命令和注意事项</template>
      </el-alert>

      <el-upload
        ref="uploaderRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".sql"
        :on-change="onFileChange"
        :on-remove="onFileRemove"
        :file-list="fileList"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将 .sql 文件拖到此处，或<em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .sql，单个文件不超过 1GB</div>
        </template>
      </el-upload>

      <el-collapse v-model="guideActive" class="export-guide">
        <el-collapse-item name="common" title="导出前必看（通用注意事项）">
          <ul class="guide-notes">
            <li v-for="(note, i) in COMMON_NOTES" :key="i">{{ note }}</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item
          v-for="guide in EXPORT_GUIDE_LIST"
          :key="guide.value"
          :name="guide.value"
          :title="`${guide.label} 导出命令`"
        >
          <pre class="guide-code">{{ guide.command }}</pre>
          <ul class="guide-notes">
            <li v-for="(note, i) in guide.notes" :key="i">{{ note }}</li>
          </ul>
        </el-collapse-item>
      </el-collapse>

      <div class="step-actions">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" :disabled="!selectedFile" @click="step = 1">下一步</el-button>
      </div>
    </el-card>

    <!-- 第二步：填写信息 -->
    <el-card v-if="step === 1" class="section" shadow="never">
      <template #header><span class="section-title">资产信息</span></template>

      <el-form :model="form" label-width="120px" class="import-form">
        <el-form-item label="资产名称" required>
          <el-input v-model="form.assetName" placeholder="如：生产库离线快照 2024-06" maxlength="200" />
        </el-form-item>
        <el-form-item label="源数据库类型" required>
          <el-select v-model="form.assetType" style="width: 100%">
            <el-option
              v-for="type in DATA_SOURCE_TYPES"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
          <div class="form-tip">用于标记导出来源，解析器会自动兼容各方言</div>
        </el-form-item>
        <div v-if="currentGuide" class="guide-inline">
          <div class="guide-inline-title">{{ currentGuide.label }} 推荐导出命令</div>
          <pre class="guide-code">{{ currentGuide.command }}</pre>
          <ul class="guide-notes">
            <li v-for="(note, i) in currentGuide.notes" :key="i">{{ note }}</li>
          </ul>
        </div>
        <el-form-item label="库名" required>
          <el-input v-model="form.databaseName" placeholder="如：mydb、HR" maxlength="500" />
          <div class="form-tip">导入后作为该资产的库名；导出脚本中其他库的表会保留库前缀</div>
        </el-form-item>
        <el-form-item label="字符集">
          <el-input v-model="form.charset" placeholder="如：utf8mb4" />
        </el-form-item>
        <el-form-item label="字段样本数">
          <el-input-number v-model="form.sampleCount" :min="1" :max="100" style="width: 200px" />
          <div class="form-tip">每个字段最多保留的样本值数量，用于规则匹配与 AI 分类</div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="业务部门">
              <el-input v-model="form.businessDept" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用系统">
              <el-input v-model="form.appSystem" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="step-actions">
        <el-button @click="step = 0">上一步</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">开始导入</el-button>
      </div>
    </el-card>

    <!-- 第三步：导入结果 -->
    <el-card v-if="step === 2" class="section" shadow="never">
      <template #header><span class="section-title">导入结果</span></template>

      <template v-if="submitting">
        <el-progress :percentage="progress" :stroke-width="16" />
        <p class="form-tip">
          {{ progress < 100 ? '正在上传文件…' : '文件已上传，服务端正在解析并写入资产，请稍候…' }}
        </p>
      </template>

      <template v-else-if="result">
        <el-result icon="success" title="导入成功">
          <template #sub-title>
            资产「{{ result.asset_name }}」已生成，可直接用于分类分级任务
          </template>
        </el-result>
        <el-descriptions :column="2" border class="result-desc">
          <el-descriptions-item label="库名">{{ result.database_name }}</el-descriptions-item>
          <el-descriptions-item label="解析耗时">{{ result.duration }} 秒</el-descriptions-item>
          <el-descriptions-item label="表数量">{{ result.table_count }}</el-descriptions-item>
          <el-descriptions-item label="字段数量">{{ result.column_count }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatSize(result.file_size) }}</el-descriptions-item>
          <el-descriptions-item label="文件编码">{{ result.encoding }}</el-descriptions-item>
          <el-descriptions-item label="跳过语句数">{{ result.skipped_statements }}</el-descriptions-item>
        </el-descriptions>
        <div class="step-actions">
          <el-button @click="handleReset">再导入一个</el-button>
          <el-button type="primary" @click="goAsset">查看资产详情</el-button>
        </div>
      </template>
    </el-card>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import PageShell from '@/components/common/PageShell.vue'
import { DATA_SOURCE_TYPES } from '@/constants/datasource'
import { offlineImport, type OfflineImportResult } from '@/api/offlineImport'

const router = useRouter()

/** 通用注意事项 */
const COMMON_NOTES = [
  '文件必须包含 CREATE TABLE（建表语句）。只有数据、没有表结构的文件会导入失败。',
  '认不出来的语句（视图、触发器、存储过程、SET、LOCK TABLES 等）会被跳过并计入导入结果里的「跳过语句数」，不会中断解析。',
  '表名会保留库 / 模式前缀（如 public.orders、dbo.Staff、HR.CUSTOMER），这样同一个文件里多个模式的同名表不会冲突。',
  '只支持 .sql 格式，单个文件最大 1GB；文件仅在内存中解析，不会保留在服务器上。',
]

/** 各数据库类型的导出命令与注意事项 */
const EXPORT_GUIDE_LIST = [
  {
    value: 'mysql',
    label: 'MySQL / MariaDB / TiDB',
    command: [
      '# 整库导出（结构 + 数据）',
      'mysqldump -h HOST -P PORT -u USER -p --default-character-set=utf8mb4 --single-transaction --skip-lock-tables DB_NAME > db_name.sql',
      '',
      '# 只要表结构（不要数据，文件小、解析快）',
      'mysqldump -h HOST -P PORT -u USER -p --default-character-set=utf8mb4 --no-data DB_NAME > db_name_schema.sql',
      '',
      '# 只导一张表',
      'mysqldump -h HOST -P PORT -u USER -p --default-character-set=utf8mb4 DB_NAME TABLE_NAME > table.sql',
      '',
      '# 容器里的 MySQL（示例）',
      'docker exec mdcgs-mysql mysqldump -uroot -pPASSWORD --default-character-set=utf8mb4 --single-transaction --skip-lock-tables DB_NAME > db_name.sql',
    ].join('\n'),
    notes: [
      '不要用 --no-create-info（只有数据没有建表语句），那样导入会报「未从文件中解析出任何表」。',
      '--single-transaction 不锁表，导出期间不影响业务库。',
    ],
  },
  {
    value: 'postgresql',
    label: 'PostgreSQL',
    command: [
      '# 整库导出（结构 + 数据）—— 必须加 --inserts',
      'pg_dump -h HOST -p PORT -U USER -d DB_NAME --inserts --no-owner --no-privileges > db_name.sql',
      '',
      '# 只要表结构',
      'pg_dump -h HOST -p PORT -U USER -d DB_NAME --schema-only --no-owner > db_name_schema.sql',
      '',
      '# 只导一张表',
      'pg_dump -h HOST -p PORT -U USER -d DB_NAME --table=public.orders --inserts > orders.sql',
    ].join('\n'),
    notes: [
      'pg_dump 默认输出 COPY ... FROM stdin，解析器会跳过 COPY 块，不加 --inserts 的话结构能出来但样本值全空。',
      '--inserts 会把数据转成 INSERT 语句，样本值（身份证、手机号等）才能被规则和 AI 用上。',
    ],
  },
  {
    value: 'oracle',
    label: 'Oracle',
    command: [
      '# 方式一：SQL Developer 图形界面',
      '#   右键数据库 → 工具 → 导出 → SQL 文件 → 勾选「DDL」和「插入」→ 格式选 INSERT',
      '',
      '# 方式二：SQL*Plus spool 生成',
      'SET LINESIZE 32767',
      'SET PAGESIZE 0',
      'SET FEEDBACK OFF',
      'SET TRIMSPOOL ON',
      '',
      'SPOOL db_name.sql',
      "SELECT DBMS_METADATA.GET_DDL('TABLE','CUSTOMER') FROM dual;",
      "INSERT INTO \"CUSTOMER\" (\"ID\",\"NAME\") VALUES (1,'张三');",
      'SPOOL OFF;',
    ].join('\n'),
    notes: [
      'Oracle 没有 mysqldump 这类纯文本导出工具，用 SQL Developer 导出或用 SQL*Plus spool。',
      '结构（GET_DDL）和数据（INSERT）必须写在同一个文件里；只有数据的文件解析不出表结构，会导入失败。',
    ],
  },
  {
    value: 'sqlserver',
    label: 'SQL Server',
    command: [
      '# 方式一：SSMS 图形界面（推荐）',
      '#   右键数据库 → 任务 → 生成脚本 → 选择「架构和数据」',
      '#   → 高级选项 → 勾选「每行数据插入」(Script Data as Inserts) → 保存为 .sql',
      '',
      '# 方式二：命令行导出数据',
      "sqlcmd -S HOST -P PORT -U USER -P '密码' -d DB_NAME -Q \"SET NOCOUNT ON; SELECT * FROM dbo.orders\" -o data.sql",
    ].join('\n'),
    notes: [
      'SSMS 导出时一定要勾上「每行数据插入」，否则脚本里没有 INSERT，样本值会是空的。',
      '脚本里的 GO 批次分隔符已支持，无需手工处理。',
    ],
  },
  {
    value: 'dm',
    label: 'DM（达梦）',
    command: [
      '# 方式一：MySQL 兼容模式下用 mysqldump',
      'mysqldump -h HOST -P PORT -u SYSDBA -p --default-character-set=utf8mb4 --single-transaction --skip-lock-tables DB_NAME > db_name.sql',
      '',
      '# 方式二：用 disql 导出',
      'SET HEADING OFF',
      'SET FEEDBACK OFF',
      'SPOOL db_name.sql',
      '... 导出内容 ...',
      'SPOOL OFF;',
    ].join('\n'),
    notes: [
      '达梦同时兼容 Oracle 风格（"模式"."表名" + COMMENT ON）和 MySQL 风格，两种导出的脚本都能解析。',
      '结构与数据要放在同一个文件里。',
    ],
  },
  {
    value: 'opengauss',
    label: 'openGauss',
    command: [
      '# 整库导出（结构 + 数据）—— 必须加 --inserts',
      'gs_dump -h HOST -p PORT -U USER -d DB_NAME --inserts --no-owner > db_name.sql',
      '',
      '# 也可以直接用 pg_dump（协议兼容）',
      'pg_dump -h HOST -p PORT -U USER -d DB_NAME --inserts --no-owner --no-privileges > db_name.sql',
      '',
      '# 只要表结构',
      'gs_dump -h HOST -p PORT -U USER -d DB_NAME --schema-only --no-owner > db_name_schema.sql',
    ].join('\n'),
    notes: [
      '与 PostgreSQL 同源，同样必须加 --inserts，否则样本值全空。',
    ],
  },
  {
    value: 'polardb',
    label: 'PolarDB',
    command: [
      '# PolarDB for PostgreSQL',
      'pg_dump -h HOST -p PORT -U USER -d DB_NAME --inserts --no-owner --no-privileges > db_name.sql',
      '',
      '# PolarDB for MySQL',
      'mysqldump -h HOST -P PORT -u USER -p --default-character-set=utf8mb4 --single-transaction --skip-lock-tables DB_NAME > db_name.sql',
    ].join('\n'),
    notes: [
      'PolarDB 有 PostgreSQL 和 MySQL 两种兼容模式，按实际部署的版本选对应的导出工具。',
      'PostgreSQL 模式必须加 --inserts。',
    ],
  },
]

const EXPORT_GUIDE_MAP: Record<string, (typeof EXPORT_GUIDE_LIST)[number]> = EXPORT_GUIDE_LIST.reduce(
  (acc: any, item) => {
    acc[item.value] = item
    return acc
  },
  {}
)

const step = ref(0)
const submitting = ref(false)
const progress = ref(0)
const result = ref<OfflineImportResult | null>(null)
const uploaderRef = ref<any>(null)
const fileList = ref<any[]>([])
const selectedFile = ref<File | null>(null)
const guideActive = ref<string[]>(['common'])

const form = reactive({
  assetName: '',
  assetType: 'mysql',
  databaseName: '',
  charset: 'utf8mb4',
  sampleCount: 10,
  businessDept: '',
  appSystem: '',
})

/** 当前所选源数据库类型对应的导出指南 */
const currentGuide = computed(() => EXPORT_GUIDE_MAP[form.assetType])

onMounted(() => {
  // 默认用文件名作为资产名，减少手工输入
  const params = new URLSearchParams(window.location.search)
  if (params.get('name')) form.assetName = params.get('name') as string
})

function onFileChange(file: any, files: any[]) {
  if (files.length > 1) {
    // 只保留一个文件
    fileList.value = [files[files.length - 1]]
  } else {
    fileList.value = files
  }
  const f = file.raw || file
  if (!f) {
    selectedFile.value = null
    return
  }
  if (!/\.sql$/i.test(f.name)) {
    ElMessage.error('仅支持 .sql 格式的数据库导出脚本')
    selectedFile.value = null
    fileList.value = []
    return
  }
  selectedFile.value = f
  if (!form.assetName) {
    form.assetName = f.name.replace(/\.sql$/i, '')
  }
}

function onFileRemove() {
  selectedFile.value = null
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

async function handleSubmit() {
  if (!selectedFile.value) {
    ElMessage.error('请先选择 .sql 文件')
    step.value = 0
    return
  }
  if (!form.assetName.trim()) {
    ElMessage.error('请填写资产名称')
    return
  }
  if (!form.databaseName.trim()) {
    ElMessage.error('请填写库名')
    return
  }

  submitting.value = true
  progress.value = 0
  result.value = null
  step.value = 2
  try {
    const res: any = await offlineImport(
      {
        file: selectedFile.value,
        assetName: form.assetName.trim(),
        assetType: form.assetType,
        databaseName: form.databaseName.trim(),
        charset: form.charset.trim() || 'utf8mb4',
        sampleCount: form.sampleCount,
        businessDept: form.businessDept.trim(),
        appSystem: form.appSystem.trim(),
      },
      (p) => { progress.value = p }
    )
    progress.value = 100
    result.value = res.data as OfflineImportResult
    ElMessage.success('导入成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
    step.value = 1
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  step.value = 0
  progress.value = 0
  result.value = null
  selectedFile.value = null
  fileList.value = []
  uploaderRef.value?.clearFiles()
  form.assetName = ''
  form.databaseName = ''
}

function goAsset() {
  if (result.value) {
    router.push(`/assets/${result.value.asset_id}`)
  }
}
</script>

<style scoped>
.import-steps {
  margin-bottom: var(--spacing-20);
}

.section {
  margin-bottom: var(--spacing-16);
}

.section-title {
  font-weight: var(--font-weight-600);
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-8);
  margin-top: var(--spacing-20);
}

.import-form {
  max-width: 720px;
}

.form-tip {
  font-size: var(--font-size-12);
  color: var(--color-text-tertiary);
  line-height: 1.6;
  margin-top: 2px;
}

.result-desc {
  max-width: 720px;
}

.export-guide {
  margin-top: 16px;
}

.guide-inline {
  margin: -8px 0 18px 120px;
  padding: 12px 14px;
  border-radius: 6px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
}

.guide-inline-title {
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-600);
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.guide-code {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #282c34;
  color: #e6e6e6;
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
}

.guide-notes {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-12);
  line-height: 1.8;
}

.guide-notes li {
  margin-bottom: 2px;
}
</style>

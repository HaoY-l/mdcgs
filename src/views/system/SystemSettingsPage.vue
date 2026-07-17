<template>
  <div class="page-container">
    <div class="page-header"><h2>系统设置</h2></div>
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <!-- 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <el-form label-width="160px" v-loading="basicLoading">
            <el-form-item label="自定义LOGO">
              <div class="logo-preview-wrapper" v-if="currentLogoUrl">
                <img :src="currentLogoUrl" class="logo-preview-img" />
                <span class="logo-preview-tip">当前LOGO</span>
              </div>
              <el-upload ref="uploadRef" action="#" :auto-upload="false" :on-change="handleLogoChange">
                <el-button size="small">选择文件</el-button>
              </el-upload>
              <el-button v-if="logoFile" size="small" type="primary" style="margin-left:12px" @click="submitLogo">上传</el-button>
            </el-form-item>
            <el-form-item label="数据资产更新任务上限">
              <el-input-number v-model="basicForm.asset_task_limit" :min="1" :max="20" />
            </el-form-item>
            <el-form-item label="分类分级任务上限">
              <el-input-number v-model="basicForm.classify_task_limit" :min="1" :max="20" />
            </el-form-item>
            <el-form-item label="数据概览刷新间隔">
              <el-select v-model="basicForm.refresh_interval" style="width: 200px">
                <el-option label="30秒" :value="30" />
                <el-option label="60秒" :value="60" />
                <el-option label="5分钟" :value="300" />
              </el-select>
            </el-form-item>
            <el-form-item><el-button type="primary" @click="saveBasicSettings">保存设置</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全设置 -->
        <el-tab-pane label="安全设置" name="security">
          <el-form label-width="160px" v-loading="securityLoading">
            <el-form-item label="密码最小长度">
              <el-input-number v-model="securityForm.min_length" :min="6" :max="32" />
            </el-form-item>
            <el-form-item label="需大写字母"><el-switch v-model="securityForm.require_uppercase" /></el-form-item>
            <el-form-item label="需小写字母"><el-switch v-model="securityForm.require_lowercase" /></el-form-item>
            <el-form-item label="需数字"><el-switch v-model="securityForm.require_digit" /></el-form-item>
            <el-form-item label="需特殊字符"><el-switch v-model="securityForm.require_special" /></el-form-item>
            <el-form-item label="密码有效期(天)">
              <el-input-number v-model="securityForm.max_age_days" :min="0" :max="365" />
            </el-form-item>
            <el-form-item label="登录失败锁定">
              <el-switch v-model="securityForm.lockout_enabled" />
              <span v-if="securityForm.lockout_enabled" style="margin-left:12px">次数</span>
              <el-input-number v-if="securityForm.lockout_enabled" v-model="securityForm.max_attempts" :min="3" :max="10" style="margin-left:4px" />
            </el-form-item>
            <el-form-item label="会话超时(分钟)">
              <el-input-number v-model="securityForm.timeout_minutes" :min="5" :max="1440" />
            </el-form-item>
            <el-form-item label="IP白名单">
              <el-switch v-model="securityForm.whitelist_enabled" />
            </el-form-item>
            <el-form-item><el-button type="primary" @click="saveSecuritySettings">保存设置</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- LDAP设置 -->
        <el-tab-pane label="LDAP设置" name="ldap">
          <el-form label-width="140px" v-loading="ldapLoading">
            <el-form-item label="启用LDAP登录"><el-switch v-model="ldapForm.enabled" /></el-form-item>
            <el-form-item label="服务器地址"><el-input v-model="ldapForm.host" placeholder="ldap.example.com" /></el-form-item>
            <el-form-item label="端口"><el-input-number v-model="ldapForm.port" :min="1" :max="65535" /></el-form-item>
            <el-form-item label="Base DN"><el-input v-model="ldapForm.base_dn" placeholder="dc=example,dc=com" /></el-form-item>
            <el-form-item label="绑定DN"><el-input v-model="ldapForm.bind_dn" /></el-form-item>
            <el-form-item label="绑定密码"><el-input v-model="ldapForm.bind_password" type="password" show-password /></el-form-item>
            <el-form-item label="用户过滤器"><el-input v-model="ldapForm.user_filter" placeholder="(uid={username})" /></el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveLdapSettings">保存设置</el-button>
              <el-button @click="testLdap" style="margin-left:12px">测试连接</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 开放接口 -->
        <el-tab-pane label="开放接口" name="api">
          <el-table :data="apiKeys" stripe v-loading="apiLoading" style="margin-bottom:16px">
            <el-table-column prop="name" label="密钥名称" min-width="120" />
            <el-table-column prop="key_preview" label="密钥预览" min-width="200" />
            <el-table-column prop="created_at" label="创建时间" min-width="160" />
            <el-table-column label="操作" min-width="120">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="handleDeleteApiKey(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-form :model="apiForm" label-width="140px" inline>
            <el-form-item label="密钥名称">
              <el-input v-model="apiForm.name" placeholder="输入密钥名称" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleCreateApiKey">新建密钥</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 数据安全应用 -->
        <el-tab-pane label="数据安全应用" name="apps">
          <el-table :data="dataApps" stripe v-loading="appsLoading" style="margin-bottom:16px">
            <el-table-column prop="name" label="应用名称" min-width="120" />
            <el-table-column prop="app_type" label="类型" min-width="100" />
            <el-table-column prop="endpoint_url" label="接口地址" min-width="200" />
            <el-table-column label="操作" min-width="160">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleTestDataApp(row)">测试</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteDataApp(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-form :model="dataAppForm" label-width="100px">
            <el-form-item label="应用名称"><el-input v-model="dataAppForm.name" placeholder="输入应用名称" /></el-form-item>
            <el-form-item label="应用类型"><el-input v-model="dataAppForm.app_type" placeholder="如: mysql" /></el-form-item>
            <el-form-item label="接口地址"><el-input v-model="dataAppForm.endpoint_url" placeholder="http://..." /></el-form-item>
            <el-form-item><el-button type="primary" @click="handleCreateDataApp">新增对接</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 扫描引擎配置 -->
        <el-tab-pane label="扫描引擎配置" name="engine">
          <el-form label-width="160px" v-loading="engineLoading">
            <el-form-item label="规则引擎并发线程数">
              <el-input-number v-model="engineForm.rule_threads" :min="1" :max="20" />
              <span class="form-item-tip">同时扫描几张表，越大越快但数据库压力也越大</span>
            </el-form-item>
            <el-form-item label="AI分类并发请求数">
              <el-input-number v-model="engineForm.ai_concurrency" :min="1" :max="20" />
              <span class="form-item-tip">同时发几个AI请求，受API限频限制</span>
            </el-form-item>
            <el-form-item label="AI批处理大小">
              <el-input-number v-model="engineForm.ai_batch_size" :min="1" :max="200" />
              <span class="form-item-tip">每个Prompt中包含的字段数</span>
            </el-form-item>
            <el-form-item label="规则引擎进度权重">
              <el-input-number v-model="engineForm.progress_weight_rule" :min="10" :max="90" :step="5" />
              <span class="form-item-tip">占总进度的百分比（%），与AI分类权重之和为100</span>
            </el-form-item>
            <el-form-item label="AI分类进度权重">
              <el-input-number v-model="engineForm.progress_weight_ai" :min="10" :max="90" :step="5" />
              <span class="form-item-tip">占总进度的百分比（%），与规则引擎权重之和为100</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="engineSaving" @click="saveEngineSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- AI模型配置 -->
        <el-tab-pane label="AI模型配置" name="ai">
          <div v-loading="aiLoading">
            <!-- 全局AI开关 -->
            <el-card shadow="hover" style="margin-bottom: 16px">
              <div class="ai-global-toggle">
                <div class="ai-toggle-info">
                  <span class="ai-toggle-label">启用AI分类</span>
                  <span class="ai-toggle-desc">开启后，分类任务执行时会对字段进行AI识别；关闭后AI模型配置保留但不会在任务中执行</span>
                </div>
                <el-switch v-model="aiEnabled" @change="handleAiEnabledChange" />
              </div>
              <div class="ai-global-toggle" style="border-top: 1px solid var(--el-border-color-light); padding-top: 16px; margin-top: 8px">
                <div class="ai-toggle-info">
                  <span class="ai-toggle-label">仅用模版分类数据</span>
                  <span class="ai-toggle-desc">{{ onlyTemplateCategories ? '开启后，AI只能从模板已有的分类中选择，不能超出模板范围' : '关闭后，AI优先匹配模板分类，匹配不到时可根据字段特征自定义分类' }}</span>
                </div>
                <el-switch v-model="onlyTemplateCategories" @change="handleOnlyTemplateChange" />
              </div>
            </el-card>

            <!-- 配置列表 -->
            <el-card shadow="hover" style="margin-bottom: 16px">
              <template #header>
                <div class="ai-config-header">
                  <span>AI模型配置列表</span>
                  <el-button size="small" type="primary" @click="openCreateConfig">新建配置</el-button>
                </div>
              </template>
              <el-table :data="aiConfigs" stripe empty-text="暂无配置">
                <el-table-column prop="config_name" label="名称" min-width="120" />
                <el-table-column prop="model_name" label="模型" min-width="160" />
                <el-table-column prop="api_base" label="API地址" min-width="160" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span>{{ row.api_base || '默认' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="激活状态" width="90" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                      {{ row.is_active ? '已激活' : '未激活' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="220" fixed="right">
                  <template #default="{ row }">
                    <el-button v-if="!row.is_active" link type="primary" size="small" @click="handleActivateConfig(row)">激活</el-button>
                    <el-button link type="primary" size="small" @click="handleEditConfig(row)">编辑</el-button>
                    <el-button link type="primary" size="small" @click="handleTestConfig(row)">测试</el-button>
                    <el-button v-if="!row.is_locked" link type="danger" size="small" @click="handleDeleteConfig(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <!-- 编辑/新建表单 -->
            <el-card v-if="showConfigForm" shadow="hover">
              <template #header>
                <span>{{ isEditingConfig ? '编辑配置' : '新建配置' }}</span>
              </template>
              <el-form :model="configForm" label-width="140px" style="max-width: 800px">
                <el-form-item label="配置名称" required>
                  <el-input v-model="configForm.config_name" placeholder="输入配置名称" />
                </el-form-item>
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="模型名称" required>
                      <el-input v-model="configForm.model_name" placeholder="如 gpt-4o / claude-sonnet-4" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="API地址">
                      <el-input v-model="configForm.api_base" placeholder="留空使用LiteLLM默认" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="API Key">
                  <el-input v-model="configForm.api_key" type="password" show-password :placeholder="isEditingConfig ? '留空不修改' : '输入API Key'" />
                </el-form-item>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="Max Tokens">
                      <el-input-number v-model="configForm.max_tokens" :min="256" :max="32768" :step="512" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="温度">
                      <el-input-number v-model="configForm.temperature" :min="0" :max="2" :step="0.1" :precision="1" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Top-P">
                      <el-input-number v-model="configForm.top_p" :min="0" :max="1" :step="0.05" :precision="2" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="超时(秒)">
                      <el-input-number v-model="configForm.timeout_seconds" :min="10" :max="600" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="批大小">
                      <el-input-number v-model="configForm.batch_size" :min="1" :max="200" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="重试次数">
                      <el-input-number v-model="configForm.max_retries" :min="0" :max="10" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="System Prompt">
                  <el-input v-model="configForm.system_prompt" type="textarea" :rows="4" placeholder="留空使用默认Prompt" />
                </el-form-item>
                <el-form-item label="User Prompt">
                  <el-input v-model="configForm.user_prompt_template" type="textarea" :rows="4" placeholder="留空使用默认Prompt。可用变量: {column_name} {column_comment} {sample_values} {categories_instruction}" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="configSaving" @click="handleSaveConfig">保存</el-button>
                  <el-button :loading="testingConfig" type="success" @click="handleTestFormConfig">联通性测试</el-button>
                  <el-button @click="showConfigForm = false">取消</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 授权管理 -->
        <el-tab-pane label="授权管理" name="license">
          <div v-loading="licenseLoading">
            <!-- 状态展示 -->
            <el-alert
              v-if="licenseInfo.activated"
              :title="`已激活 - 剩余 ${licenseInfo.remaining_days} 天`"
              type="success"
              :closable="false"
              style="margin-bottom: 20px"
            >
              <template #default>
                <div>授权开始时间: {{ licenseInfo.start_time || '-' }}</div>
                <div>授权结束时间: {{ licenseInfo.end_time || '-' }}</div>
                <div>机器码: {{ licenseInfo.machine_code }}</div>
              </template>
            </el-alert>

            <el-alert
              v-else
              :title="licenseInfo.status"
              type="warning"
              :closable="false"
              style="margin-bottom: 20px"
            >
              <template #default>
                <div>机器码: {{ licenseInfo.machine_code }}</div>
                <div style="color: #909399; font-size: 12px; margin-top: 4px;">请输入授权码进行激活</div>
              </template>
            </el-alert>

            <!-- 激活表单 -->
            <el-form label-width="120px" style="max-width: 600px">
              <el-form-item label="机器码">
                <el-input :value="licenseInfo.machine_code" readonly />
              </el-form-item>
              <el-form-item label="授权码">
                <el-input
                  v-model="licenseKeyForm.license_key"
                  placeholder="请输入授权码"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleActivateLicense" :loading="activateLoading">
                  激活授权
                </el-button>
                <el-button v-if="licenseInfo.activated" type="danger" @click="handleDeactivateLicense" style="margin-left: 12px">
                  注销授权
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getSettings, updateSettings, uploadLogo,
  getLdapSettings, updateLdapSettings, testLdapConnection,
  getPasswordPolicy, updatePasswordPolicy,
  getLoginLockout, updateLoginLockout,
  getSessionTimeout, updateSessionTimeout,
  getIpWhitelist, updateIpWhitelist,
  getApiKeys, createApiKey, deleteApiKey,
  getDataApps, createDataApp, deleteDataApp, testDataAppConnection,
  getLicenseInfo, activateLicense, deactivateLicense,
  getAiSettings, saveAiSettings,
  getAiModelConfigs, createAiModelConfig, updateAiModelConfig,
  deleteAiModelConfig, activateAiModelConfig, testAiModelConfig, testAiModelConnection,
} from '@/api/system'

const activeTab = ref('basic')
const basicLoading = ref(false)
const ldapLoading = ref(false)
const securityLoading = ref(false)
const apiLoading = ref(false)
const appsLoading = ref(false)
const licenseLoading = ref(false)
const activateLoading = ref(false)
const logoFile = ref<File | null>(null)
const uploadRef = ref()
const currentLogoUrl = ref('')

const basicForm = reactive({ asset_task_limit: 5, classify_task_limit: 3, refresh_interval: 60 })

// 安全设置 - 值都是字符串，后端 SysSettings 存字符串
const securityForm = reactive({
  min_length: 8, require_uppercase: true, require_lowercase: true,
  require_digit: true, require_special: false, max_age_days: 90,
  lockout_enabled: true, max_attempts: 5,
  timeout_minutes: 60,
  whitelist_enabled: false,
})

const ldapForm = reactive({ enabled: false, host: '', port: 389, base_dn: '', bind_dn: '', bind_password: '', user_filter: '(uid={username})' })
const apiForm = reactive({ name: '' })
const apiKeys = ref<any[]>([])
const dataApps = ref<any[]>([])
const dataAppForm = reactive({ name: '', app_type: '', endpoint_url: '' })

// 扫描引擎配置
const engineLoading = ref(false)
const engineSaving = ref(false)
const engineForm = reactive({
  rule_threads: 1,
  ai_concurrency: 3,
  ai_batch_size: 50,
  progress_weight_rule: 50,
  progress_weight_ai: 50,
})
const licenseInfo = reactive({
  activated: false,
  machine_code: '',
  start_time: null as string | null,
  end_time: null as string | null,
  remaining_days: null as number | null,
  status: '未激活',
})
const licenseKeyForm = reactive({ license_key: '' })

// ===== 基本设置 =====
async function fetchSettings() {
  basicLoading.value = true
  try {
    const res = await getSettings()
    if (res.data?.basic) {
      Object.assign(basicForm, res.data.basic)
      if (res.data.basic.logo_url) {
        currentLogoUrl.value = res.data.basic.logo_url
      }
    }
  } finally { basicLoading.value = false }
}

async function saveBasicSettings() {
  await updateSettings({ basic: { ...basicForm } })
  ElMessage.success('基本设置已保存')
}

function handleLogoChange(file: any) {
  logoFile.value = file.raw
}

async function submitLogo() {
  if (!logoFile.value) { ElMessage.warning('请先选择文件'); return }
  try {
    const res = await uploadLogo(logoFile.value)
    ElMessage.success('LOGO上传成功')
    logoFile.value = null
    if (res?.data?.url) {
      currentLogoUrl.value = res.data.url
    }
  } catch { ElMessage.error('上传失败') }
}

// ===== LDAP设置 =====
async function fetchLdapSettings() {
  ldapLoading.value = true
  try {
    const res = await getLdapSettings()
    if (res.data) {
      // 后端返回的是字符串 "true"/"false"，需要转成布尔值
      res.data.enabled = res.data.enabled === 'true'
      Object.assign(ldapForm, res.data)
    }
  } finally { ldapLoading.value = false }
}

async function saveLdapSettings() {
  // 布尔值转成字符串提交给后端
  await updateLdapSettings({
    enabled: String(ldapForm.enabled),
    host: ldapForm.host,
    port: ldapForm.port,
    base_dn: ldapForm.base_dn,
    bind_dn: ldapForm.bind_dn,
    bind_password: ldapForm.bind_password,
    user_filter: ldapForm.user_filter,
  })
  ElMessage.success('LDAP设置已保存')
}

async function testLdap() {
  try {
    const res = await testLdapConnection({ host: ldapForm.host, port: ldapForm.port })
    ElMessage.success((res as any)?.message || 'LDAP连接测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
  }
}

// ===== 安全设置 =====
async function loadSecuritySettings() {
  securityLoading.value = true
  try {
    const [pp, lo, st, ip] = await Promise.all([
      getPasswordPolicy(), getLoginLockout(), getSessionTimeout(), getIpWhitelist(),
    ])
    if (pp.data) {
      securityForm.min_length = parseInt(pp.data.min_length || '8')
      securityForm.require_uppercase = pp.data.require_uppercase === 'true'
      securityForm.require_lowercase = pp.data.require_lowercase === 'true'
      securityForm.require_digit = pp.data.require_digit === 'true'
      securityForm.require_special = pp.data.require_special === 'true'
      securityForm.max_age_days = parseInt(pp.data.max_age_days || '90')
    }
    if (lo.data) {
      securityForm.lockout_enabled = lo.data.enabled === 'true'
      securityForm.max_attempts = parseInt(lo.data.max_attempts || '5')
    }
    if (st.data) {
      securityForm.timeout_minutes = parseInt(st.data.timeout_minutes || '60')
    }
    if (ip.data) {
      securityForm.whitelist_enabled = ip.data.enabled === 'true'
    }
  } finally { securityLoading.value = false }
}

async function saveSecuritySettings() {
  await Promise.all([
    updatePasswordPolicy({
      min_length: String(securityForm.min_length),
      require_uppercase: String(securityForm.require_uppercase),
      require_lowercase: String(securityForm.require_lowercase),
      require_digit: String(securityForm.require_digit),
      require_special: String(securityForm.require_special),
      max_age_days: String(securityForm.max_age_days),
    }),
    updateLoginLockout({
      enabled: String(securityForm.lockout_enabled),
      max_attempts: String(securityForm.max_attempts),
    }),
    updateSessionTimeout({
      timeout_minutes: String(securityForm.timeout_minutes),
    }),
    updateIpWhitelist({
      enabled: String(securityForm.whitelist_enabled),
    }),
  ])
  ElMessage.success('安全设置已保存')
}

// ===== 开放接口 =====
async function loadApiKeys() {
  apiLoading.value = true
  try {
    const res = await getApiKeys()
    apiKeys.value = res.data?.items || []
  } finally { apiLoading.value = false }
}

async function handleCreateApiKey() {
  if (!apiForm.name.trim()) { ElMessage.warning('请输入密钥名称'); return }
  try {
    const res = await createApiKey({ name: apiForm.name })
    ElMessage.success(`API密钥创建成功: ${(res as any).data?.key}`)
    apiForm.name = ''
    loadApiKeys()
  } catch { ElMessage.error('创建失败') }
}

async function handleDeleteApiKey(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该API密钥吗？', '提示', { type: 'warning' })
    await deleteApiKey(row.id)
    ElMessage.success('已删除')
    loadApiKeys()
  } catch {}
}

// ===== 数据安全应用 =====
async function loadDataApps() {
  appsLoading.value = true
  try {
    const res = await getDataApps()
    dataApps.value = res.data?.items || []
  } finally { appsLoading.value = false }
}

// ===== 扫描引擎配置 =====
async function loadEngineSettings() {
  engineLoading.value = true
  try {
    const res = await getSettings({ category: 'scan_engine' })
    const data = res.data?.scan_engine || {}
    engineForm.rule_threads = parseInt(data.rule_threads || '1')
    engineForm.ai_concurrency = parseInt(data.ai_concurrency || '3')
    engineForm.ai_batch_size = parseInt(data.ai_batch_size || '50')
    engineForm.progress_weight_rule = parseInt(data.progress_weight_rule || '50')
    engineForm.progress_weight_ai = parseInt(data.progress_weight_ai || '50')
  } finally { engineLoading.value = false }
}

async function saveEngineSettings() {
  engineSaving.value = true
  try {
    await updateSettings({ scan_engine: { ...engineForm } })
    ElMessage.success('扫描引擎配置已保存')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '保存失败')
  } finally { engineSaving.value = false }
}

async function handleCreateDataApp() {
  if (!dataAppForm.name.trim()) { ElMessage.warning('请输入应用名称'); return }
  try {
    await createDataApp({ ...dataAppForm })
    ElMessage.success('创建成功')
    dataAppForm.name = ''; dataAppForm.app_type = ''; dataAppForm.endpoint_url = ''
    loadDataApps()
  } catch { ElMessage.error('创建失败') }
}

async function handleDeleteDataApp(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该应用吗？', '提示', { type: 'warning' })
    await deleteDataApp(row.id)
    ElMessage.success('已删除')
    loadDataApps()
  } catch {}
}

async function handleTestDataApp(row: any) {
  try {
    const res = await testDataAppConnection(row.id) as any
    ElMessage.success(res?.message || '连接测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
  }
}

// ===== AI模型配置 =====
const aiLoading = ref(false)
const aiConfigs = ref<any[]>([])
const aiEnabled = ref(false)
const onlyTemplateCategories = ref(true)
const showConfigForm = ref(false)
const isEditingConfig = ref(false)
const editingConfigId = ref<number | null>(null)
const configSaving = ref(false)
const testingConfig = ref(false)

const defaultConfigForm = {
  config_name: '',
  model_name: '',
  api_base: '',
  api_key: '',
  max_tokens: 4096,
  temperature: 0.1,
  top_p: 1.0,
  timeout_seconds: 120,
  batch_size: 50,
  max_retries: 3,
  system_prompt: '',
  user_prompt_template: '',
}

const configForm = reactive({ ...defaultConfigForm })

async function loadAiConfigs() {
  aiLoading.value = true
  try {
    const [settingsRes, configsRes] = await Promise.all([
      getAiSettings(),
      getAiModelConfigs(),
    ])
    aiEnabled.value = settingsRes.data?.ai_enabled === 'true'
    onlyTemplateCategories.value = settingsRes.data?.only_template_categories !== 'false'
    aiConfigs.value = configsRes.data || []
  } catch { /* ignore */ }
  finally { aiLoading.value = false }
}

async function handleAiEnabledChange(val: any) {
  const enabled = val === true || val === 'true'
  try {
    await saveAiSettings({ ai_enabled: String(enabled) })
    ElMessage.success(enabled ? 'AI分类已启用' : 'AI分类已禁用')
  } catch { ElMessage.error('保存失败') }
}

async function handleOnlyTemplateChange(val: any) {
  const enabled = val === true || val === 'true'
  try {
    await saveAiSettings({ only_template_categories: String(enabled) })
    ElMessage.success(enabled ? '已启用仅用模版分类' : '已关闭仅用模版分类')
  } catch { ElMessage.error('保存失败') }
}

function openCreateConfig() {
  isEditingConfig.value = false
  editingConfigId.value = null
  Object.assign(configForm, defaultConfigForm)
  // 预填默认 Prompt
  configForm.system_prompt = '你是一个专业的数据分类专家。你的任务是根据数据库字段的信息（字段名、注释、样本数据）判断其数据类型、所属分类和数据级别。\n\n请严格按照JSON格式返回结果，不要包含其他文字。'
  configForm.user_prompt_template = '请对以下数据库字段进行分类：\n\n字段名: {column_name}\n字段注释: {column_comment}\n样本数据: {sample_values}\n\n{categories_instruction}\n\n请返回以下JSON格式：\n{{\n  "category_path": "分类路径，如 个人信息/联系方式",\n  "data_type_name": "数据类型名称，如 手机号",\n  "level_code": "级别代码，如 L2",\n  "reason": "分类依据的简要说明",\n  "is_sensitive": true\n}}'
  showConfigForm.value = true
}

function handleEditConfig(row: any) {
  isEditingConfig.value = true
  editingConfigId.value = row.id
  configForm.config_name = row.config_name
  configForm.model_name = row.model_name
  configForm.api_base = row.api_base || ''
  configForm.api_key = ''
  configForm.max_tokens = row.max_tokens || 4096
  configForm.temperature = row.temperature ?? 0.1
  configForm.top_p = row.top_p ?? 1.0
  configForm.timeout_seconds = row.timeout_seconds || 120
  configForm.batch_size = row.batch_size || 50
  configForm.max_retries = row.max_retries || 3
  configForm.system_prompt = row.system_prompt || ''
  configForm.user_prompt_template = row.user_prompt_template || ''
  showConfigForm.value = true
}

async function handleSaveConfig() {
  if (!configForm.config_name.trim()) { ElMessage.warning('请输入配置名称'); return }
  if (!configForm.model_name.trim()) { ElMessage.warning('请输入模型名称'); return }
  configSaving.value = true
  try {
    const data = { ...configForm }
    if (isEditingConfig.value && editingConfigId.value) {
      await updateAiModelConfig(editingConfigId.value, data)
      ElMessage.success('配置已更新')
    } else {
      await createAiModelConfig(data)
      ElMessage.success('配置已创建')
    }
    showConfigForm.value = false
    await loadAiConfigs()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '保存失败')
  } finally { configSaving.value = false }
}

async function handleTestFormConfig() {
  if (!configForm.model_name.trim()) { ElMessage.warning('请先填写模型名称'); return }
  testingConfig.value = true
  try {
    const data = { ...configForm }
    const res = await testAiModelConnection(data) as any
    const result = res.data
    const detail = result?.data_type_name || result?.category_path || JSON.stringify(result)
    ElMessage.success(`连接测试成功！识别结果: ${detail}`)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
  } finally { testingConfig.value = false }
}

async function handleDeleteConfig(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除配置"${row.config_name}"吗？`, '提示', { type: 'warning' })
    await deleteAiModelConfig(row.id)
    ElMessage.success('已删除')
    await loadAiConfigs()
  } catch {}
}

async function handleActivateConfig(row: any) {
  try {
    await activateAiModelConfig(row.id)
    ElMessage.success(`已激活配置"${row.config_name}"`)
    await loadAiConfigs()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '激活失败')
  }
}

async function handleTestConfig(row: any) {
  try {
    const res = await testAiModelConfig(row.id) as any
    ElMessage.success(res?.data ? `测试成功: ${JSON.stringify(res.data)}` : '测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '测试失败')
  }
}

// ===== 授权管理 =====
async function loadLicenseInfo() {
  licenseLoading.value = true
  try {
    const res = await getLicenseInfo()
    if (res.data) {
      Object.assign(licenseInfo, res.data)
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '获取授权信息失败')
  } finally {
    licenseLoading.value = false
  }
}

async function handleActivateLicense() {
  if (!licenseKeyForm.license_key.trim()) {
    ElMessage.warning('请输入授权码')
    return
  }
  activateLoading.value = true
  try {
    const res = await activateLicense(licenseKeyForm.license_key) as any
    ElMessage.success(res?.message || '授权激活成功')
    licenseKeyForm.license_key = ''
    await loadLicenseInfo()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '授权激活失败')
  } finally {
    activateLoading.value = false
  }
}

async function handleDeactivateLicense() {
  try {
    await ElMessageBox.confirm('确定要注销当前授权吗？', '提示', { type: 'warning' })
    await deactivateLicense()
    ElMessage.success('授权已注销')
    licenseKeyForm.license_key = ''
    await loadLicenseInfo()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.response?.data?.message || err?.message || '注销失败')
    }
  }
}

onMounted(async () => {
  await fetchSettings()
  await fetchLdapSettings()
})

// 切换标签时按需加载
const tabLoaders: Record<string, () => Promise<void>> = {
  security: loadSecuritySettings,
  api: loadApiKeys,
  apps: loadDataApps,
  engine: loadEngineSettings,
  ai: loadAiConfigs,
  license: loadLicenseInfo,
}

import { watch } from 'vue'
watch(activeTab, (tab) => {
  tabLoaders[tab]?.()
})
</script>

<style scoped>
.logo-preview-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.logo-preview-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  padding: 4px;
  background: var(--color-surface-subtle);
}
.logo-preview-tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.ai-global-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.ai-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-toggle-label {
  font-size: 15px;
  font-weight: 500;
}

.ai-toggle-desc {
  font-size: 12px;
  color: #909399;
}

.ai-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-toggle-with-desc {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-desc-text {
  font-size: 12px;
  color: #909399;
}

.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style>

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

const ldapForm = reactive({ host: '', port: 389, base_dn: '', bind_dn: '', bind_password: '', user_filter: '(uid={username})' })
const apiForm = reactive({ name: '' })
const apiKeys = ref<any[]>([])
const dataApps = ref<any[]>([])
const dataAppForm = reactive({ name: '', app_type: '', endpoint_url: '' })
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
    if (res.data) Object.assign(ldapForm, res.data)
  } finally { ldapLoading.value = false }
}

async function saveLdapSettings() {
  await updateLdapSettings({ ...ldapForm })
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
    const res = await testDataAppConnection(row.id)
    ElMessage.success(res?.message || '连接测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
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
    const res = await activateLicense(licenseKeyForm.license_key)
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
</style>

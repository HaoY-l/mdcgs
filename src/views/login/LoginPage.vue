<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-grid"></div>
      <div class="bg-glow"></div>
      <div class="bg-glow-secondary"></div>
      <div class="bg-glow-tertiary"></div>
      <div class="particle particle-1"></div>
      <div class="particle particle-2"></div>
      <div class="particle particle-3"></div>
      <div class="particle particle-4"></div>
      <div class="particle particle-5"></div>
    </div>
    <div class="login-content">
      <div class="login-brand">
        <div class="brand-icon">
          <img v-if="customLogoUrl" :src="customLogoUrl" class="brand-logo-img" />
          <svg v-else width="72" height="72" viewBox="0 0 72 72" fill="none">
            <rect width="72" height="72" rx="18" fill="var(--color-primary-500)"/>
            <path d="M20 24l16-10 16 10v24l-16 10-16-10V24z" fill="#fff" opacity="0.9"/>
            <circle cx="36" cy="36" r="8" fill="var(--color-primary-500)"/>
          </svg>
        </div>
        <h1 class="brand-title">MDCGS</h1>
        <p class="brand-desc">数据分类分级系统</p>
      </div>
      <div class="login-card">
        <h2 class="login-title">{{ isLdapLogin ? 'LDAP登录' : '登录' }}</h2>
        <p class="login-subtitle">欢迎回到数据分类分级管理系统</p>
        <el-form ref="formRef" :model="loginForm" :rules="rules" class="login-form" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <div class="input-label">用户名</div>
            <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" />
          </el-form-item>
          <el-form-item prop="password">
            <div class="input-label">密码</div>
            <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" show-password />
          </el-form-item>
          <el-form-item>
            <div class="login-options">
              <el-checkbox v-model="rememberPassword">记住密码</el-checkbox>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
              {{ loading ? '登录中...' : (isLdapLogin ? 'LDAP登录' : '登录') }}
            </el-button>
          </el-form-item>
        </el-form>
        <div v-if="errorMsg" class="login-error">
          <el-alert :title="errorMsg" type="error" show-icon :closable="false" />
        </div>
        <div class="login-links">
          <el-link type="primary" @click="handleOpenLicense">授权管理</el-link>
          <el-divider direction="vertical" />
          <el-link type="primary" @click="isLdapLogin = !isLdapLogin">
            {{ isLdapLogin ? '本地登录' : 'LDAP登录' }}
          </el-link>
        </div>
      </div>
    </div>

    <!-- 授权管理弹窗 -->
    <el-dialog v-model="licenseDialogVisible" title="授权管理" width="500px" :close-on-click-modal="false">
      <div v-loading="licenseLoading">
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

        <el-form label-width="100px">
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
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, ldapLogin } from '@/api/auth'
import { getLicenseInfo, activateLicense, deactivateLicense, getLogoUrl, type LicenseInfo } from '@/api/system'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')
const isLdapLogin = ref(false)
const customLogoUrl = ref('')

const loginForm = reactive({ username: '', password: '' })
const rememberPassword = ref(false)
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// 授权管理
const licenseDialogVisible = ref(false)
const licenseLoading = ref(false)
const activateLoading = ref(false)
const deactivateLoading = ref(false)
const licenseInfo = reactive<LicenseInfo>({
  activated: false,
  machine_code: '',
  start_time: null,
  end_time: null,
  remaining_days: null,
  status: '未激活',
})
const licenseKeyForm = reactive({ license_key: '' })

// 获取自定义Logo
async function fetchCustomLogo() {
  try {
    const res = await getLogoUrl()
    if (res.data?.logo_url) {
      customLogoUrl.value = res.data.logo_url
    }
  } catch {}
}

onMounted(() => {
  fetchCustomLogo()
  // 加载记住的账号密码
  const savedUsername = localStorage.getItem('remembered_username')
  const savedPassword = localStorage.getItem('remembered_password')
  if (savedUsername) loginForm.username = savedUsername
  if (savedPassword) {
    loginForm.password = savedPassword
    rememberPassword.value = true
  }
})

async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  errorMsg.value = ''
  try {
    let res
    if (isLdapLogin.value) {
      res = await ldapLogin(loginForm)
    } else {
      res = await login(loginForm)
    }
    // 记住密码
    if (rememberPassword.value) {
      localStorage.setItem('remembered_username', loginForm.username)
      localStorage.setItem('remembered_password', loginForm.password)
    } else {
      localStorage.removeItem('remembered_username')
      localStorage.removeItem('remembered_password')
    }
    const mustChangePassword = res.data?.must_change_password === 1
    await userStore.fetchUserInfo()

    if (mustChangePassword) {
      router.push('/force-change-password')
    } else {
      ElMessage.success('登录成功')
      router.push((route.query.redirect as string) || '/')
    }
  } catch (err: any) {
    errorMsg.value = err?.response?.data?.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

// 授权管理
async function handleOpenLicense() {
  licenseDialogVisible.value = true
  await loadLicenseInfo()
}

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
  deactivateLoading.value = true
  try {
    await deactivateLicense()
    ElMessage.success('授权已注销')
    licenseKeyForm.license_key = ''
    await loadLicenseInfo()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '注销失败')
  } finally {
    deactivateLoading.value = false
  }
}
</script>

<style scoped>
/* ─── Animations ─── */
@keyframes grid-move {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

@keyframes glow-secondary {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes brand-enter {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes border-glow {
  0%, 100% { border-color: rgba(6, 182, 212, 0.2); }
  50% { border-color: rgba(6, 182, 212, 0.5); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ─── Login Page ─── */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f172a;
  position: relative;
  overflow: hidden;
}

/* ─── Background Effects ─── */
.login-bg { position: absolute; inset: 0; }

.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: grid-move 20s linear infinite;
}

.bg-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
  animation: glow-pulse 4s ease-in-out infinite;
  pointer-events: none;
}

.bg-glow-secondary {
  position: absolute;
  top: 20%; left: 80%;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%);
  animation: glow-secondary 6s ease-in-out infinite;
  pointer-events: none;
}

.bg-glow-tertiary {
  position: absolute;
  bottom: 30%; left: 10%;
  width: 250px; height: 250px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
  animation: glow-secondary 8s ease-in-out infinite reverse;
  pointer-events: none;
}

/* ─── Floating Particles ─── */
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(6, 182, 212, 0.4);
  border-radius: 50%;
  pointer-events: none;
}

.particle-1 { top: 20%; left: 15%; animation: float 6s ease-in-out infinite; }
.particle-2 { top: 60%; left: 85%; animation: float 8s ease-in-out infinite 1s; }
.particle-3 { top: 80%; left: 25%; animation: float 7s ease-in-out infinite 2s; }
.particle-4 { top: 30%; left: 75%; animation: float 5s ease-in-out infinite 0.5s; }
.particle-5 { top: 70%; left: 60%; animation: float 9s ease-in-out infinite 1.5s; }

/* ─── Login Content ─── */
.login-content {
  position: relative;
  display: flex; align-items: center; gap: 60px; z-index: 1;
}

/* ─── Brand Section ─── */
.login-brand {
  text-align: center;
  animation: brand-enter 0.8s ease-out;
}
.brand-icon {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  animation: float 4s ease-in-out infinite;
}
.brand-logo-img {
  max-height: 100px;
  max-width: 200px;
  width: auto;
  height: auto;
  object-fit: scale-down;
  border-radius: 18px;
  filter: drop-shadow(0 4px 20px rgba(6, 182, 212, 0.4));
  animation: glow-pulse 3s ease-in-out infinite;
}
.brand-title {
  font-size: 36px; font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #67e8f9 50%, #fff 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  animation: shimmer 3s linear infinite;
}
.brand-desc {
  font-size: 16px;
  color: #94a3b8;
  margin: 0;
  letter-spacing: 0.1em;
}

/* ─── Login Card ─── */
.login-card {
  width: 400px;
  padding: 40px;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(6, 182, 212, 0.2);
  animation: card-enter 0.6s ease-out, border-glow 3s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent);
  animation: shimmer 2s linear infinite;
}

.login-title {
  font-size: 22px; font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}
.login-subtitle {
  font-size: 14px; color: #94a3b8;
  margin: 0 0 28px;
}
.login-form { margin-bottom: 8px; }
.login-options { display: flex; align-items: center; }
.input-label {
  font-size: 13px; font-weight: 500;
  color: #67e8f9; margin-bottom: 6px;
  transition: color var(--transition-fast);
}
.login-form:focus-within .input-label {
  color: #22d3ee;
}
:deep(.el-input__wrapper) {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: none; border-radius: 8px;
  transition: all var(--transition-fast);
}
:deep(.el-input__wrapper:hover) { border-color: rgba(6, 182, 212, 0.4); }
:deep(.el-input__wrapper.is-focus) {
  border-color: #06b6d4;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15), 0 0 20px rgba(6, 182, 212, 0.1);
}
:deep(.el-input__inner) { color: #e2e8f0; height: 44px; font-size: 15px; }
:deep(.el-input__inner::placeholder) { color: #475569; }
.login-btn {
  width: 100%; height: 44px; font-size: 15px;
  font-weight: 600; border-radius: 8px; margin-top: 8px;
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
  border: none;
  position: relative;
  overflow: hidden;
  transition: all var(--transition-fast);
}
.login-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}
.login-btn:hover::before {
  left: 100%;
}
.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
}
.login-btn:active {
  transform: translateY(0);
}
.login-error { margin-top: 16px; }
.login-links {
  margin-top: 16px;
  text-align: center;
}
:deep(.el-link) {
  font-size: 13px;
  color: #06b6d4;
  transition: all var(--transition-fast);
}
:deep(.el-link:hover) {
  color: #22d3ee;
}
:deep(.el-divider--vertical) {
  border-color: #334155;
}
:deep(.el-checkbox__label) {
  color: #94a3b8;
}
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #06b6d4;
  border-color: #06b6d4;
}
:deep(.el-alert--error) {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
</style>

<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-grid"></div>
      <div class="bg-glow"></div>
    </div>
    <div class="login-content">
      <div class="login-brand">
        <div class="brand-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="var(--color-primary-500)"/>
            <path d="M14 16l10-6 10 6v16l-10 6-10-6V16z" fill="#fff" opacity="0.9"/>
            <circle cx="24" cy="24" r="5" fill="var(--color-primary-500)"/>
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
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, ldapLogin } from '@/api/auth'
import { updateSessionTimeout } from '@/api/client'
import { getSessionTimeout, getLicenseInfo, activateLicense, deactivateLicense, type LicenseInfo } from '@/api/system'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')
const isLdapLogin = ref(false)

const loginForm = reactive({ username: '', password: '' })
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
    const mustChangePassword = res.data?.must_change_password === 1
    await userStore.fetchUserInfo()

    // 获取会话超时设置并保存
    try {
      const timeoutRes = await getSessionTimeout()
      if (timeoutRes.data?.timeout_minutes) {
        updateSessionTimeout(parseInt(timeoutRes.data.timeout_minutes))
      }
    } catch {
      // 忽略超时设置获取错误
    }

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
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f172a;
  position: relative;
  overflow: hidden;
}
.login-bg { position: absolute; inset: 0; }
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
.bg-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.login-content {
  position: relative;
  display: flex; align-items: center; gap: 60px; z-index: 1;
}
.login-brand { text-align: center; }
.brand-icon { margin-bottom: 16px; }
.brand-title {
  font-size: 36px; font-weight: 700; color: #fff;
  margin: 0 0 8px; letter-spacing: -0.02em;
}
.brand-desc { font-size: 16px; color: #64748b; margin: 0; }
.login-card {
  width: 400px; padding: 40px;
  background: #1e293b; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
}
.login-title {
  font-size: 22px; font-weight: 700; color: #fff;
  margin: 0 0 4px;
}
.login-subtitle {
  font-size: 14px; color: #64748b;
  margin: 0 0 28px;
}
.login-form { margin-bottom: 16px; }
.input-label {
  font-size: 13px; font-weight: 500;
  color: #cbd5e1; margin-bottom: 6px;
}
:deep(.el-input__wrapper) {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: none; border-radius: 8px;
}
:deep(.el-input__wrapper:hover) { border-color: #2563eb; }
:deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
:deep(.el-input__inner) { color: #e2e8f0; height: 44px; font-size: 15px; }
:deep(.el-input__inner::placeholder) { color: #475569; }
.login-btn {
  width: 100%; height: 44px; font-size: 15px;
  font-weight: 600; border-radius: 8px; margin-top: 8px;
}
.login-error { margin-top: 16px; }
.login-links {
  margin-top: 16px;
  text-align: center;
}
:deep(.el-link) {
  font-size: 13px;
}
:deep(.el-divider--vertical) {
  border-color: #475569;
}
</style>

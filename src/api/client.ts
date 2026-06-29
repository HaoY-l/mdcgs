import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 会话超时管理
const SESSION_TIMEOUT_KEY = 'session_timeout_minutes'
let sessionTimeoutMinutes = 60 // 默认60分钟
let lastActivityTime = Date.now()

// 更新会话超时配置
export function updateSessionTimeout(minutes: number) {
  sessionTimeoutMinutes = minutes
  localStorage.setItem(SESSION_TIMEOUT_KEY, String(minutes))
}

// 获取会话超时配置
export function getSessionTimeout(): number {
  const stored = localStorage.getItem(SESSION_TIMEOUT_KEY)
  return stored ? parseInt(stored) : sessionTimeoutMinutes
}

// 更新活动时间
export function updateActivity() {
  lastActivityTime = Date.now()
}

// 检查是否超时
export function isSessionExpired(): boolean {
  const elapsed = (Date.now() - lastActivityTime) / 1000 / 60 // 转换为分钟
  return elapsed >= sessionTimeoutMinutes
}

// 登出
function doLogout(message: string = '登录已过期，请重新登录') {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem(SESSION_TIMEOUT_KEY)
  router.push('/login')
  if (message) {
    ElMessage.error(message)
  }
}

// 监听用户活动
if (typeof window !== 'undefined') {
  window.addEventListener('click', updateActivity)
  window.addEventListener('keypress', updateActivity)
  window.addEventListener('scroll', updateActivity)
  window.addEventListener('mousemove', updateActivity)

  // 定期检查会话是否过期
  setInterval(() => {
    const token = localStorage.getItem('access_token')
    if (token && isSessionExpired()) {
      doLogout('会话超时，请重新登录')
    }
  }, 60000) // 每分钟检查一次
}

// 请求拦截器 - 添加Token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    updateActivity() // 更新活动时间
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
client.interceptors.response.use(
  (response) => {
    // blob/file 响应直接返回，不检查 code
    if (response.config.responseType === 'blob') {
      return response
    }
    const data = response.data
    if (data.code !== 0) {
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }
    updateActivity() // 更新活动时间
    return data
  },
  (error) => {
    if (error.response) {
      const { status } = error.response
      if (status === 401) {
        doLogout()
      } else if (status === 403) {
        ElMessage.error('没有权限执行此操作')
      } else {
        ElMessage.error(error.response.data?.message || '服务器错误')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default client

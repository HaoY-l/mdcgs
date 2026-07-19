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

// 是否正在刷新 Token 的标记
let isRefreshing = false
// 等待刷新 Token 的请求队列
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (err: any) => void
}> = []

// 登出
function doLogout(message?: string) {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  if (message) {
    ElMessage.error(message)
  }
  router.push('/login')
}

// 刷新 Token
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null
  try {
    const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
    if (res.data?.code === 0 && res.data?.data?.access_token) {
      const newToken = res.data.data.access_token
      const newRefreshToken = res.data.data.refresh_token
      localStorage.setItem('access_token', newToken)
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken)
      }
      return newToken
    }
    return null
  } catch {
    return null
  }
}

// 请求拦截器 - 添加Token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误 + Token 自动刷新
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
    return data
  },
  async (error) => {
    if (!error.response) {
      ElMessage.error('网络错误，请检查网络连接')
      return Promise.reject(error)
    }

    const { status, config } = error.response

    // 非 401 或已经是刷新 Token 的请求，直接处理
    if (status !== 401 || config.url === '/auth/refresh') {
      if (status === 403) {
        ElMessage.error('没有权限执行此操作')
      } else if (status !== 401) {
        ElMessage.error(error.response.data?.message || '服务器错误')
      }
      return Promise.reject(error)
    }

    // 401：尝试刷新 Token
    if (!isRefreshing) {
      isRefreshing = true
      try {
        const newToken = await refreshAccessToken()
        if (newToken) {
          // 刷新成功，重放所有等待队列中的请求
          isRefreshing = false
          pendingRequests.forEach(({ resolve }) => resolve(newToken))
          pendingRequests = []
          // 重试当前请求
          config.headers.Authorization = `Bearer ${newToken}`
          return client(config)
        }
      } catch {
        // 刷新失败
      }
      isRefreshing = false
      pendingRequests.forEach(({ reject }) => reject(error))
      pendingRequests = []
      doLogout('登录已过期，请重新登录')
      return Promise.reject(error)
    } else {
      // 正在刷新中，将当前请求加入等待队列
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            config.headers.Authorization = `Bearer ${token}`
            resolve(client(config))
          },
          reject,
        })
      })
    }
  }
)

export default client
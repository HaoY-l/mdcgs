import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMe, type UserInfo } from '@/api/auth'

interface MenuItem {
  path: string
  title: string
  icon: string
  children?: MenuItem[]
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const isLoggedIn = ref(false)

  // 菜单配置
  const menuItems = ref<MenuItem[]>([
    {
      path: '/overview',
      title: '数据概览',
      icon: 'DataAnalysis',
      children: [
        { path: '/overview', title: '数据概览', icon: 'DataAnalysis' },
        { path: '/overview/directory', title: '数据目录', icon: 'List' },
      ],
    },
    {
      path: '/assets',
      title: '资产管理',
      icon: 'Monitor',
      children: [
        { path: '/assets', title: '资产列表', icon: 'Monitor' },
        { path: '/assets/scan', title: '自动扫描', icon: 'Search' },
      ],
    },
    {
      path: '/classification/tasks',
      title: '分类分级',
      icon: 'Finished',
      children: [
        { path: '/classification/tasks', title: '分类任务', icon: 'Finished' },
        { path: '/classification/templates', title: '分类模板', icon: 'FolderOpened' },
        { path: '/classification/levels', title: '数据分级', icon: 'Rank' },
        { path: '/classification/masking', title: '脱敏方式', icon: 'Hide' },
        { path: '/classification/encryption', title: '加密方式', icon: 'Lock' },
      ],
    },
    {
      path: '/reports',
      title: '报告中心',
      icon: 'Document',
    },
    {
      path: '/audit',
      title: '审计日志',
      icon: 'List',
    },
    {
      path: '/system/users',
      title: '系统管理',
      icon: 'Tools',
      children: [
        { path: '/system/users', title: '用户管理', icon: 'User' },
        { path: '/system/monitor', title: '性能监控', icon: 'DataBoard' },
        { path: '/system/settings', title: '系统设置', icon: 'Tools' },
      ],
    },
  ])

  async function fetchUserInfo() {
    try {
      const info = await getMe()
      userInfo.value = info
      isLoggedIn.value = true
      return info
    } catch (e) {
      isLoggedIn.value = false
      userInfo.value = null
      throw e
    }
  }

  function logout() {
    userInfo.value = null
    isLoggedIn.value = false
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  return {
    userInfo,
    isLoggedIn,
    menuItems,
    fetchUserInfo,
    logout,
  }
})

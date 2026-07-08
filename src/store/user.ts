import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMe, type UserInfo } from '@/api/auth'

interface MenuItem {
  path: string
  title: string
  icon: string
  permission?: string
  children?: MenuItem[]
}

// 完整菜单配置，包含所需权限
const ALL_MENU_ITEMS: MenuItem[] = [
  {
    path: '/overview',
    title: '数据概览',
    icon: 'DataAnalysis',
    permission: 'overview_view',
    children: [
      { path: '/overview', title: '数据概览', icon: 'DataAnalysis', permission: 'overview_view' },
      { path: '/overview/directory', title: '数据目录', icon: 'List', permission: 'overview_view' },
      { path: '/overview/volume-grade', title: '数量分级', icon: 'TrendCharts', permission: 'overview_view' },
    ],
  },
  {
    path: '/assets',
    title: '资产管理',
    icon: 'Monitor',
    permission: 'asset_view',
    children: [
      { path: '/assets', title: '资产列表', icon: 'Monitor', permission: 'asset_view' },
      { path: '/assets/scan', title: '自动扫描', icon: 'Search', permission: 'scan_execute' },
    ],
  },
  {
    path: '/classification/tasks',
    title: '分类分级',
    icon: 'Finished',
    permission: 'task_view',
    children: [
      { path: '/classification/tasks', title: '分类任务', icon: 'Finished', permission: 'task_view' },
      { path: '/classification/templates', title: '分类模板', icon: 'FolderOpened', permission: 'template_view' },
      { path: '/classification/levels', title: '数据分级', icon: 'Rank', permission: 'classification_view' },
      { path: '/classification/masking', title: '脱敏方式', icon: 'Hide', permission: 'classification_view' },
      { path: '/classification/encryption', title: '加密方式', icon: 'Lock', permission: 'classification_view' },
    ],
  },
  {
    path: '/reports',
    title: '报告中心',
    icon: 'Document',
    permission: 'report_view',
  },
  {
    path: '/audit',
    title: '审计日志',
    icon: 'List',
    permission: 'log_view',
  },
  {
    path: '/system/users',
    title: '系统管理',
    icon: 'Tools',
    permission: 'user_view',
    children: [
      { path: '/system/users', title: '用户管理', icon: 'User', permission: 'user_view' },
      { path: '/system/roles', title: '角色管理', icon: 'Key', permission: 'role_view' },
      { path: '/system/monitor', title: '性能监控', icon: 'DataBoard', permission: 'monitor_view' },
      { path: '/system/settings', title: '系统设置', icon: 'Tools', permission: 'setting_view' },
    ],
  },
]

function filterMenu(items: MenuItem[], permissions: Record<string, boolean>): MenuItem[] {
  return items
    .filter(item => !item.permission || permissions[item.permission])
    .map(item => {
      if (item.children) {
        const filteredChildren = filterMenu(item.children, permissions)
        // 如果子项全部被过滤掉，且父项本身没有专属权限（仅作为分组），则也隐藏父项
        if (filteredChildren.length === 0 && item.permission) {
          return null
        }
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter((item): item is MenuItem => item !== null)
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const isLoggedIn = ref(false)

  // 根据用户权限动态计算的菜单
  const menuItems = computed<MenuItem[]>(() => {
    if (!userInfo.value?.permissions) return []
    // ADMIN 角色拥有所有权限
    if (userInfo.value.role_code === 'ADMIN') return ALL_MENU_ITEMS
    return filterMenu(ALL_MENU_ITEMS, userInfo.value.permissions)
  })

  // 权限检查辅助函数
  function hasPermission(perm: string): boolean {
    return !!userInfo.value?.permissions?.[perm]
  }

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
    hasPermission,
    fetchUserInfo,
    logout,
  }
})

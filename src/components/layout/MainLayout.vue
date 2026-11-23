<template>
  <div class="app-shell">
    <!-- Top Navigation Bar -->
    <header class="app-header">
      <div class="header-left">
        <button
          class="sidebar-toggle"
          :title="isCollapse ? '展开菜单' : '收起菜单'"
          @click="toggleCollapse"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line v-if="!isCollapse" x1="3" y1="6" x2="21" y2="6" />
            <line v-if="!isCollapse" x1="3" y1="12" x2="21" y2="12" />
            <line v-if="!isCollapse" x1="3" y1="18" x2="21" y2="18" />
            <line v-if="isCollapse" x1="9" y1="6" x2="3" y2="12" />
            <line v-if="isCollapse" x1="9" y1="18" x2="3" y2="12" />
            <line v-if="isCollapse" x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>
        <div class="brand">
          <div class="brand-icon">
            <img v-if="customLogoUrl" :src="customLogoUrl" class="brand-logo-img" />
            <svg v-else width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="9" fill="var(--color-primary-500)" />
              <path d="M10 12l8-5 8 5v11l-8 5-8-5V12z" fill="#fff" opacity="0.92" />
              <circle cx="18" cy="18" r="3.5" fill="var(--color-primary-500)" />
            </svg>
          </div>
          <span class="brand-name">{{ systemName }}</span>
          <span v-if="appVersion" class="app-version">{{ appVersion }}</span>
        </div>
      </div>

      <div class="header-right">
        <div class="header-breadcrumb">
          <span class="breadcrumb-current">{{ pageTitle }}</span>
        </div>
        <div class="header-actions">
          <el-popover
            v-if="canViewAudit"
            v-model:visible="notifyVisible"
            placement="bottom-end"
            :width="360"
            trigger="click"
            popper-class="notify-popper"
          >
            <template #reference>
              <!-- 外层 span 作为 popover 的点击触发元素；tooltip 只包按钮负责悬浮提示 -->
              <span class="notify-ref">
                <el-tooltip content="通知中心" placement="bottom">
                  <button class="header-action-btn notify-btn" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    <span v-if="unreadCount > 0" class="notify-badge">
                      {{ unreadCount > 99 ? '99+' : unreadCount }}
                    </span>
                  </button>
                </el-tooltip>
              </span>
            </template>

            <div class="notify-panel">
              <div class="notify-header">
                <span class="notify-title">通知中心</span>
                <div class="notify-header-actions">
                  <el-button v-if="unreadCount > 0" link type="primary" size="small" @click="handleAckAll">
                    全部已读
                  </el-button>
                </div>
              </div>

              <!-- 类型标签页：点分类只看该类通知 -->
              <div class="notify-tabs">
                <span
                  v-for="tab in notifyTabs"
                  :key="tab.key"
                  class="notify-tab"
                  :class="{ active: notifyTypeFilter === tab.key }"
                  @click="notifyTypeFilter = tab.key"
                >
                  {{ tab.label }}
                  <span v-if="tab.count" class="notify-tab-count">{{ tab.count }}</span>
                </span>
              </div>

              <div v-if="filteredNotifyItems.length === 0" class="notify-empty">
                暂无通知消息
              </div>

              <div v-else class="notify-list">
                <div
                  v-for="item in filteredNotifyItems"
                  :key="item.id"
                  class="notify-item"
                  @click="handleNotifyClick(item)"
                >
                  <span class="notify-level" :class="`level-${item.level || 'warning'}`"></span>
                  <div class="notify-body">
                    <div class="notify-item-title">{{ item.title }}</div>
                    <div class="notify-item-msg">{{ item.message }}</div>
                    <div class="notify-item-time">{{ formatNotifyTime(item.created_at) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-popover>

          <el-tooltip content="文档下载" placement="bottom">
            <button class="header-action-btn" @click="showDocsDialog = true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="9 13 12 11 15 13" />
              </svg>
            </button>
          </el-tooltip>

          <el-dropdown trigger="click" @command="handleCommand" size="small">
            <span class="user-avatar-btn">
              <span class="user-avatar">{{ displayName.charAt(0).toUpperCase() }}</span>
              <span class="user-name">{{ displayName }}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <div class="app-body">
      <!-- Sidebar -->
      <aside class="app-sidebar" :class="{ collapsed: isCollapse }">
        <nav class="sidebar-nav">
          <template v-for="item in userStore.menuItems" :key="item.path">
            <div v-if="item.children" class="nav-group">
              <div v-if="!isCollapse" class="nav-group-title">{{ item.title }}</div>
              <router-link
                v-for="child in item.children"
                :key="child.path"
                :to="child.path"
                class="nav-item"
                :class="{ active: route.path === child.path }"
                :title="isCollapse ? child.title : ''"
              >
                <span class="nav-icon" v-html="iconSvg(child.icon)" />
                <transition name="fade">
                  <span v-if="!isCollapse" class="nav-label">{{ child.title }}</span>
                </transition>
              </router-link>
            </div>
            <router-link
              v-else
              :to="item.path"
              class="nav-item"
              :class="{ active: route.path.startsWith(item.path) }"
              :title="isCollapse ? item.title : ''"
            >
              <span class="nav-icon" v-html="iconSvg(item.icon)" />
              <transition name="fade">
                <span v-if="!isCollapse" class="nav-label">{{ item.title }}</span>
              </transition>
            </router-link>
          </template>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>

  <!-- 文档下载弹窗 -->
  <el-dialog
    v-model="showDocsDialog"
    title="文档下载"
    width="500px"
    :close-on-click-modal="false"
    @open="loadDocs"
  >
    <div v-if="docLoading" class="docs-loading">
      <span class="docs-loading-text">加载中...</span>
    </div>
    <div v-else-if="docList.length === 0" class="docs-empty">
      暂无可用文档
    </div>
    <div v-else class="docs-list">
      <div
        v-for="doc in docList"
        :key="doc.name"
        class="docs-item"
      >
        <div class="docs-item-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div class="docs-item-info">
          <div class="docs-item-name">{{ doc.name }}</div>
          <div class="docs-item-meta">{{ doc.size }}</div>
        </div>
        <button class="docs-download-btn" @click="handleDownload(doc.name)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          下载
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getBranding } from '@/api/system'
import { getDocs, downloadDoc, type DocItem } from '@/api/system'
import { getAppVersion } from '@/api/system'
import { getUnreadAlerts, acknowledgeAllAlerts } from '@/api/audit'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const customLogoUrl = ref('')
const systemName = ref('MDCGS')
const appVersion = ref('')

const showDocsDialog = ref(false)
const docList = ref<DocItem[]>([])
const docLoading = ref(false)

// 右上角通知中心
// 目前只有「审计告警」一种来源，结构与类型已按多来源设计，
// 后续接入报告生成通知/任务完成通知时，只需在 NOTIFY_TYPES 增加一项并在 fetchNotifications 里补充数据源。
type NotifyType = 'audit_alert' | 'report' | 'task'

interface NotifyItem {
  id: number | string
  type: NotifyType
  title: string
  message: string
  level: string
  created_at: string
}

const NOTIFY_TYPES: { key: NotifyType; label: string }[] = [
  { key: 'audit_alert', label: '审计告警' },
  // { key: 'report', label: '报告生成' },   // 后续接入
  // { key: 'task', label: '任务完成' },     // 后续接入
]

const notifyVisible = ref(false)
const unreadCount = ref(0)
const notifyItems = ref<NotifyItem[]>([])
const notifyTypeFilter = ref<NotifyType | 'all'>('all')
let notifyTimer: number | null = null

// ADMIN 角色 permissions 为 {"*": true}，需单独放行
const canViewAudit = computed(() =>
  userStore.userInfo?.role_code === 'ADMIN' || userStore.hasPermission('log_view')
)

// 顶部类型标签（带各类型未读数）
const notifyTabs = computed<{ key: NotifyType | 'all'; label: string; count: number }[]>(() => {
  const tabs: { key: NotifyType | 'all'; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: notifyItems.value.length },
  ]
  for (const t of NOTIFY_TYPES) {
    tabs.push({
      key: t.key,
      label: t.label,
      count: notifyItems.value.filter(i => i.type === t.key).length,
    })
  }
  return tabs
})

const filteredNotifyItems = computed(() =>
  notifyTypeFilter.value === 'all'
    ? notifyItems.value
    : notifyItems.value.filter(i => i.type === notifyTypeFilter.value)
)

/** 审计告警数据源（后续可在此聚合其他来源） */
async function fetchNotifications() {
  if (!canViewAudit.value) return
  try {
    const res = await getUnreadAlerts(20) as any
    if (res.code === 0) {
      unreadCount.value = res.data?.unread || 0
      notifyItems.value = (res.data?.items || []).map((a: any) => ({
        id: `audit_${a.id}`,
        type: 'audit_alert' as const,
        title: a.rule_name || '审计告警',
        message: a.message,
        level: a.alert_level || 'warning',
        created_at: a.created_at,
      }))
    }
  } catch {
    // 通知拉取失败不影响主流程
  }
}

async function handleAckAll() {
  try {
    const res = await acknowledgeAllAlerts() as any
    if (res.code === 0) {
      ElMessage.success(res.message || '已全部确认')
      fetchNotifications()
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

function goToAuditAlerts(alertId?: number | string) {
  notifyVisible.value = false
  const query: Record<string, string> = { alerts: '1' }
  if (alertId !== undefined && alertId !== null) query.alert_id = String(alertId)
  router.push({ path: '/audit', query })
}

/** 点击某条通知：跳到对应页面并定位到该条记录 */
function handleNotifyClick(item: NotifyItem) {
  if (item.type === 'audit_alert') {
    // 审计告警：跳到审计日志页并打开告警弹窗，自动定位到这条告警
    goToAuditAlerts(String(item.id).replace('audit_', ''))
    return
  }
  // 后续其它类型在此扩展跳转目标
  notifyVisible.value = false
}

function formatNotifyTime(v?: string | null): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const displayName = computed(() =>
  userStore.userInfo?.real_name || userStore.userInfo?.username || '用户'
)

const pageTitle = computed(() => String(route.meta?.title || ''))

function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

async function loadDocs() {
  docLoading.value = true
  try {
    const res = await getDocs() as any
    docList.value = res.data || []
  } catch {
    docList.value = []
  } finally {
    docLoading.value = false
  }
}

async function handleDownload(filename: string) {
  try {
    const res = await downloadDoc(filename) as any
    const blob = res.data || res
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败')
  }
}

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '确认', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        userStore.logout()
        router.push('/login')
      })
      .catch(() => {})
  }
}

function iconSvg(icon: string): string {
  const icons: Record<string, string> = {
    DataAnalysis:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/><path d="M2 20h20"/></svg>',
    List: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    Collection:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    Monitor:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    Search:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    Finished:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    FolderOpened:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><path d="M2 7h20"/></svg>',
    Rank: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="14" width="4" height="6"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>',
    Setting:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    Hide: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    Lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    Document:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    Tools:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    User: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    Key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    CircleCheck:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    DataBoard:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M15 21V9"/></svg>',
    Database:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    TrendCharts:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  }
  return icons[icon] || ''
}

onMounted(() => {
  if (!userStore.userInfo) {
    userStore.fetchUserInfo().catch(() => router.push('/login'))
  }
  // 获取自定义Logo
  ;(getBranding() as any).then((res: any) => {
    if (res.data?.logo_url) {
      customLogoUrl.value = res.data.logo_url
    }
    if (res.data?.system_name) {
      systemName.value = res.data.system_name
    }
  }).catch(() => {})
  // 获取后端版本号（取不到则不显示）
  ;(getAppVersion() as any).then((res: any) => {
    const version = res?.data?.version
    if (version) {
      const text = String(version)
      appVersion.value = text.startsWith('v') ? text : `v${text}`
    }
  }).catch(() => {})
  // 通知中心：登录后立即拉一次，之后每 60 秒刷新
  if (canViewAudit.value) fetchNotifications()
  notifyTimer = window.setInterval(() => {
    // 首屏时用户信息可能还没回来，拿到权限后再开始拉取
    if (canViewAudit.value) fetchNotifications()
  }, 60000)
})

// userInfo 是异步加载的：Mounted 时通常还没拿到，权限到位后补拉一次，避免通知中心一直空着
watch(canViewAudit, (ok) => {
  if (ok && notifyItems.value.length === 0) fetchNotifications()
})

// 打开面板时主动刷新，保证点开就看到最新
watch(notifyVisible, (open) => {
  if (open) fetchNotifications()
})

onUnmounted(() => {
  if (notifyTimer) {
    clearInterval(notifyTimer)
    notifyTimer = null
  }
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-surface-subtle);
}

/* ─── Header ─── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 var(--spacing-16);
  background: var(--color-surface-white);
  border-bottom: 1px solid var(--color-border-default);
  z-index: 100;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

.brand-name {
  font-size: var(--font-size-16);
  font-weight: var(--font-weight-700);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-tight);
}

.brand-icon {
  display: flex;
  align-items: center;
}

.brand-logo-img {
  height: 32px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.brand-name {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-18);
  font-weight: var(--font-weight-700);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-tight);
}

/* 版本号（后端 /api/v1/health 返回） */
.app-version {
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-500);
  color: var(--color-text-tertiary);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-tag);
  padding: 1px 6px;
  line-height: 18px;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-16);
}

.header-breadcrumb {
  font-size: var(--font-size-14);
  color: var(--color-text-tertiary);
}

.breadcrumb-current {
  font-weight: var(--font-weight-500);
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.header-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.header-action-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}

/* ─── 通知中心 ─── */
.notify-ref {
  display: inline-flex;
  align-items: center;
}

.notify-btn {
  position: relative;
}

.notify-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--el-color-danger);
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}

.notify-panel {
  margin: -12px;
}

.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border-light, #ebeef5);
}

.notify-title {
  font-weight: 600;
  font-size: 14px;
}

.notify-header-actions {
  display: flex;
  gap: 12px;
}

.notify-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

/* ─── 通知类型标签 ─── */
.notify-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border-light, #ebeef5);
}

.notify-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.notify-tab:hover {
  background: var(--color-surface-muted);
}

.notify-tab.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.notify-tab-count {
  min-width: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--el-color-danger);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}

.notify-list {
  max-height: 360px;
  overflow-y: auto;
}

.notify-item {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-light, #f2f3f5);
}

.notify-item:hover {
  background: var(--color-surface-muted);
}

.notify-level {
  flex: none;
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--el-color-info);
}

.notify-level.level-warning {
  background: var(--el-color-warning);
}

.notify-level.level-critical {
  background: var(--el-color-danger);
}

.notify-body {
  flex: 1;
  min-width: 0;
}

.notify-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.notify-item-msg {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-item-time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

/* ─── User Avatar ─── */
.user-avatar-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  padding: 4px 10px 4px 4px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.user-avatar-btn:hover {
  background: var(--color-surface-muted);
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-400));
  color: var(--color-text-inverse);
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-600);
}

.user-name {
  font-size: var(--font-size-14);
  font-weight: var(--font-weight-500);
  color: var(--color-text-primary);
}

/* ─── Body ─── */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ─── Sidebar ─── */
.app-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface-white);
  border-right: 1px solid var(--color-border-default);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-base);
  overflow: hidden;
}

.app-sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-8) 0;
}

.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: var(--radius-full);
}

/* ─── Nav Group ─── */
.nav-group {
  margin-bottom: var(--spacing-4);
}

.nav-group-title {
  font-size: 11px;
  font-weight: var(--font-weight-600);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: var(--spacing-12) var(--spacing-16) var(--spacing-6);
}

/* ─── Nav Item ─── */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  padding: 9px var(--spacing-16);
  margin: 1px var(--spacing-8);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-14);
  font-weight: var(--font-weight-500);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}

.nav-item.active,
.nav-item.router-link-exact-active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--spacing-8) - 1px);
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary-500);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.8;
}

.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-item:hover .nav-icon {
  opacity: 1;
}

.nav-label {
  line-height: 1;
}

/* ─── Content ─── */
.app-content {
  flex: 1;
  overflow-y: auto;
  background: var(--color-surface-subtle);
}

.app-content > .page-shell:first-child {
  padding-top: var(--spacing-24);
}

/* ─── 文档下载弹窗 ─── */
.docs-loading {
  text-align: center;
  padding: 40px 0;
}

.docs-loading-text {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-14);
}

.docs-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-14);
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  max-height: 400px;
  overflow-y: auto;
}

.docs-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
  padding: var(--spacing-12) var(--spacing-12);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  transition: background var(--transition-fast);
}

.docs-item:hover {
  background: var(--color-surface-hover);
}

.docs-item-icon {
  flex-shrink: 0;
  color: var(--color-primary-500);
  display: flex;
  align-items: center;
}

.docs-item-info {
  flex: 1;
  min-width: 0;
}

.docs-item-name {
  font-size: var(--font-size-14);
  font-weight: var(--font-weight-500);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-item-meta {
  font-size: var(--font-size-12);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.docs-download-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid var(--color-primary-300);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-radius: var(--radius-md);
  font-size: var(--font-size-13);
  font-weight: var(--font-weight-500);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.docs-download-btn:hover {
  background: var(--color-primary-500);
  color: #fff;
  border-color: var(--color-primary-500);
}
</style>

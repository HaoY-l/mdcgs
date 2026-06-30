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
          <span class="brand-name">MDCGS</span>
        </div>
      </div>

      <div class="header-right">
        <div class="header-breadcrumb">
          <span class="breadcrumb-current">{{ pageTitle }}</span>
        </div>
        <div class="header-actions">
          <el-tooltip content="通知" placement="bottom">
            <button class="header-action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
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
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox } from 'element-plus'
import { getSettings } from '@/api/system'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const customLogoUrl = ref('')

const displayName = computed(() =>
  userStore.userInfo?.real_name || userStore.userInfo?.username || '用户'
)

const pageTitle = computed(() => String(route.meta?.title || ''))

function toggleCollapse() {
  isCollapse.value = !isCollapse.value
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
  }
  return icons[icon] || ''
}

onMounted(() => {
  if (!userStore.userInfo) {
    userStore.fetchUserInfo().catch(() => router.push('/login'))
  }
  // 获取自定义Logo
  ;(getSettings() as any).then((res: any) => {
    if (res.basic?.logo_url) {
      customLogoUrl.value = res.basic.logo_url
    }
  }).catch(() => {})
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
  gap: var(--spacing-10);
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
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 9px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.brand-name {
  font-size: var(--font-size-18);
  font-weight: var(--font-weight-700);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-tight);
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
</style>

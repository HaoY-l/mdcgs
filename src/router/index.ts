import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginPage.vue'),
    meta: { title: '登录', noAuth: true },
  },
  {
    path: '/force-change-password',
    name: 'ForceChangePassword',
    component: () => import('@/views/system/ForceChangePassword.vue'),
    meta: { title: '修改密码', noAuth: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/overview',
    children: [
      {
        path: 'overview',
        name: 'Overview',
        component: () => import('@/views/overview/OverviewPage.vue'),
        meta: { title: '数据概览', icon: 'DataAnalysis' },
      },
      {
        path: 'overview/directory',
        name: 'DataDirectory',
        component: () => import('@/views/overview/DataDirectoryPage.vue'),
        meta: { title: '数据目录', icon: 'List' },
      },
      {
        path: 'assets',
        name: 'AssetList',
        component: () => import('@/views/assets/AssetListPage.vue'),
        meta: { title: '资产列表', icon: 'Monitor' },
      },
      {
        path: 'assets/:id',
        name: 'AssetDetail',
        component: () => import('@/views/assets/AssetDetailPage.vue'),
        meta: { title: '资产详情', icon: 'Monitor' },
      },
      {
        path: 'assets/scan',
        name: 'ScanTask',
        component: () => import('@/views/assets/ScanTaskPage.vue'),
        meta: { title: '自动扫描', icon: 'Search' },
      },
      {
        path: 'classification/tasks',
        name: 'ClassifyTasks',
        component: () => import('@/views/classification/TaskListPage.vue'),
        meta: { title: '分类任务', icon: 'Finished' },
      },
      {
        path: 'classification/tasks/create',
        name: 'TaskCreate',
        component: () => import('@/views/classification/TaskCreatePage.vue'),
        meta: { title: '新建任务' },
      },
      {
        path: 'classification/tasks/:id/edit',
        name: 'TaskEdit',
        component: () => import('@/views/classification/TaskEditPage.vue'),
        meta: { title: '编辑任务' },
      },
      {
        path: 'classification/tasks/:id',
        name: 'TaskDetail',
        component: () => import('@/views/classification/TaskDetailPage.vue'),
        meta: { title: '任务详情', icon: 'Finished' },
      },
      {
        path: 'classification/templates',
        name: 'ClassifyTemplates',
        component: () => import('@/views/classification/TemplateListPage.vue'),
        meta: { title: '分类模板', icon: 'FolderOpened' },
      },
      {
        path: 'classification/templates/:id',
        name: 'TemplateDetail',
        component: () => import('@/views/classification/TemplateDetailPage.vue'),
        meta: { title: '模板详情', icon: 'FolderOpened' },
      },
      {
        path: 'classification/levels',
        name: 'DataLevels',
        component: () => import('@/views/classification/DataLevelPage.vue'),
        meta: { title: '数据分级', icon: 'Rank' },
      },
      {
        path: 'classification/masking',
        name: 'MaskingRules',
        component: () => import('@/views/classification/MaskingRulePage.vue'),
        meta: { title: '脱敏方式', icon: 'Hide' },
      },
      {
        path: 'classification/encryption',
        name: 'EncryptionTypes',
        component: () => import('@/views/classification/EncryptionPage.vue'),
        meta: { title: '加密方式', icon: 'Lock' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/ReportPage.vue'),
        meta: { title: '报告中心', icon: 'Document' },
      },
      {
        path: 'audit',
        name: 'AuditLog',
        component: () => import('@/views/audit/AuditLogPage.vue'),
        meta: { title: '审计日志', icon: 'List' },
      },
      {
        path: 'system/users',
        name: 'UserManage',
        component: () => import('@/views/system/UserManagePage.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'system/authorizations',
        name: 'Authorization',
        component: () => import('@/views/system/AuthorizationPage.vue'),
        meta: { title: '授权验证', icon: 'Key' },
      },
      {
        path: 'system/audit-approvals',
        name: 'AuditApproval',
        component: () => import('@/views/system/AuditApprovalPage.vue'),
        meta: { title: '申请审核', icon: 'CircleCheck' },
      },
      {
        path: 'system/monitor',
        name: 'SystemMonitor',
        component: () => import('@/views/system/SystemMonitorPage.vue'),
        meta: { title: '性能监控', icon: 'DataBoard' },
      },
      {
        path: 'system/settings',
        name: 'SystemSettings',
        component: () => import('@/views/system/SystemSettingsPage.vue'),
        meta: { title: '系统设置', icon: 'Tools' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.noAuth) {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router

<template>
  <PageShell title="分类任务" description="管理数据库资产和文件资产的分类分级任务">
    <template #header-actions>
      <!-- 通用：搜索 / 状态 / 执行方式 / 刷新 / 新建 -->
      <el-input v-model="commonSearch" placeholder="搜索任务名称" clearable size="small" style="width: 200px" @clear="handleSearch" @keyup.enter="handleSearch" />
      <el-select v-model="commonStatus" placeholder="状态" clearable size="small" style="width: 130px" @change="handleSearch">
        <el-option label="待处理" value="pending" />
        <el-option label="排队中" value="queued" />
        <el-option label="执行中" value="running" />
        <el-option label="已完成" value="completed" />
        <el-option label="已停止" value="stopped" />
        <el-option label="失败" value="failed" />
      </el-select>
      <el-select v-model="commonExecuteType" placeholder="执行方式" clearable size="small" style="width: 130px" @change="handleSearch">
        <el-option label="手动执行" value="manual" />
        <el-option label="周期执行" value="periodic" />
      </el-select>
      <el-button size="small" @click="handleRefresh">刷新</el-button>
      <el-button type="primary" size="small" @click="handleCreate">新建任务</el-button>
    </template>

    <el-tabs v-model="activeTab" type="border-card" class="task-tabs">
      <el-tab-pane label="数据库任务" name="db">
        <TaskListPage
          :search-keyword="commonSearch"
          :filter-status="commonStatus"
          :filter-execute-type="commonExecuteType"
          ref="dbTaskList"
        />
      </el-tab-pane>
      <el-tab-pane label="文件任务" name="file">
        <FileTaskListPage
          :search-keyword="commonSearch"
          :filter-status="commonStatus"
          :filter-execute-type="commonExecuteType"
          ref="fileTaskList"
        />
      </el-tab-pane>
    </el-tabs>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from '@/components/common/PageShell.vue'
import TaskListPage from './TaskListPage.vue'
import FileTaskListPage from '@/views/file-classification/FileTaskListPage.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref<string>('db')

// 通用搜索/状态/执行方式：两个 tab 共享，由 props 传下去
const commonSearch = ref('')
const commonStatus = ref('')
const commonExecuteType = ref('')

// 拿到子组件实例用于触发刷新
const dbTaskList = ref<InstanceType<typeof TaskListPage> | null>(null)
const fileTaskList = ref<InstanceType<typeof FileTaskListPage> | null>(null)

onMounted(() => {
  if (route.query.tab === 'file' || route.path.endsWith('/file-tasks')) {
    activeTab.value = 'file'
  }
})

watch(() => route.path, (p) => {
  if (p.endsWith('/file-tasks')) activeTab.value = 'file'
  else activeTab.value = 'db'
})

function handleSearch() {
  // 触发两边 watch 自动重拉
  commonSearch.value = commonSearch.value
}
function handleRefresh() {
  if (activeTab.value === 'db') {
    dbTaskList.value?.fetchTasks?.()
  } else {
    fileTaskList.value?.fetch?.()
  }
}
function handleCreate() {
  if (activeTab.value === 'file') {
    // 调文件任务的「新建」弹窗
    fileTaskList.value?.goCreate?.()
  } else {
    router.push('/classification/tasks/create')
  }
}
</script>

<style scoped>
.task-tabs { background: #fff; }
</style>

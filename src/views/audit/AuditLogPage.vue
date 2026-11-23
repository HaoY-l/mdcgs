<template>
  <PageShell title="审计日志">
    <template #header-actions>
      <el-button size="small" @click="handleExport">导出日志</el-button>
      <el-button size="small" @click="openSettingsDialog()">保留策略</el-button>
      <el-button size="small" @click="openRuleDialog()">审计规则</el-button>
      <el-button size="small" type="warning" @click="openAlertDialog()">
        告警
        <el-badge :value="alertStats.unconfirmed" :hidden="alertStats.unconfirmed === 0" />
      </el-button>
    </template>

    <!-- 筛选条件（筛选框与按钮同一行） -->
    <el-card shadow="hover" class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <label>关键字</label>
          <el-input
            v-model="filters.keyword"
            placeholder="用户/模块/操作/IP"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            size="default"
          />
        </div>
        <div class="filter-item">
          <label>操作用户</label>
          <el-select
            v-model="filters.username"
            placeholder="全部"
            clearable
            @change="handleSearch"
            size="default"
          >
            <el-option v-for="u in userOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>操作模块</label>
          <el-select
            v-model="filters.module"
            placeholder="全部"
            clearable
            @change="handleSearch"
            size="default"
          >
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>操作类型</label>
          <el-select
            v-model="filters.action"
            placeholder="全部"
            clearable
            @change="handleSearch"
            size="default"
          >
            <el-option label="新增" value="新增" />
            <el-option label="修改" value="修改" />
            <el-option label="删除" value="删除" />
            <el-option label="查询" value="查询" />
            <el-option label="登录" value="登录成功" />
            <el-option label="登出" value="登出" />
            <el-option v-for="a in extraActionOptions" :key="a" :label="a" :value="a" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <el-select
            v-model="filters.status"
            placeholder="全部"
            clearable
            @change="handleSearch"
            size="default"
          >
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
        </div>
        <div class="filter-item filter-item--date">
          <label>时间范围</label>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="~"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
            size="default"
          />
        </div>
        <div class="filter-actions">
          <el-button type="primary" @click="handleSearch" size="default">搜索</el-button>
          <el-button @click="resetFilters" size="default">重置</el-button>
          <el-button @click="refreshStats" size="default">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 概览卡片 -->
    <div class="stat-cards">
      <div class="stat-card" v-for="card in statCards" :key="card.key">
        <div class="stat-card-icon" :style="{ background: card.bg }">
          <span v-html="card.icon"></span>
        </div>
        <div class="stat-card-body">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
          <div class="stat-sub">{{ card.sub }}</div>
        </div>
      </div>
    </div>

    <!-- 统计图表 -->
    <div class="charts-row">
      <el-card shadow="hover">
        <template #header>
          <span>操作模块分布</span>
        </template>
        <div ref="moduleChartRef" class="chart-box"></div>
      </el-card>
      <el-card shadow="hover">
        <template #header>
          <span>操作IP分布 (Top 10)</span>
        </template>
        <div ref="ipChartRef" class="chart-box"></div>
      </el-card>
      <el-card shadow="hover">
        <template #header>
          <span>趋势分析 (7天)</span>
        </template>
        <div ref="trendChartRef" class="chart-box"></div>
      </el-card>
    </div>

    <!-- 从告警跳转过来的定位提示 -->
    <div v-if="locatedLogHint" class="log-locate-bar">
      <span>正在查看告警对应的原始日志（ID: {{ locatedLogHint }}）</span>
      <el-button link type="primary" size="small" @click="clearLogLocate">查看全部日志</el-button>
    </div>

    <!-- 日志列表 -->
    <DataTable :data="logList" :loading="loading" :total="pagination.total" :current-page="pagination.page" :page-size="pagination.pageSize" stripe v-bind="$attrs" @page-change="onPageChange">
      <el-table-column label="时间" min-width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column prop="username" label="用户" min-width="110" />
      <el-table-column prop="module" label="模块" min-width="120" />
      <el-table-column prop="action" label="操作类型" min-width="100" />
      <el-table-column prop="detail" label="操作详情" min-width="200" show-overflow-tooltip />
      <el-table-column prop="ip_address" label="IP地址" min-width="140" />
      <el-table-column label="状态" min-width="80" fixed="right">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="showLogDetail(row as AuditLogItem)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <!-- 导出对话框 -->
    <el-dialog v-model="exportVisible" title="导出日志" width="420px">
      <div style="text-align: center; padding: 20px 0;">
        <el-icon :size="48" color="#67C23A"><SuccessFilled /></el-icon>
        <p style="margin-top: 16px; color: #606266;">
          正在导出 {{ exportCount }} 条记录
        </p>
        <p style="margin-top: 8px; font-size: 13px; color: #909399;">
          CSV 文件将自动下载
        </p>
      </div>
      <template #footer>
        <el-button @click="exportVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 日志详情对话框 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="600px">
      <el-descriptions :column="2" border v-if="currentLog">
        <el-descriptions-item label="ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ currentLog.username }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ currentLog.module }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ currentLog.action }}</el-descriptions-item>
        <el-descriptions-item label="资源类型">{{ currentLog.resource_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="资源ID">{{ currentLog.resource_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ip_address }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLog.status === 1 ? 'success' : 'danger'" size="small">
            {{ currentLog.status === 1 ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="耗时" v-if="currentLog.duration_ms">{{ currentLog.duration_ms }}ms</el-descriptions-item>
        <el-descriptions-item label="请求ID" :span="2">{{ currentLog.request_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="浏览器" :span="2">{{ currentLog.user_agent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ formatTime(currentLog.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="操作详情" :span="2">{{ currentLog.detail }}</el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="currentLog.error_message">
          <span style="color: #F56C6C;">{{ currentLog.error_message }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 保留策略对话框 -->
    <el-dialog v-model="showSettingsDialog" title="日志保留策略" width="500px">
      <el-form :model="retentionSettings" label-width="140px">
        <el-form-item label="日志保留天数">
          <el-input-number v-model="retentionSettings.log_retention_days as any" :min="1" :max="365" />
        </el-form-item>
        <el-form-item label="日志级别">
          <el-select v-model="retentionSettings.log_level" style="width: 100%;">
            <el-option label="Info" value="info" />
            <el-option label="Warning" value="warning" />
            <el-option label="Error" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用审计日志">
          <el-switch v-model="enableAuditLog" />
        </el-form-item>
        <el-divider />
        <el-form-item label="预删除演练">
          <el-button size="small" @click="handleDryRunCleanup">预览待删除日志</el-button>
          <span v-if="cleanupPreview" style="margin-left: 12px; color: #909399;">
            将删除 {{ cleanupPreview.will_delete }} 条日志
          </span>
        </el-form-item>
        <el-form-item>
          <el-button type="danger" size="small" @click="handleCleanup">立即清理过期日志</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSettings">保存设置</el-button>
      </template>
    </el-dialog>

    <!-- 审计规则对话框 -->
    <el-dialog v-model="showRuleDialog" title="审计规则管理" width="900px" class="rule-dialog">
      <!-- 操作栏：新建按钮 + 说明入口 -->
      <div class="rule-toolbar">
        <el-button type="primary" size="small" @click="openRuleForm()">新建规则</el-button>
        <el-button link type="primary" size="small" @click="showRuleHelp = !showRuleHelp">
          {{ showRuleHelp ? '收起说明' : '怎么创建规则？' }}
        </el-button>
        <span class="rule-toolbar-count">共 {{ ruleList.length }} 条规则</span>
      </div>

      <!-- 使用说明（默认展开） -->
      <el-alert v-if="showRuleHelp" type="info" :closable="false" class="rule-help">
        <div class="rule-help-grid">
          <div class="rule-help-item"><b>规则名称</b>必填，如"删除数据资产告警"</div>
          <div class="rule-help-item"><b>适用模块</b>留空 = 全部模块</div>
          <div class="rule-help-item"><b>适用操作</b>留空 = 全部操作</div>
          <div class="rule-help-item"><b>触发条件</b>按操作结果筛选，一般选「任意」</div>
          <div class="rule-help-item"><b>适用资源</b>留空 = 不限资源类型</div>
          <div class="rule-help-item"><b>告警级别</b>只影响颜色，不影响是否触发</div>
        </div>
        <div class="rule-help-example">
          示例：监控"有人删除数据资产" —— 模块选「数据资产」，操作选「删除」，触发条件选「任意」，其余留空。
        </div>
      </el-alert>

      <!-- 规则表单 -->
      <el-card v-if="showRuleForm" shadow="never" class="rule-form-card">
        <template #header>
          <span class="rule-form-title">{{ editingRuleId ? '编辑审计规则' : '新建审计规则' }}</span>
        </template>
        <el-form :model="ruleForm" label-width="92px" class="rule-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="规则名称" required>
                <el-input v-model="ruleForm.name" placeholder="如：删除数据资产告警" maxlength="100" show-word-limit />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="告警级别">
                <el-select v-model="ruleForm.alert_level" style="width: 100%;">
                  <el-option label="信息（仅提示）" value="info" />
                  <el-option label="警告（需关注）" value="warning" />
                  <el-option label="严重（需立即处理）" value="critical" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item>
                <template #label>
                  <span class="label-with-tip">
                    适用模块
                    <el-tooltip content="只监控该模块下的操作，留空则监控所有模块" placement="top">
                      <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <el-select v-model="ruleForm.module" placeholder="留空 = 全部模块" clearable style="width: 100%;">
                  <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item>
                <template #label>
                  <span class="label-with-tip">
                    适用操作
                    <el-tooltip content="只在该操作发生时告警，留空则不限制" placement="top">
                      <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <el-select
                  v-model="ruleForm.action"
                  :placeholder="ruleForm.module ? '留空 = 该模块全部操作' : '留空 = 全部操作'"
                  clearable
                  style="width: 100%;"
                  :disabled="actionOptionsForModule.length === 0"
                >
                  <el-option v-for="a in actionOptionsForModule" :key="a" :label="a" :value="a" />
                </el-select>
                <div v-if="ruleForm.module && actionOptionsForModule.length === 0" class="inline-warn">
                  该模块暂无历史操作记录
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item>
                <template #label>
                  <span class="label-with-tip">
                    触发条件
                    <el-tooltip content="按操作结果筛选，一般选「任意」即可" placement="top">
                      <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <el-select v-model="ruleForm.conditionType" style="width: 100%;">
                  <el-option label="任意（不加限制）" value="any" />
                  <el-option label="仅在操作失败时触发" value="failed" />
                  <el-option label="仅在操作成功时触发" value="success" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item>
                <template #label>
                  <span class="label-with-tip">
                    适用资源
                    <el-tooltip content="只对指定类型的资源告警，留空则不限制" placement="top">
                      <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <el-select
                  v-model="ruleForm.resourceTypes"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  placeholder="留空 = 全部资源"
                  style="width: 100%;"
                >
                  <el-option
                    v-for="rt in resourceTypeOptions"
                    :key="rt.value"
                    :label="rt.label"
                    :value="rt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="规则描述">
            <el-input v-model="ruleForm.description" type="textarea" :rows="2" placeholder="选填：说明这条规则用来做什么" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <span class="label-with-tip">
                触发后通知到
                <el-tooltip content="选择告警对象（人员/Webhook）。当前仅 Webhook 会真正推送，人员对象用于后续扩展" placement="top">
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-select
              v-model="ruleForm.notifyTargetIds"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="留空 = 只记录站内通知，不推送"
              style="width: 100%;"
            >
              <el-option-group label="人员">
                <el-option
                  v-for="t in personTargetOptions"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-option-group>
              <el-option-group label="Webhook">
                <el-option
                  v-for="t in webhookTargetOptions"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-option-group>
            </el-select>
            <div v-if="notifyTargetOptions.length === 0" class="inline-warn">
              还没有告警对象，请到「系统设置 → 联系人/组」添加
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="handleCreateRule">{{ editingRuleId ? '保存' : '创建' }}</el-button>
            <el-button size="small" @click="cancelRuleForm">取消</el-button>
            <el-button size="small" :loading="previewLoading" @click="handlePreviewRule">试算</el-button>
          </el-form-item>
        </el-form>

        <!-- 试算结果 -->
        <el-alert
          v-if="rulePreview"
          :type="rulePreview.matched > 0 ? 'success' : 'warning'"
          :closable="false"
          class="rule-preview"
        >
          <template #title>{{ rulePreview.message }}</template>
          <div v-if="rulePreview.samples?.length" class="rule-preview-samples">
            <div class="rule-preview-samples-title">最近命中的日志：</div>
            <div v-for="s in rulePreview.samples" :key="s.id" class="rule-preview-sample">
              {{ formatTime(s.created_at) }} · {{ s.module }} / {{ s.action }} · {{ s.username }} ·
              <span :class="s.status === 1 ? 'ok' : 'fail'">{{ s.status === 1 ? '成功' : '失败' }}</span>
            </div>
          </div>
          <div v-if="rulePreview.matched === 0" class="rule-preview-tip">
            建议：放宽"适用模块"或"适用操作"，或把触发条件改为「任意」。
          </div>
        </el-alert>
      </el-card>

      <!-- 规则列表 -->
      <div class="rule-list-header">
        <span class="rule-list-title">已配置规则</span>
      </div>
      <el-table
        :data="ruleList"
        stripe
        class="rule-table"
        empty-text="暂无规则，点击上方「新建规则」添加"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 600 }"
      >
        <el-table-column prop="name" label="规则名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="rule-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="模块" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ 'rule-any': !row.module }">{{ row.module || '全部' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ 'rule-any': !row.action }">{{ row.action || '全部' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="触发条件" min-width="150" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'rule-any': conditionLabel(row.condition) === '任意' }">
              {{ conditionLabel(row.condition) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="告警级别" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.alert_level === 'critical' ? 'danger' : row.alert_level === 'warning' ? 'warning' : 'info'" size="small">
              {{ levelLabel(row.alert_level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small" effect="plain">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openRuleForm(row as AuditRule)">编辑</el-button>
            <el-button link type="primary" size="small" @click="handleToggleRule(row as AuditRule)">
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDeleteRule(row as AuditRule)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="showRuleDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 告警对话框 -->
    <el-dialog
      :model-value="showAlertDialog"
      title="审计告警"
      width="940px"
      class="alert-dialog"
      @update:model-value="(v: boolean) => (v ? (showAlertDialog = true) : closeAlertDialog())"
    >
      <!-- 从通知中心定位单条告警时的提示条 -->
      <div v-if="alertFilters.alert_id" class="alert-locate-bar">
        <span>正在查看通知中的那条告警（ID: {{ alertFilters.alert_id }}）</span>
        <el-button link type="primary" size="small" @click="clearAlertLocate">查看全部待处理</el-button>
      </div>

      <!-- 概览卡片（点击切换筛选） -->
      <div class="alert-stats">
        <div
          class="alert-stat"
          :class="{ 'is-active': alertFilters.status === 'unconfirmed' }"
          @click="filterAlertByStatus('unconfirmed')"
        >
          <div class="alert-stat-value warn">{{ alertStats.unconfirmed }}</div>
          <div class="alert-stat-label">待处理</div>
        </div>
        <div class="alert-stat" :class="{ 'is-active': alertFilters.status === 'ack' }" @click="filterAlertByStatus('ack')">
          <div class="alert-stat-value success">{{ alertStats.acknowledged }}</div>
          <div class="alert-stat-label">已确认</div>
        </div>
        <div class="alert-stat" :class="{ 'is-active': !alertFilters.status }" @click="filterAlertByStatus('')">
          <div class="alert-stat-value">{{ alertStats.total }}</div>
          <div class="alert-stat-label">全部</div>
        </div>
      </div>

      <!-- 筛选条（占满一行） -->
      <div class="alert-toolbar">
        <el-select
          v-model="alertFilters.alert_level"
          placeholder="全部级别"
          clearable
          class="alert-filter-level"
          @change="alertSearch"
        >
          <el-option label="信息" value="info" />
          <el-option label="警告" value="warning" />
          <el-option label="严重" value="critical" />
        </el-select>
        <el-date-picker
          v-model="alertDateRange"
          type="daterange"
          range-separator="~"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="alert-filter-date"
          @change="alertSearch"
        />
        <div class="alert-filter-btns">
          <el-button @click="alertSearch">查询</el-button>
          <el-button @click="resetAlertFilters">重置</el-button>
        </div>
      </div>

      <el-table
        :data="alertList"
        stripe
        class="alert-table"
        empty-text="暂无告警"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 600 }"
      >
        <el-table-column label="时间" width="160" align="center">
          <template #default="{ row }">
            <span class="alert-time">{{ formatTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="级别" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.alert_level === 'critical' ? 'danger' : row.alert_level === 'warning' ? 'warning' : 'info'" size="small">
              {{ levelLabel(row.alert_level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="规则" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="alert-rule">{{ row.rule_name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="消息" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.message }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.push_errors && row.push_errors.length"
              :content="row.push_errors.join('；')"
              placement="top"
            >
              <el-tag type="danger" size="small" effect="plain">推送失败</el-tag>
            </el-tooltip>
            <el-tag
              v-else
              :type="row.status === 'ack' ? 'success' : row.status === 'sent' ? 'primary' : 'warning'"
              size="small"
              effect="plain"
            >
              {{ alertStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-tooltip content="查看触发该告警的原始日志" placement="top">
              <el-button
                v-if="row.log_id"
                link
                type="primary"
                size="small"
                @click="viewAlertSourceLog(row as AuditAlert)"
              >
                原始日志
              </el-button>
            </el-tooltip>
            <el-button link type="primary" size="small" v-if="row.status !== 'ack'" @click="handleAckAlert(row as AuditAlert)">
              确认
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 批量操作 + 分页 -->
      <div class="alert-footer-bar">
        <div class="alert-footer-left">
          <el-button
            type="primary"
            size="small"
            :disabled="alertStats.unconfirmed === 0"
            @click="handleAckAllInDialog"
          >
            确认全部待处理
          </el-button>
        </div>
        <el-pagination
          v-model:current-page="alertPagination.page"
          v-model:page-size="alertPagination.pageSize"
          :total="alertPagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
          @size-change="alertSearch"
          @current-change="fetchAlerts"
        />
      </div>

      <div class="alert-footer-tip">
        说明：告警「确认」表示已处理；「待处理」包含尚未确认的全部告警（无论 Webhook 是否已推送）。
      </div>

      <template #footer>
        <el-button @click="closeAlertDialog">关闭</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { SuccessFilled, QuestionFilled } from '@element-plus/icons-vue'
import {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogTrend,
  getAuditLogOptions,
  getAuditLogDetail,
  exportAuditLogs,
  updateAuditLogSettings,
  getRetentionSettings,
  cleanupOldLogs,
  getAuditRules,
  previewAuditRule,
  createAuditRule,
  updateAuditRule,
  deleteAuditRule,
  toggleAuditRule,
  getAuditAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  getAlertStats,
} from '@/api/audit'
import { getNotifyTargetOptions } from '@/api/system'
import type {
  AuditLogItem,
  AuditLogStats,
  AuditTrendData,
  AuditRule,
  AuditAlert,
  AlertStats,
  RetentionSettings,
} from '@/api/audit'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const route = useRoute()
const router = useRouter()
const logList = ref<AuditLogItem[]>([])
const moduleChartRef = ref<HTMLDivElement | null>(null)
const ipChartRef = ref<HTMLDivElement | null>(null)
const trendChartRef = ref<HTMLDivElement | null>(null)
const exportVisible = ref(false)
const exportCount = ref(0)
const detailVisible = ref(false)
const currentLog = ref<AuditLogItem | null>(null)
const showSettingsDialog = ref(false)
const showRuleDialog = ref(false)
const showAlertDialog = ref(false)
const showRuleForm = ref(false)
const editingRuleId = ref<number | null>(null)

const userOptions = ref<string[]>([])
const moduleOptions = ref<string[]>([])
const actionOptions = ref<string[]>([])
const resourceTypeOptionsRaw = ref<string[]>([])
const moduleActionsMap = ref<Record<string, string[]>>({})
const previewLoading = ref(false)
const rulePreview = ref<{ matched: number; days: number; message: string; samples: any[] } | null>(null)
const ruleList = ref<AuditRule[]>([])
const alertList = ref<AuditAlert[]>([])
const alertStats = reactive<AlertStats>({ total: 0, pending: 0, sent: 0, acknowledged: 0, unconfirmed: 0, level_distribution: [] })
const cleanupPreview = ref<{ will_delete: number } | null>(null)

const stats = reactive({ total_logs: 0, today_logs: 0, status_distribution: [] as { name: string; value: number }[] })

const successCount = computed(() => stats.status_distribution.find(s => s.name === '成功')?.value || 0)
const failCount = computed(() => stats.status_distribution.find(s => s.name === '失败')?.value || 0)
const successRate = computed(() => {
  const total = successCount.value + failCount.value
  return total > 0 ? ((successCount.value / total) * 100).toFixed(1) : '-'
})
const failRate = computed(() => {
  const total = successCount.value + failCount.value
  return total > 0 ? ((failCount.value / total) * 100).toFixed(1) : '-'
})

const iconList = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
const iconCalendar = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
const iconCheck = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>'
const iconWarning = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'

const statCards = computed(() => [
  {
    key: 'total', label: '总日志量', value: stats.total_logs,
    icon: iconList, color: '#2563eb', bg: '#eff6ff',
    sub: `保留 ${retentionSettings.log_retention_days || 30} 天`,
  },
  {
    key: 'today', label: '今日日志', value: stats.today_logs,
    icon: iconCalendar, color: '#0ea5e9', bg: '#f0f9ff',
    sub: '今日新增记录',
  },
  {
    key: 'success', label: '成功操作', value: successCount.value,
    icon: iconCheck, color: '#10b981', bg: '#ecfdf5',
    sub: `成功率 ${successRate.value}%`,
  },
  {
    key: 'fail', label: '失败操作', value: failCount.value,
    icon: iconWarning, color: '#ef4444', bg: '#fef2f2',
    sub: `占比 ${failRate.value}%`,
  },
])

const filters = reactive({
  keyword: '',
  username: '',
  module: '',
  action: '',
  status: null as number | null,
})

// 操作类型下拉：仅保留固定项之外的动态项，避免重复
const FIXED_ACTION_OPTIONS = ['新增', '修改', '删除', '查询', '登录成功', '登出']
const extraActionOptions = computed(() =>
  actionOptions.value.filter(a => !FIXED_ACTION_OPTIONS.includes(a))
)

const alertFilters = reactive({
  status: 'unconfirmed',
  alert_level: '',
  alert_id: null as number | null,
})

// 告警弹窗的日期筛选与分页
const alertDateRange = ref<[string, string] | null>(null)
const alertPagination = reactive({ page: 1, pageSize: 20, total: 0 })

// 保留策略：开关用真正的布尔值
const enableAuditLog = ref(true)

const retentionSettings = reactive<RetentionSettings>({
  log_retention_days: '30',
  log_level: 'info',
  enable_audit_log: 'true',
  archive_enabled: 'false',
  archive_before_delete: 'true',
})

const ruleForm = reactive({
  name: '',
  description: '',
  module: '',
  action: '',
  alert_level: 'warning',
  alert_channels: [] as string[],
  conditionType: 'any' as 'any' | 'failed' | 'success',
  resourceTypes: [] as string[],
  notifyTargetIds: [] as number[],
})

// 告警对象选项（来自 系统设置 → 联系人/组）
const notifyTargetOptions = ref<{ id: number; name: string; target_type: string }[]>([])
const personTargetOptions = computed(() => notifyTargetOptions.value.filter(t => t.target_type === 'person'))
const webhookTargetOptions = computed(() => notifyTargetOptions.value.filter(t => t.target_type === 'webhook'))

async function fetchNotifyTargetOptions() {
  try {
    const res = await getNotifyTargetOptions() as any
    if (res.code === 0) {
      notifyTargetOptions.value = res.data || []
    }
  } catch {
    notifyTargetOptions.value = []
  }
}

// 选了模块时，"适用操作"只列该模块真实出现过的操作；未选模块时列出全部
const actionOptionsForModule = computed(() => {
  const m = ruleForm.module
  if (!m) return actionOptions.value
  return moduleActionsMap.value[m] || []
})

const showRuleHelp = ref(true)

// 资源类型显示名（后端存英文标识，界面展示中文）
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  DataAsset: '数据资产',
  ClassificationTask: '分类任务',
  ClassificationResult: '分类结果',
  ApiKey: 'API密钥',
  OpenApiEndpoint: '开放接口',
  RiskAssessment: '风险评估',
  SysOperationLog: '审计日志',
  SysSettings: '系统设置',
  SysAuditAlert: '审计告警',
  SysAuditRule: '审计规则',
  TaskReport: '任务报告',
  FileAsset: '文件资产',
  FileSensitiveResult: '文件分类结果',
  Backup: '系统备份',
  SysAuthorization: '授权码',
  SubTableGroup: '分表组合',
}
const resourceTypeOptions = computed(() =>
  resourceTypeOptionsRaw.value.map(v => ({ value: v, label: RESOURCE_TYPE_LABELS[v] || v }))
)

function levelLabel(level?: string): string {
  return ({ info: '信息', warning: '警告', critical: '严重' } as Record<string, string>)[level || ''] || (level || '-')
}

/** 把后端存储的 condition JSON 转成界面可读文字 */
function conditionLabel(condition: any): string {
  if (!condition) return '任意'
  let c = condition
  if (typeof c === 'string') {
    try { c = JSON.parse(c) } catch { return '任意' }
  }
  const parts: string[] = []
  if (c?.status === 'failed') parts.push('失败时')
  else if (c?.status === 'success') parts.push('成功时')
  if (Array.isArray(c?.resource_types) && c.resource_types.length) {
    parts.push(c.resource_types.map((r: string) => RESOURCE_TYPE_LABELS[r] || r).join('/'))
  }
  return parts.length ? parts.join(' + ') : '任意'
}

const dateRange = ref<[string, string] | null>(null)

// 已生效的筛选条件：只有点击"搜索"、选择筛选、重置时才更新。
// 列表查询和导出都只读这里，保证"看到的 = 导出的"。
const appliedFilters = reactive({
  keyword: '',
  username: '',
  module: '',
  action: '',
  status: null as number | null,
  date_from: null as string | null,
  date_to: null as string | null,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 从告警跳转过来时用 ID 精确定位某条日志（仅生效一次，查询后自动清除）
const locateLogId = ref<number | null>(null)
// 定位提示条：记住本次定位的日志ID，直到用户主动取消
const locatedLogHint = ref<number | null>(null)

function clearLogLocate() {
  locatedLogHint.value = null
  locateLogId.value = null
  fetchLogs()
}

onMounted(() => {
  fetchLogs()
  fetchStats()
  fetchTrend()
  fetchRetentionSettings()
  fetchAlertStats()
  fetchOptions()
  fetchNotifyTargetOptions()
  // 从通知中心跳转过来时：打开告警弹窗（读完即清除 URL 参数）
  consumeAlertQuery()
})

// 已经在审计页时再点通知：query 变化也要响应
watch(() => route.query.alerts, () => consumeAlertQuery())

function onPageChange({ page, pageSize: ps }: { page: number; pageSize: number }) {
  pagination.page = page
  pagination.pageSize = ps
  fetchLogs()
}

/** 全量筛选选项（用户/模块/操作类型/资源类型），不依赖当前页数据 */
async function fetchOptions() {
  try {
    const res = await getAuditLogOptions() as any
    if (res.code === 0) {
      userOptions.value = res.data?.users || []
      moduleOptions.value = res.data?.modules || []
      actionOptions.value = res.data?.actions || []
      resourceTypeOptionsRaw.value = res.data?.resource_types || []
      moduleActionsMap.value = res.data?.module_actions || {}
    }
  } catch (err) {
    console.error('获取筛选选项失败', err)
  }
}

/** ISO 时间格式化为 YYYY-MM-DD HH:mm:ss */
function formatTime(v?: string | null): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 把当前筛选框的值固化为"已生效条件"，列表与导出共用 */
function syncAppliedFilters() {
  appliedFilters.keyword = filters.keyword
  appliedFilters.username = filters.username
  appliedFilters.module = filters.module
  appliedFilters.action = filters.action
  appliedFilters.status = filters.status
  appliedFilters.date_from = dateRange.value ? dateRange.value[0] : null
  appliedFilters.date_to = dateRange.value ? dateRange.value[1] : null
}

/** 点击"搜索"：重置到第一页并应用当前筛选（列表、统计口径同步） */
function handleSearch() {
  pagination.page = 1
  syncAppliedFilters()
  fetchLogs()
  fetchStats()
}

async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      page_size: pagination.pageSize,
      sort_by: 'created_at',
      order: 'desc',
    }
    if (appliedFilters.keyword) params.keyword = appliedFilters.keyword
    if (appliedFilters.username) params.username = appliedFilters.username
    if (appliedFilters.module) params.module = appliedFilters.module
    if (appliedFilters.action) params.action = appliedFilters.action
    if (appliedFilters.status !== null) params.status = appliedFilters.status
    if (appliedFilters.date_from) {
      params.date_from = appliedFilters.date_from
      params.date_to = appliedFilters.date_to
    }
    if (locateLogId.value) params.log_id = locateLogId.value

    const res = await getAuditLogs(params) as any
    if (res.code === 0) {
      logList.value = res.data?.items || []
      pagination.total = res.data?.total || 0
      locateLogId.value = null
    } else {
      ElMessage.error(res.message || '获取日志列表失败')
    }
  } catch (err) {
    ElMessage.error('获取日志列表失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.username = ''
  filters.module = ''
  filters.action = ''
  filters.status = null
  dateRange.value = null
  pagination.page = 1
  syncAppliedFilters()
  fetchLogs()
  fetchStats()
}

async function showLogDetail(log: AuditLogItem) {
  currentLog.value = log
  detailVisible.value = true
  // 列表里已带全字段，仍按需拉一次详情，保证看到的是最新数据
  try {
    const res = await getAuditLogDetail(log.id) as any
    if (res.code === 0 && res.data) {
      currentLog.value = res.data
    }
  } catch (err) {
    console.error('获取日志详情失败', err)
  }
}

// 统计图表
let moduleChartInstance: echarts.ECharts | null = null
let ipChartInstance: echarts.ECharts | null = null
let trendChartInstance: echarts.ECharts | null = null

async function fetchStats() {
  try {
    // 统计与列表使用同一套"已生效条件"，避免图表和列表口径不一致
    const params: Record<string, any> = {}
    if (appliedFilters.date_from) {
      params.date_from = appliedFilters.date_from
      params.date_to = appliedFilters.date_to
    }
    const res = await getAuditLogStats(params) as any
    if (res.code === 0) {
      const data: AuditLogStats = res.data
      stats.total_logs = data.total_logs || 0
      stats.today_logs = data.today_logs || 0
      stats.status_distribution = data.status_distribution || []
      await nextTick()
      renderModuleChart(data.module_distribution || [])
      renderIpChart(data.ip_distribution || [])
    }
  } catch (err) {
    console.error('获取统计失败', err)
  }
}

async function fetchTrend() {
  try {
    const res = await getAuditLogTrend({ days: 7 }) as any
    if (res.code === 0) {
      const trend: AuditTrendData = res.data
      await nextTick()
      renderTrendChart(trend.daily_trend || [])
    }
  } catch (err) {
    console.error('获取趋势失败', err)
  }
}

function refreshStats() {
  fetchStats()
  fetchTrend()
  ElMessage.success('统计已刷新')
}

function renderModuleChart(data: { name: string; value: number }[]) {
  if (!moduleChartRef.value) return
  if (!moduleChartInstance) {
    moduleChartInstance = echarts.init(moduleChartRef.value)
  }
  // 无右侧图例：文字直接标在扇区外，格式"名称 占比"
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['38%', '62%'],
      center: ['50%', '50%'],
      minAngle: 3,
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true,
        formatter: '{b} {d}%',
        fontSize: 11,
        lineHeight: 16,
        color: '#606266',
      },
      labelLine: {
        show: true,
        length: 10,
        length2: 12,
        smooth: true,
      },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: 'bold' },
      },
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }],
    }],
  }
  moduleChartInstance.setOption(option, true)
  moduleChartInstance.resize()
}

function renderIpChart(data: { name: string; value: number }[]) {
  if (!ipChartRef.value) return
  if (!ipChartInstance) {
    ipChartInstance = echarts.init(ipChartRef.value)
  }
  const names = data.map((d) => d.name)
  const values = data.map((d) => d.value)
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: '操作次数' },
    yAxis: { type: 'category', data: names.length > 0 ? names : ['暂无数据'], axisLabel: { rotate: 0 } },
    series: [{
      type: 'bar',
      data: values.length > 0 ? values : [0],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#409EFF' },
          { offset: 1, color: '#79bbff' },
        ]),
        borderRadius: [0, 4, 4, 0],
      },
      barMaxWidth: 30,
    }],
  }
  ipChartInstance.setOption(option)
  ipChartInstance.resize()
}

function renderTrendChart(data: { date: string; count: number }[]) {
  if (!trendChartRef.value) return
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value)
  }
  const dates = data.map((d) => d.date)
  const counts = data.map((d) => d.count)
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 0 } },
    yAxis: { type: 'value', name: '操作次数' },
    series: [{
      type: 'line',
      data: counts,
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
        ]),
      },
      lineStyle: { color: '#409EFF', width: 2 },
      itemStyle: { color: '#409EFF' },
    }],
  }
  trendChartInstance.setOption(option)
  trendChartInstance.resize()
}

// 窗口变化时重绘
let resizeTimer: number | null = null

function handleWindowResize() {
  if (resizeTimer) window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    moduleChartInstance?.resize()
    ipChartInstance?.resize()
    trendChartInstance?.resize()
  }, 120)
}

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  if (resizeTimer) window.clearTimeout(resizeTimer)
  moduleChartInstance?.dispose()
  ipChartInstance?.dispose()
  trendChartInstance?.dispose()
  moduleChartInstance = null
  ipChartInstance = null
  trendChartInstance = null
})

// 导出
async function handleExport() {
  try {
    // 只导出"已生效"的筛选条件（即列表当前展示的结果），与筛选框里未提交的输入无关
    const params: Record<string, any> = {}
    if (appliedFilters.keyword) params.keyword = appliedFilters.keyword
    if (appliedFilters.username) params.username = appliedFilters.username
    if (appliedFilters.module) params.module = appliedFilters.module
    if (appliedFilters.action) params.action = appliedFilters.action
    if (appliedFilters.status !== null) params.status = appliedFilters.status
    if (appliedFilters.date_from) {
      params.date_from = appliedFilters.date_from
      params.date_to = appliedFilters.date_to
    }

    const res: any = await exportAuditLogs(params)
    const blob: Blob = res.data instanceof Blob ? res.data : new Blob([res.data])
    const disposition = res.headers?.['content-disposition'] || ''
    const match = /filename="?([^";]+)"?/.exec(disposition)
    const fileName = match ? match[1] : `audit_logs_${Date.now()}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportCount.value = pagination.total
    exportVisible.value = true
    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error('导出日志失败')
  }
}

// 保留设置
async function fetchRetentionSettings() {
  try {
    const res = await getRetentionSettings() as any
    if (res.code === 0) {
      Object.assign(retentionSettings, res.data)
      enableAuditLog.value = String(res.data.enable_audit_log).toLowerCase() === 'true'
    }
  } catch (err) {
    console.error('获取保留设置失败', err)
  }
}

async function handleSaveSettings() {
  try {
    const res = await updateAuditLogSettings({
      log_retention_days: parseInt(retentionSettings.log_retention_days),
      log_level: retentionSettings.log_level,
      enable_audit_log: enableAuditLog.value,
    }) as any
    if (res.code === 0) {
      ElMessage.success('设置已保存')
      showSettingsDialog.value = false
      fetchStats()
    }
  } catch (err) {
    ElMessage.error('保存设置失败')
  }
}

async function handleDryRunCleanup() {
  try {
    // 预览使用表单里当前的保留天数，不必先保存
    const days = parseInt(String(retentionSettings.log_retention_days))
    const res = await cleanupOldLogs(true, Number.isNaN(days) ? undefined : days) as any
    if (res.code === 0) {
      cleanupPreview.value = res.data
      if (!res.data?.will_delete) {
        ElMessage.info(`按保留 ${res.data?.retention_days} 天计算，没有需要删除的日志`)
      }
    }
  } catch (err) {
    ElMessage.error('预览失败')
  }
}

async function handleCleanup() {
  try {
    // 实际清理同样按表单里的天数执行，避免"预览 30 天、实际删 25 天"的不一致
    const days = parseInt(String(retentionSettings.log_retention_days))
    const daysText = Number.isNaN(days) ? '' : `（保留 ${days} 天）`
    await ElMessageBox.confirm(
      `确定要清理${daysText}的过期日志吗？此操作不可恢复。`,
      '警告',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
    )
    const res = await cleanupOldLogs(false, Number.isNaN(days) ? undefined : days) as any
    if (res.code === 0) {
      ElMessage.success(`已删除 ${res.data.deleted} 条过期日志`)
      cleanupPreview.value = null
      fetchLogs()
      fetchStats()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('清理失败')
    }
  }
}

// 审计规则
async function fetchRules() {
  try {
    const res = await getAuditRules() as any
    if (res.code === 0) {
      ruleList.value = res.data?.items || []
    }
  } catch (err) {
    console.error('获取规则失败', err)
  }
}

/** 把 condition JSON 解析回表单的下拉选中项 */
function parseCondition(condition: any): { conditionType: 'any' | 'failed' | 'success'; resourceTypes: string[] } {
  let c = condition
  if (typeof c === 'string') {
    try { c = JSON.parse(c) } catch { c = {} }
  }
  c = c || {}
  const conditionType = c.status === 'failed' ? 'failed' : c.status === 'success' ? 'success' : 'any'
  const resourceTypes = Array.isArray(c.resource_types) ? [...c.resource_types] : []
  return { conditionType, resourceTypes }
}

function openRuleForm(rule?: AuditRule) {
  rulePreview.value = null
  if (rule) {
    const parsed = parseCondition(rule.condition)
    editingRuleId.value = rule.id
    Object.assign(ruleForm, {
      name: rule.name || '',
      description: rule.description || '',
      module: rule.module || '',
      action: rule.action || '',
      alert_level: rule.alert_level || 'warning',
      alert_channels: Array.isArray(rule.alert_channels) ? [...rule.alert_channels] : [],
      conditionType: parsed.conditionType,
      resourceTypes: parsed.resourceTypes,
      notifyTargetIds: Array.isArray(rule.notify_target_ids) ? [...rule.notify_target_ids] : [],
    })
  } else {
    editingRuleId.value = null
    Object.assign(ruleForm, {
      name: '', description: '', module: '', action: '',
      alert_level: 'warning', alert_channels: [],
      conditionType: 'any', resourceTypes: [],
      notifyTargetIds: [],
    })
  }
  showRuleForm.value = true
}

function cancelRuleForm() {
  showRuleForm.value = false
  editingRuleId.value = null
  rulePreview.value = null
}

/** 试算：用当前填写条件统计最近 7 天会命中多少条历史日志 */
async function handlePreviewRule() {
  previewLoading.value = true
  try {
    const params: Record<string, any> = { days: 7 }
    if (ruleForm.module) params.module = ruleForm.module
    if (ruleForm.action) params.action = ruleForm.action
    if (ruleForm.conditionType !== 'any') params.status = ruleForm.conditionType
    const res = await previewAuditRule(params) as any
    if (res.code === 0) {
      rulePreview.value = res.data
    }
  } catch (err) {
    ElMessage.error('试算失败')
  } finally {
    previewLoading.value = false
  }
}

async function handleCreateRule() {
  if (!ruleForm.name.trim()) {
    ElMessage.error('请填写规则名称')
    return
  }
  try {
    // 由下拉选项组装成后端认识的 condition JSON
    const condition: Record<string, any> = {}
    if (ruleForm.conditionType !== 'any') condition.status = ruleForm.conditionType
    if (ruleForm.resourceTypes.length) condition.resource_types = ruleForm.resourceTypes

    const payload = {
      name: ruleForm.name.trim(),
      description: ruleForm.description,
      module: ruleForm.module || null,
      action: ruleForm.action || null,
      alert_level: ruleForm.alert_level,
      alert_channels: ruleForm.alert_channels,
      notify_target_ids: ruleForm.notifyTargetIds,
      condition,
    }
    const res = editingRuleId.value
      ? await updateAuditRule(editingRuleId.value, payload) as any
      : await createAuditRule(payload) as any
    if (res.code === 0) {
      ElMessage.success(editingRuleId.value ? '规则已更新' : '规则创建成功')
      cancelRuleForm()
      fetchRules()
    }
  } catch (err) {
    ElMessage.error(editingRuleId.value ? '更新规则失败' : '创建规则失败')
  }
}

async function handleToggleRule(rule: AuditRule) {
  try {
    const res = await toggleAuditRule(rule.id) as any
    if (res.code === 0) {
      ElMessage.success(`规则已${res.data.enabled ? '启用' : '禁用'}`)
      fetchRules()
    }
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

async function handleDeleteRule(rule: AuditRule) {
  try {
    await ElMessageBox.confirm(`确定要删除规则"${rule.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await deleteAuditRule(rule.id) as any
    if (res.code === 0) {
      ElMessage.success('规则已删除')
      fetchRules()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 告警
async function fetchAlertStats() {
  try {
    const res = await getAlertStats() as any
    if (res.code === 0) {
      Object.assign(alertStats, res.data)
    }
  } catch (err) {
    console.error('获取告警统计失败', err)
  }
}

async function fetchAlerts() {
  try {
    const params: Record<string, any> = {
      page: alertPagination.page,
      page_size: alertPagination.pageSize,
    }
    if (alertFilters.status) params.status = alertFilters.status
    if (alertFilters.alert_level) params.alert_level = alertFilters.alert_level
    if (alertFilters.alert_id) params.alert_id = alertFilters.alert_id
    if (alertDateRange.value) {
      params.date_from = alertDateRange.value[0]
      params.date_to = alertDateRange.value[1]
    }
    const res = await getAuditAlerts(params) as any
    if (res.code === 0) {
      alertList.value = res.data?.items || []
      alertPagination.total = res.data?.total || 0
    }
  } catch (err) {
    console.error('获取告警列表失败', err)
  }
}

/** 条件变化后回到第一页再查询 */
function alertSearch() {
  alertPagination.page = 1
  fetchAlerts()
}

function resetAlertFilters() {
  alertFilters.status = 'unconfirmed'
  alertFilters.alert_level = ''
  alertFilters.alert_id = null
  alertDateRange.value = null
  alertPagination.page = 1
  fetchAlerts()
}

/** 读取并消费 URL 上的告警跳转参数：读完立即从地址栏清除，避免刷新重复弹窗 */
function consumeAlertQuery() {
  if (route.query.alerts !== '1') return

  const aid = Number(route.query.alert_id)
  if (!Number.isNaN(aid) && aid > 0) {
    // 精确定位某一条：不加状态筛选，避免该告警恰好已被确认而查不到
    alertFilters.alert_id = aid
    alertFilters.status = ''
  } else {
    alertFilters.status = 'unconfirmed'
    alertFilters.alert_id = null
  }
  alertFilters.alert_level = ''
  alertDateRange.value = null
  alertPagination.page = 1
  showAlertDialog.value = true

  // 打开弹窗后必须主动拉数据（弹窗的 v-model 变化不会自动触发查询）
  fetchAlerts()
  fetchAlertStats()

  // 清除查询参数，避免刷新页面时重复弹出
  const q = { ...route.query }
  delete q.alerts
  delete q.alert_id
  router.replace({ path: route.path, query: q })
}

/** 关闭告警弹窗，并复位定位/筛选状态 */
function closeAlertDialog() {
  showAlertDialog.value = false
  alertFilters.alert_id = null
  alertFilters.status = 'unconfirmed'
  alertFilters.alert_level = ''
  alertDateRange.value = null
  alertPagination.page = 1
  alertPagination.total = 0
  alertList.value = []
}

/** 打开「保留策略」弹窗：先拉最新设置 */
function openSettingsDialog() {
  showSettingsDialog.value = true
  fetchRetentionSettings()
}

/** 打开「审计规则」弹窗：拉规则列表 + 通知对象选项 */
function openRuleDialog() {
  showRuleDialog.value = true
  fetchRules()
  fetchNotifyTargetOptions()
}

/** 打开告警弹窗：默认只看待处理 */
function openAlertDialog() {
  alertFilters.alert_id = null
  alertFilters.alert_level = ''
  alertDateRange.value = null
  alertFilters.status = 'unconfirmed'
  alertPagination.page = 1
  showAlertDialog.value = true
  fetchAlerts()
  fetchAlertStats()
}

/** 清除"定位单条"状态，回到正常列表 */
function clearAlertLocate() {
  alertFilters.alert_id = null
  alertFilters.status = 'unconfirmed'
  alertPagination.page = 1
  fetchAlerts()
}

/** 概览卡片点击 = 按状态筛选（再点一次取消） */
function filterAlertByStatus(status: string) {
  alertFilters.alert_id = null
  alertFilters.status = alertFilters.status === status ? '' : status
  alertPagination.page = 1
  fetchAlerts()
}


function alertStatusLabel(status?: string): string {
  return ({ pending: '待处理', sent: '已发送', ack: '已确认' } as Record<string, string>)[status || ''] || (status || '-')
}

/** 弹窗内的一键确认全部待处理告警 */
async function handleAckAllInDialog() {
  try {
    await ElMessageBox.confirm('确定将全部待处理告警标记为已确认吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await acknowledgeAllAlerts() as any
    if (res.code === 0) {
      ElMessage.success(res.message || '已全部确认')
      fetchAlerts()
      fetchAlertStats()
    }
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('操作失败')
  }
}

// 兜底：任何途径打开这些弹窗都会加载数据（避免入口遗漏导致列表空白）
watch(showRuleDialog, (open) => {
  if (open) {
    fetchRules()
    fetchNotifyTargetOptions()
  }
})

watch(showSettingsDialog, (open) => {
  if (open) fetchRetentionSettings()
})

/** 从告警跳到触发它的原始日志 */
function viewAlertSourceLog(alert: AuditAlert) {
  // 复用统一的关闭逻辑，顺带复位弹窗状态
  closeAlertDialog()
  // 清空筛选，用 log_id 精确定位，避免被生效中的筛选条件挡住
  filters.keyword = ''
  filters.username = ''
  filters.module = ''
  filters.action = ''
  filters.status = null
  dateRange.value = null
  Object.assign(appliedFilters, {
    keyword: '', username: '', module: '', action: '',
    status: null, date_from: null, date_to: null,
  })
  locateLogId.value = alert.log_id || null
  locatedLogHint.value = alert.log_id || null
  pagination.page = 1
  fetchLogs()
}

async function handleAckAlert(alert: AuditAlert) {
  try {
    const res = await acknowledgeAlert(alert.id) as any
    if (res.code === 0) {
      ElMessage.success('告警已确认')
      fetchAlerts()
      fetchAlertStats()
    }
  } catch (err) {
    ElMessage.error('操作失败')
  }
}
</script>

<style scoped>
/* ─── 筛选区（单行：筛选 + 按钮） ─── */
.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.filter-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 10px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1 1 0;
}

.filter-item label {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  line-height: 1;
}

.filter-item :deep(.el-input),
.filter-item :deep(.el-select),
.filter-item :deep(.el-date-editor) {
  width: 100% !important;
}

/* 时间范围需要更多空间 */
.filter-item--date {
  flex: 1.7 1 0;
}

.filter-actions {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}

.filter-actions :deep(.el-button) {
  padding-left: 12px;
  padding-right: 12px;
}

/* ─── 规则弹窗 ─── */
.rule-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rule-toolbar-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.rule-help {
  margin-bottom: 16px;
}

.rule-help-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 24px;
  font-size: 13px;
  line-height: 1.8;
}

.rule-help-item b {
  margin-right: 6px;
  color: var(--color-text-primary);
}

.rule-help-example {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--el-color-info-light-5, #dcdfe6);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.rule-form-card {
  margin-bottom: 16px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
}

.rule-form-card :deep(.el-card__header) {
  padding: 10px 16px;
  background: var(--color-surface-muted);
}

.rule-form-title {
  font-size: 14px;
  font-weight: 600;
}

.rule-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tip-icon {
  color: var(--color-text-tertiary);
  cursor: help;
  font-size: 14px;
}

.tip-icon:hover {
  color: var(--el-color-primary);
}

.rule-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.rule-list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.rule-table {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
}

.rule-name {
  font-weight: 500;
}

.rule-any {
  color: var(--color-text-tertiary);
}

.inline-warn {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-color-warning);
}

.rule-preview {
  margin-top: 4px;
}

.rule-preview-samples {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.rule-preview-samples-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.rule-preview-sample {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-preview-sample .ok {
  color: var(--el-color-success);
}

.rule-preview-sample .fail {
  color: var(--el-color-danger);
}

.rule-preview-tip {
  margin-top: 8px;
  font-size: 12px;
}

/* ─── 告警弹窗 ─── */
.alert-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.alert-stat {
  padding: 12px 16px;
  text-align: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-surface-white);
}

.alert-stat:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: var(--shadow-elevated);
}

.alert-stat.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.alert-stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}

.alert-stat-value.warn {
  color: var(--el-color-warning);
}

.alert-stat-value.primary {
  color: var(--el-color-primary);
}

.alert-stat-value.success {
  color: var(--el-color-success);
}

.alert-stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.alert-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 12px;
}

.alert-toolbar :deep(.el-date-editor) {
  width: 100% !important;
}

.alert-toolbar :deep(.el-select) {
  width: 100%;
}

.alert-toolbar-right {
  margin-left: auto;
}

.alert-table {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
}

.alert-rule {
  font-weight: 500;
}

.alert-footer-tip {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-tertiary);
}

.alert-locate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
}

/* 窄屏允许折行，避免控件被压得过窄 */
@media (max-width: 1240px) {
  .filter-row {
    flex-wrap: wrap;
  }

  .filter-item {
    flex: 1 1 180px;
  }

  .filter-item--date {
    flex: 1 1 240px;
  }

  .filter-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
  }
}

/* ─── 概览卡片 ─── */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-card);
  transition: all var(--transition-base);
}

.stat-card:hover {
  box-shadow: var(--shadow-elevated);
  border-color: var(--color-border-hover);
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-card-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.stat-card-body {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.stat-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── 图表 ─── */
.charts-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.chart-box {
  height: 260px;
}

/* ─── 响应式 ─── */
@media (max-width: 1240px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .stat-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .filter-item {
    flex: 1 1 140px;
  }
}

.log-locate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
}

.alert-time {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.alert-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.alert-filter-level {
  flex: 0 0 140px;
}

.alert-filter-date {
  flex: 1 1 auto;
  min-width: 240px;
  max-width: 100%;
}

.alert-filter-btns {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}
</style>

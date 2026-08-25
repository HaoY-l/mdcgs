<template>
  <div class="page-container">
    <div class="page-header"><h2>系统设置</h2></div>
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <!-- 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <el-form label-width="160px" v-loading="basicLoading">
            <el-form-item label="自定义LOGO">
              <div class="logo-preview-wrapper" v-if="currentLogoUrl">
                <img :src="currentLogoUrl" class="logo-preview-img" />
                <span class="logo-preview-tip">当前LOGO</span>
              </div>
              <el-upload ref="uploadRef" action="#" :auto-upload="false" :on-change="handleLogoChange">
                <el-button size="small">选择文件</el-button>
              </el-upload>
              <el-button v-if="logoFile" size="small" type="primary" style="margin-left:12px" @click="submitLogo">上传</el-button>
            </el-form-item>
            <el-form-item label="数据资产更新任务上限">
              <el-input-number v-model="basicForm.asset_task_limit" :min="1" :max="20" />
            </el-form-item>
            <el-form-item label="分类分级任务上限">
              <el-input-number v-model="basicForm.classify_task_limit" :min="1" :max="20" />
            </el-form-item>
            <el-form-item label="数据概览刷新间隔">
              <el-select v-model="basicForm.refresh_interval" style="width: 200px">
                <el-option label="30秒" :value="30" />
                <el-option label="60秒" :value="60" />
                <el-option label="5分钟" :value="300" />
              </el-select>
            </el-form-item>
            <el-form-item><el-button type="primary" @click="saveBasicSettings">保存设置</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全设置 -->
        <el-tab-pane label="安全设置" name="security">
          <el-form label-width="160px" v-loading="securityLoading">
            <el-form-item label="密码最小长度">
              <el-input-number v-model="securityForm.min_length" :min="6" :max="32" />
            </el-form-item>
            <el-form-item label="需大写字母"><el-switch v-model="securityForm.require_uppercase" /></el-form-item>
            <el-form-item label="需小写字母"><el-switch v-model="securityForm.require_lowercase" /></el-form-item>
            <el-form-item label="需数字"><el-switch v-model="securityForm.require_digit" /></el-form-item>
            <el-form-item label="需特殊字符"><el-switch v-model="securityForm.require_special" /></el-form-item>
            <el-form-item label="密码有效期(天)">
              <el-input-number v-model="securityForm.max_age_days" :min="0" :max="365" />
            </el-form-item>
            <el-form-item label="登录失败锁定">
              <el-switch v-model="securityForm.lockout_enabled" />
              <span v-if="securityForm.lockout_enabled" style="margin-left:12px">次数</span>
              <el-input-number v-if="securityForm.lockout_enabled" v-model="securityForm.max_attempts" :min="3" :max="10" style="margin-left:4px" />
            </el-form-item>
            <el-form-item label="会话超时(分钟)">
              <el-input-number v-model="securityForm.timeout_minutes" :min="5" :max="1440" />
            </el-form-item>
            <el-form-item label="IP白名单">
              <el-switch v-model="securityForm.whitelist_enabled" />
            </el-form-item>
            <el-form-item><el-button type="primary" @click="saveSecuritySettings">保存设置</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- LDAP设置 -->
        <el-tab-pane label="LDAP设置" name="ldap">
          <el-form label-width="140px" v-loading="ldapLoading">
            <el-form-item label="启用LDAP登录"><el-switch v-model="ldapForm.enabled" /></el-form-item>
            <el-form-item label="服务器地址"><el-input v-model="ldapForm.host" placeholder="ldap.example.com" /></el-form-item>
            <el-form-item label="端口"><el-input-number v-model="ldapForm.port" :min="1" :max="65535" /></el-form-item>
            <el-form-item label="Base DN"><el-input v-model="ldapForm.base_dn" placeholder="dc=example,dc=com" /></el-form-item>
            <el-form-item label="绑定DN"><el-input v-model="ldapForm.bind_dn" /></el-form-item>
            <el-form-item label="绑定密码"><el-input v-model="ldapForm.bind_password" type="password" show-password /></el-form-item>
            <el-form-item label="用户过滤器"><el-input v-model="ldapForm.user_filter" placeholder="(uid={username})" /></el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveLdapSettings">保存设置</el-button>
              <el-button @click="testLdap" style="margin-left:12px">测试连接</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 开放接口 -->
        <el-tab-pane label="开放接口" name="api">
          <el-form :model="apiForm" style="margin-bottom: 16px">
            <el-form-item label="密钥名称" style="margin-bottom: 0">
              <el-input v-model="apiForm.name" placeholder="输入密钥名称" style="width: 200px" />
              <el-button type="primary" @click="handleCreateApiKey" style="margin-left: 12px">新建密钥</el-button>
            </el-form-item>
          </el-form>
          <el-table :data="apiKeys" stripe v-loading="apiLoading" style="margin-bottom:16px">
            <el-table-column prop="name" label="密钥名称" min-width="120" />
            <el-table-column prop="key_preview" label="密钥预览" min-width="200" />
            <el-table-column prop="created_at" label="创建时间" min-width="160" />
            <el-table-column label="操作" min-width="120">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="handleDeleteApiKey(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- API 文档 -->
          <el-card shadow="hover" style="margin-top: 20px">
            <template #header>
              <span>API 接口文档</span>
            </template>
            <div style="font-size: 13px; line-height: 1.8">
              <p>外部系统可通过以下 API 查询分类分级结果，认证方式为 <code>Authorization: Bearer &lt;API_KEY&gt;</code>。</p>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">1. 健康检查</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 8px">
                <span style="color: #67c23a; font-weight: bold">GET</span> /api/v1/open/v1/health
              </div>
              <p style="color: #909399; font-size: 12px; margin: 0">无需认证，返回服务状态。</p>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">2. 统计概览</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 8px">
                <span style="color: #67c23a; font-weight: bold">GET</span> /api/v1/open/v1/statistics
              </div>
              <p style="color: #909399; font-size: 12px; margin: 0">返回资产总数、总字段数、敏感字段数、各级别分布。</p>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">3. 资产列表</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 8px">
                <span style="color: #67c23a; font-weight: bold">GET</span> /api/v1/open/v1/assets?page=1&page_size=20
              </div>
              <p style="color: #909399; font-size: 12px; margin: 0">
                返回数据资产列表，包含资产名称、类型、地址、业务部门、应用系统、总字段数、敏感字段数。
              </p>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">4. 数据目录查询</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 8px">
                <span style="color: #67c23a; font-weight: bold">GET</span> /api/v1/open/v1/classification-results?page=1&page_size=20
              </div>
              <p style="color: #909399; font-size: 12px; margin: 0">返回数据目录的字段级资产信息（原分类结果查询）。支持筛选参数：</p>
              <ul style="color: #909399; font-size: 12px; margin: 4px 0">
                <li><code>keyword</code> - 关键词搜索（字段名/注释/类型/分类路径/表名/资产名）</li>
                <li><code>level</code> - 分级代码筛选，如 L2</li>
                <li><code>category_path</code> - 分类路径筛选</li>
                <li><code>asset</code> - 资产名称筛选</li>
                <li><code>is_sensitive</code> - 1=敏感字段, 0=非敏感字段</li>
              </ul>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">5. 数据分类模版目录</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 8px">
                <span style="color: #67c23a; font-weight: bold">GET</span> /api/v1/open/v1/templates/{tpl_id}/categories/tree
              </div>
              <p style="color: #909399; font-size: 12px; margin: 0">返回指定模板的分类目录树结构，包含分级信息。</p>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">6. 分级信息</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 8px">
                <span style="color: #67c23a; font-weight: bold">GET</span> /api/v1/open/v1/levels
              </div>
              <p style="color: #909399; font-size: 12px; margin: 0">返回所有数据分级列表，包含级别代码、值、颜色、管控原则、敏感/受限状态等。</p>

              <el-divider />
              <h4 style="margin: 0 0 8px 0">响应格式</h4>
              <div style="background: #f5f7fa; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre; overflow-x: auto">{
  "code": 0,
  "message": "success",
  "data": { ... }
}</div>
              <p style="color: #909399; font-size: 12px; margin: 8px 0 0 0">分页接口返回 <code>data.items</code>、<code>data.total</code>、<code>data.page</code>、<code>data.page_size</code>、<code>data.total_pages</code>。</p>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 数据安全应用 -->
        <el-tab-pane label="数据安全应用" name="apps">
          <el-table :data="dataApps" stripe v-loading="appsLoading" style="margin-bottom:16px">
            <el-table-column prop="name" label="应用名称" min-width="120" />
            <el-table-column prop="app_type" label="类型" min-width="100" />
            <el-table-column prop="endpoint_url" label="接口地址" min-width="200" />
            <el-table-column label="操作" min-width="160">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleTestDataApp(row)">测试</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteDataApp(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-form :model="dataAppForm" label-width="100px">
            <el-form-item label="应用名称"><el-input v-model="dataAppForm.name" placeholder="输入应用名称" /></el-form-item>
            <el-form-item label="应用类型"><el-input v-model="dataAppForm.app_type" placeholder="如: mysql" /></el-form-item>
            <el-form-item label="接口地址"><el-input v-model="dataAppForm.endpoint_url" placeholder="http://..." /></el-form-item>
            <el-form-item><el-button type="primary" @click="handleCreateDataApp">新增对接</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 扫描引擎配置 -->
        <el-tab-pane label="扫描引擎配置" name="engine">
          <el-form label-width="160px" v-loading="engineLoading">
            <el-form-item label="规则引擎并发线程数">
              <el-input-number v-model="engineForm.rule_threads" :min="1" :max="20" />
              <span class="form-item-tip">同时扫描几张表，越大越快但数据库压力也越大</span>
            </el-form-item>
            <el-form-item label="AI分类并发请求数">
              <el-input-number v-model="engineForm.ai_concurrency" :min="1" :max="20" />
              <span class="form-item-tip">同时发几个AI请求，受API限频限制</span>
            </el-form-item>
            <el-form-item label="AI批处理大小">
              <el-input-number v-model="engineForm.ai_batch_size" :min="1" :max="200" />
              <span class="form-item-tip">每个Prompt中包含的字段数</span>
              <el-tooltip content="设置的数量越大，建议同步增加AI模型配置中的超时时间，避免请求超时" placement="top">
                <el-icon style="margin-left: 8px; color: #909399; cursor: help;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-form-item>
            <el-form-item label="规则引擎进度权重">
              <el-input-number v-model="engineForm.progress_weight_rule" :min="10" :max="90" :step="5" />
              <span class="form-item-tip">占总进度的百分比（%），与AI分类权重之和为100</span>
            </el-form-item>
            <el-form-item label="AI分类进度权重">
              <el-input-number v-model="engineForm.progress_weight_ai" :min="10" :max="90" :step="5" />
              <span class="form-item-tip">占总进度的百分比（%），与规则引擎权重之和为100</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="engineSaving" @click="saveEngineSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- AI模型配置 -->
        <el-tab-pane label="AI模型配置" name="ai">
          <div v-loading="aiLoading">
            <!-- 全局AI设置卡片 -->
            <el-card shadow="hover" style="margin-bottom: 16px">
              <template #header>
                <span>AI全局设置</span>
              </template>
              <div class="ai-global-item">
                <div class="ai-toggle-info">
                  <span class="ai-toggle-label">启用AI分类</span>
                  <span class="ai-toggle-desc">开启后，分类任务执行时会对字段进行AI识别；关闭后AI模型配置保留但不会在任务中执行</span>
                </div>
                <el-switch v-model="aiEnabled" @change="handleAiEnabledChange" />
              </div>
              <el-divider style="margin: 12px 0" />
              <div class="ai-global-item">
                <div class="ai-toggle-info">
                  <span class="ai-toggle-label">仅用模版分类数据</span>
                  <span class="ai-toggle-desc">{{ onlyTemplateCategories ? '开启后，AI只能从模板已有的分类中选择，不能超出模板范围' : '关闭后，AI优先匹配模板分类，匹配不到时可根据字段特征自定义分类' }}</span>
                </div>
                <el-switch v-model="onlyTemplateCategories" @change="handleOnlyTemplateChange" />
              </div>
              <el-divider style="margin: 12px 0" />
              <div class="ai-global-item">
                <div class="ai-toggle-info">
                  <span class="ai-toggle-label">AI分类数据来源</span>
                  <span class="ai-toggle-desc">选择哪些信息传递给AI进行分类，取消勾选可避免敏感信息外泄给大模型</span>
                </div>
                <el-checkbox-group v-model="classifySourcesList" @change="handleClassifySourcesChange as any">
                  <el-checkbox value="column_name" label="column_name">字段名</el-checkbox>
                  <el-checkbox value="column_comment" label="column_comment">字段注释</el-checkbox>
                  <el-checkbox value="sample_values" label="sample_values">样本数据</el-checkbox>
                </el-checkbox-group>
              </div>
              <el-divider style="margin: 12px 0" />
              <div class="ai-global-item">
                <div class="ai-toggle-info">
                  <span class="ai-toggle-label">知识库检索</span>
                  <span class="ai-toggle-desc">
                    开启后，AI分类时会检索知识库文档作为参考依据，提高分类准确率
                  </span>
                </div>
                <el-switch v-model="knowledgeBaseEnabled" @change="handleKnowledgeBaseChange" />
              </div>
              <el-alert
                v-if="knowledgeBaseEnabled"
                type="warning"
                :closable="false"
                show-icon
                style="margin-top: 12px"
              >
                <template #title>
                  知识库已启用，任务执行时长可能增加
                </template>
                <template #default>
                  AI分类时需检索知识库文档并生成搜索词，任务总时长可能增加 30-60 秒
                </template>
              </el-alert>
            </el-card>

            <!-- 配置列表 -->
            <el-card shadow="hover" style="margin-bottom: 16px">
              <template #header>
                <div class="ai-config-header">
                  <span>AI模型配置列表</span>
                  <el-button size="small" type="primary" @click="openCreateConfig">新建配置</el-button>
                </div>
              </template>
              <el-table :data="aiConfigs" stripe empty-text="暂无配置">
                <el-table-column prop="config_name" label="名称" min-width="120" />
                <el-table-column prop="model_name" label="模型" min-width="160" />
                <el-table-column prop="api_base" label="API地址" min-width="160" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span>{{ row.api_base || '默认' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="激活状态" width="90" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                      {{ row.is_active ? '已激活' : '未激活' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="220" fixed="right">
                  <template #default="{ row }">
                    <el-button v-if="!row.is_active" link type="primary" size="small" @click="handleActivateConfig(row)">激活</el-button>
                    <el-button link type="primary" size="small" @click="handleEditConfig(row)">编辑</el-button>
                    <el-button link type="primary" size="small" @click="handleTestConfig(row)">测试</el-button>
                    <el-button v-if="!row.is_locked" link type="danger" size="small" @click="handleDeleteConfig(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <!-- 编辑/新建表单 -->
            <el-card v-if="showConfigForm" shadow="hover">
              <template #header>
                <span>{{ isEditingConfig ? '编辑配置' : '新建配置' }}</span>
              </template>
              <el-form :model="configForm" label-width="140px" style="max-width: 800px">
                <el-form-item label="配置名称" required>
                  <el-input v-model="configForm.config_name" placeholder="输入配置名称" />
                </el-form-item>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="Provider">
                      <template #label>
                        <span>Provider</span>
                        <el-tooltip content="模型提供商前缀，参考：openai / deepseek / claude / anthropic / gemini 等。API代理（如 OneAPI）通常填 openai" placement="top">
                          <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </template>
                      <el-input v-model="configForm.provider" placeholder="如 openai" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="模型名称" required>
                      <template #label>
                        <span>模型名称</span>
                        <el-tooltip content="在 AI 服务商后台或代理平台（如 OneAPI）中配置的模型名称，如 gpt-4o / deepseek-chat 等" placement="top">
                          <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </template>
                      <el-input v-model="configForm.model_name" placeholder="如 gpt-4o / deepseek-chat" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="API地址">
                      <template #label>
                        <span>API地址</span>
                        <el-tooltip content="AI服务商的 API 地址。有代理时填代理地址（如 https://your-proxy.com/v1/chat/completions），直连时填服务商地址，留空用 LiteLLM 默认" placement="top">
                          <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </template>
                      <el-input v-model="configForm.api_base" placeholder="留空使用LiteLLM默认" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="API Key">
                  <el-input v-model="configForm.api_key" type="password" show-password :placeholder="isEditingConfig ? '留空不修改' : '输入API Key'" />
                </el-form-item>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="Max Tokens">
                      <template #label>
                        <span>Max Tokens</span>
                        <el-tooltip content="模型每次请求的最大输出 Token 数。0 表示不限制，由模型自行决定输出长度（取决于模型最大上下文）。值越大处理能力越强，但响应时间也越长。当 AI 返回内容为空时，可以尝试增大此值或减少每批处理的字段数量" placement="top">
                          <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </template>
                      <el-input-number v-model="configForm.max_tokens" :min="0" :max="128000" :step="1024" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="温度">
                      <el-input-number v-model="configForm.temperature" :min="0" :max="2" :step="0.1" :precision="1" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Top-P">
                      <el-input-number v-model="configForm.top_p" :min="0" :max="1" :step="0.05" :precision="2" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="超时(秒)">
                      <div style="display: flex; align-items: center; gap: 8px">
                        <el-input-number v-model="configForm.timeout_seconds" :min="10" :max="600" />
                        <el-tooltip content="AI请求超时时间（秒）。批处理数量越大或模型越慢，建议将此值调大，通常50个字段批处理建议≥300秒" placement="top">
                          <el-icon style="color: #909399; cursor: help;"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="批大小">
                      <el-input-number v-model="configForm.batch_size" :min="1" :max="200" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="重试次数">
                      <el-input-number v-model="configForm.max_retries" :min="0" :max="10" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="System Prompt（附加说明）">
                  <template #label>
                    <span>System Prompt（附加说明）</span>
                    <el-tooltip content="不影响输出格式，仅作为额外上下文提供给 AI。系统输出格式已固定写死在后端代码中，此处修改不会影响分类结果格式" placement="top">
                      <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </template>
                  <el-input v-model="configForm.system_prompt" type="textarea" :rows="3" placeholder="（可选）附加说明，不影响输出格式" />
                </el-form-item>
                <el-form-item label="User Prompt（附加说明）">
                  <template #label>
                    <span>User Prompt（附加说明）</span>
                    <el-tooltip content="不影响输出格式，仅作为额外上下文提供给 AI。系统输出格式已固定写死在后端代码中，此处修改不会影响分类结果格式" placement="top">
                      <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </template>
                  <el-input v-model="configForm.user_prompt_template" type="textarea" :rows="3" placeholder="（可选）附加说明，不影响输出格式" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="configSaving" @click="handleSaveConfig">保存</el-button>
                  <el-button :loading="testingConfig" type="success" @click="handleTestFormConfig">联通性测试</el-button>
                  <el-button @click="showConfigForm = false">取消</el-button>
                </el-form-item>
              </el-form>
            </el-card>

            <!-- 知识库管理（全局） -->
            <el-card shadow="hover" style="margin-bottom: 16px">
              <template #header>
                <div class="ai-config-header">
                  <span>知识库管理</span>
                  <div>
                    <el-upload
                      ref="knowledgeUploadRef"
                      action="#"
                      :auto-upload="false"
                      :on-change="handleKnowledgeFileChange"
                      :accept="'.txt,.pdf,.doc,.docx'"
                      :show-file-list="false"
                    >
                      <el-button size="small" type="primary">上传文档</el-button>
                    </el-upload>
                  </div>
                </div>
              </template>
              <div style="color: #909399; font-size: 12px; padding: 0 0 12px 0; border-bottom: 1px solid var(--el-border-color-light); margin-bottom: 12px">
                支持上传 TXT、PDF、Word（.doc/.docx）格式文件。上传后系统自动提取文本、分块并提取关键词，AI分类时将根据字段特征检索匹配的知识块作为参考依据。
              </div>
              <el-table :data="knowledgeList" stripe empty-text="暂无知识库文档" v-loading="knowledgeLoading" style="margin-bottom: 12px" @row-click="handleKnowledgeRowClick">
                <el-table-column prop="title" label="文档标题" min-width="160" />
                <el-table-column prop="file_name" label="文件名" min-width="160" show-overflow-tooltip />
                <el-table-column prop="chunk_count" label="分块数" width="70" align="center" />
                <el-table-column label="命中次数" width="80" align="center">
                  <template #default="{ row }">
                    <el-tag v-if="(row.hit_count || 0) > 0" size="small" type="warning" effect="plain" style="cursor: pointer;" @click.stop="handleKnowledgeRowClick(row)">
                      {{ row.hit_count || 0 }}
                    </el-tag>
                    <span v-else style="color: #c0c4cc; font-size: 12px;">0</span>
                  </template>
                </el-table-column>
                <el-table-column label="最近命中" width="150">
                  <template #default="{ row }">
                    <span v-if="row.last_hit_at" style="font-size: 12px; color: #909399;">{{ formatTime(row.last_hit_at) }}</span>
                    <span v-else style="color: #c0c4cc; font-size: 12px;">-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="上传时间" width="150" />
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click.stop="handleKnowledgeRowClick(row)">查看</el-button>
                    <el-button link type="danger" size="small" @click.stop="handleDeleteKnowledge(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 知识库命中详情弹窗 -->
              <el-dialog v-model="knowledgeHitDialogVisible" :title="`命中详情 - ${knowledgeHitDialogTitle}`" width="80%" top="5vh" @close="knowledgeHitDialogVisible = false">
                <el-table :data="knowledgeHitList" stripe v-loading="knowledgeHitLoading" style="width: 100%">
                  <el-table-column prop="asset_name" label="资产" min-width="120" />
                  <el-table-column prop="database_name" label="库" min-width="120" />
                  <el-table-column prop="table_name" label="表" min-width="120" />
                  <el-table-column prop="column_name" label="字段" min-width="120" />
                  <el-table-column prop="task_id" label="任务ID" width="80" align="center" />
                  <el-table-column label="命中时间" min-width="150">
                    <template #default="{ row }">
                      {{ formatTime(row.hit_at) }}
                    </template>
                  </el-table-column>
                </el-table>
                <div class="pagination-wrapper" v-if="knowledgeHitTotal > 0">
                  <el-pagination
                    v-model:current-page="knowledgeHitPage"
                    :page-size="knowledgeHitPageSize"
                    :total="knowledgeHitTotal"
                    layout="total, prev, pager, next"
                    @current-change="loadKnowledgeHits"
                    small
                  />
                </div>
              </el-dialog>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 插件管理 -->
        <el-tab-pane label="插件管理" name="plugins">
          <div v-loading="pluginsLoading">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 16px"
            >
              <template #title>
                插件说明
              </template>
              <template #default>
                <div style="font-size: 13px; line-height: 1.8">
                  <p>插件是系统的功能扩展单元，例如数据库驱动、数据分析工具等。</p>
                  <p>安装流程：<strong>下载文件 → 上传 → 检测 → 部署</strong></p>
                  <p>请先根据指引从官网下载对应文件，然后上传到系统，检测通过后部署即可生效。</p>
                  <p>这种方式构建 Docker 镜像时无需包含各种驱动，按需安装，减小镜像体积。</p>
                </div>
              </template>
            </el-alert>

            <el-table :data="plugins" stripe empty-text="暂无可用插件">
              <el-table-column prop="display_name" label="插件名称" min-width="140" />
              <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag v-if="row.installed" type="success" size="small">已部署</el-tag>
                  <el-tag v-else-if="row.file_valid" type="warning" size="small">待部署</el-tag>
                  <el-tag v-else-if="row.file_exists" type="info" size="small">待检测</el-tag>
                  <el-tag v-else type="info" size="small" effect="plain">未上传</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="file_size" label="文件大小" width="90" />
              <el-table-column prop="version" label="版本" width="90" />
              <el-table-column label="操作" min-width="340" fixed="right">
                <template #default="{ row }">
                  <div class="plugin-actions">
                    <!-- 下载指引 -->
                    <el-button size="small" link type="primary" @click="handleShowInstructions(row)">指引</el-button>

                    <!-- 未部署状态：上传 + 删除文件 + 检测 + 部署 -->
                    <template v-if="!row.installed">
                      <el-upload
                        ref="pluginUploadRefs"
                        action="#"
                        :auto-upload="false"
                        :show-file-list="false"
                        :on-change="(file) => handlePluginFileChange(row.name, file)"
                      >
                        <el-button
                          size="small"
                          :disabled="uploadingName === row.name"
                          :loading="uploadingName === row.name"
                        >上传</el-button>
                      </el-upload>

                      <el-button
                        v-if="row.file_exists"
                        size="small"
                        type="danger"
                        plain
                        :loading="deletingName === row.name"
                        @click="handleDeletePluginFile(row)"
                      >删除文件</el-button>

                      <el-button
                        v-if="row.file_exists && !row.file_valid"
                        size="small"
                        type="warning"
                        :loading="validatingName === row.name"
                        :disabled="validatingName !== ''"
                        @click="handleValidatePlugin(row)"
                      >检测</el-button>

                      <el-button
                        v-if="row.file_valid"
                        size="small"
                        type="primary"
                        :loading="deployingName === row.name"
                        :disabled="deployingName !== ''"
                        @click="handleDeployPlugin(row)"
                      >部署</el-button>
                    </template>

                    <!-- 已部署状态：已就绪标签 + 重新上传 + 卸载 -->
                    <template v-if="row.installed">
                      <el-tag type="success" size="small" effect="plain">已就绪</el-tag>
                      <el-button
                        size="small"
                        :loading="reUploadingName === row.name"
                        @click="handleReUploadPlugin(row)"
                      >重新上传</el-button>
                      <el-button
                        size="small"
                        type="danger"
                        plain
                        :loading="uninstallingName === row.name"
                        @click="handleUninstallPlugin(row)"
                      >卸载</el-button>
                    </template>

                    <!-- 隐藏文件输入，用于重新上传 -->
                    <input
                      type="file"
                      :ref="(el) => setReUploadInputRef(row.name, el)"
                      style="display:none"
                      @change="(e) => handleReUploadFileChange(row.name, e)"
                    />
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 下载指引弹窗 -->
          <el-dialog v-model="instructionsVisible" :title="`下载指引 - ${instructionsTitle}`" width="580px">
            <div style="line-height: 1.8; font-size: 13px">
              <div v-if="instructionsData.source" style="margin-bottom: 8px">
                <strong>下载来源：</strong>{{ instructionsData.source }}
              </div>
              <div v-if="instructionsData.url" style="margin-bottom: 8px">
                <strong>下载地址：</strong>
                <el-link type="primary" :href="instructionsData.url" target="_blank">{{ instructionsData.url }}</el-link>
              </div>
              <div v-if="instructionsData.file_pattern" style="margin-bottom: 8px">
                <strong>文件命名规则：</strong>
                <code>{{ instructionsData.file_pattern }}</code>
              </div>
              <div v-if="instructionsData.version_required" style="margin-bottom: 8px">
                <strong>版本要求：</strong>{{ instructionsData.version_required }}
              </div>
              <div v-if="instructionsData.notes" style="margin-bottom: 8px">
                <strong>注意事项：</strong>
                <pre style="white-space: pre-wrap; font-size: 12px; background: #f5f7fa; padding: 8px; border-radius: 4px; margin-top: 4px">{{ instructionsData.notes }}</pre>
              </div>
              <el-divider />
              <div style="font-size: 12px; color: #e6a23c">
                ⚠️ 上传后保持原文件名不变，不要重命名，否则检测会失败。
              </div>
            </div>
            <template #footer>
              <el-button @click="instructionsVisible = false">知道了</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <!-- 授权管理 -->
        <el-tab-pane label="授权管理" name="license">
          <div v-loading="licenseLoading">
            <!-- 状态展示 -->
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

            <!-- 激活表单 -->
            <el-form label-width="120px" style="max-width: 600px">
              <el-form-item label="机器码">
                <el-input :value="licenseInfo.machine_code" readonly />
              </el-form-item>
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
                <el-button v-if="licenseInfo.activated" type="danger" @click="handleDeactivateLicense" style="margin-left: 12px">
                  注销授权
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>

  <!-- API Key 显示弹窗 -->
  <el-dialog v-model="showKeyDialog" title="密钥已创建" width="520px" :close-on-click-modal="false">
    <div style="color: #e6a23c; font-size: 13px; margin-bottom: 12px">请立即复制并保存，关闭后将无法再次查看完整密钥</div>
    <el-input
      ref="keyInputRef"
      :model-value="shownKey"
      readonly
      :rows="3"
      type="textarea"
      style="font-family: monospace; font-size: 13px"
      @focus="(e: any) => e.target?.select()"
    />
    <template #footer>
      <el-button type="primary" @click="copyApiKey">复制密钥</el-button>
      <el-button @click="showKeyDialog = false">已保存，关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import {
  getSettings, updateSettings, uploadLogo,
  getLdapSettings, updateLdapSettings, testLdapConnection,
  getPasswordPolicy, updatePasswordPolicy,
  getLoginLockout, updateLoginLockout,
  getSessionTimeout, updateSessionTimeout,
  getIpWhitelist, updateIpWhitelist,
  getApiKeys, createApiKey, deleteApiKey,
  getDataApps, createDataApp, deleteDataApp, testDataAppConnection,
  getLicenseInfo, activateLicense, deactivateLicense,
  getAiSettings, saveAiSettings,
  getAiModelConfigs, createAiModelConfig, updateAiModelConfig,
  deleteAiModelConfig, activateAiModelConfig, testAiModelConfig, testAiModelConnection,
  getAiKnowledge, uploadAiKnowledge, deleteAiKnowledge, getAiKnowledgeHits,
  getPlugins, uploadPlugin, validatePlugin, deployPlugin, uninstallPlugin, deletePluginFile, restartService,
} from '@/api/system'

const activeTab = ref('basic')
const basicLoading = ref(false)
const ldapLoading = ref(false)
const securityLoading = ref(false)
const apiLoading = ref(false)
const appsLoading = ref(false)
const licenseLoading = ref(false)
const activateLoading = ref(false)
const logoFile = ref<File | null>(null)
const uploadRef = ref()
const currentLogoUrl = ref('')

const basicForm = reactive({ asset_task_limit: 5, classify_task_limit: 3, refresh_interval: 60 })

// 安全设置 - 值都是字符串，后端 SysSettings 存字符串
const securityForm = reactive({
  min_length: 8, require_uppercase: true, require_lowercase: true,
  require_digit: true, require_special: false, max_age_days: 90,
  lockout_enabled: true, max_attempts: 5,
  timeout_minutes: 60,
  whitelist_enabled: false,
})

const ldapForm = reactive({ enabled: false, host: '', port: 389, base_dn: '', bind_dn: '', bind_password: '', user_filter: '(uid={username})' })
const apiForm = reactive({ name: '' })
const apiKeys = ref<any[]>([])
const shownKey = ref('')
const showKeyDialog = ref(false)
const keyInputRef = ref()
const dataApps = ref<any[]>([])
const dataAppForm = reactive({ name: '', app_type: '', endpoint_url: '' })

// 扫描引擎配置
const engineLoading = ref(false)
const engineSaving = ref(false)
const engineForm = reactive({
  rule_threads: 1,
  ai_concurrency: 3,
  ai_batch_size: 50,
  progress_weight_rule: 50,
  progress_weight_ai: 50,
})
const licenseInfo = reactive({
  activated: false,
  machine_code: '',
  start_time: null as string | null,
  end_time: null as string | null,
  remaining_days: null as number | null,
  status: '未激活',
})
const licenseKeyForm = reactive({ license_key: '' })

// ===== 插件管理 =====
const plugins = ref<any[]>([])
const pluginsLoading = ref(false)
const uploadingName = ref('')
const validatingName = ref('')
const deployingName = ref('')
const deletingName = ref('')
const uninstallingName = ref('')
const reUploadingName = ref('')
const instructionsVisible = ref(false)
const instructionsTitle = ref('')
const instructionsData = ref<any>({})
const pluginUploadRefs = ref()
const reUploadInputRefs = ref<Record<string, HTMLInputElement>>({})

// ===== 基本设置 =====
async function fetchSettings() {
  basicLoading.value = true
  try {
    const res = await getSettings()
    if (res.data?.basic) {
      Object.assign(basicForm, res.data.basic)
      if (res.data.basic.logo_url) {
        currentLogoUrl.value = res.data.basic.logo_url
      }
    }
  } finally { basicLoading.value = false }
}

async function saveBasicSettings() {
  await updateSettings({ basic: { ...basicForm } })
  ElMessage.success('基本设置已保存')
}

function handleLogoChange(file: any) {
  logoFile.value = file.raw
}

async function submitLogo() {
  if (!logoFile.value) { ElMessage.warning('请先选择文件'); return }
  try {
    const res = await uploadLogo(logoFile.value)
    ElMessage.success('LOGO上传成功')
    logoFile.value = null
    if (res?.data?.url) {
      currentLogoUrl.value = res.data.url
    }
  } catch { ElMessage.error('上传失败') }
}

// ===== LDAP设置 =====
async function fetchLdapSettings() {
  ldapLoading.value = true
  try {
    const res = await getLdapSettings()
    if (res.data) {
      // 后端返回的是字符串 "true"/"false"，需要转成布尔值
      res.data.enabled = res.data.enabled === 'true'
      Object.assign(ldapForm, res.data)
    }
  } finally { ldapLoading.value = false }
}

async function saveLdapSettings() {
  // 布尔值转成字符串提交给后端
  await updateLdapSettings({
    enabled: String(ldapForm.enabled),
    host: ldapForm.host,
    port: ldapForm.port,
    base_dn: ldapForm.base_dn,
    bind_dn: ldapForm.bind_dn,
    bind_password: ldapForm.bind_password,
    user_filter: ldapForm.user_filter,
  })
  ElMessage.success('LDAP设置已保存')
}

async function testLdap() {
  try {
    const res = await testLdapConnection({ host: ldapForm.host, port: ldapForm.port })
    ElMessage.success((res as any)?.message || 'LDAP连接测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
  }
}

// ===== 安全设置 =====
async function loadSecuritySettings() {
  securityLoading.value = true
  try {
    const [pp, lo, st, ip] = await Promise.all([
      getPasswordPolicy(), getLoginLockout(), getSessionTimeout(), getIpWhitelist(),
    ])
    if (pp.data) {
      securityForm.min_length = parseInt(pp.data.min_length || '8')
      securityForm.require_uppercase = pp.data.require_uppercase === 'true'
      securityForm.require_lowercase = pp.data.require_lowercase === 'true'
      securityForm.require_digit = pp.data.require_digit === 'true'
      securityForm.require_special = pp.data.require_special === 'true'
      securityForm.max_age_days = parseInt(pp.data.max_age_days || '90')
    }
    if (lo.data) {
      securityForm.lockout_enabled = lo.data.enabled === 'true'
      securityForm.max_attempts = parseInt(lo.data.max_attempts || '5')
    }
    if (st.data) {
      securityForm.timeout_minutes = parseInt(st.data.timeout_minutes || '60')
    }
    if (ip.data) {
      securityForm.whitelist_enabled = ip.data.enabled === 'true'
    }
  } finally { securityLoading.value = false }
}

async function saveSecuritySettings() {
  await Promise.all([
    updatePasswordPolicy({
      min_length: String(securityForm.min_length),
      require_uppercase: String(securityForm.require_uppercase),
      require_lowercase: String(securityForm.require_lowercase),
      require_digit: String(securityForm.require_digit),
      require_special: String(securityForm.require_special),
      max_age_days: String(securityForm.max_age_days),
    }),
    updateLoginLockout({
      enabled: String(securityForm.lockout_enabled),
      max_attempts: String(securityForm.max_attempts),
    }),
    updateSessionTimeout({
      timeout_minutes: String(securityForm.timeout_minutes),
    }),
    updateIpWhitelist({
      enabled: String(securityForm.whitelist_enabled),
    }),
  ])
  ElMessage.success('安全设置已保存')
}

// ===== 开放接口 =====
async function loadApiKeys() {
  apiLoading.value = true
  try {
    const res = await getApiKeys()
    apiKeys.value = res.data?.items || []
  } finally { apiLoading.value = false }
}

async function handleCreateApiKey() {
  if (!apiForm.name.trim()) { ElMessage.warning('请输入密钥名称'); return }
  try {
    const res = await createApiKey({ name: apiForm.name })
    const key = (res as any).data?.key
    apiForm.name = ''
    loadApiKeys()
    // 显示弹窗，用 textarea 选中后自动复制
    shownKey.value = key
    showKeyDialog.value = true
  } catch { ElMessage.error('创建失败') }
}

async function handleDeleteApiKey(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该API密钥吗？', '提示', { type: 'warning' })
    await deleteApiKey(row.id)
    ElMessage.success('已删除')
    loadApiKeys()
  } catch {}
}

function copyApiKey() {
  const input = keyInputRef.value
  if (input) {
    input.select()
    input.focus()
  }
  try {
    navigator.clipboard.writeText(shownKey.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    document.execCommand('copy')
    ElMessage.success('已复制到剪贴板')
  }
}

// ===== 数据安全应用 =====
async function loadDataApps() {
  appsLoading.value = true
  try {
    const res = await getDataApps()
    dataApps.value = res.data?.items || []
  } finally { appsLoading.value = false }
}

// ===== 扫描引擎配置 =====
async function loadEngineSettings() {
  engineLoading.value = true
  try {
    const res = await getSettings({ category: 'scan_engine' })
    const data = res.data?.scan_engine || {}
    engineForm.rule_threads = parseInt(data.rule_threads || '1')
    engineForm.ai_concurrency = parseInt(data.ai_concurrency || '3')
    engineForm.ai_batch_size = parseInt(data.ai_batch_size || '50')
    engineForm.progress_weight_rule = parseInt(data.progress_weight_rule || '50')
    engineForm.progress_weight_ai = parseInt(data.progress_weight_ai || '50')
  } finally { engineLoading.value = false }
}

async function saveEngineSettings() {
  engineSaving.value = true
  try {
    await updateSettings({ scan_engine: { ...engineForm } })
    ElMessage.success('扫描引擎配置已保存')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '保存失败')
  } finally { engineSaving.value = false }
}

async function handleCreateDataApp() {
  if (!dataAppForm.name.trim()) { ElMessage.warning('请输入应用名称'); return }
  try {
    await createDataApp({ ...dataAppForm })
    ElMessage.success('创建成功')
    dataAppForm.name = ''; dataAppForm.app_type = ''; dataAppForm.endpoint_url = ''
    loadDataApps()
  } catch { ElMessage.error('创建失败') }
}

async function handleDeleteDataApp(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该应用吗？', '提示', { type: 'warning' })
    await deleteDataApp(row.id)
    ElMessage.success('已删除')
    loadDataApps()
  } catch {}
}

async function handleTestDataApp(row: any) {
  try {
    const res = await testDataAppConnection(row.id) as any
    ElMessage.success(res?.message || '连接测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
  }
}

// ===== AI模型配置 =====
const aiLoading = ref(false)
const aiConfigs = ref<any[]>([])
const aiEnabled = ref(false)
const onlyTemplateCategories = ref(true)
const classifySourcesList = ref<string[]>(['column_name', 'column_comment'])
const knowledgeBaseEnabled = ref(false)
const showConfigForm = ref(false)
const isEditingConfig = ref(false)
const editingConfigId = ref<number | null>(null)
const configSaving = ref(false)
const testingConfig = ref(false)
const knowledgeLoading = ref(false)
const knowledgeList = ref<any[]>([])
const knowledgeUploadRef = ref()
const knowledgeFile = ref<File | null>(null)

// 知识库命中详情
const knowledgeHitDialogVisible = ref(false)
const knowledgeHitDialogTitle = ref('')
const knowledgeHitList = ref<any[]>([])
const knowledgeHitLoading = ref(false)
const knowledgeHitTotal = ref(0)
const knowledgeHitPage = ref(1)
const knowledgeHitPageSize = ref(20)
let knowledgeHitCurrentId = 0

const defaultConfigForm = {
  config_name: '',
  model_name: '',
  provider: '',
  api_base: '',
  api_key: '',
  max_tokens: 0,
  temperature: 0.1,
  top_p: 1.0,
  timeout_seconds: 300,
  batch_size: 50,
  max_retries: 3,
  system_prompt: '',
  user_prompt_template: '',
}

const configForm = reactive({ ...defaultConfigForm })

async function loadAiConfigs() {
  aiLoading.value = true
  try {
    const [settingsRes, configsRes, knowledgeRes] = await Promise.all([
      getAiSettings(),
      getAiModelConfigs(),
      getAiKnowledge(),
    ])
    aiEnabled.value = settingsRes.data?.ai_enabled === 'true'
    onlyTemplateCategories.value = settingsRes.data?.only_template_categories !== 'false'
    // 从全局设置读取 classify_sources
    const sources = settingsRes.data?.classify_sources || 'column_name,column_comment'
    classifySourcesList.value = sources.split(',').map((s: string) => s.trim())
    knowledgeBaseEnabled.value = settingsRes.data?.knowledge_base_enabled === 'true'
    aiConfigs.value = configsRes.data || []
    knowledgeList.value = knowledgeRes.data || []
  } catch { /* ignore */ }
  finally { aiLoading.value = false }
}

async function handleAiEnabledChange(val: any) {
  const enabled = val === true || val === 'true'
  try {
    await saveAiSettings({ ai_enabled: String(enabled) })
    ElMessage.success(enabled ? 'AI分类已启用' : 'AI分类已禁用')
  } catch { ElMessage.error('保存失败') }
}

async function handleOnlyTemplateChange(val: any) {
  const enabled = val === true || val === 'true'
  try {
    await saveAiSettings({ only_template_categories: String(enabled) })
    ElMessage.success(enabled ? '已启用仅用模版分类' : '已关闭仅用模版分类')
  } catch { ElMessage.error('保存失败') }
}

async function handleClassifySourcesChange(val: string[]) {
  const sources = (val || ['column_name', 'column_comment']).join(',')
  try {
    await saveAiSettings({ classify_sources: sources })
    ElMessage.success('分类数据来源已更新')
  } catch { ElMessage.error('保存失败') }
}

async function handleKnowledgeBaseChange(val: any) {
  const enabled = val === true || val === 'true'
  try {
    await saveAiSettings({ knowledge_base_enabled: String(enabled) })
    ElMessage.success(enabled ? '知识库已启用，任务时长可能增加' : '知识库已关闭')
  } catch { ElMessage.error('保存失败') }
}

function openCreateConfig() {
  isEditingConfig.value = false
  editingConfigId.value = null
  Object.assign(configForm, defaultConfigForm)
  showConfigForm.value = true
}

function handleEditConfig(row: any) {
  isEditingConfig.value = true
  editingConfigId.value = row.id
  configForm.config_name = row.config_name
  configForm.model_name = row.model_name
  configForm.provider = row.provider || ''
  configForm.api_base = row.api_base || ''
  configForm.api_key = ''
  configForm.max_tokens = row.max_tokens ?? 0
  configForm.temperature = row.temperature ?? 0.1
  configForm.top_p = row.top_p ?? 1.0
  configForm.timeout_seconds = row.timeout_seconds ?? 300
  configForm.batch_size = row.batch_size ?? 50
  configForm.max_retries = row.max_retries ?? 3
  configForm.system_prompt = row.system_prompt || ''
  configForm.user_prompt_template = row.user_prompt_template || ''
  showConfigForm.value = true
}

async function loadKnowledge() {
  knowledgeLoading.value = true
  try {
    const res = await getAiKnowledge()
    knowledgeList.value = res.data || []
  } catch { knowledgeList.value = [] }
  finally { knowledgeLoading.value = false }
}

async function handleKnowledgeFileChange(file: any) {
  knowledgeFile.value = file.raw
  try {
    const res = await uploadAiKnowledge(file.raw, file.name)
    ElMessage.success((res as any)?.message || '上传成功')
    loadKnowledge()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '上传失败')
  }
}

async function handleDeleteKnowledge(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除"${row.title}"吗？`, '提示', { type: 'warning' })
    await deleteAiKnowledge(row.id)
    ElMessage.success('已删除')
    loadKnowledge()
  } catch {}
}

function formatTime(iso?: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

async function handleKnowledgeRowClick(row: any) {
  knowledgeHitCurrentId = row.id
  knowledgeHitDialogTitle.value = row.title || row.file_name || '文档'
  knowledgeHitDialogVisible.value = true
  knowledgeHitPage.value = 1
  await loadKnowledgeHits()
}

async function loadKnowledgeHits() {
  if (!knowledgeHitCurrentId) return
  knowledgeHitLoading.value = true
  try {
    const res = await getAiKnowledgeHits(knowledgeHitCurrentId, { page: knowledgeHitPage.value, page_size: knowledgeHitPageSize.value })
    const data = res.data || res
    knowledgeHitList.value = data.items || []
    knowledgeHitTotal.value = data.total || 0
  } catch {
    knowledgeHitList.value = []
    knowledgeHitTotal.value = 0
  } finally { knowledgeHitLoading.value = false }
}

async function handleSaveConfig() {
  if (!configForm.config_name.trim()) { ElMessage.warning('请输入配置名称'); return }
  if (!configForm.model_name.trim()) { ElMessage.warning('请输入模型名称'); return }
  configSaving.value = true
  try {
    const data = { ...configForm }
    if (isEditingConfig.value && editingConfigId.value) {
      await updateAiModelConfig(editingConfigId.value, data)
      ElMessage.success('配置已更新')
    } else {
      await createAiModelConfig(data)
      ElMessage.success('配置已创建')
    }
    showConfigForm.value = false
    await loadAiConfigs()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '保存失败')
  } finally { configSaving.value = false }
}

async function handleTestFormConfig() {
  if (!configForm.model_name.trim()) { ElMessage.warning('请先填写模型名称'); return }
  testingConfig.value = true
  try {
    let result: any
    if (isEditingConfig.value && editingConfigId.value) {
      // 编辑状态下使用后端接口（自动解密已保存的API Key）
      const res = await testAiModelConfig(editingConfigId.value) as any
      result = res.data
    } else {
      // 新建状态下使用前端表单数据
      const data = { ...configForm }
      const res = await testAiModelConnection(data) as any
      result = res.data
    }
    const detail = result?.data_type_name || result?.category_path || JSON.stringify(result)
    ElMessage.success(`连接测试成功！识别结果: ${detail}`)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败')
  } finally { testingConfig.value = false }
}

async function handleDeleteConfig(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除配置"${row.config_name}"吗？`, '提示', { type: 'warning' })
    await deleteAiModelConfig(row.id)
    ElMessage.success('已删除')
    await loadAiConfigs()
  } catch {}
}

async function handleActivateConfig(row: any) {
  try {
    await activateAiModelConfig(row.id)
    ElMessage.success(`已激活配置"${row.config_name}"`)
    await loadAiConfigs()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '激活失败')
  }
}

async function handleTestConfig(row: any) {
  try {
    const res = await testAiModelConfig(row.id) as any
    ElMessage.success(res?.data ? `测试成功: ${JSON.stringify(res.data)}` : '测试通过')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '测试失败')
  }
}

// ===== 插件管理 =====
async function loadPlugins() {
  pluginsLoading.value = true
  try {
    const res = await getPlugins()
    plugins.value = res.data || []
  } catch { plugins.value = [] }
  finally { pluginsLoading.value = false }
}

function handleShowInstructions(row: any) {
  instructionsTitle.value = row.display_name
  instructionsData.value = row.upload_instructions || {}
  instructionsVisible.value = true
}

function setReUploadInputRef(name: string, el: any) {
  if (el) reUploadInputRefs.value[name] = el
}

async function handlePluginFileChange(name: string, file: any) {
  if (uploadingName.value) return
  uploadingName.value = name
  try {
    const raw = file.raw || file
    const res = await uploadPlugin(name, raw) as any
    ElMessage.success(res?.message || '上传成功')
    await loadPlugins()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '上传失败'
    ElMessage.error(msg)
  } finally {
    uploadingName.value = ''
  }
}

async function handleValidatePlugin(row: any) {
  if (validatingName.value) return
  validatingName.value = row.name
  try {
    const res = await validatePlugin(row.name) as any
    if (res?.code === 0) {
      ElMessage.success(res?.message || '检测通过')
    } else {
      ElMessage.warning(res?.message || '检测未通过，请参考指引确认文件是否正确')
    }
    await loadPlugins()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '检测失败'
    ElMessage.error(msg)
    await loadPlugins()
  } finally {
    validatingName.value = ''
  }
}

async function handleDeployPlugin(row: any) {
  if (deployingName.value) return
  deployingName.value = row.name
  try {
    const res = await deployPlugin(row.name) as any
    ElMessage.success(res?.message || '部署成功')
    await loadPlugins()
    // 如果插件需要重启，询问用户是否立即重启
    if (res?.data?.needs_restart) {
      await ElMessageBox.confirm(
        '该插件部署后需要重启服务才能生效，是否立即重启？',
        '重启确认',
        { confirmButtonText: '立即重启', cancelButtonText: '稍后手动重启', type: 'warning' }
      )
      // 用户确认重启
      await restartService()
      ElMessage.success('服务正在重启，请稍后刷新页面')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '部署失败')
    await loadPlugins()
  } finally {
    deployingName.value = ''
  }
}

async function handleDeletePluginFile(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定删除插件"${row.display_name}"的文件？删除后需要重新上传文件。`,
      '删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  deletingName.value = row.name
  try {
    const res = await deletePluginFile(row.name) as any
    ElMessage.success(res?.message || '文件已删除')
    await loadPlugins()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '删除失败')
    await loadPlugins()
  } finally {
    deletingName.value = ''
  }
}

async function handleUninstallPlugin(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定卸载插件"${row.display_name}"？将删除已部署的内容，如需使用需重新上传并部署。`,
      '卸载确认',
      { confirmButtonText: '确认卸载', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  uninstallingName.value = row.name
  try {
    const res = await uninstallPlugin(row.name) as any
    ElMessage.success(res?.message || '卸载成功')
    await loadPlugins()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '卸载失败')
    await loadPlugins()
  } finally {
    uninstallingName.value = ''
  }
}

async function handleReUploadPlugin(row: any) {
  try {
    await ElMessageBox.confirm(
      `重新上传将先卸载"${row.display_name}"并删除旧文件，确认继续？`,
      '重新上传确认',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  reUploadingName.value = row.name
  try {
    // 1. 如果已部署，先卸载（后端 uninstall 会一并删除上传文件）
    if (row.installed) {
      await uninstallPlugin(row.name)
    } else if (row.file_exists) {
      // 仅删除上传文件
      await deletePluginFile(row.name)
    }
    // 2. 弹出文件选择器
    reUploadingName.value = ''
    const input = reUploadInputRefs.value[row.name]
    if (input) {
      input.value = ''
      input.click()
    }
    return
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '操作失败')
    await loadPlugins()
  } finally {
    reUploadingName.value = ''
  }
}

async function handleReUploadFileChange(name: string, event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || !target.files.length) return
  const file = target.files[0]
  uploadingName.value = name
  try {
    const res = await uploadPlugin(name, file) as any
    ElMessage.success(res?.message || '上传成功')
    await loadPlugins()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '上传失败'
    ElMessage.error(msg)
    await loadPlugins()
  } finally {
    uploadingName.value = ''
  }
}

// ===== 授权管理 =====
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
    const res = await activateLicense(licenseKeyForm.license_key) as any
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
  try {
    await ElMessageBox.confirm('确定要注销当前授权吗？', '提示', { type: 'warning' })
    await deactivateLicense()
    ElMessage.success('授权已注销')
    licenseKeyForm.license_key = ''
    await loadLicenseInfo()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.response?.data?.message || err?.message || '注销失败')
    }
  }
}

onMounted(async () => {
  await fetchSettings()
  await fetchLdapSettings()
})

// 切换标签时按需加载
const tabLoaders: Record<string, () => Promise<void>> = {
  security: loadSecuritySettings,
  api: loadApiKeys,
  apps: loadDataApps,
  engine: loadEngineSettings,
  ai: loadAiConfigs,
  license: loadLicenseInfo,
  plugins: loadPlugins,
}

import { watch } from 'vue'
watch(activeTab, (tab) => {
  tabLoaders[tab]?.()
})
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.logo-preview-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.logo-preview-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  padding: 4px;
  background: var(--color-surface-subtle);
}
.logo-preview-tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.ai-global-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-toggle-label {
  font-size: 15px;
  font-weight: 500;
}

.ai-toggle-desc {
  font-size: 12px;
  color: #909399;
}

.ai-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-toggle-with-desc {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-desc-text {
  font-size: 12px;
  color: #909399;
}

.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
.plugin-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
</style>

<template>
  <div class="risk-page">

    <!-- ================= 列表视图 ================= -->
    <template v-if="view === 'list'">
      <div class="rp-bar">
        <div class="rp-bar-left">
          <span class="std-badge">GB/T 45577—2026</span>
          <span class="std-name">数据安全技术 数据安全风险评估方法</span>
        </div>
        <div class="rp-bar-right">
          <el-input
            v-model="filters.keyword"
            placeholder="评估编号 / 单位名称"
            clearable
            style="width: 210px"
            @clear="fetchList"
            @keyup.enter="fetchList"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button size="small" @click="fetchList">
            <el-icon style="margin-right: 4px"><Search /></el-icon>搜索
          </el-button>
          <el-button type="primary" size="small" @click="startCreate">
            <el-icon style="margin-right: 4px"><Plus /></el-icon>新建评估
          </el-button>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-item">
          <div class="stat-num">{{ frameworkInfo.clause_count }}</div>
          <div class="stat-cap">评估条款</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ frameworkInfo.item_count }}</div>
          <div class="stat-cap">评估项</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ frameworkInfo.risk_types.length }}</div>
          <div class="stat-cap">风险类型</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ listTotal }}</div>
          <div class="stat-cap">评估记录</div>
        </div>
      </div>

      <DataTable
        :data="list"
        :loading="listLoading"
        :total="listTotal"
        :current-page="page"
        :page-size="pageSize"
        @page-change="onPageChange"
      >
        <el-table-column prop="assessment_no" label="评估编号" min-width="170" />
        <el-table-column prop="org_name" label="被评估方" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.org_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="target_scope" label="评估对象" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.target_scope || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="118">
          <template #default="{ row }">
            <el-tag v-if="row.report_status === 'generating'" type="primary" size="small" effect="light">
              生成中
            </el-tag>
            <el-tag v-else-if="row.report_status === 'completed'" type="success" size="small" effect="light">
              已生成报告
            </el-tag>
            <el-tag v-else-if="row.report_status === 'failed'" type="danger" size="small" effect="light">
              生成失败
            </el-tag>
            <el-tag v-else type="info" size="small" effect="light">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评估进度" width="190">
          <template #default="{ row }">
            <el-tooltip :content="progressTip(row as RiskAssessment)" placement="top">
              <div class="list-progress">
                <div class="lp-track">
                  <div class="lp-fill" :style="{ width: (row.progress?.pct || 0) + '%' }"></div>
                  <span
                    class="lp-text"
                    :class="{ 'on-fill': (row.progress?.pct || 0) >= 50 }"
                  >{{ (row.progress?.pct || 0) >= 100 ? '已完成' : (row.progress?.pct || 0) + '%' }}</span>
                </div>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="assess_date" label="评估日期" width="120">
          <template #default="{ row }">{{ row.assess_date || '—' }}</template>
        </el-table-column>
        <el-table-column prop="created_by" label="创建人" width="110">
          <template #default="{ row }">{{ row.created_by || '—' }}</template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button type="primary" link size="small" @click="openEditor((row as RiskAssessment).id)">
                编辑
              </el-button>
              <el-button type="success" link size="small" @click="copyAssessment(row as RiskAssessment)">
                复制报告
              </el-button>
              <el-button
                type="success"
                link
                size="small"
                @click="downloadAssessmentReport(row as RiskAssessment)"
              >
                下载报告
              </el-button>
              <el-button type="danger" link size="small" @click="removeAssessment(row as RiskAssessment)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </DataTable>
    </template>

    <!-- ================= 编辑视图 ================= -->
    <template v-else>
      <div class="rp-head">
        <div class="rp-head-left">
          <el-button link size="small" @click="backToList">
            <el-icon><ArrowLeft /></el-icon>返回列表
          </el-button>
          <span class="rp-head-title">{{ form.org_name || form.title || '新建评估' }}</span>
          <span class="rp-head-no">{{ form.assessment_no || '未保存' }}</span>
        </div>
        <div class="rp-head-right">
          <el-button size="small" :loading="saving" @click="saveAll()">
            <el-icon style="margin-right: 4px"><Select /></el-icon>保存
          </el-button>
        </div>
      </div>

      <!-- 整体核查进度 -->
      <div class="overall-bar">
        <span class="ob-label">整体核查进度</span>
        <el-progress
          :percentage="judgedPct"
          :stroke-width="12"
          style="width: 240px"
          color="#2E86AB"
        />
        <span class="ob-text" :class="{ done: judgedPct >= 100 }">{{ overallText }}</span>
        <span class="ob-legend">
          <span class="lg"><i class="dot ok"></i>符合 {{ resultCount.ok }}</span>
          <span class="lg"><i class="dot part"></i>部分符合 {{ resultCount.part }}</span>
          <span class="lg"><i class="dot no"></i>不符合 {{ resultCount.no }}</span>
          <span class="lg"><i class="dot na"></i>不适用 {{ resultCount.na }}</span>
        </span>
      </div>

      <!-- 步骤条 -->
      <div class="stepper">
        <div
          v-for="(s, i) in STEPS"
          :key="s.key"
          class="stepper-item"
          :class="{ active: step === i, done: step > i }"
          @click="goStep(i)"
        >
          <div class="stepper-dot">{{ i + 1 }}</div>
          <div class="stepper-text">
            <div class="stepper-title">{{ s.title }}</div>
            <div class="stepper-desc">{{ s.desc }}</div>
          </div>
        </div>
      </div>

      <!-- ============ 步骤 1：基本信息 ============ -->
      <div v-show="step === 0" class="pane">
        <div class="card">
          <div class="card-hd">一、被评估方信息<span class="card-hd-sub">数据安全风险评估基本信息表</span></div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px" size="default">
              <div class="grid-2">
                <el-form-item label="单位名称">
                  <el-input id="f-org_name" v-model="form.org_name" placeholder="被评估方单位全称" />
                </el-form-item>
                <el-form-item label="统一社会信用代码">
                  <el-input id="f-credit_code" v-model="form.credit_code" placeholder="18 位统一社会信用代码" />
                </el-form-item>
                <el-form-item label="单位地址">
                  <el-input id="f-org_address" v-model="form.org_address" />
                </el-form-item>
                <el-form-item label="邮政编码">
                  <el-input id="f-postal_code" v-model="form.postal_code" />
                </el-form-item>
                <el-form-item label="单位性质">
                  <el-input id="f-org_type" v-model="form.org_type" placeholder="如：企业 / 事业单位" />
                </el-form-item>
                <el-form-item label="所属行业领域">
                  <el-input id="f-industry" v-model="form.industry" placeholder="如：金融 / 医疗 / 政务" />
                </el-form-item>
                <el-form-item label="人员/业务规模">
                  <el-input v-model="form.org_scale" placeholder="如：2000 人，日均处理 100 万条" />
                </el-form-item>
                <el-form-item label="数据安全负责人">
                  <el-input id="f-data_security_officer" v-model="form.data_security_officer" />
                </el-form-item>
              </div>
              <el-form-item label="评估对象">
                <el-input id="f-target_scope" v-model="form.target_scope" placeholder="如：核心业务系统及承载的数据资产" />
              </el-form-item>
              <el-form-item label="被评估信息系统名称">
                <el-input id="f-system_name" v-model="form.system_name" placeholder="报告中的“XX系统”，如：某某省政务数据共享交换平台" />
              </el-form-item>
              <el-form-item label="评估对象说明">
                <el-input v-model="form.target_desc" type="textarea" :rows="2" />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">二、联系人信息</div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px">
              <div class="grid-2">
                <el-form-item label="姓名"><el-input id="f-contact_name" v-model="form.contact_name" /></el-form-item>
                <el-form-item label="联系方式"><el-input id="f-contact_phone" v-model="form.contact_phone" /></el-form-item>
                <el-form-item label="职务/职称"><el-input v-model="form.contact_title" /></el-form-item>
                <el-form-item label="所属部门"><el-input v-model="form.contact_dept" /></el-form-item>
              </div>
            </el-form>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">三、评估队伍</div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px">
              <div class="grid-2">
                <el-form-item label="评估单位名称">
                  <el-input id="f-assessor_org_name" v-model="form.assessor_org_name" />
                </el-form-item>
                <el-form-item label="邮政编码">
                  <el-input v-model="form.assessor_postal_code" />
                </el-form-item>
                <el-form-item label="单位地址">
                  <el-input v-model="form.assessor_org_address" />
                </el-form-item>
                <el-form-item label="联系方式">
                  <el-input v-model="form.assessor_contact_phone" />
                </el-form-item>
                <el-form-item label="评估单位联系人">
                  <el-input v-model="form.assessor_contact_name" />
                </el-form-item>
                <el-form-item label="联系人职务/职称">
                  <el-input id="f-assessor_contact_title" v-model="form.assessor_contact_title" placeholder="如：高级工程师" />
                </el-form-item>
                <el-form-item label="评估日期">
                  <el-input id="f-assess_date" v-model="form.assess_date" placeholder="YYYY-MM-DD" />
                </el-form-item>
                <el-form-item label="评估组长">
                  <el-input id="f-team_leader" v-model="form.team_leader" />
                </el-form-item>
                <el-form-item label="评估组长日期">
                  <el-input v-model="form.leader_sign_date" placeholder="YYYY-MM-DD" />
                </el-form-item>
                <el-form-item label="审核人">
                  <el-input id="f-reviewer" v-model="form.reviewer" />
                </el-form-item>
                <el-form-item label="审核人日期">
                  <el-input v-model="form.reviewer_sign_date" placeholder="YYYY-MM-DD" />
                </el-form-item>
              </div>
            </el-form>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">
            四、信息调研情况
            <span class="card-hd-sub">第 4 章 信息调研情况</span>
          </div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px" label-position="top">
              <el-form-item label="4.2 业务和信息系统情况">
                <el-input id="f-business_info" v-model="form.business_info" type="textarea" :rows="3" placeholder="业务情况说明" />
                <el-input
                  id="f-system_info"
                  v-model="form.system_info"
                  type="textarea"
                  :rows="3"
                  style="margin-top: 8px"
                  placeholder="信息系统、网络拓扑、接口情况说明"
                />
              </el-form-item>
              <el-form-item>
                <template #label>
                  <span>
                    4.3 数据资产情况
                    <el-button link type="primary" size="small" @click="fillDataAsset">
                      按系统数据填充
                    </el-button>
                  </span>
                </template>
                <el-input id="f-data_asset_info" v-model="form.data_asset_info" type="textarea" :rows="4" placeholder="数据结构与数量、数据分布、数据关联关系等" />
                <div v-if="prefill" class="prefill-box">
                  <span>数据库资产 {{ prefill.assets.total_assets }} 个 · 表 {{ prefill.assets.total_tables }} 张 · 字段 {{ prefill.assets.total_columns }} 个</span>
                  <span>纳入分类分级目录的资产 {{ prefill.assets.classified_assets }} 个（覆盖率 {{ prefill.assets.classification_rate }}%）</span>
                  <span>文件资产 {{ prefill.file_assets.total_file_assets }} 个 · 文件 {{ prefill.file_assets.total_files }} 个 · 内容块 {{ prefill.file_assets.total_blocks }} 个</span>
                </div>
              </el-form-item>
              <el-form-item label="4.4 数据处理活动情况">
                <el-input id="f-processing_info" v-model="form.processing_info" type="textarea" :rows="3" placeholder="数据收集、存储、传输、使用和加工、提供、公开、删除等环节说明" />
              </el-form-item>
              <el-form-item label="4.6 安全措施情况">
                <el-input id="f-measure_info" v-model="form.measure_info" type="textarea" :rows="3" placeholder="安全测评认证、安全管理机构与人员、制度及技术措施等" />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">报告配图<span class="card-hd-sub">按 2026 版模板对应位置插入真实图片</span></div>
          <div class="card-bd">
            <div class="asset-grid">
              <div v-for="a in ASSET_SLOTS" :key="a.slot" class="asset-item">
                <div class="asset-item-hd">
                  <span class="asset-item-title">{{ a.label }}</span>
                  <el-tooltip :content="a.tip" placement="top">
                    <el-icon class="asset-item-info"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="asset-item-bd">
                  <div class="asset-preview-box">
                    <img v-if="assetUrls[a.slot]" :src="assetUrls[a.slot]" class="asset-preview" alt="" />
                    <div v-else class="asset-empty">未上传</div>
                  </div>
                  <div class="asset-ops">
                    <el-button size="small" type="primary" @click="pickAsset(a.slot)">上传图片</el-button>
                    <el-button v-if="form[a.field]" size="small" @click="clearAsset(a.slot)">清除</el-button>
                    <span v-if="form[a.field]" class="asset-file">{{ form[a.field] }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="asset-note">
              支持 PNG / JPEG，单张不超过 5MB；服务端按文件头校验真实类型并重新编码，图片将嵌入 Word 文档对应位置。
            </div>
            <input
              ref="assetFileInput"
              type="file"
              accept="image/png,image/jpeg"
              style="display: none"
              @change="onAssetFileChange"
            />
          </div>
        </div>

        <div class="card">
          <div class="card-hd">五、评估概述与结论<span class="card-hd-sub">第 1 章 / 第 6 章</span></div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px" label-position="top">
              <el-form-item label="1.1 评估目的">
                <el-input v-model="form.assessment_purpose" type="textarea" :rows="2" placeholder="不填写则按标准自动生成" />
              </el-form-item>
              <el-form-item label="1.2 评估依据">
                <el-input v-model="form.assessment_basis" type="textarea" :rows="2" placeholder="不填写则按标准自动生成" />
              </el-form-item>
              <el-form-item label="1.4 评估结论概要">
                <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="不填写则按核查结果自动生成" />
              </el-form-item>
              <el-form-item label="6.3 整改建议">
                <el-input id="f-conclusion" v-model="form.conclusion" type="textarea" :rows="2" placeholder="整体整改建议，输出到报告 6.3 整改建议章节" />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

      <!-- ============ 步骤 2：报告章节内容 ============ -->
      <div v-show="step === 1" class="pane">
        <div class="card">
          <div class="card-hd">
            报告章节内容
            <span class="card-hd-sub">第 3、4 章可填写内容，按模板表格逐项填写</span>
          </div>
          <div class="card-bd">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="此处填写的表格与正文会按 2026 版模板的对应位置写入 Word 报告；未填写的表格保留模板空行，未填写的正文段落不出现。"
              style="margin-bottom: 12px"
            />

            <!-- 表 4-1 补充字段 -->
            <div v-if="chapterSpecs.org_profile_fields?.length" class="ch-block">
              <div class="ch-block-hd">4.1 数据处理者基本情况（补充字段）</div>
              <div class="grid-2">
                <el-form-item
                  v-for="f in chapterSpecs.org_profile_fields"
                  :key="f.key"
                  :label="f.label"
                >
                  <el-input v-model="chapterData.org_profile[f.key]" placeholder="可留空" />
                </el-form-item>
              </div>
            </div>

            <!-- 正文段落 -->
            <div v-if="chapterSpecs.texts?.length" class="ch-block">
              <div class="ch-block-hd">章节正文说明</div>
              <el-form label-width="150px" label-position="top">
                <el-form-item v-for="t in chapterSpecs.texts" :key="t.key" :label="t.title">
                  <el-input
                    v-model="chapterData.texts[t.key]"
                    type="textarea"
                    :rows="2"
                    :placeholder="t.placeholder"
                  />
                </el-form-item>
              </el-form>
            </div>

            <!-- 表格 -->
            <div v-if="chapterSpecs.tables?.length" class="ch-block">
              <div class="ch-block-hd">章节表格</div>
              <el-collapse v-model="openChapterTables" class="clause-list chapter-tables">
                <el-collapse-item
                  v-for="t in chapterSpecs.tables"
                  :key="t.key"
                  :name="t.key"
                >
                  <template #title>
                    <div class="ch-title">
                      <span class="cht-name">{{ t.title }}</span>
                      <span class="cht-count">{{ chapterRows(t.key).length }} 行</span>
                    </div>
                  </template>
                  <div v-if="openChapterTables.includes(t.key)" class="ch-tbl-wrap">
                  <table class="ch-tbl">
                    <thead>
                      <tr>
                        <th v-for="c in t.columns" :key="c">{{ c }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in chapterRows(t.key)" :key="ri">
                        <td v-for="(c, ci) in t.columns" :key="ci">
                          <el-input
                            v-if="t.auto_seq && ci === 0"
                            :model-value="String(ri + 1)"
                            size="small"
                            disabled
                          />
                          <el-input
                            v-else
                            v-model="row[ci]"
                            size="small"
                            placeholder="可留空"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                  <div class="ch-ops">
                    <el-button size="small" @click="addChapterRow(t)">添加一行</el-button>
                    <el-button size="small" @click="removeChapterRow(t, chapterRows(t.key).length - 1)">
                      删除最后一行
                    </el-button>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </div>

      </div>

      <!-- ============ 步骤 3：逐项检查 ============ -->
      <div v-show="step === 2" class="pane">
        <div class="check-bar">
          <div class="check-progress">
            <span>已判定 <b>{{ judgedCount }}</b> / {{ totalItemCount }} 个评估项</span>
            <el-progress
              :percentage="judgedPct"
              :stroke-width="8"
              :show-text="false"
              style="width: 220px"
              color="#2E86AB"
            />
          </div>
          <div class="check-legend">
            <span class="lg"><i class="dot ok"></i>符合 {{ resultCount.ok }}</span>
            <span class="lg"><i class="dot part"></i>部分符合 {{ resultCount.part }}</span>
            <span class="lg"><i class="dot no"></i>不符合 {{ resultCount.no }}</span>
            <span class="lg"><i class="dot na"></i>不适用 {{ resultCount.na }}</span>
          </div>
          <el-select v-model="filterResult" size="small" style="width: 150px" placeholder="筛选结论">
            <el-option label="全部条款" value="" />
            <el-option label="未判定" value="none" />
            <el-option v-for="o in framework.result_options" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>

        <el-tabs v-model="activeDim" class="dim-tabs">
          <el-tab-pane
            v-for="d in framework.dimensions"
            :key="d.code"
            :name="d.code"
          >
            <template #label>
              <span class="dim-label">
                {{ d.code }} {{ d.name }}
                <el-tag size="small" type="info" round>{{ dimGroupCount(d.code) }} 组</el-tag>
              </span>
            </template>

            <div class="dim-desc">{{ d.desc }}</div>

            <!-- 按模板附录A 的分组逐组呈现（分组 = 附录三级标题） -->
            <div v-for="g in visibleGroups(d.code)" :key="g.code" class="clause-group">
              <div class="clause-group-hd">
                <span class="cg-code">{{ g.code }}</span>
                <span class="cg-title">{{ g.title }}</span>
                <span class="cg-count">{{ g.rowCount }} 个评估项 · {{ g.clauses.length }} 个评估点</span>
              </div>

              <!-- 列标题：与条款行共用同一套栅格，保证逐列严格对齐 -->
              <div class="cl-head">
                <span class="c-code">评估点编号</span>
                <span class="c-name">评估点</span>
                <span class="c-pts">评估项进度</span>
              </div>

              <el-collapse v-model="openClauses" class="clause-list">
              <el-collapse-item
                v-for="c in g.clauses"
                :key="c.code"
                :name="c.code"
              >
                <template #title>
                  <div class="clause-title">
                    <span class="c-code clause-code">{{ c.code }}</span>
                    <span class="c-name clause-name">{{ c.title }}</span>
                    <span class="c-pts clause-points">
                      <span
                        class="progress-num"
                        :class="{ done: clauseProgress(c.code).done === clauseProgress(c.code).total }"
                      >{{ clauseProgress(c.code).done }}/{{ clauseProgress(c.code).total }}</span>
                    </span>
                  </div>
                </template>

                <!-- 逐评估项核查（每个 a)/b)/c) 独立判定，对应模板附录A 的每一行）
                     仅在条款展开时渲染，避免一次性创建数百个表单控件 -->
                <div v-if="openClauses.includes(c.code)" class="standard" :id="'c-' + c.code">
                  <div v-for="seg in c.segments" :key="seg.intro" class="std-seg">
                    <div class="std-intro">{{ seg.intro }}</div>
                  </div>
                  <div
                    v-for="it in clauseItems(c.code)"
                    :key="it.item_index"
                    :id="'it-' + c.code + '-' + it.item_index"
                    class="std-item"
                    :class="{
                      done: !!items[itemKey(c.code, it.item_index)]?.result,
                      'need-fill': isItemIncomplete(c.code, it.item_index),
                    }"
                  >
                    <div class="std-item-txt">{{ it.text }}</div>
                    <div class="std-item-judge">
                      <div class="opt-group" :id="'res-' + c.code + '-' + it.item_index">
                        <div
                          v-for="o in framework.result_options"
                          :key="o.value"
                          class="opt"
                          :class="[o.value, { sel: items[itemKey(c.code, it.item_index)]?.result === o.value }]"
                          @click="setResult(c.code, it.item_index, o.value)"
                        >
                          <i class="opt-dot"></i>{{ o.label }}
                        </div>
                      </div>
                      <div class="field" style="margin-top: 6px">
                        <label>检查结果（核查情况 / 证据）<span class="req">必填</span></label>
                        <el-input
                          :id="'ev-' + c.code + '-' + it.item_index"
                          v-model="items[itemKey(c.code, it.item_index)].evidence"
                          type="textarea"
                          :rows="2"
                          placeholder="对该评估项的核查情况与证据：查阅了什么材料、访谈了谁、验证了什么、结论依据是什么"
                        />
                      </div>
                    </div>
                    <!-- 该评估项自己的整改建议与风险信息（报告第 5、6 章要求的字段） -->
                    <div v-if="items[itemKey(c.code, it.item_index)]?.result === 'part' || items[itemKey(c.code, it.item_index)]?.result === 'no'">
                      <div class="field" style="margin-top: 6px">
                        <label>整改建议（本评估项）<span class="req">必填</span></label>
                        <el-input
                          :id="'sg-' + c.code + '-' + it.item_index"
                          v-model="items[itemKey(c.code, it.item_index)].suggestion"
                          type="textarea"
                          :rows="2"
                          placeholder="针对本评估项不符合/部分符合的整改建议"
                        />
                      </div>
                <!-- 风险信息（第 6 章 风险分析与评价，逐评估项） -->
                <div class="risk-block">
                  <div class="risk-hd">风险信息（第 6 章 风险分析与评价）</div>
                  <div class="field-grid">
                    <div class="field">
                      <label>风险类型（附录D 典型数据安全风险类型）</label>
                      <el-select
                        :id="'rt-' + c.code + '-' + it.item_index"
                        v-model="items[itemKey(c.code, it.item_index)].risk_type_nos"
                        multiple
                        filterable
                        collapse-tags
                        collapse-tags-tooltip
                        style="width: 100%"
                        placeholder="可多选"
                      >
                        <el-option
                          v-for="t in framework.risk_types"
                          :key="t.no"
                          :label="t.no + '. ' + t.name"
                          :value="t.no"
                        >
                          <div class="rt-opt">
                            <b>{{ t.no }}. {{ t.name }}</b>
                            <span>{{ t.desc }}</span>
                          </div>
                        </el-option>
                      </el-select>
                    </div>
                    <div class="field">
                      <label>涉及的数据及类型、级别</label>
                      <el-input :id="'di-' + c.code + '-' + it.item_index" v-model="items[itemKey(c.code, it.item_index)].data_involved" placeholder="如：客户个人信息，一般数据/重要数据" />
                    </div>
                    <div class="field">
                      <label>风险描述</label>
                      <el-input :id="'rd-' + c.code + '-' + it.item_index" v-model="items[itemKey(c.code, it.item_index)].risk_desc" type="textarea" :rows="2" />
                    </div>
                    <div class="field">
                      <label>涉及的数据处理活动</label>
                      <el-input :id="'aa-' + c.code + '-' + it.item_index" v-model="items[itemKey(c.code, it.item_index)].activity_involved" placeholder="如：数据存储、数据传输" />
                    </div>
                    <div class="field">
                      <label>风险危害程度（表 2）/ 发生可能性（表 3）</label>
                      <div class="matrix-input">
                        <el-select
                          :id="'hl-' + c.code + '-' + it.item_index"
                          v-model="items[itemKey(c.code, it.item_index)].harm_level"
                          clearable
                          placeholder="危害程度"
                          style="width: 130px"
                        >
                          <el-option
                            v-for="h in framework.harm_levels"
                            :key="h.value"
                            :label="h.label"
                            :value="h.value"
                          >
                            <div class="rt-opt">
                              <b>{{ h.label }}</b>
                              <span>{{ h.desc }}</span>
                            </div>
                          </el-option>
                        </el-select>
                        <span class="times">×</span>
                        <el-select
                          :id="'ll-' + c.code + '-' + it.item_index"
                          v-model="items[itemKey(c.code, it.item_index)].likelihood_level"
                          clearable
                          placeholder="可能性"
                          style="width: 100px"
                        >
                          <el-option
                            v-for="l in framework.likelihood_levels"
                            :key="l.value"
                            :label="l.label"
                            :value="l.value"
                          >
                            <div class="rt-opt">
                              <b>{{ l.label }}</b>
                              <span>{{ l.desc }}</span>
                            </div>
                          </el-option>
                        </el-select>
                        <span class="eq">=</span>
                        <span
                          class="matrix-out"
                          :style="{ color: riskColor(liveLevel(c.code)) }"
                        >{{ liveLevel(c.code) || '按表 4 矩阵计算' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                    </div>
                  </div>
                </div>

              </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- ============ 步骤 4：汇总与生成 ============ -->
      <div v-show="step === 3" class="pane">
        <div class="card">
          <div class="card-hd">核查情况汇总</div>
          <div class="card-bd">
            <table class="sum-tbl">
              <thead>
                <tr>
                  <th>方面</th>
                  <th>评估方面</th>
                  <th>评估点数</th>
                  <th>评估项数</th>
                  <th>符合</th>
                  <th>部分符合</th>
                  <th>不符合</th>
                  <th>不适用</th>
                  <th>未判定</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in dimSummary" :key="s.code">
                  <td class="c">{{ s.code }}</td>
                  <td>{{ s.name }}</td>
                  <td class="c">{{ s.total }}</td>
                  <td class="c">{{ s.points }}</td>
                  <td class="c">{{ s.ok }}</td>
                  <td class="c">{{ s.part }}</td>
                  <td class="c">{{ s.no }}</td>
                  <td class="c">{{ s.na }}</td>
                  <td class="c">{{ s.none }}</td>
                </tr>
                <tr class="total">
                  <td class="c" colspan="2">合计</td>
                  <td class="c">{{ frameworkInfo.clause_count }}</td>
                  <td class="c">{{ frameworkInfo.item_count }}</td>
                  <td class="c">{{ resultCount.ok }}</td>
                  <td class="c">{{ resultCount.part }}</td>
                  <td class="c">{{ resultCount.no }}</td>
                  <td class="c">{{ resultCount.na }}</td>
                  <td class="c">{{ resultCount.none }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">数据安全风险清单（表 6-1）</div>
          <div class="card-bd">
            <el-empty v-if="!riskRows.length" description="暂无风险记录，请先在“逐项检查”中填写风险信息" :image-size="70" />
            <table v-else class="sum-tbl">
              <thead>
                <tr>
                  <th style="width: 48px">序号</th>
                  <th style="width: 110px">问题</th>
                  <th>评估项</th>
                  <th>风险类型</th>
                  <th style="width: 110px">风险危害程度</th>
                  <th style="width: 130px">风险发生的可能性</th>
                  <th style="width: 100px">风险等级</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in riskRows" :key="r.code + '-' + i">
                  <td class="c">{{ i + 1 }}</td>
                  <td class="c">{{ r.code }}</td>
                  <td>{{ r.item || '—' }}</td>
                  <td>{{ r.types || '—' }}</td>
                  <td class="c">{{ r.harm || '—' }}</td>
                  <td class="c">{{ r.likelihood || '—' }}</td>
                  <td class="c" :style="{ color: riskColor(r.level), fontWeight: 700 }">{{ r.level || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">生成报告<span class="card-hd-sub">完整性检查</span></div>
          <div class="card-bd">
            <!-- 完整性检查：可随时导出，未填写的内容在报告中留空 -->
            <div class="check-state" :class="missingItems.length ? 'bad' : 'ok'">
              <div class="cs-hd">
                <el-icon>
                  <CircleCheckFilled v-if="!missingItems.length" />
                  <WarningFilled v-else />
                </el-icon>
                <span v-if="!missingItems.length">评估信息已填写完整，报告内容将完整呈现</span>
                <span v-else>还有 {{ missingItems.length }} 处待补充（点击标签可定位到具体栏目），仍可导出报告，未填写的内容将留空</span>
              </div>
              <template v-if="missingItems.length">
                <div class="cs-groups">
                  <el-tag
                    v-for="g in missingGroups"
                    :key="g.key"
                    size="small"
                    type="danger"
                    effect="plain"
                    class="cs-group"
                  >{{ g.label }} {{ g.count }} 项</el-tag>
                </div>
                <div class="cs-list">
                  <el-tag
                    v-for="(m, i) in shownMissing"
                    :key="i"
                    size="small"
                    type="danger"
                    effect="plain"
                    class="cs-item"
                    @click="jumpToMissing(m)"
                  >{{ m.label }}</el-tag>
                  <el-button
                    v-if="missingItems.length > MISSING_PREVIEW"
                    link
                    type="primary"
                    size="small"
                    @click="showAllMissing = !showAllMissing"
                  >{{ showAllMissing ? '收起' : `展开全部 ${missingItems.length} 项` }}</el-button>
                </div>
              </template>
            </div>

            <div class="gen-row">
              <el-radio-group v-model="genFormat" size="default">
                <el-radio value="word">Word（.docx）</el-radio>
              </el-radio-group>
              <el-input
                v-model="genTitle"
                placeholder="报告标题（不填写则自动生成）"
                style="width: 340px"
              />
              <span class="gen-btn-wrap">
                <el-button
                  type="primary"
                  :loading="generating"
                  @click="handleGenerate"
                >
                  <el-icon style="margin-right: 4px"><Document /></el-icon>生成报告
                </el-button>
              </span>
              <el-button
                v-if="lastReportId && reportReady"
                type="success"
                plain
                @click="downloadReport(lastReportId)"
              >
                <el-icon style="margin-right: 4px"><Download /></el-icon>下载报告
              </el-button>
            </div>

            <div v-if="genProgress" class="gen-progress">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>{{ genProgress }}</span>
            </div>

            <div v-if="previewHtml" class="preview-wrap">
              <iframe :srcdoc="previewHtml" class="preview-frame" sandbox="allow-same-origin" />
            </div>
            <div v-else-if="reportReady" class="preview-wrap preview-hint">
              <el-icon><Document /></el-icon>
              <span>Word 报告不支持在线预览，请通过「下载报告」获取文档；用 Word 打开后目录与页码会自动更新。</span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <el-button v-if="step > 0" @click="goStep(step - 1)">上一步</el-button>
        <el-button v-if="step < 3" type="primary" @click="goStep(step + 1)">下一步</el-button>
        <el-button type="primary" plain :loading="saving" @click="saveAll()">保存评估</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, ArrowLeft, Select, Document, Loading, Download,
  CircleCheckFilled, WarningFilled, InfoFilled,
} from '@element-plus/icons-vue'
import DataTable from '@/components/common/DataTable.vue'
import {
  getRiskFramework,
  getRiskPrefill,
  getRiskAssessments,
  getRiskAssessment,
  createRiskAssessment,
  updateRiskAssessment,
  deleteRiskAssessment,
  saveRiskItems,
  generateRiskReport,
  copyRiskAssessment,
  uploadRiskAsset,
  deleteRiskAsset,
  riskAssetUrl,
  getRiskChapterSpecs,
  type RiskFramework,
  type RiskPrefill,
  type RiskAssessment,
  type RiskItem,
  type RiskAssetSlot,
  type RiskClause,
  type RiskChapterSpecs,
  type RiskChapterData,
  type RiskChapterTableSpec,
} from '@/api/riskAssessment'
import { previewReport, downloadReport } from '@/api/reports'
import { MAX_IMAGE_SIZE, isImageExt } from '@/constants/fileUpload'

const STEPS = [
  { key: 'basic', title: '基本信息', desc: '基本信息表与被评估方信息' },
  { key: 'chapter', title: '报告章节内容', desc: '第 3、4 章表格与正文填写' },
  { key: 'check', title: '逐项检查', desc: '按模板附录A 分组逐项核查' },
  { key: 'report', title: '汇总与报告', desc: '风险清单与 Word 报告生成' },
]

// ===== 视图 =====
const view = ref<'list' | 'editor'>('list')
const step = ref(0)

// ===== 框架 =====
const framework = ref<RiskFramework>({
  standard_no: 'GB/T 45577-2026',
  standard_name: '数据安全技术 数据安全风险评估方法',
  dimensions: [],
  clauses: [],
  clause_groups: [],
  appendix_a_layout: [],
  risk_types: [],
  harm_levels: [],
  likelihood_levels: [],
  risk_matrix: {},
  risk_levels: [],
  result_options: [],
  clause_count: 0,
  item_count: 0,
})
const frameworkInfo = computed(() => framework.value)
const prefill = ref<RiskPrefill | null>(null)

// ===== 列表 =====
const list = ref<RiskAssessment[]>([])
const listLoading = ref(false)
const listTotal = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ keyword: '' })

// ===== 编辑器 =====
const form = reactive<Record<string, any>>({})
const assessmentId = ref<number | null>(null)
const items = reactive<Record<string, RiskItem>>({})
const saving = ref(false)
const activeDim = ref('A.1')
const openClauses = ref<string[]>([])
const filterResult = ref('')

// ===== 报告 =====
const genFormat = ref<'word'>('word')
const genTitle = ref('')
const generating = ref(false)
const genProgress = ref('')
const previewHtml = ref('')
const lastReportId = ref<number | null>(null)
const reportReady = ref(false)

// ===== 第 3、4 章可填写内容 =====
const chapterSpecs = ref<RiskChapterSpecs>({ tables: [], texts: [], org_profile_fields: [] })
const chapterData = reactive<RiskChapterData>({ tables: {}, texts: {}, org_profile: {} })
const openChapterTables = ref<string[]>([])

/** 取某张表的行数据（不足最小行数时补空行） */
function chapterRows(key: string): string[][] {
  const spec = chapterSpecs.value.tables.find(t => t.key === key)
  const entry = chapterData.tables[key] || (chapterData.tables[key] = { rows: [] })
  const min = spec?.min_rows ?? 2
  while (entry.rows.length < min) {
    const row: string[] = new Array(spec?.columns.length ?? 0).fill('')
    const preset = spec?.preset_rows?.[entry.rows.length]
    if (preset !== undefined && spec?.columns.length) row[0] = preset
    entry.rows.push(row)
  }
  return entry.rows
}

function addChapterRow(spec: RiskChapterTableSpec) {
  const entry = chapterData.tables[spec.key] || (chapterData.tables[spec.key] = { rows: [] })
  entry.rows.push(new Array(spec.columns.length).fill(''))
}

function removeChapterRow(spec: RiskChapterTableSpec, index: number) {
  const entry = chapterData.tables[spec.key]
  if (!entry || index < 0) return
  entry.rows.splice(index, 1)
}

/** 初始化第3/4章填写结构（保留已保存的内容） */
function initChapterData(saved?: RiskChapterData | null) {
  const t = chapterSpecs.value.tables || []
  const next: RiskChapterData = { tables: {}, texts: {}, org_profile: {} }
  t.forEach(spec => {
    const savedRows = saved?.tables?.[spec.key]?.rows || []
    next.tables[spec.key] = { rows: savedRows.map(r => [...r]) }
  })
  ;(chapterSpecs.value.texts || []).forEach(spec => {
    next.texts[spec.key] = saved?.texts?.[spec.key] || ''
  })
  ;(chapterSpecs.value.org_profile_fields || []).forEach(f => {
    next.org_profile[f.key] = saved?.org_profile?.[f.key] || ''
  })
  Object.keys(chapterData.tables).forEach(k => delete chapterData.tables[k])
  Object.keys(chapterData.texts).forEach(k => delete chapterData.texts[k])
  Object.keys(chapterData.org_profile).forEach(k => delete chapterData.org_profile[k])
  Object.assign(chapterData.tables, next.tables)
  Object.assign(chapterData.texts, next.texts)
  Object.assign(chapterData.org_profile, next.org_profile)
}

async function loadChapterSpecs() {
  try {
    chapterSpecs.value = await getRiskChapterSpecs()
  } catch {
    ElMessage.error('获取章节填写规范失败')
  }
}

// ===== 报告配图 =====
const ASSET_SLOTS: { slot: RiskAssetSlot; label: string; tip: string; field: string }[] = [
  { slot: 'logo', label: '报告页眉 LOGO', tip: '插入报告每页页眉位置', field: 'logo_image' },
  { slot: 'tool_diagram', label: '图 1 工具接入点', tip: '替换模板「图 1 工具接入点」位置', field: 'tool_diagram_image' },
  { slot: 'topology', label: '图 3 网络拓扑图', tip: '替换模板「图 3 XX系统网络拓扑图」位置', field: 'topology_image' },
  { slot: 'dataflow', label: '图 4 数据流程图', tip: '替换模板「图 4 数据流程图」位置', field: 'dataflow_image' },
]
const assetUrls = reactive<Record<string, string>>({})
const assetFileInput = ref<HTMLInputElement | null>(null)
const assetTargetSlot = ref<RiskAssetSlot | ''>('')

function pickAsset(slot: RiskAssetSlot) {
  if (!assessmentId.value) {
    ElMessage.warning('请先保存评估单，再上传配图')
    return
  }
  assetTargetSlot.value = slot
  assetFileInput.value?.click()
}

async function onAssetFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !assessmentId.value) return
  const slot = assetTargetSlot.value as RiskAssetSlot
  if (!isImageExt(file.name)) {
    ElMessage.error('仅支持 PNG / JPEG 格式的图片')
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    ElMessage.error(`图片不能超过 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`)
    return
  }
  try {
    const res = await uploadRiskAsset(assessmentId.value, slot, file)
    const meta = ASSET_SLOTS.find(x => x.slot === slot)
    if (meta) form[meta.field] = res.filename
    await loadAssetPreview(slot)
    ElMessage.success(`${res.desc} 上传成功`)
  } catch (err: any) {
    ElMessage.error(err?.message || '配图上传失败')
  }
}

async function clearAsset(slot: RiskAssetSlot) {
  if (!assessmentId.value) return
  try {
    await deleteRiskAsset(assessmentId.value, slot)
    const meta = ASSET_SLOTS.find(x => x.slot === slot)
    if (meta) form[meta.field] = null
    if (assetUrls[slot]) {
      URL.revokeObjectURL(assetUrls[slot])
      delete assetUrls[slot]
    }
    ElMessage.success('已清除')
  } catch (err: any) {
    ElMessage.error(err?.message || '清除失败')
  }
}

/** 配图读取需带鉴权，走 fetch 取 blob 后转 objectURL */
async function loadAssetPreview(slot: RiskAssetSlot) {
  if (!assessmentId.value) return
  try {
    const token = localStorage.getItem('access_token') || ''
    const resp = await fetch(riskAssetUrl(assessmentId.value, slot), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!resp.ok) return
    const blob = await resp.blob()
    if (assetUrls[slot]) URL.revokeObjectURL(assetUrls[slot])
    assetUrls[slot] = URL.createObjectURL(blob)
  } catch {
    /* 预览失败不影响上传 */
  }
}

async function loadAllAssetPreviews() {
  await Promise.all(
    ASSET_SLOTS.filter((a) => form[a.field]).map((a) => loadAssetPreview(a.slot)),
  )
}

// ============================================================
// 计算
// ============================================================

function dimClauses(dim: string) {
  return framework.value.clauses.filter(c => c.code.split('.').slice(0, 2).join('.') === dim)
}

function visibleClauses(dim: string) {  const all = dimClauses(dim)
  if (!filterResult.value) return all
  return all.filter((c) => {
    const rs = clauseItems(c.code).map((it) => items[itemKey(c.code, it.item_index)]?.result)
    const filled = rs.filter(Boolean)
    if (filterResult.value === 'none') return filled.length < rs.length
    return filled.includes(filterResult.value)
  })
}

/**
 * 按模板附录A 的分组组织逐项检查内容。
 * 分组 = 附录A 的三级标题（如「安全管理制度」），
 * 组内为评估点（条款），与 Word 报告附录A 的表格一一对应。
 */
function visibleGroups(dim: string) {
  const groups = framework.value.clause_groups || []
  return groups
    .filter((g) => g.dimension_code === dim)
    .map((g) => {
      const clauses = g.clause_codes
        .map((code) => framework.value.clauses.find((c) => c.code === code))
        .filter((c): c is RiskClause => !!c)
      let list = clauses
      if (filterResult.value) {
        list = list.filter((c) => {
          const rs = clauseItems(c.code).map((it) => items[itemKey(c.code, it.item_index)]?.result)
          const filled = rs.filter(Boolean)
          if (filterResult.value === 'none') return filled.length < rs.length
          return filled.includes(filterResult.value)
        })
      }
      return { ...g, clauses: list, rowCount: g.row_count }
    })
    .filter((g) => g.clauses.length > 0)
}

/** 某维度下的分组数 */
function dimGroupCount(dim: string) {
  return (framework.value.clause_groups || []).filter((g) => g.dimension_code === dim).length
}

/** items 的键：条款编号#评估项序号 */
function itemKey(code: string, idx: number): string {
  return `${code}#${idx}`
}

/** 某个条款下的全部评估项（对应模板附录A 的每一行） */
function clauseItems(code: string): { item_index: number; k: string; text: string }[] {
  return clauseItemsIndex.value[code] || []
}

function blankItem(code: string, idx = 0): RiskItem {
  return {
    clause_code: code,
    item_index: idx,
    result: null,
    evidence: null,
    suggestion: null,
    risk_type_nos: [],
    risk_desc: null,
    data_involved: null,
    activity_involved: null,
    harm_level: null,
    likelihood_level: null,
    risk_level: null,
    cleared: false,
  }
}

/**
 * 预先为 82 个条款建立空白记录。
 * 模板中直接读 items[code] 而不在渲染期创建属性，避免渲染循环。
 */
function initItems() {
  framework.value.clauses.forEach((cl) => {
    clauseItems(cl.code).forEach((it) => {
      const key = itemKey(cl.code, it.item_index)
      if (!items[key]) items[key] = blankItem(cl.code, it.item_index)
    })
  })
}

/** 条款 -> 评估项列表 的索引，避免每次调用都遍历 clauses */
const clauseItemsIndex = computed(() => {
  const map: Record<string, { item_index: number; k: string; text: string }[]> = {}
  framework.value.clauses.forEach((c) => {
    const out: { item_index: number; k: string; text: string }[] = []
    let i = 0
    ;(c.segments || []).forEach((seg) => {
      ;(seg.items || []).forEach((it) => {
        out.push({ item_index: i++, k: it.k, text: it.text })
      })
    })
    map[c.code] = out
  })
  return map
})

// ============================================================
// 增量保存：记录加载时的快照，判断「本次编辑了哪些条款」
// ============================================================

/** 参与比较的字段（risk_level 由后端按表 4 矩阵计算，不在此列） */
const ITEM_COMPARE_FIELDS = [
  'result', 'evidence', 'suggestion', 'risk_type_nos', 'risk_desc',
  'data_involved', 'activity_involved', 'harm_level', 'likelihood_level',
] as const

/** 条款内容的归一化签名，用于与快照比较 */
function itemSig(it: RiskItem): string {
  return JSON.stringify(ITEM_COMPARE_FIELDS.map((f) => {
    const v = (it as any)[f]
    if (f === 'risk_type_nos') return Array.isArray(v) ? [...v].sort((a, b) => a - b) : []
    return v ?? null
  }))
}

/** 当前已加载内容的快照（条款号 -> 签名） */
const itemsSnapshot = ref<Record<string, string>>({})

/** 记录/刷新快照（加载完成后、保存成功后调用） */
function takeSnapshot() {
  const snap: Record<string, string> = {}
  Object.keys(items).forEach((key) => { snap[key] = itemSig(items[key]) })
  itemsSnapshot.value = snap
}

/** 本次被编辑过的条款（含被取消的条款，只提交这些） */
function dirtyItems(): RiskItem[] {
  const out: RiskItem[] = []
  Object.keys(items).forEach((code) => {
    const it = items[code]
    if (it.cleared) { out.push(it); return }
    if ((itemsSnapshot.value[code] ?? '') !== itemSig(it)) out.push(it)
  })
  return out
}

function itemOf(code: string, idx = 0): RiskItem {
  const key = itemKey(code, idx)
  return items[key] || (items[key] = blankItem(code, idx))
}

/** 展开条款时确保其评估项条目已存在（表单 v-model 需要稳定的对象引用） */
watch(openClauses, (names) => {
  ;(names || []).forEach((code) => {
    clauseItems(code).forEach((it) => {
      const key = itemKey(code, it.item_index)
      if (!items[key]) items[key] = blankItem(code, it.item_index)
    })
  })
}, { immediate: false })

/** 某个评估项是否还有未填内容（用于在逐项检查里高亮） */
function isItemIncomplete(code: string, idx: number): boolean {
  return missingItems.value.some(
    (m) => m.code === code && (m.item_index ?? 0) === idx && m.type === 'item',
  )
}

/** 评估点的评估项进度：已判定 / 总数 */
function clauseProgress(code: string): { done: number; total: number } {
  const list = clauseItems(code)
  const done = list.filter((it) => !!items[itemKey(code, it.item_index)]?.result).length
  return { done, total: list.length }
}

/** 条款下最严重的评估项结论 */
function clauseResult(code: string): string | null {
  const rank: Record<string, number> = { no: 0, part: 1, na: 2, ok: 3 }
  let worst: string | null = null
  clauseItems(code).forEach((it) => {
    const r = items[itemKey(code, it.item_index)]?.result
    if (!r) return
    if (worst === null || (rank[r] ?? 9) < (rank[worst] ?? 9)) worst = r
  })
  return worst
}

/**
 * 判定结论。
 * 再次点击已选中的同一结论 = 取消判定 → 该条款整条作废：
 * 界面回到「未判定」并清空核查情况/整改建议/风险信息，同时打上 cleared 标记；
 * 点保存时前端把该标记提交给后端，后端直接删除该条款记录（而不是写入空值）。
 */
function setResult(code: string, idx: number, value: string) {
  const key = itemKey(code, idx)
  const it = items[key] || (items[key] = blankItem(code, idx))
  if (it.result === value) {
    // 再次点击同一结论 = 取消判定：该评估项的结论、证据与风险信息一并清空
    it.result = null
    it.evidence = null
    it.cleared = true
    it.suggestion = null
    it.risk_type_nos = []
    it.risk_desc = null
    it.data_involved = null
    it.activity_involved = null
    it.harm_level = null
    it.likelihood_level = null
    it.risk_level = null
  } else {
    it.result = value
    it.cleared = false
  }
}

function showRisk(code: string) {
  const r = clauseResult(code)
  return r === 'part' || r === 'no'
}

/** 条款标题上的风险等级：取该条款下最严重评估项的等级（汇总展示） */
function liveLevel(code: string) {
  let worst: any = null
  const rank: Record<string, number> = { no: 0, part: 1, na: 2, ok: 3 }
  clauseItems(code).forEach((ci) => {
    const it = items[itemKey(code, ci.item_index)]
    if (!it || (it.result !== 'no' && it.result !== 'part')) return
    if (!worst || (rank[it.result] ?? 9) < (rank[worst.result] ?? 9)) worst = it
  })
  if (!worst) return ''
  const row = framework.value.risk_matrix[worst.harm_level || '']
  if (!row) return worst.risk_level || ''
  return row[worst.likelihood_level || ''] || worst.risk_level || ''
}


function riskColor(level?: string | null) {
  const map: Record<string, string> = {
    重大安全风险: '#C0392B',
    高安全风险: '#D9480F',
    中安全风险: '#D98E2B',
    低安全风险: '#2E86AB',
    轻微安全风险: '#2E8B57',
  }
  return map[level || ''] || '#5A6B7A'
}

/**
 * 列表「风险等级」列的展示文本：
 * - 未判定（含尚未给出核查结论）→ 未判定
 * - 符合 / 不适用 → 无风险
 * - 部分符合 / 不符合 → 危害程度 × 发生可能性按表 4 实时算出的风险等级
 *   （实时值与保存后后端回写的值同源，均为表 4 矩阵；算不出时退回已保存值）
 */

/** 未判定 / 无风险 用弱化色，真实风险等级用对应风险色 */

const resultCount = computed(() => {
  const c = { ok: 0, part: 0, no: 0, na: 0, none: 0 }
  framework.value.clauses.forEach((cl) => {
    clauseItems(cl.code).forEach((it) => {
      const r = items[itemKey(cl.code, it.item_index)]?.result || 'none'
      if (r in c) c[r as keyof typeof c] += 1
      else c.none += 1
    })
  })
  return c
})

/** 评估项总数（模板附录A 的行数） */
const totalItemCount = computed(() =>
  framework.value.clauses.reduce((n, cl) => n + clauseItems(cl.code).length, 0),
)

const judgedCount = computed(() => totalItemCount.value - resultCount.value.none)
const judgedPct = computed(() =>
  totalItemCount.value
    ? Math.round((judgedCount.value / totalItemCount.value) * 100)
    : 0,
)

/** 编辑页顶部整体进度文案：满 100% 显示「已完成」 */
const overallText = computed(() =>
  judgedPct.value >= 100
    ? '已完成'
    : `${judgedCount.value} / ${totalItemCount.value} 评估项（${judgedPct.value}%）`,
)

// ============================================================
// 完整性校验（与后端 _missing_items 规则保持一致）
// ============================================================

/** 基本信息必填项（对应报告封面、附录 E.2 基本信息表与正文各章节） */
const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: 'org_name', label: '被评估方单位名称' },
  { key: 'credit_code', label: '统一社会信用代码' },
  { key: 'org_address', label: '单位地址' },
  { key: 'postal_code', label: '邮政编码' },
  { key: 'org_type', label: '单位性质' },
  { key: 'industry', label: '所属行业领域' },
  { key: 'data_security_officer', label: '数据安全负责人' },
  { key: 'target_scope', label: '评估对象' },
  { key: 'assess_date', label: '评估日期' },
  { key: 'contact_name', label: '被评估方联系人' },
  { key: 'contact_phone', label: '联系方式' },
  { key: 'assessor_org_name', label: '评估单位名称' },
  { key: 'team_leader', label: '评估组长' },
  { key: 'reviewer', label: '审核人' },
  { key: 'business_info', label: '4.2 业务情况' },
  { key: 'system_info', label: '4.2 信息系统情况' },
  { key: 'data_asset_info', label: '4.3 数据资产情况' },
  { key: 'processing_info', label: '4.4 数据处理活动情况' },
  { key: 'measure_info', label: '4.6 安全措施情况' },
  { key: 'conclusion', label: '6.3 整改建议' },
]

/** 存在风险时必须填写的风险信息（9.2.1 表 1、9.2.2/9.2.3 表 2/表 3） */
const REQUIRED_RISK_FIELDS: { key: string; label: string }[] = [
  { key: 'risk_desc', label: '风险描述' },
  { key: 'data_involved', label: '涉及的数据及类型、级别' },
  { key: 'activity_involved', label: '涉及的数据处理活动' },
  { key: 'harm_level', label: '风险危害程度' },
  { key: 'likelihood_level', label: '风险发生可能性' },
]

interface MissingItem {
  type: 'field' | 'clause' | 'item'
  field?: string
  code?: string
  /** 评估项序号（type='item' 时有效） */
  item_index?: number
  title?: string
  reason?: string
  label: string
}

/** 缺失原因 -> 对应控件的 id 生成规则（点击缺失标签可精准定位到那一栏） */
const MISSING_ANCHOR: Record<string, (code: string, idx: number) => string> = {
  '未判定': (c, i) => `res-${c}-${i}`,
  '缺核查情况/证据': (c, i) => `ev-${c}-${i}`,
  '缺整改建议': (c, i) => `sg-${c}-${i}`,
  '缺风险类型': (c, i) => `rt-${c}-${i}`,
  '缺风险描述': (c, i) => `rd-${c}-${i}`,
  '缺涉及的数据及类型、级别': (c, i) => `di-${c}-${i}`,
  '缺涉及的数据处理活动': (c, i) => `aa-${c}-${i}`,
  '缺风险危害程度': (c, i) => `hl-${c}-${i}`,
  '缺风险发生可能性': (c, i) => `ll-${c}-${i}`,
}

const MISSING_PREVIEW = 24
const showAllMissing = ref(false)
/** 完整性检查的强制刷新计数：进入该页时自增，确保按最新数据重算 */
const checkTick = ref(0)

/** 完整性检查按缺失原因分组统计（评估项级，条目多时避免刷屏） */
const missingGroups = computed(() => {
  const map = new Map<string, { key: string; label: string; count: number }>()
  missingItems.value.forEach((m) => {
    const label = m.type === 'field' ? '基本信息未填' : (m.reason || '其它缺失')
    const cur = map.get(label)
    if (cur) cur.count += 1
    else map.set(label, { key: label, label, count: 1 })
  })
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
})

const shownMissing = computed(() =>
  showAllMissing.value ? missingItems.value : missingItems.value.slice(0, MISSING_PREVIEW),
)

const missingItems = computed<MissingItem[]>(() => {
  void checkTick.value // 建立依赖，进入完整性检查页时自增以强制重算
  const out: MissingItem[] = []
  REQUIRED_FIELDS.forEach((f) => {
    if (!String(form[f.key] || '').trim()) {
      out.push({ type: 'field', field: f.key, label: f.label })
    }
  })
  framework.value.clauses.forEach((cl) => {
    // 1) 逐评估项：每个 a)/b)/c) 都要有结论与证据
    clauseItems(cl.code).forEach((ci) => {
      const it = items[itemKey(cl.code, ci.item_index)]
      if (!it) return
      const result = it.result || ''
      const tag = `${cl.code} ${cl.title} 第${ci.k}项`
      if (!result) {
        out.push({ type: 'item', code: cl.code, item_index: ci.item_index, title: cl.title,
                   reason: '未判定', label: `${tag}：未判定` })
        return
      }
      if (!String(it.evidence || '').trim()) {
        out.push({ type: 'item', code: cl.code, item_index: ci.item_index, title: cl.title,
                   reason: '缺核查情况/证据', label: `${tag}：缺核查情况/证据` })
      }
    })
    // 2) 逐评估项：结论为部分符合/不符合的，风险信息与整改建议必填（取该评估项自身的）
    clauseItems(cl.code).forEach((ci) => {
      const it = items[itemKey(cl.code, ci.item_index)]
      if (!it) return
      if (it.result !== 'part' && it.result !== 'no') return
      const tag = `${cl.code} ${cl.title} 第${ci.k}项`
      const push = (reason: string) => out.push({
        type: 'item', code: cl.code, item_index: ci.item_index, title: cl.title,
        reason, label: `${tag}：${reason}`,
      })
      if (!String(it.suggestion || '').trim()) push('缺整改建议')
      if (!(it.risk_type_nos || []).length) push('缺风险类型')
      REQUIRED_RISK_FIELDS.forEach((f) => {
        const v = it[f.key as keyof RiskItem] as any
        const filled = f.key === 'harm_level' || f.key === 'likelihood_level'
          ? !!v
          : !!String(v || '').trim()
        if (!filled) push(`缺${f.label}`)
      })
    })
  })
  return out
})

/** 列表页进度条的悬浮明细 */
function progressTip(row: RiskAssessment) {
  const p = row.progress
  if (!p) return '暂无进度数据'
  return `已判定 ${p.done}/${p.total} 条款 · 符合 ${p.ok} · 部分符合 ${p.part} · 不符合 ${p.no} · 不适用 ${p.na} · 未判定 ${p.none}`
}

/** 点击缺失项 → 跳转到对应字段/条款 */
async function jumpToMissing(m: MissingItem) {
  if (m.type === 'field') {
    step.value = 0
    await nextTick()
    const el = document.getElementById(`f-${m.field}`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el as HTMLInputElement | null)?.focus?.()
    return
  }
  const code = m.code || ''
  step.value = 2
  const dim = code.split('.').slice(0, 2).join('.')
  if (dim) activeDim.value = dim
  if (code && !openClauses.value.includes(code)) {
    openClauses.value = [...openClauses.value, code]
  }
  await nextTick()
  const idx = m.item_index ?? 0
  const anchor = document.getElementById(MISSING_ANCHOR[m.reason || '']?.(code, idx)
    || `it-${code}-${idx}`) as HTMLElement | null
  anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // 聚焦到具体控件（el-select 需要先点开才能输入，聚焦其 wrapper 即可）
  const focusEl = anchor?.querySelector?.('input, textarea') as HTMLInputElement | null
  focusEl?.focus?.()
}

const dimSummary = computed(() =>
  framework.value.dimensions.map((d) => {
    const cls = dimClauses(d.code)
    const s = { code: d.code, name: d.name, total: cls.length, points: 0, ok: 0, part: 0, no: 0, na: 0, none: 0 }
    cls.forEach((c) => {
      clauseItems(c.code).forEach((ci) => {
        s.points += 1
        const r = items[itemKey(c.code, ci.item_index)]?.result
        if (r === 'ok') s.ok += 1
        else if (r === 'part') s.part += 1
        else if (r === 'no') s.no += 1
        else if (r === 'na') s.na += 1
        else s.none += 1
      })
    })
    return s
  }),
)

const riskRows = computed(() => {
  const rows: any[] = []
  framework.value.clauses.forEach((c) => {
    clauseItems(c.code).forEach((ci) => {
      const it = items[itemKey(c.code, ci.item_index)]
      if (!it) return
      if (it.result !== 'part' && it.result !== 'no') return
      const types = (it.risk_type_nos || [])
        .map(n => framework.value.risk_types.find(t => t.no === n)?.name)
        .filter(Boolean)
        .join('、')
      const row = framework.value.risk_matrix[it.harm_level || '']
      rows.push({
        code: c.code,
        item: ci.text,
        point: c.title,
        types,
        risk_desc: it.risk_desc,
        harm: framework.value.harm_levels.find(h => h.value === it.harm_level)?.label,
        likelihood: framework.value.likelihood_levels.find(l => l.value === it.likelihood_level)?.label,
        level: (row && row[it.likelihood_level || '']) || it.risk_level,
      })
    })
  })
  return rows
})

// ============================================================
// 初始化
// ============================================================

async function loadFramework() {
  try {
    framework.value = await getRiskFramework()
    if (framework.value.dimensions.length) {
      activeDim.value = framework.value.dimensions[0].code
    }
    initItems()
  } catch {
    ElMessage.error('获取评估框架失败')
  }
}

async function loadPrefill() {
  try {
    prefill.value = await getRiskPrefill()
  } catch {
    // 预填失败不影响使用
  }
}

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, any> = { page: page.value, page_size: pageSize.value }
    if (filters.keyword) params.keyword = filters.keyword
    const res = await getRiskAssessments(params)
    list.value = res.items || []
    listTotal.value = res.total || 0
  } catch {
    ElMessage.error('获取评估列表失败')
  } finally {
    listLoading.value = false
  }
}

function onPageChange({ page: p, pageSize: s }: { page: number; pageSize: number }) {
  page.value = p
  pageSize.value = s
  fetchList()
}

onMounted(async () => {
  await loadFramework()
  await loadChapterSpecs()
  initChapterData()
  loadPrefill()
  fetchList()
})

// ============================================================
// 编辑
// ============================================================

function resetForm(keepItems = false) {
  Object.keys(form).forEach((k) => delete form[k])
  if (!keepItems) {
    Object.keys(items).forEach((k) => delete items[k])
    initItems()
  }
  initChapterData()
  Object.assign(form, {
    org_name: '', credit_code: '', org_address: '', postal_code: '', org_type: '',
    industry: '', org_scale: '', data_security_officer: '',
    target_scope: '', target_desc: '',
    contact_name: '', contact_phone: '', contact_title: '', contact_dept: '',
    assessor_org_name: '', assessor_org_address: '', assessor_postal_code: '',
    assessor_contact_name: '', assessor_contact_phone: '',
    team_leader: '', reviewer: '',
    leader_sign_date: '', reviewer_sign_date: '',
    assess_date: new Date().toISOString().slice(0, 10),
    system_name: '',
    logo_image: null, tool_diagram_image: null, topology_image: null, dataflow_image: null,
    business_info: '', system_info: '', data_asset_info: '',
    processing_info: '', measure_info: '',
    assessment_purpose: '', assessment_basis: '', summary: '',
    conclusion: '', residual_risk: '', remark: '',
  })
  takeSnapshot()
}

function startCreate() {
  resetForm()
  assessmentId.value = null
  form.assessment_no = ''
  form.title = ''
  previewHtml.value = ''
  genProgress.value = ''
  lastReportId.value = null
  reportReady.value = false
  step.value = 0
  view.value = 'editor'
}

async function openEditor(id: number) {
  try {
    const data = await getRiskAssessment(id)
    resetForm(true)
    Object.keys(form).forEach((k) => delete form[k])
    Object.keys(data).forEach((k) => {
      if (k !== 'items') form[k] = (data as any)[k]
    })
    assessmentId.value = data.id
    // 直接覆盖已有条目，只删除本次不存在的键（避免先全删再全建造成两轮响应式更新）
    const nextKeys = new Set<string>()
    ;(data.items || []).forEach((it) => {
      const idx = it.item_index || 0
      const key = itemKey(it.clause_code, idx)
      nextKeys.add(key)
      items[key] = {
        clause_code: it.clause_code,
        item_index: idx,
        result: it.result || null,
        evidence: it.evidence || null,
        suggestion: it.suggestion || null,
        risk_type_nos: it.risk_type_nos || [],
        risk_desc: it.risk_desc || null,
        data_involved: it.data_involved || null,
        activity_involved: it.activity_involved || null,
        harm_level: it.harm_level || null,
        likelihood_level: it.likelihood_level || null,
        risk_level: it.risk_level || null,
        cleared: false,
      }
    })
    Object.keys(items).forEach((k) => {
      if (!nextKeys.has(k)) delete items[k]
    })
    takeSnapshot()
    previewHtml.value = ''
    initChapterData((data as any).chapter_data || null)
    await loadAllAssetPreviews()
    genProgress.value = ''
    step.value = 0
    view.value = 'editor'
  } catch {
    ElMessage.error('获取评估详情失败')
  }
}

function backToList() {
  view.value = 'list'
  fetchList()
}

function goStep(i: number) {
  if (i > 0 && !form.org_name) {
    ElMessage.warning('请先填写被评估方单位名称')
    step.value = 0
    return
  }
  step.value = i
  // 进入「汇总与报告」时重算完整性检查，避免沿用旧结果
  if (i === 3) checkTick.value += 1
}

function fillDataAsset() {
  if (!prefill.value) {
    ElMessage.warning('暂未获取到系统数据，请稍后重试')
    return
  }
  const a = prefill.value.assets
  const c = prefill.value.catalog
  const f = prefill.value.file_assets
  const lv = prefill.value.levels || []
  const dist = (c.level_distribution || [])
    .filter((d) => d.count > 0)
    .map((d) => `${d.level_name || d.level_code} ${d.count} 项`)
  const parts = [
    `经梳理，本次评估范围内数据库资产 ${a.total_assets} 个、数据库实例 ${a.total_databases} 个，数据表 ${a.total_tables} 张、字段 ${a.total_columns} 个。`,
    `分类目录共 ${c.category_count} 个分类节点、${c.data_type_count} 个数据类型，分级采用 ${lv.length} 级体系`,
  ]
  if (dist.length) parts.push(`（${dist.join('、')}）`)
  parts.push('。')
  parts.push(
    `已纳入分类分级目录的资产 ${a.classified_assets} 个，覆盖率 ${a.classification_rate}%。`,
  )
  parts.push(
    `非结构化文件资产 ${f.total_file_assets} 个、文件 ${f.total_files} 个、内容块 ${f.total_blocks} 个，` +
      `其中含敏感内容的内容块 ${f.file_sensitive_count} 个，涉及文件资产 ${f.file_sensitive_files} 个。`,
  )
  form.data_asset_info = parts.join('')
  ElMessage.success('已按系统数据填充「4.3 数据资产情况」')
}

const SAVE_FIELDS = [
  'org_name', 'credit_code', 'org_address', 'postal_code', 'org_type', 'industry',
  'org_scale', 'data_security_officer', 'target_scope', 'target_desc',
  'contact_name', 'contact_phone', 'contact_title', 'contact_dept',
  'assessor_org_name', 'assessor_org_address', 'assessor_postal_code',
  'assessor_contact_name', 'assessor_contact_title', 'assessor_contact_phone',
  'team_leader', 'reviewer',
  'leader_sign_date', 'reviewer_sign_date', 'assess_date', 'system_name', 'remark',
  'business_info', 'system_info', 'data_asset_info',
  'processing_info', 'measure_info', 'assessment_purpose', 'assessment_basis',
  'summary', 'conclusion', 'residual_risk',
]

async function saveAll(silent = false) {
  if (!form.org_name) {
    ElMessage.warning('请先填写被评估方单位名称')
    step.value = 0
    return false
  }
  saving.value = true
  try {
    const payload: Record<string, any> = {}
    SAVE_FIELDS.forEach((k) => { payload[k] = form[k] || null })
    payload.title = form.title || `${form.org_name}数据安全风险评估`

    if (!assessmentId.value) {
      const created = await createRiskAssessment(payload)
      assessmentId.value = created.id
      form.assessment_no = created.assessment_no
    } else {
      await updateRiskAssessment(assessmentId.value, payload)
    }

    // 增量保存：只提交本次编辑过的条款（含被取消的条款）
    const batch: RiskItem[] = dirtyItems()
    if (batch.length) {
      await saveRiskItems(assessmentId.value!, batch)
      takeSnapshot()
    }
    if (!silent) ElMessage.success('保存成功')
    return true
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
    return false
  } finally {
    saving.value = false
  }
}

// ============================================================
// 生成报告
// ============================================================

/** 复制一份评估单（含全部结论），可继续编辑 */
async function copyAssessment(row: RiskAssessment) {
  try {
    await ElMessageBox.confirm(
      `将复制「${row.assessment_no}」的全部评估项结论与章节内容，生成一份可继续编辑的新副本。`,
      '复制报告',
      { type: 'info', confirmButtonText: '复制', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    const created = await copyRiskAssessment(row.id)
    ElMessage.success(`已复制为 ${created.assessment_no}`)
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '复制失败')
  }
}


async function handleGenerate() {
  if (!assessmentId.value) {
    ElMessage.warning('请先保存评估')
    return
  }
  // 允许随时导出：信息未填写完整时，报告中未填写的内容留空
  if (missingItems.value.length) {
    ElMessage.warning(`还有 ${missingItems.value.length} 项未填写完整，仍可导出，未填写的内容将留空`)
  }
  const ok = await saveAll(true)
  if (!ok) return

  generating.value = true
  previewHtml.value = ''
  reportReady.value = false
  try {
    const res = await generateRiskReport(assessmentId.value, {
      file_format: genFormat.value,
      title: genTitle.value || undefined,
      description: `评估编号 ${form.assessment_no || ''}`,
    })
    lastReportId.value = res.id
    genProgress.value = '报告正在生成，请稍候…'
    await pollPreview(res.id)
  } catch (e: any) {
    genProgress.value = ''
    ElMessage.error(e?.message || '生成报告失败')
  } finally {
    generating.value = false
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function pollPreview(reportId: number) {
  for (let i = 0; i < 40; i += 1) {
    await sleep(1500)
    try {
      const data = await previewReport(reportId)
      if (data.status === 'completed') {
        previewHtml.value = data.html_content || ''
        genProgress.value = previewHtml.value
          ? '报告已生成，可在下方预览或前往“数据分类分级报告”页签查看/下载'
          : '报告已生成（HTML 预览不可用），请在报告列表下载'
        reportReady.value = true
        ElMessage.success('报告生成成功')
        return
      }
      if (data.status === 'failed') {
        genProgress.value = ''
        ElMessage.error(data.error_message || '报告生成失败')
        return
      }
    } catch {
      // 继续轮询
    }
  }
  genProgress.value = '报告仍在生成中，请稍后在报告中心查看'
}

/** 下载已生成的评估报告（报告在报告中心，类型为 data_security_risk） */
async function downloadAssessmentReport(row: RiskAssessment) {
  if (!row.report_id || row.report_status !== 'completed') {
    // 尚未生成报告：进入编辑器生成后再下载
    ElMessage.info('该评估单尚未生成报告，正在进入评估单生成…')
    await openEditor(row.id)
    step.value = 3
    await nextTick()
    await handleGenerate()
    return
  }
  try {
    await downloadReport(row.report_id)
  } catch (e: any) {
    ElMessage.error(e?.message || '报告下载失败')
  }
}

async function removeAssessment(row: RiskAssessment) {
  try {
    await ElMessageBox.confirm(
      `确认删除评估「${row.assessment_no}」？已生成的报告不会被删除。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteRiskAssessment(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function formatTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.risk-page {
  --brand: #14344F;
  --accent: #2E86AB;
  --teal: #69C8B2;
  --ok: #2E8B57;
  --part: #D98E2B;
  --bad: #C0392B;
  --na: #8A98A6;
  --line: #E3E9EF;
  --muted: #5A6B7A;
}

/* ---------- 列表 ---------- */
.rp-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #14344F 0%, #1F5E8E 100%);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 16px;
  color: #fff;
}
.rp-bar-left { display: flex; align-items: center; gap: 10px; }
.rp-bar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.std-badge {
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 14px;
  padding: 3px 12px;
  font-size: 12px;
  letter-spacing: 0.5px;
}
.std-name { font-size: 14px; letter-spacing: 1px; }

.stat-row {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.stat-item {
  flex: 1;
  min-width: 140px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 18px;
}
.stat-num { font-size: 24px; font-weight: 700; color: var(--brand); line-height: 1.2; }
.stat-cap { font-size: 12px; color: var(--muted); margin-top: 4px; }

/* ---------- 编辑头部 ---------- */
.rp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}
.rp-head-left { display: flex; align-items: center; gap: 12px; }
.rp-head-title { font-size: 15px; font-weight: 600; color: var(--brand); }
.rp-head-no { font-size: 12px; color: var(--muted); }

/* ---------- 步骤条 ---------- */
.stepper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  overflow-x: auto;
}
.stepper-item {
  flex: 1 0 auto;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.stepper-item.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(46, 134, 171, 0.12);
}
.stepper-item.done { border-color: var(--teal); }
.stepper-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #EEF3F7;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}
.stepper-item.active .stepper-dot { background: var(--accent); color: #fff; }
.stepper-item.done .stepper-dot { background: var(--teal); color: #fff; }
.stepper-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand);
  white-space: nowrap;
}
.stepper-desc {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}

/* ---------- 卡片 ---------- */
.pane { padding-bottom: 60px; }
.card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 14px;
  overflow: hidden;
}
.card-hd {
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand);
  background: #F8FAFC;
  border-bottom: 1px solid var(--line);
  border-left: 4px solid var(--accent);
}
.card-hd-sub { font-size: 12px; color: var(--muted); font-weight: 400; margin-left: 10px; }
.card-bd { padding: 16px 18px; }
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
}
.prefill-box {
  margin-top: 8px;
  background: #F4F8FB;
  border: 1px dashed #C9D4DE;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ===== 报告配图 ===== */
.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.asset-item {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.asset-item-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.asset-item-info {
  color: var(--muted);
  cursor: help;
}
.asset-preview-box {
  height: 120px;
  border: 1px dashed var(--line);
  border-radius: 6px;
  background: #FAFCFD;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.asset-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.asset-empty {
  font-size: 12px;
  color: var(--muted);
}
.asset-ops {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.asset-file {
  font-size: 11px;
  color: var(--muted);
  word-break: break-all;
}
.asset-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}
.preview-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-size: 13px;
  color: var(--muted);
}

/* ---------- 逐项检查 ---------- */
.check-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 18px;
  margin-bottom: 12px;
}
.check-progress { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--muted); }
.check-progress b { color: var(--brand); font-size: 15px; }
.check-legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); }
.lg { display: inline-flex; align-items: center; gap: 5px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.ok { background: var(--ok); }
.dot.part { background: var(--part); }
.dot.no { background: var(--bad); }
.dot.na { background: var(--na); }

.dim-label { display: inline-flex; align-items: center; gap: 8px; }
.dim-desc {
  font-size: 12px;
  color: var(--muted);
  background: #F7FAFC;
  border-left: 3px solid var(--teal);
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

/* ===== 第3/4章填写 ===== */
.ch-block {
  margin-bottom: 16px;
}
.ch-block-hd {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  padding: 6px 0 8px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 10px;
}
.ch-title {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}
.cht-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}
.cht-count {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--muted);
}
/* 折叠标题完整显示，不被 Element Plus 默认样式裁切 */
.chapter-tables :deep(.el-collapse-item__header) {
  overflow: visible;
  height: auto;
  min-height: 48px;
  line-height: 1.5;
  padding: 10px 0;
  align-items: center;
}
.chapter-tables :deep(.el-collapse-item__content) {
  overflow: visible;
}
.ch-tbl-wrap {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 8px;
}
.ch-tbl {
  width: max-content;
  min-width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 12px;
}
.ch-tbl th {
  background: #F4F8FA;
  color: #5B6B7A;
  font-weight: 600;
  padding: 6px 8px;
  border: 1px solid var(--line);
  white-space: nowrap;
  width: max-content;
  min-width: 88px;
}
.ch-tbl td {
  padding: 3px;
  border: 1px solid var(--line);
  vertical-align: middle;
  min-width: 96px;
}
.ch-tbl td .el-input {
  width: 100%;
  min-width: 88px;
}
.ch-ops {
  display: flex;
  gap: 8px;
}

/* ===== 附录A 分组 ===== */
.clause-group {
  margin-bottom: 16px;
}
.clause-group-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: #EEF4F8;
  border-left: 3px solid var(--teal);
  border-radius: 4px;
  font-size: 13px;
}
.cg-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--muted);
}
.cg-title {
  font-weight: 600;
  color: var(--text);
}
.cg-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
}

.clause-list {
  border-top: 1px solid var(--line);
}

/* 评估点列表列栅格：表头 .cl-head 与每行 .clause-title 共用同一套列定义，逐列严格对齐。
   三列：评估点编号 | 评估点 | 评估项进度（结论与风险等级逐评估项填写，不在大项行展示）。
   Element Plus 折叠头右侧自带 8px padding + 16px 展开箭头，故表头补 24px 右留白。 */
.cl-head,
.clause-title {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 110px;
  align-items: center;
  column-gap: 12px;
  width: 100%;
}
.cl-head {
  padding: 9px 24px 9px 0;
  margin-bottom: 2px;
  background: #F4F8FA;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  color: #5B6B7A;  text-align: center;
}
.cl-head .c-name { text-align: left; }

/* 折叠头本身也改为栅格：(标题 | 箭头)，避免标题区宽度被箭头挤压错位 */
.clause-list :deep(.el-collapse-item__header) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
  align-items: center;
  padding-right: 8px;
}
.clause-list :deep(.el-collapse-item__title) { min-width: 0; }

.c-code, .progress-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--accent);
}
.progress-num.done { color: var(--teal); }
.c-pts { text-align: center; }
.c-res, .c-risk { text-align: center; }
.clause-code {
  justify-self: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--accent);
  background: #EAF3F8;
  border-radius: 4px;
  padding: 1px 7px;
}
.clause-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.clause-points { font-size: 11px; color: var(--na); font-variant-numeric: tabular-nums; }
.res-chip {
  display: inline-block;
  min-width: 68px;
  line-height: 18px;
  font-size: 11px;
  border-radius: 9px;
  color: #fff;
  background: var(--na);
}
.res-chip.ok { background: var(--ok); }
.res-chip.part { background: var(--part); }
.res-chip.no { background: var(--bad); }
.res-chip.na { background: var(--na); }
.res-chip.none { background: #DCE3E9; }
.risk-chip { font-size: 12px; font-weight: 700; white-space: nowrap; }
.risk-chip.risk-muted { color: #9AA7B2 !important; font-weight: 400; }

.standard {
  background: #FAFCFD;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 14px;
}
.std-intro { font-size: 12.5px; color: var(--brand); font-weight: 600; margin-bottom: 6px; }
/* 评估项原文自带「a）」「b）」序号（与模板附录A 一致），不再叠加列表编号 */
.std-items { margin: 0; padding-left: 0; list-style: none; }
.std-items li { font-size: 12.5px; color: #34495E; line-height: 1.85; }

/* 逐评估项核查卡片 */
.std-item {
  border: 1px solid var(--line);
  border-left: 3px solid #C6D2DC;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #FCFDFE;
}
.std-item.done {
  border-left-color: var(--teal);
  background: #F7FBFD;
}
/* 仍有未填写内容的评估项：高亮提示 */
.std-item.need-fill {
  border-left-color: #e6a23c;
  background: #FFFBF2;
}
.std-item.need-fill .std-item-txt {
  color: #b88230;
}
.std-item-txt {
  font-size: 12.5px;
  color: #34495E;
  line-height: 1.8;
  margin-bottom: 6px;
}
.std-item-judge {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.std-item-judge .opt-group { margin-bottom: 2px; }

.judge { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.judge-lab { font-size: 12.5px; color: var(--muted); }
.opt-group { display: flex; gap: 10px; flex-wrap: wrap; }
.opt {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  color: #34495E;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
  user-select: none;
}
.opt:hover { border-color: #B9CBD9; }
.opt-dot { width: 9px; height: 9px; border-radius: 50%; background: #D5DEE6; }
.opt.ok.sel { border-color: var(--ok); color: var(--ok); background: #EFF8F2; }
.opt.ok.sel .opt-dot { background: var(--ok); }
.opt.part.sel { border-color: var(--part); color: var(--part); background: #FDF5E9; }
.opt.part.sel .opt-dot { background: var(--part); }
.opt.no.sel { border-color: var(--bad); color: var(--bad); background: #FBEDEC; }
.opt.no.sel .opt-dot { background: var(--bad); }
.opt.na.sel { border-color: var(--na); color: var(--na); background: #F2F4F6; }
.opt.na.sel .opt-dot { background: var(--na); }

.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
@media (max-width: 900px) {
  .field-grid { grid-template-columns: 1fr; }
}
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; color: var(--muted); }

.risk-block {
  margin-top: 14px;
  border: 1px solid #E8DFD0;
  background: #FFFDF8;
  border-radius: 8px;
  padding: 12px 16px;
}
.risk-hd {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--part);
  margin-bottom: 10px;
}
.matrix-input { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.times, .eq { color: var(--na); font-size: 13px; }
.matrix-out {
  font-size: 13px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 6px;
  background: #F4F8FB;
  border: 1px solid var(--line);
}
.rt-opt { display: flex; flex-direction: column; line-height: 1.35; padding: 2px 0; }
.rt-opt b { font-size: 12.5px; color: var(--brand); }
.rt-opt span { font-size: 11px; color: var(--na); white-space: normal; }

/* ---------- 汇总表 ---------- */
.sum-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.sum-tbl th, .sum-tbl td {
  border: 1px solid var(--line);
  padding: 8px 10px;
  text-align: left;
}
.sum-tbl th { background: #F0F4F8; font-weight: 700; color: var(--brand); text-align: center; }
.sum-tbl td.c { text-align: center; }
.sum-tbl tr.total td { background: #F8FAFC; font-weight: 700; }

/* 列表页进度条 */
.list-progress { width: 100%; padding-right: 8px; }
/* 自绘进度条：填充层随进度增长，文字层居中覆盖在整条轨道上 */
.lp-track {
  position: relative;
  height: 20px;
  border-radius: 10px;
  background: var(--el-border-color-lighter);
  overflow: hidden;
}
.lp-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--el-color-primary);
  border-radius: 10px;
  transition: width .6s;
}
.lp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  font-weight: 500;
  color: var(--el-text-color-regular);
}
.lp-text.on-fill { color: #fff; }

/* 编辑页顶部整体核查进度 */
.overall-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: #F7FAFC;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.ob-label { font-size: 13px; font-weight: 600; color: var(--ink); }
.ob-text { font-size: 13px; color: var(--muted); }
.ob-text.done { color: var(--ok); font-weight: 700; }
.ob-legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); }

/* 完整性检查 */
.cs-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 8px;
}
.cs-group {
  font-weight: 600;
}
.check-state {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
}
.check-state.ok { background: #F2FAF5; border-color: #CDEBD8; }
.check-state.bad { background: #FDF6F5; border-color: #F3D3CF; }
.cs-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.check-state.ok .cs-hd { color: var(--ok); }
.check-state.bad .cs-hd { color: var(--bad); }
.cs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  max-height: 168px;
  overflow-y: auto;
}
.cs-item { cursor: pointer; }
.cs-item:hover { color: var(--bad); }
.gen-btn-wrap { display: inline-flex; }

.gen-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.gen-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--accent);
}
.preview-wrap { margin-top: 14px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.preview-frame { width: 100%; height: 620px; border: 0; background: #fff; }

.footer-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(4px);
}

.action-btns { display: flex; gap: 4px; }
</style>

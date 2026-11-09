<template>
  <div class="risk-page">

    <!-- ================= 列表视图 ================= -->
    <template v-if="view === 'list'">
      <div class="rp-bar">
        <div class="rp-bar-left">
          <span class="std-badge">GB/T 45577—2025</span>
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
          <div class="stat-cap">核查要点</div>
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
        <el-table-column prop="assess_date" label="评估日期" width="120">
          <template #default="{ row }">{{ row.assess_date || '—' }}</template>
        </el-table-column>
        <el-table-column prop="created_by" label="创建人" width="110">
          <template #default="{ row }">{{ row.created_by || '—' }}</template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button type="primary" link size="small" @click="openEditor((row as RiskAssessment).id)">
                编辑
              </el-button>
              <el-button type="success" link size="small" @click="quickGenerate(row as RiskAssessment)">
                生成报告
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
          <div class="card-hd">一、被评估方信息<span class="card-hd-sub">附录 E.2 基本信息表</span></div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px" size="default">
              <div class="grid-2">
                <el-form-item label="单位名称">
                  <el-input v-model="form.org_name" placeholder="被评估方单位全称" />
                </el-form-item>
                <el-form-item label="统一社会信用代码">
                  <el-input v-model="form.credit_code" placeholder="18 位统一社会信用代码" />
                </el-form-item>
                <el-form-item label="单位地址">
                  <el-input v-model="form.org_address" />
                </el-form-item>
                <el-form-item label="邮政编码">
                  <el-input v-model="form.postal_code" />
                </el-form-item>
                <el-form-item label="单位性质">
                  <el-input v-model="form.org_type" placeholder="如：企业 / 事业单位" />
                </el-form-item>
                <el-form-item label="所属行业领域">
                  <el-input v-model="form.industry" placeholder="如：金融 / 医疗 / 政务" />
                </el-form-item>
                <el-form-item label="人员/业务规模">
                  <el-input v-model="form.org_scale" placeholder="如：2000 人，日均处理 100 万条" />
                </el-form-item>
                <el-form-item label="数据安全负责人">
                  <el-input v-model="form.data_security_officer" />
                </el-form-item>
              </div>
              <el-form-item label="评估对象">
                <el-input v-model="form.target_scope" placeholder="如：核心业务系统及承载的数据资产" />
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
                <el-form-item label="姓名"><el-input v-model="form.contact_name" /></el-form-item>
                <el-form-item label="联系方式"><el-input v-model="form.contact_phone" /></el-form-item>
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
                  <el-input v-model="form.assessor_org_name" />
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
                <el-form-item label="评估日期">
                  <el-input v-model="form.assess_date" placeholder="YYYY-MM-DD" />
                </el-form-item>
                <el-form-item label="评估组长">
                  <el-input v-model="form.team_leader" />
                </el-form-item>
                <el-form-item label="评估组长日期">
                  <el-input v-model="form.leader_sign_date" placeholder="YYYY-MM-DD" />
                </el-form-item>
                <el-form-item label="审核人">
                  <el-input v-model="form.reviewer" />
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
            <span class="card-hd-sub">第 7 章 信息调研</span>
          </div>
          <div class="card-bd">
            <el-form :model="form" label-width="130px" label-position="top">
              <el-form-item label="7.2 业务和信息系统情况">
                <el-input v-model="form.business_info" type="textarea" :rows="3" placeholder="业务情况说明" />
                <el-input
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
                    7.3 数据资产情况
                    <el-button link type="primary" size="small" @click="fillDataAsset">
                      按系统数据填充
                    </el-button>
                  </span>
                </template>
                <el-input v-model="form.data_asset_info" type="textarea" :rows="4" placeholder="数据结构与数量、数据分布、数据关联关系等" />
                <div v-if="prefill" class="prefill-box">
                  <span>数据库资产 {{ prefill.assets.total_assets }} 个 · 表 {{ prefill.assets.total_tables }} 张 · 字段 {{ prefill.assets.total_columns }} 个</span>
                  <span>已确认分类分级字段 {{ prefill.assets.classified_count }} 个（覆盖率 {{ prefill.assets.classification_rate }}%）</span>
                  <span>文件资产 {{ prefill.file_assets.total_file_assets }} 个 · 文件 {{ prefill.file_assets.total_files }} 个 · 内容块 {{ prefill.file_assets.total_blocks }} 个</span>
                </div>
              </el-form-item>
              <el-form-item label="7.4 数据处理活动情况">
                <el-input v-model="form.processing_info" type="textarea" :rows="3" placeholder="数据收集、存储、传输、使用和加工、提供、公开、删除等环节说明" />
              </el-form-item>
              <el-form-item label="7.5 安全防护措施情况">
                <el-input v-model="form.measure_info" type="textarea" :rows="3" placeholder="安全测评认证、安全管理机构与人员、制度及技术措施等" />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">五、评估概述与结论<span class="card-hd-sub">第 9 章 / 第 10 章</span></div>
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
              <el-form-item label="10.2 风险处置建议">
                <el-input v-model="form.conclusion" type="textarea" :rows="2" />
              </el-form-item>
              <el-form-item label="10.3 残余风险分析">
                <el-input v-model="form.residual_risk" type="textarea" :rows="2" />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

      <!-- ============ 步骤 2：逐项检查 ============ -->
      <div v-show="step === 1" class="pane">
        <div class="check-bar">
          <div class="check-progress">
            <span>已判定 <b>{{ judgedCount }}</b> / {{ frameworkInfo.clause_count }} 条</span>
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
                <el-tag size="small" type="info" round>{{ dimClauses(d.code).length }}</el-tag>
              </span>
            </template>

            <div class="dim-desc">{{ d.desc }}</div>

            <!-- 列标题：与条款行共用同一套栅格，保证逐列严格对齐 -->
            <div class="cl-head">
              <span class="c-code">条款编号</span>
              <span class="c-name">条款名称</span>
              <span class="c-pts">要点数量</span>
              <span class="c-res">核查结论</span>
              <span class="c-risk">风险等级</span>
            </div>

            <el-collapse v-model="openClauses" class="clause-list">
              <el-collapse-item
                v-for="c in visibleClauses(d.code)"
                :key="c.code"
                :name="c.code"
              >
                <template #title>
                  <div class="clause-title">
                    <span class="c-code clause-code">{{ c.code }}</span>
                    <span class="c-name clause-name">{{ c.title }}</span>
                    <span class="c-pts clause-points">{{ c.item_count }}</span>
                    <span class="c-res">
                      <span
                        class="res-chip"
                        :class="itemOf(c.code).result || 'none'"
                      >{{ resultLabel(itemOf(c.code).result) }}</span>
                    </span>
                    <span
                      class="c-risk risk-chip"
                      :class="{ 'risk-muted': riskIsMuted(c.code) }"
                      :style="{ color: riskColor(riskText(c.code)) }"
                    >{{ riskText(c.code) }}</span>
                  </div>
                </template>

                <!-- 条款原文（只读，标准内容不可修改） -->
                <div class="standard">
                  <div v-for="(seg, si) in c.segments" :key="si" class="std-seg">
                    <div class="std-intro">{{ seg.intro }}</div>
                    <ol class="std-items">
                      <li v-for="it in seg.items" :key="it.k">
                        <span class="std-k">{{ it.k }})</span>{{ it.text }}
                      </li>
                    </ol>
                  </div>
                </div>

                <!-- 核查判定 -->
                <div class="judge">
                  <div class="judge-lab">核查结论</div>
                  <div class="opt-group">
                    <div
                      v-for="o in framework.result_options"
                      :key="o.value"
                      class="opt"
                      :class="[o.value, { sel: itemOf(c.code).result === o.value }]"
                      @click="setResult(c.code, o.value)"
                    >
                      <i class="opt-dot"></i>{{ o.label }}
                    </div>
                  </div>
                </div>

                <div class="field-grid">
                  <div class="field">
                    <label>核查情况 / 证据</label>
                    <el-input
                      v-model="itemOf(c.code).evidence"
                      type="textarea"
                      :rows="2"
                      placeholder="文档查阅、人员访谈、安全核查、技术测试情况"
                    />
                  </div>
                  <div class="field">
                    <label>整改建议</label>
                    <el-input
                      v-model="itemOf(c.code).suggestion"
                      type="textarea"
                      :rows="2"
                      placeholder="针对不符合/部分符合项的整改建议"
                    />
                  </div>
                </div>

                <!-- 风险信息（附录 B 表 B.1 与 9.2 分析） -->
                <div v-if="showRisk(c.code)" class="risk-block">
                  <div class="risk-hd">风险信息（第 9 章 风险分析与评价）</div>
                  <div class="field-grid">
                    <div class="field">
                      <label>风险类型（附录 B 表 B.1）</label>
                      <el-select
                        v-model="itemOf(c.code).risk_type_nos"
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
                      <el-input v-model="itemOf(c.code).data_involved" placeholder="如：客户个人信息，一般数据/重要数据" />
                    </div>
                    <div class="field">
                      <label>风险描述</label>
                      <el-input v-model="itemOf(c.code).risk_desc" type="textarea" :rows="2" />
                    </div>
                    <div class="field">
                      <label>风险源描述</label>
                      <el-input v-model="itemOf(c.code).source_desc" type="textarea" :rows="2" />
                    </div>
                    <div class="field">
                      <label>涉及的数据处理活动</label>
                      <el-input v-model="itemOf(c.code).activity_involved" placeholder="如：数据存储、数据传输" />
                    </div>
                    <div class="field">
                      <label>风险危害程度（表 2）/ 发生可能性（表 3）</label>
                      <div class="matrix-input">
                        <el-select
                          v-model="itemOf(c.code).harm_level"
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
                          v-model="itemOf(c.code).likelihood_level"
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
              </el-collapse-item>
            </el-collapse>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- ============ 步骤 3：汇总与生成 ============ -->
      <div v-show="step === 2" class="pane">
        <div class="card">
          <div class="card-hd">核查情况汇总</div>
          <div class="card-bd">
            <table class="sum-tbl">
              <thead>
                <tr>
                  <th>方面</th>
                  <th>评估方面</th>
                  <th>条款数</th>
                  <th>核查要点</th>
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
          <div class="card-hd">数据安全风险清单（9.4 表 5）</div>
          <div class="card-bd">
            <el-empty v-if="!riskRows.length" description="暂无风险记录，请先在“逐项检查”中填写风险信息" :image-size="70" />
            <table v-else class="sum-tbl">
              <thead>
                <tr>
                  <th style="width: 48px">序号</th>
                  <th style="width: 110px">条款</th>
                  <th>风险类型</th>
                  <th>风险描述</th>
                  <th style="width: 80px">危害程度</th>
                  <th style="width: 80px">可能性</th>
                  <th style="width: 100px">风险等级</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in riskRows" :key="r.code">
                  <td class="c">{{ i + 1 }}</td>
                  <td class="c">{{ r.code }}</td>
                  <td>{{ r.types || '—' }}</td>
                  <td>{{ r.risk_desc || '—' }}</td>
                  <td class="c">{{ r.harm || '—' }}</td>
                  <td class="c">{{ r.likelihood || '—' }}</td>
                  <td class="c" :style="{ color: riskColor(r.level), fontWeight: 700 }">{{ r.level || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">生成报告</div>
          <div class="card-bd">
            <div class="gen-row">
              <el-radio-group v-model="genFormat" size="default">
                <el-radio value="pdf">PDF</el-radio>
                <el-radio value="html">HTML</el-radio>
              </el-radio-group>
              <el-input
                v-model="genTitle"
                placeholder="报告标题（不填写则自动生成）"
                style="width: 340px"
              />
              <el-button type="primary" :loading="generating" @click="handleGenerate">
                <el-icon style="margin-right: 4px"><Document /></el-icon>生成报告
              </el-button>
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
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <el-button v-if="step > 0" @click="goStep(step - 1)">上一步</el-button>
        <el-button v-if="step < 2" type="primary" @click="goStep(step + 1)">下一步</el-button>
        <el-button type="primary" plain :loading="saving" @click="saveAll()">保存评估</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, ArrowLeft, Select, Document, Loading, Download,
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
  type RiskFramework,
  type RiskPrefill,
  type RiskAssessment,
  type RiskItem,
} from '@/api/riskAssessment'
import { previewReport, downloadReport } from '@/api/reports'

const STEPS = [
  { key: 'basic', title: '基本信息', desc: '附录 E.2 与被评估方信息' },
  { key: 'check', title: '逐项检查', desc: '附录 A 82 条款 / 400 要点' },
  { key: 'report', title: '汇总与报告', desc: '风险清单与 PDF 生成' },
]

// ===== 视图 =====
const view = ref<'list' | 'editor'>('list')
const step = ref(0)

// ===== 框架 =====
const framework = ref<RiskFramework>({
  standard_no: 'GB/T 45577-2025',
  standard_name: '数据安全技术 数据安全风险评估方法',
  dimensions: [],
  clauses: [],
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
const genFormat = ref<'pdf' | 'html'>('pdf')
const genTitle = ref('')
const generating = ref(false)
const genProgress = ref('')
const previewHtml = ref('')
const lastReportId = ref<number | null>(null)
const reportReady = ref(false)

// ============================================================
// 计算
// ============================================================

function dimClauses(dim: string) {
  return framework.value.clauses.filter(c => c.code.split('.').slice(0, 2).join('.') === dim)
}

function visibleClauses(dim: string) {  const all = dimClauses(dim)
  if (!filterResult.value) return all
  return all.filter((c) => {
    const r = itemOf(c.code).result
    if (filterResult.value === 'none') return !r
    return r === filterResult.value
  })
}

function blankItem(code: string): RiskItem {
  return {
    clause_code: code,
    result: null,
    evidence: null,
    suggestion: null,
    risk_type_nos: [],
    risk_desc: null,
    source_desc: null,
    data_involved: null,
    activity_involved: null,
    harm_level: null,
    likelihood_level: null,
    risk_level: null,
  }
}

/**
 * 预先为 82 个条款建立空白记录。
 * 模板中直接读 items[code] 而不在渲染期创建属性，避免渲染循环。
 */
function initItems() {
  framework.value.clauses.forEach((cl) => {
    if (!items[cl.code]) items[cl.code] = blankItem(cl.code)
  })
}

function itemOf(code: string): RiskItem {
  return items[code] || (items[code] = blankItem(code))
}

function setResult(code: string, value: string) {
  const it = itemOf(code)
  it.result = it.result === value ? null : value
}

function showRisk(code: string) {
  const r = itemOf(code).result
  return r === 'part' || r === 'no'
}

function liveLevel(code: string) {
  const it = itemOf(code)
  const row = framework.value.risk_matrix[it.harm_level || '']
  if (!row) return ''
  return row[it.likelihood_level || ''] || ''
}

function resultLabel(v?: string | null) {
  const o = framework.value.result_options.find(x => x.value === v)
  return o ? o.label : '未判定'
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
function riskText(code: string) {
  const it = itemOf(code)
  const r = it.result
  if (!r) return '未判定'
  if (r === 'ok' || r === 'na') return '无风险'
  return liveLevel(code) || it.risk_level || '未判定'
}

/** 未判定 / 无风险 用弱化色，真实风险等级用对应风险色 */
function riskIsMuted(code: string) {
  const r = itemOf(code).result
  return !r || r === 'ok' || r === 'na'
}

const resultCount = computed(() => {
  const c = { ok: 0, part: 0, no: 0, na: 0, none: 0 }
  framework.value.clauses.forEach((cl) => {
    const r = items[cl.code]?.result || 'none'
    if (r in c) c[r as keyof typeof c] += 1
    else c.none += 1
  })
  return c
})

const judgedCount = computed(() => framework.value.clause_count - resultCount.value.none)
const judgedPct = computed(() =>
  framework.value.clause_count
    ? Math.round((judgedCount.value / framework.value.clause_count) * 100)
    : 0,
)

const dimSummary = computed(() =>
  framework.value.dimensions.map((d) => {
    const cls = dimClauses(d.code)
    const s = { code: d.code, name: d.name, total: cls.length, points: 0, ok: 0, part: 0, no: 0, na: 0, none: 0 }
    cls.forEach((c) => {
      s.points += c.item_count
      const r = items[c.code]?.result
      if (r === 'ok') s.ok += 1
      else if (r === 'part') s.part += 1
      else if (r === 'no') s.no += 1
      else if (r === 'na') s.na += 1
      else s.none += 1
    })
    return s
  }),
)

const riskRows = computed(() => {
  const rows: any[] = []
  framework.value.clauses.forEach((c) => {
    const it = items[c.code]
    if (!it) return
    const hasRisk = !!(it.risk_desc || it.source_desc || (it.risk_type_nos && it.risk_type_nos.length))
    if (it.result !== 'part' && it.result !== 'no' && !hasRisk) return
    if (!hasRisk && !it.risk_desc) return
    const types = (it.risk_type_nos || [])
      .map(n => framework.value.risk_types.find(t => t.no === n)?.name)
      .filter(Boolean)
      .join('、')
    rows.push({
      code: c.code,
      types,
      risk_desc: it.risk_desc,
      harm: framework.value.harm_levels.find(h => h.value === it.harm_level)?.label,
      likelihood: framework.value.likelihood_levels.find(l => l.value === it.likelihood_level)?.label,
      level: liveLevel(c.code) || it.risk_level,
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
  loadPrefill()
  fetchList()
})

// ============================================================
// 编辑
// ============================================================

function resetForm() {
  Object.keys(form).forEach((k) => delete form[k])
  Object.keys(items).forEach((k) => delete items[k])
  initItems()
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
    business_info: '', system_info: '', data_asset_info: '',
    processing_info: '', measure_info: '',
    assessment_purpose: '', assessment_basis: '', summary: '',
    conclusion: '', residual_risk: '', remark: '',
  })
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
    resetForm()
    Object.keys(form).forEach((k) => delete form[k])
    Object.keys(data).forEach((k) => {
      if (k !== 'items') form[k] = (data as any)[k]
    })
    assessmentId.value = data.id
    Object.keys(items).forEach((k) => delete items[k])
    ;(data.items || []).forEach((it) => {
      items[it.clause_code] = {
        clause_code: it.clause_code,
        result: it.result || null,
        evidence: it.evidence || null,
        suggestion: it.suggestion || null,
        risk_type_nos: it.risk_type_nos || [],
        risk_desc: it.risk_desc || null,
        source_desc: it.source_desc || null,
        data_involved: it.data_involved || null,
        activity_involved: it.activity_involved || null,
        harm_level: it.harm_level || null,
        likelihood_level: it.likelihood_level || null,
        risk_level: it.risk_level || null,
      }
    })
    previewHtml.value = ''
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
}

function fillDataAsset() {
  if (!prefill.value) {
    ElMessage.warning('暂未获取到系统数据')
    return
  }
  const a = prefill.value.assets
  const c = prefill.value.catalog
  const f = prefill.value.file_assets
  form.data_asset_info = [
    `经梳理，本次评估范围内数据库资产 ${a.total_assets} 个、数据库实例 ${a.total_databases} 个，`,
    `数据表 ${a.total_tables} 张、字段 ${a.total_columns} 个；`,
    `已确认分类分级字段 ${a.classified_count} 个（分类分级覆盖率 ${a.classification_rate}%），`,
    `其中敏感字段 ${a.sensitive_count} 个。`,
    `分类目录共 ${c.category_count} 个分类节点、${c.data_type_count} 个数据类型，`,
    `分级采用 ${prefill.value.levels.length} 级体系。`,
    `非结构化文件资产 ${f.total_file_assets} 个、文件 ${f.total_files} 个、内容块 ${f.total_blocks} 个，`,
    `其中含敏感内容的内容块 ${f.file_sensitive_count} 个，涉及文件 ${f.file_sensitive_files} 个。`,
  ].join('')
}

const SAVE_FIELDS = [
  'org_name', 'credit_code', 'org_address', 'postal_code', 'org_type', 'industry',
  'org_scale', 'data_security_officer', 'target_scope', 'target_desc',
  'contact_name', 'contact_phone', 'contact_title', 'contact_dept',
  'assessor_org_name', 'assessor_org_address', 'assessor_postal_code',
  'assessor_contact_name', 'assessor_contact_phone', 'team_leader', 'reviewer',
  'leader_sign_date', 'reviewer_sign_date', 'assess_date', 'remark', 'business_info', 'system_info', 'data_asset_info',
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

    const batch: RiskItem[] = Object.values(items).filter(
      it => it.result || it.risk_desc || it.source_desc || (it.risk_type_nos && it.risk_type_nos.length),
    )
    if (batch.length) {
      await saveRiskItems(assessmentId.value!, batch)
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

async function quickGenerate(row: RiskAssessment) {
  assessmentId.value = row.id
  step.value = 2
  view.value = 'editor'
  await openEditor(row.id)
  step.value = 2
}

async function handleGenerate() {
  if (!assessmentId.value) {
    ElMessage.warning('请先保存评估')
    return
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
}
.stepper-item {
  flex: 1;
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
.stepper-title { font-size: 14px; font-weight: 600; color: var(--brand); }
.stepper-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

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

.clause-list {
  border-top: 1px solid var(--line);
}

/* 条款列表列栅格：表头 .cl-head 与每行 .clause-title 共用同一套列定义，逐列严格对齐。
   Element Plus 折叠头右侧自带 8px padding + 16px 展开箭头，故表头补 24px 右留白，
   使两者内容区宽度一致。 */
.cl-head,
.clause-title {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 84px 92px 116px;
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
  color: #5B6B7A;
  text-align: center;
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

.c-code, .c-pts { text-align: center; }
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
.std-items { margin: 0; padding-left: 20px; }
.std-items li { font-size: 12.5px; color: #34495E; line-height: 1.85; }
.std-k { color: var(--accent); margin-right: 4px; }

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

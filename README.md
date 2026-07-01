# MDCGS - 数据分类分级系统

> 企业级数据资产分类分级管理平台，帮助组织实现数据资产标准化管理、合规审计与可视化洞察。

## ✨ 项目亮点

- **前后端分离架构**：前端 Vue 3 + Vite，后端 FastAPI，性能优异，开发体验良好
- **可视化数据分类**：支持多维度数据资产分类分级，配置灵活
- **完整的审计日志**：所有操作全程留痕，满足合规要求
- **多维度统计报表**：ECharts 可视化图表，数据态势一目了然
- **异步任务队列**：基于 Celery + Redis 的异步任务机制，大批量操作不卡顿
- **容器化部署**：Docker & Docker Compose 一键部署，开箱即用
- **LDAP 集成**：支持企业 LDAP 身份认证，无缝对接现有账户体系

## 🎯 解决的问题 / 适用场景

- **数据治理合规**：满足《数据安全法》《个人信息保护法》等法规对数据分类分级的要求
- **数据资产梳理**：对企业内部数据资产进行全面梳理，建立资产台账
- **权限与审计**：细粒度权限控制 + 全操作审计，追踪数据流转
- **报表与汇报**：一键生成统计报表，支撑管理决策

适用场景：企业数据资产管理部、IT 合规团队、安全运维部门、DPO 办公室

## 📸 功能预览

### 登录页面
支持用户名密码认证与企业 LDAP 认证两种方式。

### 总览仪表盘
展示数据资产总量、分类分布、待处理任务、审计动态等关键指标。

### 数据资产
对数据资产进行新增、编辑、导入、导出管理，支持按分类、级别、状态等多维度筛选。

### 分类任务
创建和管理数据分类分级任务，分配执行人，跟踪任务进度。

### 审计日志
完整记录平台所有操作行为，支持按时间、操作用户、操作类型等条件查询。

### 系统设置
管理用户账号、组织架构、LDAP 配置、系统参数等。

## 🚀 快速开始（部署 + 使用）

### 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Docker | ≥ 20.10 |
| Docker Compose | ≥ 2.0 |
| Node.js | ≥ 18 (仅开发模式) |
| Python | ≥ 3.10 (仅开发模式) |

### Docker 一键启动（推荐）

```bash
# 克隆项目后，进入部署目录
cd /Users/lxy/jojo/VS-Project/myself/mdcgs

# 启动所有服务（前端 + 后端 + MySQL + Redis + Celery）
docker-compose up -d

# 初始化数据库（首次启动时执行）
docker-compose exec backend python scripts/init_db.py
```

服务启动后访问：
- 前端地址：http://localhost:5173
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/api/v1/docs

### 手动开发模式

**前端**

```bash
cd /Users/lxy/jojo/VS-Project/myself/mydcgs
npm install
npm run dev
```

**后端**

```bash
cd /Users/lxy/jojo/VS-Project/myself/mydcgs-backend
pip install -r requirements.txt
cp .env-example .env   # 修改数据库等配置
python scripts/init_db.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

> ⚠️ 生产环境请务必修改默认密码。

## 🔧 授权生成方式

平台内置报告导出功能，支持生成以下格式：

- **Excel 报表**：资产清单、分类汇总、任务进度等数据表格
- **PDF 报告**：符合合规要求的正式报告文档

报告内容由管理员在 **系统设置** 中配置，导出时自动带上组织标识与生成时间戳。

## 📖 更多说明

### 目录结构

```
mdcgs/                          # 前端项目
├── src/
│   ├── api/                    # API 请求模块
│   ├── components/             # 公共组件
│   ├── router/                 # 路由配置
│   ├── store/                  # Pinia 状态管理
│   ├── utils/                  # 工具函数
│   └── views/                  # 页面视图
├── Dockerfile
└── docker-compose.yml

mydcgs-backend/                 # 后端项目
├── app/
│   ├── api/v1/                 # API 路由
│   ├── core/                   # 核心模块（配置、安全、数据库、缓存）
│   ├── models/                 # SQLAlchemy 模型
│   ├── schemas/                # Pydantic 数据模型
│   ├── services/               # 业务逻辑层
│   └── utils/                  # 工具函数
├── scripts/                    # 数据库脚本
├── data/                       # 数据与日志
├── Dockerfile
└── docker-compose.yml
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| UI 组件 | Element Plus |
| 状态管理 | Pinia |
| 图表 | ECharts |
| 后端框架 | FastAPI + Uvicorn |
| ORM | SQLAlchemy + Alembic |
| 数据库 | MySQL |
| 缓存 | Redis |
| 任务队列 | Celery |
| 认证 | JWT + bcrypt |

## 📬 联系与支持

- **Issue**：https://github.com/HaoY-l/mdcgs/issues
- **微信**：tomorrow_me-


## Star History
**⭐ 如果这个项目对你有帮助，请给我们一个星标！**
[![Star History Chart](https://api.star-history.com/svg?repos=HaoY-l/mdcgs&type=Date)](https://www.star-history.com/#HaoY-l/mdcgs&Date)
---

## 🏢 Who's Using This Project

We’re proud that our project is trusted by awesome teams around the world 🌍


| Logo / Name | Description |
|--------------|--------------|
| [MDCGS](https://github.com/HaoY-l/mdcgs) | 作者✍️ | 


> 💬 If your company is using this project, feel free to open a PR and add your logo here!
# 文件资产分类分级 — 完整方案文档（v3）

> 目标：实现一套通用的文件资产分类分级系统，支持所有文件类型（Excel、Word、PDF、Markdown、JSON、图片等）。
> 原则：不动数据库资产的任何逻辑代码；直接改造现有 file 相关代码，不创建v2文件。

---

## 一、系统架构

### 1.1 整体流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            两大阶段                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【资产管理阶段】                     【任务阶段】                        │
│                                                                         │
│  上传文件                              创建任务                          │
│    ↓                                   ↓                                │
│  识别文件类型                          选择资产 + 模板                   │
│    ↓                                   ↓                                │
│  提取内容块（ContentBlock）            启动任务（Celery）                 │
│    ↓                                   ↓                                │
│  存储内容块到数据库                    规则引擎 + AI 全量识别            │
│    ↓                                   ↓                                │
│  完成（可预览）                       展示结果（文件聚合 + 敏感详情）    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念

| 概念 | 说明 |
|---|---|
| **ContentBlock（内容块）** | 文件中提取的最小文本单元，所有文件类型统一用这个概念 |
| **BlockType（块类型）** | excel_cell / word_paragraph / pdf_text / json_field / md_paragraph / ocr_text / txt_line / image |
| **FileSensitiveResult** | 内容块的敏感判定结果 |
| **FileAggregation** | 文件级聚合（桶板原则：最高敏感等级 = 文件敏感等级）|

---

## 二、表结构设计

> 全部改造现有表。在 `scripts/init_db.py` 中同步更新。
> 旧的文件相关表（file_sheet、file_column等）删除，不留残留。

### 2.1 表改造清单

**删除旧表**：
- `file_sheet` — 删除表
- `file_column` — 删除表
- `file_sheet_aggregation` — 删除表
- `file_aggregation` — 删除表
- `file_classification_result` — 删除表

**改造/新建表**：

| 序号 | 表名 | 改动 |
|---|---|---|
| 1 | `file_asset` | 新增字段：total_files、total_blocks、total_chars |
| 2 | `file_object` | 新增字段：block_count |
| 3 | `file_classification_task` | 重建 |
| 4 | `file_content_block` | 新建（内容块表） |
| 5 | `file_sensitive_result` | 新建（替代 file_classification_result） |
| 6 | `file_task_execution` | 新建（执行记录表） |

### 2.2 表结构详情

#### `file_content_block` — 文件内容块表（新建）

```sql
CREATE TABLE file_content_block (
    id BIGSERIAL PRIMARY KEY,
    file_asset_id BIGINT NOT NULL,
    file_object_id BIGINT NOT NULL,

    block_type VARCHAR(50) NOT NULL COMMENT '块类型',
    path VARCHAR(500) NOT NULL COMMENT '位置路径（自解释字符串）',
    content TEXT NOT NULL COMMENT '文本内容（压缩存储）',
    char_count INTEGER DEFAULT 0,

    is_disabled SMALLINT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_content_block_object ON file_content_block(file_object_id);
CREATE INDEX idx_file_content_block_asset ON file_content_block(file_asset_id);
CREATE INDEX idx_file_content_block_type ON file_content_block(block_type);
```

#### `file_classification_task` — 文件分类任务表（重建）

```sql
DROP TABLE IF EXISTS file_classification_task CASCADE;

CREATE TABLE file_classification_task (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    template_id BIGINT NOT NULL,
    file_asset_ids JSON NOT NULL,

    execute_type VARCHAR(20) DEFAULT 'manual',
    cron_expression VARCHAR(100),
    first_execute_time TIMESTAMP,

    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    current_step VARCHAR(100),

    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    total_blocks INTEGER DEFAULT 0,
    processed_blocks INTEGER DEFAULT 0,
    sensitive_count INTEGER DEFAULT 0,
    classified_count INTEGER DEFAULT 0,

    result_summary JSON,

    masking_rule_id BIGINT,
    encryption_type_id BIGINT,

    error_message TEXT,

    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,

    ai_total INTEGER DEFAULT 0,
    ai_processed INTEGER DEFAULT 0
);
```

#### `file_sensitive_result` — 文件敏感信息结果表（新建）

```sql
CREATE TABLE file_sensitive_result (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    file_asset_id BIGINT NOT NULL,
    file_object_id BIGINT NOT NULL,
    block_id BIGINT NOT NULL,

    -- 【关键】自解释元数据，不依赖ID关联
    asset_name VARCHAR(200),
    file_name VARCHAR(255) NOT NULL,
    file_ext VARCHAR(20),
    block_path VARCHAR(500),
    content_preview VARCHAR(200),

    sensitive_type VARCHAR(100),
    sensitive_type_system VARCHAR(200),
    level_id BIGINT,
    level_code VARCHAR(20),
    level_id_manual BIGINT,
    level_code_manual VARCHAR(20),
    category_path VARCHAR(500),
    category_path_manual VARCHAR(500),

    is_sensitive SMALLINT DEFAULT 0,
    is_confirmed SMALLINT DEFAULT 0,
    is_changed SMALLINT DEFAULT 0,
    change_reason TEXT,

    match_rule VARCHAR(200),
    hit_features JSON,
    ai_category TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_file_sensitive_result_block_task UNIQUE (task_id, block_id)
);

CREATE INDEX idx_file_sensitive_result_task ON file_sensitive_result(task_id);
CREATE INDEX idx_file_sensitive_result_object ON file_sensitive_result(file_object_id);
CREATE INDEX idx_file_sensitive_result_sensitive ON file_sensitive_result(is_sensitive, is_confirmed);
```

#### `file_task_execution` — 文件任务执行记录表（新建）

```sql
CREATE TABLE file_task_execution (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    execution_no INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'running',
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration_seconds INTEGER,
    progress INTEGER DEFAULT 0,
    result_summary JSON,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_task_execution_task ON file_task_execution(task_id);
```

#### `file_asset` / `file_object` 新增字段

```sql
ALTER TABLE file_asset ADD COLUMN IF NOT EXISTS total_files INTEGER DEFAULT 0;
ALTER TABLE file_asset ADD COLUMN IF NOT EXISTS total_blocks INTEGER DEFAULT 0;
ALTER TABLE file_asset ADD COLUMN IF NOT EXISTS total_chars BIGINT DEFAULT 0;

ALTER TABLE file_object ADD COLUMN IF NOT EXISTS block_count INTEGER DEFAULT 0;
```

---

## 三、文件解析方案（ContentBlock 统一抽象）

### 3.1 path 命名规范（核心设计）

**原则：path 必须是自解释的字符串，包含定位所需的所有层级信息**

| 文件类型 | path 格式 | 示例 | 说明 |
|---|---|---|---|
| Excel | `{sheet}!{col}{row}` | `Sheet1!A1`, `客户订单!B5` | 包含Sheet名，避免多Sheet冲突 |
| Word | `{type}_{index}` 或 `{type}_{table}_{row}_{col}` | `p_3`, `t_1_r2_c3` | p=段落, t=表格, 支持单元格定位 |
| PDF | `page_{p}_block_{b}` 或 `page_{p}_x{x}_y{y}` | `page_3_block_2`, `page_1_x100_y200` | block=段落序号，x/y=坐标 |
| JSON | JSONPath 简化格式 | `$.users[0].name`, `$[0].address.city` | 支持数组索引 |
| Markdown | `p_{index}` | `p_5` | 段落序号 |
| Text | `line_{num}` | `line_10` | 行号 |
| Image | `block_{index}` | `block_1` | OCR 文本块序号 |

### 3.2 各文件类型的解析方式

#### Excel (.xlsx/.xls/.csv)

| 项目 | 说明 |
|---|---|
| 解析库 | openpyxl / xlrd |
| 内容块划分 | 每个有内容的单元格（跳过空单元格） |
| path格式 | `{sheet_name}!{col}{row}`，如 `Sheet1!A1`、`客户订单!B5` |
| Sheet名处理 | 使用实际Sheet名，若包含特殊字符则做URL编码或替换 |
| 多Sheet支持 | 每个Sheet独立遍历，通过Sheet名区分 |
| 合并单元格 | 解析时记录起始单元格，合并单元格只记录起始位置 |

```python
class ExcelParser:
    def parse(self, file_content: bytes) -> List[ContentBlock]:
        blocks = []
        for sheet_name, sheet in sheets.items():
            for row_idx, row in enumerate(sheet.iter_rows(), start=1):
                for cell in row:
                    if cell.value is not None and str(cell.value).strip():
                        col_letter = cell.column_letter
                        path = f"{sheet_name}!{col_letter}{row_idx}"
                        blocks.append(ContentBlock(
                            block_type='excel_cell',
                            path=path,
                            content=str(cell.value),
                            char_count=len(str(cell.value))
                        ))
        return blocks
```

#### Word (.docx)

| 项目 | 说明 |
|---|---|
| 解析库 | python-docx |
| 内容块划分 | 正文段落 + 表格单元格 |
| path格式 | 段落=`p_{序号}`，表格单元格=`t_{table_idx}_r{row}_c{col}` |
| 合并单元格 | 记录起始行/列，合并单元格只存储起始位置的值 |
| 嵌套表格 | 递归解析每个表格，外层表格先解析，嵌套表格作为独立表格处理 |
| 页眉页脚 | 忽略，不参与分类 |

```python
class WordParser:
    def parse(self, file_content: bytes) -> List[ContentBlock]:
        blocks = []
        # 段落
        for idx, para in enumerate(doc.paragraphs):
            if para.text.strip():
                blocks.append(ContentBlock(
                    block_type='word_paragraph',
                    path=f"p_{idx}",
                    content=para.text,
                    char_count=len(para.text)
                ))
        # 表格
        for table_idx, table in enumerate(doc.tables):
            for row_idx, row in enumerate(table.rows):
                for col_idx, cell in enumerate(row.cells):
                    if cell.text.strip():
                        blocks.append(ContentBlock(
                            block_type='word_table_cell',
                            path=f"t_{table_idx}_r{row_idx}_c{col_idx}",
                            content=cell.text,
                            char_count=len(cell.text)
                        ))
        return blocks
```

#### PDF（可复制文本）

| 项目 | 说明 |
|---|---|
| 解析库 | pdfplumber |
| 内容块划分 | 页面 → 文本块（paragraph） |
| path格式 | `page_{页码}_block_{块序号}` |
| 坐标信息 | 同时记录 x, y 坐标用于排序和定位 |
| 表格处理 | pdfplumber 可提取表格，表格单元格作为独立块 |
| 扫描件检测 | 通过页面图像分析判断是否为扫描件若是则降级到 OCR 流程 |

```python
class PdfParser:
    def parse(self, file_content: bytes) -> List[ContentBlock]:
        blocks = []
        for page_num, page in enumerate(pages):
            # 提取文本块，按 y 坐标排序
            text_blocks = page.extract_words()  # 获取词级信息
            # 合并为段落
            paragraphs = page.extract paragraphs()
            for block_idx, para in enumerate(paragraphs):
                if para.strip():
                    blocks.append(ContentBlock(
                        block_type='pdf_text',
                        path=f"page_{page_num}_block_{block_idx}",
                        content=para,
                        char_count=len(para)
                    ))
        return blocks
```

#### PDF（扫描件）/ 图片 OCR

| 项目 | 说明 |
|---|---|
| 解析库 | pytesseract |
| 内容块划分 | 识别出的文本块 |
| path格式 | `ocr_{index}`，如 `ocr_1` |
| 置信度过滤 | 只保留置信度 > 60% 的识别结果（可配置） |
| 语言参数 | 通过系统设置 `ocr_language` 配置，默认 `eng+chi_sim` |
| 表格还原 | 启发式算法：检查对齐的文本行，尝试还原表格结构 |

```python
class ImageParser:
    def __init__(self, lang='eng+chi_sim', confidence_threshold=60):
        self.lang = lang
        self.confidence_threshold = confidence_threshold

    def parse(self, file_content: bytes) -> List[ContentBlock]:
        from PIL import Image
        import pytesseract

        image = Image.open(file_content)
        # OCR with detailed data
        data = pytesseract.image_to_data(image, lang=self.lang, output_type=pytesseract.Output.DICT)

        blocks = []
        current_block = []
        current_block_text = ""
        last_block_num = -1

        for i, text in enumerate(data['text']):
            conf = int(data['conf'][i])
            block_num = data['block_num'][i]

            if conf < self.confidence_threshold or not text.strip():
                continue

            if block_num != last_block_num and current_block_text:
                blocks.append(ContentBlock(
                    block_type='ocr_text',
                    path=f"ocr_{last_block_num}",
                    content=current_block_text.strip(),
                    char_count=len(current_block_text.strip())
                ))
                current_block_text = ""

            current_block_text += text + " "
            last_block_num = block_num

        if current_block_text:
            blocks.append(ContentBlock(
                block_type='ocr_text',
                path=f"ocr_{last_block_num}",
                content=current_block_text.strip(),
                char_count=len(current_block_text.strip())
            ))

        return blocks
```

#### JSON (.json)

| 项目 | 说明 |
|---|---|
| 解析库 | json 库递归解析 |
| 内容块划分 | 每个 string 类型的 value |
| path格式 | JSONPath 简化格式：`$.key` 或 `$.array[0].key` |
| 非string值 | 数字、布尔值跳过；null 空值跳过 |
| 嵌套处理 | 递归遍历所有嵌套对象和数组 |

```python
class JsonParser:
    def parse(self, file_content: bytes) -> List[ContentBlock]:
        def walk(obj, path_prefix="$"):
            blocks = []
            if isinstance(obj, dict):
                for k, v in obj.items():
                    blocks.extend(walk(v, f"{path_prefix}.{k}"))
            elif isinstance(obj, list):
                for idx, v in enumerate(obj):
                    blocks.extend(walk(v, f"{path_prefix}[{idx}]"))
            elif isinstance(obj, str) and obj.strip():
                blocks.append(ContentBlock(
                    block_type='json_field',
                    path=path_prefix,
                    content=obj,
                    char_count=len(obj)
                ))
            return blocks

        data = json.loads(file_content)
        return walk(data)
```

**JSON path 示例**：

| JSON 结构 | path |
|---|---|
| `{"name": "张三"}` | `$.name` |
| `{"users": [{"name": "李四"}]}` | `$.users[0].name` |
| `["苹果", "香蕉"]` | `$[0]`, `$[1]` |
| `{"data": {"items": [{"id": 1}]}}` | `$.data.items[0].id` (跳过数字) |

#### Markdown (.md)

| 项目 | 说明 |
|---|---|
| 解析方式 | 直接读取文件，正则去除 Markdown 语法 |
| 内容块划分 | 段落（按空行分割） |
| path格式 | `p_{序号}` |
| 代码块 | 作为普通文本处理（可能含敏感信息） |
| 链接/图片 | 提取 alt 文本和链接文字 |

#### 纯文本 (.txt)

| 项目 | 说明 |
|---|---|
| 解析方式 | 直接 read，按行读取 |
| 内容块划分 | 非空行 |
| path格式 | `line_{行号}` |

### 3.3 超大文件处理策略

用户明确要求：**不截断、不取样，要获取所有数据**。

#### 存储优化：content 字段压缩

```python
import zlib
import base64

def compress_content(content: str) -> str:
    """压缩 content 并转为 base64 字符串存储"""
    compressed = zlib.compress(content.encode('utf-8'), level=6)
    return base64.b64encode(compressed).decode('ascii')

def decompress_content(compressed: str) -> str:
    """解压 content"""
    compressed_bytes = base64.b64decode(compressed.encode('ascii'))
    return zlib.decompress(compressed_bytes).decode('utf-8')
```

**评估**：
- 50MB 纯文本压缩后约 5-10MB
- base64 编码后约 7-14MB
- 作为 TEXT 字段存储完全可行

#### 解析优化：流式处理

```python
class ExcelParser:
    def parse_streaming(self, file_path: str, batch_size=500):
        """流式解析，大文件分批提交"""
        from openpyxl import load_workbook
        wb = load_workbook(file_path, read_only=True, data_only=True)

        batch = []
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            for row in sheet.iter_rows(values_only=True):
                for col_idx, cell_value in enumerate(row):
                    if cell_value is not None:
                        col_letter = get_column_letter(col_idx + 1)
                        block = ContentBlock(
                            block_type='excel_cell',
                            path=f"{sheet_name}!{col_letter}{row_idx}",
                            content=str(cell_value),
                            char_count=len(str(cell_value))
                        )
                        batch.append(block)
                        if len(batch) >= batch_size:
                            yield batch  # 返回一批
                            batch = []
        if batch:
            yield batch

        wb.close()
```

#### 性能评估

| 文件大小 | 预估块数 | 压缩后 DB 存储 |
|---|---|---|
| 10MB Excel | ~10万单元格 | ~2MB |
| 50MB CSV | ~50万行 | ~8MB |
| 10MB JSON | ~5万字段 | ~1.5MB |

**查询优化**：
- `block_path` 建索引，支持快速筛选
- `file_object_id` 建索引，支持按文件查询
- 任务结果表按 `task_id` 分区查询

---

## 四、任务阶段方案

### 4.1 核心流程

```
任务启动 → Celery Worker
    ↓
【加载任务配置】
    ↓
遍历每个文件资产 → 遍历每个文件对象 → 遍历每个内容块
    ↓
┌─────────────────────────────────────────────────────┐
│  并行处理                                            │
│  规则引擎线程池 + AI分类线程池（受系统设置控制）     │
│  每 N 个块检查停止信号                               │
│  进度 = rule_progress * weight + ai_progress * weight_ai  │
└─────────────────────────────────────────────────────┘
    ↓
批量写入 file_sensitive_result
    ↓
更新文件聚合
    ↓
任务完成
```

### 4.2 关键原则：元数据自解释

- 结果表存储完整元数据（`asset_name`、`file_name`、`file_ext`、`block_path`、`content_preview`）
- `content_preview` 存储前100字符，保证内容可读
- 重复上传文件时，任务通过 `file_object` 查询最新元数据

### 4.3 AI 分类（受系统设置控制）

**AI 启用开关**：
- 系统设置项：`ai.file_classification_enabled`（布尔值，默认 false）
- AI 相关设置：`ai.file_ai_concurrency`、`ai.file_ai_batch_size`、`ai.file_progress_weight_ai`

**处理逻辑**：
```
所有内容块
    ↓
规则引擎匹配 → 标记敏感类型、等级
    ↓
【AI启用？】→ 是 → 对所有块进行AI分类
         → 否 → 直接用规则结果
    ↓
合并结果（规则优先 + AI作为验证/补充）
    ↓
写入 file_sensitive_result
```

**AI分类对所有块执行**，不限于规则是否命中，用于：
1. 验证规则识别结果
2. 发现规则未覆盖的敏感信息
3. 提供更细粒度的分类建议

### 4.4 并发控制（复用现有机制）

- 共用 `classification` 队列
- 共用 `CELERY_CLASSIFY_CONCURRENCY` 或 `SysSettings.classify_task_limit`
- 共用 `is_stop_signal_sent` / `clear_stop_signal`
- AI 并发由 `ai.file_ai_concurrency` 控制
- 每处理 100 个内容块检查一次停止信号

---

## 五、Celery 任务方案

### 5.1 任务文件

改造现有 `app/tasks_file.py`：

```python
"""Celery 异步任务定义 - 文件分类分级任务

与 app/tasks.py（数据库分类任务）完全对齐：
- 同一个 Celery 队列 classification
- 同一个 worker 进程管理
- 同样的 stop_signal 机制
- 同样的异常处理 / DB 资源回收
"""

@celery_app.task(bind=True, max_retries=0, acks_late=True)
def run_file_classification(self, task_id: int) -> dict:
    """执行文件分类分级任务（规则引擎 + AI全量分类）"""
    ...
```

### 5.2 规则引擎

改造现有 `app/services/file_rules_engine.py`：

```python
"""文件分类分级规则引擎

完全对齐 app/services/rules_engine.py 的架构：
- ThreadPoolExecutor 规则引擎并发
- AI 分类线程并行处理（受系统设置控制）
- 每 N 个内容块检查停止信号
- 进度合并公式
- 批量写入结果
"""
```

---

## 六、API 层方案

改造现有 `app/api/v1/file_classification/file_classification.py`：

| API | 说明 |
|---|---|
| `GET /file-classification-tasks` | 任务列表 |
| `POST /file-classification-tasks` | 创建任务（含资产冲突检查） |
| `GET /file-classification-tasks/{task_id}` | 任务详情（实时统计） |
| `PUT /file-classification-tasks/{task_id}` | 更新任务 |
| `DELETE /file-classification-tasks/{task_id}` | 删除任务 |
| `POST /file-classification-tasks/{task_id}/start` | 启动任务 |
| `POST /file-classification-tasks/{task_id}/stop` | 停止任务 |
| `POST /file-classification-tasks/batch-start` | 批量启动 |
| `POST /file-classification-tasks/{task_id}/clear-results` | 清空结果 |
| `GET /file-classification-tasks/{task_id}/progress` | 进度查询 |
| `GET /file-classification-tasks/{task_id}/results/files` | 文件级结果 |
| `GET /file-classification-tasks/{task_id}/results/blocks` | 内容块敏感详情 |
| `POST /file-classification-tasks/{task_id}/results/block/{block_id}/confirm` | 确认 |
| `POST /file-classification-tasks/{task_id}/results/block/{block_id}/change` | 变更 |
| `GET /file-classification-tasks/{task_id}/statistics` | 统计信息 |

---

## 七、数据目录展示

新建 `app/api/v1/file_directory/file_directory.py`：

| API | 说明 |
|---|---|
| `GET /file-directory` | 文件数据目录 |
| `GET /file-statistics` | 文件数据统计 |
| `GET /file-level-ratio` | 文件等级分布 |
| `GET /file-type-ratio` | 文件类型分布 |
| `GET /file-sensitivity-report` | 敏感文件报告 |

---

## 八、前端方案

改造现有 `src/views/file-classification/FileTaskDetailPage.vue`：

**2个Tab**：

**Tab1：文件聚合**

| 字段 | 说明 |
|---|---|
| 文件名 | 原始文件名 |
| 文件类型 | Excel / Word / PDF / MD / JSON / 图片 |
| 敏感等级 | L1 / L2 / L3 / 空 |
| 敏感信息条数 | 已确认/已变更的敏感块数量 |
| 是否敏感 | 是 / 否 |

**Tab2：敏感详情**

| 字段 | 说明 |
|---|---|
| 文件名 | 所属文件名 |
| 位置 | block_path（如 Sheet1!A1、p_3、page_1_block_2、$.name） |
| 内容摘要 | content_preview（前50字符，脱敏） |
| 敏感类型 | 手机号、身份证、姓名等 |
| 敏感等级 | L1 / L2 / L3 |
| 来源 | 系统识别 / AI分类 |
| 确认状态 | 待确认 / 已确认 / 已变更 |
| 操作 | 确认 / 变更 |

---

## 九、代码改动清单

### 9.1 后端改动

| 序号 | 文件 | 改动 |
|---|---|---|
| 1 | `app/models/file_asset.py` | 删除旧模型，新增 ContentBlock、FileSensitiveResult、FileTaskExecution |
| 2 | `app/schemas/file_classification.py` | 改造 Schema |
| 3 | `app/api/v1/file_classification/file_classification.py` | 改造，对齐数据库任务API |
| 4 | `app/services/file_parser.py` | 扩展，新增各类型Parser |
| 5 | `app/services/file_parse_runner.py` | 改造 |
| 6 | `app/services/file_rules_engine.py` | 改造，对齐rules_engine.py |
| 7 | `app/tasks_file.py` | 改造 |
| 8 | `app/api/v1/file_directory/file_directory.py` | 新建 |
| 9 | `app/core/task_scheduler.py` | 新增文件周期任务调度 |

### 9.2 前端改动

| 序号 | 文件 | 改动 |
|---|---|---|
| 1 | `src/views/file-classification/FileTaskDetailPage.vue` | 改造，2个Tab |
| 2 | `src/api/fileClassification.ts` | 改造 |
| 3 | `src/views/overview/` | 新增文件数据Tab |
| 4 | `src/router/index.ts` | 新增路由 |

### 9.3 初始化脚本

| 序号 | 文件 | 改动 |
|---|---|---|
| 1 | `scripts/init_db.py` | 删除旧表，新增新表 |

---

## 十、path 规范总结

| 类型 | path 示例 | 说明 |
|---|---|---|
| Excel | `Sheet1!A1`, `客户订单!B5` | 包含Sheet名 |
| Word段落 | `p_3` | 第4段（0-based） |
| Word表格 | `t_1_r2_c3` | 第2表格第3行第4列 |
| PDF文本 | `page_3_block_2` | 第3页第2段落 |
| OCR文本 | `ocr_1` | 第1个识别块 |
| JSON | `$.users[0].name` | JSONPath格式 |
| Markdown | `p_5` | 第5段 |
| Text | `line_10` | 第10行 |
| 图片 | `block_1` | 第1块OCR文本 |

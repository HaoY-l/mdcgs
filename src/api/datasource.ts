/**
 * 数据源管理 API
 * 数据源（资产）与分类系统共用 /assets CRUD 接口
 * 新增数据源类型参数由前端常量 DATA_SOURCE_TYPES 定义
 */
import client from './client'

// 数据源类型: 与 DATA_SOURCE_TYPES.value 对应

export interface DataSourceForm {
  name: string
  asset_type: string
  host: string
  port: number
  database_name?: string
  username?: string
  password?: string
  version?: string
  capacity?: string
  connection_method?: string
  group_system?: string
  group_department?: string
  group_region?: string
  sample_count?: number
  sample_method?: string
  sample_mode?: string
  update_interval?: number
  status?: number
  owner_id?: number
}

export interface TestConnectionForm {
  host: string
  port: number
  username: string
  password: string
  asset_type: string
}

/** 获取数据源列表 */
export const getDataSources = (params?: Record<string, any>) =>
  client.get('/assets', { params })

/** 获取单个数据源 */
export const getDataSource = (id: number) =>
  client.get(`/assets/${id}`)

/** 创建数据源 */
export const createDataSource = (data: DataSourceForm) =>
  client.post('/assets', data)

/** 更新数据源 */
export const updateDataSource = (id: number, data: Partial<DataSourceForm>) =>
  client.put(`/assets/${id}`, data)

/** 删除数据源 */
export const deleteDataSource = (id: number) =>
  client.delete(`/assets/${id}`)

/** 批量删除数据源 */
export const batchDeleteDataSources = (ids: number[]) =>
  client.post('/assets/batch-delete', { ids })

/** 测试连接（直接） */
export const testConnectionDirect = (data: TestConnectionForm) =>
  client.post('/assets/test-connection-direct', data)

/** 测试连接（已有资产） */
export const testConnection = (id: number, password?: string) =>
  client.post(`/assets/${id}/test-connection`, { password })

/** 触发扫描更新 */
export const triggerUpdate = (id: number) =>
  client.post(`/assets/${id}/update`)

/** 获取数据源下的数据库列表 */
export const getDatabases = (id: number) =>
  client.get(`/assets/${id}/databases`)

/** 获取数据库下的表列表 */
export const getTables = (id: number, databaseId: number) =>
  client.get(`/assets/${id}/tables?database_id=${databaseId}`)

/** 获取表下的字段列表 */
export const getColumns = (id: number, tableId: number) =>
  client.get(`/assets/${id}/columns?table_id=${tableId}`)

/** 获取样本数据 */
export const getSamples = (id: number, databaseId: number, tableId: number, columnId: number) =>
  client.get(`/assets/${id}/samples`, {
    params: { database_id: databaseId, table_id: tableId, column_id: columnId },
  })

/** 获取数据源统计概览 */
export const getOverviewTree = () =>
  client.get('/assets/overview/tree')

/** 批量更新数据源 */
export const batchUpdateDataSources = (ids: number[], updates: Partial<DataSourceForm>) =>
  client.post('/assets/batch-update', { ids, ...updates })

/** 数据源类型常量 */

export interface DataSourceTypeDef {
  value: string
  label: string
  defaultPort: number
  defaultUsername: string
  description?: string
}

export const DATA_SOURCE_TYPES: readonly DataSourceTypeDef[] = [
  { value: 'mysql',      label: 'MySQL',      defaultPort: 3306,  defaultUsername: 'root',      description: '开源关系型数据库' },
  { value: 'postgresql', label: 'PostgreSQL',  defaultPort: 5432,  defaultUsername: 'postgres',  description: '功能丰富的关系型数据库' },
  { value: 'oracle',     label: 'Oracle',      defaultPort: 1521,  defaultUsername: 'sys',       description: '甲骨文商业数据库（支持 Oracle 12.1+）' },
  { value: 'sqlserver',  label: 'SQL Server',  defaultPort: 1433,  defaultUsername: 'sa',         description: '微软商业数据库' },
  { value: 'dm',         label: 'DM（达梦）',   defaultPort: 5236,  defaultUsername: 'SYSDBA',     description: '国产达梦数据库' },
  { value: 'opengauss',  label: 'openGauss',   defaultPort: 5432,  defaultUsername: 'postgres',  description: '华为开源数据库' },
  { value: 'polardb',    label: 'PolarDB',     defaultPort: 1921,  defaultUsername: 'root',      description: '阿里云 PolarDB' },
] as const

export type DataSourceType = typeof DATA_SOURCE_TYPES[number]['value']

/** 根据类型获取默认端口 */
export function getDefaultPort(type: string): number {
  const found = DATA_SOURCE_TYPES.find(t => t.value === type)
  return found ? found.defaultPort : 3306
}

/** 根据类型获取显示标签 */
export function getDataSourceLabel(type: string): string {
  const found = DATA_SOURCE_TYPES.find(t => t.value === type)
  return found ? found.label : type
}

/** 根据类型获取默认用户名 */
export function getDefaultUsername(type: string): string {
  const found = DATA_SOURCE_TYPES.find(t => t.value === type)
  return found ? found.defaultUsername : 'root'
}

import client from './client'

// ===== 概览统计 =====
export async function getStatistics(params: Record<string, any> = {}) {
  return client.get('/overview/statistics', { params })
}

export async function getTrend(params: Record<string, any> = {}) {
  return client.get('/overview/trend', { params })
}

export async function getDistribution(params: Record<string, any> = {}) {
  return client.get('/overview/distribution', { params })
}

export async function getTypeRatio(params: Record<string, any> = {}) {
  return client.get('/overview/type-ratio', { params })
}

export async function getLevelRatio(params: Record<string, any> = {}) {
  return client.get('/overview/level-ratio', { params })
}

export async function getCategoryRatio(params: Record<string, any> = {}) {
  return client.get('/overview/category-ratio', { params })
}

// ===== 数据目录 =====
export async function getDirectory(params: Record<string, any> = {}) {
  return client.get('/directory', { params })
}

// ===== 字段安全概览 =====
export async function getEncryptedColumns(params: Record<string, any> = {}) {
  return client.get('/overview/encrypted-columns', { params })
}

export async function getMaskedColumns(params: Record<string, any> = {}) {
  return client.get('/overview/masked-columns', { params })
}

export async function getUnmatchedColumns(params: Record<string, any> = {}) {
  return client.get('/overview/unmatched-columns', { params })
}

export async function getUnmatchedFeatures(params: Record<string, any> = {}) {
  return client.get('/overview/unmatched-features', { params })
}
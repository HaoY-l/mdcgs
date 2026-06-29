import client from './client'

// ===== 分类分级模板 =====
export async function getTemplates(params: Record<string, any> = {}) {
  return client.get('/templates', { params })
}

export async function createTemplate(data: Record<string, any>) {
  return client.post('/templates', data)
}

export async function getTemplateDetail(id: number) {
  return client.get(`/templates/${id}`)
}

export async function updateTemplate(id: number, data: Record<string, any>) {
  return client.put(`/templates/${id}`, data)
}

export async function deleteTemplate(id: number) {
  return client.delete(`/templates/${id}`)
}

export async function copyTemplate(id: number) {
  return client.post(`/templates/${id}/copy`)
}

export async function activateTemplate(id: number) {
  return client.post(`/templates/${id}/activate`)
}

export async function deactivateTemplate(id: number) {
  return client.post(`/templates/${id}/deactivate`)
}

// ===== 分类目录 =====
export async function getCategories(templateId: number, params: Record<string, any> = {}) {
  return client.get(`/templates/${templateId}/categories`, { params })
}

export async function createCategory(templateId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/categories`, data)
}

export async function updateCategory(templateId: number, catId: number, data: Record<string, any>) {
  return client.put(`/templates/${templateId}/categories/${catId}`, data)
}

export async function deleteCategory(templateId: number, catId: number) {
  return client.delete(`/templates/${templateId}/categories/${catId}`)
}

export async function getCategoryTree(templateId: number) {
  return client.get(`/templates/${templateId}/categories/tree`)
}

// ===== 数据类型 =====
export async function getDataTypes(templateId: number, params: Record<string, any> = {}) {
  return client.get(`/templates/${templateId}/data-types`, { params })
}

export async function createDataType(templateId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/data-types`, data)
}

export async function updateDataType(templateId: number, typeId: number, data: Record<string, any>) {
  return client.put(`/templates/${templateId}/data-types/${typeId}`, data)
}

export async function deleteDataType(templateId: number, typeId: number) {
  return client.delete(`/templates/${templateId}/data-types/${typeId}`)
}

export async function associateFeature(templateId: number, typeId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/data-types/${typeId}/features`, data)
}

// ===== 数据特征 =====
export async function getFeatures(templateId: number, params: Record<string, any> = {}) {
  return client.get(`/templates/${templateId}/features`, { params })
}

export async function createFeature(templateId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/features`, data)
}

export async function updateFeature(templateId: number, featureId: number, data: Record<string, any>) {
  return client.put(`/templates/${templateId}/features/${featureId}`, data)
}

export async function deleteFeature(templateId: number, featureId: number) {
  return client.delete(`/templates/${templateId}/features/${featureId}`)
}

export async function validateFeature(templateId: number, featureId: number) {
  return client.post(`/templates/${templateId}/features/${featureId}/validate`)
}

export async function getFeatureDictionaries(templateId: number, featureId: number) {
  return client.get(`/templates/${templateId}/features/${featureId}/dictionaries`)
}

// ===== 特征目录 =====
export async function getFeatureDirectories(templateId: number) {
  return client.get(`/templates/${templateId}/feature-directories`)
}

export async function createFeatureDirectory(templateId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/feature-directories`, data)
}

export async function updateFeatureDirectory(templateId: number, dirId: number, data: Record<string, any>) {
  return client.put(`/templates/${templateId}/feature-directories/${dirId}`, data)
}

export async function deleteFeatureDirectory(templateId: number, dirId: number) {
  return client.delete(`/templates/${templateId}/feature-directories/${dirId}`)
}

// ===== 数据字典 =====
export async function getDictionaries(templateId: number, params: Record<string, any> = {}) {
  return client.get(`/templates/${templateId}/dictionaries`, { params })
}

export async function createDictionary(templateId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/dictionaries`, data)
}

export async function updateDictionary(templateId: number, dictId: number, data: Record<string, any>) {
  return client.put(`/templates/${templateId}/dictionaries/${dictId}`, data)
}

export async function deleteDictionary(templateId: number, dictId: number) {
  return client.delete(`/templates/${templateId}/dictionaries/${dictId}`)
}

export async function getDictionaryValues(templateId: number, dictId: number) {
  return client.get(`/templates/${templateId}/dictionaries/${dictId}/values`)
}

export async function createDictionaryValue(templateId: number, dictId: number, data: Record<string, any>) {
  return client.post(`/templates/${templateId}/dictionaries/${dictId}/values`, data)
}

export async function updateDictionaryValue(templateId: number, dictId: number, valId: number, data: Record<string, any>) {
  return client.put(`/templates/${templateId}/dictionaries/${dictId}/values/${valId}`, data)
}

export async function deleteDictionaryValue(templateId: number, dictId: number, valId: number) {
  return client.delete(`/templates/${templateId}/dictionaries/${dictId}/values/${valId}`)
}

// ===== 数据分级 =====
export async function getLevels() {
  return client.get('/levels')
}

export async function updateLevel(id: number, data: Record<string, any>) {
  return client.put(`/levels/${id}`, data)
}

export async function setLevelPriority(data: Record<string, any>) {
  return client.put('/levels/priority', data)
}

export async function enableRestrictedLevel(data: Record<string, any>) {
  return client.post('/levels/restricted/enable', data)
}

export async function disableRestrictedLevel() {
  return client.post('/levels/restricted/disable')
}

// ===== 脱敏规则 =====
export async function getMaskingRules(params: Record<string, any> = {}) {
  return client.get('/masking-rules', { params })
}

export async function createMaskingRule(data: Record<string, any>) {
  return client.post('/masking-rules', data)
}

export async function updateMaskingRule(id: number, data: Record<string, any>) {
  return client.put(`/masking-rules/${id}`, data)
}

export async function deleteMaskingRule(id: number) {
  return client.delete(`/masking-rules/${id}`)
}

export async function activateMaskingRule(id: number) {
  return client.post(`/masking-rules/${id}/activate`)
}

export async function deactivateMaskingRule(id: number) {
  return client.post(`/masking-rules/${id}/deactivate`)
}

// ===== 加密方式 =====
export async function getEncryptionTypes(params: Record<string, any> = {}) {
  return client.get('/encryption-types', { params })
}

export async function createEncryptionType(data: Record<string, any>) {
  return client.post('/encryption-types', data)
}

export async function updateEncryptionType(id: number, data: Record<string, any>) {
  return client.put(`/encryption-types/${id}`, data)
}

export async function deleteEncryptionType(id: number) {
  return client.delete(`/encryption-types/${id}`)
}

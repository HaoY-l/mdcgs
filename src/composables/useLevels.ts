/**
 * 分级数据共享模块 - 从 API 获取分级配置，移除前端硬编码
 */
import { ref, computed } from 'vue'
import { getLevels } from '@/api/classification'

export interface Level {
  id: number
  level_code: string
  level_value: number
  color: string
  control_principle?: string
  description?: string
  is_sensitive: number
  is_restricted?: number
  is_active: number
  sort_order: number
}

const levels = ref<Level[]>([])
const levelsLoading = ref(false)
const levelsLoaded = ref(false)

// 颜色映射缓存（从 API 获取后构建）
const levelColorMap = ref<Record<string, string>>({})
// 敏感级别映射
const sensitiveLevelCodes = ref<Set<string>>(new Set())

/**
 * 加载分级数据（从 API）
 */
export async function loadLevels() {
  if (levelsLoading.value) return
  levelsLoading.value = true
  try {
    const res = await getLevels()
    const data = res.data || []
    levels.value = data

    // 构建颜色映射
    const colorMap: Record<string, string> = {}
    const sensitiveSet = new Set<string>()
    for (const level of data) {
      colorMap[level.level_code] = level.color
      if (level.is_sensitive && level.is_active) {
        sensitiveSet.add(level.level_code)
      }
    }
    levelColorMap.value = colorMap
    sensitiveLevelCodes.value = sensitiveSet
    levelsLoaded.value = true
  } catch (e) {
    console.error('Failed to load levels:', e)
    // 失败时使用默认颜色
    levelColorMap.value = {
      'L0': '#909399',
      'L1': '#FF4D4F',
      'L2': '#FF7A00',
      'L3': '#FFC000',
      'L4': '#92D050',
      'L5': '#00B0F0',
      'L6': '#A6A6A6',
      'L7': '#A6A6A6',
      'L8': '#A6A6A6',
      'L9': '#A6A6A6',
    }
  } finally {
    levelsLoading.value = false
  }
}

/**
 * 获取级别颜色
 */
export function getLevelColor(levelCode: string): string {
  return levelColorMap.value[levelCode] || '#909399'
}

/**
 * 获取级别标签类型 (el-tag type)
 */
export function getLevelTagType(levelCode: string): string {
  // 根据敏感性和级别值判断
  if (sensitiveLevelCodes.value.has(levelCode)) {
    // 敏感级别
    const levelValue = levels.value.find(l => l.level_code === levelCode)?.level_value || 0
    if (levelValue <= 2) return 'danger'
    if (levelValue <= 4) return 'warning'
    return 'danger'
  }
  return 'info'
}

/**
 * 判断是否为敏感级别
 */
export function isSensitiveLevel(levelCode: string): boolean {
  return sensitiveLevelCodes.value.has(levelCode)
}

/**
 * 获取所有启用的级别（按 sort_order 排序）
 */
export const activeLevels = computed(() =>
  levels.value
    .filter(l => l.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
)

/**
 * 获取级别选项（用于下拉框，包含所有级别，区分禁用状态）
 */
export const levelOptions = computed(() =>
  levels.value
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(l => ({
      id: l.id,
      name: l.level_code,
      level_code: l.level_code,
      color: l.color,
      is_sensitive: l.is_sensitive,
      is_active: l.is_active,
      disabled: !l.is_active,
    }))
)

/**
 * 根据 level_code 获取级别信息
 */
export function getLevelByCode(levelCode: string): Level | undefined {
  return levels.value.find(l => l.level_code === levelCode)
}

// 自动加载
loadLevels()

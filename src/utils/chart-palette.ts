/* ============================================
   Chart Color Palette & Shared ECharts Config
   Tech-feel: Cyan-based modern palette
   ============================================ */

export const CHART_PALETTE = [
  '#06b6d4',  // Cyan - 主色
  '#10b981',  // Emerald - 成功
  '#f59e0b',  // Amber - 警告
  '#ec4899',  // Pink - 强调
  '#8b5cf6',  // Violet - 分类
  '#0ea5e9',  // Sky - 备选
  '#f97316',  // Orange - 警示
  '#14b8a6',  // Teal - 辅助
] as const

export const CHART_TOOLTIP = {
  trigger: 'axis' as const,
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  borderColor: 'rgba(6, 182, 212, 0.3)',
  borderWidth: 1,
  textStyle: { color: '#e2e8f0', fontSize: 12 },
  extraCssText: 'border-radius: 8px; padding: 10px 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 12px rgba(6, 182, 212, 0.1); backdrop-filter: blur(8px);',
}

export const CHART_TOOLTIP_ITEM = {
  trigger: 'item' as const,
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  borderColor: 'rgba(6, 182, 212, 0.3)',
  borderWidth: 1,
  textStyle: { color: '#e2e8f0', fontSize: 12 },
  extraCssText: 'border-radius: 8px; padding: 10px 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 12px rgba(6, 182, 212, 0.1); backdrop-filter: blur(8px);',
}

export const CHART_GRID = {
  left: 48,
  right: 16,
  top: 16,
  bottom: 28,
}

export const CHART_XAXIS_LABEL = {
  fontSize: 11,
  color: '#64748b',
}

export const CHART_YAXIS_LABEL = {
  fontSize: 11,
  color: '#64748b',
}

export const CHART_SPLIT_LINE = {
  lineStyle: {
    color: '#1e293b',
    type: 'dashed' as const,
  },
}

export const CHART_AXIS_LINE = {
  lineStyle: {
    color: '#334155',
  },
}

/**
 * Create a linear gradient for chart areas/bars
 */
export function createGradient(
  color: string,
  opacityTop = 0.25,
  opacityBottom = 0.03
) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: color + Math.round(opacityTop * 255).toString(16).padStart(2, '0') },
      { offset: 1, color: color + Math.round(opacityBottom * 255).toString(16).padStart(2, '0') },
    ],
  }
}

/**
 * Create a horizontal gradient (for horizontal bar charts)
 */
export function createHorizontalGradient(
  color: string,
  opacityLeft = 0.9,
  opacityRight = 0.4
) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: [
      { offset: 0, color: color + Math.round(opacityLeft * 255).toString(16).padStart(2, '0') },
      { offset: 1, color: color + Math.round(opacityRight * 255).toString(16).padStart(2, '0') },
    ],
  }
}

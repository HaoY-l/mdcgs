/* ============================================
   Chart Color Palette & Shared ECharts Config
   ============================================ */

export const CHART_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
] as const

export const CHART_TOOLTIP = {
  trigger: 'axis' as const,
  backgroundColor: '#1e293b',
  borderColor: '#1e293b',
  borderWidth: 0,
  textStyle: { color: '#e2e8f0', fontSize: 12 },
  extraCssText: 'border-radius: 6px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);',
}

export const CHART_TOOLTIP_ITEM = {
  trigger: 'item' as const,
  backgroundColor: '#1e293b',
  borderColor: '#1e293b',
  borderWidth: 0,
  textStyle: { color: '#e2e8f0', fontSize: 12 },
  extraCssText: 'border-radius: 6px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);',
}

export const CHART_GRID = {
  left: 48,
  right: 16,
  top: 16,
  bottom: 28,
}

export const CHART_XAXIS_LABEL = {
  fontSize: 11,
  color: '#94a3b8',
}

export const CHART_YAXIS_LABEL = {
  fontSize: 11,
  color: '#94a3b8',
}

export const CHART_SPLIT_LINE = {
  lineStyle: {
    color: '#f1f5f9',
    type: 'dashed' as const,
  },
}

export const CHART_AXIS_LINE = {
  lineStyle: {
    color: '#e2e8f0',
  },
}

/**
 * Create a linear gradient for chart areas/bars
 */
export function createGradient(
  color: string,
  opacityTop = 0.15,
  opacityBottom = 0.02
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
  opacityLeft = 0.85,
  opacityRight = 0.3
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

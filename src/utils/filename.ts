/**
 * 文件名展示与匹配工具
 *
 * 后端会清洗上传文件名（去路径/控制字符、截断到 255 字符），
 * 前端在把上传结果和本地队列项对应起来时，必须用同一套规则，
 * 否则目录里有重名文件时无法判断哪一项是重复上传。
 */

/** 与后端 file_security.sanitize_file_name 保持一致的清洗规则 */
export function sanitizeFileName(name: string): string {
  let n = (name || '').trim()
  n = n.replace(/\\/g, '/').split('/').pop() || ''
  // 去掉不可打印字符
  n = Array.from(n).filter(ch => {
    const code = ch.codePointAt(0) || 0
    return code >= 0x20 && code !== 0x7f
  }).join('')
  n = n.trim().replace(/^[. ]+|[. ]+$/g, '')
  if (!n) n = 'upload'

  const dot = n.lastIndexOf('.')
  let stem = dot > 0 ? n.slice(0, dot) : n
  let ext = dot > 0 ? n.slice(dot) : ''
  stem = stem.replace(/^[. ]+|[. ]+$/g, '') || 'upload'
  if (ext.length > 20) ext = ext.slice(0, 20)

  const maxStem = Math.max(1, 255 - ext.length)
  if (stem.length > maxStem) stem = stem.slice(0, maxStem)

  return `${stem}${ext}`
}

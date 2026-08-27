/**
 * 缓存已解析的 @font-face 规则元数据 (url, unicodeRange, ranges)
 */
let cachedWenkaiRules = null

/**
 * 缓存已转为 Base64 的字体文件，全局单例，避免重复网络请求与编码转换
 * Map<fontUrl, base64DataUrl>
 */
const fontBase64Cache = new Map()

/**
 * 解析 unicode-range 字符串为十六进制区间
 * @param {string} rangeStr
 * @returns {Array<[number, number]>}
 */
const parseUnicodeRange = (rangeStr) => {
  if (!rangeStr) return []
  return rangeStr.split(',').map((part) => {
    const clean = part.trim().replace(/^U\+/i, '')
    if (clean.includes('-')) {
      const [start, end] = clean.split('-')
      return [parseInt(start, 16), parseInt(end, 16)]
    } else {
      const val = parseInt(clean, 16)
      return [val, val]
    }
  })
}

/**
 * 提取当前页面已载入的 LXGW WenKai Lite 字体规则元数据
 * @returns {Array<{ url: string, unicodeRange: string, ranges: Array<[number, number]> }>}
 */
export const getWenkaiFontRules = () => {
  if (cachedWenkaiRules !== null) return cachedWenkaiRules
  const rules = []
  if (typeof document !== 'undefined') {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule && rule.style?.fontFamily?.includes('WenKai')) {
            const src = rule.style.getPropertyValue('src')
            const unicodeRange = rule.style.getPropertyValue('unicode-range')
            const urlMatch = src ? src.match(/url\(["']?([^"')]+)["']?\)/) : null
            if (urlMatch && unicodeRange) {
              rules.push({
                url: urlMatch[1],
                unicodeRange,
                ranges: parseUnicodeRange(unicodeRange),
              })
            }
          }
        }
      } catch {
        // 跨域样式表跳过
      }
    }
  }
  cachedWenkaiRules = rules
  return rules
}

/**
 * 将指定字体 URL 转换为 Base64 Data URL (带全局内存缓存)
 * @param {string} url
 * @returns {Promise<string|null>}
 */
const MAX_FONT_CACHE = 40

export const fetchFontAsBase64 = async (url) => {
  if (!url) return null
  if (fontBase64Cache.has(url)) {
    // 刷新 LRU 顺序
    const val = fontBase64Cache.get(url)
    fontBase64Cache.delete(url)
    fontBase64Cache.set(url, val)
    return val
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null

    if (fontBase64Cache.size >= MAX_FONT_CACHE) {
      const oldestKey = fontBase64Cache.keys().next().value
      if (oldestKey) fontBase64Cache.delete(oldestKey)
    }

    fontBase64Cache.set(url, dataUrl)
    return dataUrl
  } catch (error) {
    console.warn('[fontEmbedding] 载入字体失败:', url, error)
    return null
  }
}

/**
 * 根据输入的文本字符集，动态筛选并内联命中的 LXGW WenKai Lite 字体分包为 Base64 @font-face CSS
 * 相比全量内联 234 个分包（15MB），只按需内联实际命中的 3~15 个分包（~80KB），
 * 兼顾毫秒级生成速度与 100% 完美的霞鹜文楷字形呈现。
 *
 * @param {string} text - 目标文本
 * @returns {Promise<string>}
 */
export const getMatchedWenkaiFontCss = async (text) => {
  if (!text || typeof text !== 'string') return ''
  const rules = getWenkaiFontRules()
  if (!rules.length) return ''

  const codePoints = new Set()
  for (const char of text) {
    codePoints.add(char.codePointAt(0))
  }

  const matched = []
  for (const rule of rules) {
    for (const cp of codePoints) {
      let hit = false
      for (const [start, end] of rule.ranges) {
        if (cp >= start && cp <= end) {
          hit = true
          break
        }
      }
      if (hit) {
        matched.push(rule)
        break
      }
    }
  }

  if (!matched.length) return ''

  const fontFaceCssList = await Promise.all(
    matched.map(async (rule) => {
      const dataUrl = await fetchFontAsBase64(rule.url)
      if (!dataUrl) return ''
      return `@font-face {
        font-family: 'LXGW WenKai Lite';
        src: url('${dataUrl}') format('woff2');
        font-style: normal;
        font-weight: 400;
        unicode-range: ${rule.unicodeRange};
      }`
    })
  )

  return fontFaceCssList.filter(Boolean).join('\n')
}

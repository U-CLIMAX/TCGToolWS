const dataUrlCache = new Map()

/**
 * 将远端资源 URL 异步转为 Base64 Data URL，带内存缓存
 * @param {string} src - 原始资源 URL
 * @returns {Promise<string>} Data URL 或原始 src（失败时回退）
 */
export const fetchAsDataUrl = async (src) => {
  if (!src || src.startsWith('data:')) return src
  if (dataUrlCache.has(src)) return dataUrlCache.get(src)

  try {
    const res = await fetch(src)
    if (!res.ok) return src
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(src)
      reader.readAsDataURL(blob)
    })
    dataUrlCache.set(src, dataUrl)
    return dataUrl
  } catch {
    return src
  }
}

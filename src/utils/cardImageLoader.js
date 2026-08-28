/**
 * 全域卡圖 LRU 快取與高效非同步解碼載入器
 * 解決 Android WebView 下主線程解碼卡頓與序列網路請求瓶頸
 */

const MAX_CACHE_SIZE = 100
const imageCache = new Map()

/**
 * 取得快取的圖片並更新其 LRU 活躍度
 * @param {string} src
 * @returns {HTMLImageElement|undefined}
 */
export const getCachedImage = (src) => {
  if (!src || !imageCache.has(src)) return undefined
  const img = imageCache.get(src)
  imageCache.delete(src)
  imageCache.set(src, img)
  return img
}

/**
 * 快取單張圖片並維護 LRU 上限
 * @param {string} src
 * @param {HTMLImageElement} img
 */
export const setCachedImage = (src, img) => {
  if (!src || !img) return
  if (imageCache.has(src)) {
    imageCache.delete(src)
  } else if (imageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value
    if (oldestKey) imageCache.delete(oldestKey)
  }
  imageCache.set(src, img)
}

/**
 * 載入單張圖片並利用 img.decode() 在瀏覽器後台線程完成解碼
 * 若已在記憶體快取中則 0 秒直接返回
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement|null>}
 */
export const loadImageWithDecode = (src) => {
  if (!src) return Promise.resolve(null)

  const cached = getCachedImage(src)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    let resolved = false
    const onDone = (success) => {
      if (resolved) return
      resolved = true
      img.onload = null
      img.onerror = null

      if (success) {
        setCachedImage(src, img)
        resolve(img)
      } else {
        resolve(null)
      }
    }

    img.onload = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(() => onDone(true))
          .catch(() => onDone(true)) // 解碼即使有微小相容性問題，onload 成功即可視為可用
      } else {
        onDone(true)
      }
    }

    img.onerror = () => onDone(false)
    img.src = src

    // 若瀏覽器支援且圖片已完成傳輸，嘗試直接解碼
    if (img.complete && typeof img.decode === 'function') {
      img
        .decode()
        .then(() => onDone(true))
        .catch(() => {})
    }
  })
}

/**
 * 以指定並發窗口批量加載圖片，充分發揮 HTTP/2 多路複用效能
 *
 * @param {Array<string>} urls - 待載入的 URL 列表（已去重）
 * @param {number} [concurrency=18] - 並發請求上限
 * @returns {Promise<Map<string, HTMLImageElement>>}
 */
export const batchLoadImages = async (urls, concurrency = 18) => {
  const resultMap = new Map()
  const validUrls = (urls || []).filter(Boolean)
  if (!validUrls.length) return resultMap

  let currentIndex = 0

  const worker = async () => {
    while (currentIndex < validUrls.length) {
      const idx = currentIndex++
      const url = validUrls[idx]
      try {
        const img = await loadImageWithDecode(url)
        if (img) {
          resultMap.set(url, img)
        }
      } catch {
        // 單張失敗不中斷其餘下載
      }
    }
  }

  const workerCount = Math.min(concurrency, validUrls.length)
  const workers = Array.from({ length: workerCount }, () => worker())
  await Promise.all(workers)

  return resultMap
}

/**
 * 全域卡圖 Blob LRU 快取與高效非同步解碼載入器 (基於 fetch + createImageBitmap)
 * 徹底跳過 DOM Image 物件分配，利用底層執行緒解碼為原生 ImageBitmap
 * 快取壓縮 Blob 避免 Web Worker transfer 後 ImageBitmap 失效 (neutered)
 */

const MAX_CACHE_SIZE = 100
const blobCache = new Map()

/**
 * 取得快取的圖片 Blob 並更新其 LRU 活躍度
 * @param {string} src
 * @returns {Blob|undefined}
 */
const getCachedBlob = (src) => {
  if (!src || !blobCache.has(src)) return undefined
  const blob = blobCache.get(src)
  blobCache.delete(src)
  blobCache.set(src, blob)
  return blob
}

/**
 * 快取單張圖片 Blob 並維護 LRU 上限
 * @param {string} src
 * @param {Blob} blob
 */
const setCachedBlob = (src, blob) => {
  if (!src || !blob) return
  if (blobCache.has(src)) {
    blobCache.delete(src)
  } else if (blobCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = blobCache.keys().next().value
    if (oldestKey) blobCache.delete(oldestKey)
  }
  blobCache.set(src, blob)
}

/**
 * 判斷是否為向量 SVG 或 SVG Data URI
 * @param {string} url
 * @returns {boolean}
 */
const isSvgOrDataUri = (url) => {
  if (typeof url !== 'string') return false
  return url.startsWith('data:image/svg+xml') || url.includes('.svg')
}

/**
 * 對於 SVG 或特異 Data URI，使用 new Image() 相容降級並光柵化為 ImageBitmap
 * @param {string} src
 * @returns {Promise<ImageBitmap|null>}
 */
const loadSvgAsBitmap = (src) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    let resolved = false
    const onDone = async (success) => {
      if (resolved) return
      resolved = true
      img.onload = null
      img.onerror = null

      if (success) {
        try {
          const bitmap = await createImageBitmap(img)
          resolve(bitmap)
        } catch {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    }

    img.onload = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(() => onDone(true))
          .catch(() => onDone(true))
      } else {
        onDone(true)
      }
    }

    img.onerror = () => onDone(false)
    img.src = src

    if (img.complete && typeof img.decode === 'function') {
      img
        .decode()
        .then(() => onDone(true))
        .catch(() => {})
    }
  })
}

/**
 * 載入單張圖片並利用 fetch + createImageBitmap 在瀏覽器背景線程完成解碼
 * 若已在記憶體快取中則直接從 Blob 重構 ImageBitmap
 *
 * @param {string} src
 * @returns {Promise<ImageBitmap|null>}
 */
export const loadImageWithDecode = async (src) => {
  if (!src) return null

  if (isSvgOrDataUri(src)) {
    return loadSvgAsBitmap(src)
  }

  try {
    let blob = getCachedBlob(src)
    if (!blob) {
      const response = await fetch(src, { mode: 'cors' })
      if (!response.ok) {
        return loadSvgAsBitmap(src)
      }
      blob = await response.blob()
      setCachedBlob(src, blob)
    }

    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(blob)
    }
    return loadSvgAsBitmap(src)
  } catch {
    // 網路或 CORS 異常時，安全降級嘗試 new Image()
    try {
      return await loadSvgAsBitmap(src)
    } catch {
      return null
    }
  }
}

/**
 * 動態計算最佳並發窗口 (完全相容 Chrome, Safari, Firefox, iOS, Android)
 * 基於 Network Information API (Chromium)、CPU 邏輯核心數 (全瀏覽器) 與 RAM 進行漸進增強估算
 *
 * @returns {number} 建議並發數 (2 ~ 8)
 */
export const getOptimalConcurrency = () => {
  if (typeof navigator === 'undefined') return 6

  // 1. 網路狀態探測 (Chromium/Android 支援；Safari/Firefox 靜默回退為 undefined)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (connection) {
    // 省流量模式或 2G 弱網：降至最低並發，防止封包阻塞
    if (
      connection.saveData ||
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g'
    ) {
      return 2
    }
    // 3G 網路：適度降低並發
    if (connection.effectiveType === '3g') {
      return 4
    }
  }

  // 2. CPU 核心數 (Chrome, Safari, Firefox 全平台 100% 支援)
  const cores =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 4

  // 3. 記憶體容量 (Chromium 支援；Safari/Firefox 不支援時依 CPU 核心數合理推估)
  const memory =
    typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : cores >= 8 ? 8 : 4

  // 4. 綜合權衡分級：
  // 低階設備 (雙核/四核 或 RAM <= 2GB)
  if (cores <= 4 || memory <= 2) {
    return 4
  }

  // 高配環境 (8 核以上 + 記憶體充足)
  if (cores >= 8 && memory >= 8) {
    return 8
  }

  return 6
}

/**
 * 批量加載圖片為 ImageBitmap，自動依硬體算力與網路計算最佳並發窗口
 *
 * @param {Array<string>} urls - 待載入的 URL 列表（已去重）
 * @returns {Promise<Map<string, ImageBitmap>>}
 */
export const batchLoadImages = async (urls) => {
  const resultMap = new Map()
  const validUrls = (urls || []).filter(Boolean)
  if (!validUrls.length) return resultMap

  const concurrency = getOptimalConcurrency()
  let currentIndex = 0

  const worker = async () => {
    while (currentIndex < validUrls.length) {
      const idx = currentIndex++
      const url = validUrls[idx]
      try {
        const bitmap = await loadImageWithDecode(url)
        if (bitmap) {
          resultMap.set(url, bitmap)
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

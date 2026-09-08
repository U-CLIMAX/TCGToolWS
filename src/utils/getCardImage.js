import { isTauri } from '@/utils/isTauri'
import { useUIStore } from '@/stores/ui'

const CN_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL
const CN_BLUR_URL = import.meta.env.VITE_BLUR_IMAGE_BASE_URL
const GLOBAL_BASE_URL = import.meta.env.VITE_IMAGE_GLOBAL_URL
const GLOBAL_BLUR_URL = import.meta.env.VITE_BLUR_IMAGE_GLOBAL_URL

let cachedLocalImageDir = ''
try {
  cachedLocalImageDir = localStorage.getItem('tcgtoolws_default_image_dir') || ''
} catch {
  // ignore
}

let cachedUiStore = null
const getUIStore = () => {
  if (!cachedUiStore) {
    try {
      cachedUiStore = useUIStore()
    } catch {
      // pinia not yet initialized
    }
  }
  return cachedUiStore
}

/**
 * 更新記憶體中快取的本地卡圖目錄
 * @param {string} dir
 */
export const setCachedLocalImageDir = (dir) => {
  cachedLocalImageDir = dir
    ? dir
        .trim()
        .replace(/[/\\]+$/, '')
        .replace(/\\/g, '/')
    : ''
}

/**
 * 取得記憶體中快取的本地卡圖目錄
 * @returns {string}
 */
export const getCachedLocalImageDir = () => cachedLocalImageDir

/**
 * Convert local file path to Tauri webview asset URL without top-level @tauri-apps/api import
 * @param {string} filePath
 * @returns {string}
 */
const convertPathToAssetUrl = (filePath) => {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__?.convertFileSrc) {
    return window.__TAURI_INTERNALS__.convertFileSrc(filePath, 'asset')
  }
  return filePath
}

/**
 * 取得卡牌圖片與模糊預覽圖 URL (支援 Tauri 本地目錄與遠端 CDN 分流)
 * @param {string} prefix
 * @param {string} id
 * @returns {{ base: string|null, blur: string|null }}
 */
export const getCardUrls = (prefix, id) => {
  if (!id || !prefix) return { base: null, blur: null }
  const filename = id.replace(/\//g, '-')
  const uiStore = getUIStore()

  // 1. 若在 Tauri 客戶端且使用者選擇「本地圖片」並已取得預設目錄
  if (isTauri && uiStore?.imageSource === 'local' && cachedLocalImageDir) {
    const basePath = `${cachedLocalImageDir}/ws-image-data/${prefix}/${filename}.webp`
    const blurPath = `${cachedLocalImageDir}/ws-blur-image-data/${prefix}/${filename}.webp`

    return {
      base: convertPathToAssetUrl(basePath),
      blur: convertPathToAssetUrl(blurPath),
    }
  }

  // 2. 預設：走遠端 CDN 分流（依據用戶地區 uiStore.country === 'CN'）
  const isCN = uiStore?.country === 'CN'
  const imageBaseUrl = isCN ? CN_BASE_URL : GLOBAL_BASE_URL
  const imageBlurUrl = isCN ? CN_BLUR_URL : GLOBAL_BLUR_URL

  return {
    base: `${imageBaseUrl}/${prefix}/${filename}.webp`,
    blur: `${imageBlurUrl}/${prefix}/${filename}.webp`,
  }
}

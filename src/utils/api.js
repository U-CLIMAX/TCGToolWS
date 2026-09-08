import { isTauri } from '@/utils/isTauri'

/**
 * 取得 API 請求的基礎路徑
 * - 在 Tauri 桌面客戶端：連線至正式服後端 https://www.uclimax.top
 * - 在 Web 瀏覽器端（含本機開發 npm run dev 與正式網頁）：始終使用相對路徑 '' (由本地 Vite/Cloudflare 同源處理，避免 CORS 報錯)
 * @returns {string}
 */
export const getApiBaseUrl = () => {
  if (isTauri) {
    return (import.meta.env.VITE_API_BASE_URL || 'https://www.uclimax.top').replace(/\/$/, '')
  }
  return ''
}

/**
 * 取得網站前台的基礎 URL（用於分享連結、QR Code 等）
 * - 優先採用 VITE_WEBSITE_URL 環境變數
 * - 若未設定：在 Web 瀏覽器環境中使用 window.location.origin，在 Tauri 桌面客戶端預設使用 'https://www.uclimax.top'
 * @returns {string}
 */
export const getWebsiteUrl = () => {
  if (import.meta.env.VITE_WEBSITE_URL) {
    return import.meta.env.VITE_WEBSITE_URL.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin && !isTauri) {
    return window.location.origin
  }
  return 'https://www.uclimax.top'
}

/**
 * 通用 API 請求封裝（自動前綴 Base URL 與離線攔截）
 * @param {string} endpoint 例如 '/api/decks'
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export const apiFetch = async (endpoint, options = {}) => {
  const baseUrl = getApiBaseUrl()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${path}`

  try {
    const response = await fetch(fullUrl, options)
    return response
  } catch (err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('⚠️ 處於離線狀態，無法完成 API 請求:', fullUrl)
      throw new Error('网络连接不可用，请检查网络状态')
    }
    throw err
  }
}

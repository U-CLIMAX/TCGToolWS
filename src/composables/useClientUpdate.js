import { ref, getCurrentInstance, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@/utils/isTauri'
import { getVersion } from '@tauri-apps/api/app'
import { listen } from '@tauri-apps/api/event'

const hasClientUpdate = ref(false)
const clientUpdateVersion = ref('')
const localAppVersion = ref('')
const updateNotes = ref('')
const directDownloadUrl = ref('')
const matchedAssetName = ref('')
const showClientUpdateDialog = ref(false)

const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadSpeed = ref('')
const downloadedSize = ref('')
const totalSize = ref('')
const downloadStatus = ref('idle') // 'idle' | 'downloading' | 'installing' | 'error'
const downloadError = ref('')

let unlistenProgress = null
let abortController = null
let checkPromise = null
let removeAndroidListeners = null

const cleanAndroidListeners = () => {
  if (removeAndroidListeners) {
    removeAndroidListeners()
    removeAndroidListeners = null
  }
}

/**
 * Format bytes to readable string (e.g. "12.4 MB")
 * @param {number} bytes
 * @returns {string}
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Compare two semver strings (v1 > v2 returns 1, v1 < v2 returns -1, equal returns 0)
 * @param {string} v1
 * @param {string} v2
 * @returns {number}
 */
const compareSemver = (v1, v2) => {
  if (!v1 || !v2) return 0
  const cleanV1 = v1.replace(/^v/, '').split('-')[0]
  const cleanV2 = v2.replace(/^v/, '').split('-')[0]
  const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10) || 0)
  const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10) || 0)
  const maxLen = Math.max(parts1.length, parts2.length)

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

/**
 * Match platform specific release asset
 * @param {Array} assets
 * @returns {Object|null}
 */
const matchPlatformAsset = (assets) => {
  if (!Array.isArray(assets) || assets.length === 0) return null
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''

  if (ua.includes('windows')) {
    return assets.find((a) => a.name?.toLowerCase().endsWith('.exe'))
  } else if (ua.includes('linux') && !ua.includes('android')) {
    return assets.find((a) => a.name?.toLowerCase().endsWith('.appimage'))
  } else if (ua.includes('android')) {
    return assets.find((a) => a.name?.toLowerCase().endsWith('.apk'))
  }
  return null
}

/**
 * Composable for managing Tauri client updates via GitCode Releases API
 */
export const useClientUpdate = () => {
  const router = useRouter()

  const checkClientUpdate = async () => {
    if (!isTauri) return false
    if (checkPromise) return checkPromise

    checkPromise = (async () => {
      try {
        const localVer = await getVersion()
        localAppVersion.value = localVer

        const response = await fetch(
          'https://api.gitcode.com/api/v5/repos/zhuang39/TCGToolWS/releases/latest'
        )
        if (!response.ok) return false

        const release = await response.json()
        const remoteVer = release.tag_name?.replace(/^v/, '')

        if (remoteVer && compareSemver(remoteVer, localVer) > 0) {
          hasClientUpdate.value = true
          clientUpdateVersion.value = remoteVer
          updateNotes.value = release.body || ''

          const matchedAsset = matchPlatformAsset(release.assets)
          directDownloadUrl.value = matchedAsset?.browser_download_url || ''
          matchedAssetName.value = matchedAsset?.name || ''

          const dismissedVer = sessionStorage.getItem('client_update_dismissed_version')
          if (dismissedVer !== remoteVer) {
            showClientUpdateDialog.value = true
          }
          return true
        }
      } catch (err) {
        console.warn('检测客户端版本失败:', err)
      } finally {
        checkPromise = null
      }
      return false
    })()

    return checkPromise
  }

  const startDownloadAndInstall = async () => {
    if (!directDownloadUrl.value) {
      goToDownload()
      return
    }

    isDownloading.value = true
    downloadProgress.value = 0
    downloadSpeed.value = ''
    downloadedSize.value = ''
    totalSize.value = ''
    downloadStatus.value = 'downloading'
    downloadError.value = ''

    let lastTime = Date.now()
    let lastBytes = 0

    const isAndroid =
      typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('android')

    try {
      if (isAndroid) {
        // Android mobile client: stream download natively via AndroidBridge
        cleanAndroidListeners()

        const onProgress = (e) => {
          const detail = e.detail || {}
          downloadStatus.value = 'downloading'
          downloadProgress.value = detail.progress || 0
          downloadedSize.value = formatBytes(detail.downloaded)
          if (detail.total > 0) {
            totalSize.value = formatBytes(detail.total)
          }

          const now = Date.now()
          if (now - lastTime >= 500) {
            const speed = (((detail.downloaded || 0) - lastBytes) / (now - lastTime)) * 1000
            downloadSpeed.value = `${formatBytes(speed)}/s`
            lastTime = now
            lastBytes = detail.downloaded || 0
          }
        }

        const onError = (e) => {
          downloadStatus.value = 'error'
          downloadError.value = e.detail?.error || '下载或安装失败'
          isDownloading.value = false
          cleanAndroidListeners()
        }

        const onInstalling = () => {
          downloadStatus.value = 'installing'
          downloadProgress.value = 100
          isDownloading.value = false
          cleanAndroidListeners()
        }

        window.addEventListener('android-update-progress', onProgress)
        window.addEventListener('android-update-error', onError)
        window.addEventListener('android-update-installing', onInstalling)

        removeAndroidListeners = () => {
          window.removeEventListener('android-update-progress', onProgress)
          window.removeEventListener('android-update-error', onError)
          window.removeEventListener('android-update-installing', onInstalling)
        }

        if (window.__AndroidNativeBridge__?.downloadAndInstallApk) {
          window.__AndroidNativeBridge__.downloadAndInstallApk(directDownloadUrl.value)
        } else if (window.__AndroidNativeBridge__?.downloadUrl) {
          window.__AndroidNativeBridge__.downloadUrl(
            directDownloadUrl.value,
            matchedAssetName.value || 'tcgtoolws_update.apk'
          )
        } else {
          window.open(directDownloadUrl.value, '_blank')
        }
      } else {
        // Desktop client (Windows / Linux): stream download via Rust and invoke installer
        if (unlistenProgress) {
          unlistenProgress()
          unlistenProgress = null
        }

        unlistenProgress = await listen('client-update-progress', (event) => {
          const payload = event.payload
          downloadProgress.value = payload.progress || 0
          downloadedSize.value = formatBytes(payload.downloaded)
          if (payload.total > 0) {
            totalSize.value = formatBytes(payload.total)
          }

          const now = Date.now()
          if (now - lastTime >= 500) {
            const speed = (((payload.downloaded || 0) - lastBytes) / (now - lastTime)) * 1000
            downloadSpeed.value = `${formatBytes(speed)}/s`
            lastTime = now
            lastBytes = payload.downloaded || 0
          }
        })

        const filename = matchedAssetName.value || 'tcgtoolws_update.exe'
        await invoke('download_and_install_update', {
          url: directDownloadUrl.value,
          filename,
        })
        downloadStatus.value = 'installing'
      }
    } catch (err) {
      console.error('更新下载失败:', err)
      downloadStatus.value = 'error'
      downloadError.value = err.message || String(err)
    } finally {
      if (!isAndroid) {
        isDownloading.value = false
        if (unlistenProgress) {
          unlistenProgress()
          unlistenProgress = null
        }
      }
    }
  }

  const cancelDownload = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (unlistenProgress) {
      unlistenProgress()
      unlistenProgress = null
    }
    cleanAndroidListeners()
    isDownloading.value = false
    downloadStatus.value = 'idle'
    downloadProgress.value = 0
    downloadSpeed.value = ''
    downloadError.value = ''
  }

  const dismissUpdateDialog = () => {
    cancelDownload()
    showClientUpdateDialog.value = false
    if (clientUpdateVersion.value) {
      sessionStorage.setItem('client_update_dismissed_version', clientUpdateVersion.value)
    }
  }

  const goToDownload = () => {
    showClientUpdateDialog.value = false
    if (directDownloadUrl.value) {
      window.open(directDownloadUrl.value, '_blank')
    } else if (router) {
      router.push({ name: 'Download' })
    }
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      if (unlistenProgress) {
        unlistenProgress()
        unlistenProgress = null
      }
      cleanAndroidListeners()
    })
  }

  return {
    hasClientUpdate,
    clientUpdateVersion,
    localAppVersion,
    updateNotes,
    directDownloadUrl,
    matchedAssetName,
    showClientUpdateDialog,
    isDownloading,
    downloadProgress,
    downloadSpeed,
    downloadedSize,
    totalSize,
    downloadStatus,
    downloadError,
    checkClientUpdate,
    startDownloadAndInstall,
    cancelDownload,
    dismissUpdateDialog,
    goToDownload,
  }
}

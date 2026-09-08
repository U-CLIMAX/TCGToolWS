import { ref, computed, getCurrentInstance, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '@/utils/isTauri'
import { useUIStore } from '@/stores/ui'
import { setCachedLocalImageDir, getCachedLocalImageDir } from '@/utils/getCardImage'
import { useSnackbar } from '@/composables/useSnackbar'

const SYNC_METADATA_KEY = 'tcgtoolws_card_image_sync_metadata'
const DEFAULT_IMAGE_DIR_KEY = 'tcgtoolws_default_image_dir'
const PROMPT_DISMISSED_KEY = 'tcgtoolws_card_image_prompt_dismissed'

const defaultImageDir = ref(getCachedLocalImageDir())

// Shared reactive state for global sync status
const isSyncing = ref(false)
const syncStatus = ref('idle') // 'idle' | 'checking' | 'downloading' | 'cancelling' | 'completed' | 'error' | 'cancelled'
const syncProgress = ref(0)
const packageProgress = ref(0)
const currentPackage = ref('')
const currentPackageStage = ref('') // 'requesting' | 'downloading' | 'extracting' | 'done'
const currentPackageIndex = ref(0)
const totalPackagesToSync = ref(0)
const downloadedBytes = ref(0)
const totalBytesToDownload = ref(0)
const syncSpeed = ref('')
const syncError = ref('')
const syncSummary = ref({
  totalManifestPackages: 0,
  availableOnCloud: 0,
  upToDate: 0,
  missing: 0,
  outdated: 0,
  pendingUpload: 0,
  occupiedSize: 0,
  totalSizeToDownload: 0,
})

const showUpdatePromptModal = ref(false)
const isPromptDismissedThisSession = ref(
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PROMPT_DISMISSED_KEY) === 'true'
)

const hasPendingSync = computed(() => {
  return (
    (syncSummary.value.missing > 0 || syncSummary.value.outdated > 0) &&
    syncSummary.value.availableOnCloud > 0
  )
})

const isAllUpToDate = computed(() => {
  return (
    syncSummary.value.availableOnCloud > 0 &&
    syncSummary.value.missing === 0 &&
    syncSummary.value.outdated === 0
  )
})

let unlistenProgress = null
let isCancelled = false
let checkSyncPromise = null

/**
 * Send native desktop notification (Windows / macOS / Linux)
 * @param {string} title
 * @param {string} body
 */
export const sendDesktopNotification = async (title, body) => {
  if (!isTauri) return
  try {
    await invoke('show_desktop_notification', { title, body })
  } catch (err) {
    console.warn('Native desktop notification failed:', err)
  }
}

const isAndroidPlatform = () => {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('android')
}

const startNativeSyncForeground = () => {
  if (isAndroidPlatform() && window.__AndroidNativeBridge__?.startSyncForegroundService) {
    window.__AndroidNativeBridge__.startSyncForegroundService()
  }
}

const updateNativeSyncProgress = (progress) => {
  if (isAndroidPlatform() && window.__AndroidNativeBridge__?.updateSyncProgressNotification) {
    window.__AndroidNativeBridge__.updateSyncProgressNotification(Math.round(progress))
  }
}

const completeNativeSyncNotification = () => {
  if (isAndroidPlatform() && window.__AndroidNativeBridge__?.completeSyncNotification) {
    window.__AndroidNativeBridge__.completeSyncNotification()
  } else {
    sendDesktopNotification('卡图同步完成', '')
  }
}

const cancelNativeSyncNotification = () => {
  if (isAndroidPlatform() && window.__AndroidNativeBridge__?.cancelSyncNotification) {
    window.__AndroidNativeBridge__.cancelSyncNotification()
  }
}

/**
 * Dismiss the update prompt modal for the current session
 */
export const dismissPromptThisSession = () => {
  isPromptDismissedThisSession.value = true
  showUpdatePromptModal.value = false
  try {
    sessionStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
  } catch {
    // ignore
  }
}

/**
 * Confirm and start sync from prompt modal
 */
export const confirmPromptAndSync = () => {
  dismissPromptThisSession()
  startAutoSync()
}

/**
 * Format bytes to human readable string (e.g. "12.4 MB")
 * @param {number} bytes
 * @returns {string}
 */
export const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0 || Number.isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  const val = bytes / Math.pow(k, i)
  return `${i === 0 ? Math.round(val) : val.toFixed(1)} ${sizes[i]}`
}

/**
 * Gets local sync metadata from localStorage
 * @returns {Record<string, { sha256: string, updated_at?: number, synced_at?: number }>}
 */
const getSyncMetadata = () => {
  try {
    const raw = localStorage.getItem(SYNC_METADATA_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Saves local sync metadata to localStorage
 * @param {Record<string, { sha256: string, updated_at?: number, synced_at?: number }>} data
 */
const saveSyncMetadata = (data) => {
  try {
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('Failed to save sync metadata:', err)
  }
}

/**
 * Resolves and ensures the default card image directory
 * @returns {Promise<string>}
 */
export const resolveDefaultImageDir = async () => {
  if (!isTauri) return ''

  if (defaultImageDir.value && defaultImageDir.value.trim()) {
    return defaultImageDir.value
      .trim()
      .replace(/[/\\]+$/, '')
      .replace(/\\/g, '/')
  }

  try {
    let defaultDir = ''
    try {
      defaultDir = await invoke('get_default_card_image_dir')
    } catch {
      const baseAppData = await appDataDir()
      defaultDir = await join(baseAppData, 'card-images')
    }

    if (defaultDir) {
      defaultDir = defaultDir
        .trim()
        .replace(/[/\\]+$/, '')
        .replace(/\\/g, '/')
      defaultImageDir.value = defaultDir
      setCachedLocalImageDir(defaultDir)
      try {
        localStorage.setItem(DEFAULT_IMAGE_DIR_KEY, defaultDir)
      } catch {
        // ignore
      }
    }
    return defaultDir
  } catch (err) {
    console.warn('Failed to resolve default image dir:', err)
    return ''
  }
}

/**
 * Loads the card image manifest
 * @returns {Promise<Object|null>}
 */
const fetchManifest = async () => {
  try {
    const manifestModule = await fetch('/card-images-manifest.json')
    return manifestModule.json()
  } catch (err) {
    console.warn('Failed to load card-images-manifest.json:', err)
    return null
  }
}

/**
 * Validates whether a share_id represents a valid, non-empty cloud share
 * @param {any} shareId
 * @returns {boolean}
 */
export const isShareIdValid = (shareId) => {
  if (shareId === null || shareId === undefined) return false
  if (typeof shareId === 'number') return shareId !== 0
  if (typeof shareId !== 'string') return false
  const trimmed = shareId.trim()
  return trimmed !== '' && trimmed !== '0'
}

/**
 * Internal helper to inspect local filesystem and manifest
 * @returns {Promise<{ targetDir: string, packagesToSync: Array<Object>, summary: Object }>}
 */
const inspectPackages = async () => {
  const targetDir = await resolveDefaultImageDir()
  if (!targetDir) {
    throw new Error('未配置本地卡图存储目录')
  }

  const manifest = await fetchManifest()
  if (!manifest || !manifest.packages) {
    throw new Error('无法获取卡图清单文件 (card-images-manifest.json)')
  }

  // Query existing local subfolders
  let localFolders = []
  try {
    localFolders = await invoke('get_local_image_folders', { targetDir })
  } catch (err) {
    console.warn('Failed to inspect local image folders:', err)
    localFolders = []
  }

  const localFolderSet = new Set(localFolders.map((f) => f.toLowerCase()))
  const syncMeta = getSyncMetadata()

  const packagesToSync = []
  let availableOnCloud = 0
  let upToDate = 0
  let missing = 0
  let outdated = 0
  let pendingUpload = 0
  let occupiedSize = 0
  let totalSizeToDownload = 0

  const packageEntries = Object.entries(manifest.packages)
  for (const [folder, pkg] of packageEntries) {
    const folderLower = folder.toLowerCase()
    const existsLocally = localFolderSet.has(folderLower)

    if (existsLocally) {
      occupiedSize += pkg.size || 0
    }

    const hasShareId = isShareIdValid(pkg.share_id)
    if (!hasShareId) {
      pendingUpload++
      continue
    }

    availableOnCloud++
    const meta = syncMeta[folder] || syncMeta[folderLower]

    if (!existsLocally) {
      missing++
      totalSizeToDownload += pkg.size || 0
      packagesToSync.push({
        folder,
        share_id: pkg.share_id,
        size: pkg.size || 0,
        sha256: pkg.sha256 || '',
        updated_at: pkg.updated_at || 0,
        card_count: pkg.card_count || 0,
        reason: 'missing',
      })
    } else if (meta && pkg.sha256 && meta.sha256 !== pkg.sha256) {
      outdated++
      totalSizeToDownload += pkg.size || 0
      packagesToSync.push({
        folder,
        share_id: pkg.share_id,
        size: pkg.size || 0,
        sha256: pkg.sha256 || '',
        updated_at: pkg.updated_at || 0,
        card_count: pkg.card_count || 0,
        reason: 'outdated',
      })
    } else {
      upToDate++
    }
  }

  const summary = {
    totalManifestPackages: packageEntries.length,
    availableOnCloud,
    upToDate,
    missing,
    outdated,
    pendingUpload,
    occupiedSize,
    totalSizeToDownload,
  }

  return { targetDir, packagesToSync, summary }
}

/**
 * Checks local images against manifest to determine missing and outdated packages
 * @param {object} [options]
 * @param {boolean} [options.preserveError=false]
 * @returns {Promise<{ packagesToSync: Array<Object>, summary: Object }>}
 */
export const checkSyncStatus = async (options = {}) => {
  if (!isTauri) {
    return { packagesToSync: [], summary: syncSummary.value }
  }

  if (isSyncing.value) {
    return { packagesToSync: [], summary: syncSummary.value }
  }

  if (checkSyncPromise) {
    return checkSyncPromise
  }

  const { preserveError = false } = options

  syncStatus.value = 'checking'
  if (!preserveError) {
    syncError.value = ''
  }

  checkSyncPromise = (async () => {
    try {
      const { packagesToSync, summary } = await inspectPackages()

      syncSummary.value = summary
      totalPackagesToSync.value = packagesToSync.length
      totalBytesToDownload.value = summary.totalSizeToDownload
      syncStatus.value = 'idle'

      return { packagesToSync, summary }
    } catch (err) {
      syncStatus.value = 'error'
      syncError.value = err.message || String(err)
      return { packagesToSync: [], summary: syncSummary.value }
    } finally {
      checkSyncPromise = null
    }
  })()

  return checkSyncPromise
}

/**
 * Starts automatic download and extraction for all missing/outdated packages
 */
export const startAutoSync = async () => {
  if (!isTauri || isSyncing.value) return

  try {
    await invoke('reset_card_image_sync_cancel')
  } catch (err) {
    console.warn('Failed to reset cancel flag in backend:', err)
  }

  const uiStore = useUIStore()
  isCancelled = false
  isSyncing.value = true
  syncStatus.value = 'downloading'
  syncError.value = ''
  syncProgress.value = 0
  packageProgress.value = 0
  downloadedBytes.value = 0
  syncSpeed.value = ''

  let speedLastTime = Date.now()
  let speedLastBytes = 0

  updateNativeSyncProgress(0)

  try {
    const { targetDir, packagesToSync, summary } = await inspectPackages()
    syncSummary.value = summary

    if (packagesToSync.length === 0) {
      syncStatus.value = 'completed'
      syncProgress.value = 100
      uiStore.imageSource = 'local'
      completeNativeSyncNotification()
      return
    }

    totalPackagesToSync.value = packagesToSync.length
    const totalBytes = packagesToSync.reduce((acc, p) => acc + (p.size || 0), 0)
    totalBytesToDownload.value = totalBytes

    const { triggerSnackbar } = useSnackbar()
    triggerSnackbar('已开始在背景下载卡图...', 'info')
    startNativeSyncForeground()

    // Setup Tauri progress listener
    if (unlistenProgress) {
      unlistenProgress()
      unlistenProgress = null
    }

    let completedPackagesBytes = 0

    unlistenProgress = await listen('card-image-sync-progress', (event) => {
      const payload = event.payload
      if (payload) {
        packageProgress.value = payload.progress || 0
        currentPackageStage.value = payload.stage || ''

        const currentPkg = packagesToSync[currentPackageIndex.value - 1]
        const currentPkgSize = currentPkg?.size || 0
        const pkgProgressFrac = Math.min(100, Math.max(0, payload.progress || 0)) / 100
        const currentPkgEffectiveBytes = currentPkgSize * pkgProgressFrac
        const totalOverallDownloaded = completedPackagesBytes + currentPkgEffectiveBytes

        downloadedBytes.value = Math.min(
          totalBytes,
          Math.max(downloadedBytes.value, Math.round(totalOverallDownloaded))
        )

        if (totalBytes > 0) {
          const calculatedProgress = Math.min(
            100,
            Math.max(0, (totalOverallDownloaded / totalBytes) * 100)
          )
          // Strictly monotonic: never let progress percentage decrease or bounce
          syncProgress.value = Math.min(100, Math.max(syncProgress.value, calculatedProgress))
        } else if (packagesToSync.length > 0) {
          const pkgBase = (currentPackageIndex.value - 1) / packagesToSync.length
          const pkgFrac = pkgProgressFrac / packagesToSync.length
          const calculatedProgress = Math.min(100, Math.max(0, (pkgBase + pkgFrac) * 100))
          syncProgress.value = Math.min(100, Math.max(syncProgress.value, calculatedProgress))
        }

        // Calculate download speed
        const now = Date.now()
        if (now - speedLastTime >= 500) {
          const bytesDiff = totalOverallDownloaded - speedLastBytes
          const timeDiff = (now - speedLastTime) / 1000
          const speedBps = timeDiff > 0 ? Math.max(0, bytesDiff / timeDiff) : 0
          syncSpeed.value = `${formatBytes(speedBps)}/s`
          speedLastTime = now
          speedLastBytes = totalOverallDownloaded
        }

        updateNativeSyncProgress(syncProgress.value)
      }
    })

    const syncMeta = getSyncMetadata()
    let hasError = false

    for (let i = 0; i < packagesToSync.length; i++) {
      if (isCancelled) {
        syncStatus.value = 'cancelled'
        cancelNativeSyncNotification()
        break
      }

      const pkg = packagesToSync[i]
      currentPackage.value = pkg.folder
      currentPackageIndex.value = i + 1
      currentPackageStage.value = 'requesting'

      try {
        await invoke('sync_card_image_package', {
          folder: pkg.folder,
          shareId: pkg.share_id,
          targetDir,
        })

        // Update local metadata record upon package success
        syncMeta[pkg.folder] = {
          sha256: pkg.sha256,
          updated_at: pkg.updated_at,
          synced_at: Math.floor(Date.now() / 1000),
        }
        saveSyncMetadata(syncMeta)

        completedPackagesBytes += pkg.size || 0
      } catch (pkgErr) {
        if (isCancelled || String(pkgErr).includes('cancelled')) {
          break
        }
        hasError = true
        console.error(`Failed to sync package ${pkg.folder}:`, pkgErr)
        syncError.value = `同步包 [${pkg.folder}] 失败: ${pkgErr.message || pkgErr}`
      }
    }

    if (!isCancelled) {
      if (!hasError) {
        syncStatus.value = 'completed'
        syncProgress.value = 100
        uiStore.imageSource = 'local'
        completeNativeSyncNotification()
        const { triggerSnackbar } = useSnackbar()
        triggerSnackbar('卡图已全数同步完成！', 'success')
      } else {
        syncStatus.value = 'error'
        cancelNativeSyncNotification()
      }
      try {
        const postSyncCheck = await inspectPackages()
        syncSummary.value = postSyncCheck.summary
      } catch (err) {
        console.warn('Post-sync inspect failed:', err)
      }
    } else {
      try {
        const postCancelCheck = await inspectPackages()
        syncSummary.value = postCancelCheck.summary
      } catch (err) {
        console.warn('Post-cancel inspect failed:', err)
      }
    }
  } catch (err) {
    console.error('卡图同步过程发生异常:', err)
    syncStatus.value = 'error'
    syncError.value = err.message || String(err)
    cancelNativeSyncNotification()
  } finally {
    isSyncing.value = false
    if (syncStatus.value === 'cancelling' || isCancelled) {
      syncStatus.value = 'cancelled'
      cancelNativeSyncNotification()
    }
    if (unlistenProgress) {
      unlistenProgress()
      unlistenProgress = null
    }
  }
}

/**
 * Cancels the ongoing sync process safely
 */
export const cancelSync = () => {
  isCancelled = true
  syncStatus.value = 'cancelling'
  if (isTauri) {
    invoke('cancel_card_image_sync').catch((err) => {
      console.warn('Failed to invoke cancel_card_image_sync:', err)
    })
  }
  cancelNativeSyncNotification()
  const { triggerSnackbar } = useSnackbar()
  triggerSnackbar('已取消卡图同步', 'info')
}

/**
 * Safely deletes the local card image folder and resets sync metadata & status
 * @returns {Promise<boolean>}
 */
export const deleteLocalCardImages = async () => {
  if (!isTauri) return false

  if (isSyncing.value) {
    throw new Error('正在同步卡图中，无法删除卡图目录')
  }

  const targetDir = await resolveDefaultImageDir()
  if (!targetDir) {
    throw new Error('未配置本地卡图存储目录')
  }

  try {
    await invoke('delete_card_image_dir', { targetDir })

    const uiStore = useUIStore()
    if (uiStore.imageSource === 'local') {
      uiStore.imageSource = 'remote'
    }

    // Clear sync metadata from localStorage
    try {
      localStorage.removeItem(SYNC_METADATA_KEY)
    } catch {
      // ignore
    }

    // Reset progress and runtime states
    syncProgress.value = 0
    packageProgress.value = 0
    downloadedBytes.value = 0
    totalBytesToDownload.value = 0
    syncSpeed.value = ''
    syncError.value = ''

    // Re-check sync status to update UI summary (occupiedSize becomes 0)
    await checkSyncStatus()

    return true
  } catch (err) {
    console.error('Failed to delete local card images:', err)
    syncError.value = `删除卡图目录失败: ${err.message || err}`
    throw err
  }
}

/**
 * Composable for automatic card image downloading and synchronization in Tauri
 */
export const useCardImageSync = () => {
  if (getCurrentInstance()) {
    onUnmounted(() => {
      if (unlistenProgress && !isSyncing.value) {
        unlistenProgress()
        unlistenProgress = null
      }
    })
  }

  return {
    isSyncing,
    syncStatus,
    syncProgress,
    packageProgress,
    currentPackage,
    currentPackageStage,
    currentPackageIndex,
    totalPackagesToSync,
    downloadedBytes,
    totalBytesToDownload,
    syncSpeed,
    syncError,
    syncSummary,
    defaultImageDir,
    hasPendingSync,
    isAllUpToDate,
    showUpdatePromptModal,
    isPromptDismissedThisSession,
    resolveDefaultImageDir,
    checkSyncStatus,
    startAutoSync,
    cancelSync,
    dismissPromptThisSession,
    confirmPromptAndSync,
    deleteLocalCardImages,
  }
}

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isTauri } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'

const hasClientUpdate = ref(false)
const clientUpdateVersion = ref('')
const localAppVersion = ref('')
const showClientUpdateDialog = ref(false)

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
 * Composable for managing Tauri client updates
 */
export const useClientUpdate = () => {
  const router = useRouter()

  const checkClientUpdate = async () => {
    if (!isTauri()) return false

    try {
      const localVer = await getVersion()
      localAppVersion.value = localVer

      const metaEl = document.querySelector('meta[name="app-version"]')
      const remoteVer = metaEl?.getAttribute('content')

      if (remoteVer && compareSemver(remoteVer, localVer) > 0) {
        hasClientUpdate.value = true
        clientUpdateVersion.value = remoteVer

        const dismissedVer = sessionStorage.getItem('client_update_dismissed_version')
        if (dismissedVer !== remoteVer) {
          showClientUpdateDialog.value = true
        }
        return true
      }
    } catch (err) {
      console.warn('检测客户端版本失败:', err)
    }
    return false
  }

  const dismissUpdateDialog = () => {
    showClientUpdateDialog.value = false
    if (clientUpdateVersion.value) {
      sessionStorage.setItem('client_update_dismissed_version', clientUpdateVersion.value)
    }
  }

  const goToDownload = () => {
    showClientUpdateDialog.value = false
    if (router) {
      router.push({ name: 'Download' })
    }
  }

  onMounted(() => {
    checkClientUpdate()
  })

  return {
    hasClientUpdate,
    clientUpdateVersion,
    localAppVersion,
    showClientUpdateDialog,
    checkClientUpdate,
    dismissUpdateDialog,
    goToDownload,
  }
}

import { useUIStore } from '@/stores/ui'

export async function runIPGeolocation() {
  const uiStore = useUIStore()

  try {
    const locales = navigator.languages || [navigator.language]
    let detectedRegion = null

    for (const localeStr of locales) {
      try {
        const locale = new Intl.Locale(localeStr)
        if (locale.region) {
          detectedRegion = locale.region.toUpperCase()
          break
        }
        // oxlint-disable-next-line no-unused-vars
      } catch (e) {
        // Ignore invalid locale formats
      }
    }

    const country = detectedRegion || 'CN'
    if (uiStore.country !== country) {
      uiStore.country = country
    }
  } catch (error) {
    console.error('Failed to detect region from locale:', error)
    if (!uiStore.country) {
      uiStore.country = 'CN'
    }
  }
}

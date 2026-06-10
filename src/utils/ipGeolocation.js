import { useUIStore } from '@/stores/ui'

const CACHE_TTL = 60 * 60 * 1000

export async function runIPGeolocation() {
  const uiStore = useUIStore()

  const isStale =
    !uiStore.geo.country || !uiStore.geo.fetchedAt || Date.now() - uiStore.geo.fetchedAt > CACHE_TTL

  if (!isStale) {
    console.log('Country cache is fresh, skipping.')
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 800)

  try {
    const response = await fetch(
      `https://api.ipinfo.io/lite/me?token=${import.meta.env.VITE_IPINFO_TOKEN}`,
      { signal: controller.signal }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    uiStore.geo.country = data.country_code || 'CN'
    uiStore.geo.fetchedAt = Date.now()
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('IP Geolocation API request timeout.')
    } else {
      console.error('IP Geolocation API request error:', error.message)
    }
    uiStore.geo.country = 'CN'
    uiStore.geo.fetchedAt = Date.now()
  } finally {
    clearTimeout(timeoutId)
  }
}

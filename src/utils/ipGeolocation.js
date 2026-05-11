import { useUIStore } from '@/stores/ui'

export async function runIPGeolocation() {
  const uiStore = useUIStore()

  if (uiStore.country !== null) {
    console.log('uiStore.country is not null, skipping IP Geolocation API call.')
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 800)

  try {
    const response = await fetch(
      `https://api.ipinfo.io/lite/me?token=${import.meta.env.VITE_IPINFO_TOKEN}`,
      {
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    uiStore.country = data.country_code || 'CN'
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('IP Geolocation API request timeout.')
    } else {
      console.error('IP Geolocation API request error:', error.message)
    }
    uiStore.country = 'CN'
  } finally {
    clearTimeout(timeoutId)
  }
}
